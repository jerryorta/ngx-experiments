import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

import type { DlcChipIntent } from '../dlc-chip.component';

import { DlcChipComponent } from '../dlc-chip.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [DlcChipComponent],
  selector: 'dlc-chip-stories',
  styleUrl: './dlc-chip-stories.component.scss',
  templateUrl: './dlc-chip-stories.component.html',
})
export class DlcChipStoriesComponent {
  readonly intent = input<DlcChipIntent>('warning');
  readonly label = input<string>('Pending');
}
