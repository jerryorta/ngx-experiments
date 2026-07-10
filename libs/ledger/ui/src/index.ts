// @nge/ledger-ui — the three Ledger screens (Overview, Transactions, Budgets),
// each a thin component paired with its colocated component-scoped
// @ngrx/signals SignalStore. Screens read domain data via `LedgerFacade` and
// own all local UI state in their store (`providers: [<Screen>Store]`, never
// root). Wired into the app shell + routing in Wave 4.
export * from './lib/overview/overview.store';
export * from './lib/overview/ldg-overview.component';
export * from './lib/transactions/transactions.store';
export * from './lib/transactions/ldg-transactions.component';
export * from './lib/budgets/budgets.store';
export * from './lib/budgets/ldg-budgets.component';
