import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import type { DlcPropertyPreviewCardData } from './dlc-property-preview-card.model';

import { DlcButtonComponent } from '../dlc-button/dlc-button.component';
import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

const USD_WHOLE = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  style: 'currency',
});

/**
 * Compact property preview card (REX-509) — the map view's marker-click
 * popup content, ported as information design from the legacy
 * `property-marker-overlay` (photo, price, beds/baths/sqft, address,
 * close + see-details).
 *
 * Purely presentational: renders `property` and emits intents. REX-507's
 * overlay host owns positioning, show/hide lifecycle, and data lookup —
 * never this leaf.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-property-preview-card',
  },
  imports: [DlcButtonComponent, DlcIconDirective],
  selector: 'dlc-property-preview-card',
  styleUrl: './dlc-property-preview-card.component.scss',
  templateUrl: './dlc-property-preview-card.component.html',
})
export class DlcPropertyPreviewCardComponent {
  /** Close-affordance intent — the overlay host dismisses the preview. */
  readonly closed = output<void>();
  readonly property = input.required<DlcPropertyPreviewCardData>();
  /** See-details intent — emits the listing id so the host can route directly. */
  readonly seeDetails = output<string>();

  readonly formattedPrice = computed(() => USD_WHOLE.format(this.property().price));

  /** `2,640 sqft` — `null` (hidden) when the listing declares no living area. */
  readonly formattedSqft = computed((): null | string => {
    const sqft = this.property().sqft;
    return sqft === null ? null : `${Math.round(sqft).toLocaleString('en-US')} sqft`;
  });

  readonly hasSpecs = computed(() => {
    const p = this.property();
    return p.beds !== null || p.baths !== null || p.sqft !== null;
  });

  protected onClose(): void {
    this.closed.emit();
  }

  protected onSeeDetails(): void {
    this.seeDetails.emit(this.property().id);
  }
}
