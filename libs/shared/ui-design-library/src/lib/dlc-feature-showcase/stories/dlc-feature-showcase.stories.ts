import { type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcFeatureShowcaseComponent } from '../dlc-feature-showcase.component';

/**
 * Self-contained placeholder screenshot (inline data-URI SVG) so the stories render in Storybook
 * isolation without depending on the concierge app's `/marketing/*` static assets.
 */
const shot = (title: string, w = 1600, h = 1000): string =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
      `<rect width="${w}" height="${h}" fill="#0a1e2b"/>` +
      `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="#17415a" stroke-width="2"/>` +
      `<text x="50%" y="47%" fill="#e8f4fc" font-family="sans-serif" font-size="46" font-weight="600" text-anchor="middle">${title}</text>` +
      `<text x="50%" y="56%" fill="#8bafc5" font-family="sans-serif" font-size="28" text-anchor="middle">seeded prototype data · placeholder</text>` +
      `</svg>`
  );

const meta: Meta<DlcFeatureShowcaseComponent> = {
  component: DlcFeatureShowcaseComponent,
  decorators: [moduleMetadata({ imports: [DlcFeatureShowcaseComponent] })],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Feature Showcase',
};

export default meta;
type Story = StoryObj<DlcFeatureShowcaseComponent>;

export const Browser: Story = {
  name: 'Browser frame',
  render: () => ({
    props: { src: shot('Broker Command Dashboard') },
    template: `
      <div class="dlc-professional-dark" style="padding:2.5rem;background:var(--dlc-surface-container-lowest);max-width:760px">
        <dlc-feature-showcase
          [src]="src"
          alt="Broker Command Dashboard showing seeded listing, pipeline and task metrics"
          url="app/dashboard"
          eyebrow="Command center"
          caption="Broker Command Dashboard — every metric real, from seeded prototype data"
          frame="browser" />
      </div>`,
  }),
};

export const Device: Story = {
  name: 'Device frame',
  render: () => ({
    props: { src: shot('Client Portal', 900, 1600) },
    template: `
      <div class="dlc-professional-dark" style="padding:2.5rem;background:var(--dlc-surface-container-lowest);max-width:360px">
        <dlc-feature-showcase
          [src]="src"
          alt="Client portal showing a delivered CMA"
          eyebrow="For your clients"
          caption="Client Portal — receive and review a CMA"
          frame="device" />
      </div>`,
  }),
};

export const Gallery: Story = {
  name: 'Marketing gallery (dark)',
  render: () => ({
    props: {
      circle: shot('Collaboration Circle'),
      cma: shot('CMA Tool'),
      crm: shot('Integrated CRM'),
      dashboard: shot('Broker Command Dashboard'),
    },
    template: `
      <div class="dlc-professional-dark" style="padding:3rem;background:var(--dlc-surface-container-lowest)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;max-width:1100px;margin:0 auto">
          <dlc-feature-showcase [src]="dashboard" alt="Broker Command Dashboard" url="app/dashboard"
            eyebrow="Command center" caption="Broker Command Dashboard" frame="browser" />
          <dlc-feature-showcase [src]="circle" alt="Collaboration Circle workspace" url="app/circles"
            eyebrow="The differentiator" caption="Collaboration Circle — real-time sync" frame="browser" />
          <dlc-feature-showcase [src]="cma" alt="CMA tool" url="app/tools/cma"
            eyebrow="Data-driven" caption="Comparable analysis" frame="browser" />
          <dlc-feature-showcase [src]="crm" alt="Integrated CRM" url="app/crm"
            eyebrow="Stay organized" caption="Integrated CRM" frame="browser" />
        </div>
      </div>`,
  }),
};
