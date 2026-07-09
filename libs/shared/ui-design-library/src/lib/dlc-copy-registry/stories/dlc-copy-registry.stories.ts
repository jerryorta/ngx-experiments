import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import type { DlcCopyRegistryItem } from '../dlc-copy-registry.model';

import { DlcCopyRegistryComponent } from '../dlc-copy-registry.component';
import { DlcCopyRegistryStoriesComponent } from './dlc-copy-registry-stories.component';

const meta: Meta<DlcCopyRegistryStoriesComponent> = {
  component: DlcCopyRegistryStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Copy Registry',
};

export default meta;
type Story = StoryObj<DlcCopyRegistryStoriesComponent>;

export const primary: Story = {
  name: 'Copy Registry',
};

const THEME_SHOWCASE_ITEMS: readonly DlcCopyRegistryItem[] = [
  { id: 'showcase-1', label: 'MLS#', text: 'ACT231887082' },
  {
    id: 'showcase-2',
    label: 'Address',
    text: '123 Main St, Austin, TX 78701',
  },
];

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcCopyRegistryComponent] })],
  name: 'Theme Showcase',
  render: (args: DlcCopyRegistryStoriesComponent) => ({
    props: {
      items: THEME_SHOWCASE_ITEMS,
      ...args,
    },
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-copy-registry [items]="items" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-copy-registry [items]="items" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-copy-registry [items]="items" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-copy-registry [items]="items" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-copy-registry [items]="items" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-copy-registry [items]="items" />
        </div>
      </div>`,
  }),
};
