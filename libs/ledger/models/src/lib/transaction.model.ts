/**
 * A single posted or pending ledger entry against an account.
 *
 * **Sign convention (drives every aggregation in `@nge/ledger-utils`):**
 * `amountCents` is signed — negative is money leaving the account (an
 * expense/outflow), positive is money arriving (income/inflow). There is no
 * separate transaction "type" field; the sign of `amountCents` IS the type.
 * `spendingByCategory`, `cashflow`, `budgetVsActual`, and `netWorthSeries`
 * all key off this convention.
 */
export interface Transaction {
  accountId: string;
  /** Signed integer minor units (cents). Negative = outflow/expense, positive = inflow/income. */
  amountCents: number;
  categoryId: string;
  /** ISO `'YYYY-MM-DD'` — matches `nge-date-picker`'s CVA value format. */
  date: string;
  id: string;
  /**
   * Display text for the transaction — a merchant name (`'Trader Joe's'`)
   * or a free-form description for non-merchant entries (`'Paycheck'`,
   * `'Transfer to Savings'`).
   */
  merchant: string;
  /** Free-form user-entered note, distinct from `merchant`. */
  notes?: string;
  /** True while the transaction has posted at the institution but not yet cleared. */
  pending?: boolean;
}
