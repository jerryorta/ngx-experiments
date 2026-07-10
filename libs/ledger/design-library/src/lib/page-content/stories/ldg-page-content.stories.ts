import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { LdgPageContentComponent } from '../ldg-page-content.component';
import { LdgPageContentStoriesComponent } from './ldg-page-content-stories.component';

const meta: Meta<LdgPageContentStoriesComponent> = {
  argTypes: {
    padded: { control: 'boolean' },
  },
  component: LdgPageContentStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Ledger Design Library/Page Content',
};

export default meta;
type Story = StoryObj<LdgPageContentStoriesComponent>;

export const primary: Story = {
  args: {
    padded: true,
  },
  name: 'Page Content',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [LdgPageContentComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="height:160px;background:var(--dlc-surface);color:var(--dlc-on-surface)">
          <ldg-page-content>Professional Dark</ldg-page-content>
        </div>
        <div class="dlc-professional-light" style="height:160px;background:var(--dlc-surface);color:var(--dlc-on-surface)">
          <ldg-page-content>Professional Light</ldg-page-content>
        </div>
        <div class="dlc-home-dark"          style="height:160px;background:var(--dlc-surface);color:var(--dlc-on-surface)">
          <ldg-page-content>Home Dark</ldg-page-content>
        </div>
        <div class="dlc-home-light"         style="height:160px;background:var(--dlc-surface);color:var(--dlc-on-surface)">
          <ldg-page-content>Home Light</ldg-page-content>
        </div>
        <div class="dlc-service-provider-dark"  style="height:160px;background:var(--dlc-surface);color:var(--dlc-on-surface)">
          <ldg-page-content>Service Provider Dark</ldg-page-content>
        </div>
        <div class="dlc-service-provider-light" style="height:160px;background:var(--dlc-surface);color:var(--dlc-on-surface)">
          <ldg-page-content>Service Provider Light</ldg-page-content>
        </div>
      </div>`,
  }),
};
