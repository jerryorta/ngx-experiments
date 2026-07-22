import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { CustomTooltipPrototypeStoriesComponent } from './custom-tooltip-prototype-stories.component';

const meta: Meta<CustomTooltipPrototypeStoriesComponent> = {
  argTypes: {
    chromeless: {
      control: 'boolean',
      description:
        'Drop the default tooltip bubble — the custom #ngeChartTooltip template becomes the entire tooltip (its own chrome).',
    },
  },
  component: CustomTooltipPrototypeStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Custom Tooltip (Prototype)',
};

export default meta;
type Story = StoryObj<CustomTooltipPrototypeStoriesComponent>;

/**
 * A custom Angular tooltip (`#ngeChartTooltip` template) replacing the default
 * per-mark tooltip CONTENT — still rendered inside the built-in bubble chrome.
 */
export const InBubble: Story = {
  args: { chromeless: false },
};

/**
 * The same custom template with `chromelessTooltip` — the default bubble is
 * dropped, so the custom card is the ENTIRE tooltip (its own chrome).
 */
export const Chromeless: Story = {
  args: { chromeless: true },
};
