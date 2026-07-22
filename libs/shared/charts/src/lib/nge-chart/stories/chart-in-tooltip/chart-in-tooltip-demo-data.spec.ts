import type {
  NgeChartConfig,
  NgeGroupedBarDataPoint,
  NgePieDataPoint,
  NgePieLayerConfig,
} from '../../../core/config';

import {
  colorByLabel,
  colorBySeries,
  GROUPED_DATA,
  pieConfigsByColumn,
  pieConfigsByGroup,
  STACKED_DATA,
} from './chart-in-tooltip-demo-data';

/** Read the single pie layer a pie preset produces. */
function pieLayer(config: NgeChartConfig): NgePieLayerConfig {
  return config.layers[0] as NgePieLayerConfig;
}

function slices(config: NgeChartConfig): NgePieDataPoint[] {
  return pieLayer(config).data;
}

describe('chart-in-tooltip demo-data derivations', () => {
  describe('pieConfigsByColumn (stacked → donut)', () => {
    const configs = pieConfigsByColumn(STACKED_DATA, colorBySeries);

    it('produces one config per unique category', () => {
      expect([...configs.keys()].sort()).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    });

    it('maps a column to one donut slice per segment, preserving order', () => {
      const q1 = configs.get('Q1');
      expect(q1).toBeDefined();
      expect(slices(q1!).map(s => s.label)).toEqual(['Rent', 'Payroll', 'Marketing', 'Utilities']);
      expect(slices(q1!).map(s => s.value)).toEqual([1200, 3200, 800, 300]);
    });

    it('colors each slice from the shared series palette (correlates with the bar)', () => {
      const q1 = configs.get('Q1')!;
      for (const slice of slices(q1)) {
        expect(slice.color).toBe(colorBySeries[slice.label]);
      }
    });

    it('renders a donut (innerRadius 0.6)', () => {
      expect(pieLayer(configs.get('Q1')!).innerRadius).toBe(0.6);
    });
  });

  describe('pieConfigsByGroup (grouped → pie)', () => {
    const configs = pieConfigsByGroup(GROUPED_DATA, colorByLabel);

    it('produces one config per unique group', () => {
      expect([...configs.keys()].sort()).toEqual(['Desktop', 'Mobile', 'Tablet']);
    });

    it('maps a group to one pie slice per series', () => {
      const mobile = configs.get('Mobile');
      expect(mobile).toBeDefined();
      expect(slices(mobile!).map(s => s.label)).toEqual(['Organic', 'Paid', 'Referral']);
      expect(slices(mobile!).map(s => s.value)).toEqual([420, 280, 150]);
    });

    it('carries the per-datum color onto each slice', () => {
      const mobile = configs.get('Mobile')!;
      for (const slice of slices(mobile)) {
        expect(slice.color).toBe(colorByLabel[slice.label]);
      }
    });

    it('renders a full pie (innerRadius 0)', () => {
      expect(pieLayer(configs.get('Mobile')!).innerRadius).toBe(0);
    });

    it('falls back to the label palette when a datum has no explicit color', () => {
      const noColor: NgeGroupedBarDataPoint[] = [
        { groupId: 'G', label: 'Organic', value: 10 },
        { groupId: 'G', label: 'Paid', value: 20 },
      ];
      const cfg = pieConfigsByGroup(noColor, colorByLabel).get('G')!;
      expect(slices(cfg).map(s => s.color)).toEqual([
        colorByLabel['Organic'],
        colorByLabel['Paid'],
      ]);
    });
  });
});
