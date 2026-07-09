import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

/**
 * Semantic intent values for the chip. Drives the bg / fg / outline colors via
 * theme tokens so consumers don't pick raw color shades and end up with
 * low-contrast pairings.
 *
 * - `neutral`    — default, low emphasis
 * - `info`       — informational, calm attention
 * - `success`    — positive outcome / accepted state
 * - `warning`    — caution / pending / requires attention
 * - `danger`     — error / rejected / destructive
 * - `discovery`  — new / experimental / novel
 */
export type DlcChipIntent = 'danger' | 'discovery' | 'info' | 'neutral' | 'success' | 'warning';

/**
 * Themable text-chip primitive. Pure visual — caller projects the label
 * content via `<ng-content>`. Use the `intent` input to pick a semantic color
 * pairing. Layout / typography / sizing come from Tailwind utility classes on
 * the host; color values come from theme tokens defined per-theme at
 * `libs/concierge/themes/src/lib/styles/_dlc-chip-tokens.scss`.
 *
 * Set `removable` to render a trailing remove control (×) — used for
 * active-filter chips the user can clear. The control emits `removed` on click
 * (propagation stopped, so a click on the × never bubbles to a parent click on
 * the chip itself). When `removable` is false nothing extra renders.
 *
 * Caller examples:
 *   <dlc-chip intent="warning">Pending</dlc-chip>
 *   <dlc-chip intent="success">Accepted</dlc-chip>
 *   <dlc-chip intent="danger">Rejected</dlc-chip>
 *   <dlc-chip intent="neutral"><code>some_uri</code></dlc-chip>
 *   <dlc-chip intent="info" [removable]="true" (removed)="clearFilter()">Sold</dlc-chip>
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.dlc-chip--danger]': 'intent() === "danger"',
    '[class.dlc-chip--discovery]': 'intent() === "discovery"',
    '[class.dlc-chip--info]': 'intent() === "info"',
    '[class.dlc-chip--neutral]': 'intent() === "neutral"',
    '[class.dlc-chip--success]': 'intent() === "success"',
    '[class.dlc-chip--warning]': 'intent() === "warning"',
    // Base host classes — layout / typography / sizing in Tailwind; the
    // background / foreground / ring read from theme-driven CSS variables.
    class:
      'dlc-chip inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--dlc-chip-bg)] text-[var(--dlc-chip-fg)] ring-1 ring-inset ring-[var(--dlc-chip-ring)]',
  },
  imports: [DlcIconDirective],
  selector: 'dlc-chip',
  styleUrl: './dlc-chip.component.scss',
  templateUrl: './dlc-chip.component.html',
})
export class DlcChipComponent {
  readonly intent = input<DlcChipIntent>('neutral');

  /** When `true`, renders a trailing remove (×) control after the content. */
  readonly removable = input(false);

  /** Fires when the remove control is clicked. Caller decides what to clear. */
  readonly removed = output<void>();

  /**
   * Handles the remove-control click: stops propagation so a click on the ×
   * never triggers a parent click bound to the chip, then notifies the caller.
   */
  onRemove(event: Event): void {
    event.stopPropagation();
    this.removed.emit();
  }
}
