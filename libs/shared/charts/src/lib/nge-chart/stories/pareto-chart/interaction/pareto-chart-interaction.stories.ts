import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { ParetoChartInteractionStoriesComponent } from './pareto-chart-interaction-stories.component';

const meta: Meta<ParetoChartInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Colors
    barColor: {
      control: 'color',
      description: 'Uniform bar fill color',
      table: { category: 'Theme - Colors' },
    },
    // Layer - Layout
    barPadding: {
      control: { max: 0.9, min: 0, step: 0.05, type: 'range' },
      description: 'Padding between bars (0-1)',
      table: { category: 'Layer - Layout' },
    },
    barRadius: {
      control: { max: 20, min: 0, step: 1, type: 'range' },
      description: 'Bar corner radius',
      table: { category: 'Layer - Layout' },
    },
    lineColor: {
      control: 'color',
      description: 'Cumulative line color',
      table: { category: 'Theme - Colors' },
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
      description: 'Right margin (room for the % axis)',
      table: { category: 'Base - Margins' },
    },
    // Base - Margins
    marginTop: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    // Layer - Visibility
    showLabels: {
      control: 'boolean',
      description: 'Show value labels on bars',
      table: { category: 'Layer - Visibility' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover (bars + line)',
      table: { category: 'Layer - Tooltip' },
    },
    sort: {
      control: 'boolean',
      description: 'Sort bars descending (canonical Pareto order)',
      table: { category: 'Layer - Visibility' },
    },
    // Layer - Axis Labels
    xAxisLabel: {
      control: 'text',
      description: 'X axis label text',
      table: { category: 'Layer - Axis Labels' },
    },
    y2AxisLabel: {
      control: 'text',
      description: 'Secondary (cumulative %) axis label',
      table: { category: 'Layer - Axis Labels' },
    },
    yAxisLabel: {
      control: 'text',
      description: 'Primary (count) axis label',
      table: { category: 'Layer - Axis Labels' },
    },
  },
  component: ParetoChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Pareto Chart/Interaction',
};

export default meta;
type Story = StoryObj<ParetoChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    barColor: '',
    barPadding: 0.2,
    barRadius: 2,
    lineColor: '',
    marginBottom: 45,
    marginLeft: 55,
    marginRight: 60,
    marginTop: 20,
    showLabels: false,
    showTooltip: true,
    sort: true,
    xAxisLabel: 'Category',
    y2AxisLabel: 'Cumulative %',
    yAxisLabel: 'Count',
  },
};
