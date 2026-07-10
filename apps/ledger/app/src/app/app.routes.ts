import { Route } from '@angular/router';

/**
 * The three Ledger screens, lazy-loaded per navigation from `@nge/ledger-ui`.
 * Each screen self-provides its component-scoped SignalStore, so routing to it
 * is the only wiring needed — domain data comes from the root `LedgerFacade`
 * (loaded once in `AppComponent`).
 */
export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  {
    path: 'overview',
    title: 'Overview · Ledger',
    loadComponent: () => import('@nge/ledger-ui').then(m => m.LdgOverviewComponent),
  },
  {
    path: 'transactions',
    title: 'Transactions · Ledger',
    loadComponent: () => import('@nge/ledger-ui').then(m => m.LdgTransactionsComponent),
  },
  {
    path: 'budgets',
    title: 'Budgets · Ledger',
    loadComponent: () => import('@nge/ledger-ui').then(m => m.LdgBudgetsComponent),
  },
  { path: '**', redirectTo: 'overview' },
];
