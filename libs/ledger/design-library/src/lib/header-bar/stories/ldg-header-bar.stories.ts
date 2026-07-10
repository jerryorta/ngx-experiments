import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { LdgHeaderBarComponent } from '../ldg-header-bar.component';
import { LdgHeaderBarStoriesComponent } from './ldg-header-bar-stories.component';

const meta: Meta<LdgHeaderBarStoriesComponent> = {
  argTypes: {
    subtitle: { control: 'text' },
    title: { control: 'text' },
  },
  component: LdgHeaderBarStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Ledger Design Library/Header Bar',
};

export default meta;
type Story = StoryObj<LdgHeaderBarStoriesComponent>;

export const primary: Story = {
  args: {
    subtitle: 'July 2026',
    title: 'Accounts',
  },
  name: 'Header Bar',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [LdgHeaderBarComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="background:var(--dlc-surface)">
          <ldg-header-bar title="Professional Dark" subtitle="July 2026"></ldg-header-bar>
        </div>
        <div class="dlc-professional-light" style="background:var(--dlc-surface)">
          <ldg-header-bar title="Professional Light" subtitle="July 2026"></ldg-header-bar>
        </div>
        <div class="dlc-home-dark"          style="background:var(--dlc-surface)">
          <ldg-header-bar title="Home Dark" subtitle="July 2026"></ldg-header-bar>
        </div>
        <div class="dlc-home-light"         style="background:var(--dlc-surface)">
          <ldg-header-bar title="Home Light" subtitle="July 2026"></ldg-header-bar>
        </div>
        <div class="dlc-service-provider-dark"  style="background:var(--dlc-surface)">
          <ldg-header-bar title="Service Provider Dark" subtitle="July 2026"></ldg-header-bar>
        </div>
        <div class="dlc-service-provider-light" style="background:var(--dlc-surface)">
          <ldg-header-bar title="Service Provider Light" subtitle="July 2026"></ldg-header-bar>
        </div>
      </div>`,
  }),
};
