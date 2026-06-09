---
description: Drive a cross-actor concierge scenario across two browser profiles — act in one persona, verify the realtime propagation in another. Every run is BRACKETED — Phase 0.5 prompts the user to run the before-seed; Phase 7 prompts the user to run the after-clean (per the scenario's catalog bracket). Pass `--auto-confirm-bracket` to skip both Y/Enter prompts and auto-run the bracket skills (use only when the caller owns the test brokerage exclusively — e.g. the epic-runner orchestrator). Optional mobile viewport via `--mobile-actor` / `--mobile-verifier` / `--mobile-both`. Reads the scenario catalog from the cross-actor testing memory. $ARGUMENTS = scenario name (e.g. `broker assigns task to agent`) or freeform description. If empty, list catalog and ask user to pick.
---

Drive a cross-actor concierge test: one persona acts, another persona verifies the realtime Firestore propagation. The skill is the executable form of the catalog in `reference_concierge_cross_actor_testing.md` (memory). Always read that memory first if it isn't already loaded — it has the full pattern, the scenario catalog, the persona coverage matrix, and edge-case warnings.

## What it does

Orchestrates the **act → wait → switch → verify** flow:
1. Confirm preconditions (dev server up, both required profiles open)
2. Resolve the scenario from `$ARGUMENTS` against the catalog
3. Apply mobile viewport flags if requested
4. Switch to actor profile, drive the action
5. Wait for Firestore snapshot propagation, switch to verifier
6. Verify via UI → NgRx store → Firestore (in that order)
7. Report what happened, including any gaps

## When to use

- Smoke testing a feature that crosses persona boundaries (broker invites agent, broker sends message to client, etc.)
- Verifying realtime propagation works end-to-end for a watch service
- QA'ing the mobile shell against a desktop-driven action
- Catching regressions where one persona's UI doesn't reflect another persona's writes

## When NOT to use

- Single-persona flows — use `/re-ui-e2e` or direct browser MCP calls
- Component-isolation tests — use `/ui-storybook`
- Backend-only verification — use the Playwright e2e suite + `window.__cgE2E` hook directly

## Phase 0 — Preconditions

Run these in order; abort + report on first failure.

1. **Dev server up + monitoring armed**:
   - First, `curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4202` should print `200`. If not, instruct user to run `npm run s.app.concierge` and stop.
   - **Then arm a compile-error monitor** via the Monitor tool so any TypeScript / template compile errors that surface mid-scenario (typically because Claude wrote a new file on the impl branch during a fix-in-place loop) are detected within seconds rather than misdiagnosed as "the realtime didn't propagate". Command pattern:
     ```bash
     tail -f /tmp/concierge-dev-server.log | grep -E --line-buffered "ERROR|TS[0-9]+|✘|Application bundle generation complete|Compilation complete|Watch mode enabled"
     ```
     Set `persistent: true` so the monitor lives for the whole scenario (and any fix-in-place re-runs that follow). If the user is running their own dev server with stdout in their terminal (no /tmp log), ask them to redirect or — preferred — kill it and let Claude re-launch via `npm run s.app.concierge > /tmp/concierge-dev-server.log 2>&1 &` so the monitor has a readable file. Without the monitor, a TS error in a freshly-added file looks identical to "watch service didn't subscribe" in the verifier UI — wasting an entire investigation loop.
   - If the dev server log already shows `✘` / `ERROR TS####` entries before you start driving the scenario, surface them and STOP — fix the compile error first, do not enter Phase 1.
2. **Required profiles open**: call `mcp__claude-in-chrome__tabs_context_mcp`. The set of profiles depends on the scenario (see catalog). If a required profile is missing, instruct the user to connect a Chrome window with that byte-exact canonical name (per `[[reference-concierge-browser-profiles]]`) and stop. Do NOT attempt to proceed with a missing verifier — silent failure is the worst outcome.
3. **Profile is BLOCKED?** If the scenario requires `TEST SERVICE PROVIDER` (scenario 12 in the catalog, currently BLOCKED), surface the blocker and exit cleanly. Cite the unblocking criteria from the catalog.

### Why the dev-server monitor matters (don't skip)

The cross-actor flow is "act → wait → switch → verify". When verification fails, the diagnosis tree branches three ways: (a) actor write didn't fire, (b) write fired but didn't propagate, (c) propagated but UI didn't render. **A fourth, much subtler branch is: (d) the impl branch has a TypeScript error and the dev server is serving stale code from the last successful compile.** Symptoms look identical to (c): the new store slice / facade method / watch service appears absent from the running app, but the spec passes and the file is on disk. The monitor catches this in seconds. Without it, Claude wastes 5–10 minutes investigating a propagation bug that doesn't exist. Lesson surfaced during REX-368 actor testing on 2026-05-23.

## Phase 0.5 — Resolve + run the BEFORE bracket (REQUIRED)

Every scenario carries a `Bracket: before=<skill> after=<skill>` line in the catalog (`[[reference-concierge-cross-actor-testing]]`). Resolve the bracket and either prompt the user OR auto-run it, depending on `--auto-confirm-bracket`.

1. Look up the scenario's bracket. The 4 types map to 4 pairs:
   | Type | Before | After |
   |---|---|---|
   | pure-additive | `/seed-concierge-upsert` (optional) | `/seed-concierge-clear-content` + `/clear-bq-test-data` |
   | state-mutation | `/seed-concierge-reset-content` | `/seed-concierge-reset-content` |
   | empty-state UX | `/seed-concierge-clear-content` | `/seed-concierge-reset-content` |
   | from-scratch onboarding | `/seed-concierge-clear-all` | `/seed-concierge-upsert` |

2. **If `$ARGUMENTS` contains `--auto-confirm-bracket`**: skip the prompt. Log a single line — `auto-confirm-bracket: running <before-skill>` — then run the before skill and proceed to Phase 1. Caller asserts exclusive ownership of the test brokerage; no human gate.

3. **Otherwise**, surface the bracket to the user:

   ```
   Scenario bracket (per catalog):
     before: /seed-concierge-reset-content
     after:  /seed-concierge-reset-content

   Run `before` now? [Y/n/skip]
   ```

   - **Y / Enter** — run the before skill, wait for completion, then proceed to Phase 1.
   - **n** — abort the whole test (user opted out of bracket; ask them why before falling back to "run anyway").
   - **skip** — proceed to Phase 1 without running before. Note in the final report that the test ran against ad-hoc state, not a clean baseline. (Only valid choice for `pure-additive` where before is marked `(optional)`.)

4. Without `--auto-confirm-bracket`: do NOT auto-run the before skill — confirm with the user. Bracket skills touch prod Firestore and a stray run can disrupt parallel sessions or manual QA work. The flag is the explicit opt-in for orchestrator contexts where the caller owns the test brokerage exclusively (e.g. the epic-runner with `hybridMode: true` on the `rex` board — see `/Users/gigasoftware_developer/Dev/DEV_REX_1/epic_runner/README.md`).

## Phase 1 — Resolve scenario

Parse `$ARGUMENTS`:
- **Empty**: list the 12 scenarios from the catalog (with status: runnable / partial / BLOCKED), ask user to pick by number or short name.
- **Catalog match** (substring or fuzzy match on action description): use directly. Confirm with the user which scenario you matched ("Running scenario 2: broker assigns task to agent. Confirm? y/n.").
- **No match (freeform)**: treat as ad-hoc. Ask the user explicitly: which actor profile, which verifier profile, what action, what to verify. Don't guess persona pairs — getting the actor wrong wastes a full setup cycle.

Extract mobile flags from `$ARGUMENTS`:
- `--mobile-actor` → resize actor profile to 390×844 before switching
- `--mobile-verifier` → resize verifier profile to 390×844 before switching
- `--mobile-both` → resize both
- Default viewport: iPhone 14 (390 × 844). Other sizes per `[[reference-concierge-mobile-testing]]`.

## Phase 2 — Mobile prep (skip if no mobile flag)

For each profile that needs mobile viewport:
1. `mcp__claude-in-chrome__switch_browser` to that profile (briefly, just to set context)
2. `mcp__claude-in-chrome__resize_window` to `width: 390, height: 844`
3. Brief settle (~500ms) so the app's breakpoint listener picks up the change
4. Verify the mobile shell rendered: `read_page` snippet should reference mobile-shell-specific markup (e.g. `mobile-shell` element, bottom tab bar). If the desktop shell is still rendered, that's an app bug — surface and stop. Do NOT navigate to `/small/*` to force it.

## Phase 3 — Act

1. `mcp__claude-in-chrome__switch_browser` to the actor profile
2. Navigate to the action surface (the URL or the click-path — prefer click-path through the dashboard since it exercises real user flow)
3. Drive the action via `find` (locate element) → `form_input` (fill fields) → click (via `computer` or by triggering the right button via `find` + `javascript_tool`)
4. Capture `read_network_requests` snapshot — look for the Firestore write (path under `firestore.googleapis.com/...:commit` or similar). If no write fired, the actor-side action didn't actually mutate state; abort the verify phase and report the failure.

## Phase 4 — Wait + switch

1. Wait ~2 seconds (use `setTimeout` via `javascript_tool` or just proceed — the network round-trip after `read_network_requests` typically gives you ~1s of natural delay).
2. `mcp__claude-in-chrome__switch_browser` to the verifier profile
3. Navigate to (or refresh) the verification surface — but try NOT to refresh; the snapshot should propagate without a reload. A forced reload masks listener bugs.

## Phase 5 — Verify

Try in order, escalating only if the prior step fails:

1. **UI**: `read_page` for the expected element / text. Repeat with brief retry up to 5 s total. If found, capture screenshot via `computer` for evidence and proceed to Phase 6 success.
2. **NgRx store**: if UI didn't update, `javascript_tool` to access the store. The concierge app exposes the store on the global `ng` debug helper — try `ng.getInjector(document.querySelector('app-root')).get(Store).pipe(take(1))` patterns, or check whether `window.__cgE2E` exposes a store reference.
3. **Firestore directly**: `window.__cgE2E` Firebase hook (`apps/concierge/app/src/main.ts`) — call `getDoc(doc(db, '<path>'))` via `javascript_tool` to read the doc you expect. If the doc is there but the UI didn't render, the bug is in the listener / selector / component — report that distinction.
4. **Console**: `read_console_messages` filtered by `[Snapshot]` / `[NgRx]` / feature name. If the listener fired but state didn't update, the action dispatch was likely missing.
5. **Network**: `read_network_requests` on the verifier — was an `onSnapshot` long-poll connection even open?

## Phase 6 — Report

One concise report (under 200 words):
- Scenario name + status (success / partial / failed / blocked)
- Actor: profile, action surface, write detected (yes/no, latency from action click to network confirm)
- Verifier: profile, viewport (desktop / mobile), where verification happened (UI / store / Firestore), latency from write to verifier-side observation
- Screenshots saved (if any)
- Gaps: e.g. "PDF approval doc updated but no notification fan-out — known REX-373 gap"
- Suggested next steps: another scenario, mobile retry, file Jira for app bug, etc.

## Phase 7 — Run the AFTER bracket (REQUIRED)

After the report is surfaced, run the after-side of the scenario's bracket. Behaviour depends on `--auto-confirm-bracket` (same flag that gates Phase 0.5):

- **If `$ARGUMENTS` contains `--auto-confirm-bracket`**: skip the prompt. Log `auto-confirm-bracket: running <after-skill(s)>` and run each after skill in sequence. If after is `<a> + <b>` (e.g. `/seed-concierge-clear-content + /clear-bq-test-data`), run them sequentially; do not parallelize (the BQ DELETE depends on Firestore writes having settled).

- **Otherwise**, prompt the user. Same shape as Phase 0.5, but at the end:

  ```
  Cleanup bracket (per catalog):
    after: /seed-concierge-clear-content + /clear-bq-test-data

  Run cleanup now? [Y/n]
  ```

  - **Y / Enter** — run each after skill in sequence (same sequencing rule as above).
  - **n** — leave residual data. Note in the final report that cleanup was skipped so the next session knows to expect stale data in the test brokerage.

Do NOT auto-run cleanup if Phase 5 reported a FAILURE — the user may want to inspect the residual state in the Firebase console or in the app to diagnose. Ask whether to clean up or preserve for inspection. If they ask to preserve, also note in the final report that cleanup is pending.

## After it completes

1. Surface the report to the user.
2. If success: offer to run a follow-up scenario or capture a GIF (`mcp__claude-in-chrome__gif_creator`) for documentation.
3. If failure: distinguish (a) write didn't fire (actor-side bug), (b) write fired but didn't propagate (Firestore / listener bug), (c) propagated but UI didn't render (selector / component bug). Recommend the right next step per category.
4. If BLOCKED: confirm the unblocking criteria from the catalog and offer to file a Jira / open a PR.

## Notes

- The 5 wired profiles + their auth state are documented in `[[reference-concierge-browser-profiles]]`. `TEST BUYER` and `TEST SELLER` may need cold-auth on first use of the session (beta access-code gate). Claude prefills email only — user enters access code + password.
- Test brokerage id is `8KDV4hxEFmjPvqQd1WlQ`; test broker uid is `PPTeHgaV0Oc3QX8BQ2c6vOFakNF2` (per `[[project-rex-firebase]]`).
- Default scenario latency: 1–3 s end-to-end. Anything over 5 s is a red flag — likely the verifier's watch service didn't subscribe (persona gate, missing membership, wrong active org).
- Mobile viewport rules: never deep-link `/small/*`; resize and let the app route. Full mobile guidance in `[[reference-concierge-mobile-testing]]`.
- Pairs naturally with `/seed-concierge-upsert` (low-impact fixture refresh) before scenarios that depend on baseline data; with `/seed-concierge-reset-all` for full reset; with `/seed-concierge-clear-all` for from-scratch onboarding tests.
- This skill is intentionally a playbook, not a black-box automation — Claude orchestrates each phase using MCP tools, with the user available to intervene at any step. Do not background-spawn a sub-agent for the orchestration itself; the user needs to see what's happening in their browser.
