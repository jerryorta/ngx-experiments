import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

/**
 * REX-501 — Generic analytics-dashboard card shell.
 *
 * Presentational primitive used by `dlc-property-analytics-dashboard` (and
 * any future analytics surface, e.g. REX-502 insights sidebar) to wrap one
 * metric's chart, headline, and the short explainer the legacy real-estate
 * dashboard standardised on.
 *
 * Layout: header band (`label` title + optional `headline` value + optional
 * accent dot) over a body slot the consumer fills with a chart or stat block,
 * then a one-line `explainer` foot. All slots use `--dlc-*` tokens; no shadows,
 * no 1px borders, no pill shapes — tonal elevation via surface color shift
 * only (matches `dlc-stats-card`).
 *
 * Pure inputs — no store / facade / service dependency. The accent color is
 * passed in as a CSS value (intentionally not enum-typed) so consumers can
 * thread `CG_ANALYTICS_COLORS` through directly without an extra mapping.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-analytics-card' },
  selector: 'dlc-analytics-card',
  styleUrl: './dlc-analytics-card.component.scss',
  templateUrl: './dlc-analytics-card.component.html',
})
export class DlcAnalyticsCardComponent {
  /**
   * Optional accent color for the headline / classification dot — pass a
   * `CG_ANALYTICS_COLORS` literal (e.g. `'#4caf50'`) or any CSS color. The
   * card never invents its own color — the consumer owns the semantics.
   */
  readonly accentColor = input<null | string>(null);

  /** One-line explainer rendered below the body. Use to describe what the metric means. */
  readonly explainer = input<null | string>(null);

  /**
   * Optional headline string above the body (e.g. `"Seller's Market"`,
   * `"+12.4%"`). Skip when the body itself is the headline.
   */
  readonly headline = input<null | string>(null);

  /** Card title — top of the header band. */
  readonly label = input('');
}
