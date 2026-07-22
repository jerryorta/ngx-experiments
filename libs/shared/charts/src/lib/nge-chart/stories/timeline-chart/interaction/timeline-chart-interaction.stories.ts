import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { TimelineChartInteractionStoriesComponent } from './timeline-chart-interaction-stories.component';

const meta: Meta<TimelineChartInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Bar Styling
    barColor: {
      control: 'color',
      description: 'Task-span bar fill color',
      table: { category: 'Theme - Bar Styling' },
    },
    barHoverColor: {
      control: 'color',
      description: 'Task-span bar hover color',
      table: { category: 'Theme - Bar Styling' },
    },
    // Layer - Layout
    barRadius: {
      control: { max: 20, min: 0, step: 1, type: 'range' },
      description: 'Bar corner radius',
      table: { category: 'Layer - Layout' },
    },
    // Theme - Label Styling
    labelColor: {
      control: 'color',
      description: 'On-bar label color',
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 20, min: 8, step: 1, type: 'range' },
      description: 'On-bar label font size',
      table: { category: 'Theme - Label Styling' },
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
    // Theme - Milestone Styling
    milestoneColor: {
      control: 'color',
      description: 'Milestone diamond fill color',
      table: { category: 'Theme - Milestone Styling' },
    },
    milestoneSize: {
      control: { max: 16, min: 2, step: 1, type: 'range' },
      description: 'Milestone diamond size (half-diagonal px)',
      table: { category: 'Layer - Layout' },
    },
    rowPadding: {
      control: { max: 0.6, min: 0, step: 0.05, type: 'range' },
      description: 'Padding between band rows (0-1)',
      table: { category: 'Layer - Layout' },
    },
    // Layer - Visibility
    showLabels: {
      control: 'boolean',
      description: 'Draw the item label inside each span bar',
      table: { category: 'Layer - Visibility' },
    },
    showMilestones: {
      control: 'boolean',
      description: 'Render milestone items as diamonds',
      table: { category: 'Layer - Visibility' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    showXAxis: {
      control: 'boolean',
      description: 'Show the X (time) axis',
      table: { category: 'Layer - Visibility' },
    },
    showXGrid: {
      control: 'boolean',
      description: 'Show vertical gridlines at X tick positions',
      table: { category: 'Layer - Visibility' },
    },
    showYAxis: {
      control: 'boolean',
      description: 'Show the Y (row) axis',
      table: { category: 'Layer - Visibility' },
    },
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position relative to the span',
      if: { arg: 'showTooltip' },
      options: ['above', 'below', 'follow-mouse'],
      table: { category: 'Layer - Tooltip' },
    },
  },
  component: TimelineChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Timeline Chart/Interaction',
};

export default meta;
type Story = StoryObj<TimelineChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    // Theme - Bar Styling (defaults from DEFAULT_TIMELINE_LAYER_THEME)
    barColor: '',
    barHoverColor: '',
    // Layer - Layout
    barRadius: 2,
    // Theme - Label Styling (defaults from DEFAULT_TIMELINE_LAYER_THEME)
    labelColor: '',
    labelFontSize: 10,
    marginBottom: 45,
    marginLeft: 80,
    marginRight: 45,
    // Base - Margins
    marginTop: 20,
    // Theme - Milestone Styling (defaults from DEFAULT_TIMELINE_LAYER_THEME)
    milestoneColor: '',
    milestoneSize: 6,
    rowPadding: 0.2,
    // Layer - Visibility
    showLabels: true,
    showMilestones: true,
    // Layer - Tooltip
    showTooltip: true,
    showXAxis: true,
    showXGrid: true,
    showYAxis: true,
    tooltipPosition: 'follow-mouse',
  },
};
