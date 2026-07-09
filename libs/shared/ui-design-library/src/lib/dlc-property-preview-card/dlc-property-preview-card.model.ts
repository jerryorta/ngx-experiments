/**
 * Pure data contract for the `dlc-property-preview-card` leaf (REX-509).
 *
 * REX-507's overlay host maps a selected map marker / search result to this
 * shape before handing it to the card — the leaf itself stays store-,
 * overlay-, and positioning-unaware (data in, intents out).
 */
export interface DlcPropertyPreviewCardData {
  /** Street line, e.g. `4821 Elmwood Terrace`. */
  addressLine1: string;
  /** Optional locality line, e.g. `Austin, TX 78745`. Hidden when absent. */
  addressLine2?: null | string;
  baths: null | number;
  beds: null | number;
  /** Listing id — echoed on `seeDetails` so the host can route without a lookup. */
  id: string;
  /** Primary photo URL; `null` renders the graceful no-photo fallback. */
  photoUrl: null | string;
  /** Current list price in whole USD. */
  price: number;
  /** Living area in square feet. */
  sqft: null | number;
}
