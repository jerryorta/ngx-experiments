/** Options for {@link formatMoney}. */
export interface FormatMoneyOptions {
  /** ISO 4217 currency code. Defaults to `'USD'` (matches `Account.currency`'s default). */
  currency?: string;
  /** BCP 47 locale used for grouping/decimal symbols. Defaults to `'en-US'`. */
  locale?: string;
}

/**
 * Render integer minor units (cents) as a localized currency string for
 * display — `formatMoney(123456)` → `'$1,234.56'`.
 *
 * **Negative style:** a leading minus sign ahead of the currency symbol, e.g.
 * `formatMoney(-1234)` → `'-$12.34'` — never accounting-style parentheses.
 * Exact inverse of {@link parseMoney}: `parseMoney(formatMoney(cents))` round-trips
 * to `cents` for any integer input.
 */
export function formatMoney(cents: number, opts: FormatMoneyOptions = {}): string {
  const { currency = 'USD', locale = 'en-US' } = opts;
  // `=== 0` also catches `-0` (Object.is(-0, 0) is false, but `-0 === 0` is
  // true), so a zero balance never renders as "-$0.00".
  const safeCents = cents === 0 ? 0 : cents;

  return new Intl.NumberFormat(locale, { currency, style: 'currency' }).format(safeCents / 100);
}

/**
 * Parse a user- or display-formatted amount back into integer cents — the
 * inverse of {@link formatMoney}. Tolerates a leading currency symbol,
 * thousands-separator commas, surrounding whitespace, and a `-` marking a
 * negative amount anywhere in the string (`'-$1,234.56'` parses the same as
 * `'$-1,234.56'`, both to `-123456`). Throws if no digits remain once
 * currency/grouping punctuation is stripped.
 */
export function parseMoney(input: string): number {
  const isNegative = input.includes('-');
  const numeric = input.replace(/[^0-9.]/g, '');

  if (numeric === '' || !/^\d+(\.\d+)?$/.test(numeric)) {
    throw new Error(`parseMoney: not a valid amount: "${input}"`);
  }

  // Round (not truncate) to correct for float drift introduced by `* 100`
  // (e.g. `19.99 * 100 === 1998.9999999999998`).
  const cents = Math.round(Number(numeric) * 100);
  const signedCents = isNegative ? -cents : cents;

  return signedCents === 0 ? 0 : signedCents; // normalize -0, same reasoning as formatMoney
}
