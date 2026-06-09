---
description: Reset the concierge test brokerage's data subcollections — clears every subcollection EXCEPT `members`, plus the test user's notifications, then reseeds all 9 firestore collections. Preserves the brokerage doc + members + user doc + onboarding state (no re-onboarding regression). Runs `npm run seed.concierge.prod.reset-content`. Most common "I broke my dev data" reset. Was previously `/seed-concierge`. Test anchor uid PPTeHgaV0Oc3QX8BQ2c6vOFakNF2 + brokerage 8KDV4hxEFmjPvqQd1WlQ.
---

Reset the concierge test brokerage's data layer — clears every subcollection except `members`, plus the user's notifications, then layers fixtures back on top. Preserves the brokerage doc, members, user doc, and onboarding state so the broker doesn't have to re-onboard.

**Mental model:** "clean slate for the data, keep the account intact." Compare with:
- `/seed-concierge-clear-content` (same delete scope, NO reseed — test-cleanup mode)
- `/seed-concierge-upsert` (no delete at all)
- `/seed-concierge-reset-all` (nuke + reseed — also recreates org doc + members + user doc)
- `/seed-concierge-clear-all` (nuke, no reseed — for from-scratch onboarding tests)

## What it does

`npm run seed.concierge.prod.reset-content` — single npm script that:

1. `recursiveDelete` of every subcollection under `/organizations/{TEST_BROKERAGE_ID}` EXCEPT those listed in `clearContent.keep` (currently `["members"]`)
2. `recursiveDelete` of `/users/{TEST_UID}/notifications`
3. Reseeds all 9 firestore subcollections + user notifications via `.set()`

Anchor doc (`/organizations/{TEST_BROKERAGE_ID}`) and user doc (`/users/{TEST_UID}`) are preserved.

## When to use this (vs. the other seed skills)

| Scenario | Use this | Alternative |
|---|---|---|
| Stale data subcollections from a prior failed test | ✅ | `/seed-concierge-upsert` if no orphans |
| Need to keep the test broker membership intact | ✅ | reset-all destroys it |
| Want to skip re-onboarding regression | ✅ | reset-all forces fresh onboarding |
| Brokerage doc itself is corrupted | ❌ | use `/seed-concierge-reset-all` |
| Just drop data the actor test just created — no reseed needed | ❌ | use `/seed-concierge-clear-content` |
| Test from-scratch onboarding | ❌ | use `/seed-concierge-clear-all` |

## How

Spawn a `general-purpose` agent in the background to run the script (~30-60s).

### Sub-agent prompt template

```
Run this npm script at the workspace root:

  npm run seed.concierge.prod.reset-content

Do NOT modify any source files. This is purely run-the-script.

Report (under 200 words):
- Exit code (0 = success).
- The "Clear-content mode" delete count + per-subcollection delete lines.
- The "Seeded: prod (project: ...)" header line + per-collection write counts.
- Any "permission-denied", "Error:", or stack-trace lines — first 3 lines verbatim.
```

## After it completes

1. Surface the agent's report.
2. On success, recommend reloading the app so listeners re-snapshot.

## Notes

- Test anchor: `uid PPTeHgaV0Oc3QX8BQ2c6vOFakNF2 + brokerage 8KDV4hxEFmjPvqQd1WlQ`.
- `clearContent.keep` is configured per-persona in `apps/concierge/backend/tools/seed-configs/<persona>.json`.
- Idempotent — safe to re-run.
