import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { DlcIconDirective } from '@nge/ui-design-library';

export type LdgIconButtonVariant = 'ghost' | 'solid';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.ldg-icon-button--ghost]': 'variant() === "ghost"',
    '[class.ldg-icon-button--solid]': 'variant() === "solid"',
    class: 'ldg-icon-button',
  },
  imports: [DlcIconDirective],
  selector: 'ldg-icon-button',
  styleUrl: './ldg-icon-button.component.scss',
  templateUrl: './ldg-icon-button.component.html',
})
export class LdgIconButtonComponent {
  readonly icon = input.required<string>();
  readonly ariaLabel = input.required<string>();
  readonly variant = input<LdgIconButtonVariant>('ghost');
  readonly disabled = input(false);

  readonly pressed = output<void>();
}
