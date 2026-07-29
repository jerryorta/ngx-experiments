import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  type NgeTableFixtureRow,
} from '../testing';
import { createNgeTableConfig } from './nge-table-config';
import { NGE_TABLE_DEFAULTS } from './nge-table-defaults';

const rows = createNgeTableFixture({ rows: 3 });

describe('createNgeTableConfig', () => {
  it('fills geometry from NGE_TABLE_DEFAULTS', () => {
    const config = createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
    });

    expect(config.columnDefaultWidth).toBe(NGE_TABLE_DEFAULTS.columnDefaultWidth);
    expect(config.columnMaxWidth).toBe(NGE_TABLE_DEFAULTS.columnMaxWidth);
    expect(config.columnMinWidth).toBe(NGE_TABLE_DEFAULTS.columnMinWidth);
    expect(config.headerHeight).toBe(NGE_TABLE_DEFAULTS.headerHeight);
    expect(config.rowHeight).toBe(NGE_TABLE_DEFAULTS.rowHeight);
  });

  it('defaults sorting on and the not-yet-shipped capabilities off', () => {
    const config = createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
    });

    expect(config.enableSorting).toBe(true);
    expect(config.enableColumnResizing).toBe(false);
    expect(config.enablePinning).toBe(false);
    expect(config.enableRowSelection).toBe(false);
  });

  it('lets every default be overridden', () => {
    const config = createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
      enableSorting: false,
      rowHeight: 64,
    });

    expect(config.enableSorting).toBe(false);
    expect(config.rowHeight).toBe(64);
  });

  it('passes rows and columns through untouched', () => {
    const config = createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
    });

    expect(config.data).toBe(rows);
    expect(config.columns).toBe(NGE_TABLE_FIXTURE_COLUMNS);
  });
});
