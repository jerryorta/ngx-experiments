import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

export type DlcBadgeVariant = 'accent' | 'error' | 'surface';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.dlc-badge--accent]': 'variant() === "accent"',
    '[class.dlc-badge--error]': 'variant() === "error"',
    '[class.dlc-badge--hidden]': '!visible()',
    '[class.dlc-badge--surface]': 'variant() === "surface"',
    class: 'dlc-badge',
  },
  imports: [],
  selector: 'dlc-badge',
  styleUrl: './dlc-badge.component.scss',
  templateUrl: './dlc-badge.component.html',
})
export class DlcBadgeComponent {
  readonly count = input<null | number>(null);
  readonly variant = input<DlcBadgeVariant>('error');
  readonly visible = input(true);

  readonly displayCount = computed(() => {
    const n = this.count();
    if (n === null) return null;
    return n > 99 ? '99+' : String(n);
  });
}
