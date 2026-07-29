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

/** Slice categories driven by the controls (one slice per label). */
const SLICE_LABELS = ['Rent', 'Food', 'Transit', 'Utilities', 'Savings'];

/**
 * Olympic gold medals by country — 30 categories spanning three orders of magnitude
 * (932 down to 36). The outside-label controls need a dataset that actually CROWDS:
 * on the five-slice budget data nothing ever collides, so `leaderLines: 'displaced'`
 * (the default) draws no connectors and the feature demos as if it were broken.
 */
const GOLD_MEDAL_SLICES: readonly NgePieDataPoint[] = [
  { label: 'USA 932', value: 932 },
  { label: 'Soviet Union 397', value: 397 },
  { label: 'Britain 211', value: 211 },
  { label: 'France 192', value: 192 },
  { label: 'Italy 191', value: 191 },
  { label: 'Germany 189', value: 189 },
  { label: 'China 163', value: 163 },
  { label: 'Hungary 160', value: 160 },
  { label: 'East Germany 153', value: 153 },
  { label: 'Sweden 140', value: 140 },
  { label: 'Australia 131', value: 131 },
  { label: 'Japan 123', value: 123 },
  { label: 'Russia 109', value: 109 },
  { label: 'Finland 100', value: 100 },
  { label: 'Romania 86', value: 86 },
  { label: 'Netherlands 73', value: 73 },
  { label: 'South Korea 68', value: 68 },
  { label: 'Cuba 66', value: 66 },
  { label: 'Poland 63', value: 63 },
  { label: 'Canada 56', value: 56 },
  { label: 'West Germany 56', value: 56 },
  { label: 'Norway 54', value: 54 },
  { label: 'Bulgaria 51', value: 51 },
  { label: 'Czechoslovakia 50', value: 50 },
  { label: 'Switzerland 45', value: 45 },
  { label: 'Unified Team 45', value: 45 },
  { label: 'Denmark 41', value: 41 },
  { label: 'Belgium 38', value: 38 },
  { label: 'Turkey 37', value: 37 },
  { label: 'New Zealand 36', value: 36 },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-pie-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-pie-chart-interaction-stories',
  standalone: true,
  styleUrl: './pie-chart-interaction-stories.component.scss',
  templateUrl: './pie-chart-interaction-stories.component.html',
})
export class NgePieChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/pie-chart/interaction';

  // Base - Margins
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // Layer - Geometry
  readonly innerRadius = input<number>(0);
  readonly radiusRatio = input<number>(1);
  readonly startAngle = input<number>(0);
  readonly endAngle = input<number>(6.28);
  readonly padAngle = input<number>(0);

  // Layer - Labels
  readonly showLabels = input<boolean>(false);
  readonly labelPosition = input<'inside' | 'outside'>('inside');
  readonly minLabelAngle = input<number>(0.15);
  readonly labelAsPercent = input<boolean>(false);

  // Layer - Outside Labels
  readonly leaderLines = input<'all' | 'displaced' | 'none'>('displaced');
  readonly labelGutter = input<number>(96);
  readonly labelLayout = input<'columns' | 'perimeter'>('perimeter');
  readonly labelLineHeight = input<number>(14);
  readonly labelOffset = input<number>(12);
  readonly leaderElbowOffset = input<number>(12);

  // Layer - Legend
  readonly showLegend = input<boolean>(true);
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('right');
  /** Suppress the internal legend and render the standalone interactive <nge-chart-legend> above the chart. */
  readonly interactiveLegend = input<boolean>(false);

  // Layer - Tooltip
  readonly showTooltip = input<boolean>(true);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);

  // Theme - Slice Palette
  readonly seriesColor1 = input<string>('#1E88E5');
  readonly seriesColor2 = input<string>('#43A047');
  readonly seriesColor3 = input<string>('#FB8C00');
  readonly seriesColor4 = input<string>('#8E24AA');
  readonly seriesColor5 = input<string>('#00ACC1');

  // Theme - Slice Styling
  readonly sliceStroke = input<string>('');
  readonly sliceStrokeWidth = input<number>(1);
  readonly sliceOpacity = input<number>(1);

  // Theme - Label Styling
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(10);
  readonly labelFontWeight = input<number>(600);

  // Theme - Outside Label Styling
  readonly outsideLabelColor = input<string>('');
  readonly leaderLineColor = input<string>('');
  readonly leaderLineWidth = input<number>(1);

  // Which fixture to chart. The five-slice budget is the default because most controls
  // read best on a handful of wide wedges; the outside-label stories switch to the
  // 30-category set, where labels genuinely crowd.
  readonly dataset = input<'budget' | 'goldMedals'>('budget');

  // Bumped by the Randomize button; `sampleData` re-rolls whenever it changes.
  private readonly reroll = signal(0);

  // Sample data, re-rolled on demand. The gold-medal set shows its REAL figures until the
  // button is pressed — randomising a recognisable dataset on load would throw away the
  // three-orders-of-magnitude spread that makes it worth charting.
  readonly sampleData = computed<NgePieDataPoint[]>(() => {
    const rolls = this.reroll();
    if (this.dataset() === 'goldMedals') {
      return rolls === 0
        ? [...GOLD_MEDAL_SLICES]
        : GOLD_MEDAL_SLICES.map(slice => ({
            ...slice,
            value: Math.round(20 + Math.random() * 900),
          }));
    }
    return SLICE_LABELS.map(label => ({
      label,
      value: Math.round(100 + Math.random() * 1800),
    }));
  });

  randomizeData(): void {
    this.reroll.update(n => n + 1);
  }

  // --- Interactive-legend mode (interactiveLegend control) --------------------
  // Slices toggled OFF via the external interactive legend. Stored as an immutable
  // Set (replaced, never mutated) so updates fire the signal.
  private readonly hiddenSlices = signal<Set<string>>(new Set());

  // Slice palette from the five color controls (empty entries dropped).
  readonly palette = computed<string[]>(() =>
    [
      this.seriesColor1(),
      this.seriesColor2(),
      this.seriesColor3(),
      this.seriesColor4(),
      this.seriesColor5(),
    ].filter((color): color is string => !!color)
  );

  // Base legend items over the FULL slice order, coloured to match the renderer
  // (extractPieChartLegendItems mirrors the layer's per-datum → palette[i % len]
  // resolution). Reused for both the internal legend and the interactive one.
  private readonly baseLegendItems = computed<NgeLegendItem[]>(() =>
    extractPieChartLegendItems(this.sampleData(), this.palette())
  );

  // Stable label → color map. The renderer colours each slice by its input index
  // (palette[d.index % len]); filtering a toggled-off slice would shift the
  // survivors' indices — and their colours. Resolving colours here over the full
  // order and stamping them onto chartData pins every slice's colour regardless of
  // what is currently visible.
  private readonly colorByLabel = computed<Map<string, string>>(
    () => new Map(this.baseLegendItems().map(item => [item.id ?? item.label, item.color]))
  );

  // One legend entry per slice (full order). A toggled-off slice stays listed but
  // dimmed (opacity 0.4) so it can be toggled back on.
  readonly legendItems = computed<NgeLegendItem[]>(() => {
    const hidden = this.hiddenSlices();
    return this.baseLegendItems().map(item => {
      const isHidden = hidden.has(item.id ?? item.label);
      return {
        ...item,
        opacity: isHidden ? 0.4 : 1,
        selected: !isHidden,
      };
    });
  });

  // Data fed to the preset. In interactiveLegend mode the toggled-off slices are
  // dropped and every remaining slice is stamped with its STABLE colour so the
  // renderer never recolours survivors as their indices shift. Otherwise the raw
  // sample data flows through unchanged.
  readonly chartData = computed<NgePieDataPoint[]>(() => {
    const data = this.sampleData();
    if (!this.interactiveLegend()) {
      return data;
    }
    const hidden = this.hiddenSlices();
    const colorByLabel = this.colorByLabel();
    return data
      .filter(point => !hidden.has(point.label))
      .map(point => ({ ...point, color: colorByLabel.get(point.label) }));
  });

  // Toggle a slice in/out of the pie (immutable Set so the signal fires).
  onLegendItemClick(item: NgeLegendItem): void {
    const key = item.id ?? item.label;
    this.hiddenSlices.update(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Computed config rebuilds whenever any control (or the re-rolled data) changes.
  readonly config = computed<NgeChartConfig>(() => {
    const palette = this.palette();
    const data = this.chartData();

    // Percent labels read against the CURRENTLY VISIBLE total, so toggling a slice off via
    // the interactive legend re-bases the remaining shares instead of leaving them summing
    // to less than 100.
    const total = data.reduce((sum, point) => sum + point.value, 0);

    const baseConfig = createPieChartConfig({
      data,
      endAngle: this.endAngle(),
      formatLabel: this.labelAsPercent()
        ? (d: NgePieDataPoint) => `${Math.round((d.value / total) * 100)}%`
        : undefined,
      innerRadius: this.innerRadius(),
      labelGutter: this.labelGutter(),
      labelLayout: this.labelLayout(),
      labelLineHeight: this.labelLineHeight(),
      labelOffset: this.labelOffset(),
      labelPosition: this.labelPosition(),
      leaderElbowOffset: this.leaderElbowOffset(),
      leaderLines: this.leaderLines(),
      minLabelAngle: this.minLabelAngle(),
      padAngle: this.padAngle(),
      radiusRatio: this.radiusRatio(),
      seriesColors: palette.length ? palette : undefined,
      showLabels: this.showLabels(),
      startAngle: this.startAngle(),
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            height: this.tooltipHeight(),
            style: {
              backgroundColor: this.tooltipBackgroundColor() || undefined,
              borderColor: this.tooltipBorderColor() || undefined,
              borderWidth: this.tooltipBorderWidth(),
              divotHeight: this.tooltipDivotHeight(),
              divotWidth: this.tooltipDivotWidth(),
            },
            width: this.tooltipWidth(),
          }
        : undefined,
    });

    return {
      ...baseConfig,
      base: {
        ...baseConfig.base,
        margin: {
          bottom: this.marginBottom(),
          left: this.marginLeft(),
          right: this.marginRight(),
          top: this.marginTop(),
        },
      },
      legend: this.interactiveLegend()
        ? undefined // external interactive legend takes over
        : this.showLegend()
          ? {
              enabled: true,
              items: this.baseLegendItems(),
              position: this.legendPosition(),
              swatchShape: 'square',
            }
          : undefined,
      theme: {
        pie: {
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
          // A separate slice from `label` — outside labels sit on the plot surface, not on a
          // slice fill, so they track a surface token instead of deriving a contrast colour.
          labelOutside: {
            color: this.outsideLabelColor() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
          leaderLine: {
            stroke: this.leaderLineColor() || undefined,
            strokeWidth: this.leaderLineWidth(),
          },
          slice: {
            opacity: this.sliceOpacity(),
            stroke: this.sliceStroke() || undefined,
            strokeWidth: this.sliceStrokeWidth(),
          },
        },
      },
    };
  });
}
