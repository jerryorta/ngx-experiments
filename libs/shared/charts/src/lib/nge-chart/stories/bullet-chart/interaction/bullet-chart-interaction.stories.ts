import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { BulletChartInteractionStoriesComponent } from './bullet-chart-interaction-stories.component';

const meta: Meta<BulletChartInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Background Bar
    backgroundBarColor: {
      control: 'color',
      description: 'Background bar color',
      table: { category: 'Theme - Background Bar' },
    },
    backgroundBarHeight: {
      control: { max: 30, min: 4, step: 2, type: 'range' },
      description: 'Background bar height',
      table: { category: 'Theme - Background Bar' },
    },
    // Layer - Dimensions
    barHeight: {
      control: { max: 30, min: 4, step: 2, type: 'range' },
      description: 'Progress bar height',
      table: { category: 'Layer - Dimensions' },
    },
    // Data - Color
    color: {
      control: 'color',
      description: 'Custom color for progress bar and indicator',
      table: { category: 'Data' },
    },
    // Theme - Limit Indicator
    limitIndicatorColor: {
      control: 'color',
      description: 'Limit indicator color',
      table: { category: 'Theme - Limit Indicator' },
    },
    limitIndicatorHeight: {
      control: { max: 60, min: 10, step: 5, type: 'range' },
      description: 'Limit indicator height',
      table: { category: 'Layer - Dimensions' },
    },
    limitIndicatorWidth: {
      control: { max: 10, min: 1, step: 1, type: 'range' },
      description: 'Limit indicator width',
      table: { category: 'Layer - Dimensions' },
    },
    marginBottom: {
      control: { max: 50, min: 0, step: 5, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Base - Margins' },
    },
    marginLeft: {
      control: { max: 50, min: 0, step: 5, type: 'range' },
      description: 'Left margin',
      table: { category: 'Base - Margins' },
    },
    marginRight: {
      control: { max: 50, min: 0, step: 5, type: 'range' },
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    // Base - Margins
    marginTop: {
      control: { max: 50, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    // Data
    max: {
      control: { max: 1000, min: 10, step: 10, type: 'range' },
      description: 'Maximum value',
      table: { category: 'Data' },
    },
    min: {
      control: { max: 100, min: 0, step: 10, type: 'range' },
      description: 'Minimum value',
      table: { category: 'Data' },
    },
    progress: {
      control: { max: 1000, min: 0, step: 1, type: 'range' },
      description: 'Current progress value (should be between min and max)',
      table: { category: 'Data' },
    },
    // Theme - Progress Bar
    progressBarColor: {
      control: 'color',
      description: 'Default progress bar color (from theme)',
      table: { category: 'Theme - Progress Bar' },
    },
    // Theme - Progress Indicator
    progressIndicatorColor: {
      control: 'color',
      description: 'Default progress indicator color (from theme)',
      table: { category: 'Theme - Progress Indicator' },
    },
    progressIndicatorHeight: {
      control: { max: 60, min: 10, step: 5, type: 'range' },
      description: 'Progress indicator height',
      table: { category: 'Layer - Dimensions' },
    },
    progressIndicatorWidth: {
      control: { max: 15, min: 2, step: 1, type: 'range' },
      description: 'Progress indicator width',
      table: { category: 'Layer - Dimensions' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
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
      control: { max: 100, min: 30, step: 5, type: 'range' },
      description: 'Tooltip height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipWidth: {
      control: { max: 200, min: 60, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
  },
  component: BulletChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bullet Chart/Interaction',
};

export default meta;
type Story = StoryObj<BulletChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    // Theme - Background Bar
    backgroundBarColor: '',
    backgroundBarHeight: 10,
    // Layer - Dimensions
    barHeight: 10,
    // Data - Color
    color: '',
    // Theme - Limit Indicator
    limitIndicatorColor: '',
    limitIndicatorHeight: 30,
    limitIndicatorWidth: 2,
    // Base - Margins
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    // Data
    max: 100,
    min: 0,
    progress: 65,
    // Theme - Progress Bar
    progressBarColor: '',
    // Theme - Progress Indicator
    progressIndicatorColor: '',
    progressIndicatorHeight: 30,
    progressIndicatorWidth: 5,
    // Layer - Tooltip
    showTooltip: true,
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 100,
    tooltipWidth: 120,
  },
};
