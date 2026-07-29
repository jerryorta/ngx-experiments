import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeProportionalChartInteractionStoriesComponent } from './proportional-chart-interaction-stories.component';

// argTypes are sorted alphabetically (the lint rule requires it); the Storybook control panel
// groups them by `table.category`, not by their order here.
const meta: Meta<NgeProportionalChartInteractionStoriesComponent> = {
  argTypes: {
    columns: {
      control: { max: 20, min: 1, step: 1, type: 'range' },
      description: 'Grid columns',
      if: { arg: 'mark', eq: 'grid' },
      table: { category: 'Layer - Layout' },
    },
    emptyCellColor: {
      control: 'color',
      description: 'Unfilled waffle cell fill (empty = theme default)',
      if: { arg: 'mark', eq: 'grid' },
      table: { category: 'Theme - Mark Styling' },
    },
    emptyCellOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Unfilled waffle cell opacity',
      if: { arg: 'mark', eq: 'grid' },
      table: { category: 'Theme - Mark Styling' },
    },
    labelColor: {
      control: 'color',
      description: 'Label colour on a LIGHT mark fill (empty = theme default)',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelColorOnDark: {
      control: 'color',
      description:
        'Label colour on a perceptually DARK mark fill. Match it to labelColor to switch contrast derivation off.',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 28, min: 6, step: 1, type: 'range' },
      description: 'Label font size (px)',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontWeight: {
      control: { max: 900, min: 100, step: 100, type: 'range' },
      description: 'Label font weight',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    layout: {
      control: 'radio',
      description:
        'How the single-shape marks are arranged. Ignored by the grid and packed marks, which own their own layout.',
      if: { arg: 'mark', neq: 'grid' },
      options: ['row', 'nested'],
      table: { category: 'Layer - Layout' },
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
    marginTop: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    mark: {
      control: 'radio',
      description: 'Which area-encoded shape to draw',
      options: ['circle', 'half-circle', 'square', 'grid', 'packed'],
      table: { category: 'Layer - Layout' },
    },
    markOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Mark fill opacity',
      table: { category: 'Theme - Mark Styling' },
    },
    markStroke: {
      control: 'color',
      description: 'Mark outline colour (empty = theme default)',
      table: { category: 'Theme - Mark Styling' },
    },
    markStrokeWidth: {
      control: { max: 8, min: 0, step: 0.5, type: 'range' },
      description: 'Mark outline width (px)',
      table: { category: 'Theme - Mark Styling' },
    },
    minLabelSize: {
      control: { max: 120, min: 0, step: 4, type: 'range' },
      description: 'Smallest mark width (px) that still earns a label',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Visibility' },
    },
    padding: {
      control: { max: 20, min: 0, step: 1, type: 'range' },
      description: 'Separation between marks (grid gutter, pack padding, row slot inset)',
      table: { category: 'Layer - Layout' },
    },
    rows: {
      control: { max: 20, min: 1, step: 1, type: 'range' },
      description: 'Grid rows',
      if: { arg: 'mark', eq: 'grid' },
      table: { category: 'Layer - Layout' },
    },
    showLabels: {
      control: 'boolean',
      description: 'Draw each datum’s label on its own mark. Ignored by the grid mark.',
      table: { category: 'Layer - Visibility' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    valuePerCell: {
      control: { max: 20, min: 0, step: 1, type: 'range' },
      description:
        'Magnitude one grid cell represents. 0 = unset, so the grid fills exactly (total / rows × columns).',
      if: { arg: 'mark', eq: 'grid' },
      table: { category: 'Layer - Layout' },
    },
  },
  component: NgeProportionalChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Proportional Chart/Interaction',
};

export default meta;
type Story = StoryObj<NgeProportionalChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    columns: 10,
    emptyCellColor: '',
    emptyCellOpacity: 1,
    labelColor: '',
    labelColorOnDark: '',
    labelFontSize: 12,
    labelFontWeight: 600,
    layout: 'row',
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
    marginTop: 20,
    mark: 'circle',
    markOpacity: 1,
    markStroke: '',
    markStrokeWidth: 1,
    minLabelSize: 24,
    padding: 2,
    rows: 10,
    showLabels: true,
    showTooltip: true,
    valuePerCell: 0,
  },
};

export const Waffle: Story = {
  args: { ...Interaction.args, mark: 'grid' },
};

export const PackedCircles: Story = {
  args: { ...Interaction.args, mark: 'packed' },
};

export const NestedArea: Story = {
  args: { ...Interaction.args, layout: 'nested', showLabels: false },
};
