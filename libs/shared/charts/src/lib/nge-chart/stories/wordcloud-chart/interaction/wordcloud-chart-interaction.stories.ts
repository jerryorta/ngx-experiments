import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeWordCloudChartInteractionStoriesComponent } from './wordcloud-chart-interaction-stories.component';

// argTypes are sorted alphabetically (the lint rule requires it); the Storybook control panel
// groups them by `table.category`, not by their order here.
const meta: Meta<NgeWordCloudChartInteractionStoriesComponent> = {
  argTypes: {
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
    maxFontSize: {
      control: { max: 120, min: 10, step: 2, type: 'range' },
      description: 'Font size (px) of the highest-valued word',
      table: { category: 'Layer - Layout' },
    },
    minFontSize: {
      control: { max: 40, min: 4, step: 1, type: 'range' },
      description: 'Font size (px) of the lowest-valued word',
      table: { category: 'Layer - Layout' },
    },
    padding: {
      control: { max: 20, min: 0, step: 1, type: 'range' },
      description: 'Clearance (px) kept between adjacent word boxes',
      table: { category: 'Layer - Layout' },
    },
    rotationMode: {
      control: 'radio',
      description:
        'Orientation set cycled across the words by placement order — horizontal [0], mixed [0, 90], or quarter-turn [90].',
      options: ['horizontal', 'mixed', 'quarter-turn'],
      table: { category: 'Layer - Layout' },
    },
    scale: {
      control: 'radio',
      description:
        'How value maps to font size. sqrt scales AREA with value (default), linear scales height directly, log compresses a long tail.',
      options: ['sqrt', 'linear', 'log'],
      table: { category: 'Layer - Layout' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    uppercase: {
      control: 'boolean',
      description: 'Draw the words uppercased via formatLabel (the join key stays the raw label)',
      table: { category: 'Layer - Visibility' },
    },
    wordFontFamily: {
      control: 'text',
      description:
        'Font family the words are drawn AND measured in (empty = theme default). Try: Georgia, serif',
      table: { category: 'Theme - Word Styling' },
    },
    wordFontWeight: {
      control: { max: 900, min: 100, step: 100, type: 'range' },
      description: 'Word font weight',
      table: { category: 'Theme - Word Styling' },
    },
    wordOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Word text opacity',
      table: { category: 'Theme - Word Styling' },
    },
  },
  component: NgeWordCloudChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Word Cloud Chart/Interaction',
};

export default meta;
type Story = StoryObj<NgeWordCloudChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    maxFontSize: 48,
    minFontSize: 10,
    padding: 2,
    rotationMode: 'horizontal',
    scale: 'sqrt',
    showTooltip: true,
    uppercase: false,
    wordFontFamily: '',
    wordFontWeight: 600,
    wordOpacity: 1,
  },
};
