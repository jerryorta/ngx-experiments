import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeGraph } from '../../../../core/config';

import { createChordChartConfig } from '../../../../presets/chord-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Interstate migration between six US regions — the same fixture the usage facet uses. */
const MIGRATION: NgeGraph = {
  links: [
    { source: 'Northeast', target: 'Southeast', value: 420 },
    { source: 'Southeast', target: 'Northeast', value: 95 },
    { source: 'Northeast', target: 'Midwest', value: 60 },
    { source: 'Midwest', target: 'Northeast', value: 75 },
    { source: 'Northeast', target: 'West', value: 140 },
    { source: 'West', target: 'Northeast', value: 110 },
    { source: 'Southeast', target: 'Midwest', value: 85 },
    { source: 'Midwest', target: 'Southeast', value: 130 },
    { source: 'Southeast', target: 'West', value: 65 },
    { source: 'West', target: 'Southeast', value: 55 },
    { source: 'Southeast', target: 'Southwest', value: 150 },
    { source: 'Southwest', target: 'Southeast', value: 45 },
    { source: 'Midwest', target: 'West', value: 175 },
    { source: 'West', target: 'Midwest', value: 95 },
    { source: 'Midwest', target: 'Southwest', value: 60 },
    { source: 'Southwest', target: 'Midwest', value: 50 },
    { source: 'Southwest', target: 'West', value: 230 },
    { source: 'West', target: 'Southwest', value: 280 },
    { source: 'Mountain', target: 'West', value: 115 },
    { source: 'West', target: 'Mountain', value: 135 },
    { source: 'Mountain', target: 'Southwest', value: 90 },
    { source: 'Southwest', target: 'Mountain', value: 70 },
  ],
};

/** A six-entry regional palette — node index maps to colors[index % length]. */
const REGION_PALETTE = ['#3949AB', '#00897B', '#F9A825', '#8E24AA', '#D84315', '#546E7A'];

/** A cooler alternate palette for the themed Arc Diagram example. */
const OCEAN_PALETTE = ['#01579B', '#0277BD', '#0288D1', '#039BE5', '#29B6F6', '#4FC3F7'];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-chord-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-chord-chart-theming',
  standalone: true,
  styleUrl: './chord-chart-theming.component.scss',
  templateUrl: './chord-chart-theming.component.html',
})
export class NgeChordChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/chord-chart/theming';

  /** Default theme — no overrides, so everything resolves from `--nge-chart-*` tokens. */
  defaultConfig = createChordChartConfig({
    data: MIGRATION,
    showLabels: true,
  });

  /** A custom regional palette via the preset's `seriesColors` option. */
  customPaletteConfig = createChordChartConfig({
    data: MIGRATION,
    seriesColors: REGION_PALETTE,
    showLabels: true,
  });

  /**
   * Heavier surface-coloured outlines at a touch less opacity — `node.stroke` /
   * `node.strokeWidth` separate arcs sharing a ring the way the sankey layer's node rects
   * are outlined; `node.opacity` lets the ring read slightly translucent.
   */
  nodeStyledConfig: NgeChartConfig = {
    ...createChordChartConfig({ data: MIGRATION, seriesColors: REGION_PALETTE, showLabels: true }),
    theme: {
      chord: {
        node: { opacity: 0.9, stroke: '#ffffff', strokeWidth: 2 },
      },
    },
  };

  /**
   * Label typography. The slice is theme-relative and carries no `colorOnDark` — a chord
   * label always sits off the mark (past the ring / beneath the circle), so it never takes
   * the on-fill contrast derivation the in-mark slices do.
   */
  typographyConfig: NgeChartConfig = {
    ...createChordChartConfig({ data: MIGRATION, labelPadding: 10, showLabels: true }),
    theme: {
      chord: {
        label: { color: '#4a148c', fontSize: 13, fontWeight: 700 },
        node: { colors: ['#7b1fa2', '#8e24aa', '#9c27b0', '#ab47bc', '#ba68c8', '#ce93d8'] },
      },
    },
  };

  /** Non-ribbon Chord under the regional palette — the straight edges take the same slice. */
  nonRibbonThemedConfig: NgeChartConfig = {
    ...createChordChartConfig({
      data: MIGRATION,
      linkMark: 'edge',
      showLabels: true,
    }),
    theme: {
      chord: {
        link: { opacity: 0.6, opacityHover: 0.95 },
        node: { colors: REGION_PALETTE, stroke: '#ffffff', strokeWidth: 2 },
      },
    },
  };

  /** Arc Diagram under a cooler palette — `layout` is geometry, not theme, so it composes. */
  arcDiagramThemedConfig: NgeChartConfig = {
    ...createChordChartConfig({
      data: MIGRATION,
      layout: 'linear',
      showLabels: true,
    }),
    theme: {
      chord: {
        link: { opacity: 0.5 },
        node: { colors: OCEAN_PALETTE, stroke: '#ffffff' },
      },
    },
  };

  /**
   * Opacity is the load-bearing knob. Ribbons overlap heavily wherever flows cross; near
   * opaque, the diagram collapses into whichever ribbon paints last, while too translucent
   * fades every individual flow. The default 0.4 is the compromise.
   */
  denseConfig: NgeChartConfig = {
    ...createChordChartConfig({ data: MIGRATION, seriesColors: REGION_PALETTE, showLabels: true }),
    theme: { chord: { link: { opacity: 0.95 } } },
  };

  sparseConfig: NgeChartConfig = {
    ...createChordChartConfig({ data: MIGRATION, seriesColors: REGION_PALETTE, showLabels: true }),
    theme: { chord: { link: { opacity: 0.15 } } },
  };
}
