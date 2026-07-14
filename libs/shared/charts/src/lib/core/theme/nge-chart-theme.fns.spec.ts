import { DEFAULT_CHART_BASE_THEME, DEFAULT_SCATTER_LAYER_THEME } from './nge-chart-theme.defaults';
import { mergeBaseTheme, mergeChartTheme, mergeScatterLayerTheme } from './nge-chart-theme.fns';

describe('mergeScatterLayerTheme', () => {
  it('exposes the default multi-series palette when no theme is provided', () => {
    const resolved = mergeScatterLayerTheme(undefined);

    expect(resolved.point.colors).toEqual(DEFAULT_SCATTER_LAYER_THEME.point.colors);
    expect(resolved.point.colors[0]).toBe('var(--chart-primary)');
  });

  it('flows the default palette through an empty override', () => {
    const resolved = mergeScatterLayerTheme({});

    expect(resolved.point.colors).toEqual(DEFAULT_SCATTER_LAYER_THEME.point.colors);
  });

  it('lets a user override the palette', () => {
    const resolved = mergeScatterLayerTheme({ point: { colors: ['#111111', '#222222'] } });

    expect(resolved.point.colors).toEqual(['#111111', '#222222']);
  });

  it('keeps the default palette when only other point fields are overridden', () => {
    const resolved = mergeScatterLayerTheme({ point: { color: '#abcdef' } });

    expect(resolved.point.color).toBe('#abcdef');
    expect(resolved.point.colors).toEqual(DEFAULT_SCATTER_LAYER_THEME.point.colors);
  });
});

describe('mergeBaseTheme', () => {
  it('deep-merges axis.group so an override does not clobber the rest of the group defaults', () => {
    const resolved = mergeBaseTheme({ axis: { group: { tint: '#123' } } });

    expect(resolved.axis.group?.tint).toBe('#123');
    expect(resolved.axis.group?.labelColor).toBe(DEFAULT_CHART_BASE_THEME.axis.group?.labelColor);
  });
});

describe('mergeChartTheme', () => {
  it('deep-merges axis.group so an override does not clobber the rest of the group defaults', () => {
    const resolved = mergeChartTheme({ axis: { group: { tint: '#123' } } });

    expect(resolved.axis?.group?.tint).toBe('#123');
    expect(resolved.axis?.group?.labelColor).toBe(DEFAULT_CHART_BASE_THEME.axis.group?.labelColor);
  });
});
