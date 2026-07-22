import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { ComparisonAreaChartInteractionStoriesComponent } from './comparison-area-chart-interaction-stories.component';

const meta: Meta<ComparisonAreaChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer
    areaOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Area fill opacity (0–1)',
      if: { arg: 'showArea' },
      table: { category: 'Layer' },
    },
    curveType: {
      control: 'radio',
      description: 'Line curve interpolation',
      options: ['linear', 'monotone', 'step'],
      table: { category: 'Layer' },
    },
    // Legend
    legendEnabled: {
      control: 'boolean',
      description: 'Show the series legend',
      table: { category: 'Legend' },
    },
    legendPosition: {
      control: 'radio',
      description: 'Legend position',
      if: { arg: 'legendEnabled' },
      options: ['bottom', 'left', 'right', 'top'],
      table: { category: 'Legend' },
    },
    marginBottom: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Base - Margins' },
    },
    marginLeft: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Left margin',
      table: { category: 'Base - Margins' },
    },
    marginRight: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    // Base - Margins
    marginTop: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    // Layer - Visibility
    showArea: {
      control: 'boolean',
      description: 'Fill the area under each line',
      table: { category: 'Layer' },
    },
    showPoints: {
      control: 'boolean',
      description: 'Show data points',
      table: { category: 'Layer' },
    },
    // Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Tooltip' },
    },
    tooltipHeight: {
      control: { max: 120, min: 40, step: 5, type: 'range' },
      description: 'Tooltip height',
      if: { arg: 'showTooltip' },
      table: { category: 'Tooltip' },
    },
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position relative to point',
      if: { arg: 'showTooltip' },
      options: ['above', 'below', 'follow-mouse'],
      table: { category: 'Tooltip' },
    },
    tooltipWidth: {
      control: { max: 200, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Tooltip' },
    },
    // Axis Labels
    xAxisLabel: {
      control: 'text',
      description: 'X axis label text',
      table: { category: 'Axis Labels' },
    },
    yAxisLabel: {
      control: 'text',
      description: 'Y axis label text',
      table: { category: 'Axis Labels' },
    },
  },
  component: ComparisonAreaChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Comparison Area Chart/Interaction',
};

export default meta;
type Story = StoryObj<ComparisonAreaChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    areaOpacity: 0.15,
    curveType: 'monotone',
    legendEnabled: true,
    legendPosition: 'bottom',
    marginBottom: 45,
    marginLeft: 60,
    marginRight: 20,
    marginTop: 20,
    showArea: true,
    showPoints: false,
    showTooltip: true,
    tooltipHeight: 65,
    tooltipPosition: 'follow-mouse',
    tooltipWidth: 140,
    xAxisLabel: 'Year',
    yAxisLabel: 'Remaining balance',
  },
};
