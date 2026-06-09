---
description: Test-cleanup mode — clears every subcollection under the concierge test brokerage EXCEPT `members`, plus the test user's notifications, then EXITS without reseeding. Runs `npm run seed.concierge.prod.clear-content`. Preserves the brokerage doc + members + user doc + onboarding state — the broker stays signed in with a working membership but no data. Designed to pair with `/concierge-cross-actor-test`: drop the contact / task / message you just created without re-onboarding the test broker. Pair with `/clear-bq-test-data` for full Firestore + BigQuery cleanup. Test anchor uid PPTeHgaV0Oc3QX8BQ2c6vOFakNF2 + brokerage 8KDV4hxEFmjPvqQd1WlQ.
---

Clear every data subcollection under the concierge test brokerage (and the user's notifications) WITHOUT reseeding. The test broker keeps their account, their membership, their onboarding-complete state — but every contact / task / message / note / circle / cma / event / file / invitation / referral / starred-property under their brokerage is gone.

**Mental model:** "drop what the actor test just created; keep the account so I can re-run the test." Compare with:
- `/seed-concierge-reset-content` (same delete + then reseeds fixtures back)
- `/seed-concierge-upsert` (no delete; layers fixtures on top)
- `/seed-concierge-clear-all` (also deletes org doc + members + user — full onboarding reset)
- `/seed-concierge-reset-all` (nuke + reseed)

## What it does

`npm run seed.concierge.prod.clear-content` — single npm script that:

1. `recursiveDelete` every subcollection under `/organizations/{TEST_BROKERAGE_ID}` EXCEPT those listed in `clearContent.keep` (currently `["members"]`)
2. `recursiveDelete` `/users/{TEST_UID}/notifications`
3. **Exits.** No fixture writes follow.

Anchor doc and user profile survive — `isOnboardingComplete: true` stays — so the test broker signs in and lands at their dashboard with zero data.

## When to use this (vs. the other seed skills)

| Scenario | Use this | Alternative |
|---|---|---|
| Just ran an actor test and want to drop the contact / task / msg you created | ✅ | reset-content forces a full reseed; upsert leaves the new doc |
| Want to verify "empty state" UX (zero contacts, zero tasks) | ✅ | reset-content rehydrates fixtures, masking empty-state bugs |
| Need to keep the test broker's membership + onboarding | ✅ | reset-all / clear-all force re-onboarding |
| Want fixtures rehydrated after the clear | ❌ | use `/seed-concierge-reset-content` |
| Test from-scratch onboarding | ❌ | use `/seed-concierge-clear-all` |
| Brokerage doc itself is corrupted | ❌ — preserves the doc | use `/seed-concierge-reset-all` |

## How

Spawn a `general-purpose` agent in the background (~20-30s).

### Sub-agent prompt template

```
Run this npm script at the workspace root:

  npm run seed.concierge.prod.clear-content

Do NOT modify any source files. This is purely run-the-script.

Report (under 200 words):
- Exit code (0 = success).
- The "Clear-content mode" per-subcollection delete count lines.
- The "Done — X doc(s) deleted." summary line.
- Any "permission-denied", "Error:", or stack-trace lines — first 3 lines verbatim.
- DO NOT confuse this with a reseed — there are no seed write counts.
```

## After it completes

1. Surface the agent's report.
2. Recommend a hard refresh on the actor + verifier browsers so the watch services re-snapshot the now-empty subcollections.
3. **Pair with `/clear-bq-test-data`** if the test scenario emits BigQuery events (most do — `concierge_events.events` is the activity log).

## Notes

- Test anchor: `uid PPTeHgaV0Oc3QX8BQ2c6vOFakNF2 + brokerage 8KDV4hxEFmjPvqQd1WlQ`.
- `members` subcollection is preserved per `clearContent.keep` in `apps/concierge/backend/tools/seed-configs/brokerage.json`.
- The broker's `isOnboardingComplete` flag on `/users/{uid}` survives — no re-onboarding regression.
- Idempotent — safe to re-run.
