import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  applicationConfig,
  type Meta,
  moduleMetadata,
  type StoryObj,
} from '@storybook/angular';

import { DlcAvatarComponent } from '../../dlc-avatar/dlc-avatar.component';
import { DlcButtonComponent } from '../../dlc-button/dlc-button.component';
import { DlcChipComponent } from '../../dlc-chip/dlc-chip.component';
import { DlcStatsCardComponent } from '../../dlc-stats-card/dlc-stats-card.component';
import { DlcBottomNavComponent } from '../dlc-bottom-nav.component';
import {
  DLC_DEMO_NAV_ITEMS,
  DlcBottomNavStoriesComponent,
} from './dlc-bottom-nav-stories.component';

const meta: Meta<DlcBottomNavStoriesComponent> = {
  argTypes: {
    activeId: {
      control: { type: 'select' },
      options: DLC_DEMO_NAV_ITEMS.map((item) => item.id),
    },
  },
  component: DlcBottomNavStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Mobile Footer Nav/Bottom Nav',
};

export default meta;
type Story = StoryObj<DlcBottomNavStoriesComponent>;

export const BottomNav: Story = {
  args: {
    activeId: 'home',
  },
  name: 'Bottom Nav',
};

/**
 * The bar in situ: a phone-sized shell with a header, page content and the nav
 * pinned to the bottom edge, composed from shared primitives only.
 */
export const PhoneFrameShowcase: Story = {
  decorators: [
    moduleMetadata({
      imports: [
        DlcBottomNavComponent,
        DlcAvatarComponent,
        DlcStatsCardComponent,
        DlcChipComponent,
        DlcButtonComponent,
      ],
    }),
  ],
  name: 'Phone Frame Showcase',
  render: () => ({
    props: {
      items: DLC_DEMO_NAV_ITEMS,
    },
    template: `
      <div style="padding:2rem;background:var(--dlc-surface,#ffffff)">
        <div style="display:flex;flex-direction:column;width:22rem;max-width:100%;height:40rem;overflow:hidden;border:1px solid var(--dlc-outline-variant,#c6ccd6);border-radius:1.75rem;background:var(--dlc-surface,#ffffff);color:var(--dlc-on-surface,#161a22);font-family:var(--dlc-font-family-body,system-ui,sans-serif)">

          <header style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;padding:1.25rem 1.25rem 0.75rem">
            <div style="min-width:0">
              <p style="margin:0;font-size:0.8125rem;color:var(--dlc-on-surface-variant,#5b6472)">Good morning,</p>
              <h2 style="margin:0;font-size:1.375rem;line-height:1.2">Stephanie</h2>
            </div>
            <dlc-avatar initials="S" size="md" />
          </header>

          <main style="display:flex;flex:1 1 auto;min-height:0;flex-direction:column;gap:1rem;overflow:auto;padding:0.5rem 1.25rem 1.25rem">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
              <dlc-stats-card label="Meals this week" value="2" trend="up" trendLabel="+1 vs last week" />
              <dlc-stats-card label="Rides needed" value="1" trend="flat" trendLabel="unchanged" />
            </div>

            <section style="display:flex;flex-direction:column;gap:0.75rem;padding:1rem;border:1px solid var(--dlc-outline-variant,#c6ccd6);border-radius:var(--dlc-radius-lg,1rem)">
              <h3 style="margin:0;font-size:1rem">Meals for Stephanie</h3>
              <p style="margin:0;font-size:0.875rem;color:var(--dlc-on-surface-variant,#5b6472)">Just had surgery — dinners this week mean the world.</p>
              <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
                <dlc-chip>Loves tacos</dlc-chip>
                <dlc-chip>Porch drop-off</dlc-chip>
                <dlc-chip>3 days left</dlc-chip>
              </div>
              <div>
                <dlc-button variant="primary" size="sm">I’ve got this</dlc-button>
              </div>
            </section>
          </main>

          <dlc-bottom-nav [items]="items" activeId="home" />
        </div>
      </div>`,
  }),
};
