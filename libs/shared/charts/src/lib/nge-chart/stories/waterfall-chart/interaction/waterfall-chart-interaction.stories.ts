import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { WaterfallChartInteractionStoriesComponent } from './waterfall-chart-interaction-stories.component';

const meta: Meta<WaterfallChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Layout
    barPadding: {
      control: { max: 0.6, min: 0, step: 0.05, type: 'range' },
      description: 'Padding between bars (0-1)',
      table: { category: 'Layer - Layout' },
    },
    barRadius: {
      control: { max: 12, min: 0, step: 1, type: 'range' },
      description: 'Bar corner radius (px)',
      table: { category: 'Layer - Layout' },
    },
    // Layer - Visibility
    connectors: {
      control: 'boolean',
      description: 'Draw step connectors between bars',
      table: { category: 'Layer - Visibility' },
    },
    cumulative: {
      control: 'boolean',
      description: 'Overlay a running-total % line on a secondary axis',
      table: { category: 'Layer - Visibility' },
    },
    // Theme - Colors
    cumulativeColor: {
      control: 'color',
      description: 'Color of the cumulative % line',
      if: { arg: 'cumulative' },
      table: { category: 'Theme - Colors' },
    },
    fallColor: {
      control: 'color',
      description: 'Fill for falling (negative) bars',
      table: { category: 'Theme - Colors' },
    },
    // Base - Margins
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
      description: 'Right margin (leave room for the % axis)',
      table: { category: 'Base - Margins' },
    },
    marginTop: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    riseColor: {
      control: 'color',
      description: 'Fill for rising (positive) bars',
      table: { category: 'Theme - Colors' },
    },
    showLabels: {
      control: 'boolean',
      description: 'Show per-bar value labels',
      table: { category: 'Layer - Visibility' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    totalColor: {
      control: 'color',
      description: "Fill for 'total' bars",
      table: { category: 'Theme - Colors' },
    },
    // Layer - Axis Labels
    xAxisLabel: {
      control: 'text',
      description: 'X axis label',
      table: { category: 'Layer - Axis Labels' },
    },
    yAxisLabel: {
      control: 'text',
      description: 'Y axis label',
      table: { category: 'Layer - Axis Labels' },
    },
  },
  component: WaterfallChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Waterfall Chart/Interaction',
};

export default meta;
type Story = StoryObj<WaterfallChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    barPadding: 0.2,
    barRadius: 0,
    connectors: true,
    cumulative: false,
    cumulativeColor: '',
    fallColor: '',
    marginBottom: 45,
    marginLeft: 55,
    marginRight: 55,
    marginTop: 20,
    riseColor: '',
    showLabels: false,
    showTooltip: true,
    totalColor: '',
    xAxisLabel: 'Movement',
    yAxisLabel: 'Revenue ($K)',
  },
};
