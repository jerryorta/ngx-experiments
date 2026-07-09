import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.dlc-fab--hidden]': '!visible()',
    class: 'dlc-fab',
  },
  imports: [DlcIconDirective],
  selector: 'dlc-fab',
  styleUrl: './dlc-fab.component.scss',
  templateUrl: './dlc-fab.component.html',
})
export class DlcFabComponent {
  readonly ariaLabel = input<string>('Action');
  readonly icon = input<string>('add');
  readonly visible = input(true);

  readonly fabClick = output<void>();
}
