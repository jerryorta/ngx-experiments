import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { DivergingBarInteractionStoriesComponent } from './diverging-bar-interaction-stories.component';

const meta: Meta<DivergingBarInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Dimensions
    barHeight: {
      control: { max: 30, min: 4, step: 2, type: 'range' },
      description: 'Height of the bar and background track',
      table: { category: 'Layer - Dimensions' },
    },
    centerIndicatorHeight: {
      control: { max: 60, min: 10, step: 5, type: 'range' },
      description: 'Center (zero point) indicator height',
      table: { category: 'Layer - Dimensions' },
    },
    centerIndicatorWidth: {
      control: { max: 10, min: 1, step: 1, type: 'range' },
      description: 'Center (zero point) indicator width',
      table: { category: 'Layer - Dimensions' },
    },
    // Layer - Center Label
    centerLabel: {
      control: 'text',
      description: 'Text in the bubble above the center indicator',
      table: { category: 'Layer - Center Label' },
    },
    limitIndicatorHeight: {
      control: { max: 60, min: 10, step: 5, type: 'range' },
      description: 'Min / max limit indicator height',
      table: { category: 'Layer - Dimensions' },
    },
    limitIndicatorWidth: {
      control: { max: 10, min: 1, step: 1, type: 'range' },
      description: 'Min / max limit indicator width',
      table: { category: 'Layer - Dimensions' },
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
      description: 'Top margin (leave room for the center label)',
      table: { category: 'Base - Margins' },
    },
    max: {
      control: { max: 200, min: 10, step: 10, type: 'range' },
      description: 'Maximum value of the range (right limit)',
      table: { category: 'Data' },
    },
    min: {
      control: { max: 0, min: -200, step: 10, type: 'range' },
      description: 'Minimum value of the range (left limit)',
      table: { category: 'Data' },
    },
    negativeColor: {
      control: 'color',
      description: 'Bar color for negative values (left side)',
      table: { category: 'Data' },
    },
    positiveColor: {
      control: 'color',
      description: 'Bar color for positive values (right side)',
      table: { category: 'Data' },
    },
    // Layer - Tooltip
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
      control: { max: 120, min: 40, step: 5, type: 'range' },
      description: 'Tooltip height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position strategy',
      if: { arg: 'showTooltip' },
      options: ['above', 'below', 'follow-mouse'],
      table: { category: 'Layer - Tooltip' },
    },
    tooltipWidth: {
      control: { max: 260, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    units: {
      control: 'text',
      description: 'Units suffix shown in the tooltip (e.g. " pts", "%")',
      table: { category: 'Data' },
    },
    // Data
    value: {
      control: { max: 100, min: -100, step: 5, type: 'range' },
      description: 'Current value (positive extends right, negative extends left)',
      table: { category: 'Data' },
    },
    valueIndicatorHeight: {
      control: { max: 60, min: 10, step: 5, type: 'range' },
      description: 'Value marker height',
      table: { category: 'Layer - Dimensions' },
    },
    valueIndicatorWidth: {
      control: { max: 15, min: 2, step: 1, type: 'range' },
      description: 'Value marker width',
      table: { category: 'Layer - Dimensions' },
    },
  },
  component: DivergingBarInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Diverging Bar Chart/Interaction',
};

export default meta;
type Story = StoryObj<DivergingBarInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    // Layer - Dimensions
    barHeight: 10,
    centerIndicatorHeight: 30,
    centerIndicatorWidth: 3,
    // Layer - Center Label
    centerLabel: 'Balanced',
    limitIndicatorHeight: 30,
    limitIndicatorWidth: 2,
    // Base - Margins
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
    marginTop: 30,
    // Data
    max: 100,
    min: -100,
    negativeColor: '',
    positiveColor: '',
    // Layer - Tooltip
    showTooltip: true,
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipPosition: 'above',
    tooltipWidth: 150,
    units: ' pts',
    value: 35,
    valueIndicatorHeight: 30,
    valueIndicatorWidth: 5,
  },
};
