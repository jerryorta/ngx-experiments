import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeHierarchyDatum } from '../../../../core/config';

import { createTreemapChartConfig } from '../../../../presets/treemap-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-treemap-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-treemap-chart-theming',
  standalone: true,
  styleUrl: './treemap-chart-theming.component.scss',
  templateUrl: './treemap-chart-theming.component.html',
})
export class NgeTreemapChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/treemap-chart/theming';

  sampleData: NgeHierarchyDatum[] = [
    {
      children: [
        { label: 'EC2', value: 4200 },
        { label: 'Lambda', value: 860 },
        { label: 'Fargate', value: 640 },
      ],
      label: 'Compute',
    },
    {
      children: [
        { label: 'S3', value: 1900 },
        { label: 'EBS', value: 740 },
      ],
      label: 'Storage',
    },
    {
      children: [
        { label: 'RDS', value: 1650 },
        { label: 'DynamoDB', value: 520 },
      ],
      label: 'Database',
    },
    {
      children: [
        { label: 'CloudFront', value: 780 },
        { label: 'Data Transfer', value: 430 },
      ],
      label: 'Network',
    },
  ];

  // Default theme (no overrides) — renders on the --nge-chart-* token defaults.
  defaultConfig = createTreemapChartConfig({
    data: this.sampleData,
    showLabels: true,
  });

  greenConfig: NgeChartConfig = {
    ...createTreemapChartConfig({ data: this.sampleData, showLabels: true }),
    theme: {
      treemap: {
        cell: { colors: ['#1B5E20', '#2E7D32', '#43A047', '#66BB6A'] },
      },
    },
  };

  blueConfig: NgeChartConfig = {
    ...createTreemapChartConfig({ data: this.sampleData, showLabels: true }),
    theme: {
      treemap: {
        cell: { colors: ['#0D47A1', '#1565C0', '#1E88E5', '#42A5F5'] },
      },
    },
  };

  warmConfig: NgeChartConfig = {
    ...createTreemapChartConfig({ data: this.sampleData, showLabels: true }),
    theme: {
      treemap: {
        cell: { colors: ['#B71C1C', '#E64A19', '#F57C00', '#FBC02D'] },
      },
    },
  };

  // ── Depth fade: the knob that makes nesting legible ──
  // These three expose the parent band (`paddingOuter` / `paddingTop`) on purpose. In a
  // gapless treemap the children cover their parent completely, so only the deepest level is
  // ever on screen and a luminance step between depths has nothing to separate. The fade
  // earns its keep exactly where a parent is visible behind its children.
  private readonly fadeDemoOptions = {
    data: this.sampleData,
    paddingOuter: 5,
    paddingTop: 5,
  };

  noFadeConfig: NgeChartConfig = {
    ...createTreemapChartConfig(this.fadeDemoOptions),
    theme: { treemap: { cell: { colors: ['#3949AB'], depthFade: 0 } } },
  };

  subtleFadeConfig: NgeChartConfig = {
    ...createTreemapChartConfig(this.fadeDemoOptions),
    theme: { treemap: { cell: { colors: ['#3949AB'], depthFade: 6 } } },
  };

  strongFadeConfig: NgeChartConfig = {
    ...createTreemapChartConfig(this.fadeDemoOptions),
    theme: { treemap: { cell: { colors: ['#3949AB'], depthFade: 18 } } },
  };

  // ── Cell separation ──
  hairlineConfig: NgeChartConfig = {
    ...createTreemapChartConfig({ data: this.sampleData, padding: 0 }),
    theme: { treemap: { cell: { strokeWidth: 1 } } },
  };

  boldSeparatorConfig: NgeChartConfig = {
    ...createTreemapChartConfig({ data: this.sampleData, padding: 0 }),
    theme: { treemap: { cell: { stroke: '#ffffff', strokeWidth: 4 } } },
  };

  // ── Label typography ──
  labelTypographyConfig: NgeChartConfig = {
    ...createTreemapChartConfig({
      data: this.sampleData,
      minLabelSize: 40,
      showLabels: true,
    }),
    theme: {
      treemap: {
        cell: { colors: ['#37474F', '#455A64', '#546E7A', '#607D8B'] },
        label: { color: '#212121', colorOnDark: '#FAFAFA', fontSize: 14, fontWeight: 700 },
      },
    },
  };

  // ── Flat label colour: opting out of automatic on-fill contrast ──
  flatLabelConfig: NgeChartConfig = {
    ...createTreemapChartConfig({
      data: this.sampleData,
      labelColor: '#FFFFFF',
      minLabelSize: 40,
      showLabels: true,
    }),
    theme: {
      treemap: { cell: { colors: ['#4A148C', '#6A1B9A', '#7B1FA2', '#8E24AA'] } },
    },
  };

  // ── The convex variant carries the same theme ──
  voronoiThemedConfig: NgeChartConfig = {
    ...createTreemapChartConfig({
      data: this.sampleData,
      maxLabelDepth: 1,
      seed: 7,
      showLabels: true,
      tiling: 'voronoi',
    }),
    theme: {
      treemap: {
        cell: {
          colors: ['#00695C', '#00838F', '#0277BD', '#283593'],
          stroke: '#ffffff',
          strokeWidth: 2,
        },
      },
    },
  };
}
