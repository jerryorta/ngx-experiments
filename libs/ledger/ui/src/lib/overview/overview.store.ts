import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';

import type { NgeChartConfig, NgeGroupedBarDataPoint, NgeLineDataPoint } from '@nge/charts';
import type { LdgDonutSegment } from '@nge/ledger-design-library';
import type { DlcStatsCardTrend } from '@nge/ui-design-library';

import { createGroupedBarChartConfig, createLineChartConfig } from '@nge/charts';
import { LedgerFacade } from '@nge/ledger-store';
import { formatMoney } from '@nge/ledger-utils';

/** How far back the net-worth trend chart looks. */
export type OverviewTrendRange = '3m' | '6m' | 'all';

/** One KPI tile's fully-derived display shape — maps 1:1 onto `dlc-stats-card` inputs. */
export interface OverviewKpi {
  label: string;
  trend: DlcStatsCardTrend;
  trendLabel: string | null;
  value: string;
}

/** One row of the Overview screen's "Recent Transactions" table. */
export interface OverviewTransactionRow {
  amountCents: number;
  categoryName: string;
  /** Pre-formatted for display, e.g. `'Jul 15'` — see {@link formatShortDate}. */
  date: string;
  id: string;
  merchant: string;
}

interface OverviewState {
  trendRange: OverviewTrendRange;
}

const initialOverviewState: OverviewState = {
  trendRange: '6m',
};

/**
 * The demo's fixed "current month" for the budget-vs-actual chart — mirrors
 * `LedgerFacade`'s own default budget month (the seed's most recent complete
 * month; see `docs/demos/ledger-build-plan.md`). Passed explicitly rather
 * than relying on the facade's default so the dependency is visible here.
 */
const OVERVIEW_BUDGET_MONTH = '2026-07';

/** How many most-recent transactions the "Recent Transactions" table shows. */
const RECENT_TRANSACTIONS_LIMIT = 8;

const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Component-scoped Overview SignalStore. Provide it on `LdgOverviewComponent`
 * (`providers: [OverviewStore]`) — NEVER `providedIn: 'root'`. Owns the
 * net-worth trend-range toggle (this screen's only local UI state) and builds
 * every `@nge/charts` config + KPI tile from `LedgerFacade` data, so the
 * component itself stays pure template glue.
 */
export const OverviewStore = signalStore(
  withState(initialOverviewState),

  // Captures the ONE `budgetVsActual` subscription this screen needs — the
  // facade's own docs warn each call opens a fresh subscription, so this must
  // live here (evaluated once, at store construction) rather than inside a
  // computed, which would re-call it on every recompute.
  withProps(() => ({
    _bva: inject(LedgerFacade).budgetVsActual(OVERVIEW_BUDGET_MONTH),
  })),

  withComputed((store, facade = inject(LedgerFacade)) => {
    // Net-worth points narrowed to the active `trendRange`. Not returned on
    // the store — only `netWorthChartConfig` needs it.
    const netWorthPoints = computed(() => {
      const points = facade.netWorthSeries();
      const range = store.trendRange();
      if (range === 'all' || points.length === 0) return points;
      const months = range === '3m' ? 3 : 6;
      const cutoff = isoDateMonthsBefore(points[points.length - 1].date, months);
      return points.filter(point => point.date >= cutoff);
    });

    return {
      // -----------------------------------------------------------------
      // KPI tiles
      // -----------------------------------------------------------------

      /** Latest tracked net worth, trending on its all-time change. */
      netWorthKpi: computed<OverviewKpi>(() => {
        const points = facade.netWorthSeries();
        if (points.length === 0) {
          return { label: 'Net Worth', trend: 'flat', trendLabel: null, value: formatMoney(0) };
        }
        const latest = points[points.length - 1].valueCents;
        const delta = latest - points[0].valueCents;
        return {
          label: 'Net Worth',
          trend: trendFromDelta(delta),
          trendLabel: points.length > 1 ? `${formatSignedDelta(delta)} all-time` : null,
          value: formatMoney(latest),
        };
      }),

      /** Sum of every account balance — a point-in-time snapshot, so trend is always 'flat'. */
      totalBalanceKpi: computed<OverviewKpi>(() => {
        const accounts = facade.accounts();
        const total = accounts.reduce((sum, account) => sum + account.balanceCents, 0);
        return {
          label: 'Total Balance',
          trend: 'flat',
          trendLabel: accounts.length ? `${accounts.length} account${accounts.length === 1 ? '' : 's'}` : null,
          value: formatMoney(total),
        };
      }),

      /** This month's spending (an outflow, shown negative per the app-wide signed-cents convention). */
      monthSpendingKpi: computed<OverviewKpi>(() => {
        const periods = facade.cashflow();
        if (periods.length === 0) {
          return { label: 'This Month Spending', trend: 'flat', trendLabel: null, value: formatMoney(0) };
        }
        const current = periods[periods.length - 1];
        const previous = periods.length > 1 ? periods[periods.length - 2] : null;
        // Trend is computed on this SAME displayed (negative) value, not the
        // raw positive outflow magnitude — so "up/down" always matches the
        // number shown, rather than an inverted "more spending = down" call.
        const currentSpend = -current.outflowCents;
        const previousSpend = previous ? -previous.outflowCents : null;
        const delta = previousSpend !== null ? currentSpend - previousSpend : 0;
        return {
          label: 'This Month Spending',
          trend: trendFromDelta(delta),
          trendLabel: previousSpend !== null ? `${formatSignedDelta(delta)} vs last month` : null,
          value: formatMoney(currentSpend),
        };
      }),

      /** This month's net cashflow (inflow minus outflow), trending against last month. */
      monthNetCashflowKpi: computed<OverviewKpi>(() => {
        const periods = facade.cashflow();
        if (periods.length === 0) {
          return { label: 'This Month Net Cashflow', trend: 'flat', trendLabel: null, value: formatMoney(0) };
        }
        const current = periods[periods.length - 1];
        const previous = periods.length > 1 ? periods[periods.length - 2] : null;
        const delta = previous ? current.netCents - previous.netCents : 0;
        return {
          label: 'This Month Net Cashflow',
          trend: trendFromDelta(delta),
          trendLabel: previous ? `${formatSignedDelta(delta)} vs last month` : null,
          value: formatMoney(current.netCents),
        };
      }),

      // -----------------------------------------------------------------
      // Charts
      // -----------------------------------------------------------------

      /** Net-worth trend line, sliced to `trendRange`. */
      netWorthChartConfig: computed<NgeChartConfig>(() =>
        createLineChartConfig({
          // The line preset (unlike the bar presets) has no Y-tick formatter, so
          // scale cents → dollars in the data to keep the axis readable; the
          // tooltip rounds back to cents for exact `formatMoney` output.
          data: netWorthPoints().map<NgeLineDataPoint>(point => ({
            x: parseIsoDateLocal(point.date),
            y: point.valueCents / 100,
          })),
          showArea: true,
          showXAxis: true,
          showYAxis: true,
          tooltip: {
            enabled: true,
            formatContent: point => ({
              label: point.x instanceof Date ? point.x.toLocaleDateString() : String(point.x),
              value: formatMoney(Math.round(point.y * 100)),
            }),
          },
          yAxisLabel: 'Net worth',
        })
      ),

      /** Spending-by-category donut segments — `CategorySpending` mapped 1:1 to `LdgDonutSegment`. */
      spendingSegments: computed<LdgDonutSegment[]>(() =>
        facade.spendingByCategory().map(entry => ({
          color: entry.accent,
          label: entry.name,
          value: entry.totalCents,
        }))
      ),

      /** Whether the budget-vs-actual chart has anything to show, for the empty-state guard. */
      hasBudgetData: computed(() => store._bva().length > 0),

      /** Budget-vs-actual grouped bar: two bars (Budget, Spent) per category. */
      budgetChartConfig: computed<NgeChartConfig>(() => {
        const categoriesById = new Map(facade.categories().map(category => [category.id, category]));
        const data: NgeGroupedBarDataPoint[] = store._bva().flatMap(row => {
          const category = categoriesById.get(row.categoryId);
          const name = category?.name ?? row.categoryId;
          const overBudget = row.spentCents > row.budgetCents;
          return [
            { groupId: name, label: 'Budget', value: row.budgetCents },
            {
              color: overBudget ? 'var(--ldg-money-negative)' : category?.accent,
              groupId: name,
              label: 'Spent',
              value: row.spentCents,
            },
          ];
        });

        return createGroupedBarChartConfig({
          data,
          legend: { enabled: true },
          showXAxis: true,
          showYAxis: true,
          tooltip: {
            enabled: true,
            formatContent: point => ({
              label: `${point.groupId} — ${point.label}`,
              value: formatMoney(point.value),
            }),
          },
          yAxisTickFormat: formatAxisDollars,
        });
      }),

      /** Monthly cashflow grouped bar: two bars (Inflow, Outflow) per period. */
      cashflowChartConfig: computed<NgeChartConfig>(() => {
        // Rendered as a grouped bar rather than the `diverging-bar` preset —
        // that preset's `data` is a single gauge-style value, not a series,
        // so it can't represent more than one period at a time.
        const data: NgeGroupedBarDataPoint[] = facade.cashflow().flatMap(period => [
          { color: 'var(--ldg-money-positive)', groupId: period.period, label: 'Inflow', value: period.inflowCents },
          { color: 'var(--ldg-money-negative)', groupId: period.period, label: 'Outflow', value: period.outflowCents },
        ]);

        return createGroupedBarChartConfig({
          data,
          legend: { enabled: true },
          showXAxis: true,
          showYAxis: true,
          tooltip: {
            enabled: true,
            formatContent: point => ({
              label: `${point.groupId} — ${point.label}`,
              value: formatMoney(point.value),
            }),
          },
          yAxisTickFormat: formatAxisDollars,
        });
      }),

      // -----------------------------------------------------------------
      // Recent transactions table
      // -----------------------------------------------------------------

      /** The `RECENT_TRANSACTIONS_LIMIT` most recent transactions, newest first, ready to display. */
      recentTransactions: computed<OverviewTransactionRow[]>(() => {
        const categoriesById = new Map(facade.categories().map(category => [category.id, category]));
        return [...facade.transactions()]
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
          .slice(0, RECENT_TRANSACTIONS_LIMIT)
          .map(txn => ({
            amountCents: txn.amountCents,
            categoryName: categoriesById.get(txn.categoryId)?.name ?? 'Uncategorized',
            date: formatShortDate(txn.date),
            id: txn.id,
            merchant: txn.merchant,
          }));
      }),
    };
  }),

  withMethods(store => ({
    setTrendRange(range: OverviewTrendRange): void {
      patchState(store, { trendRange: range });
    },
  }))
);

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * True calendar-day parse of `'YYYY-MM-DD'` into a LOCAL-midnight `Date` —
 * deliberately not `new Date(iso)`, which parses as UTC and can render as the
 * previous day on the chart's time axis in negative-UTC-offset timezones.
 */
function parseIsoDateLocal(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * `iso`'s month, `months` earlier, as a `'YYYY-MM-01'` cutoff string. Pure
 * string/integer arithmetic — no `Date` reparsing — for the same timezone
 * reason `@nge/ledger-utils`' `net-worth-series.ts` avoids it.
 */
function isoDateMonthsBefore(iso: string, months: number): string {
  const [year, month] = iso.slice(0, 7).split('-').map(Number);
  const totalMonths = year * 12 + (month - 1) - months;
  const cutoffYear = Math.floor(totalMonths / 12);
  const cutoffMonth = ((totalMonths % 12) + 12) % 12; // 0-based, JS `%` can go negative
  return `${cutoffYear}-${String(cutoffMonth + 1).padStart(2, '0')}-01`;
}

/** Y-axis tick formatter shared by every dollar-denominated chart — cents in, `'$1,234'` out. */
function formatAxisDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

/** A delta with an explicit leading sign — `'+$120.00'` / `'-$45.00'` — for KPI trend labels. */
function formatSignedDelta(cents: number): string {
  return cents >= 0 ? `+${formatMoney(cents)}` : formatMoney(cents);
}

/**
 * Maps a period-over-period delta to the `dlc-stats-card` trend arrow — the
 * LITERAL direction of the number being displayed, not a "good/bad" value
 * judgement (a spending increase renders 'up' the same as a net-worth
 * increase; callers choose the number they diff, not this mapping).
 */
function trendFromDelta(deltaCents: number): DlcStatsCardTrend {
  return deltaCents > 0 ? 'up' : deltaCents < 0 ? 'down' : 'flat';
}

/** `'2026-07-15'` → `'Jul 15'`. Pure string/number formatting — no `Date` parsing, no TZ risk. */
function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${MONTH_ABBREVIATIONS[Number(month) - 1]} ${Number(day)}`;
}
