import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { DlcIconDirective } from '@nge/ui-design-library';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-empty-state' },
  imports: [DlcIconDirective],
  selector: 'ldg-empty-state',
  styleUrl: './ldg-empty-state.component.scss',
  templateUrl: './ldg-empty-state.component.html',
})
export class LdgEmptyStateComponent {
  readonly icon = input<string>();
  readonly heading = input.required<string>();
  readonly message = input<string>();
}
