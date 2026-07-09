import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

export type DlcAvatarSize = 'lg' | 'md' | 'sm';
export type DlcAvatarStatus = 'busy' | 'offline' | 'online' | null;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.dlc-avatar--lg]': 'size() === "lg"',
    '[class.dlc-avatar--md]': 'size() === "md"',
    '[class.dlc-avatar--sm]': 'size() === "sm"',
    class: 'dlc-avatar',
  },
  imports: [],
  selector: 'dlc-avatar',
  styleUrl: './dlc-avatar.component.scss',
  templateUrl: './dlc-avatar.component.html',
})
export class DlcAvatarComponent {
  readonly imageUrl = input<null | string>(null);
  readonly initials = input('');
  readonly size = input<DlcAvatarSize>('md');
  readonly status = input<DlcAvatarStatus>(null);
}
