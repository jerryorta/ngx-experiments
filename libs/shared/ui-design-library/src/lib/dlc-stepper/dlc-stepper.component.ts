import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

export type DlcStepState = 'active' | 'completed' | 'upcoming';

export interface DlcStep {
  label: string;
  state: DlcStepState;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-stepper',
  },
  imports: [DlcIconDirective],
  selector: 'dlc-stepper',
  styleUrl: './dlc-stepper.component.scss',
  templateUrl: './dlc-stepper.component.html',
})
export class DlcStepperComponent {
  readonly steps = input<DlcStep[]>([]);
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}
