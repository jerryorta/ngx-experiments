import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcTooltipDirective } from '../dlc-tooltip.directive';
import { DlcTooltipStoriesComponent } from './dlc-tooltip-stories.component';

const meta: Meta<DlcTooltipStoriesComponent> = {
  component: DlcTooltipStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Tooltip',
};

export default meta;
type Story = StoryObj<DlcTooltipStoriesComponent>;

export const primary: Story = {
  name: 'Tooltip',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcTooltipDirective] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:3rem 2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;align-items:center;justify-content:center"><button [dlcTooltip]="'Professional Dark'" style="padding:0.5rem 1rem;border-radius:0.25rem;border:1px solid currentColor;cursor:pointer;color:inherit;background:transparent">Hover me</button></div>
        <div class="dlc-professional-light" style="padding:3rem 2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;align-items:center;justify-content:center"><button [dlcTooltip]="'Professional Light'" style="padding:0.5rem 1rem;border-radius:0.25rem;border:1px solid currentColor;cursor:pointer;color:inherit;background:transparent">Hover me</button></div>
        <div class="dlc-home-dark"          style="padding:3rem 2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;align-items:center;justify-content:center"><button [dlcTooltip]="'Home Dark'" style="padding:0.5rem 1rem;border-radius:0.25rem;border:1px solid currentColor;cursor:pointer;color:inherit;background:transparent">Hover me</button></div>
        <div class="dlc-home-light"         style="padding:3rem 2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;align-items:center;justify-content:center"><button [dlcTooltip]="'Home Light'" style="padding:0.5rem 1rem;border-radius:0.25rem;border:1px solid currentColor;cursor:pointer;color:inherit;background:transparent">Hover me</button></div>
        <div class="dlc-service-provider-dark"  style="padding:3rem 2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;align-items:center;justify-content:center"><button [dlcTooltip]="'Service Provider Dark'" style="padding:0.5rem 1rem;border-radius:0.25rem;border:1px solid currentColor;cursor:pointer;color:inherit;background:transparent">Hover me</button></div>
        <div class="dlc-service-provider-light" style="padding:3rem 2rem;background:var(--dlc-surface);color:var(--dlc-on-surface);display:flex;align-items:center;justify-content:center"><button [dlcTooltip]="'Service Provider Light'" style="padding:0.5rem 1rem;border-radius:0.25rem;border:1px solid currentColor;cursor:pointer;color:inherit;background:transparent">Hover me</button></div>
      </div>`,
  }),
};
