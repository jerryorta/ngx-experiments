import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { LollipopChartInteractionStoriesComponent } from './lollipop-chart-interaction-stories.component';

const meta: Meta<LollipopChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Layout
    baseline: {
      control: { max: 40, min: -40, step: 5, type: 'range' },
      description: 'Single-marker stem origin on the value axis',
      table: { category: 'Layer - Layout' },
    },
    // Layer - Visibility
    connect: {
      control: 'boolean',
      description: 'Join same-seriesId markers across categories into a slope line',
      table: { category: 'Layer - Visibility' },
    },
    // Theme - Label
    labelColor: {
      control: 'color',
      description: 'Value label color',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label' },
    },
    labelFontSize: {
      control: { max: 20, min: 8, step: 1, type: 'range' },
      description: 'Value label font size (px)',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label' },
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
    // Theme - Marker
    markerColor: {
      control: 'color',
      description: 'Marker fill color (fed through seriesColors)',
      table: { category: 'Theme - Marker' },
    },
    // Layer - Layout
    markerSize: {
      control: { max: 14, min: 2, step: 1, type: 'range' },
      description: 'Marker radius (px)',
      table: { category: 'Layer - Layout' },
    },
    // Theme - Marker
    markerStrokeColor: {
      control: 'color',
      description: 'Marker outline stroke color',
      table: { category: 'Theme - Marker' },
    },
    // Layer - Layout
    orientation: {
      control: 'radio',
      description: 'Category-axis orientation',
      options: ['vertical', 'horizontal'],
      table: { category: 'Layer - Layout' },
    },
    shape: {
      control: 'radio',
      description: 'Marker glyph',
      options: ['circle', 'diamond', 'square'],
      table: { category: 'Layer - Layout' },
    },
    // Layer - Visibility
    showLabels: {
      control: 'boolean',
      description: 'Show per-marker value labels',
      table: { category: 'Layer - Visibility' },
    },
    showStem: {
      control: 'boolean',
      description: 'Draw the stem (false ⇒ a bare dot plot)',
      table: { category: 'Layer - Visibility' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    // Theme - Stem
    stemColor: {
      control: 'color',
      description: 'Stem stroke color',
      table: { category: 'Theme - Stem' },
    },
    stemWidth: {
      control: { max: 8, min: 1, step: 1, type: 'range' },
      description: 'Stem stroke width (px)',
      table: { category: 'Theme - Stem' },
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
  component: LollipopChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Lollipop Chart/Interaction',
};

export default meta;
type Story = StoryObj<LollipopChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    baseline: 0,
    connect: false,
    labelColor: '',
    labelFontSize: 10,
    marginBottom: 45,
    marginLeft: 50,
    marginRight: 20,
    marginTop: 20,
    markerColor: '',
    markerSize: 5,
    markerStrokeColor: '',
    orientation: 'vertical',
    shape: 'circle',
    showLabels: false,
    showStem: true,
    showTooltip: true,
    stemColor: '',
    stemWidth: 2,
    xAxisLabel: 'City',
    yAxisLabel: 'Satisfaction',
  },
};
