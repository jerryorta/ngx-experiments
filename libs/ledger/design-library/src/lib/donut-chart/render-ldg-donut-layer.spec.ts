import type { NgeChartLayerContext } from '@nge/charts';

import { select } from 'd3';

import type { LdgDonutLayerConfig, LdgDonutSegment } from './ldg-donut.models';

import { createLdgDonutChartConfig } from './ldg-donut-chart.preset';
import { renderLdgDonutLayer } from './render-ldg-donut-layer';

type DonutContext = NgeChartLayerContext<LdgDonutSegment, LdgDonutLayerConfig, undefined>;

const SEGMENTS: LdgDonutSegment[] = [
  { color: 'var(--ldg-category-1)', label: 'Groceries', value: 420 },
  { color: 'var(--ldg-category-2)', label: 'Dining', value: 180 },
  { color: 'var(--ldg-category-3)', label: 'Housing', value: 900 },
];

/** Build a real (jsdom) SVG `<g>`, a d3 selection over it, and a render context. */
function makeContext(data: LdgDonutSegment[], config: Partial<LdgDonutLayerConfig> = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const layerConfig: LdgDonutLayerConfig = { data, renderer: renderLdgDonutLayer, type: 'donut', ...config };
  const context = {
    bounds: select(g),
    config: layerConfig,
    data,
    dimensions: { boundedHeight: 200, boundedWidth: 200, height: 200, margin: { bottom: 0, left: 0, right: 0, top: 0 } },
    margins: { bottom: 0, left: 0, right: 0, top: 0 },
    scales: {} as DonutContext['scales'],
    theme: undefined,
  } as DonutContext;

  return { context, g };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('renderLdgDonutLayer', () => {
  it('draws one arc path per positive-value segment', () => {
    const { context, g } = makeContext(SEGMENTS);
    renderLdgDonutLayer(context);
    expect(g.querySelectorAll('path.ldg-donut__slice').length).toBe(SEGMENTS.length);
  });

  it('preserves segment order rather than sorting by value', () => {
    // Housing (900) is the largest but 3rd in the array — it must stay 3rd.
    const { context, g } = makeContext(SEGMENTS);
    renderLdgDonutLayer(context);
    const paths = g.querySelectorAll<SVGPathElement>('path.ldg-donut__slice');
    expect(paths[0].getAttribute('aria-label')).toContain('Groceries');
    expect(paths[2].getAttribute('aria-label')).toContain('Housing');
  });

  it('fills each slice with the segment color (falling back to the theme palette)', () => {
    const { context, g } = makeContext([SEGMENTS[0], { label: 'Uncolored', value: 100 }]);
    renderLdgDonutLayer(context);
    const paths = g.querySelectorAll<SVGPathElement>('path.ldg-donut__slice');
    expect(paths[0].style.fill).toBe('var(--ldg-category-1)');
    expect(paths[1].style.fill).toContain('var(--chart-'); // theme fallback
  });

  it('skips zero/negative-value segments', () => {
    const { context, g } = makeContext([
      ...SEGMENTS,
      { color: 'var(--ldg-category-8)', label: 'Refunded', value: -50 },
      { color: 'var(--ldg-category-7)', label: 'Untouched', value: 0 },
    ]);
    renderLdgDonutLayer(context);
    expect(g.querySelectorAll('path.ldg-donut__slice').length).toBe(SEGMENTS.length);
  });

  it('draws the empty-state ring (no arcs) when every value is 0', () => {
    const { context, g } = makeContext([
      { label: 'Empty A', value: 0 },
      { label: 'Empty B', value: 0 },
    ]);
    renderLdgDonutLayer(context);
    expect(g.querySelectorAll('path.ldg-donut__slice').length).toBe(0);
    expect(g.querySelector('.ldg-donut__empty-ring')).toBeTruthy();
  });

  it('draws the empty-state ring for an empty data array', () => {
    const { context, g } = makeContext([]);
    renderLdgDonutLayer(context);
    expect(g.querySelector('.ldg-donut__empty-ring')).toBeTruthy();
  });

  it('emits onSegmentClick with the segment on click', () => {
    const onSegmentClick = jest.fn();
    const { context, g } = makeContext(SEGMENTS, { onSegmentClick });
    renderLdgDonutLayer(context);
    g.querySelectorAll<SVGPathElement>('path.ldg-donut__slice')[1].dispatchEvent(new MouseEvent('click'));
    expect(onSegmentClick).toHaveBeenCalledWith(SEGMENTS[1]);
  });

  it('emits onSegmentClick on Enter keydown (keyboard activation)', () => {
    const onSegmentClick = jest.fn();
    const { context, g } = makeContext(SEGMENTS, { onSegmentClick });
    renderLdgDonutLayer(context);
    g.querySelectorAll<SVGPathElement>('path.ldg-donut__slice')[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter' })
    );
    expect(onSegmentClick).toHaveBeenCalledWith(SEGMENTS[0]);
  });

  it('centers the slice group at the bounds center (the arc paths are origin-centered)', () => {
    const { context, g } = makeContext(SEGMENTS);
    renderLdgDonutLayer(context);
    // boundedWidth/Height = 200 → center (100,100)
    expect(g.querySelector('.ldg-donut')?.getAttribute('transform')).toBe('translate(100, 100)');
  });

  it('draws centerValue/centerLabel text only when provided', () => {
    const { context, g } = makeContext(SEGMENTS, { centerLabel: 'Total', centerValue: '$1,500' });
    renderLdgDonutLayer(context);
    expect(g.querySelector('.ldg-donut__center-value')?.textContent).toContain('$1,500');
    expect(g.querySelector('.ldg-donut__center-label')?.textContent).toContain('Total');

    const bare = makeContext(SEGMENTS);
    renderLdgDonutLayer(bare.context);
    expect(bare.g.querySelector('.ldg-donut__center')).toBeFalsy();
  });
});

describe('createLdgDonutChartConfig', () => {
  it('builds an axis-less config with a single donut layer wired to the renderer', () => {
    const config = createLdgDonutChartConfig({ data: SEGMENTS });
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
    expect(config.layers).toHaveLength(1);
    const layer = config.layers.flat()[0] as unknown as LdgDonutLayerConfig;
    expect(layer.type).toBe('donut');
    expect(layer.renderer).toBe(renderLdgDonutLayer);
    expect(layer.data).toBe(SEGMENTS);
  });

  it('populates legend items from segments only when legend is enabled', () => {
    expect(createLdgDonutChartConfig({ data: SEGMENTS }).legend).toBeUndefined();

    const withLegend = createLdgDonutChartConfig({ data: SEGMENTS, legend: true });
    expect(withLegend.legend?.enabled).toBe(true);
    expect(withLegend.legend?.items).toEqual([
      { color: 'var(--ldg-category-1)', label: 'Groceries' },
      { color: 'var(--ldg-category-2)', label: 'Dining' },
      { color: 'var(--ldg-category-3)', label: 'Housing' },
    ]);
  });

  it('passes centerLabel/centerValue/thickness/onSegmentClick through to the layer', () => {
    const onSegmentClick = jest.fn();
    const layer = createLdgDonutChartConfig({
      centerLabel: 'Total',
      centerValue: '$1,500',
      data: SEGMENTS,
      onSegmentClick,
      thickness: 0.8,
    }).layers.flat()[0] as unknown as LdgDonutLayerConfig;

    expect(layer.centerLabel).toBe('Total');
    expect(layer.centerValue).toBe('$1,500');
    expect(layer.thickness).toBe(0.8);
    layer.onSegmentClick?.(SEGMENTS[0]);
    expect(onSegmentClick).toHaveBeenCalledWith(SEGMENTS[0]);
  });
});
