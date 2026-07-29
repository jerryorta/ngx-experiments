import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeFunnelChartInteractionStoriesComponent } from './funnel-chart-interaction-stories.component';

const meta: Meta<NgeFunnelChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Layout
    align: {
      control: 'radio',
      description: 'Horizontal placement of each band',
      options: ['center', 'left'],
      table: { category: 'Layer - Layout' },
    },
    // Theme - Band Styling
    bandColor: {
      control: 'color',
      description:
        'Uniform band fill color (applies to every band; empty keeps the default palette)',
      table: { category: 'Theme - Band Styling' },
    },
    bandOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Band fill opacity',
      table: { category: 'Theme - Band Styling' },
    },
    bandStroke: {
      control: 'color',
      description: 'Band outline stroke color (separates adjacent bands)',
      table: { category: 'Theme - Band Styling' },
    },
    bandStrokeWidth: {
      control: { max: 6, min: 0, step: 0.5, type: 'range' },
      description: 'Band outline stroke width (px)',
      table: { category: 'Theme - Band Styling' },
    },
    // Layer - Layout
    direction: {
      control: 'radio',
      description: 'Vertical stacking direction — down (Funnel) or up (Pyramid)',
      options: ['down', 'up'],
      table: { category: 'Layer - Layout' },
    },
    gap: {
      control: { max: 40, min: 0, step: 1, type: 'range' },
      description: 'Vertical gap in pixels carved out between adjacent bands',
      table: { category: 'Layer - Layout' },
    },
    // Theme - Label Styling
    labelColor: {
      control: 'color',
      description: 'Label color',
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 24, min: 8, step: 1, type: 'range' },
      description: 'Label font size (px)',
      table: { category: 'Theme - Label Styling' },
    },
    labelFontWeight: {
      control: { max: 800, min: 300, step: 100, type: 'range' },
      description: 'Label font weight',
      table: { category: 'Theme - Label Styling' },
    },
    // Layer - Visibility (label placement)
    labelGutter: {
      control: { max: 200, min: 0, step: 10, type: 'range' },
      description:
        'Width reserved on the right for outside labels — the funnel is drawn into boundedWidth minus this. Ignored when labelPosition is inside',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Visibility' },
    },
    labelPosition: {
      control: 'radio',
      description:
        "Label placement: 'inside' centers in the band; 'edge' follows each band's own right edge (steps inward with the taper); 'right' pins all labels to one x",
      if: { arg: 'showLabels' },
      options: ['inside', 'edge', 'right'],
      table: { category: 'Layer - Visibility' },
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
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    marginTop: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    // Layer - Layout
    neckRatio: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: "The last band's bottom width as a ratio of the widest band width",
      if: { arg: 'useNeckRatio' },
      table: { category: 'Layer - Layout' },
    },
    // Layer - Visibility
    showLabels: {
      control: 'boolean',
      description: 'Draw a label centered in each band',
      table: { category: 'Layer - Visibility' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on band hover',
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
    tooltipWidth: {
      control: { max: 260, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    // Layer - Layout
    useNeckRatio: {
      control: 'boolean',
      description: "Enable neckRatio — unset leaves the last band's bottom flat",
      table: { category: 'Layer - Layout' },
    },
  },
  component: NgeFunnelChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Funnel Chart/Interaction',
};

export default meta;
type Story = StoryObj<NgeFunnelChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    align: 'center',
    bandColor: '',
    bandOpacity: 1,
    bandStroke: '',
    bandStrokeWidth: 1,
    direction: 'down',
    gap: 0,
    labelColor: '',
    labelFontSize: 10,
    labelFontWeight: 500,
    labelGutter: 96,
    labelPosition: 'inside',
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    neckRatio: 0,
    showLabels: true,
    showTooltip: true,
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipWidth: 150,
    useNeckRatio: false,
  },
};
