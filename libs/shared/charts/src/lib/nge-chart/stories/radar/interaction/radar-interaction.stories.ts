import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { RadarInteractionStoriesComponent } from './radar-interaction-stories.component';

const meta: Meta<RadarInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Web Styling
    axisColor: {
      control: 'color',
      description: 'Radial spoke (axis) stroke color',
      table: { category: 'Theme - Web Styling' },
    },
    // Layer - Layout
    endAngle: {
      control: { max: 6.28, min: 0, step: 0.02, type: 'range' },
      description: 'End of the angular sweep in radians (full circle = 2π)',
      table: { category: 'Layer - Layout' },
    },
    // Theme - Series Styling
    fillOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Filled-polygon fill opacity (render: area)',
      table: { category: 'Theme - Series Styling' },
    },
    gridColor: {
      control: 'color',
      description: 'Concentric value-ring (grid web) stroke color',
      table: { category: 'Theme - Web Styling' },
    },
    innerRadius: {
      control: { max: 0.9, min: 0, step: 0.05, type: 'range' },
      description: 'Inner radius ratio (0 → from center, >0 → center hub)',
      table: { category: 'Layer - Layout' },
    },
    // Layer - Legend
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a series to toggle it in/out of the radar.',
      table: { category: 'Layer - Legend' },
    },
    levels: {
      control: { max: 8, min: 2, step: 1, type: 'range' },
      description: 'Number of concentric value rings (grid levels)',
      table: { category: 'Layer - Layout' },
    },
    lineWidth: {
      control: { max: 6, min: 0, step: 1, type: 'range' },
      description: 'Polygon outline stroke width in px',
      table: { category: 'Theme - Series Styling' },
    },
    marginBottom: {
      control: { max: 80, min: 0, step: 5, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Base - Margins' },
    },
    marginLeft: {
      control: { max: 80, min: 0, step: 5, type: 'range' },
      description: 'Left margin',
      table: { category: 'Base - Margins' },
    },
    marginRight: {
      control: { max: 80, min: 0, step: 5, type: 'range' },
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    // Base - Margins
    marginTop: {
      control: { max: 80, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    pointRadius: {
      control: { max: 8, min: 0, step: 1, type: 'range' },
      description: 'Vertex dot radius in px (0 hides the dots)',
      table: { category: 'Theme - Series Styling' },
    },
    render: {
      control: 'radio',
      description: 'Series shape: filled radar polygon or stroked polar outline',
      options: ['area', 'line'],
      table: { category: 'Layer - Layout' },
    },
    seriesColor1: {
      control: 'color',
      description: 'Palette color 1 (series by index)',
      table: { category: 'Theme - Series Styling' },
    },
    seriesColor2: {
      control: 'color',
      description: 'Palette color 2',
      table: { category: 'Theme - Series Styling' },
    },
    seriesColor3: {
      control: 'color',
      description: 'Palette color 3',
      table: { category: 'Theme - Series Styling' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    startAngle: {
      control: { max: 3.14, min: -3.14, step: 0.02, type: 'range' },
      description: 'Start of the angular sweep in radians (first axis)',
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
  },
  component: RadarInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Radar/Interaction',
};

export default meta;
type Story = StoryObj<RadarInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    axisColor: '',
    endAngle: 6.28,
    fillOpacity: 0.3,
    gridColor: '',
    innerRadius: 0,
    interactiveLegend: false,
    levels: 5,
    lineWidth: 2,
    marginBottom: 40,
    marginLeft: 40,
    marginRight: 40,
    marginTop: 40,
    pointRadius: 3,
    render: 'area',
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
  },
};

/**
 * Renders the standalone interactive `<nge-chart-legend>` above the chart with the chart's
 * internal legend suppressed. Clicking a series toggles it in/out of the radar — the polygons
 * rebuild without it while the series stays listed in the legend but dimmed (opacity 0.4) so it
 * can be toggled back on. Survivors keep their colors (a stable `seriesColors` slice aligned to
 * the visible series' original order is handed to the renderer).
 */
export const InteractiveLegend: Story = {
  args: {
    ...Interaction.args,
    interactiveLegend: true,
  },
};
