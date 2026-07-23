Run the autonomous `epic-runner` pipeline against the next N To-Do stories on a given epic board. Wraps the Python CLI at `/Users/gigasoftware_developer/Dev/DEV_REX_1/epic_runner/` so the user doesn't have to remember the `uv run python -m epic_runner --board <X>` incantation.

**Usage:**
- `/epic-pipeline <board>` — process 1 story on `<board>`
- `/epic-pipeline <board> <N>` — process N stories sequentially
- `/epic-pipeline <board> --dry-run` — print the per-phase prompts without invoking the SDK
- `/epic-pipeline <board> --skip-triage` — skip the Step 1.5 readiness pre-flight (run the runner directly)
- `/epic-pipeline <board> --auto` — autonomous hybrid mode: auto-confirm the rote gates (run cross-actor, reseed brackets, ship) and drive the whole flow end-to-end in this session. **Hard-stops and reports** the moment anything is non-nominal (triage not 🟢 GREEN, cross-actor not a clean zero-finding PASS, a compile error, or any fix-in-place). The PR merge **always stays manual** — `--auto` never merges. Principle: automate the boring path, escalate the interesting one. (No-op on autonomous boards — the default here — which already run hands-off via the runner's own `/epic-story-complete`.)

**Available boards:** any `epic.<board>.json` under `.claude/skills/epic-next/` — none ship with this repo; create one with `/epic-plan <EPIC-KEY>` (Jira project **NGE**).

**Pipeline behaviour depends on the board's `hybridMode` flag:**

| `hybridMode` | Runner does | User does after |
|---|---|---|
| `true` (hybrid) | impl only, stops at `READY_FOR_ACTOR_TEST <scenario>` | `/epic-cross-actor-test <board> <scenario>` interactively, then commit + PR + merge + `/post-merge-cleanup` |
| `false` (autonomous — **the expected mode in this repo**) | impl + `/epic-story-complete` (PR opened + Jira → In Review), emits `PR_URL: <url>` | Review + merge the PR, then `/post-merge-cleanup` |

> **`--auto`** (hybrid boards) collapses the "User does after" column into this same session: the rote gates auto-confirm and the cross-actor + ship run unattended, hard-stopping on anything non-nominal. The merge always stays manual. See the `--auto` usage line + Steps 1.5 / 6.

Full mechanics + rationale: `/Users/gigasoftware_developer/Dev/DEV_REX_1/epic_runner/README.md`.

---

## Step 0 — Parse arguments

Read `$ARGUMENTS`:
- **First token** is the board name (required). If missing, list available boards (from `.claude/skills/epic-next/epic.*.json`) and ask the user which one. Do not pick a default.
- **Second token** (optional) is either a positive integer (= `--max-stories <N>`) or a flag like `--dry-run`. If absent, default `--max-stories 1`.
- **`--dry-run`** flag (anywhere in args) — pass through to the Python CLI.
- **`--skip-triage`** flag (anywhere in args) — skip the Step 1.5 readiness pre-flight. Default is to run it.
- **`--auto`** flag (anywhere in args) — autonomous hybrid mode. Changes Step 1.5 (any non-GREEN triage hard-stops instead of asking) and Step 6 (rote gates auto-confirm, the cross-actor runs with `--auto-confirm-bracket`, a clean PASS auto-ships via `/epic-story-complete --yes`, and anything non-nominal hard-stops). The merge always stays manual. Default is interactive. Designed for the single-story flow (`--max-stories 1`); for batches it processes each produced story in wave order and stops at the first non-nominal one.

## Step 1 — Sanity-check the board

Read `.claude/skills/epic-next/epic.<board>.json`. Extract:
- `hybridMode` (default `false` if absent). Hybrid boards must carry a `crossActor` config block (consumed by `/epic-cross-actor-test`).
- `name` (the epic's human-readable name) — for the announcement banner

If the file is missing, surface the path and the list of available boards. Stop.

## Step 1.5 — Pre-flight readiness triage (fail-fast gate)

> Skip this step if `--skip-triage` is set, or if `--dry-run` is set (dry runs don't implement anything, so there's nothing to gate).

The runner is sequential and fail-fast: it spawns a fresh full Claude session per story (5–15 min each) and only discovers an unworkable story *after* sinking that session into it and missing the success contract. A ~30–60s read-only triage up front catches the cheap-to-detect "not ready" cases (empty/thin description, hard dependency on unmerged work, load-bearing TBDs, named-but-missing artifacts, convention conflicts) and lets you avoid the wasted session.

Invoke the `epic-triage` skill with the same board + story count: `/epic-triage <board> <N>`. It runs the parallel triage workflow and returns a gate verdict. Act on it:

- 🟢 **GREEN** (all stories READY) → proceed to Step 2.
- 🟡 **AMBER** (next story implementable but flagged, or a *later* story in the batch is BLOCKED) → surface the finding(s). For a later-story BLOCKED in a batch, recommend reducing `<N>` so the runner stops before it (e.g. run only up to the last READY story), or fixing the blocked ticket first. Then ask the user whether to proceed; do not auto-skip the gate.
- 🔴 **RED** (the *next* story — the one the runner implements first — is BLOCKED) → **do NOT launch the runner.** Surface the blocker + the specific ticket, recommend the fix (offer to open the ticket), and stop. Starting the runner would burn a full session and fail the success contract. The user can re-run with `--skip-triage` to override if they disagree with the verdict.

**With `--auto`:** treat anything other than 🟢 GREEN as a hard stop — do NOT ask. Queue the auto-pause notification (`printf '%s' '<KEY|board> · auto-paused — triage <AMBER|RED>' > /tmp/claude-notify-message.txt`), surface the verdict + findings, and stop. An unattended run can't pause for an answer, and a non-GREEN top-of-board is exactly the case a human should eyeball before a session is spent.

This gate runs **before** Step 3 (dev server agent) and Step 4 (the CLI) — so a RED verdict aborts cheaply, before any server is spawned or any implementation session starts.

## Step 2 — Surface what's about to happen

Show the user a single block before launching the pipeline:

```
About to run epic-runner:
  Board:        <board>
  Epic:         <config.name>
  hybridMode:   <true | false>  →  <hybrid | autonomous> behaviour
  mergeMode:    <pr | epic-branch>   <if epic-branch: → epic branch config.epicBranch>
  Max stories:  <N>
  Dry run:      <yes | no>
  Auto:         <yes | no>   (--auto → autonomous: rote gates auto-confirm, non-nominal hard-stops, merge stays manual)
  Target repo:  <REPO_ROOT>   (the invoking workspace, resolved in Step 4a — work lands HERE)

Workflow after the runner exits:
  <hybrid>     →  /epic-cross-actor-test <board> <scenario>   (interactive)
                  then /epic-story-complete (PR mode: commit + PR + merge + /post-merge-cleanup;
                  epic-branch mode: commit onto config.epicBranch + push + → Done)

  <autonomous, PR mode>       →  review the PR, merge it (`gh pr merge <PR> --squash --auto --delete-branch`)
                                 then /post-merge-cleanup
  <autonomous, epic-branch mode> →  each story is committed onto config.epicBranch automatically (no per-story PR);
                                 when the epic is complete, open ONE PR (config.epicBranch → main)
```

No confirmation gate is required — this is a foreground command the user explicitly asked for via `/epic-pipeline`. Just run it.

## Step 3 — (Hybrid boards only) Launch the dev server agent

Applies when `hybridMode === true`. For autonomous boards, skip this step — the pipeline does impl + `/epic-story-complete` with no browser phase, so no persistent server is needed.

The post-runner cross-actor verification (Step 6) drives a real browser against a running dev server and must learn within seconds if the impl branch introduced a compile error — otherwise a TS error in a freshly-added file masquerades as a propagation / data bug and burns 5–10 min (lesson from REX-368, 2026-05-23). Rather than ask the user to babysit the server or arm a passive log Monitor in this session, **delegate the dev server's whole lifecycle to a dedicated background teammate — the "dev server agent."** It clears the Nx cache, launches the domain's server, watches it for build errors, and reports them back to this session (the orchestrator) so they get fixed before the browser phase.

### 3a — Resolve the app's serve command + port + log file

The server is determined by the board's `config.app`. Look the values up in `docs/reference/commands.md` (§ Dev servers). This repo's apps:

| App | Serve command | Port | Log file |
|---|---|---|---|
| `apps/storybook-app` | `npm run storybook` | `4400` | `/tmp/ngx-storybook.log` |
| `apps/ledger` | `npm run s.app.ledger` | `4203` | `/tmp/ledger-dev-server.log` |

(Always use the conventional `/tmp/<app>-dev-server.log` path so `/epic-cross-actor-test <board>` Phase 0 reads the same log.)

> **No board here sets `hybridMode: true` today** — ngx-experiments has no auth / Firestore / multi-persona surface, so this step and the hybrid handoff in Step 6 stay dormant unless a future board opts in.

### 3b — Create the team + spawn the dev server agent

1. Create the run's team (reuse it if it already exists from a prior run):
   ```
   TeamCreate({
     team_name: "epic-pipeline-<board>",
     agent_type: "orchestrator",
     description: "Epic pipeline run for <board>; dev server lifecycle delegated to a teammate.",
   })
   ```

2. Spawn the dev server agent as a **background teammate** — do NOT block this session on it:
   ```
   Agent({
     subagent_type: "general-purpose",
     team_name: "epic-pipeline-<board>",
     name: "dev server agent",
     run_in_background: true,
     description: "Own + monitor the <domain> dev server",
     prompt: <the standing contract below>,
   })
   ```

**Dev server agent — standing contract (its `prompt`):**

> You are the **dev server agent** on team `epic-pipeline-<board>`, owning the `<domain>` dev server for this session. Report everything to the team lead via `SendMessage` (find the lead's name in `~/.claude/teams/epic-pipeline-<board>/config.json` if you need it for the `to` field) — your plain output is invisible to the lead. Do this in order, then stay alive:
>
> 1. **Always clear the Nx cache first:** run `npx nx reset` (stops the Nx daemon + clears the cache so the server starts clean). Wait for it to finish.
> 2. **Launch the server detached, stdout → the log file** so it survives your own shutdown and is tailable: `<serve-command> > <log-file> 2>&1 &` (e.g. `npm run s.app.ledger > /tmp/ledger-dev-server.log 2>&1 &`).
> 3. **Health-check** until HTTP 200 — poll `curl -sS -o /dev/null -w "%{http_code}" http://localhost:<port>` every few seconds for up to ~120s.
>    - 200 → `SendMessage` the lead: `✅ dev server up on :<port>, initial bundle compiled.`
>    - timeout / failure (port already in use, `nx reset` failed, immediate build failure) → `SendMessage` the lead the exact failing log lines, then stop. Do not retry forever.
> 4. **Watch the log for build errors for the rest of the session.** Arm a persistent Monitor on the log:
>    `tail -f <log-file> | grep -E --line-buffered "ERROR|TS[0-9]+|✘|Application bundle generation complete"`.
>    Each compile cycle wakes you with a Monitor event — translate it into a `SendMessage` to the lead:
>    - a line with `✘` or `ERROR TS####` (or any `ERROR`) → `SendMessage`: `❌ BUILD ERROR:` followed by the full error text (file, line, message) so the lead can fix it.
>    - `Application bundle generation complete` → `SendMessage`: `✅ bundle complete — <domain> live.` (keep it brief).
> 5. **Stay alive** — do not exit after launching; you are the standing server owner. If the lead messages you ("status?"), tail the log and report the current state. Shut down only on a `shutdown_request`; **leave the detached server process running** on shutdown so it persists across sessions (workspace convention).

This session does NOT block on the agent — proceed to Step 4. The agent's "server up" / build-error messages auto-deliver as new turns; during the blocking runner call (Step 4) they queue and arrive when it returns — exactly when the cross-actor phase needs them.

## Step 4 — Invoke the Python CLI

### 4a — Resolve + guard the target repo

The runner implements in whatever repo `--repo` points at. Its CLI **default** is a clone sitting next to the `epic_runner` checkout (`src/epic_runner/paths.py` → `DEV_REX_1/gigasoftware`) — NOT necessarily the workspace you ran `/epic-pipeline` from. To make the pipeline operate on the **invoking workspace** (consistent with interactive `/epic-next`, which cuts its branch in your cwd), resolve that workspace's git root and pass it explicitly as `--repo`:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
```

Capture it **before** the launch command's `cd` into the `epic_runner` directory (the `cd` changes cwd out of the workspace, so a later `git rev-parse` would resolve the wrong repo).

**Clean-tree guard — REQUIRED.** The runner does `git checkout main` + `git pull --ff-only` + cuts a new branch *in this repo*. Now that it targets your live workspace, a dirty tree would be disrupted. Before launching, confirm the tree is clean:

```bash
git -C "$REPO_ROOT" status --porcelain
```

If that prints **anything**, do NOT launch — surface the dirty paths and tell the user to commit/stash first (or re-run passing an explicit clean `--repo`). You need not be on `main`: `/epic-next` checks out `main` itself from any clean branch.

### 4b — Invoke the CLI

Run from the epic_runner directory, passing the resolved `--repo` (capture `REPO_ROOT` in the same command, before the `cd`):

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)" \
  && cd /Users/gigasoftware_developer/Dev/DEV_REX_1/epic_runner \
  && uv run python -m epic_runner --board <board> --max-stories <N> --repo "$REPO_ROOT" [--dry-run]
```

The runner streams its output to stdout — every per-story banner lands at the end with the `═` divider so the user can see progress.

Long-running: a single autonomous story is typically 5–15 minutes; hybrid stories tend to be shorter (impl-only). The foreground Bash timeout caps at 10 min, so launch the CLI with `run_in_background: true` (it re-invokes you on exit and still mirrors to `runs/<timestamp>.log`); read the task output file for the final banner. The same background approach applies to longer batches.

## Step 5 — Handle the exit

Parse the last `══════` banner to extract the per-story status. Two shapes:

### Hybrid mode banner
```
✓ STORY <N> READY FOR ACTOR TEST
  Jira:     <KEY>
  Branch:   <branch>
  Scenario: <scenario>
```

### Autonomous mode banner
```
✓ STORY <N> PR OPENED
  Jira:     <KEY>
  PR:       <PR URL>
```

Surface a concise summary back to the user:

```
Epic pipeline complete — <N> / <max> stories.

<for each successful story:>
  <KEY> — <branch | PR URL>
    next: <cross-actor scenario | review-and-merge instruction>
```

## Step 6 — Handoff

> **Desktop notification (do this FIRST, before the path-specific handoff below).** The user runs `/epic-pipeline` as a long unattended run and wants a macOS ping the moment it needs them. Queue one by writing a one-line status to the notification handoff file — the global Stop hook fires it (persistent terminal-notifier Alert) when this turn ends:
> - **Hybrid path:** `printf '%s' '<KEY> · ready for actor test — /epic-cross-actor-test <board> <scenario>' > /tmp/claude-notify-message.txt`
> - **Autonomous path:** `printf '%s' '<KEY> · PR #<N> opened — review & merge' > /tmp/claude-notify-message.txt`
> - **Batch (N>1):** summarize, e.g. `printf '%s' '<done>/<max> stories — next: <KEY> <action>' > /tmp/claude-notify-message.txt`
> - **`--auto`:** skip this ready-for-actor-test ping — the run continues unattended, so it isn't the milestone. The terminal notification is instead `/epic-story-complete`'s story-complete ping (on auto-ship) or the auto-pause ping (on a hard-stop).
>
> Write exactly one message (it is consumed + deleted on read). Use the real KEY/scenario/PR values resolved in Step 5. **Message body format is `<KEY> · <task>` — lead with the Jira key (it already encodes the board, so do NOT add the board name separately). Do NOT include the repo name or path either; the Stop hook auto-stamps those as the notification title (repo basename) + subtitle (`~`-relative repo root) from the session's cwd.** If the file write fails, ignore it — never let a notification failure block the handoff.
>
> **Canonical notification behavior** (handoff file, `<KEY> · <task>` body, `CLAUDE · <status>` title + `~`-repo-path subtitle auto-stamped by the global Stop hook in `~/.claude/settings.json`) is shared across `/epic-pipeline`, `/epic-story-complete`, `/epic-next`, and `/notify`, and documented in the notify memory. If you change the format, update all of them together.

### Hybrid path

**First, reconcile the dev server agent's reports.** By now the agent (Step 3) should have sent `✅ dev server up` and, after the impl branch compiled, `✅ bundle complete`. Confirm the live compile state by reading the **static** log directly — `grep -nE "Application bundle generation complete|✘|ERROR TS[0-9]+" /tmp/<app>-dev-server.log | tail` — and check the newest event is a clean bundle with no error line after it. **Do NOT trust monitor *silence* as green** (the streaming `tail -f | grep` can miss ANSI-wrapped error lines — lesson 2026-05-29; a static grep matches them). If the agent reported a launch failure, resolve it (e.g. free the port) and confirm `✅ dev server up`. (If you've heard nothing from the agent, `SendMessage` it `status?` and wait.)

- **Interactive (default):** if the branch doesn't compile, fix it on the branch now (the agent re-reports green once the fix recompiles) before driving the browser — a stale-compile server makes the new code look absent in the verifier UI.
- **`--auto`:** if the branch is not a confirmed green bundle, **do NOT fix it** — hard-stop and report. A compile error or any needed code fix is exactly the "interesting" case `--auto` escalates to a human.

Do not enter the cross-actor scenario until the latest signal is a confirmed green bundle.

**Then drive the cross-actor verification — behaviour depends on `--auto`:**

- **Interactive (default):** ask the user whether to run it now in this same interactive session:
  ```
  Story <KEY> is ready for cross-actor verification. Run /epic-cross-actor-test <board> <scenario> now?
    yes  — start the test in this session
    no   — leave the branch as-is; user will drive it later
  ```
  If yes: invoke `/epic-cross-actor-test <board> <scenario>` with the printed scenario as args. On PASS, recommend `/epic-story-complete` — do not auto-run it.

- **`--auto`:** do NOT ask. Invoke `/epic-cross-actor-test <board> <scenario> --auto-confirm-bracket` directly (the flag built for orchestrator contexts that own the test brokerage exclusively — it auto-runs the before/after seed brackets with no Y/Enter prompts). Then evaluate the Phase 6 outcome:
  - **Clean PASS, zero findings** — status `success`, no gaps/findings (**even non-blocking notes**), no fix-in-place, dev server stayed green throughout → **auto-ship:** invoke `/epic-story-complete --yes` (confirmation gate skipped). PR mode → commit + push + PR + ticket → In Review; surface the PR, then **stop at the merge** (`--auto` never merges — show the autonomous-path merge command). Epic-branch mode → commit onto `config.epicBranch` + push + ticket → Done; surface the commit (no per-story PR to gate on).
  - **Anything else** — `partial` / `failed` / `blocked`, a surfaced gap or finding (**including a non-blocking one like a deploy-lag note**), a compile error, or any code fix needed mid-test → **hard-stop and report.** Do NOT auto-ship. Queue the auto-pause notification (`printf '%s' '<KEY> · auto-paused — <short reason>' > /tmp/claude-notify-message.txt`), surface the cross-actor report + exactly what tripped the stop, and leave the branch in place for the user. *Automate the boring path; escalate the interesting one.*

For a **batch** (`--max-stories N > 1`) under `--auto`: process each story the runner produced in wave order with the per-story logic above, and **hard-stop on the first non-nominal story** (remaining produced branches are left for the user). `--auto` is most predictable at `N = 1` (the default).

### Autonomous path

After surfacing the banner:

- **PR mode:** do NOT auto-merge — the user reviews the PR manually. Show the suggested commands as a literal block (don't actually run them):

```
  gh pr view <PR-number>
  gh pr merge <PR-number> --squash --auto --delete-branch
  /post-merge-cleanup
```

- **Epic-branch mode:** there is no per-story PR — `/epic-story-complete` already committed the story onto `config.epicBranch` and transitioned it to Done. Nothing to merge per story. For genuinely PARALLEL same-wave stories, the runner can spawn native `isolation: worktree` subagents rooted on the epic branch (set `worktree.baseRef:"head"` in settings + be on the epic branch; `.worktreeinclude` copies gitignored config; each agent installs deps per the docs). When the whole epic is complete, surface the single epic-landing block for the user to run (don't run it):

```
  gh pr create --base main --head <config.epicBranch> --title "<epic key> <epic name>"
  # after it merges:
  /post-merge-cleanup <config.epicBranch>
```

## Error handling

> **On any failure that stops the run, queue a desktop notification before surfacing the error** so the user is pinged away from the terminal: `printf '%s' '<KEY> · PIPELINE FAILED — <short reason>' > /tmp/claude-notify-message.txt`. Lead with the failing story's Jira key when one is in play; if the failure is pre-story (no key yet — e.g. board config missing, dev server port in use), fall back to the board name: `printf '%s' '<board> · PIPELINE FAILED — <short reason>'`. Keep `<short reason>` to a few words. The Stop hook auto-stamps the repo name + path, so never put those in the body. Then proceed with the detailed surfacing below. Ignore write failures.

- **Board config missing** → list available boards from the skill directory, stop.
- **`--board` missing** → ask the user via AskUserQuestion (do not default).
- **Pipeline exits non-zero** → surface the last 30 lines of the log file (`/Users/gigasoftware_developer/Dev/DEV_REX_1/epic_runner/runs/<latest>.log`) and stop. The branch is left in place for the user to inspect.
- **Hybrid + dev server agent can't reach HTTP 200** (port already in use, `npx nx reset` failed, or the initial build failed on a clean tree) → the agent `SendMessage`s the failing log lines; surface them and stop. Resolve the conflict (e.g. kill the stale process holding the port) and re-spawn the agent before driving the cross-actor phase. Never drive the browser without a healthy server + a green bundle report.

## Notes

- The runner spawns a fresh Claude Code session per story (`claude-agent-sdk`'s `query()` with `setting_sources=["project", "user"]` + `skills="all"`). The session inherits this repo's `.claude/` config (the standards-injection hook, `docs/`, the per-library `AGENTS.md` files) and the full skill set.
- Logs land at `/Users/gigasoftware_developer/Dev/DEV_REX_1/epic_runner/runs/YYYYMMDD-HHMMSS.log`. They're invaluable for debugging a failed run — stdout mirrors them but the file persists.
- On a hybrid board, every story carries a cross-actor scenario hint via the `READY_FOR_ACTOR_TEST <scenario>` line. If the line is missing or malformed, the runner reports the story as failed — fix the inner session's instruction before retrying.
- `hybridMode` is a per-board flag in `.claude/skills/epic-next/epic.<board>.json`. Toggle it if a board's verification needs change (e.g. a board adds a cross-actor requirement mid-stream).
- **Dev server agent (hybrid only):** the dev server is owned by a background teammate named `dev server agent` (Step 3) — not by this session directly, and not by the Python runner. It runs `npx nx reset` → the app's serve command (detached, logging to the conventional `/tmp/<app>-dev-server.log`) → a persistent build-error Monitor, and reports `✅ server up` / `✅ bundle complete` / `❌ BUILD ERROR` to the orchestrator via `SendMessage`. It launches the server detached so it survives the agent's shutdown (workspace convention: leave the dev server running across sessions). The app → serve-command/port/log mapping lives in `docs/reference/commands.md`.
- Pairs naturally with `/epic-next <board>` (interactive single-story flow). `/epic-pipeline` is the autonomous-runner equivalent.
- **Pre-flight triage (Step 1.5):** `/epic-triage <board> [N]` runs a parallel read-only readiness check before the runner so a blocked/under-specified next story aborts the run in ~30–60s instead of after a wasted 5–15 min implementation session. On by default; `--skip-triage` bypasses it. It can also be run standalone any time to gauge whether the top of a board is worth starting.
