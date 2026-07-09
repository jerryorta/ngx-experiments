import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

export type DlcProgressBarMode = 'determinate' | 'indeterminate';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuemax]': '100',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuenow]': 'mode() === "determinate" ? value() : null',
    '[class.dlc-progress-bar--indeterminate]': 'mode() === "indeterminate"',
    class: 'dlc-progress-bar',
    role: 'progressbar',
  },
  imports: [],
  selector: 'dlc-progress-bar',
  styleUrl: './dlc-progress-bar.component.scss',
  templateUrl: './dlc-progress-bar.component.html',
})
export class DlcProgressBarComponent {
  readonly label = input<null | string>(null);
  readonly mode = input<DlcProgressBarMode>('determinate');
  readonly value = input(0);
}
