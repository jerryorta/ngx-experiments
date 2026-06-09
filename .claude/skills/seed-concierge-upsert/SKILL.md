---
description: Upsert-only seed of the concierge test brokerage — runs `npm run seed.concierge.prod.upsert`. **Never deletes anything.** `.set()` writes every fixture by id (overwriting any doc with that id), but app-written docs, orphaned old fixtures, and manually-edited docs all stay. Lowest-impact mode — use when current state is fine and you just want to layer the seeded baseline on top. Typical case: re-anchoring REX-334 fixture dates to "now", or adding fixtures missing after a partial run. Was previously `/seed-concierge-reseed`. Test anchor uid PPTeHgaV0Oc3QX8BQ2c6vOFakNF2 + brokerage 8KDV4hxEFmjPvqQd1WlQ.
---

Upsert the concierge seeded fixtures into the test brokerage without deleting anything. Lowest-impact seed mode: every seeded doc is `set()` by id (overwriting that one doc); every other doc (app-written, orphaned, manually edited) is left untouched.

**Mental model:** "layer fixtures on top." Compare with:
- `/seed-concierge-clear-content` (clear data subcollections, no reseed)
- `/seed-concierge-reset-content` (clear data subcollections, then reseed)
- `/seed-concierge-reset-all` (nuke + reseed)
- `/seed-concierge-clear-all` (nuke, no reseed)

## What it does

`npm run seed.concierge.prod.upsert` — writes every fixture under the test brokerage + test user's notifications via `.set()`. Overwrites by id, adds new ones, never deletes. Source: `apps/concierge/backend/tools/seed.ts` (mode `upsert`).

## When to use this (vs. the other seed skills)

| Scenario | Use this | Alternative |
|---|---|---|
| Firestore is "clean" (only past seed runs) | ✅ faster | reset-all works but slower |
| App-written test data exists and you want to keep it | ✅ stays | reset-all destroys it |
| Old fixtures left orphans | ❌ orphans stay | use reset-all |
| Brokerage doc was manually edited | overwrites top-level fields but won't restore deleted ones | use reset-all |
| Members collection has bad/duplicate entries | ❌ remain | use reset-all |
| Re-anchor REX-334 dates to "now" only | ✅ enough — seeder relativizes via `dateOffsetMs(Date.now() - FIXTURE_BASE_DATE_MS)` | overkill to wipe |
| Testing from-scratch onboarding | — | use `/seed-concierge-clear-all` |
| Reset just data subcollections, keep onboarding intact | — | use `/seed-concierge-reset-content` |
| Just drop data created during an actor-test run | — | use `/seed-concierge-clear-content` |

## How

Spawn a `general-purpose` agent in the background to run the script (takes ~30-60s for 1000+ doc writes).

```
Agent({
  subagent_type: "general-purpose",
  description: "Upsert concierge seed data",
  run_in_background: true,
  prompt: <<see below>>
})
```

### Sub-agent prompt template

```
Run this npm script at the workspace root:

  npm run seed.concierge.prod.upsert

Do NOT modify any source files. This is purely run-the-script.

Report (under 200 words):
- Exit code (0 = success).
- The "Seeded: prod (project: ...)" header line.
- The per-collection write counts from the writes table at the end.
- Any "permission-denied", "Error:", or stack-trace lines — quote the first 3 lines verbatim.
```

## After it completes

1. Surface the agent's report to the user.
2. On success, recommend reloading the app so the new snapshots flow through the watch services.
3. On `permission-denied`: most likely cause is the prod Firebase service account key isn't loaded / firestore.rules deploy is stale.

## Notes

- Test anchor: `uid PPTeHgaV0Oc3QX8BQ2c6vOFakNF2 + brokerage 8KDV4hxEFmjPvqQd1WlQ`.
- Static `/platform/{flags,sync}` docs are intentionally NOT touched.
- Firestore rules at `apps/concierge/backend/firestore.rules` must be deployed for the seeded data to be readable from the app.
- Idempotent — safe to re-run any number of times.
