import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcBillingToggleValue } from '../dlc-billing-toggle.component';

import { DlcBillingToggleComponent } from '../dlc-billing-toggle.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-billing-toggle-stories' },
  imports: [DlcBillingToggleComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-billing-toggle-stories',
  standalone: true,
  styleUrl: './dlc-billing-toggle-stories.component.scss',
  templateUrl: './dlc-billing-toggle-stories.component.html',
})
export class DlcBillingToggleStoriesComponent {
  readonly valueSig: WritableSignal<DlcBillingToggleValue> = signal('monthly');
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-billing-toggle/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/926243577450245138';

  @Input() set value(v: DlcBillingToggleValue) {
    this.valueSig.set(v);
  }
}
