/** The kinds of financial accounts the ledger tracks. */
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash';

/**
 * A financial account — bank, card, brokerage, or cash — behind the account
 * cards on Overview and the account picker on Transactions/Budgets.
 */
export interface Account {
  /**
   * Current balance, integer minor units (cents), signed: a `credit`
   * account's balance is negative while money is owed on it.
   */
  balanceCents: number;
  /** ISO 4217 currency code for `balanceCents`. This demo defaults every account to `'USD'`. */
  currency: string;
  id: string;
  /** Bank/brokerage display name, e.g. `'Chase'`. */
  institution: string;
  /** Last 4 digits of the account/card number, for a `'•••• 4412'`-style label. */
  last4?: string;
  name: string;
  type: AccountType;
}
