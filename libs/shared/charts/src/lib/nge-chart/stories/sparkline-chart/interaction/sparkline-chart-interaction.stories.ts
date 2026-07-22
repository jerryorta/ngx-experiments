import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { SparklineChartInteractionStoriesComponent } from './sparkline-chart-interaction-stories.component';

const meta: Meta<SparklineChartInteractionStoriesComponent> = {
  argTypes: {
    // Column Sparkline
    barPadding: {
      control: { max: 0.6, min: 0, step: 0.05, type: 'range' },
      description: 'Gap between columns (0–0.6)',
      table: { category: 'Column Sparkline' },
    },
    curveType: {
      control: 'radio',
      description: 'Line curve interpolation',
      options: ['basis', 'linear', 'monotone', 'step'],
      table: { category: 'Line Sparkline' },
    },
    lastValueColor: {
      control: 'text',
      description: 'Last-value dot colour (empty = inherit the line colour)',
      if: { arg: 'showLastValueDot' },
      table: { category: 'Line Sparkline' },
    },
    lineWidth: {
      control: { max: 4, min: 0.5, step: 0.5, type: 'range' },
      description: 'Line stroke width',
      table: { category: 'Line Sparkline' },
    },
    lossColor: {
      control: 'color',
      description: 'Loss mark colour',
      table: { category: 'Win-Loss Sparkline' },
    },
    marginBottom: {
      control: { max: 40, min: 0, step: 1, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Margins' },
    },
    marginLeft: {
      control: { max: 40, min: 0, step: 1, type: 'range' },
      description: 'Left margin',
      table: { category: 'Margins' },
    },
    marginRight: {
      control: { max: 40, min: 0, step: 1, type: 'range' },
      description: 'Right margin',
      table: { category: 'Margins' },
    },
    marginTop: {
      control: { max: 40, min: 0, step: 1, type: 'range' },
      description: 'Top margin',
      table: { category: 'Margins' },
    },
    showArea: {
      control: 'boolean',
      description: 'Fill the area under the line',
      table: { category: 'Line Sparkline' },
    },
    showLabels: {
      control: 'boolean',
      description: 'Show value labels on columns',
      table: { category: 'Column Sparkline' },
    },
    showLastValueDot: {
      control: 'boolean',
      description: 'Mark the series end with a dot',
      table: { category: 'Line Sparkline' },
    },
    showPoints: {
      control: 'boolean',
      description: 'Show a point at every datum',
      table: { category: 'Line Sparkline' },
    },
    showZeroLine: {
      control: 'boolean',
      description:
        'Draw the zero baseline on column + win-loss (column opt-in; win-loss default on)',
      table: { category: 'Zero Baseline' },
    },
    tieColor: {
      control: 'color',
      description: 'Tie mark colour (zero-length mark)',
      table: { category: 'Win-Loss Sparkline' },
    },
    tooltipEnabled: {
      control: 'boolean',
      description: 'Show a tooltip on hover (all three variants)',
      table: { category: 'Tooltip' },
    },
    winColor: {
      control: 'color',
      description: 'Win mark colour',
      table: { category: 'Win-Loss Sparkline' },
    },
  },
  component: SparklineChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sparkline Chart/Interaction',
};

export default meta;
type Story = StoryObj<SparklineChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    barPadding: 0.1,
    curveType: 'monotone',
    lastValueColor: '',
    lineWidth: 1,
    lossColor: '#B3261E',
    marginBottom: 4,
    marginLeft: 6,
    marginRight: 6,
    marginTop: 4,
    showArea: false,
    showLabels: false,
    showLastValueDot: true,
    showPoints: false,
    showZeroLine: true,
    tieColor: '#9E9E9E',
    tooltipEnabled: true,
    winColor: '#1976D2',
  },
};
