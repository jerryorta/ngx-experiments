import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeCrosshairInteractionStoriesComponent } from './crosshair-interaction-stories.component';

const meta: Meta<NgeCrosshairInteractionStoriesComponent> = {
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
    enableGestures: {
      control: 'boolean',
      description: 'Wheel-zoom / drag-pan / shift-drag brush-zoom (switches to a continuous x)',
      table: { category: 'Gestures' },
    },
    host: {
      control: 'select',
      description:
        'Host the crosshair reads — continuous (line/area), band (bar family), or a composed overlay',
      options: ['line', 'area', 'bar', 'grouped-bar', 'stacked-bar', 'marimekko', 'overlay'],
      table: { category: 'Crosshair' },
    },
    legendPosition: {
      control: 'radio',
      description: 'Edge the legend sits on — top/left shift the plot origin in the host',
      options: ['bottom', 'top', 'left', 'right'],
      table: { category: 'Layout' },
    },
    sharedTooltip: {
      control: 'boolean',
      description: 'Single shared tooltip listing every series value at the snapped x',
      table: { category: 'Crosshair' },
    },
  },
  component: NgeCrosshairInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Crosshair/Interaction',
};

export default meta;
type Story = StoryObj<NgeCrosshairInteractionStoriesComponent>;

/**
 * A 3-series LINE host with `crosshair: { x: true, shared: true }`. Move the
 * pointer to snap the vertical guide to the nearest date and read all three
 * series' values from the single shared tooltip.
 */
export const Interaction: Story = {
  args: {
    crosshairX: true,
    crosshairY: false,
    enableGestures: false,
    host: 'line',
    legendPosition: 'bottom',
    sharedTooltip: true,
  },
};

/**
 * The same crosshair with the legend moved ABOVE the plot (ARCH-223).
 *
 * A `top` (or `left`) legend is a flex sibling ahead of the plot container, so the plot
 * no longer starts at the chart host's own origin — while the shared tooltip is placed
 * against that host. Read the card's position against the guide and the focus dots:
 * it tracks them here exactly as it does with the legend below, because the chart
 * measures where the plot sits inside itself rather than assuming (0, 0).
 *
 * Flip `legendPosition` through all four edges — the card must stay beside the guide in
 * every one. `left` is the horizontal counterpart; `bottom` / `right` leave the plot at
 * the origin and are the case that always worked.
 */
export const TopLegend: Story = {
  args: {
    ...Interaction.args,
    crosshairY: true,
    legendPosition: 'top',
  },
};

/**
 * The crosshair with plot gestures live on the same svg (ARCH-222). Every frame of
 * a pan or zoom re-renders the chart, which re-attaches the crosshair — drag and
 * scroll and the guide, focus dots and shared card stay steady through it rather
 * than blinking at pointer rate.
 *
 * Shift-drag draws a brush-zoom rectangle, and the crosshair stands down for its
 * duration: two interactions wanting the same plot resolve by one asking, not by
 * whichever listener happens to run last. Double-click resets the zoom.
 */
export const GesturesAndCrosshair: Story = {
  args: {
    ...Interaction.args,
    crosshairY: true,
    enableGestures: true,
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

/**
 * A BAR host (ARCH-263). Until this story the crosshair read line and area layers
 * only, so `crosshair: { x: true, shared: true }` on a bar chart was accepted and
 * drew nothing at all — no guide, no dot, no card.
 *
 * The anchor here is the CATEGORY the pointer is over rather than the nearest datum
 * position: sweep across the plot and the guide steps column to column, landing on
 * each band's centre.
 */
export const BarHost: Story = {
  args: {
    ...Interaction.args,
    host: 'bar',
  },
};

/**
 * A GROUPED-BAR host — one row per series at the hovered category.
 *
 * Note the swatches: the grouped-bar renderer fills every inner bar from a single
 * theme colour rather than cycling a palette, so the tooltip does the same. A
 * swatch that disagreed with the bar it describes would be the bug.
 */
export const GroupedBarHost: Story = {
  args: {
    ...Interaction.args,
    host: 'grouped-bar',
  },
};

/**
 * A STACKED-BAR host, where a row's value and its focus dot separate.
 *
 * Each row reports the segment's OWN magnitude, while its dot sits at the segment's
 * cumulative top — which is where the mark actually is. Placing the dot at the value
 * would drop every upper segment's marker down into the segment below it.
 */
export const StackedBarHost: Story = {
  args: {
    ...Interaction.args,
    host: 'stacked-bar',
  },
};

/**
 * A MARIMEKKO host — the case that decides how a band anchor must be resolved.
 *
 * Column widths are weighted by each group's total, so "the band the pointer is
 * inside" and "the band whose centre is nearest" stop agreeing: hovering the right
 * edge of a wide column is closer to a narrow neighbour's centre than to its own.
 * The guide follows the column under the pointer, which is what the reader is
 * pointing at.
 */
export const MarimekkoHost: Story = {
  args: {
    ...Interaction.args,
    host: 'marimekko',
  },
};

/**
 * A composed ANALYTICAL OVERLAY on a line host (ARCH-263).
 *
 * The overlay's own `data` is the series it analyses — usually the host's — so
 * contributing those points as rows would just repeat the host's. What it adds
 * instead is the DERIVED value: a `Trend` row carrying the least-squares fit at the
 * snapped x, beside the actual value. Read the two together to see how far the
 * observation sits from the trend.
 *
 * A `control` overlay contributes `Mean` the same way. A `fan` overlay contributes
 * no row at all — nested prediction bands are a range that widens with x, so there
 * is no single value at an x to report.
 */
export const OverlayHost: Story = {
  args: {
    ...Interaction.args,
    host: 'overlay',
  },
};
