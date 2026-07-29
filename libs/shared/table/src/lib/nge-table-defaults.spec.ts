import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { NGE_TABLE_DEFAULTS } from './nge-table-defaults';

const TOKENS_SCSS = readFileSync(join(__dirname, 'styles', '_table-tokens.scss'), 'utf-8');

/** The token file minus `//` comment lines — i.e. only what SCSS actually emits. */
const TOKEN_DECLARATIONS = TOKENS_SCSS.replace(/^\s*\/\/.*$/gm, '');

describe('NGE_TABLE_DEFAULTS', () => {
  it('supplies every geometry value the layout code depends on', () => {
    expect(NGE_TABLE_DEFAULTS).toEqual({
      columnDefaultWidth: 160,
      columnMaxWidth: 800,
      columnMinWidth: 60,
      expansionColumnWidth: 44,
      headerHeight: 44,
      rowDetailHeight: 120,
      rowHeight: 40,
      selectionColumnWidth: 44,
    });
  });

  it('keeps the resize clamp coherent', () => {
    expect(NGE_TABLE_DEFAULTS.columnMinWidth).toBeLessThan(NGE_TABLE_DEFAULTS.columnDefaultWidth);
    expect(NGE_TABLE_DEFAULTS.columnDefaultWidth).toBeLessThan(NGE_TABLE_DEFAULTS.columnMaxWidth);
  });

  // The SCSS token file and this constant describe the same geometry. They are
  // separate sources by necessity (one is consumed by the browser, the other by
  // virtualization math), so drift between them is the failure mode worth a test.
  describe('parity with the --nge-table-* token contract', () => {
    const pxTokenValue = (name: string): number => {
      const match = new RegExp(`--nge-table-${name}:\\s*(\\d+)px;`).exec(TOKEN_DECLARATIONS);
      if (!match) {
        throw new Error(`--nge-table-${name} not found in _table-tokens.scss`);
      }
      return Number(match[1]);
    };

    it.each([
      ['row-height', 'rowHeight'],
      ['header-height', 'headerHeight'],
      ['column-min-width', 'columnMinWidth'],
      ['column-default-width', 'columnDefaultWidth'],
      ['column-max-width', 'columnMaxWidth'],
      ['selection-column-width', 'selectionColumnWidth'],
      ['expansion-column-width', 'expansionColumnWidth'],
      ['row-detail-height', 'rowDetailHeight'],
    ] as const)('--nge-table-%s matches %s', (token, key) => {
      expect(pxTokenValue(token)).toBe(NGE_TABLE_DEFAULTS[key]);
    });
  });

  // Angular Material is banned in this library — the whole point of an
  // own-namespace contract is rendering correctly with no theme system present.
  // Comments are stripped first so prose *about* the ban does not trip the check.
  it('declares no Angular Material tokens anywhere in the contract', () => {
    expect(TOKEN_DECLARATIONS).not.toMatch(/--mat-sys-|\bmat-/);
  });

  it('declares every token under the --nge-table-* namespace', () => {
    const declared = [...TOKEN_DECLARATIONS.matchAll(/^\s*(--[\w-]+):/gm)].map(([, name]) => name);

    expect(declared.length).toBeGreaterThan(0);
    expect(declared.filter(name => !name.startsWith('--nge-table-'))).toEqual([]);
  });
});
