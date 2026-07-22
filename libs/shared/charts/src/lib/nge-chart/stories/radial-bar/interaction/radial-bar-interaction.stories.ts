import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { RadialBarInteractionStoriesComponent } from './radial-bar-interaction-stories.component';

const meta: Meta<RadialBarInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Area Styling
    areaFillOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Radial area fill opacity (mark: area)',
      table: { category: 'Theme - Area Styling' },
    },
    areaLineWidth: {
      control: { max: 6, min: 0, step: 1, type: 'range' },
      description: 'Radial area outline width in px (mark: area)',
      table: { category: 'Theme - Area Styling' },
    },
    // Theme - Cell Styling
    cellColor: {
      control: 'color',
      description: 'Circular-heatmap cell base fill (mark: cell)',
      table: { category: 'Theme - Cell Styling' },
    },
    cellMinOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Fill opacity for the lowest cell value (mark: cell)',
      table: { category: 'Theme - Cell Styling' },
    },
    // Layer - Layout
    endAngle: {
      control: { max: 6.28, min: 0, step: 0.02, type: 'range' },
      description: 'End of the angular sweep in radians (semi-circle / gauge)',
      table: { category: 'Layer - Layout' },
    },
    innerRadius: {
      control: { max: 0.9, min: 0, step: 0.05, type: 'range' },
      description: 'Inner radius ratio (0 → from center, >0 → donut hole)',
      table: { category: 'Layer - Layout' },
    },
    // Layer - Legend
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a series to toggle it in/out of the radial area (mark: area).',
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
    mark: {
      control: 'radio',
      description: 'Radial mark: bar arcs, closed radial area, or heatmap cells',
      options: ['bar', 'area', 'cell'],
      table: { category: 'Layer - Layout' },
    },
    padAngle: {
      control: { max: 0.1, min: 0, step: 0.005, type: 'range' },
      description: 'Angular gap between adjacent bars in radians (mark: bar)',
      table: { category: 'Layer - Layout' },
    },
    // Theme - Bar Styling
    seriesColor1: {
      control: 'color',
      description: 'Palette color 1 (bars by datum index / area series by index)',
      table: { category: 'Theme - Bar Styling' },
    },
    seriesColor2: {
      control: 'color',
      description: 'Palette color 2',
      table: { category: 'Theme - Bar Styling' },
    },
    seriesColor3: {
      control: 'color',
      description: 'Palette color 3',
      table: { category: 'Theme - Bar Styling' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    startAngle: {
      control: { max: 3.14, min: -3.14, step: 0.02, type: 'range' },
      description: 'Start of the angular sweep in radians (semi-circle / gauge)',
      table: { category: 'Layer - Layout' },
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
    wedge: {
      control: 'radio',
      description: 'Angular distribution (mark: bar): equal slots or value-proportional wedges',
      options: ['equal', 'value'],
      table: { category: 'Layer - Layout' },
    },
  },
  component: RadialBarInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Radial Bar/Interaction',
};

export default meta;
type Story = StoryObj<RadialBarInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    areaFillOpacity: 0.3,
    areaLineWidth: 2,
    cellColor: '',
    cellMinOpacity: 0.1,
    endAngle: 6.28,
    innerRadius: 0.1,
    interactiveLegend: false,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    mark: 'bar',
    padAngle: 0.02,
    seriesColor1: '#1E88E5',
    seriesColor2: '#43A047',
    seriesColor3: '#FB8C00',
    showTooltip: true,
    startAngle: 0,
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipWidth: 150,
    wedge: 'equal',
  },
};

/**
 * Renders the standalone interactive `<nge-chart-legend>` above the chart with the
 * chart's internal legend suppressed, seeded with `mark: 'area'` so there are series to
 * toggle. Clicking a series toggles it in/out of the radial area — the area rebuilds
 * without it while the series stays listed in the legend but dimmed (opacity 0.4) so it
 * can be toggled back on. Survivors keep their colors (a stable `seriesColors` slice
 * aligned to the visible series' original order is handed to the renderer).
 */
export const InteractiveLegend: Story = {
  args: {
    ...Interaction.args,
    interactiveLegend: true,
    mark: 'area',
  },
};
