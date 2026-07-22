import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { CrosshairInteractionStoriesComponent } from './crosshair-interaction-stories.component';

const meta: Meta<CrosshairInteractionStoriesComponent> = {
  argTypes: {
    crosshairX: {
      control: 'boolean',
      description: 'Vertical guide that snaps to the nearest datum x',
      table: { category: 'Crosshair' },
    },
    crosshairY: {
      control: 'boolean',
      description: 'Horizontal guide at the pointer y',
      table: { category: 'Crosshair' },
    },
    host: {
      control: 'radio',
      description: 'Host layer drawing the 3 series (both continuous-x)',
      options: ['line', 'area'],
      table: { category: 'Crosshair' },
    },
    sharedTooltip: {
      control: 'boolean',
      description: 'Single shared tooltip listing every series value at the snapped x',
      table: { category: 'Crosshair' },
    },
  },
  component: CrosshairInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Crosshair/Interaction',
};

export default meta;
type Story = StoryObj<CrosshairInteractionStoriesComponent>;

/**
 * A 3-series LINE host with `crosshair: { x: true, shared: true }`. Move the
 * pointer to snap the vertical guide to the nearest date and read all three
 * series' values from the single shared tooltip.
 */
export const Interaction: Story = {
  args: {
    crosshairX: true,
    crosshairY: false,
    host: 'line',
    sharedTooltip: true,
  },
};

/**
 * The same shared crosshair + shared tooltip over an AREA host (overlaid fills
 * with a top stroke), proving the engine-level crosshair works across host types.
 */
export const AreaHost: Story = {
  args: {
    ...Interaction.args,
    host: 'area',
  },
};
