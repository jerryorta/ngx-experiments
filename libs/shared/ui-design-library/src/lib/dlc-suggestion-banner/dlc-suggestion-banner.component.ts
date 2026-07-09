import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { DlcButtonComponent } from '../dlc-button/dlc-button.component';
import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-suggestion-banner' },
  imports: [DlcButtonComponent, DlcIconDirective],
  selector: 'dlc-suggestion-banner',
  templateUrl: './dlc-suggestion-banner.component.html',
})
export class DlcSuggestionBannerComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly templateName = input.required<string>();

  readonly accept = output<void>();
  readonly dismiss = output<void>();
  readonly chooseAlternative = output<void>();
}
