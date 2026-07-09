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
  host: { class: 'dlc-search-input' },
  imports: [DlcIconDirective],
  selector: 'dlc-search-input',
  styleUrl: './dlc-search-input.component.scss',
  templateUrl: './dlc-search-input.component.html',
})
export class DlcSearchInputComponent {
  readonly value = input('');
  readonly placeholder = input('Search...');

  readonly queryChange = output<string>();
  readonly micClick = output<void>();

  onInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }

  onMicClick(): void {
    this.micClick.emit();
  }
}
