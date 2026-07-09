import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcSelectComponent } from '../dlc-select.component';
import { DlcSelectStoriesComponent } from './dlc-select-stories.component';

const meta: Meta<DlcSelectStoriesComponent> = {
  component: DlcSelectStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Select',
};

export default meta;
type Story = StoryObj<DlcSelectStoriesComponent>;

export const primary: Story = {
  name: 'Select',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcSelectComponent, FormsModule] })],
  name: 'Theme Showcase',
  render: () => ({
    props: {
      opts: [
        { label: 'Follow-Up Needed', value: 'follow-up-needed' },
        { label: 'Pending Call', value: 'pending-call' },
        { label: 'Waiting for Info', value: 'waiting-for-info' },
      ],
    },
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <p style="margin-bottom:0.75rem;font-size:0.75rem;opacity:0.6;color:var(--dlc-on-surface)">Professional Dark</p>
          <dlc-select placeholder="Select status…" [options]="opts" style="max-width:200px" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <p style="margin-bottom:0.75rem;font-size:0.75rem;opacity:0.6;color:var(--dlc-on-surface)">Professional Light</p>
          <dlc-select placeholder="Select status…" [options]="opts" style="max-width:200px" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <p style="margin-bottom:0.75rem;font-size:0.75rem;opacity:0.6;color:var(--dlc-on-surface)">Home Dark</p>
          <dlc-select placeholder="Select status…" [options]="opts" style="max-width:200px" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <p style="margin-bottom:0.75rem;font-size:0.75rem;opacity:0.6;color:var(--dlc-on-surface)">Home Light</p>
          <dlc-select placeholder="Select status…" [options]="opts" style="max-width:200px" />
        </div>
      </div>`,
  }),
};
