import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeParallelCoordsChartInteractionStoriesComponent } from './parallel-coords-chart-interaction-stories.component';

// argTypes are sorted alphabetically (the lint rule requires it); the Storybook control panel
// groups them by `table.category`, not by their order here.
const meta: Meta<NgeParallelCoordsChartInteractionStoriesComponent> = {
  argTypes: {
    axisColor: {
      control: 'color',
      description: 'Axis stroke color (empty uses the theme default)',
      table: { category: 'Theme - Axis Styling' },
    },
    axisWidth: {
      control: { max: 4, min: 0.5, step: 0.5, type: 'range' },
      description: 'Axis stroke width (px)',
      table: { category: 'Theme - Axis Styling' },
    },
    brushing: {
      control: 'boolean',
      description:
        'Per-axis brush filtering. Drag down an axis to select the records crossing it there; brushes on several axes compose as AND, and non-matching records dim rather than disappear.',
      table: { category: 'Layer - Brush' },
    },
    colorBy: {
      control: 'radio',
      description: 'Dimension whose value colors each line; empty cycles the palette by record',
      options: ['', 'Origin', 'Cylinders'],
      table: { category: 'Layer - Color' },
    },
    curve: {
      control: 'radio',
      description: 'Polyline shape between axes; monotone draws the curved catalog variant',
      options: ['linear', 'monotone'],
      table: { category: 'Layer - Layout' },
    },
    dimensionPreset: {
      control: 'radio',
      description:
        'Axis order and subset. A correlation between two dimensions is only visible when their axes are adjacent.',
      options: ['all', 'performance', 'reversed'],
      table: { category: 'Layer - Layout' },
    },
    labelFontSize: {
      control: { max: 22, min: 8, step: 1, type: 'range' },
      description: 'Dimension-name font size (px)',
      table: { category: 'Theme - Label Styling' },
    },
    labelFontWeight: {
      control: { max: 900, min: 300, step: 100, type: 'range' },
      description: 'Dimension-name font weight',
      table: { category: 'Theme - Label Styling' },
    },
    lineDimmedOpacity: {
      control: { max: 1, min: 0, step: 0.02, type: 'range' },
      description: 'Opacity the other records drop to while one is hovered',
      table: { category: 'Theme - Line Styling' },
    },
    lineOpacity: {
      control: { max: 1, min: 0.05, step: 0.05, type: 'range' },
      description: 'Resting line opacity — below 1 is what turns overplotting into density',
      table: { category: 'Theme - Line Styling' },
    },
    lineWidth: {
      control: { max: 6, min: 0.5, step: 0.5, type: 'range' },
      description: 'Line stroke width (px)',
      table: { category: 'Theme - Line Styling' },
    },
    marginBottom: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Base - Margins' },
    },
    marginLeft: {
      control: { max: 120, min: 0, step: 5, type: 'range' },
      description: 'Left margin',
      table: { category: 'Base - Margins' },
    },
    marginRight: {
      control: { max: 120, min: 0, step: 5, type: 'range' },
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    marginTop: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    recordCount: {
      control: { max: 200, min: 4, step: 4, type: 'range' },
      description:
        'Number of records drawn. Raise it to see why the density theme knobs matter — settings that read well at 12 records become a solid block at 200.',
      table: { category: 'Layer - Data' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show a tooltip for the datum on the axis nearest the pointer',
      table: { category: 'Layer - Tooltip' },
    },
    tickColor: {
      control: 'color',
      description: 'Tick label color (empty uses the theme default)',
      table: { category: 'Theme - Label Styling' },
    },
    tickCount: {
      control: { max: 12, min: 2, step: 1, type: 'range' },
      description: 'Ticks requested per numeric axis; point axes always label every category',
      table: { category: 'Layer - Layout' },
    },
    tickFontSize: {
      control: { max: 18, min: 6, step: 1, type: 'range' },
      description: 'Tick label font size (px)',
      table: { category: 'Theme - Label Styling' },
    },
  },
  component: NgeParallelCoordsChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Parallel Coordinates/Interaction',
};

export default meta;
type Story = StoryObj<NgeParallelCoordsChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    axisColor: '',
    axisWidth: 1,
    brushing: false,
    colorBy: 'Origin',
    curve: 'linear',
    dimensionPreset: 'all',
    labelFontSize: 12,
    labelFontWeight: 600,
    lineDimmedOpacity: 0.12,
    lineOpacity: 0.7,
    lineWidth: 1.5,
    marginBottom: 16,
    marginLeft: 24,
    marginRight: 24,
    marginTop: 24,
    recordCount: 24,
    showTooltip: true,
    tickColor: '',
    tickCount: 5,
    tickFontSize: 10,
  },
};

/**
 * The density case the theme knobs exist for: at 160 records the resting opacity and stroke
 * width decide whether the chart reads as clustered trends or as a solid block.
 */
export const HighDensity: Story = {
  args: {
    ...Interaction.args,
    lineOpacity: 0.35,
    lineWidth: 1,
    recordCount: 160,
  },
};

/**
 * Per-axis brushing — what turns the layer from a picture into an instrument.
 *
 * Drag down an axis to select the records crossing it inside that range; drag a window's edge
 * to resize it or its body to move it; click an axis away from its window to clear it. Extents
 * on several axes compose as AND, and records failing any of them DIM rather than disappear,
 * so the selection stays readable against the population it came from.
 *
 * The extents are controlled: the layer emits them and the story holds them, which is why the
 * matching-record count above the chart can be computed from the source rows rather than from
 * anything the chart drew. Density is raised here because a filter is only worth the gesture
 * once there are more records than the eye can separate.
 */
export const Brushing: Story = {
  args: {
    ...Interaction.args,
    brushing: true,
    lineOpacity: 0.5,
    recordCount: 80,
  },
};
