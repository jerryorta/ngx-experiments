import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableRowDetailContentInteractionStoriesComponent } from './row-detail-content-interaction-stories.component';

const meta: Meta<NgeTableRowDetailContentInteractionStoriesComponent> = {
  argTypes: {
    chartGap: {
      control: { max: 48, min: 0, step: 4, type: 'range' },
      description: 'Space between the two charts sharing the band, in pixels.',
      table: { category: 'Band - Layout' },
    },
    crosshairX: {
      control: 'boolean',
      description: "Draw the crosshair's vertical guide, snapped to the nearest day.",
      table: { category: 'Chart - Crosshair (left)' },
    },
    crosshairY: {
      control: 'boolean',
      description: "Draw the crosshair's horizontal guide at the pointer y.",
      table: { category: 'Chart - Crosshair (left)' },
    },
    pointRadius: {
      control: { max: 10, min: 2, step: 1, type: 'range' },
      description: 'Marker radius on the lag cloud.',
      table: { category: 'Chart - Lag cloud (right)' },
    },
    rowDetailHeight: {
      control: { max: 560, min: 160, step: 20, type: 'range' },
      description:
        'The DECLARED band height (`config.rowDetailHeight`), in pixels. Both charts follow it — ' +
        'they carry no height of their own and read `--nge-table-row-detail-height` instead.',
      table: { category: 'Band - Geometry' },
    },
    sharedTooltip: {
      control: 'boolean',
      description: 'One shared card listing all three series at the snapped day.',
      table: { category: 'Chart - Crosshair (left)' },
    },
  },
  component: NgeTableRowDetailContentInteractionStoriesComponent,
  title: 'Table/NgeTable/Row Detail Content/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableRowDetailContentInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    chartGap: 16,
    crosshairX: true,
    crosshairY: false,
    pointRadius: 5,
    rowDetailHeight: 320,
    sharedTooltip: true,
  },
};
