import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-deleted-badge',
  },
  selector: 'dlc-deleted-badge',
  standalone: true,
  styleUrl: './dlc-deleted-badge.component.scss',
  templateUrl: './dlc-deleted-badge.component.html',
})
export class DlcDeletedBadgeComponent {
  readonly daysRemaining = input<null | number>(null);
}
