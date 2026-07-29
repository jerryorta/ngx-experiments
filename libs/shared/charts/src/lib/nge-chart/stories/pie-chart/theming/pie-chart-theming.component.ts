import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgePieDataPoint } from '../../../../core/config';

import { createPieChartConfig } from '../../../../presets/pie-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-pie-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-pie-chart-theming',
  standalone: true,
  styleUrl: './pie-chart-theming.component.scss',
  templateUrl: './pie-chart-theming.component.html',
})
export class NgePieChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/pie-chart/theming';

  // Six-slice dataset so a full 6-colour palette is exercised.
  sampleData: NgePieDataPoint[] = [
    { label: 'Rent', value: 1800 },
    { label: 'Food', value: 600 },
    { label: 'Transit', value: 300 },
    { label: 'Utilities', value: 250 },
    { label: 'Savings', value: 450 },
    { label: 'Other', value: 150 },
  ];

  // Default theme — no overrides. Uses the built-in `--nge-chart-*` token palette,
  // which is theme-aware (adapts to the container's light / dark surface).
  defaultConfig = createPieChartConfig({
    data: this.sampleData,
    innerRadius: 0.5,
  });

  // Warm palette override via theme.pie.slice.colors.
  warmConfig: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.5 }),
    theme: {
      pie: {
        slice: {
          colors: ['#E53935', '#FB8C00', '#FDD835', '#F4511E', '#D81B60', '#8E24AA'],
        },
      },
    },
  };

  // Cool palette override.
  coolConfig: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.5 }),
    theme: {
      pie: {
        slice: {
          colors: ['#1E88E5', '#00ACC1', '#43A047', '#3949AB', '#00897B', '#5E35B1'],
        },
      },
    },
  };

  // Per-datum color overrides — each slice carries its own `color`, which wins
  // over any palette. Useful when colours are semantic rather than positional.
  perDatumConfig = createPieChartConfig({
    data: [
      { color: '#5C6BC0', label: 'Rent', value: 1800 },
      { color: '#66BB6A', label: 'Food', value: 600 },
      { color: '#FFA726', label: 'Transit', value: 300 },
      { color: '#26C6DA', label: 'Utilities', value: 250 },
      { color: '#EC407A', label: 'Savings', value: 450 },
      { color: '#8D6E63', label: 'Other', value: 150 },
    ],
    innerRadius: 0.5,
  });

  // Thick surface-coloured separators via slice.stroke + strokeWidth.
  strokeConfig: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData }),
    theme: {
      pie: {
        slice: {
          colors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#E53935'],
          stroke: '#ffffff',
          strokeWidth: 3,
        },
      },
    },
  };

  // Translucent slices via slice.opacity.
  translucentConfig: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.4 }),
    theme: {
      pie: {
        slice: {
          colors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#E53935'],
          opacity: 0.7,
        },
      },
    },
  };

  // On-arc labels on the default label theme — black on light fills / white on dark ones,
  // picked per slice from the fill's own luminance.
  labelDefaultConfig = createPieChartConfig({
    data: this.sampleData,
    innerRadius: 0.5,
    showLabels: true,
  });

  // The same labels restyled through theme.pie.label. BOTH contrast endpoints are set to
  // the same tint so the colour knob reads unambiguously alongside size and weight —
  // setting only `color` would leave the dark slices on the default `colorOnDark`.
  labelStyledConfig: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.5, showLabels: true }),
    theme: {
      pie: {
        label: {
          color: '#FFE082',
          colorOnDark: '#FFE082',
          fontSize: 14,
          fontWeight: 800,
        },
        slice: {
          colors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#E53935'],
        },
      },
    },
  };

  // --- ARCH-266: data-driven label theming ---

  // A palette spanning the full luminance range: two very dark entries, two mid, two very
  // light. One flat label colour cannot read on all six — which is the point.
  private readonly wideLuminancePalette = [
    '#0D47A1',
    '#1B5E20',
    '#EF6C00',
    '#F9A825',
    '#FFF59D',
    '#E0F7FA',
  ];

  // AUTOMATIC CONTRAST (the default). No label colour is supplied anywhere, so each label
  // derives from its OWN slice fill: dark fills take `colorOnDark` (white), light fills
  // take `color` (black). Every one of the six stays legible.
  autoContrastConfig: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.45, showLabels: true }),
    theme: { pie: { slice: { colors: this.wideLuminancePalette } } },
  };

  // The SAME palette with derivation switched off by a flat layer-config `labelColor`.
  // Rendered beside the chart above, this is the ARCH-236 ceiling made visible: white
  // labels vanish on the two pale slices.
  flatLabelColorConfig: NgeChartConfig = {
    ...createPieChartConfig({
      data: this.sampleData,
      innerRadius: 0.45,
      labelColor: '#ffffff',
      showLabels: true,
    }),
    theme: { pie: { slice: { colors: this.wideLuminancePalette } } },
  };

  // PER-DATUM OVERRIDE — the highest-priority rung. 'Savings' and 'Other' carry their own
  // `labelColor`, so they opt out of derivation; the other four still derive.
  perDatumLabelConfig: NgeChartConfig = {
    ...createPieChartConfig({
      data: [
        { label: 'Rent', value: 1800 },
        { label: 'Food', value: 600 },
        { label: 'Transit', value: 300 },
        { label: 'Utilities', value: 250 },
        { label: 'Savings', labelColor: '#B71C1C', value: 450 },
        { label: 'Other', labelColor: '#B71C1C', value: 150 },
      ],
      innerRadius: 0.45,
      showLabels: true,
    }),
    theme: { pie: { slice: { colors: this.wideLuminancePalette } } },
  };

  // --- ARCH-267: the outside-label theme slices ---

  // Ten categories, so the columns are crowded enough for the collision pass to displace
  // labels and draw leader lines.
  private readonly manyCategories: NgePieDataPoint[] = [
    { label: 'Rent', value: 1800 },
    { label: 'Food', value: 600 },
    { label: 'Transit', value: 300 },
    { label: 'Utilities', value: 250 },
    { label: 'Savings', value: 450 },
    { label: 'Other', value: 150 },
    { label: 'Insurance', value: 220 },
    { label: 'Phone', value: 90 },
    { label: 'Streaming', value: 45 },
    { label: 'Fees', value: 30 },
  ];

  // DEFAULT outside labels. `theme.pie.labelOutside` is a SEPARATE slice from
  // `theme.pie.label`, and the split is not cosmetic: an on-arc label sits on a saturated
  // slice fill and reads the ABSOLUTE black / white contrast pair, while an outside label sits
  // on the page surface and tracks the theme-relative `--nge-chart-on-surface`. Reusing the
  // on-arc slice here would pin outside labels to absolute black — invisible in a dark theme.
  outsideLabelDefaultConfig = createPieChartConfig({
    data: this.manyCategories,
    labelGutter: 120,
    labelPosition: 'outside',
    showLabels: true,
  });

  // The same chart restyled through `labelOutside` + `leaderLine`. Note there is no
  // `colorOnDark` to set — the slice deliberately does not declare one, which is exactly what
  // switches automatic on-fill contrast off for a label that is not drawn on a fill.
  outsideLabelStyledConfig: NgeChartConfig = {
    ...createPieChartConfig({
      data: this.manyCategories,
      labelGutter: 120,
      labelPosition: 'outside',
      showLabels: true,
    }),
    theme: {
      pie: {
        labelOutside: { color: '#00695C', fontSize: 13, fontWeight: 700 },
        leaderLine: { stroke: '#00695C', strokeWidth: 2 },
        slice: { colors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#E53935'] },
      },
    },
  };

  // The two slices are independent. Here the ON-ARC slice is restyled bright yellow while the
  // OUTSIDE slice is left alone — the outside labels below are unaffected, which is the
  // property that makes overriding one placement safe.
  outsideLabelIndependentSlicesConfig: NgeChartConfig = {
    ...createPieChartConfig({
      data: this.manyCategories,
      labelGutter: 120,
      labelPosition: 'outside',
      showLabels: true,
    }),
    theme: {
      pie: {
        label: { color: '#FFE082', colorOnDark: '#FFE082', fontSize: 20 },
      },
    },
  };

  // Per-datum `labelColor` still wins in outside mode — the highlight-one-entry idiom.
  outsideLabelPerDatumConfig: NgeChartConfig = {
    ...createPieChartConfig({
      data: this.manyCategories.map(point =>
        point.label === 'Savings' ? { ...point, labelColor: '#B71C1C' } : point
      ),
      labelGutter: 120,
      labelPosition: 'outside',
      showLabels: true,
    }),
    theme: { pie: { labelOutside: { color: '#546E7A' } } },
  };

  // --- Side-by-side comparison (highlight section) ---
  comparisonDefault = createPieChartConfig({ data: this.sampleData, innerRadius: 0.55 });

  comparisonWarm: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.55 }),
    theme: {
      pie: {
        slice: { colors: ['#E53935', '#FB8C00', '#FDD835', '#F4511E', '#D81B60', '#8E24AA'] },
      },
    },
  };

  comparisonCool: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.55 }),
    theme: {
      pie: {
        slice: { colors: ['#1E88E5', '#00ACC1', '#43A047', '#3949AB', '#00897B', '#5E35B1'] },
      },
    },
  };
}
