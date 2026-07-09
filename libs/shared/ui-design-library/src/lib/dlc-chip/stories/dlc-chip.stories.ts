import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcChipComponent } from '../dlc-chip.component';
import { DlcChipStoriesComponent } from './dlc-chip-stories.component';

const INTENTS = ['neutral', 'info', 'success', 'warning', 'danger', 'discovery'] as const;
const LABEL_FOR_INTENT: Record<(typeof INTENTS)[number], string> = {
  danger: 'Rejected',
  discovery: 'Experimental',
  info: 'Renamed',
  neutral: 'Draft',
  success: 'Accepted',
  warning: 'Pending',
};

const meta: Meta<DlcChipStoriesComponent> = {
  argTypes: {
    intent: {
      control: { type: 'select' },
      options: [...INTENTS],
    },
    label: { control: 'text' },
  },
  component: DlcChipStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Chip',
};

export default meta;
type Story = StoryObj<DlcChipStoriesComponent>;

/**
 * Single chip driven by `intent` + `label` controls. Switch the surrounding
 * theme via the Storybook toolbar (`Theme` paint-brush) — the chip recolors
 * because the per-intent CSS variables are defined per theme.
 */
export const Chip: Story = {
  args: {
    intent: 'warning',
    label: 'Pending',
  },
  name: 'Chip',
};

const intentRowTemplate = `
  <div style="display:flex;flex-direction:column;gap:0.75rem;align-items:flex-start">
    <dlc-chip intent="neutral">${LABEL_FOR_INTENT.neutral}</dlc-chip>
    <dlc-chip intent="info">${LABEL_FOR_INTENT.info}</dlc-chip>
    <dlc-chip intent="success">${LABEL_FOR_INTENT.success}</dlc-chip>
    <dlc-chip intent="warning">${LABEL_FOR_INTENT.warning}</dlc-chip>
    <dlc-chip intent="danger">${LABEL_FOR_INTENT.danger}</dlc-chip>
    <dlc-chip intent="discovery">${LABEL_FOR_INTENT.discovery}</dlc-chip>
  </div>
`;

const themePanel = (cssClass: string, label: string) => `
  <div class="${cssClass}" style="padding:1.5rem;background:var(--dlc-surface);min-height:18rem">
    <p style="margin:0 0 1rem;color:var(--dlc-on-surface);font-family:var(--dlc-font-family-display,system-ui);font-weight:600;font-size:0.875rem">${label}</p>
    ${intentRowTemplate}
  </div>
`;

/**
 * Removable active-filter chips. Each chip renders a trailing × control that
 * emits `removed` on click (propagation stopped, so it never triggers a parent
 * click). Used by REX-473's active-filter row.
 */
export const Removable: Story = {
  decorators: [moduleMetadata({ imports: [DlcChipComponent] })],
  render: () => ({
    template: `
      <div style="padding:2rem;background:var(--dlc-surface)">
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center">
          <dlc-chip intent="info" [removable]="true">For Sale</dlc-chip>
          <dlc-chip intent="success" [removable]="true">3+ beds</dlc-chip>
          <dlc-chip intent="warning" [removable]="true">Under $500k</dlc-chip>
          <dlc-chip intent="neutral" [removable]="true">Single Family</dlc-chip>
        </div>
      </div>
    `,
  }),
};

/** Every intent rendered against the active workspace theme (toolbar-driven). */
export const IntentShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcChipComponent] })],
  name: 'Intent Showcase',
  render: () => ({
    template: `
      <div style="padding:2rem;background:var(--dlc-surface)">
        ${intentRowTemplate}
      </div>
    `,
  }),
};

/**
 * All six concierge themes side-by-side so contrast can be reviewed at a
 * glance — three personas (Professional / Home / Service Provider) × two
 * modes (Light / Dark). Each panel is locally scoped via its theme class.
 */
export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcChipComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0">
        ${themePanel('dlc-professional-light', 'Professional · Light')}
        ${themePanel('dlc-professional-dark', 'Professional · Dark')}
        ${themePanel('dlc-home-light', 'Home · Light')}
        ${themePanel('dlc-home-dark', 'Home · Dark')}
        ${themePanel('dlc-service-provider-light', 'Service Provider · Light')}
        ${themePanel('dlc-service-provider-dark', 'Service Provider · Dark')}
      </div>
    `,
  }),
};
