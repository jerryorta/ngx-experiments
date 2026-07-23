Generic epic story orchestrator. Picks the next unstarted story (or N stories) from any configured epic and starts work on it on a **per-story feature branch** (PR mode) or **directly on the shared epic branch** (epic-branch mode).

**Usage:**
- `/epic-next <board>` — single story
- `/epic-next <board> N` — batch of N stories, processed **sequentially** (one `feat/` branch per story in PR mode; all committed onto the epic branch in epic-branch mode)
- `/epic-next <board> KEY-123` — specific ticket

**Branch model — set by `config.mergeMode`:**
- **`"pr"` (default / field absent):** every story gets its own `feat/<key>-<slug>` branch cut from `origin/main`. After `/jira` finishes its in-conversation phases, hand off to `/epic-story-complete` to commit + push + open the PR + transition the ticket to In Review. The next story starts fresh from a freshly-pulled `main`. No shared long-lived epic branches.
- **`"epic-branch"`:** every story is implemented in the main checkout **directly on the shared `config.epicBranch`** and committed there. `/epic-story-complete` pushes the epic branch and transitions the ticket to Done (no per-story PR). The whole epic lands on `main` via **one PR at the end**. Requires `config.epicBranch`. (Genuinely parallel same-wave stories are `/epic-pipeline`'s job via native `isolation: worktree` subagents — not a per-story mechanic here.)

**Available boards:** none ship with this repo — the skill family is here, the board data is not.

> Boards are defined by `epic.<board>.json` files in `.claude/skills/epic-next/`. Create the first one with `/epic-plan <EPIC-KEY>` against an epic in the **NGE** Jira project (`NGE-*`, "Ngx Exp"), or hand-author one from `config-template.json` in this directory. Run `/epic-config` to view or update a board config.

---

## Config schema reference

Each `epic.<board>.json` file defines:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable epic name |
| `epicKey` | string | Jira tracker epic key |
| `jql` | string | Full JQL query to find To Do stories |
| `storyOrdering` | `"jql"` \| `"epic-description"` | `jql` = use JQL result order directly; `epic-description` = parse ordered list from epic description then cross-reference |
| `groupLabel` | string | Label for story groupings shown in reports (e.g. `Priority`, `Wave`, `Track`) |
| `completionMessage` | string | Shown when no To Do stories remain |
| `hybridMode` | bool \| undefined | Consumed by the `/epic-pipeline` skill (autonomous runner). `true` = the spawned implementation session must stop short of `/epic-story-complete` and emit `READY_FOR_ACTOR_TEST <scenario>` — used when the epic requires interactive cross-actor verification before shipping (e.g. `actor` board). `false` / omitted = the spawned session runs impl + `/epic-story-complete` autonomously (PR opened + Jira → In Review, user merges manually). Has NO effect on `/epic-next` itself, which is always interactive. |
| `crossActor` | object \| undefined | Per-board cross-actor config consumed by `/epic-cross-actor-test` (dispatched by `/epic-pipeline`'s hybrid Step 6 when `hybridMode:true`). Holds `devServer` (serveCommand/port/logFile/healthCheckUrl), `firestorePathPrefix`, `testAnchorPath`, `bracketMode` (`skill`\|`npm`), `e2eHook` (`window.__cgE2E`\|null), `personas[]` (displayName/email/seedAnchorKey/authModel/role), and `scenarioCatalogMemory` + `browserProfilesMemory` slugs. Required when `hybridMode:true`. |
| `commitScope` | string | Angular commit scope (e.g. `charts`, `ledger`, `uidl`) — passed to `/epic-story-complete` |
| `buildCommand` | string \| null | Shell command that builds the epic's app (e.g. `npm run b.app.ledger`, or `npx nx run storybook-app:build-storybook` for a library-only epic). Run by `/jira` Phase 6 if set. Optional; omit or set to `null` to skip the build gate. |
| `app` | string | Main app path |
| `libraries.ui` | string | UI library path |
| `libraries.store` | string \| null | Store library path (omit if unused) |
| `libraries.designLibrary` | string \| null | Design library path |
| `routingFiles` | string[] | Routing files for conflict analysis and `/jira` plan-mode discovery |
| `conventions` | string[] | Project-specific conventions injected into the `/jira` handoff prompt |
| `designReferences` | object \| null | Design system pointers (`boardsIndex`, `spec`, `agentsFile`, `tokens`) |
| `epicEvolutionRules` | string[] \| null | Canonical guidance (from `/epic-plan`) for handling mid-epic architectural shifts. Surface to `/jira` for inclusion in the Phase 7 test plan when a shift gets surfaced. |
| `domainMemoryIndex` | string \| null | Filename of this board's domain memory index in the personal memory dir (e.g. `nge-index.md`; none exists for this repo yet, so `null` is the normal value here). Read in Step 0 so domain-specific Project/Reference memories load without bloating the always-on `MEMORY.md`. Omit / `null` to skip. |
| `mergeMode` | `"pr"` \| `"epic-branch"` \| undefined | How stories integrate. `"pr"` / absent (default) = per-story `feat/` branch → PR → `main`. `"epic-branch"` = every story is committed directly onto the shared `epicBranch` (no per-story PR); the epic lands on `main` via one PR at the end. |
| `epicBranch` | string \| null | **Epic-branch mode only (required).** The long-lived integration branch every story commits onto (e.g. `feat/nge-548-chart-token-migration`). |

> **Field history:** `mode` (the old orchestrated shared-branch driver, retired 2026-05-17) remains removed/ignored. `epicBranch` was removed at the same time but is **revived** as the integration branch for `mergeMode:"epic-branch"` boards (stories commit onto it directly; it is not the old orchestrated model).

---

## Step 0 — Load board config

Read `$ARGUMENTS`. The **first token** is the board name (e.g. `nge`).

Read `.claude/skills/epic-next/epic.<board>.json` and bind all fields as named variables used in every subsequent step. Refer to them throughout as `config.field` (e.g., `config.epicKey`, `config.commitScope`).

If no board name is provided, or the config file does not exist, list available `epic.*.json` files in the skill directory and stop.

**Load the board's domain memory.** After binding the config, if `config.domainMemoryIndex` is set, Read `/Users/gigasoftware_developer/Dev/gigasoftware-memory/memory/<config.domainMemoryIndex>` so the domain's Project + Reference memories are in context for the `/jira` handoff. The always-on `MEMORY.md` core already carries global feedback + shared references + user context; this loads the domain-scoped slice on top. Read-only, so it's fine before Step 1's plan mode. Skip silently if the field is null or the file does not exist yet.

## Step 1 — Enter plan mode

Call `EnterPlanMode` immediately. Steps 2–8 run inside plan mode. All Atlassian MCP calls are read-only and are permitted in plan mode.

## Step 2 — Parse remaining arguments

After stripping the board name, parse the remaining tokens:

- **Specific ticket** — if a token matches `[A-Z]+-\d+` (e.g. `NGE-200`): set `specificKey = token`, `batchSize = 1`. Skip Steps 5 and 6.
- **Batch** — if a token is a plain number: set `batchSize = N`, `specificKey = null`.
- **Default** — no remaining tokens: set `batchSize = 1`, `specificKey = null`.

## Step 3 — Plans-repo access (board nav + content — NOT the MCP)

Board navigation and ticket content come from the **gigasoftware-plans** repo, not the Atlassian MCP (which returns a ~5.5k-char fat envelope per issue and ignores field-narrowing — a 10-issue board query is ~55k chars). Canonical guide: `~/Dev/gigasoftware-plans/AGENTS.md`. Two commands:

- **Board nav** (which stories are To Do): `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py board --jql '<config.jql>'` → JSON `[{key,status,category,type,priority,parent,summary}]` (live status, ~200 B/issue).
- **Ticket content** (epic/story description): `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <KEY>` prints the local `<prefix>/<KEY>.md` path (migrating on-miss); then `Read` it.

No MCP tools or `cloudId` are needed here — the script authenticates via `~/Dev/gigasoftware_secrets/jira.json`. (Status transitions in the downstream `/jira` + `/epic-story-complete` still use the MCP.)

## Step 4 — (Cloud ID no longer needed)

The plans script handles auth + `cloudId` via `~/Dev/gigasoftware_secrets/jira.json` — no `getAccessibleAtlassianResources` call. Proceed to Step 5.

## Step 5 — Read the tracker epic description

> **Skip this step if `specificKey` is set** — jump straight to Step 7.
>
> **Skip this step if `config.storyOrdering === "jql"`** — jump straight to Step 6.

```
epicPath=$(python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <config.epicKey>)
```

`Read $epicPath` — the epic's local plan file (the source of truth for ordering once epics are stubbed). Parse it to extract the **ordered list of story keys** in the sequence they appear, top to bottom, preserving any section groupings (waves, tracks, etc.) as the `config.groupLabel` for each story.

## Step 6 — Find To Do stories via JQL

> **Skip this step if `specificKey` is set** — jump straight to Step 7.

```
python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py board --jql '<config.jql>'
```

Returns JSON `[{key,status,category,type,priority,parent,summary}]` — the To-Do stories (`config.jql` already filters to them), with **live** status straight from Jira.

## Step 7 — Pick the next N stories

> **Skip this step if `specificKey` is set** — jump straight to Step 8.

- If `config.storyOrdering === "jql"`: take the first `batchSize` stories from the JQL results directly.
- If `config.storyOrdering === "epic-description"`: cross-reference the ordered list from Step 5 against the JQL results. Take the first `batchSize` keys from the ordered list that appear in the JQL results.

For each picked story, note its `Key`, `summary`, and group name (from the `config.groupLabel` section it appears under, or from the `priority` field if ordering is `"jql"`).

If **no stories are in "To Do"**: report `config.completionMessage` and stop.

If fewer than `batchSize` stories remain, use however many are available.

## Step 8 — Present plan and exit plan mode

**If `specificKey` is set**, fetch the ticket details now:

```
python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py board --jql 'key = <specificKey>'
```

(one-row JSON with the key's summary + live status; run `ensure <specificKey>` + `Read` the plan file if you also need its full description).

Present the plan to the user. For each story, include the **planned branch name** (see Step 9a for the slug derivation):

For a single story:
```
Epic: <config.name> (<config.epicKey>)
Next up: <KEY> — <summary> (<config.groupLabel>: <group value>)
Branch: feat/<key-lower>-<short-slug>
```

For a batch:
```
Epic: <config.name> (<config.epicKey>)
Sequential batch (<count> stories, one PR each):
  1. <KEY> — <summary> (<config.groupLabel>: <group value>)
       branch: feat/<key-lower>-<short-slug>
  2. <KEY> — <summary> (<config.groupLabel>: <group value>)
       branch: feat/<key-lower>-<short-slug>
  ...
After each story finishes /jira, /epic-story-complete will commit, push, and open a PR.
The next story (if any) will be cut from a freshly-pulled main.
```

Then call `ExitPlanMode`. Implementation proceeds only after the user confirms they want to continue.

---

## Step 9 — Process the story (single or current item in batch loop)

This step is the unit of work. For a single story, run it once. For a batch (`batchSize > 1`), wrap Steps 9a–9d in a loop over the picked stories (Step 10 covers the batch driver).

### 9a — Create the per-story branch (PR mode) or check out the epic branch (epic-branch mode)

Derive the slug:
- Lowercase the ticket key (`NGE-200` → `nge-200`).
- Take the first 4–6 words of the Jira summary, lowercase, replace non-alphanumerics with `-`, collapse runs of `-`, trim leading/trailing `-`.
- Cap total length at ~60 chars. Drop trailing words to fit.

**PR mode (`config.mergeMode !== "epic-branch"`)** — cut a `feat/<key-lower>-<slug>` branch (e.g. `feat/nge-200-axis-grouping-tiers`) fresh from `origin/main`:

```
git checkout main
git pull --ff-only
git checkout -b feat/<key-lower>-<slug>
```

Report: `Created branch feat/<key-lower>-<slug> from origin/main at <short-sha>`.

**Epic-branch mode (`config.mergeMode === "epic-branch"`)** — work in the main checkout directly on `config.epicBranch`; the story is committed onto it (no per-story branch, no worktree). Ensure the epic branch exists and is current:

```
git fetch origin
# First story of the epic? Create the epic branch from origin/main:
#   git checkout -b <config.epicBranch> origin/main && git push -u origin <config.epicBranch>
# Otherwise check out the existing epic branch and fast-forward it:
git checkout <config.epicBranch> && git pull --ff-only
```

Every later step (the `/jira` hand-off, build/test, `/epic-story-complete`) runs in the main checkout on `config.epicBranch`. Report: `On epic branch <config.epicBranch> at <short-sha>`.

**If the epic branch has uncommitted changes** (e.g. a prior story left work mid-flight) → surface them and ask the user whether to continue on top or stash first; do not discard in-progress work.

### 9b — Hand off to /jira

Invoke the `jira` skill with the ticket key as the argument (equivalent to `/jira <KEY>`).

Pass these context hints to /jira so its plan mode is grounded:

- **Build command** — if `config.buildCommand` is set, ensure /jira Phase 6 runs it.
- **Conventions** — surface the entries from `config.conventions` so they appear in the implementation plan.
- **Design references** — if `config.designReferences` is non-null, point /jira at:
  - `config.designReferences.boardsIndex` (if set)
  - `config.designReferences.spec` (if set)
  - `config.designReferences.agentsFile` (if set — read this first)
  - `config.designReferences.tokens` (if set)
- **Epic evolution awareness** — if `config.epicEvolutionRules` is non-null, surface the rules verbatim and instruct /jira to call out any architectural shift in its Phase 7 test plan under an "Epic evolution items" subheading so the user can act on it before invoking `/epic-story-complete`.

Let /jira run its phases normally. It will NOT create a PR (Phase 6 is no-PR by design); `/epic-story-complete` handles that next.

### 9c — Hand off to /epic-story-complete

After /jira finishes and the user has reviewed the diff, invoke `/epic-story-complete` with the board + ticket key (it can also infer them from conversation context).

`/epic-story-complete` will commit the unstaged changes with a conventional-commit subject (`<type>(<scope>): <KEY> <summary>`), then, per `config.mergeMode`:
- **PR mode:** push the branch with `-u origin`, open the PR via `gh pr create` with the test plan in the body, and transition the ticket to **In Review** (`/post-merge-cleanup` handles → Done after the PR merges).
- **Epic-branch mode:** commit onto `config.epicBranch`, push it (`git push origin <config.epicBranch>`), and transition the ticket to **Done** (no per-story PR — the epic lands on `main` via one PR at the end).

### 9d — Single-story stop

If `batchSize === 1`, stop here. The user reviews the PR; `/post-merge-cleanup` runs after the merge.

> **Desktop notification (single-story only).** `/epic-next` is always interactive and is never invoked by `/epic-pipeline`, so the "not pipeline" condition is inherent — this path is safe to ping. The delegated `/epic-story-complete` (Step 9c) already wrote a completion line to `/tmp/claude-notify-message.txt` at its own Step 14; overwrite it here with a single-story-flavored message so the global Stop hook fires one persistent ping at turn end: `printf '%s' '<KEY> · single story complete — PR #<N> ready for review' > /tmp/claude-notify-message.txt`. Use the real KEY/PR values. **Body format is `<KEY> · <task>` — lead with the Jira key (it already encodes the board, so do NOT add the board name). Do NOT include the repo name or path either; the Stop hook auto-stamps those as the notification title + subtitle from the session's cwd.** One ping only (same session, file consumed once). Ignore write failures. **This applies ONLY to the single-story stop — the batch loop (Step 10) must NOT ping per story; see its note.**
>
> **Canonical notification behavior** (handoff file, `<KEY> · <task>` body, `CLAUDE · <status>` title + `~`-repo-path subtitle auto-stamped by the global Stop hook in `~/.claude/settings.json`) is shared across `/epic-pipeline`, `/epic-story-complete`, `/epic-next`, and `/notify`, and documented in the notify memory. If you change the format, update all of them together.

---

## Step 10 — Batch loop (skipped if `batchSize === 1`)

Process the picked stories **sequentially**, one full Step 9 cycle per story. Do not parallelize here.
- **PR mode:** every story gets its own branch off a freshly-pulled `main`.
- **Epic-branch mode:** each story commits onto the **current** `config.epicBranch` HEAD — so a story picked later in the batch already sits on top of the earlier ones. (Genuinely parallel same-wave stories are `/epic-pipeline`'s job — via native `isolation: worktree` subagents — not interactive `/epic-next`.)

For each story in `pickedStories` (in order):

1. **Sanity-check the starting point.** Before running Step 9a for this story:
   ```
   git checkout main
   git pull --ff-only
   ```
   This guarantees the next branch is cut from the latest main even if a previous PR in this batch has already merged.

2. **Run Steps 9a → 9b → 9c** for the current story.

3. **Inter-story confirmation gate.** After `/epic-story-complete` finishes (PR opened, Jira → In Review), pause before the next story.

   **First, suppress the per-story desktop notification.** `/epic-story-complete` Step 14 wrote a completion line to `/tmp/claude-notify-message.txt`; the user wants pings **only for the single-story flow, not per-story in a batch**. Clear it before the turn ends so no notification fires here: `rm -f /tmp/claude-notify-message.txt`. (The inter-story gate already keeps the user present at every boundary, so a ping is redundant.)

   Then present the gate:
   ```
   Story <KEY> done — PR #<N>: <PR URL>
   Next: <next-KEY> — <next-summary>
   Continue to the next story? (yes / stop)
   ```
   - **yes** → continue the loop.
   - **stop** → exit the batch cleanly. Report progress so far and remaining stories.

   This is a deliberate breakpoint. Long-running session, real PRs landing — let the user bail at any boundary.

After all stories complete (or the user stops), print a summary table:

```
Sequential batch complete — <config.name>:
| # | Ticket | Summary | <config.groupLabel> | Branch | PR |
|---|--------|---------|---------------------|--------|----|
| 1 | KEY-A  | ...     | High / Wave 1 / ... | feat/key-a-slug | #N |
| 2 | KEY-B  | ...     | High / Wave 1 / ... | feat/key-b-slug | #N+1 |
```

No further action — the user reviews each PR individually. `/post-merge-cleanup` handles per-PR cleanup after merges.
