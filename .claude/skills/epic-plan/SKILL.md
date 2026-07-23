Plan or re-plan an Angular epic: fetch all child stories, analyse route depth and dependencies, organise into conflict-minimising waves (root routes first, deeper routes later), write the wave plan to the epic's local plan file (gigasoftware-plans), and create/update the `epic.<board>.json` config for `/epic-next`.

**Usage:** `/epic-plan <EPIC-KEY>`

Examples: `/epic-plan NGE-10`, `/epic-plan NGE-42`

---

## Step 1 — Enter plan mode

Call `EnterPlanMode` immediately.

## Step 2 — Parse argument and resolve board name

Read `$ARGUMENTS`. Extract the epic key (e.g., `NGE-10`). Parse the **key prefix** — the uppercase letters before the first `-` (e.g. `NGE`).

**Optional directives in the args:**
- **`using the key <board>`** (or `--board <board>`) — override the auto-resolved board name with `<board>` (e.g. `using the key twilio` → board `twilio`). Use this to give an epic its own board instead of overwriting an existing same-prefix board's config.
- **`epic-branch`** (or `--epic-branch` / `epic`; `worktree` accepted as a back-compat alias) — set `mergeMode = "epic-branch"` for this board: every story is committed directly onto a shared epic branch (no per-story PRs); the epic lands on `main` via one PR at the end. Absent → `mergeMode` carries forward from the base config, else defaults to `"pr"` (the per-story-PR "git flow"). Save `mergeModeArg` = `"epic-branch" | null`.

**Resolve board name automatically** (unless `using the key <board>` overrode it):

Read all files matching `.claude/skills/epic-next/epic.*.json`. For each file, read the `epicKey` field and extract its prefix. Find the file whose prefix matches the argument's prefix.

- **Match found** → the board name is the `*` portion of the filename (e.g., `epic.nge.json` → `nge`). Load the entire matching config as the **base config** to carry forward unchanged fields (e.g., `app`, `libraries`, `conventions`, `designReferences`).
- **No match** → board name = lowercase of the prefix (e.g., `NGE` → `nge`). A new config will be created from scratch; seed the workspace fields from `.claude/skills/epic-next/config-template.json` and prompt the user after Step 9 to confirm the app/library paths. **This is the default path in this repo** — no board config ships here.

Save: `epicKey`, `boardName`, `baseConfig` (may be null), `mergeModeArg`.

## Step 3 — Plans-repo access (board nav + content — NOT the MCP)

Board navigation and ticket content come from the **gigasoftware-plans** repo, not the Atlassian MCP (which returns a ~5.5k-char fat envelope per issue and ignores field-narrowing — a query for an epic's children is tens of KB). Canonical guide: `~/Dev/gigasoftware-plans/AGENTS.md`. Two commands:

- **Board nav** (child list + live status): `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py board --jql '<jql>'` → JSON `[{key,status,category,type,priority,parent,summary}]` (live status, ~200 B/issue).
- **Ticket content** (epic/story description): `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <KEY>` prints the local `<prefix>/<KEY>.md` path (migrating on-miss); then `Read` it.

No MCP tools or `cloudId` are needed — this skill only reads board status + content and writes the wave plan back to the epic's local plan file (Step 11); the script authenticates via `~/Dev/gigasoftware_secrets/jira.json`. (Status transitions in the downstream `/jira` + `/epic-story-complete` still use the MCP.)

## Step 4 — (Cloud ID no longer needed)

The plans script handles auth + `cloudId` via `~/Dev/gigasoftware_secrets/jira.json` — no `getAccessibleAtlassianResources` call. Proceed to Step 4.5.

## Step 4.5 — Verify the existing baseConfig isn't in flight (skipped if `baseConfig` is null)

Before this skill overwrites `epic.<boardName>.json`, check whether the **previously-configured** epic in that file is still active. Overwriting an in-flight epic's config silently strips the `/epic-next <boardName>` and `/epic-story-complete <boardName>` shortcuts that ongoing work depends on.

**Skip this step entirely if:**
- `baseConfig` is null (new board), OR
- `baseConfig.epicKey === epicKey` (re-planning the same epic, not switching to a new one)

Otherwise:

1. Fetch the existing config's epic status:
   ```
   python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py board --jql 'key = <baseConfig.epicKey>'
   ```
   → one-row JSON with the epic's `summary` + **live** `status`.
2. Inspect the row's `status` (or `category`):
   - **Done** → safe to overwrite. Note in the Step 9 confirmation block: "Replacing config for completed epic `<baseConfig.epicKey>` (Done)."
   - **Not Done** (Backlog / To Do / In Progress / In Review / etc.) → **ask the user before continuing.**

3. If the existing epic is not Done, ask via `AskUserQuestion` (or plain prompt if not loaded):

   ```
   The existing config at .claude/skills/epic-next/epic.<boardName>.json points at
   <baseConfig.epicKey> (<baseConfig.name>) — currently <status> in Jira (NOT Done).

   Overwriting would strip the /epic-next <boardName> and /epic-story-complete <boardName>
   shortcuts that anyone working on <baseConfig.epicKey> depends on.

   Options:
     [A] Overwrite anyway — <baseConfig.epicKey> loses its <boardName> shortcut.
         Choose this only if the in-flight work is paused / you'll re-plan
         <baseConfig.epicKey> later.
     [B] Create an alternate config file at:
         .claude/skills/epic-next/epic.<boardName>-<argEpicKey-lowercase>.json
         (board name becomes "<boardName>-<argEpicKey-lowercase>", invoked as
         /epic-next <boardName>-<argEpicKey-lowercase>)
         Both epics retain working shortcuts.

   Default: [B] (safer).
   ```

4. Record the user's choice as `configFileMode`:
   - `"overwrite"` → Step 12 writes to `epic.<boardName>.json` (replaces the existing config).
   - `"alternate"` → Step 12 writes to `epic.<boardName>-<argEpicKey-lowercase>.json` (new file alongside the existing one). The effective board name for the rest of the skill becomes `<boardName>-<argEpicKey-lowercase>` (used in summary output, completion message defaults, etc.).

5. If `configFileMode === "alternate"`, **do not** carry `app`, `libraries`, `routingFiles`, `conventions` forward from the existing baseConfig blindly — those describe the workspace and stay valid, but the user should confirm in Step 9. (For a same-domain alternate epic they're typically still right; record them as "carried forward (same workspace)" in the Step 9 disclosure.)

## Step 5 — Fetch the epic

```
epicPath=$(python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <epicKey>)
```

`Read $epicPath` — the epic's local plan file (`<prefix>/<epicKey>.md`, migrating on-miss). Its front matter carries the `summary`; its body is the description Step 6.5b inspects. Save the epic `summary` (used to derive the branch name).

## Step 6 — Fetch all child stories

```
python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py board --jql 'parent = <epicKey> ORDER BY created ASC'
```

Returns JSON `[{key,status,category,type,priority,parent,summary}]` for every child — the list plus **live** status, but **not** descriptions. For each story, note its `key`, `summary`, and `status`. The per-story **description** that Steps 6.5–7 analyse comes from the child's local plan file: for each child, `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <KEY>` then `Read` it (migrating on-miss).

> The `board` command paginates internally (100/page until exhausted), so it returns every matching child in one call — no manual `startAt` handling.

## Step 6.5 — Classify the epic + detect existing description content

**Why this step exists.** The route-depth heuristic in Step 7 is right for Angular UI epics (page builds, feature shells, route trees) but **wrong for backend / foundation / dependency-driven epics** (data pipelines, schema work, infrastructure). For the latter, route depth produces nonsense waves because most stories don't create routes at all. This step picks the right analysis path before the heuristic runs.

**Why this also exists.** Step 11 writes back to the epic description. If the description already has substantial curated content (Reference docs, Locked decisions, Constraints, hand-built Wave Plan, etc.), a blind rewrite can clobber it. This step records what's there so Step 9 can ask before overwriting.

### 6.5a — Classify the epic

Compute classification signals:

**Route-driven signals** (each child story checked):
- Description references an Angular route pattern (`/route/:param`, `/dashboard`, `/settings/profile`)
- Description references files under `config.libraries.ui` (component / page paths)
- Summary names a page or screen ("Contact Detail Page", "Settings Page", "Mobile Home")

**Dependency-driven signals** (each child story checked):
- Description contains "depends on NGE-XXX" / "blocked by" / "blocks NGE-XXX" / "prerequisite"
- Description references a shared foundation another story introduces: a design-token set or theme persona, a chart `core/*` primitive (axis / scale / gesture), a `with-*` signalStore feature, a public barrel export, a `tsconfig.base.json` path alias
- Description references build / tooling surfaces: `nx.json`, `eslint.config.mjs`, `jest.config.cts`, `.storybook/`, a generator or migration
- Summary names a foundation / primitive / token set / schema / codemod

**Decide:**
- Route signals dominate (≥ 70% of stories): `epicType = "route-driven"` (use Step 7 / 8 default analysis)
- Dependency signals dominate (≥ 70% of stories): `epicType = "dependency-driven"` (use Step 7b / 8b)
- Mixed (both signal sets significant, neither dominates): `epicType = "mixed"` (defer to user in Step 9)
- Unclassifiable (few signals either way): `epicType = "unknown"` (defer to user in Step 9)

### 6.5b — Detect existing description content

Read the epic description fetched in Step 5. Identify:

- **Section headings** present (e.g., `## Goal`, `## Scope`, `## Constraints`, `## Reference documents`, `## Wave Plan`, `## Acceptance Criteria`).
- **`## Wave Plan` exists?** boolean.
- **Substantial non-wave-plan content?** boolean — true if any sections beyond a one-line title exist outside the wave-plan section.
- **Linked decision / architecture docs** referenced inline in the description.

Save: `descriptionStructure`, `descriptionHasWavePlan`, `descriptionHasRichContent`, `descriptionLinkedDocs`.

### 6.5c — Provide diagnostic to user (no decision yet — Step 9 confirms)

Hold all the above for Step 9's confirmation block. Don't print anything yet; the user sees one consolidated picture in Step 9.

---

## Step 7 — Analyse stories (branch on `epicType`)

### Route-driven path (default for UI epics)

For **each story**, read its description and extract:

1. **Route path(s)** — the Angular route segment(s) this story creates or significantly modifies. Look for patterns like `/crm/:id`, `/dashboard`, `/settings/profile`. If none are explicit, infer from the summary (e.g., "Contact Detail Page" → `/crm/:contactId`).

2. **Route depth** — count the segments: `/dashboard` = depth 1, `/crm/:id` = depth 2, `/crm/:id/timeline` = depth 3. Assign `depth = 0` for stories with no new route (shared components, services, navigation shells).

3. **Parent story dependency** — if this story creates a child route (depth N), it depends on the story that creates the parent route (depth N-1). Identify which story in the set creates the parent, if any.

4. **Sibling conflict** — two stories conflict if they modify the **same existing component file** (not just the same parent route). Flag these as needing sequential execution within the same wave.

### 7b — Dependency-driven path (for backend / foundation epics)

For **each story**, read its description and extract:

1. **Explicit dependencies** — match patterns like `depends on NGE-XXX`, `blocked by NGE-XXX`, `prerequisite: NGE-XXX`. Build a directed edge from the dependency to this story.
2. **Implicit dependencies** — if a story description names a piece of shared code another story is building (e.g., "uses the `nge-axis` renderer from NGE-31"), add an edge from the building story to this consumer.
3. **Sibling conflict** — same as route-driven (two stories touching the same file = sequential within a wave).

Then build a **directed acyclic graph** (DAG) of stories. Topological depth (longest path from any root) becomes the wave assignment:
- Stories with no incoming edges → Wave 1
- Stories whose dependencies are all in Wave N → Wave N+1
- Cycles flagged as errors (must resolve before continuing).

### 7c — Mixed / unknown path

If `epicType` is `"mixed"` or `"unknown"`, present both candidate wave plans in Step 9 and ask the user which to use. Do not pick silently.

## Step 8 — Organise into waves

Apply these rules to produce a **wave plan**:

**Wave assignment:**
- `depth = 0` (shells, shared components, navigation) → Wave 1
- `depth = 1` (root-level pages) → Wave 1
- `depth = 2` (first child routes) → Wave 2, unless its parent is in an earlier wave already
- `depth = N` → Wave = max(wave of its parent dependency) + 1

**Within a wave:**
- Stories with no shared file conflicts → `parallel`
- Stories that touch the same component file → `sequential` (list them in dependency order)

**Ordering within a wave** (for the epic description):
- Parallel stories can appear in any order within the wave section
- Sequential stories must appear in the order they must execute

**Completeness check:**
- Every story must appear in exactly one wave
- If a story's parent route is not covered by any other story in the batch (it already exists in the app), treat it as depth 1

## Step 9 — Present analysis + wave plan, ask the user, exit plan mode

Present a single consolidated picture so the user can catch a wrong inference (epic type, description-rewrite intent, dependency edges) BEFORE any writes happen:

```
Epic: <epicKey> — <summary>
Board: <boardName>
Total stories: <N> (<done> Done, <todo> To Do, <inprogress> In Progress)

Epic type detected: <route-driven | dependency-driven | mixed | unknown>
  Route signals:      <X> stories (route patterns / page summaries / UI lib paths)
  Dependency signals: <Y> stories (depends-on links / backend / pipeline / schema)

Existing description content (from <epicKey>):
  Sections present:   <list of headings, e.g. Goal, Scope, Reference documents, Wave Plan, ...>
  Existing Wave Plan: <yes — N waves, M stories> | <no>
  Rich non-wave content: <yes — preserve required> | <no — safe to write fresh>
  Linked docs:        <list of doc paths referenced inline, if any>

Proposed Wave Plan (analysis mode: <route-depth | dependency-graph | both — pick one>):

Wave 1 (parallel) — <label>
  KEY-A  ...
  KEY-B  ...

Wave 2 ...

Config file: .claude/skills/epic-next/epic.<boardName>.json (will be <created | overwritten>)
Merge mode: <pr | epic-branch>  <if epic-branch: → epic branch <epicBranch>>
(PR mode: per-story feat/ branches derived at /epic-next time. Epic-branch mode: every story commits onto <epicBranch>; one epic PR at the end.)

Description rewrite policy options:
  [A] Replace ONLY the ## Wave Plan section; preserve all other sections verbatim
  [B] Append a new ## Wave Plan section at the end (existing sections including any old wave plan stay)
  [C] Skip description write entirely (config-only update)
  [D] Full rewrite (DESTRUCTIVE — only choose if you want a fresh description)

Default recommendation: <A if Wave Plan exists | B if no Wave Plan but rich content | C if user is hesitant | D never default>
```

Then call `ExitPlanMode`. Ask the user three questions explicitly (use AskUserQuestion if loaded, otherwise plain prompts):

1. **Epic type confirmation** — "Detected `<epicType>`. Use this analysis, or override (`route-driven` / `dependency-driven` / `mixed`)?"
2. **Wave plan acceptance** — "Accept the proposed wave plan above, or amend?"
3. **Description-rewrite policy** — "Pick A / B / C / D from the policy options above (default: `<recommendation>`)."

Proceed to Step 10 ONLY when all three are answered. If the user amends the wave plan, re-present and re-confirm before writing.

**Hard guardrails:**
- If `descriptionHasRichContent` is true and the user picked `D` (full rewrite), re-confirm with a destructive warning: "This will overwrite the existing curated description. Are you absolutely sure? (y/N)".
- If the user picked `C` (config-only), Step 11 is skipped.
- If `epicType` was `"unknown"` and the user didn't pick an override, stop with a diagnostic — don't guess.

---

## Step 10 — Derive config values

> **Merge mode + epic branch.** Set `mergeMode`: the explicit `epic-branch` directive from Step 2 (`mergeModeArg`) wins; else carry forward `baseConfig.mergeMode`; else default `"pr"`. When `mergeMode === "epic-branch"`, also derive `epicBranch` — use the current git branch if it already looks like this epic's integration branch (`git rev-parse --abbrev-ref HEAD`, e.g. `feat/nge-548-chart-token-migration`), else `feat/<epicKey-lower>-<slug-from-epic-summary>` (same slugging as `/epic-next`). In PR mode, per-story `feat/` branches are still derived at `/epic-next` time — no shared branch needed.

**JQL:**
```
parent = <epicKey> AND status = "To Do"
```

**Story ordering:** `"epic-description"` (we are writing the order to the description)

**Group label:** `"Wave"`

**Completion message:** `"All <epicKey> stories are complete!"`

**Phase note:** carry forward from `baseConfig.phaseNote` if it exists; otherwise `null`.

**Hybrid mode:** carry forward from `baseConfig.hybridMode` if it exists; otherwise `false`. New epics default to autonomous shipping (impl + `/epic-story-complete` via the `/epic-pipeline` runner). Set to `true` ONLY for epics whose Phase 6/7 verification requires `/epic-cross-actor-test` — this repo has no auth / Firestore / multi-persona surface, so **`false` is the right answer here**; leave hybrid mode alone unless a board grows a real cross-actor requirement.

**App/library/convention/designReferences fields:** carry forward from `baseConfig` unchanged. If `baseConfig` is null (new board), set placeholder values and note them to the user after writing.

## Step 11 — Write the wave plan to the epic's local plan file (skipped if user picked policy C)

The wave plan is written to the epic's local plan file, not Jira — `$epicPath` from Step 5 (`<prefix>/<epicKey>.md`; re-resolve with `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <epicKey>` if needed). **Never** `editJiraIssue` — Jira's description is a stub, not the content (`~/Dev/gigasoftware-plans/AGENTS.md` §4).

Branch on the description-rewrite policy chosen in Step 9:

### Policy A — Replace ONLY the `## Wave Plan` section

Locate the existing `## Wave Plan` section in the description (any heading-2 named exactly "Wave Plan", case-insensitive). Replace its contents (everything from that heading until the next heading-2 or the end of the document) with the new wave plan rendered below. **Every other section stays byte-identical.**

If no `## Wave Plan` heading exists despite the policy, fall back to Policy B.

### Policy B — Append a new `## Wave Plan` section

Append the rendered wave plan as a new section at the end of the description. Existing content (including any old wave plan if present — leave it as historical context) stays.

### Policy C — Skip

Do nothing here. The config in Step 12 still gets written.

### Policy D — Full rewrite (only after the destructive-warning re-confirm in Step 9)

Replace the entire description with a freshly-rendered version. This is the legacy behavior; only use it when the user explicitly asked for it.

### Wave plan rendering format (Markdown)

```
## Wave Plan

### Wave 1 — <label> (parallel)
- KEY-A: <summary>
- KEY-B: <summary>

### Wave 2 — <label> (parallel)
- KEY-C: <summary>
- KEY-D: <summary>

### Wave 3 — <label> (sequential)
- KEY-E: <summary>
- KEY-F: <summary>
```

The story keys must appear in the exact order `/epic-next` should execute them within each wave. Keys for sequential waves appear in dependency order.

**Keep every wave-plan entry to a single line** — `KEY — short summary` (an optional status marker like `_(DONE)_` / `_(To Do)_` / `_(To Do — BLOCKED)_` is fine). Do NOT paste per-story implementation detail, acceptance criteria, dependency essays, or follow-up specs into the epic — that content belongs in each child ticket (or the linked design docs). The epic description carries ONLY: the overall description, this one-line-per-story wave order, and — at most — a few high-level pivot/architectural-lock bullets. This keeps story scope readable from the child ticket alone and keeps the description well under Jira's ~32,767-char cap (a bloated epic will hit it).

`Write` (or `Edit`) the rendered wave plan into `$epicPath` (`<prefix>/<epicKey>.md`) per the chosen policy. **Never** call `editJiraIssue` — the content lives in the file, not Jira (`~/Dev/gigasoftware-plans/AGENTS.md` §4).

After writing, `Read` `$epicPath` back and diff it against the pre-write version. If a section the user expected to preserve has changed (substring fingerprint), surface a warning to the user with the diff — they can revert the file (it is git-tracked in gigasoftware-plans) or ask to re-run.

> **Optional — re-point Jira at the file.** Jira's description stays a stub. To refresh that stub (one-line summary + GitHub-blob link) after this write, run the DESTRUCTIVE stub pass (needs `write:jira-work`): `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py stub <epicKey>`. `/epic-next` reads the wave order from the local file regardless, so this only updates the Jira UI. (AGENTS.md §4.)

## Step 12 — Write the config file

The destination file path was determined in Step 4.5:
- `configFileMode === "overwrite"` (or step skipped) → `.claude/skills/epic-next/epic.<boardName>.json`
- `configFileMode === "alternate"` → `.claude/skills/epic-next/epic.<boardName>-<argEpicKey-lowercase>.json`

Write to the chosen path:

```json
{
  "name": "<epic summary>",
  "epicKey": "<epicKey>",
  "jql": "parent = <epicKey> AND status = \"To Do\"",
  "storyOrdering": "epic-description",
  "groupLabel": "Wave",
  "completionMessage": "All <epicKey> stories are complete!",
  "phaseNote": <from baseConfig.phaseNote or null>,
  "hybridMode": <from baseConfig.hybridMode or false — see notes above; flip to true for boards needing /epic-cross-actor-test>,
  "mergeMode": "<from baseConfig.mergeMode or 'pr' — 'epic-branch' for boards where every story commits onto a shared epic branch>",
  "epicBranch": <"feat/<epic-lower>-<slug>" when mergeMode is "epic-branch" (Step 10); null otherwise>,
  "commitScope": "<from baseConfig or derived from boardName>",
  "buildCommand": "<from baseConfig or null — e.g. 'npm run b.app.ledger', or 'npx nx run storybook-app:build-storybook' for a library-only epic. Run by /jira Phase 6 to catch type/barrel drift. Set to null only if there is no buildable app.>",
  "app": "<from baseConfig or placeholder>",
  "libraries": <from baseConfig or placeholder>,
  "routingFiles": <from baseConfig or []>,
  "conventions": <from baseConfig or []>,
  "designReferences": <from baseConfig or null>,
  "epicEvolutionRules": [
    "Capture architectural shifts in THIS epic. When a story surfaces a constraint, pivot, or gap, update the subsequent stories that depend on the decision; do not silently absorb the change in the current story, and do not split the work into a separate epic.",
    "Update downstream discovery / research stories with upstream decisions before they are picked up — discovery work should not re-derive choices that have already been settled in earlier stories of this epic.",
    "Add newly-discovered work as CHILD tickets of THIS epic — never as prose in the epic description. Create them 'To Do' if ready to be worked next (`/epic-next`'s JQL only picks up 'To Do' stories), or 'Backlog' if deferred / not-yet-ready. Reference each in the wave plan as a one-line `KEY — summary` entry.",
    "The epic description holds ONLY: the overall description, the wave order (one line per story, `KEY — summary`), and — at most — a few high-level pivot / architectural-lock bullets. NEVER put per-story implementation detail, acceptance criteria, locked-invariant prose, or follow-up specs in the epic; that detail lives in the child ticket whose scope it is (or the linked design docs). Scope must be readable from the child ticket alone. Keep the wave plan and the actual story set in sync as scope evolves — never let them drift, and never let an entry grow past one line."
  ]
}
```

**Always write `epicEvolutionRules` with the canonical text above** — do NOT carry forward an older value from `baseConfig`. This field is the canonical guidance for downstream skills (`/epic-next`, `/epic-story-complete`, `/epic-evolution-audit`) and human contributors on how to handle the inevitable mid-epic architectural shifts. If the canonical text changes in this skill, every re-plan picks up the latest version automatically.

If `baseConfig` was null (new board — the default in this repo), seed `app`, `libraries`, `routingFiles`, `conventions` and `buildCommand` from `.claude/skills/epic-next/config-template.json`, then output a warning listing exactly which of them you defaulted so the user can confirm or correct them.

## Step 13 — Summary

```
Done:
<If Step 11 ran:>
✓ Wave plan written to <epicKey> local plan file (<prefix>/<epicKey>.md)
  Policy used: <A — replace section only | B — append | D — full rewrite>
  <N> waves, <M> stories
  <If diff warning fired:> ⚠ Diff warning: <list sections that changed unexpectedly>
<Else (policy C — skip):>
○ Plan file NOT touched (policy C — config-only update)
</If>
✓ Config written: <configFilePath>
  <If configFileMode === "alternate":>
  ⚠ Alternate file (existing <baseConfig.epicKey> is <status>, not Done — preserved its shortcut)
  </If>
  epicKey:           <epicKey>
  storyOrdering:     epic-description
  jql:               parent = <epicKey> AND status = "To Do"
  epicType:          <detected type from Step 6.5>  ← informational; not stored in config
  epicEvolutionRules: ✓ canonical text written (downstream skills will read these)
  hybridMode:        <value written>
  <If hybridMode === false:>
  ⚠ hybridMode=false (autonomous shipping via /epic-pipeline). If this epic
    requires cross-actor browser-driven verification before shipping (i.e. needs
    /epic-cross-actor-test in Phase 6/7), hand-edit the config to
    hybridMode=true before running /epic-pipeline <boardName>.
  </If>

Run /epic-next <effectiveBoardName> to start the first story.
<If configFileMode === "alternate":>
(Note: <baseConfig.epicKey> work continues to use /epic-next <boardName> via the existing config.)
</If>
```
