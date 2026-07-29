import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgePieChartLegendHighlightStoriesComponent } from './pie-chart-legend-highlight-stories.component';

const meta: Meta<NgePieChartLegendHighlightStoriesComponent> = {
  argTypes: {
    dataset: {
      control: 'radio',
      description:
        "Which fixture to chart. 'goldMedals' is 30 categories from 932 down to 36 — the density this pattern exists for, where the palette cycles and neighbouring slices share a colour, so clicking a row is the only reliable way to find its wedge. 'budget' is five wide slices, the uncrowded case.",
      options: ['budget', 'goldMedals'],
      table: { category: 'Data' },
    },
    dimmedOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description:
        'theme.pie.slice.dimmedOpacity — how far an UNSELECTED slice recedes once something is selected. Only consulted while a selection is active. At 0 the unselected wedges vanish, which reads as filtering; the 0.25 default keeps their hue visible so the whole remains legible.',
      table: { category: 'Highlight' },
    },
    innerRadius: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Inner radius as a ratio (0 → pie, >0 → donut)',
      table: { category: 'Layer - Geometry' },
    },
    legendLayout: {
      control: 'radio',
      description:
        "Entry arrangement. 'grid' aligns the value column across rows so the legend reads as a table; 'flow' wraps them in a centered row. Ignored while orientation is 'vertical'.",
      options: ['flow', 'grid'],
      table: { category: 'Legend' },
    },
    legendOrientation: {
      control: 'radio',
      description:
        "Legend axis. 'vertical' places the legend beside the chart as a table — the arrangement this story is built for. 'horizontal' drops it below, which at 30 categories wraps into a block.",
      options: ['horizontal', 'vertical'],
      table: { category: 'Legend' },
    },
    showClearAction: {
      control: 'boolean',
      description:
        'Append the "Clear highlight" button. Called that rather than "show all" or "unselect all" — both imply entries were hidden, and this legend never hides one.',
      table: { category: 'Legend' },
    },
  },
  component: NgePieChartLegendHighlightStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Pie Chart/Legend Highlight',
};

export default meta;
type Story = StoryObj<NgePieChartLegendHighlightStoriesComponent>;

/**
 * A label-less pie whose legend carries the numbers, with click-to-emphasise.
 *
 * The three things worth doing here:
 *
 * - **Click several rows.** Selection is additive, and the arcs never move — compare a wedge's
 *   size before and after selecting it. That is the difference from the interactive legend in
 *   the sibling *Interaction* story, which drops the slice from the data so `d3.pie()` re-runs
 *   and every survivor grows.
 * - **Drag dimmedOpacity to 0.** The unselected wedges disappear and the chart suddenly reads
 *   like a filtered one — except the angles are still the original angles, so the remaining
 *   shares no longer look like they sum to the whole. The 0.25 default is the point: recede,
 *   don't vanish.
 * - **Switch dataset to `budget`.** Five wide slices never needed this; the pattern earns its
 *   keep only once the palette starts repeating and labels have nowhere to sit.
 */
export const LegendHighlight: Story = {
  args: {
    dataset: 'goldMedals',
    dimmedOpacity: 0.25,
    innerRadius: 0,
    legendLayout: 'grid',
    legendOrientation: 'vertical',
    showClearAction: true,
  },
};

/**
 * The same interaction on a donut, with the legend below rather than beside.
 *
 * A horizontal legend wraps into a block, which is the arrangement to reach for when the chart
 * has the width but not the height. `legendLayout: 'grid'` is what keeps the value column
 * aligned across the wrapped rows — flip it to `'flow'` to see the ragged alternative.
 */
export const DonutWithLegendBelow: Story = {
  args: {
    ...LegendHighlight.args,
    innerRadius: 0.55,
    legendOrientation: 'horizontal',
  },
};
