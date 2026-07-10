import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { LdgCategoryChipComponent } from '../ldg-category-chip.component';
import { LdgCategoryChipStoriesComponent } from './ldg-category-chip-stories.component';

const meta: Meta<LdgCategoryChipStoriesComponent> = {
  argTypes: {
    selected: { control: 'boolean' },
  },
  component: LdgCategoryChipStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Ledger Design Library/Category Chip',
};

export default meta;
type Story = StoryObj<LdgCategoryChipStoriesComponent>;

export const primary: Story = {
  args: {
    selected: false,
  },
  name: 'Category Chip',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [LdgCategoryChipComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    props: {
      dining: {
        accent: 'var(--ldg-category-2)',
        icon: 'restaurant',
        id: 'cat-dining',
        kind: 'expense',
        name: 'Dining',
      },
      groceries: {
        accent: 'var(--ldg-category-1)',
        icon: 'shopping_cart',
        id: 'cat-groceries',
        kind: 'expense',
        name: 'Groceries',
      },
    },
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.5rem">
          <ldg-category-chip [category]="groceries" [selected]="true"></ldg-category-chip>
          <ldg-category-chip [category]="dining"></ldg-category-chip>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.5rem">
          <ldg-category-chip [category]="groceries" [selected]="true"></ldg-category-chip>
          <ldg-category-chip [category]="dining"></ldg-category-chip>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.5rem">
          <ldg-category-chip [category]="groceries" [selected]="true"></ldg-category-chip>
          <ldg-category-chip [category]="dining"></ldg-category-chip>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.5rem">
          <ldg-category-chip [category]="groceries" [selected]="true"></ldg-category-chip>
          <ldg-category-chip [category]="dining"></ldg-category-chip>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.5rem">
          <ldg-category-chip [category]="groceries" [selected]="true"></ldg-category-chip>
          <ldg-category-chip [category]="dining"></ldg-category-chip>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface);display:flex;gap:0.5rem">
          <ldg-category-chip [category]="groceries" [selected]="true"></ldg-category-chip>
          <ldg-category-chip [category]="dining"></ldg-category-chip>
        </div>
      </div>`,
  }),
};
