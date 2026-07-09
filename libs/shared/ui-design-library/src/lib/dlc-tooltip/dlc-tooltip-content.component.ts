import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-tooltip-content' },
  imports: [],
  standalone: true,
  styleUrl: './dlc-tooltip-content.component.scss',
  templateUrl: './dlc-tooltip-content.component.html',
})
export class DlcTooltipContentComponent {
  readonly text = input('');
}
