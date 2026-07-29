import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgePieChartInteractionStoriesComponent } from './pie-chart-interaction-stories.component';

const meta: Meta<NgePieChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Geometry
    // Data
    dataset: {
      control: 'radio',
      description:
        "Which fixture to chart. 'budget' is five wide wedges — best for most controls. 'goldMedals' is 30 categories spanning 932 down to 36, where labels genuinely crowd; the outside-label stories use it because nothing ever collides on five slices, so leaderLines: 'displaced' would draw no connectors at all.",
      options: ['budget', 'goldMedals'],
      table: { category: 'Data' },
    },
    endAngle: {
      control: { max: 6.28, min: 0, step: 0.02, type: 'range' },
      description: 'End of the angular sweep in radians (semi-circle / gauge)',
      table: { category: 'Layer - Geometry' },
    },
    innerRadius: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Inner radius as a ratio (0 → pie, >0 → donut)',
      table: { category: 'Layer - Geometry' },
    },
    // Layer - Legend
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a slice to toggle it in/out of the pie.',
      table: { category: 'Layer - Legend' },
    },
    // Layer - Labels
    labelAsPercent: {
      control: 'boolean',
      description: "Swap the default label text for each slice's share of the visible total",
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    // Theme - Label Styling
    labelColor: {
      control: 'color',
      description:
        "theme.pie.label.color — the ON-ARC label colour (labelPosition: 'inside'). Empty = the default black/white pair, picked per slice from its own fill. Outside labels ignore this slice; use outsideLabelColor.",
      if: { arg: 'labelPosition', eq: 'inside' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 24, min: 6, step: 1, type: 'range' },
      description: 'Label font size (px) — applied to whichever placement is active',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontWeight: {
      control: { max: 900, min: 100, step: 100, type: 'range' },
      description: 'Label font weight — applied to whichever placement is active',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    // Layer - Outside Labels
    labelGutter: {
      control: { max: 200, min: 0, step: 10, type: 'range' },
      description:
        'Width in px reserved on EACH side for outside labels — the pie shrinks to fit, because the layers group is clipped to the plot area. Default 96.',
      if: { arg: 'labelPosition', eq: 'outside' },
      table: { category: 'Layer - Outside Labels' },
    },
    labelLayout: {
      control: 'radio',
      description:
        "Where an UNCROWDED outside label rests. 'perimeter' (default) keeps each label on a ring at its own slice's mid-angle, so the ring follows the pie's curve and its leaders stay short radial ticks; 'columns' pins each hemisphere to a fixed x, which costs the bearing (long diagonal leaders) but keeps them untangled past the ring's ~20-category ceiling. Collision separation is identical in both, and so are the SLICES leadered — 'displaced' weighs the height the shared y-pass resolves, so only leader LENGTH changes (mean 45px vs 185px on the 30-country set).",
      if: { arg: 'labelPosition', eq: 'outside' },
      options: ['columns', 'perimeter'],
      table: { category: 'Layer - Outside Labels' },
    },
    labelLineHeight: {
      control: { max: 60, min: 8, step: 2, type: 'range' },
      description:
        'Minimum vertical gap in px between adjacent outside labels. Raise it past ~30 to force collisions on this 5-slice dataset and watch leader lines appear on the displaced labels. Default 14.',
      if: { arg: 'labelPosition', eq: 'outside' },
      table: { category: 'Layer - Outside Labels' },
    },
    labelOffset: {
      control: { max: 160, min: 0, step: 4, type: 'range' },
      description:
        "Radial distance in px from the arc's outer edge out to the label ring / column. Under labelLayout: 'perimeter' raising it ALSO shrinks the pie, because the ring has to fit the plot height — the lever for giving a crowded chart air without a bigger canvas. It does not change how many leader lines cross; only more plot height does that. Default 12.",
      if: { arg: 'labelPosition', eq: 'outside' },
      table: { category: 'Layer - Outside Labels' },
    },
    labelPosition: {
      control: 'radio',
      description:
        "Where showLabels draws each label. 'inside' centers it on the arc centroid (dropped below minLabelAngle); 'outside' places every label beyond the arc in two collision-resolved columns, with leader lines on the displaced ones.",
      if: { arg: 'showLabels' },
      options: ['inside', 'outside'],
      table: { category: 'Layer - Labels' },
    },
    leaderElbowOffset: {
      control: { max: 160, min: 0, step: 4, type: 'range' },
      description:
        "Length in px of the leader's radial stub off the wedge — where the connector bends. Defaults to labelOffset (elbow on the label ring). Drop it below labelOffset for a stubby tick off the slice with the text further out; the two are one knob otherwise.",
      if: { arg: 'labelPosition', eq: 'outside' },
      table: { category: 'Layer - Outside Labels' },
    },
    leaderLineColor: {
      control: 'color',
      description: 'Leader-line stroke (empty = the muted --nge-chart-outline default)',
      if: { arg: 'labelPosition', eq: 'outside' },
      table: { category: 'Theme - Outside Label Styling' },
    },
    leaderLines: {
      control: 'radio',
      description:
        "Which outside labels get a connector. 'displaced' (default) only the ones whose height no longer names their wedge, i.e. the ones collision resolution had to move — raise labelLineHeight to force some. 'all' gives every label one (an uncrowded label takes a short straight radial tick). 'none' suppresses them.",
      if: { arg: 'labelPosition', eq: 'outside' },
      options: ['displaced', 'all', 'none'],
      table: { category: 'Layer - Outside Labels' },
    },
    leaderLineWidth: {
      control: { max: 4, min: 0.5, step: 0.5, type: 'range' },
      description: 'Leader-line stroke width (px)',
      if: { arg: 'labelPosition', eq: 'outside' },
      table: { category: 'Theme - Outside Label Styling' },
    },
    legendPosition: {
      control: 'radio',
      description: 'Legend position relative to chart',
      if: { arg: 'showLegend' },
      options: ['bottom', 'top', 'left', 'right'],
      table: { category: 'Layer - Legend' },
    },
    marginBottom: {
      control: { max: 60, min: 0, step: 5, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Base - Margins' },
    },
    marginLeft: {
      control: { max: 60, min: 0, step: 5, type: 'range' },
      description: 'Left margin',
      table: { category: 'Base - Margins' },
    },
    marginRight: {
      control: { max: 60, min: 0, step: 5, type: 'range' },
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    // Base - Margins
    marginTop: {
      control: { max: 60, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    minLabelAngle: {
      control: { max: 1.5, min: 0, step: 0.01, type: 'range' },
      description:
        'Smallest slice sweep (radians) that still gets a label — narrower slices stay unlabelled. Default 0.15.',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    // Theme - Outside Label Styling
    outsideLabelColor: {
      control: 'color',
      description:
        'Outside label color (empty = the --nge-chart-on-surface default). A separate theme slice from the on-arc label: outside labels sit on the plot surface, so they track a surface token instead of deriving a contrast colour from a slice fill.',
      if: { arg: 'labelPosition', eq: 'outside' },
      table: { category: 'Theme - Outside Label Styling' },
    },
    padAngle: {
      control: { max: 0.05, min: 0, step: 0.005, type: 'range' },
      description: 'Angular gap between adjacent slices in radians',
      table: { category: 'Layer - Geometry' },
    },
    radiusRatio: {
      control: { max: 1, min: 0.1, step: 0.05, type: 'range' },
      description:
        'Scale the pie down inside its plot (1 = fill, 0.75 = three-quarter size). The knob for "the chart is too big for its box" — unlike labelGutter it is applied AFTER the label reserves, so the labels keep tracking the arc instead of the pie and labels fighting over the same space. Default 1.',
      table: { category: 'Layer - Geometry' },
    },
    // Theme - Slice Palette
    seriesColor1: {
      control: 'color',
      description: 'Slice 1 fill (Rent)',
      table: { category: 'Theme - Slice Palette' },
    },
    seriesColor2: {
      control: 'color',
      description: 'Slice 2 fill (Food)',
      table: { category: 'Theme - Slice Palette' },
    },
    seriesColor3: {
      control: 'color',
      description: 'Slice 3 fill (Transit)',
      table: { category: 'Theme - Slice Palette' },
    },
    seriesColor4: {
      control: 'color',
      description: 'Slice 4 fill (Utilities)',
      table: { category: 'Theme - Slice Palette' },
    },
    seriesColor5: {
      control: 'color',
      description: 'Slice 5 fill (Savings)',
      table: { category: 'Theme - Slice Palette' },
    },
    // Layer - Labels
    showLabels: {
      control: 'boolean',
      description: 'Draw a label for each slice — see labelPosition for where',
      table: { category: 'Layer - Labels' },
    },
    showLegend: {
      control: 'boolean',
      description: 'Show the internal chart legend',
      table: { category: 'Layer - Legend' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on slice hover',
      table: { category: 'Layer - Tooltip' },
    },
    // Theme - Slice Styling
    sliceOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Slice fill opacity',
      table: { category: 'Theme - Slice Styling' },
    },
    sliceStroke: {
      control: 'color',
      description: 'Slice outline stroke color (separates adjacent slices)',
      table: { category: 'Theme - Slice Styling' },
    },
    sliceStrokeWidth: {
      control: { max: 6, min: 0, step: 1, type: 'range' },
      description: 'Slice outline stroke width (px)',
      table: { category: 'Theme - Slice Styling' },
    },
    startAngle: {
      control: { max: 3.14, min: -3.14, step: 0.02, type: 'range' },
      description: 'Start of the angular sweep in radians',
      table: { category: 'Layer - Geometry' },
    },
    tooltipBackgroundColor: {
      control: 'color',
      description: 'Tooltip background color',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipBorderColor: {
      control: 'color',
      description: 'Tooltip border color',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipBorderWidth: {
      control: { max: 5, min: 0, step: 1, type: 'range' },
      description: 'Tooltip border width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipDivotHeight: {
      control: { max: 30, min: 8, step: 2, type: 'range' },
      description: 'Tooltip divot height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipDivotWidth: {
      control: { max: 40, min: 12, step: 2, type: 'range' },
      description: 'Tooltip divot width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipHeight: {
      control: { max: 120, min: 40, step: 5, type: 'range' },
      description: 'Tooltip height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipWidth: {
      control: { max: 260, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
  },
  component: NgePieChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Pie Chart/Interaction',
};

export default meta;
type Story = StoryObj<NgePieChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    dataset: 'budget',
    endAngle: 6.28,
    innerRadius: 0,
    interactiveLegend: false,
    labelAsPercent: false,
    labelColor: '',
    labelFontSize: 10,
    labelFontWeight: 600,
    labelGutter: 96,
    labelLayout: 'perimeter',
    labelLineHeight: 14,
    labelOffset: 12,
    labelPosition: 'inside',
    leaderElbowOffset: 12,
    leaderLineColor: '',
    leaderLines: 'displaced',
    leaderLineWidth: 1,
    legendPosition: 'right',
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    minLabelAngle: 0.15,
    outsideLabelColor: '',
    padAngle: 0,
    radiusRatio: 1,
    seriesColor1: '#1E88E5',
    seriesColor2: '#43A047',
    seriesColor3: '#FB8C00',
    seriesColor4: '#8E24AA',
    seriesColor5: '#00ACC1',
    showLabels: false,
    showLegend: true,
    showTooltip: true,
    sliceOpacity: 1,
    sliceStroke: '',
    sliceStrokeWidth: 1,
    startAngle: 0,
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipWidth: 150,
  },
};

/**
 * Renders the standalone interactive `<nge-chart-legend>` above the chart with the
 * chart's internal legend suppressed. Clicking a slice toggles it in/out of the pie —
 * the pie rebuilds without it while the slice stays listed in the legend but dimmed
 * (opacity 0.4) so it can be toggled back on. Survivors keep their colours (each
 * visible slice is stamped with its stable palette colour before re-rendering).
 */
export const InteractiveLegend: Story = {
  args: {
    ...Interaction.args,
    interactiveLegend: true,
  },
};

/**
 * `labelPosition: 'outside'` — every label beyond the arc on a collision-resolved ring that
 * follows the pie's curve. The legend is off so the reserved gutter has the width it needs.
 *
 * Charted on the **30-category** gold-medal set deliberately *above* the ring's density
 * ceiling: leaders stay untangled to ~20 categories, and at 30 most labels are displaced far
 * enough along the ring that their connectors sweep over each other. That is the case
 * `'columns'` exists for — flip **labelLayout** to see it, or compare `OutsideLabelsColumns`
 * side by side. Drop **dataset** to `'budget'` for the five-slice case the default is tuned
 * for, where every label rests on its own bearing and no connector is drawn at all.
 *
 * Things worth driving from the controls:
 * - **labelGutter** shrinks the pie as it grows; the gutter has to come out of the plot area
 *   because the layers group is clipped to it.
 * - **labelLineHeight** raises the minimum gap, so more labels have to be pushed off their
 *   natural anchor and more of them sprout **leader lines** — a leader tracks displacement,
 *   not placement.
 * - **minLabelAngle** defaults to 0 here (a wedge no longer has to contain its own text), so
 *   raising it is the only way to drop a label in this mode.
 */
export const OutsideLabels: Story = {
  args: {
    ...Interaction.args,
    dataset: 'goldMedals',
    labelGutter: 170,
    labelPosition: 'outside',
    leaderLines: 'displaced',
    minLabelAngle: 0,
    showLabels: true,
    showLegend: false,
  },
};

/**
 * `leaderLines: 'all'` — a connector on every outside label rather than only the ones
 * collision resolution displaced (ARCH-272).
 *
 * Against `OutsideLabels` (same data, `'displaced'`) this is the ~10 labels that rest at
 * their natural anchor gaining a short straight radial tick instead of nothing. Flip the
 * control between `'all'`, `'displaced'` and `'none'`, or drop **dataset** to `'budget'`
 * where `'displaced'` draws nothing at all and the contrast is total.
 */
export const OutsideLabelsAllLeaders: Story = {
  args: {
    ...OutsideLabels.args,
    // Tuned settings for the 30-category set, kept as this story's baseline so the reference
    // composition is what loads rather than something to be dialled in by hand each time.
    // They work as a set: `radiusRatio` frees the space, the wide gutter and long
    // `labelOffset` spend it on the label columns, and the short `leaderElbowOffset` keeps
    // the stub off the wedge from growing with them.
    labelFontSize: 12,
    labelGutter: 190,
    labelLineHeight: 18,
    labelOffset: 108,
    leaderElbowOffset: 24,
    leaderLines: 'all',
    marginBottom: 30,
    marginLeft: 30,
    marginRight: 30,
    marginTop: 15,
    radiusRatio: 0.7,
  },
};

/**
 * The same default ring given more air — `labelOffset: 40` instead of 12.
 *
 * On the ring that offset does double duty: it holds the labels further off the arc *and*
 * shrinks the pie, because the ring has to fit the plot height. A smaller pie with more room
 * around it, in the same box — the lever for opening up a crowded chart without enlarging the
 * canvas, and the reason 30 categories reads better here than in `OutsideLabels`.
 *
 * **labelLineHeight** raises the minimum gap and forces more collisions — watch the crowded
 * labels slide *along* the ring rather than snap to a column, and only those sprout leaders.
 * Every leader leaves its slice along the slice's own radius before running out to the text;
 * on the ring that first segment is most of the connector, so perimeter leaders read as short
 * ticks rather than the long diagonals `'columns'` produces.
 */
export const OutsideLabelsPerimeter: Story = {
  args: {
    ...OutsideLabels.args,
    labelLayout: 'perimeter',
    labelOffset: 40,
  },
};

/**
 * `labelLayout: 'columns'` — the fallback for densities past the ring's ceiling, on the same
 * 30 categories as `OutsideLabels` so the two read as a pair.
 *
 * Every label collapses onto one of two ruler lines, which costs the bearing — a label the
 * collision pass never touched is still dragged off the wedge it names, and its leader reads
 * as one long diagonal. What it buys is nesting: a column terminates every leader at the same
 * x, so preserving y-order keeps them from crossing however dense the pie gets. Above ~20
 * categories that trade is worth making; below it the ring is already crossing-free and
 * columns only cost legibility.
 */
export const OutsideLabelsColumns: Story = {
  args: {
    ...OutsideLabels.args,
    labelLayout: 'columns',
  },
};
