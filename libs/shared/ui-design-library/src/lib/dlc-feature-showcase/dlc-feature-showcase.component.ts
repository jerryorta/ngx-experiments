import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

/**
 * Frame chrome drawn around the screenshot.
 * - `browser` — a desktop-browser window (traffic-light dots + faux address bar); the default for
 *   web-app feature captures such as the broker dashboard or CRM.
 * - `device` — a rounded hand-held frame (top speaker notch + bottom home indicator) for client /
 *   mobile surfaces such as the client portal.
 * - `none` — the bare screenshot in a rounded surface, no chrome.
 */
export type DlcFeatureShowcaseFrame = 'browser' | 'device' | 'none';

/**
 * Presents a single product screenshot inside an optional browser/device frame with a caption —
 * the reusable unit the public marketing pages (REX-583/584/585/586) compose into their feature
 * showcase sections. Purely presentational: the image URL, caption text, and frame style all come
 * in via inputs, so the same primitive frames a broker dashboard, a client portal, or any future
 * capture. Placeholder art is swapped for real seeded screenshots without touching consumers.
 *
 * Built for the forced `dlc-professional-dark` marketing theme: tonal elevation via `--dlc-surface-*`
 * tiers (no shadows / no 1px borders / no pill shapes, per the marketing design constraints).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-feature-showcase' },
  selector: 'dlc-feature-showcase',
  styleUrl: './dlc-feature-showcase.component.scss',
  templateUrl: './dlc-feature-showcase.component.html',
})
export class DlcFeatureShowcaseComponent {
  /** Screenshot URL (e.g. `/marketing/broker-dashboard.svg`). Required — a showcase without art is meaningless. */
  readonly src = input.required<string>();
  /** Accessible description of the screenshot. Always set a meaningful value for informative captures. */
  readonly alt = input('');
  /** Frame chrome drawn around the screenshot. */
  readonly frame = input<DlcFeatureShowcaseFrame>('browser');
  /** Faux address shown in the browser chrome's address bar (e.g. `app/dashboard`). Browser frame only. */
  readonly url = input<null | string>(null);
  /** Small accent label rendered above the caption (e.g. a feature category). */
  readonly eyebrow = input<null | string>(null);
  /** Descriptive caption rendered beneath the frame. */
  readonly caption = input<null | string>(null);
  /** Native `<img>` loading strategy. Default `lazy`; use `eager` for an above-the-fold hero. */
  readonly loading = input<'eager' | 'lazy'>('lazy');
}
