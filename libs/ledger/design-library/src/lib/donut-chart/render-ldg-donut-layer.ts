import type { PieArcDatum } from 'd3';
import type { Selection } from 'd3-selection';

import { arc, pie, select } from 'd3';
import 'd3-transition';

import type { NgeChartLayerContext, NgeChartLayerRenderFn } from '@nge/charts';

import type { LdgDonutLayerConfig, LdgDonutLayerTheme, LdgDonutSegment } from './ldg-donut.models';

import { mergeLdgDonutLayerTheme } from './ldg-donut.theme';

const PAD_ANGLE = 0.008;
const CORNER_RADIUS = 3;
// Headroom (px) between the outer radius and the bounds edge so a hovered slice
// can pop outward by this much without clipping.
const HOVER_EXPANSION = 4;
const HOVER_MS = 150;
const MIN_THICKNESS = 0;
const MAX_THICKNESS = 0.92;

type DonutGroup = Selection<SVGGElement, unknown, null, undefined>;

/** Keep `thickness` in a sane inner/outer ratio — 1 collapses the ring to nothing. */
function clampThickness(value: number): number {
  return Math.min(Math.max(value, MIN_THICKNESS), MAX_THICKNESS);
}

/** Draw the optional center value/label as SVG text at the (already-centered) group origin. */
function drawCenter(group: DonutGroup, config: LdgDonutLayerConfig, theme: LdgDonutLayerTheme): void {
  const { centerLabel, centerValue } = config;
  if (!centerLabel && !centerValue) return;

  const center = group.append('g').attr('class', 'ldg-donut__center').attr('text-anchor', 'middle');

  if (centerValue) {
    center
      .append('text')
      .attr('class', 'ldg-donut__center-value')
      .attr('dy', centerLabel ? '-0.1em' : '0.35em')
      .style('fill', theme.centerValueColor)
      .style('font-size', '1.25rem')
      .style('font-weight', '700')
      .text(centerValue);
  }

  if (centerLabel) {
    center
      .append('text')
      .attr('class', 'ldg-donut__center-label')
      .attr('dy', centerValue ? '1.25em' : '0.35em')
      .style('fill', theme.centerLabelColor)
      .style('font-size', '0.6875rem')
      .style('letter-spacing', '0.04em')
      .style('text-transform', 'uppercase')
      .text(centerLabel);
  }
}

/**
 * Pure D3 donut/pie render fn — the promotable layer behind `ldg-donut-chart`.
 * Draws arcs into `context.bounds`, deriving `center` / `radius` from
 * `context.dimensions` and ignoring the shared `scales` (a radial layer builds
 * its own geometry, like the bullet layer). Slice colors come from each
 * segment's `color` or the theme's `--chart-*` palette; hover pops the slice
 * out; a native `<title>` supplies the tooltip; Enter/Space/click emit
 * `config.onSegmentClick`. Zero/negative values are dropped; an all-empty
 * dataset draws a placeholder ring.
 */
export const renderLdgDonutLayer: NgeChartLayerRenderFn<
  LdgDonutSegment,
  LdgDonutLayerConfig,
  LdgDonutLayerTheme | undefined
> = (
  context: NgeChartLayerContext<LdgDonutSegment, LdgDonutLayerConfig, LdgDonutLayerTheme | undefined>
): void => {
  const { bounds, config, data, dimensions } = context;
  if (!bounds) return;

  const theme = mergeLdgDonutLayerTheme(context.theme);
  const segments = (data ?? []).filter(segment => segment.value > 0);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  const cx = dimensions.boundedWidth / 2;
  const cy = dimensions.boundedHeight / 2;
  const outerRadius = Math.max(0, Math.min(dimensions.boundedWidth, dimensions.boundedHeight) / 2 - HOVER_EXPANSION);
  const innerRadius = outerRadius * clampThickness(config.thickness ?? 0.55);

  // Clear + redraw on each render (config/data changes are infrequent; hover is
  // a local D3 transition, never a re-render). The group is translated to the
  // bounds center, since d3.arc() emits paths centered on the origin.
  bounds.select('.ldg-donut').remove();
  const group: DonutGroup = bounds
    .append('g')
    .attr('class', 'ldg-donut')
    .attr('transform', `translate(${cx}, ${cy})`);

  if (total <= 0) {
    group
      .append('circle')
      .attr('class', 'ldg-donut__empty-ring')
      .attr('r', (outerRadius + innerRadius) / 2)
      .attr('fill', 'none')
      .attr('stroke-width', Math.max(1, outerRadius - innerRadius))
      .style('stroke', theme.emptyRingColor);
    drawCenter(group, config, theme);
    return;
  }

  const pieGen = pie<LdgDonutSegment>()
    .value(segment => segment.value)
    .sort(null)
    .padAngle(PAD_ANGLE);
  const arcGen = arc<PieArcDatum<LdgDonutSegment>>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .cornerRadius(CORNER_RADIUS);
  const hoverArcGen = arc<PieArcDatum<LdgDonutSegment>>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius + HOVER_EXPANSION)
    .cornerRadius(CORNER_RADIUS);

  const percentOf = (datum: PieArcDatum<LdgDonutSegment>): number => Math.round((datum.value / total) * 100);

  group
    .selectAll<SVGPathElement, PieArcDatum<LdgDonutSegment>>('path.ldg-donut__slice')
    .data(pieGen(segments))
    .join('path')
    .attr('class', 'ldg-donut__slice')
    .attr('d', datum => arcGen(datum) ?? '')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', datum => `${datum.data.label}: ${percentOf(datum)}%`)
    .style('fill', (datum, index) => datum.data.color ?? theme.seriesColors[index % theme.seriesColors.length])
    .style('cursor', config.onSegmentClick ? 'pointer' : 'default')
    .style('outline', 'none')
    .each(function (datum) {
      select(this).append('title').text(`${datum.data.label}: ${percentOf(datum)}%`);
    })
    .on('mouseenter focus', function (_event, datum) {
      select(this).transition().duration(HOVER_MS).attr('d', hoverArcGen(datum) ?? '');
    })
    .on('mouseleave blur', function (_event, datum) {
      select(this).transition().duration(HOVER_MS).attr('d', arcGen(datum) ?? '');
    })
    .on('click', (_event, datum) => config.onSegmentClick?.(datum.data))
    .on('keydown', (event: KeyboardEvent, datum) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      config.onSegmentClick?.(datum.data);
    });

  drawCenter(group, config, theme);
};
