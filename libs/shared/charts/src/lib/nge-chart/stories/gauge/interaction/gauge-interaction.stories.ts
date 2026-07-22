import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { GaugeInteractionStoriesComponent } from './gauge-interaction-stories.component';

const meta: Meta<GaugeInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Geometry
    endAngle: {
      control: { max: 6.28, min: -3.14, step: 0.02, type: 'range' },
      description: 'End of the angular sweep in radians (arc only)',
      table: { category: 'Layer - Geometry' },
    },
    // Layer - Shape
    indicator: {
      control: 'radio',
      description: 'Arc readout: filled value arc or swinging needle (arc only)',
      options: ['fill', 'needle'],
      table: { category: 'Layer - Shape' },
    },
    innerRadius: {
      control: { max: 0.95, min: 0, step: 0.05, type: 'range' },
      description: 'Inner radius as a ratio of the outer radius (arc only)',
      table: { category: 'Layer - Geometry' },
    },
    // Theme - Label
    labelColor: {
      control: 'color',
      description: 'Center value-label color',
      table: { category: 'Theme - Label' },
    },
    labelFontSize: {
      control: { max: 40, min: 10, step: 2, type: 'range' },
      description: 'Center value-label font size (px)',
      table: { category: 'Theme - Label' },
    },
    labelFontWeight: {
      control: { max: 800, min: 300, step: 100, type: 'range' },
      description: 'Center value-label font weight',
      table: { category: 'Theme - Label' },
    },
    marginBottom: {
      control: { max: 40, min: 0, step: 5, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Base - Margins' },
    },
    marginLeft: {
      control: { max: 40, min: 0, step: 5, type: 'range' },
      description: 'Left margin',
      table: { category: 'Base - Margins' },
    },
    marginRight: {
      control: { max: 40, min: 0, step: 5, type: 'range' },
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    // Base - Margins
    marginTop: {
      control: { max: 40, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    max: {
      control: { max: 200, min: 50, step: 10, type: 'range' },
      description: 'Maximum of the value range',
      table: { category: 'Layer - Value' },
    },
    min: {
      control: { max: 50, min: 0, step: 5, type: 'range' },
      description: 'Minimum of the value range',
      table: { category: 'Layer - Value' },
    },
    // Theme - Needle
    needleColor: {
      control: 'color',
      description: 'Needle stroke color (arc + needle)',
      table: { category: 'Theme - Needle' },
    },
    needleWidth: {
      control: { max: 8, min: 1, step: 1, type: 'range' },
      description: 'Needle stroke width in px (arc + needle)',
      table: { category: 'Theme - Needle' },
    },
    shape: {
      control: 'radio',
      description: 'Meter form: arc gauge or linear progress bar',
      options: ['arc', 'linear'],
      table: { category: 'Layer - Shape' },
    },
    // Layer - Thresholds
    showThresholds: {
      control: 'boolean',
      description: 'Paint ascending 33% / 66% / 100% threshold bands along the track',
      table: { category: 'Layer - Thresholds' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    showValueLabel: {
      control: 'boolean',
      description: 'Print the numeric value (+ units) at the center',
      table: { category: 'Layer - Value' },
    },
    startAngle: {
      control: { max: 3.14, min: -3.14, step: 0.02, type: 'range' },
      description: 'Start of the angular sweep in radians (arc only)',
      table: { category: 'Layer - Geometry' },
    },
    tooltipBackgroundColor: {
      control: 'color',
      description: 'Tooltip background color',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipBorderColor: {
      control: 'color',
      description: 'Tooltip border color',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipBorderWidth: {
      control: { max: 5, min: 0, step: 1, type: 'range' },
      description: 'Tooltip border width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipDivotHeight: {
      control: { max: 30, min: 8, step: 2, type: 'range' },
      description: 'Tooltip divot height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipDivotWidth: {
      control: { max: 40, min: 12, step: 2, type: 'range' },
      description: 'Tooltip divot width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipHeight: {
      control: { max: 120, min: 40, step: 5, type: 'range' },
      description: 'Tooltip height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipWidth: {
      control: { max: 260, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    // Theme - Track
    trackColor: {
      control: 'color',
      description: 'Unfilled background track color',
      table: { category: 'Theme - Track' },
    },
    trackOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Track fill opacity',
      table: { category: 'Theme - Track' },
    },
    value: {
      control: { max: 100, min: 0, step: 1, type: 'range' },
      description: 'Current value (clamped into [min, max])',
      table: { category: 'Layer - Value' },
    },
    // Theme - Value fill
    valueColor: {
      control: 'color',
      description: 'Filled value arc / progress-fill color',
      table: { category: 'Theme - Value' },
    },
    valueOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Value fill opacity',
      table: { category: 'Theme - Value' },
    },
  },
  component: GaugeInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Gauge/Interaction',
};

export default meta;
type Story = StoryObj<GaugeInteractionStoriesComponent>;

/**
 * Solid Gauge — the default arc + fill readout. Drag `value` to watch the arc grow, or flip
 * `shape` / `indicator` to switch catalog variants live.
 */
export const Interaction: Story = {
  args: {
    endAngle: 2.36,
    indicator: 'fill',
    innerRadius: 0.65,
    labelColor: '',
    labelFontSize: 20,
    labelFontWeight: 600,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    max: 100,
    min: 0,
    needleColor: '',
    needleWidth: 2,
    shape: 'arc',
    showThresholds: false,
    showTooltip: true,
    showValueLabel: true,
    startAngle: -2.36,
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipWidth: 150,
    trackColor: '',
    trackOpacity: 1,
    value: 72,
    valueColor: '',
    valueOpacity: 1,
  },
};

/**
 * Angular Gauge — `indicator: 'needle'` swings a needle to the value, with threshold bands on to
 * show the value's zone.
 */
export const AngularGauge: Story = {
  args: {
    ...Interaction.args,
    indicator: 'needle',
    showThresholds: true,
  },
};

/**
 * Progress Bar — `shape: 'linear'` lays the same value / range out as a horizontal rail + fill
 * (`indicator` is ignored for linear).
 */
export const ProgressBar: Story = {
  args: {
    ...Interaction.args,
    shape: 'linear',
  },
};

/**
 * Semicircle — a flat-base half gauge (`startAngle: -π/2`, `endAngle: π/2`): the sweep runs
 * across the top half with both endpoints level on the horizontal centerline.
 */
export const Semicircle: Story = {
  args: {
    ...Interaction.args,
    endAngle: Math.PI / 2,
    startAngle: -Math.PI / 2,
  },
};
