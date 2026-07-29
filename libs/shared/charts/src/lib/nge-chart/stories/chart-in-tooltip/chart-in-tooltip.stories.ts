import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeChartInTooltipStoriesComponent } from './chart-in-tooltip-stories.component';

const meta: Meta<NgeChartInTooltipStoriesComponent> = {
  argTypes: {
    variant: {
      control: { type: 'radio' },
      description:
        'Base chart to demo: a stacked column → donut of its segments, or a grouped column → pie of the group series.',
      options: ['stacked', 'grouped'],
    },
  },
  component: NgeChartInTooltipStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Chart in Tooltip (Prototype)',
};

export default meta;
type Story = StoryObj<NgeChartInTooltipStoriesComponent>;

/**
 * Hover a stacked column — a DONUT of that column's segments renders inside the
 * chromeless `#ngeChartTooltip` (a nested `<nge-chart>`), sized in a fixed box so
 * it doesn't collapse. Moving within a column doesn't rebuild the donut (memoized
 * by the column key).
 */
export const StackedToDonut: Story = {
  args: { variant: 'stacked' },
};

/**
 * Hover a grouped column — a PIE of that group's series renders inside the chromeless
 * tooltip. Matches the original ask: hover a bar group, see a pie of the group.
 */
export const GroupedToPie: Story = {
  args: { variant: 'grouped' },
};
