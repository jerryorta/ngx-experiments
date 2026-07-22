import {
  DEFAULT_CHART_BASE_THEME,
  DEFAULT_FINANCIAL_LAYER_THEME,
  DEFAULT_GAUGE_LAYER_THEME,
  DEFAULT_PIE_LAYER_THEME,
  DEFAULT_RADIAL_BAR_LAYER_THEME,
  DEFAULT_SCATTER_LAYER_THEME,
  DEFAULT_SUNBURST_LAYER_THEME,
} from './nge-chart-theme.defaults';
import {
  mergeBaseTheme,
  mergeChartTheme,
  mergeFinancialLayerTheme,
  mergeGaugeLayerTheme,
  mergePieLayerTheme,
  mergeRadialBarLayerTheme,
  mergeScatterLayerTheme,
  mergeSunburstLayerTheme,
} from './nge-chart-theme.fns';

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

describe('mergeFinancialLayerTheme', () => {
  it('returns the full default theme when no theme is provided', () => {
    const resolved = mergeFinancialLayerTheme(undefined);

    expect(resolved).toEqual(DEFAULT_FINANCIAL_LAYER_THEME);
    // Spot-check the literal up/down semantics + the kagi yang/yin widths.
    expect(resolved.up.color).toBe('#4caf50');
    expect(resolved.down.color).toBe('#f44336');
    expect(resolved.kagi.yangWidth).toBe(2.5);
    expect(resolved.kagi.yinWidth).toBe(1.25);
  });

  it('overrides only up.color and preserves every sibling default on a partial override', () => {
    const resolved = mergeFinancialLayerTheme({ up: { color: '#123456' } });

    // The overridden field wins.
    expect(resolved.up.color).toBe('#123456');
    // Sibling fields inside the same `up` sub-slice keep their defaults.
    expect(resolved.up.stroke).toBe(DEFAULT_FINANCIAL_LAYER_THEME.up.stroke);
    expect(resolved.up.strokeWidth).toBe(DEFAULT_FINANCIAL_LAYER_THEME.up.strokeWidth);
    expect(resolved.up.fillOpacity).toBe(DEFAULT_FINANCIAL_LAYER_THEME.up.fillOpacity);
    // The untouched sub-slices flow through as the full defaults.
    expect(resolved.down).toEqual(DEFAULT_FINANCIAL_LAYER_THEME.down);
    expect(resolved.wick).toEqual(DEFAULT_FINANCIAL_LAYER_THEME.wick);
    expect(resolved.kagi).toEqual(DEFAULT_FINANCIAL_LAYER_THEME.kagi);
  });
});

describe('mergeGaugeLayerTheme', () => {
  it('returns the full default theme when no theme is provided', () => {
    const resolved = mergeGaugeLayerTheme(undefined);

    expect(resolved).toEqual(DEFAULT_GAUGE_LAYER_THEME);
    expect(resolved.threshold.colors).toEqual(DEFAULT_GAUGE_LAYER_THEME.threshold.colors);
    expect(resolved.value.color).toBe('var(--chart-primary)');
  });

  it('deep-merges a partial value override and preserves every value sibling + untouched sub-slice', () => {
    const resolved = mergeGaugeLayerTheme({ value: { color: '#123456' } });

    // The overridden field wins.
    expect(resolved.value.color).toBe('#123456');
    // The sibling field inside the same `value` sub-slice keeps its default.
    expect(resolved.value.opacity).toBe(DEFAULT_GAUGE_LAYER_THEME.value.opacity);
    // The untouched sub-slices flow through as the full defaults.
    expect(resolved.track).toEqual(DEFAULT_GAUGE_LAYER_THEME.track);
    expect(resolved.needle).toEqual(DEFAULT_GAUGE_LAYER_THEME.needle);
    expect(resolved.threshold).toEqual(DEFAULT_GAUGE_LAYER_THEME.threshold);
    expect(resolved.label).toEqual(DEFAULT_GAUGE_LAYER_THEME.label);
  });

  it('lets a user override the threshold palette while keeping the other slices at default', () => {
    const resolved = mergeGaugeLayerTheme({ threshold: { colors: ['#111111', '#222222'] } });

    expect(resolved.threshold.colors).toEqual(['#111111', '#222222']);
    expect(resolved.track).toEqual(DEFAULT_GAUGE_LAYER_THEME.track);
    expect(resolved.value).toEqual(DEFAULT_GAUGE_LAYER_THEME.value);
  });
});

describe('mergePieLayerTheme', () => {
  it('returns the full default theme (incl. the shared 6-entry palette) when no theme is provided', () => {
    const resolved = mergePieLayerTheme(undefined);

    expect(resolved).toEqual(DEFAULT_PIE_LAYER_THEME);
    expect(resolved.slice.colors).toEqual(DEFAULT_PIE_LAYER_THEME.slice.colors);
    expect(resolved.slice.colors[0]).toBe('var(--chart-primary)');
  });

  it('lets a user override the slice palette', () => {
    const resolved = mergePieLayerTheme({ slice: { colors: ['#111111', '#222222'] } });

    expect(resolved.slice.colors).toEqual(['#111111', '#222222']);
  });

  it('deep-merges a partial slice override and preserves every sibling default', () => {
    const resolved = mergePieLayerTheme({ slice: { stroke: '#abcdef' } });

    // The overridden field wins.
    expect(resolved.slice.stroke).toBe('#abcdef');
    // Sibling fields inside the same `slice` sub-slice keep their defaults.
    expect(resolved.slice.colors).toEqual(DEFAULT_PIE_LAYER_THEME.slice.colors);
    expect(resolved.slice.opacity).toBe(DEFAULT_PIE_LAYER_THEME.slice.opacity);
    // The untouched `label` sub-slice flows through as the full default.
    expect(resolved.label).toEqual(DEFAULT_PIE_LAYER_THEME.label);
  });
});

describe('mergeSunburstLayerTheme', () => {
  it('returns the full default theme (incl. the shared 6-entry palette) when no theme is provided', () => {
    const resolved = mergeSunburstLayerTheme(undefined);

    expect(resolved).toEqual(DEFAULT_SUNBURST_LAYER_THEME);
    expect(resolved.segment.colors).toEqual(DEFAULT_SUNBURST_LAYER_THEME.segment.colors);
    expect(resolved.segment.colors[0]).toBe('var(--chart-primary)');
  });

  it('lets a user override the segment palette', () => {
    const resolved = mergeSunburstLayerTheme({ segment: { colors: ['#111111', '#222222'] } });

    expect(resolved.segment.colors).toEqual(['#111111', '#222222']);
  });

  it('deep-merges a partial segment override and preserves every sibling default', () => {
    const resolved = mergeSunburstLayerTheme({ segment: { stroke: '#abcdef' } });

    // The overridden field wins.
    expect(resolved.segment.stroke).toBe('#abcdef');
    // Sibling fields inside the same `segment` sub-slice keep their defaults.
    expect(resolved.segment.colors).toEqual(DEFAULT_SUNBURST_LAYER_THEME.segment.colors);
    expect(resolved.segment.opacity).toBe(DEFAULT_SUNBURST_LAYER_THEME.segment.opacity);
    // The untouched `label` sub-slice flows through as the full default.
    expect(resolved.label).toEqual(DEFAULT_SUNBURST_LAYER_THEME.label);
  });
});

describe('mergeRadialBarLayerTheme', () => {
  it('returns the full default theme (incl. the shared 6-entry bar palette) when no theme is provided', () => {
    const resolved = mergeRadialBarLayerTheme(undefined);

    expect(resolved).toEqual(DEFAULT_RADIAL_BAR_LAYER_THEME);
    expect(resolved.bar.colors).toEqual(DEFAULT_RADIAL_BAR_LAYER_THEME.bar.colors);
    expect(resolved.bar.colors[0]).toBe('var(--chart-primary)');
  });

  it('deep-merges a partial bar override and preserves every bar sibling + untouched sub-slice', () => {
    const resolved = mergeRadialBarLayerTheme({ bar: { colors: ['#123456'] } });

    // The overridden field wins.
    expect(resolved.bar.colors).toEqual(['#123456']);
    // Sibling fields inside the same `bar` sub-slice keep their defaults.
    expect(resolved.bar.color).toBe(DEFAULT_RADIAL_BAR_LAYER_THEME.bar.color);
    expect(resolved.bar.stroke).toBe(DEFAULT_RADIAL_BAR_LAYER_THEME.bar.stroke);
    expect(resolved.bar.strokeWidth).toBe(DEFAULT_RADIAL_BAR_LAYER_THEME.bar.strokeWidth);
    expect(resolved.bar.opacity).toBe(DEFAULT_RADIAL_BAR_LAYER_THEME.bar.opacity);
    // The untouched sub-slices flow through as the full defaults.
    expect(resolved.area).toEqual(DEFAULT_RADIAL_BAR_LAYER_THEME.area);
    expect(resolved.cell).toEqual(DEFAULT_RADIAL_BAR_LAYER_THEME.cell);
    expect(resolved.label).toEqual(DEFAULT_RADIAL_BAR_LAYER_THEME.label);
  });

  it('deep-merges a partial cell override and preserves every cell sibling + untouched sub-slice', () => {
    const resolved = mergeRadialBarLayerTheme({ cell: { minOpacity: 0.3 } });

    // The overridden field wins.
    expect(resolved.cell.minOpacity).toBe(0.3);
    // Sibling fields inside the same `cell` sub-slice keep their defaults.
    expect(resolved.cell.color).toBe(DEFAULT_RADIAL_BAR_LAYER_THEME.cell.color);
    expect(resolved.cell.stroke).toBe(DEFAULT_RADIAL_BAR_LAYER_THEME.cell.stroke);
    expect(resolved.cell.strokeWidth).toBe(DEFAULT_RADIAL_BAR_LAYER_THEME.cell.strokeWidth);
    // The untouched sub-slices flow through as the full defaults.
    expect(resolved.area).toEqual(DEFAULT_RADIAL_BAR_LAYER_THEME.area);
    expect(resolved.bar).toEqual(DEFAULT_RADIAL_BAR_LAYER_THEME.bar);
    expect(resolved.label).toEqual(DEFAULT_RADIAL_BAR_LAYER_THEME.label);
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

  it("keys the diverging-bar slice by its layer type ('diverging-bar') so renderLayers' theme[layer.type] lookup resolves", () => {
    // Regression: the slice was keyed 'divergingBar' (camelCase) while the layer
    // registry looks up theme['diverging-bar'] (the layer `type`), so user
    // diverging-bar theme overrides silently never reached the renderer.
    const resolved = mergeChartTheme(undefined);

    expect(resolved['diverging-bar']).toBeDefined();
    expect((resolved as Record<string, unknown>)['divergingBar']).toBeUndefined();
  });

  it('applies a user diverging-bar theme override under the hyphenated key', () => {
    const resolved = mergeChartTheme({ 'diverging-bar': { backgroundBar: { color: '#00ff00' } } });

    expect(resolved['diverging-bar']?.backgroundBar?.color).toBe('#00ff00');
  });

  it('includes the pie slice by default and applies a user pie override', () => {
    expect(mergeChartTheme(undefined).pie).toEqual(DEFAULT_PIE_LAYER_THEME);

    const resolved = mergeChartTheme({ pie: { slice: { colors: ['#abc', '#def'] } } });
    expect(resolved.pie?.slice?.colors).toEqual(['#abc', '#def']);
  });

  it('includes the sunburst slice by default and applies a user sunburst override', () => {
    expect(mergeChartTheme(undefined).sunburst).toEqual(DEFAULT_SUNBURST_LAYER_THEME);

    const resolved = mergeChartTheme({ sunburst: { segment: { colors: ['#abc', '#def'] } } });
    expect(resolved.sunburst?.segment?.colors).toEqual(['#abc', '#def']);
  });

  it('includes the gauge slice by default and applies a user gauge override', () => {
    expect(mergeChartTheme(undefined).gauge).toEqual(DEFAULT_GAUGE_LAYER_THEME);

    const resolved = mergeChartTheme({ gauge: { value: { color: '#abc' } } });
    expect(resolved.gauge?.value?.color).toBe('#abc');
  });
});
