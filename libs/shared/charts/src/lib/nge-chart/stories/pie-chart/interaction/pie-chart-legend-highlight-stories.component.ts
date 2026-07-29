import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgePieDataPoint } from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { extractPieChartLegendItems } from '../../../../core/legend';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createPieChartConfig } from '../../../../presets/pie-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Olympic gold medals by country — 30 categories across three orders of magnitude.
 *
 * Labels are the country ALONE, unlike the outside-label stories' `'USA 932'`: those had to
 * smuggle the number into the label text because the only place a value could appear was on
 * the arc. Here the legend carries it, which is the entire point of the story.
 */
const GOLD_MEDALS: readonly NgePieDataPoint[] = [
  { label: 'USA', value: 932 },
  { label: 'Soviet Union', value: 397 },
  { label: 'Britain', value: 211 },
  { label: 'France', value: 192 },
  { label: 'Italy', value: 191 },
  { label: 'Germany', value: 189 },
  { label: 'China', value: 163 },
  { label: 'Hungary', value: 160 },
  { label: 'East Germany', value: 153 },
  { label: 'Sweden', value: 140 },
  { label: 'Australia', value: 131 },
  { label: 'Japan', value: 123 },
  { label: 'Russia', value: 109 },
  { label: 'Finland', value: 100 },
  { label: 'Romania', value: 86 },
  { label: 'Netherlands', value: 73 },
  { label: 'South Korea', value: 68 },
  { label: 'Cuba', value: 66 },
  { label: 'Poland', value: 63 },
  { label: 'Canada', value: 56 },
  { label: 'West Germany', value: 56 },
  { label: 'Norway', value: 54 },
  { label: 'Bulgaria', value: 51 },
  { label: 'Czechoslovakia', value: 50 },
  { label: 'Switzerland', value: 45 },
  { label: 'Unified Team', value: 45 },
  { label: 'Denmark', value: 41 },
  { label: 'Belgium', value: 38 },
  { label: 'Turkey', value: 37 },
  { label: 'New Zealand', value: 36 },
];

/** Five wide slices — the uncrowded case, where the pie never needed help in the first place. */
const BUDGET: readonly NgePieDataPoint[] = [
  { label: 'Rent', value: 1800 },
  { label: 'Food', value: 600 },
  { label: 'Transit', value: 300 },
  { label: 'Utilities', value: 250 },
  { label: 'Savings', value: 450 },
];

/** Legend opacity for an entry that is not selected while a selection is active. */
const LEGEND_DIMMED_OPACITY = 0.45;

/**
 * A pie that carries no labels at all: the legend is the data table, and clicking a row
 * emphasises its slice.
 *
 * The contrast to draw is with the interactive legend in the sibling Interaction story, which
 * FILTERS the clicked slice out of the data. That re-runs `d3.pie()`, so every surviving wedge
 * grows to fill the gap and the wedge you were comparing against changes size the moment you
 * click. Here nothing is removed — the arcs stay exactly where they are and the unselected ones
 * simply recede.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-pie-chart-legend-highlight-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-pie-chart-legend-highlight-stories',
  standalone: true,
  styleUrl: './pie-chart-legend-highlight-stories.component.scss',
  templateUrl: './pie-chart-legend-highlight-stories.component.html',
})
export class NgePieChartLegendHighlightStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/pie-chart/interaction';

  /** Which fixture to chart — 30 crowded categories, or 5 wide ones. */
  readonly dataset = input<'budget' | 'goldMedals'>('goldMedals');
  /** Inner radius as a ratio of the outer: 0 → pie, 0.6 → donut. */
  readonly innerRadius = input<number>(0);
  /** How far an unselected slice recedes once something is selected. */
  readonly dimmedOpacity = input<number>(0.25);
  /** Legend axis — 'vertical' reads most like a data table beside the chart. */
  readonly legendOrientation = input<'horizontal' | 'vertical'>('vertical');
  /** Entry arrangement; 'grid' keeps values column-aligned when the legend wraps. */
  readonly legendLayout = input<'flow' | 'grid'>('grid');
  /** Show the button that releases the whole selection. */
  readonly showClearAction = input<boolean>(true);

  // --- Selection ---------------------------------------------------------------
  // Slice labels the user has emphasised. Immutable Set (replaced, never mutated) so
  // updates fire the signal. Empty means NO selection, which is not the same as
  // everything-deselected: the chart renders every slice normally.
  private readonly highlighted = signal<Set<string>>(new Set());

  /** Thousands separators — the legend is standing in for a table, so read it like one. */
  readonly formatValue = (value: number): string => value.toLocaleString();

  readonly sampleData = computed<NgePieDataPoint[]>(() => [
    ...(this.dataset() === 'budget' ? BUDGET : GOLD_MEDALS),
  ]);

  /**
   * Legend rows, with the selection reflected back: selected entries stay opaque and report
   * `selected` (which the component binds to `aria-pressed`), the rest fade. The legend fades
   * LESS than the arcs do — a dimmed wedge only has to recede, but a dimmed row still has to
   * be readable, since it is the only place the numbers exist.
   */
  readonly legendItems = computed<NgeLegendItem[]>(() => {
    const highlighted = this.highlighted();
    const items = extractPieChartLegendItems(this.sampleData());
    if (highlighted.size === 0) {
      return items;
    }
    return items.map(item => {
      const selected = highlighted.has(item.id ?? item.label);
      return { ...item, opacity: selected ? 1 : LEGEND_DIMMED_OPACITY, selected };
    });
  });

  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createPieChartConfig({
      data: this.sampleData(),
      highlightedLabels: [...this.highlighted()],
      innerRadius: this.innerRadius(),
      // The premise of the story: no labels on the chart at all.
      showLabels: false,
      tooltip: { enabled: true },
    });

    return {
      ...baseConfig,
      theme: {
        pie: {
          slice: {
            dimmedOpacity: this.dimmedOpacity(),
          },
        },
      },
    };
  });

  /** Toggle one slice's emphasis (immutable Set so the signal fires). */
  onLegendItemClick(item: NgeLegendItem): void {
    const key = item.id ?? item.label;
    this.highlighted.update(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  /** Release every selection — back to an evenly-weighted pie. */
  onClearHighlight(): void {
    this.highlighted.set(new Set());
  }
}
