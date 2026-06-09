---
description: Change a test-anchor id (brokerage or any test-persona uid) workspace-wide. Edits `apps/concierge/backend/tools/seed-configs/test-anchors.json` as the source of truth, then propagates the new value to the few downstream places that can't load JSON at build time (`MOCK_BROKERAGE_ID` + `MOCK_TEST_AGENT_UID` in concierge-mocks, `TEST_BROKER_UID` in app-e2e, BigQuery mocks under `libs/concierge/mocks/src/lib/bigquery/`, the test-anchor doc line in `apps/concierge/backend/tools/README.md`, and memory references under `~/.claude/projects/*/memory/`). Designed as a recurring test-scenario workflow — discovers the *current* values at runtime by reading `test-anchors.json` so the skill works regardless of the previous id. Skips `.spec.ts` files (unit-test fixtures keep their own arbitrary ids). $ARGUMENTS = `<anchor> <new-value>` where anchor is `brokerage`, `broker`, `buyer`, `seller`, or `agent` (e.g. `brokerage NEW_ORG_ID`, `agent NEW_AGENT_UID`). Pure source-edit; pair with `/seed-concierge-reset-all` (or `/seed-concierge-upsert`) to push to Firestore.
---

# Re-anchor a test-anchor id (brokerage or user uid) workspace-wide

`apps/concierge/backend/tools/seed-configs/test-anchors.json` is the workspace's single source of truth for the test brokerage id + every test-persona Firebase Auth uid. Most consumers read it at runtime (the seed driver, BQ cleanup tool). A handful of consumers can't (TS leaf constants in app-build paths, markdown memories, README docs) — this skill keeps them in sync.

## Usage

```
/seed-mock-test-anchor brokerage <NEW_ORG_ID>
/seed-mock-test-anchor broker <NEW_UID>
/seed-mock-test-anchor buyer <NEW_UID>
/seed-mock-test-anchor seller <NEW_UID>
/seed-mock-test-anchor agent <NEW_UID>
```

If `$ARGUMENTS` is empty, list the current values from `test-anchors.json` and ask the user which to change.

## Resolution algorithm

1. **Read current values from `test-anchors.json`** — never assume any prior value. Specifically:
   - `brokerage` → `brokerage.id`
   - `broker` → `users.broker.uid`
   - `buyer` → `users.buyer.uid`
   - `seller` → `users.seller.uid`
   - `agent` → `users.agent.uid`
2. **Validate the new value** — must be a non-empty string. Brokerage ids are typically Firestore-style auto-id; uids are Firebase Auth ids (alphanumeric, 28 chars).
3. **Capture the OLD value** before writing — used as the find-string for downstream replacements.
4. **Edit `test-anchors.json` first** (source of truth). Then propagate.

## Where to propagate per anchor type

### `brokerage <new-id>`

Find-and-replace the OLD brokerage id with the NEW id in:

| Path | Note |
|---|---|
| `apps/concierge/backend/tools/seed-configs/test-anchors.json` | `brokerage.id` — primary source |
| `libs/concierge/mocks/src/lib/firestore/brokerages/brokerage.mock.ts` | `MOCK_BROKERAGE_ID` constant (build-time mirror) |
| `libs/concierge/mocks/src/lib/bigquery/` (every `.ts` file, excluding `.spec.ts`) | hardcoded literals like `'brokerage-1'` patterns where the brokerage id appears |
| `apps/concierge/backend/tools/README.md` | the test-anchor doc line |
| `apps/concierge/backend/tools/SEED_COMMANDS.md` | the test-anchor doc line |
| Memory references under `~/.claude/projects/*/memory/` | every file containing the old brokerage id |

### `broker <new-uid>`

| Path | Note |
|---|---|
| `apps/concierge/backend/tools/seed-configs/test-anchors.json` | `users.broker.uid` — primary source |
| `apps/concierge/app-e2e/src/lib/admin.ts` | `TEST_BROKER_UID` constant (TS leaf mirror) |
| `apps/concierge/backend/tools/README.md` | the test-anchor doc line |
| `apps/concierge/backend/tools/SEED_COMMANDS.md` | the test-anchor doc line |
| Memory references under `~/.claude/projects/*/memory/` | every file containing the old broker uid |

### `buyer <new-uid>` / `seller <new-uid>`

| Path | Note |
|---|---|
| `apps/concierge/backend/tools/seed-configs/test-anchors.json` | `users.<persona>.uid` — primary source |
| Memory references under `~/.claude/projects/*/memory/` | every file containing the old uid (note: BUYER + SELLER uids are referenced in `reference_concierge_test_anchor.md` and the cross-actor catalog) |

(Buyer / seller uids do NOT have TS mirrors today — only the test-anchors JSON + memory references.)

### `agent <new-uid>`

| Path | Note |
|---|---|
| `apps/concierge/backend/tools/seed-configs/test-anchors.json` | `users.agent.uid` — primary source |
| `libs/concierge/mocks/src/lib/firestore/brokerages/members.mock.ts` | `MOCK_TEST_AGENT_UID` constant (TS build-time mirror; the value is also the `id` of `MOCK_MEMBERSHIP_TEST_AGENT` since the fixture is keyed off the constant) |
| Memory references under `~/.claude/projects/*/memory/` | every file containing the old agent uid (cross-actor catalog + test-anchor reference) |

## What to SKIP

- `**/*.spec.ts` — unit tests use their own arbitrary fixture ids; don't touch.
- `**/node_modules/**`, `**/dist/**`, `**/.nx/**`, `**/.angular/**` — build artifacts.
- Anywhere outside the workspace + Claude memory dir.

## How

1. Read current values from `test-anchors.json` (the only step where the SKILL itself touches Firestore — actually it doesn't; this is a pure source-edit + memory-edit).
2. Confirm the rename to the user: "Renaming broker uid from `<OLD>` to `<NEW>` — touching N files. Confirm? [Y/n]".
3. On Y: do the JSON edit first, then ripgrep + bulk-replace across the downstream paths above. Use `rg -l '<OLD>' | xargs sed -i ''` style (or equivalent with the Edit tool's `replace_all`).
4. Skip `.spec.ts` files explicitly.
5. Report counts: files-edited, fixtures-mocks-updated, memory-files-updated.

## After it completes

1. Tell the user: "The source-of-truth + all mirrors are updated. The new value won't be live in Firestore until you push it." Recommend `/seed-concierge-reset-all` if the new brokerage is fresh, or `/seed-concierge-upsert` if it already exists in prod with the new id.
2. If only a user uid changed (not the brokerage): tell the user the new user's `/users/{newUid}` profile doc will be written on the next `/seed-concierge-upsert` (via the `auxiliaryUsers` machinery seeded from test-anchors).

## Notes

- Both DEV_REX_1 and DEV_REX_2 workspace memory dirs may need updates — the skill should sweep both unless the user specifies one.
- This skill does NOT delete the OLD uid's user doc in Firestore. If you want that, run `/seed-concierge-clear-all` after the rename (deletes everything; from-scratch state).
