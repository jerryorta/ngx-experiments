import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { FinancialChartInteractionStoriesComponent } from './financial-chart-interaction-stories.component';

const meta: Meta<FinancialChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Financial
    brickSize: {
      control: { max: 15, min: 0, step: 0.5, type: 'range' },
      description:
        'Renko brick height in price units (renko variant); 0 = auto (5% of close range)',
      table: { category: 'Layer - Financial' },
    },
    // Layer - Layout
    candleWidth: {
      control: { max: 1, min: 0.1, step: 0.05, type: 'range' },
      description: 'Candle body width as a fraction of the band bandwidth (candlestick variant)',
      table: { category: 'Layer - Layout' },
    },
    // Theme - Financial Styling
    downColor: {
      control: 'color',
      description: 'Down (falling) body / brick color; empty ⇒ default red',
      table: { category: 'Theme - Financial Styling' },
    },
    kagiYangColor: {
      control: 'color',
      description: 'Kagi yang (thick, rising past the prior shoulder) line color; empty ⇒ default',
      table: { category: 'Theme - Financial Styling' },
    },
    kagiYinColor: {
      control: 'color',
      description: 'Kagi yin (thin, fallen below the prior waist) line color; empty ⇒ default',
      table: { category: 'Theme - Financial Styling' },
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
    // Layer - Financial
    reversalAsPercent: {
      control: 'boolean',
      description: 'Read reversalThreshold as a fraction of the close price range (kagi variant)',
      table: { category: 'Layer - Financial' },
    },
    reversalThreshold: {
      control: { max: 15, min: 0, step: 0.5, type: 'range' },
      description: 'Kagi reversal amount (kagi variant); 0 = auto (3% of close range)',
      table: { category: 'Layer - Financial' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover (candlestick variant)',
      table: { category: 'Layer - Tooltip' },
    },
    // Layer - Visibility
    showXAxis: {
      control: 'boolean',
      description: 'Show the X axis',
      table: { category: 'Layer - Visibility' },
    },
    showYAxis: {
      control: 'boolean',
      description: 'Show the Y axis',
      table: { category: 'Layer - Visibility' },
    },
    // Layer - Tooltip
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position',
      if: { arg: 'showTooltip' },
      options: ['above', 'below', 'follow-mouse'],
      table: { category: 'Layer - Tooltip' },
    },
    // Theme - Financial Styling
    upColor: {
      control: 'color',
      description: 'Up (rising) body / brick color; empty ⇒ default green',
      table: { category: 'Theme - Financial Styling' },
    },
    // Layer - Layout
    variant: {
      control: 'radio',
      description: 'Which price chart to draw',
      options: ['candlestick', 'kagi', 'renko'],
      table: { category: 'Layer - Layout' },
    },
    // Theme - Financial Styling
    wickColor: {
      control: 'color',
      description: 'Candlestick wick / kagi connector color; empty ⇒ default',
      table: { category: 'Theme - Financial Styling' },
    },
  },
  component: FinancialChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Financial Chart/Interaction',
};

export default meta;
type Story = StoryObj<FinancialChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    brickSize: 0,
    candleWidth: 0.6,
    downColor: '',
    kagiYangColor: '',
    kagiYinColor: '',
    marginBottom: 45,
    marginLeft: 50,
    marginRight: 15,
    marginTop: 20,
    reversalAsPercent: false,
    reversalThreshold: 0,
    showTooltip: true,
    showXAxis: true,
    showYAxis: true,
    tooltipPosition: 'follow-mouse',
    upColor: '',
    variant: 'candlestick',
    wickColor: '',
  },
};

/**
 * Kagi variant: the `close` series folded into a reversal-driven zigzag of yang
 * (thick) / yin (thin) verticals. `reversalThreshold` / `reversalAsPercent` drive how
 * large a counter-move must be to start a new vertical.
 */
export const Kagi: Story = {
  args: {
    ...Interaction.args,
    variant: 'kagi',
  },
};

/**
 * Renko variant: the `close` series walked into a fixed-`brickSize` diagonal
 * staircase; a reversal needs a move of roughly `2·brickSize` against the trend.
 */
export const Renko: Story = {
  args: {
    ...Interaction.args,
    variant: 'renko',
  },
};
