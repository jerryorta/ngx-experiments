---
description: Delete BigQuery rows in `concierge_events.events` scoped to the test brokerage. Runs `npm run bq.clear.test.prod`. Pairs with `/seed-concierge-clear-content` for full Firestore + BigQuery cleanup after an actor-test run. Touches ONLY `concierge_events.events` rows where `entityType='brokerages' AND entityId='8KDV4hxEFmjPvqQd1WlQ'`; shared MLS replication data in `mls_data.*` is untouched. Test anchor: brokerage 8KDV4hxEFmjPvqQd1WlQ.
---

Delete the test brokerage's rows from the `concierge_events.events` BigQuery activity-log table. Companion to `/seed-concierge-clear-content` — Firestore subcollection cleanup leaves the BigQuery activity rows behind, so the catalog scenario's analytics views (`+activity` / `+task-completion-summary`) keep returning stale counts.

**Scope (by design):**

- ✅ `concierge_events.events` WHERE `entityType='brokerages' AND entityId='<testOrgId>'`
- ❌ `mls_data.bbo_properties` / `mls_data.bbo_members` / `mls_data.closed_listings` — **shared cross-tenant MLS replication data. NEVER touch.** Re-fetching from MLSGrid is expensive + rate-limited.
- ❌ `crm_data.{leads, activities, home_value_requests}` — written by the deprecated concierge backend (`apps/concierge/backend-deprecated/`); not in scope for current concierge actor-test cleanup
- ❌ `workspace_data.workspace_activities` — Real-Estate app territory; not concierge

The current concierge backend only writes to `concierge_events.events`. If a future story adds new per-tenant BQ tables, extend this tool — but `mls_data.*` must remain off-limits.

## What it does

`npm run bq.clear.test.prod` runs `apps/concierge/backend/tools/clear-bigquery-test-data.ts` which:

1. Loads the test org id from `apps/concierge/backend/tools/seed-configs/brokerage.json` (field: `testOrgId`)
2. Loads the prod Firebase service-account key (same key-discovery as `seed.ts`)
3. Counts matching rows pre-delete (audit)
4. Runs `DELETE FROM concierge_events.events WHERE entityType='brokerages' AND entityId='<testOrgId>'`
5. Verifies post-delete row count is zero

The DELETE is scoped to the table's clustering key (`(entityType, entityId)`) so the scan stays bounded to the test brokerage — no full-table cost.

### Dry-run mode

Pass `--dry-run` to print the matching row count without running the DELETE:

```sh
npx tsx apps/concierge/backend/tools/clear-bigquery-test-data.ts --env prod --dry-run
```

## When to use this

| Scenario | Use this |
|---|---|
| After `/concierge-cross-actor-test` — drop the activity log entries the test just emitted | ✅ |
| Before re-running a scenario that asserts a specific row count in `+activity` views | ✅ |
| Verifying empty-state for `+task-completion-summary` (BigQuery-aggregated daily counts) | ✅ |
| Wanting to keep activity log (e.g. measuring write throughput over time) | ❌ |

## How

Spawn a `general-purpose` agent in the background (~10-20s — single DELETE query plus two COUNT queries).

### Sub-agent prompt template

```
Run this npm script at the workspace root:

  npm run bq.clear.test.prod

Do NOT modify any source files. This is purely run-the-script.

Report (under 200 words):
- Exit code (0 = success).
- The "rows matching scope: N" pre-count line.
- The "DELETE complete — affected rows: N" line.
- The "rows remaining in scope: 0" verification line.
- Any "permission-denied", "Error:", or stack-trace lines — first 3 lines verbatim.
```

## After it completes

1. Surface the agent's report.
2. Tell the user the `+activity` and `+task-completion-summary` slices will show empty results for the test brokerage on the next query (those slices read directly from `concierge_events.events`).

## Notes

- Test brokerage id is sourced from `seed-configs/brokerage.json` so a future `/seed-mock-test-anchor` rotation flows through automatically.
- BigQuery DELETE has a 7-day streaming-buffer constraint: rows written within the last 30 minutes via streaming inserts cannot be deleted. The script will report `affected: 0` in that window even though `pre-count > 0`. Wait a few minutes and re-run.
- Pairs with `/seed-concierge-clear-content` (Firestore cleanup). Run both for full test-data cleanup.
