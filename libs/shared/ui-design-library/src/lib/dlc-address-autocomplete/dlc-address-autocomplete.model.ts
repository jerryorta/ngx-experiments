/**
 * Leaf-facing address-prediction view-model for `dlc-address-autocomplete`
 * (REX-510).
 *
 * Exists so the autocomplete leaf stays decoupled from the Google Places SDK:
 * the component renders ONLY this shape and never imports `google.maps.*`
 * types. REX-491 (the Places wiring story) maps SDK autocomplete results into
 * this view-model at the page/store boundary before handing them to the leaf —
 * keeping the leaf Storybook-testable with plain mocked fixtures.
 */
export interface DlcAddressPrediction {
  /** Stable prediction id — echoed on `predictionSelected` and used as the `@for` track key. */
  id: string;
  /** Primary display line, e.g. the street address (`450 Sutter Street`). */
  mainText: string;
  /** Secondary display line, e.g. city/state (`San Francisco, CA`). */
  secondaryText: string;
}
