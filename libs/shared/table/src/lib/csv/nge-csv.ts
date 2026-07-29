import type { NgeTableExportCell, NgeTableExportData } from '../export';

/**
 * Which of a cell's two readings becomes its text.
 *
 * - `formatted` — what a person should read. The column's own
 *   `meta.ngeExport.format`, so a currency column exports `$1,234.50`.
 * - `raw` — what a machine should read. Exactly what the accessor returned, so the
 *   same column exports `1234.5` and stays a number the spreadsheet can sum.
 *
 * The toggle exists because one CSV cannot be both, and which one is wanted is a
 * property of the *destination* rather than of the table.
 */
export type NgeCsvValues = 'formatted' | 'raw';

/** How to write the CSV. Every field is optional and the defaults are RFC 4180. */
export interface NgeCsvOptions {
  /**
   * Prepend U+FEFF.
   *
   * Off by default, because a BOM in a string is a surprise — it is a byte-level
   * concern that belongs to a file rather than to text. ⚠️ **Excel on Windows needs
   * it**: without one it reads a UTF-8 file as the ambient code page and every
   * non-ASCII character arrives mojibake. Turn it on for anything a user will open
   * by double-clicking; leave it off for anything another program will parse.
   */
  byteOrderMark?: boolean;
  /**
   * The field separator. Defaults to `,`.
   *
   * ⚠️ Quoting is decided **against this value**, not against a comma — see
   * {@link toNgeCsv}. Semicolon is the common alternative, for locales where the
   * decimal separator is itself a comma.
   */
  delimiter?: string;
  /**
   * Prefix a field that a spreadsheet would read as a formula with `'`.
   *
   * Off by default, and the default is the decision rather than an oversight.
   * Escaping **alters the user's data**: `=SUM(A1:A2)` comes back as
   * `'=SUM(A1:A2)`, so the field no longer round-trips and a parser downstream
   * sees a character the table never held. An export library making that trade
   * without being asked is worse than one that documents it, so the caller asks.
   *
   * ⚠️ **Turn it on for anything a person will open in Excel or Sheets.** A field
   * beginning `=`, `+`, `-`, `@`, a tab or a carriage return is evaluated on open,
   * which turns an exported cell into code execution in the reader's spreadsheet —
   * and the value in it usually came from whoever typed into the source system.
   *
   * The leading `'` is Excel's own convention and is invisible in the rendered
   * cell; Sheets honours it too. Fields that parse as a plain number are left
   * alone, so ordinary negatives survive — see {@link toNgeCsv}.
   */
  escapeFormulas?: boolean;
  /** Emit a first record from `data.columns`. Defaults to `true`. */
  header?: boolean;
  /**
   * The record separator. Defaults to `\r\n`, which is what RFC 4180 specifies.
   *
   * Every reader worth the name also accepts a bare `\n`, so this is a preference
   * rather than a correctness knob — but the spec is the better default for a
   * library, because the one place CRLF matters (Excel on Windows) is also the one
   * place a user is least able to diagnose it.
   */
  newline?: string;
  /** Which reading of each cell to write. Defaults to `formatted`. */
  values?: NgeCsvValues;
}

/** U+FEFF — a zero-width no-break space, read as a byte-order mark at a file's head. */
const NGE_CSV_BYTE_ORDER_MARK = '﻿';

/**
 * The leading characters a spreadsheet reads as the start of a formula.
 *
 * `=`, `+`, `-` and `@` are the classic four; the tab and the carriage return are
 * the two commonly left out, and they matter because a reader strips them before
 * deciding what the field is, so `\t=cmd` arrives as `=cmd`.
 */
const NGE_CSV_FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * A field that is wholly a number, sign and exponent included.
 *
 * ⚠️ The reason {@link NGE_CSV_FORMULA_PREFIXES} cannot be used on its own: `-` and
 * `+` are also how every negative and explicitly-signed number begins, so a naive
 * prefix test escapes each one and mangles a whole currency column. A regex rather
 * than `Number()`, which reads `''` and `' '` as `0`.
 */
const NGE_CSV_PLAIN_NUMBER = /^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/;

/**
 * Render neutral export data as RFC 4180 CSV — an **addon**, and the second half of
 * the epic's extensibility gate.
 *
 * It is a plain function over {@link NgeTableExportData} and touches nothing else:
 * no table instance, no Angular, no `@tanstack/*`, and above all no knowledge that
 * cell highlighting exists. That is the whole point. Highlighted-cell export is
 * therefore not a feature anyone built — it is what happens when the highlight
 * addon's predicate is handed to the export seam and the result is handed here:
 *
 * ```ts
 * const data = table.readNgeExportData({ cellPredicate: table.ngeHighlightPredicate() });
 * const csv = toNgeCsv(data);
 * ```
 *
 * Three independent pieces, none of which imports another. If this file had been a
 * `TableFeature` instead it could have reached the instance, and the composition
 * would have proved nothing.
 *
 * **Quoting is RFC 4180 and relative to the configured delimiter.** A field is
 * quoted when it contains the delimiter, a `"`, a `\r`, or a `\n`, and an embedded
 * `"` is doubled. ⚠️ Testing for a literal comma instead of `options.delimiter` is
 * the classic bug in this function: under `delimiter: ';'` it would quote a value
 * containing a comma (harmless but wrong) *and leave a value containing a semicolon
 * unquoted*, which silently splits one field into two on the reader's side. A spec
 * pins both halves.
 *
 * **Rows are re-aligned against `data.columns`, never emitted in cell order.** A
 * predicate-narrowed export is deliberately ragged — a row carries only its
 * surviving cells — so each row is indexed by `columnId` and a column with no cell
 * writes an empty field. That is what lets a highlighted-cell export come out
 * rectangular with no bookkeeping here, and it is why {@link NgeTableExportCell}
 * carries its `columnId` at all.
 *
 * Row order, column order, sorting, filtering, visibility and pinning are all
 * inherited: this reads `data` exactly as the seam produced it and never re-orders.
 *
 * **Formula-injection escaping is opt-in and off**, because it alters the user's
 * data — `escapeFormulas: true` prefixes a formula-shaped field with `'` and it no
 * longer round-trips. When on, the rule is dangerous-prefix **and** not-a-number:
 * `-1234.5` is a value and stays bare, `-2+3+cmd|'/C calc'!A0` is a payload and does
 * not. It applies to every field written — the header row and both `values`
 * readings — because a `raw` string is as dangerous as a formatted one, while a
 * `raw` number is already safe by the numeric guard rather than by its path. The
 * cost falls on a *formatted* negative such as `-$1,234.50`, which is not a plain
 * number and so is escaped; it was already text a spreadsheet could not sum.
 *
 * Escaping runs BEFORE the quoting decision, so the two compose in the order a
 * reader unwraps them: `=SUM(A1,A2)` becomes `"'=SUM(A1,A2)"`.
 *
 * @param data - The neutral shape from `table.readNgeExportData()`.
 * @param options - Overrides for the RFC 4180 defaults.
 * @returns The CSV text, with no trailing record separator.
 */
export function toNgeCsv(data: NgeTableExportData, options: NgeCsvOptions = {}): string {
  const {
    byteOrderMark = false,
    delimiter = ',',
    escapeFormulas = false,
    header = true,
    newline = '\r\n',
    values = 'formatted',
  } = options;

  const field: NgeCsvFieldOptions = { delimiter, escapeFormulas };
  const records: string[] = [];

  if (header) {
    records.push(
      toNgeCsvRecord(
        data.columns.map(column => column.header),
        field
      )
    );
  }

  for (const row of data.rows) {
    // Indexed rather than scanned: a wide export would otherwise be O(columns²) per
    // row, and the ragged case makes a positional read wrong as well as slow.
    const cellsByColumnId = new Map(row.cells.map(cell => [cell.columnId, cell]));

    records.push(
      toNgeCsvRecord(
        data.columns.map(column => readNgeCsvCell(cellsByColumnId.get(column.id), values)),
        field
      )
    );
  }

  // Joined, not terminated. A trailing separator is an empty final record to a strict
  // reader, and re-adding one is a single concatenation for a caller who wants it.
  return (byteOrderMark ? NGE_CSV_BYTE_ORDER_MARK : '') + records.join(newline);
}

/**
 * The same CSV as a `Blob`, ready for a download link.
 *
 * Downloading itself stays the host's concern — an object URL, an anchor, and a
 * filename are all application decisions, and a library that reached for
 * `document` here would stop working under SSR for no benefit.
 *
 * ⚠️ Options pass straight through, `byteOrderMark` included. A Blob is the case
 * where a user is most likely to open the result in Excel, so this is usually where
 * `{ byteOrderMark: true }` belongs — but defaulting it differently from
 * {@link toNgeCsv} would make two functions that claim to produce the same bytes
 * quietly disagree.
 *
 * @param data - The neutral shape from `table.readNgeExportData()`.
 * @param options - Overrides for the RFC 4180 defaults.
 */
export function toNgeCsvBlob(data: NgeTableExportData, options: NgeCsvOptions = {}): Blob {
  return new Blob([toNgeCsv(data, options)], { type: 'text/csv;charset=utf-8' });
}

/** One cell's text, or the empty string when a predicate dropped it. */
function readNgeCsvCell(cell: NgeTableExportCell | undefined, values: NgeCsvValues): string {
  if (!cell) {
    return '';
  }

  return values === 'raw' ? stringifyNgeCsvRaw(cell.raw) : cell.formatted;
}

/**
 * The `raw` reading of a value, as text.
 *
 * Deliberately not `String(value)` alone. `raw` exists so a machine downstream can
 * still use the value, and the two types that survives-or-dies on are the two the
 * export seam preserves rather than stringifies:
 *
 * - a `Date` becomes its **ISO** form, which sorts lexically and is unambiguous —
 *   `String(date)` yields `Mon Jan 01 2026 …`, which is neither.
 * - an object becomes **JSON** rather than `[object Object]`, which carries nothing.
 *
 * `null` / `undefined` become the empty string for the same reason the export seam
 * does it: an absent value in a table is a blank cell, not the word "null".
 */
function stringifyNgeCsvRaw(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/** The two settings that decide how one field is written, resolved once per document. */
interface NgeCsvFieldOptions {
  delimiter: string;
  escapeFormulas: boolean;
}

/** One record's fields, escaped and joined. */
function toNgeCsvRecord(fields: readonly string[], options: NgeCsvFieldOptions): string {
  return fields.map(field => escapeNgeCsvField(field, options)).join(options.delimiter);
}

/**
 * One field: neutralised if asked, then quoted if RFC 4180 requires it.
 *
 * ⚠️ The delimiter test reads the **configured** delimiter. A lone `\r` counts as a
 * line break independently of `\n`, because classic-Mac readers treat it as a record
 * separator — so a value carrying one has to be quoted even though it contains no
 * `\n`.
 *
 * ⚠️ The order is load-bearing. Neutralising first means the `'` lands **inside** the
 * quotes, which is where a reader looks for it; quoting first would bury it after the
 * opening `"` and leave the formula first in the field. It also keeps the two passes
 * independent — the `'` is not itself a character that triggers quoting, so adding it
 * can never change the quoting verdict.
 */
function escapeNgeCsvField(field: string, options: NgeCsvFieldOptions): string {
  const neutralised = options.escapeFormulas ? neutraliseNgeCsvFormula(field) : field;
  const needsQuoting =
    neutralised.includes(options.delimiter) ||
    neutralised.includes('"') ||
    neutralised.includes('\n') ||
    neutralised.includes('\r');

  // `replace(/"/g, …)` rather than `replaceAll`: the workspace's base tsconfig pins
  // `lib: ["es2020", "dom"]`, and `String.prototype.replaceAll` is ES2021.
  return needsQuoting ? `"${neutralised.replace(/"/g, '""')}"` : neutralised;
}

/**
 * A formula-shaped field, prefixed with `'` so a spreadsheet reads it as text.
 *
 * ⚠️ The numeric guard is the whole difficulty. Testing the prefix alone is the
 * obvious implementation and it escapes every negative number in the document —
 * `-1234.5` becoming `'-1234.5` is not a security fix, it is a corrupted column, and
 * it is silent because the file still opens. A field is only a formula if it starts
 * dangerously **and** is not simply a number.
 *
 * The prefix is Excel's own text marker: invisible in the cell, honoured by Sheets,
 * and one character. ⚠️ It is nevertheless a real change to the data — the field no
 * longer round-trips, and anything parsing the CSV as data rather than opening it as
 * a spreadsheet sees the `'`. That cost is why the flag defaults to off.
 */
function neutraliseNgeCsvFormula(field: string): string {
  const isFormulaShaped =
    NGE_CSV_FORMULA_PREFIXES.includes(field.charAt(0)) && !NGE_CSV_PLAIN_NUMBER.test(field);

  return isFormulaShaped ? `'${field}` : field;
}
