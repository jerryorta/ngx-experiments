import type { NgeLegendItem } from '@nge/charts';
import type { PieArcDatum } from 'd3';

import { PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { NgeChartLegendComponent } from '@nge/charts';
import { arc, pie } from 'd3';

/** One slice of an `ldg-donut-chart` — a labeled value plus the exact color to fill it with. */
export interface LdgDonutSegment {
  color: string;
  label: string;
  value: number;
}

/** A single computed arc — the SVG path plus everything the template needs to draw + label it. */
interface LdgDonutArc {
  color: string;
  index: number;
  isHovered: boolean;
  label: string;
  path: string;
  percent: number;
  segment: LdgDonutSegment;
}

// Fixed logical coordinate system for the responsive `viewBox` — the SVG scales
// to its container via CSS (width/height: 100%), never via pixel attributes.
const VIEWBOX_SIZE = 200;
const CENTER = VIEWBOX_SIZE / 2;
// 10 units of headroom between the outer radius and the viewBox edge, so a
// hovered slice can pop outward (see HOVER_EXPANSION) without clipping.
const OUTER_RADIUS = CENTER - 10;
const HOVER_EXPANSION = 4;
const SLICE_PAD_ANGLE = 0.008;
const SLICE_CORNER_RADIUS = 3;

/** Keeps `thickness` inside a sane inner/outer radius ratio — 1 would collapse the ring to nothing. */
function clampThickness(value: number): number {
  return Math.min(Math.max(value, 0), 0.92);
}

/**
 * Bespoke d3 donut/pie chart. Arc geometry is computed once per render into a
 * plain `{ path, color, label, ... }` array via a computed signal — the
 * template just `@for`s over it — so there's no imperative DOM manipulation
 * and the component stays OnPush/zoneless-friendly and easy to test.
 * Domain-agnostic: callers own what a segment means and which color it gets.
 *
 * @example
 * <ldg-donut-chart
 *   [segments]="[{ label: 'Groceries', value: 62400, color: 'var(--ldg-category-1)' }]"
 *   centerLabel="Total"
 *   centerValue="$624.00"
 *   (segmentClick)="onCategoryClick($event)"
 * />
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-donut-chart' },
  imports: [NgeChartLegendComponent, PercentPipe],
  selector: 'ldg-donut-chart',
  styleUrl: './ldg-donut-chart.component.scss',
  templateUrl: './ldg-donut-chart.component.html',
})
export class LdgDonutChartComponent {
  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------

  /** Optional label drawn in the donut hole, e.g. 'Total'. */
  readonly centerLabel = input<string>();

  /** Optional value drawn in the donut hole, e.g. '$4,231' — pre-formatted by the caller. */
  readonly centerValue = input<string>();

  /** Slices to render, in order — arcs preserve this order rather than sorting by value. */
  readonly segments = input.required<LdgDonutSegment[]>();

  /** Whether the shared `nge-chart-legend` renders alongside the donut. */
  readonly showLegend = input(true);

  /** Inner-radius ratio: 0 renders a filled pie, closer to 1 a thinner ring. */
  readonly thickness = input(0.55);

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------

  /** Emits the clicked segment's original data. */
  readonly segmentClick = output<LdgDonutSegment>();

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  /** Index into `arcs()` of the currently hovered/focused slice, or `null`. */
  protected readonly hoveredIndex = signal<null | number>(null);

  protected readonly center = CENTER;
  protected readonly viewBoxSize = VIEWBOX_SIZE;

  private readonly innerRadius = computed(() => OUTER_RADIUS * clampThickness(this.thickness()));

  /** Sum of all positive segment values — zero/negative values don't contribute. */
  private readonly total = computed(() =>
    this.segments().reduce((sum, segment) => sum + Math.max(segment.value, 0), 0)
  );

  /** True when there's nothing to draw — the template renders a placeholder ring instead. */
  protected readonly isEmpty = computed(() => this.total() <= 0);

  /** Radius + stroke-width for the empty-state ring, matched to the donut's own thickness. */
  protected readonly emptyRing = computed(() => {
    const inner = this.innerRadius();
    return { radius: (OUTER_RADIUS + inner) / 2, strokeWidth: OUTER_RADIUS - inner };
  });

  protected readonly ariaLabel = computed(() => {
    if (this.isEmpty()) return 'No data';
    const label = this.centerLabel();
    return label ? `${label} donut chart` : 'Donut chart';
  });

  /**
   * One entry per positive-value segment, in input order. Recomputes on hover
   * changes too (cheap at demo scale) so the hovered slice's own outer radius
   * pops out by `HOVER_EXPANSION` — no separate CSS transform-origin hack needed.
   */
  protected readonly arcs = computed<LdgDonutArc[]>(() => {
    const total = this.total();
    if (total <= 0) return [];

    const hovered = this.hoveredIndex();
    const innerRadius = this.innerRadius();
    const positiveSegments = this.segments().filter(segment => segment.value > 0);

    const pieGenerator = pie<LdgDonutSegment>()
      .value(segment => segment.value)
      .sort(null)
      .padAngle(SLICE_PAD_ANGLE);
    const arcGenerator = arc<PieArcDatum<LdgDonutSegment>>()
      .innerRadius(innerRadius)
      .cornerRadius(SLICE_CORNER_RADIUS);

    return pieGenerator(positiveSegments).map((datum, index) => {
      const isHovered = hovered === index;
      arcGenerator.outerRadius(isHovered ? OUTER_RADIUS + HOVER_EXPANSION : OUTER_RADIUS);
      return {
        color: datum.data.color,
        index,
        isHovered,
        label: datum.data.label,
        path: arcGenerator(datum) ?? '',
        percent: datum.value / total,
        segment: datum.data,
      };
    });
  });

  /** Segments mapped 1:1 to the shared legend's item shape. */
  protected readonly legendItems = computed<NgeLegendItem[]>(() =>
    this.segments().map(segment => ({ color: segment.color, label: segment.label }))
  );

  // ---------------------------------------------------------------------------
  // Template handlers
  // ---------------------------------------------------------------------------

  protected onSegmentClick(arcDatum: LdgDonutArc): void {
    this.segmentClick.emit(arcDatum.segment);
  }

  protected onSegmentHover(index: null | number): void {
    this.hoveredIndex.set(index);
  }
}
