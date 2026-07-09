import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

/**
 * Content-agnostic FRAME for the event-click overlay popup (ARCH-147).
 *
 * Mirrors nge-chart's tooltip CONTENT architecture: a small chrome shell
 * (surface, padding, shadow, close button) that simply projects whatever body
 * the shell decides on via `<ng-content/>` — either the default body
 * (`<nge-calendar-default-event-overlay>`) or a host-supplied template. It
 * knows NOTHING about the event payload; positioning is the shell's job via
 * `@angular/cdk/overlay` (NOT D3), so this component is pure presentation.
 *
 * Self-sufficient theming: every visual property reads a `--nge-calendar-*`
 * token with a literal fallback, so it renders un-themed and updates live when
 * the shell copies its inline theme props onto the CDK overlay pane.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[attr.aria-label]': 'ariaLabel()',
    class: 'nge-calendar-event-overlay',
    role: 'dialog',
  },
  selector: 'nge-calendar-event-overlay',
  standalone: true,
  styleUrl: './nge-calendar-event-overlay.component.scss',
  templateUrl: './nge-calendar-event-overlay.component.html',
})
export class NgeCalendarEventOverlayComponent {
  /** Accessible name for the dialog (reflected to `aria-label` on the host). */
  readonly ariaLabel = input<string>('Event details');

  /** Emitted when the user activates the close button. */
  readonly closed = output<void>();
}
