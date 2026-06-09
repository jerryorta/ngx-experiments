---
description: Wipe the concierge test brokerage AND test user WITHOUT reseeding — recursively deletes `/organizations/{TEST_BROKERAGE_ID}` (brokerage doc + members + every subcollection) and `/users/{TEST_UID}` (user profile + notifications), then exits. Runs `npm run seed.concierge.prod.clear-all`. Use to test the from-scratch onboarding flow — sign-in lands the test user at `/onboarding/step/1` with no brokerage, no membership, no data. Was previously `/seed-concierge-wipe-only`. Test anchor uid PPTeHgaV0Oc3QX8BQ2c6vOFakNF2 + brokerage 8KDV4hxEFmjPvqQd1WlQ.
---

Wipe the concierge test brokerage AND test user WITHOUT reseeding. The same delete scope as `/seed-concierge-reset-all` but stops after the delete — no fixture writes follow. The test user signs in cold with no brokerage, no membership, no data, and the app walks them through onboarding from scratch.

**Mental model:** "blank slate — onboarding regression." Compare with:
- `/seed-concierge-reset-all` (same nuke + reseed)
- `/seed-concierge-clear-content` (data subcols only — org doc + members + user doc survive; for actor-test cleanup)
- `/seed-concierge-reset-content` (same content-only delete + reseed)
- `/seed-concierge-upsert` (no delete; layer fixtures on top)

## What it does

`npm run seed.concierge.prod.clear-all` — single npm script that:

1. `recursiveDelete /organizations/{TEST_BROKERAGE_ID}` (org doc + every subcollection including members)
2. `recursiveDelete /users/{TEST_UID}` (user doc + notifications)
3. **Exits.** No fixtures are written.

After this completes, signing in as the test user lands at `/onboarding/step/1`.

## When to use this (vs. the other seed skills)

| Scenario | Use this | Alternative |
|---|---|---|
| Test from-scratch onboarding flow | ✅ | nothing else does this |
| Verify "join existing brokerage" flow as a new user | ✅ then create the brokerage manually first | — |
| Reset and reseed in one go | ❌ | use `/seed-concierge-reset-all` |
| Just drop the data created during an actor-test run | ❌ — overkill | use `/seed-concierge-clear-content` |

## How

Spawn a `general-purpose` agent in the background to run the script (~20-40s).

### Sub-agent prompt template

```
Run this npm script at the workspace root:

  npm run seed.concierge.prod.clear-all

Do NOT modify any source files. This is purely run-the-script.

Report (under 200 words):
- Exit code (0 = success).
- The "Wipe mode" before/after doc counts per path.
- Any "permission-denied", "Error:", or stack-trace lines — first 3 lines verbatim.
- DO NOT confuse this with a successful seed — there are no seed write counts to report.
```

## After it completes

1. Surface the agent's report.
2. Tell the user to refresh the concierge app — they will land at `/onboarding/step/1` on next sign-in.
3. The test broker's auth identity (Firebase Auth uid) is NOT touched; only the Firestore user doc is. The same uid signs back in to a fresh onboarding state.

## Notes

- Test anchor: `uid PPTeHgaV0Oc3QX8BQ2c6vOFakNF2 + brokerage 8KDV4hxEFmjPvqQd1WlQ`.
- Pair with `/seed-concierge-upsert` after onboarding completes to land back at a seeded baseline.
