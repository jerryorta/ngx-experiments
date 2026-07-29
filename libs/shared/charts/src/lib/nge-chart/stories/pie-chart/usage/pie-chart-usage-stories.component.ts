import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgePieDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { extractPieChartLegendItems } from '../../../../core/legend';
import { createPieChartConfig } from '../../../../presets/pie-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-pie-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-pie-chart-usage-stories',
  standalone: true,
  styleUrl: './pie-chart-usage-stories.component.scss',
  templateUrl: './pie-chart-usage-stories.component.html',
})
export class NgePieChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/pie-chart/usage';

  // Shared monthly-budget dataset — one slice per category, in input order.
  private readonly budgetData: NgePieDataPoint[] = [
    { label: 'Rent', value: 1800 },
    { label: 'Food', value: 600 },
    { label: 'Transit', value: 300 },
    { label: 'Utilities', value: 250 },
    { label: 'Savings', value: 450 },
  ];

  // ============================================
  // EXAMPLE 1: Basic Pie
  // ============================================
  basicConfig = createPieChartConfig({
    data: this.budgetData,
  });

  // ============================================
  // EXAMPLE 2: Donut (innerRadius ratio)
  // ============================================
  donutConfig = createPieChartConfig({
    data: this.budgetData,
    innerRadius: 0.6,
  });

  // ============================================
  // EXAMPLE 3: Semi-circle Donut (gauge sweep)
  // ============================================
  semiCircleConfig = createPieChartConfig({
    data: this.budgetData,
    endAngle: Math.PI / 2,
    innerRadius: 0.5,
    startAngle: -Math.PI / 2,
  });

  // ============================================
  // EXAMPLE 4: Custom Slice Colors
  // ============================================
  customColorsConfig = createPieChartConfig({
    data: this.budgetData,
    seriesColors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1'],
  });

  // ============================================
  // EXAMPLE 5: On-arc Labels
  // ============================================
  labelsConfig = createPieChartConfig({
    data: this.budgetData,
    innerRadius: 0.5,
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 6: Custom Label Text (formatLabel)
  // ============================================
  private readonly budgetTotal = this.budgetData.reduce((sum, point) => sum + point.value, 0);

  percentLabelsConfig = createPieChartConfig({
    data: this.budgetData,
    formatLabel: (d: NgePieDataPoint) => `${Math.round((d.value / this.budgetTotal) * 100)}%`,
    innerRadius: 0.5,
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 7: The Small-slice Rule (minLabelAngle)
  // ============================================
  // 'Fees' is under 1% of the total — its wedge is far narrower than the label naming it.
  private readonly budgetWithTinySlice: NgePieDataPoint[] = [
    ...this.budgetData,
    { label: 'Fees', value: 30 },
  ];

  tinySliceDefaultConfig = createPieChartConfig({
    data: this.budgetWithTinySlice,
    innerRadius: 0.5,
    showLabels: true,
  });

  tinySliceLoweredConfig = createPieChartConfig({
    data: this.budgetWithTinySlice,
    innerRadius: 0.5,
    minLabelAngle: 0.02,
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 8: Outside Labels (labelPosition)
  // ============================================
  // The reference case for outside placement: 30 categories whose values span three orders
  // of magnitude (932 down to 36). On-arc labels are impossible here — most wedges are far
  // narrower than the country naming them — and a naive projection of 30 centroids stacks
  // labels on top of each other near the thin slices. Outside placement pushes them into two
  // collision-resolved columns and draws a leader line only where a label had to move.
  //
  // 'China' carries a per-datum `labelColor`, which still wins in outside mode — the
  // highlight-one-entry idiom from the source chart.
  private readonly goldMedalData: NgePieDataPoint[] = [
    { label: 'USA 932', value: 932 },
    { label: 'Soviet Union 397', value: 397 },
    { label: 'Britain 211', value: 211 },
    { label: 'France 192', value: 192 },
    { label: 'Italy 191', value: 191 },
    { label: 'Germany 189', value: 189 },
    { label: 'China 163', labelColor: '#B71C1C', value: 163 },
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

  outsideLabelsConfig = createPieChartConfig({
    data: this.goldMedalData,
    labelGutter: 130,
    labelPosition: 'outside',
    showLabels: true,
  });

  // The SAME data with the default on-arc placement, rendered beside the chart above so the
  // problem outside labels solve is visible rather than asserted: the inside `minLabelAngle`
  // default silently drops all 30 labels, because not one wedge is wide enough to hold its own
  // name. Lowering the threshold does not help — it just stacks the text.
  insideLabelsComparisonConfig = createPieChartConfig({
    data: this.goldMedalData,
    showLabels: true,
  });

  // leaderLines: 'all' — a connector on EVERY label, not just the displaced ones. The
  // default 'displaced' leaders exactly where the eye needs help (the crowded cluster) and
  // nowhere else; 'all' instead makes the connector part of the chart's grammar, so an
  // uncrowded label gets a short radial tick rather than nothing. Same data, same geometry —
  // only which labels earn a line changes.
  outsideLabelsAllLeadersConfig = createPieChartConfig({
    data: this.goldMedalData,
    labelGutter: 130,
    labelPosition: 'outside',
    leaderLines: 'all',
    showLabels: true,
  });

  // leaderLines: 'none' — the label columns stand on their own.
  outsideLabelsNoLeadersConfig = createPieChartConfig({
    data: this.goldMedalData,
    labelGutter: 130,
    labelPosition: 'outside',
    leaderLines: 'none',
    showLabels: true,
  });

  // A donut with outside labels — the gutter comes off the outer radius, so the hole ratio is
  // still read against the (now smaller) radius and the proportions hold.
  outsideLabelsDonutConfig = createPieChartConfig({
    data: this.budgetData,
    innerRadius: 0.55,
    labelGutter: 90,
    labelPosition: 'outside',
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 8b: labelLayout — columns vs perimeter
  // ============================================
  // Same data, same gutter, same leader mode — only where an UNCROWDED label rests changes.
  // 'columns' pins every label to one of two ruler lines; 'perimeter' keeps each on a ring at
  // its own slice's mid-angle, so the ring follows the pie's curve. The visible consequence is
  // the leader count: on the ring most labels already sit where their wedge points, so the
  // default 'displaced' mode stops drawing connectors for them.
  labelLayoutColumnsConfig = createPieChartConfig({
    data: this.goldMedalData,
    labelGutter: 170,
    labelLayout: 'columns',
    labelPosition: 'outside',
    showLabels: true,
  });

  // `labelOffset: 40` holds the ring well clear of the arc. In perimeter mode that also
  // shrinks the pie (the ring has to fit the plot height), which is the point — a smaller
  // pie with more air around it, in the same box.
  labelLayoutPerimeterConfig = createPieChartConfig({
    data: this.goldMedalData,
    labelGutter: 170,
    labelLayout: 'perimeter',
    labelOffset: 40,
    labelPosition: 'outside',
    showLabels: true,
  });

  // The gutter has to clear the widest part of the ring (3 and 9 o'clock), so the layout is
  // exercised at three category counts: sparse enough that nothing collides, mid, and dense
  // enough that separation kicks in and the ring starts to matter.
  private readonly goldMedalTop5 = this.goldMedalData.slice(0, 5);
  private readonly goldMedalTop12 = this.goldMedalData.slice(0, 12);
  private readonly goldMedalTop20 = this.goldMedalData.slice(0, 20);

  perimeter5Config = createPieChartConfig({
    data: this.goldMedalTop5,
    labelLayout: 'perimeter',
    labelOffset: 40,
    labelPosition: 'outside',
    showLabels: true,
  });

  perimeter12Config = createPieChartConfig({
    data: this.goldMedalTop12,
    labelLayout: 'perimeter',
    labelOffset: 40,
    labelPosition: 'outside',
    showLabels: true,
  });

  perimeter20Config = createPieChartConfig({
    data: this.goldMedalTop20,
    labelLayout: 'perimeter',
    labelOffset: 40,
    labelPosition: 'outside',
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 9: Tooltip on Hover
  // ============================================
  tooltipConfig = createPieChartConfig({
    data: this.budgetData,
    innerRadius: 0.5,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 10: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickableConfig = createPieChartConfig({
    data: this.budgetData,
    onClick: (event: NgeChartLayerClickEvent<NgePieDataPoint>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
    },
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 11: With a Legend (categorical — pair with extractPieChartLegendItems)
  // ============================================
  readonly legendData = signal<NgePieDataPoint[]>(this.budgetData);

  readonly legendConfig = computed<NgeChartConfig>(() => {
    const data = this.legendData();
    return {
      ...createPieChartConfig({
        data,
        innerRadius: 0.55,
        tooltip: { enabled: true },
      }),
      legend: {
        enabled: true,
        items: extractPieChartLegendItems(data),
        position: 'right',
        swatchShape: 'square',
      },
    };
  });

  randomizeLegendData(): void {
    this.legendData.set(
      this.budgetData.map(point => ({
        ...point,
        value: Math.round(100 + Math.random() * 1800),
      }))
    );
  }
}
