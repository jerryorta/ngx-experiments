import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * `<nge-cell-shell>` — the cheap thing a cell shows while the scroll is moving.
 *
 * The other half of {@link NgeCellContext.isSettled} (ARCH-291): the table hands a
 * template the fact that the scroll is busy, and this is what that template draws
 * instead of the expensive content.
 *
 * ```html
 * <ng-template ngeCell="series" [ngeCellOf]="rows" let-cell>
 *   @if (cell.isSettled()) { <nge-chart [config]="chartFor(cell.row)" /> }
 *   @else { <nge-cell-shell /> }
 * </ng-template>
 * ```
 *
 * **It belongs to the table rather than to charts**, and that placement is the
 * decision worth keeping. If the charts library owned the skeleton then images,
 * maps and third-party widgets would each need their own equivalent, and a story
 * wanting one would wait on another library's release. The table hands the signal;
 * the template branches; what it branches *to* is deliberately generic.
 *
 * ⚠️ **It does not animate, and that is the point rather than an omission.** A
 * shimmer is a per-frame paint on every node in the window, requested at exactly
 * the moment the frame budget is tightest — it would cost most where it is least
 * affordable. Worse, virtualization recreates the cell on every window slide, so an
 * animation would restart per slide and read as a strobe rather than as progress:
 * the same reason a chart in a cell sets `animationMs: 0`. A flat block is honest
 * about the one thing it has to say, which is "something is here".
 *
 * **It holds no state**, so it survives DOM recycling for free — the node showing
 * row 12 is the node that showed row 4 a moment ago, and there is nothing on it to
 * be stale.
 *
 * ⚠️ **Hidden from assistive technology.** It is a visual stand-in for content that
 * has not been drawn yet, and announcing a placeholder would be noise; the real
 * content is what a screen reader should meet. In practice it always will — the
 * flag is settled whenever the viewport is quiet, which is the state a table being
 * read is in.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    'aria-hidden': 'true',
    class: 'nge-cell-shell',
  },
  selector: 'nge-cell-shell',
  styleUrl: './nge-cell-shell.component.scss',
  templateUrl: './nge-cell-shell.component.html',
})
export class NgeCellShellComponent {}
