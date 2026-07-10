import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { LdgBudgetCardComponent } from '../ldg-budget-card.component';
import { LdgBudgetCardStoriesComponent } from './ldg-budget-card-stories.component';

const meta: Meta<LdgBudgetCardStoriesComponent> = {
  argTypes: {
    accentIndex: { control: { max: 8, min: 1, step: 1, type: 'range' } },
    categoryName: { control: 'text' },
    limitCents: { control: 'number' },
    spentCents: { control: 'number' },
  },
  component: LdgBudgetCardStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Ledger Design Library/Budget Card',
};

export default meta;
type Story = StoryObj<LdgBudgetCardStoriesComponent>;

export const primary: Story = {
  args: {
    accentIndex: 1,
    categoryName: 'Groceries',
    limitCents: 45000,
    spentCents: 22500,
  },
  name: 'Budget Card',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [LdgBudgetCardComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    props: {
      category: {
        accent: 'var(--ldg-category-1)',
        icon: 'shopping_cart',
        id: 'cat-groceries',
        kind: 'expense',
        name: 'Groceries',
      },
    },
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <ldg-budget-card [category]="category" [limitCents]="45000" [spentCents]="22500"></ldg-budget-card>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <ldg-budget-card [category]="category" [limitCents]="45000" [spentCents]="22500"></ldg-budget-card>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <ldg-budget-card [category]="category" [limitCents]="45000" [spentCents]="22500"></ldg-budget-card>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <ldg-budget-card [category]="category" [limitCents]="45000" [spentCents]="22500"></ldg-budget-card>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <ldg-budget-card [category]="category" [limitCents]="45000" [spentCents]="22500"></ldg-budget-card>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <ldg-budget-card [category]="category" [limitCents]="45000" [spentCents]="22500"></ldg-budget-card>
        </div>
      </div>`,
  }),
};
