import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

export type DlcStatsCardTrend = 'down' | 'flat' | 'up';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-stats-card' },
  imports: [DlcIconDirective, RouterModule],
  selector: 'dlc-stats-card',
  styleUrl: './dlc-stats-card.component.scss',
  templateUrl: './dlc-stats-card.component.html',
})
export class DlcStatsCardComponent {
  readonly label = input('');
  readonly routerLink = input<null | string[]>(null);
  readonly trend = input<DlcStatsCardTrend>('flat');
  readonly trendLabel = input<null | string>(null);
  readonly value = input('');
}
