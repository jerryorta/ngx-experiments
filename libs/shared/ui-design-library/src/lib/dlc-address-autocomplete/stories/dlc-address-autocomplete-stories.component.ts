import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcAddressPrediction } from '../dlc-address-autocomplete.model';

import { DlcAddressAutocompleteComponent } from '../dlc-address-autocomplete.component';

/**
 * REX-510 — mocked Google Places predictions. The leaf renders ONLY this
 * view-model shape (never `google.maps.*`), so Storybook drives it with plain
 * fixtures and no live Places call. The real lookup is wired in REX-491.
 */
export const STORY_PREDICTIONS: DlcAddressPrediction[] = [
  { id: 'place-1', mainText: '450 Sutter Street', secondaryText: 'San Francisco, CA' },
  { id: 'place-2', mainText: '451 Lexington Avenue', secondaryText: 'New York, NY' },
  { id: 'place-3', mainText: '4501 N Lamar Boulevard', secondaryText: 'Austin, TX' },
  { id: 'place-4', mainText: '45 Rockefeller Plaza', secondaryText: 'New York, NY' },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-address-autocomplete-stories' },
  imports: [DlcAddressAutocompleteComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-address-autocomplete-stories',
  standalone: true,
  styleUrl: './dlc-address-autocomplete-stories.component.scss',
  templateUrl: './dlc-address-autocomplete-stories.component.html',
})
export class DlcAddressAutocompleteStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-address-autocomplete/stories';

  /** Mocked predictions fed to the "populated" + theme-showcase instances. */
  readonly predictions = STORY_PREDICTIONS;

  /** Pre-filled text reflected into the input WITHOUT emitting `queryChange`. */
  readonly prefilledValue = '1600 Pennsylvania Avenue NW, Washington, DC';

  /** Drives the empty-results row: length ≥ 3 + no predictions + not loading. */
  readonly noMatchValue = '123 Nowhere Lane';

  /** Intent log — proves the leaf emits "intents out" (the host wiring is REX-491). */
  readonly lastIntent = signal('none yet');

  onQueryChange(query: string): void {
    this.lastIntent.set(`queryChange → "${query}"`);
  }

  onPredictionSelected(prediction: DlcAddressPrediction): void {
    this.lastIntent.set(`predictionSelected → ${prediction.mainText} (${prediction.id})`);
  }

  onCleared(): void {
    this.lastIntent.set('cleared');
  }
}
