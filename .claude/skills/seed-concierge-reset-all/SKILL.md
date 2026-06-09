---
description: Nuke-and-repave reset of the concierge test brokerage — `recursiveDelete` of the entire `organizations/{TEST_BROKERAGE_ID}` subtree (brokerage doc + `members` + every subcollection) AND the test user doc (incl. notifications), then reseeds all 9 firestore collections + recreates brokerage + membership + user docs. Runs `npm run seed.concierge.prod.reset-all`. **Destroys non-fixture data**: app-written docs, orphans from old fixtures, manual edits to brokerage doc / members / user. Was previously `/seed-concierge-wipe`. Use when stale state must not survive. Test anchor uid PPTeHgaV0Oc3QX8BQ2c6vOFakNF2 + brokerage 8KDV4hxEFmjPvqQd1WlQ.
---

Nuke-and-repave reset of the concierge test brokerage AND the test user — everything under `/organizations/{TEST_BROKERAGE_ID}` (brokerage doc + members + every subcollection) and everything under `/users/{TEST_UID}` (user profile + notifications) is `recursiveDelete`'d, then the seeder recreates the canonical anchored state from fixtures.

**Mental model:** "clean room — nothing survives, then reseed." Compare with:
- `/seed-concierge-clear-all` (same nuke, NO reseed — for from-scratch onboarding test)
- `/seed-concierge-reset-content` (data subcols only — org doc + members + user doc survive)
- `/seed-concierge-clear-content` (same content-only delete, NO reseed — test cleanup)
- `/seed-concierge-upsert` (no delete; layer on top)

## What it does

`npm run seed.concierge.prod.reset-all` — single npm script that:

1. `recursiveDelete /organizations/{TEST_BROKERAGE_ID}` (org doc + every subcollection including members)
2. `recursiveDelete /users/{TEST_UID}` (user doc + notifications)
3. Recreates brokerage doc + test membership + user doc from fixtures
4. Reseeds all 9 firestore subcollections + user notifications

**Destroys non-fixture data.** If the test broker has app-written notes / contacts / tasks etc., they're gone.

## When to use this (vs. the other seed skills)

| Scenario | Use this | Alternative |
|---|---|---|
| Brokerage doc is wrong / has wrong type / wrong tier | ✅ | reset-content can't touch the doc |
| `members` has duplicate or bad-role entries | ✅ | reset-content preserves members |
| Need zero confidence stale data survives | ✅ | use this; nothing less is guaranteed |
| Want to keep app-written data the broker created | ❌ | use `/seed-concierge-upsert` |
| Re-anchor fixture dates only | overkill | use `/seed-concierge-upsert` |
| Test from-scratch onboarding | ❌ | use `/seed-concierge-clear-all` (skips reseed) |

## How

Spawn a `general-purpose` agent in the background to run the script (~60-90s — wipe + reseed).

### Sub-agent prompt template

```
Run this npm script at the workspace root:

  npm run seed.concierge.prod.reset-all

Do NOT modify any source files. This is purely run-the-script.

Report (under 200 words):
- Exit code (0 = success).
- The "Wipe mode" before/after doc counts per path.
- The "Seeded: prod (project: ...)" header + per-collection write counts.
- Any "permission-denied", "Error:", or stack-trace lines — first 3 lines verbatim.
```

## After it completes

1. Surface the agent's report.
2. On success, recommend hard-refreshing the app so the post-reseed snapshots load cleanly (a soft refresh sometimes carries stale auth state).

## Notes

- Test anchor: `uid PPTeHgaV0Oc3QX8BQ2c6vOFakNF2 + brokerage 8KDV4hxEFmjPvqQd1WlQ`.
- Use sparingly — destroys app-written test data; not idempotent in the sense that it always reseeds dates to "now" (so timestamps change every run).
