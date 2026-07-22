Work on a Jira ticket: read ticket details, create a feature branch, plan the implementation, update the ticket with technical details, and start coding: $ARGUMENTS

## Prerequisites

Ticket **content** (description / implementation plan / acceptance criteria) lives in the **gigasoftware-plans** repo as `<prefix>/<KEY>.md` (prefix = lowercased key prefix, e.g. `arch/ARCH-213.md`), **not** in Jira — the Atlassian MCP returns a ~5.5k-char fat envelope per issue and ignores field-narrowing. Jira keeps **status** (transitions, assignees, comments). Read descriptions + board-nav from the plans repo via `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py` (it self-authenticates); use the MCP only for the cloud ID, a scoped metadata/comment read, transitions, and comments. Canonical guide: `~/Dev/gigasoftware-plans/AGENTS.md`.

This skill still makes MCP calls, so load the required MCP tools using the ToolSearch tool:

1. `select:mcp__claude_ai_Atlassian__getAccessibleAtlassianResources`
2. `select:mcp__claude_ai_Atlassian__getJiraIssue`
3. `select:mcp__claude_ai_Atlassian__addCommentToJiraIssue`
4. `select:mcp__claude_ai_Atlassian__getTransitionsForJiraIssue`
5. `select:mcp__claude_ai_Atlassian__transitionJiraIssue`
6. `select:mcp__stitch__get_project`
7. `select:mcp__stitch__list_screens`
8. `select:mcp__stitch__get_screen`

## Phase 1: Read the Jira Ticket

1. **Parse the ticket ID and flags** from `$ARGUMENTS`. If no ticket ID is present, ask the user for a ticket ID and stop. Recognized flags:
   - `--no-revalidate` — skip Phase 2.75 entirely. Use only for tickets you know are fresh.

2. **Get the Atlassian Cloud ID:**

   ```
   mcp__claude_ai_Atlassian__getAccessibleAtlassianResources()
   ```

   Use the `id` field from the response as `cloudId` for all subsequent Jira calls.

3. **Read the ticket.** The **description / plan / acceptance criteria** live in the plans repo, not Jira. Print the local file path (migrating on-miss) and read it:

   ```
   path=$(python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <KEY>)
   ```

   Then `Read $path`.

   For the status metadata + comments the local file does not carry, make a **scoped** MCP read — description dropped (it comes from the file above), no `expand="renderedFields"`:

   ```
   mcp__claude_ai_Atlassian__getJiraIssue(cloudId, issueIdOrKey, fields=["summary","status","assignee","reporter","priority","issuetype","comment","created","updated","labels","components"])
   ```

4. **Display a summary** to the user:

   ```
   Jira Ticket: <KEY> — <summary>
   Type: <issuetype> | Status: <status> | Priority: <priority>
   Assignee: <assignee> | Reporter: <reporter>

   Description:
   <description text>

   Comments: <count>
   <list comments if any>
   ```

5. **Save the ticket details** (key, summary, description, current status) for later phases.

6. **Fetch the ticket's sub-tasks.** A decomposed story carries its implementation detail in its sub-tasks, not its own description — so they MUST be pulled in. Enumerate them via the board script (live status, not the MCP):

   ```
   python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py board --jql 'parent = <KEY> ORDER BY created ASC'
   ```

   Returns JSON `[{key,status,category,type,priority,parent,summary}]` — the sub-task keys + summaries + live status, but **not** their descriptions (content lives in the plans repo, one file per key).

   - **If sub-tasks are returned:** for each sub-task, read its description from its own local file — `path=$(python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <SUBTASK-KEY>)` then `Read $path` — and treat **each sub-task's description as a required slice of this story's implementation** (the build checklist — not optional). Add them to the Phase 1 summary as `Sub-tasks: <count>` followed by each `<KEY> — <summary> [<status>]`, and carry every sub-task description into planning (Phase 3).
   - **If none are returned:** this is a leaf ticket — continue normally (no-op).

## Phase 2: Use Current Branch

1. **Check the current branch:**

   ```
   git branch --show-current
   ```

   Use whatever branch is currently checked out — do NOT create a new branch or switch to main.

2. **Transition to "In Progress"** unconditionally:
   - Get available transitions:
     ```
     mcp__claude_ai_Atlassian__getTransitionsForJiraIssue(cloudId, issueIdOrKey)
     ```
   - Find the transition with `name: "In Progress"` and use its `id`
   - Execute the transition:
     ```
     mcp__claude_ai_Atlassian__transitionJiraIssue(cloudId, issueIdOrKey, transition={id: "<transition-id>"})
     ```
   - If the ticket is already "In Progress", skip the transition call.

3. **Report** the current branch name and status change to the user.

## Phase 2.5: Fetch Design Comps

Before planning, extract any design references from the ticket and load the comp content so it informs the implementation plan.

### Detect design references

Scan the ticket description and comments for:

- **Stitch links** — any mention of a Stitch project/screen ID or URL (e.g. `stitch.gigasoftware.io`, `stitch project`, a `projectId` / `screenId`)
- **Figma links** — any `figma.com/file/...` or `figma.com/design/...` URL

### Fetch Stitch comps (if found)

1. Load the project overview:
   ```
   mcp__stitch__get_project(projectId)
   ```
2. List all screens:
   ```
   mcp__stitch__list_screens(projectId)
   ```
3. For each screen referenced in the ticket (or all screens if the ticket says "all"), fetch the full screen spec:
   ```
   mcp__stitch__get_screen(projectId, screenId)
   ```
4. **Summarize the comps** — layout, component names used, color tokens, spacing, typography, interactive states. Keep this summary concise; it will be passed into the planning context.

### Fetch Figma comps (if found)

Use `WebFetch` to retrieve the Figma embed URL or use the Figma share URL directly if it is publicly accessible. Capture the design description, component names, and any annotated specs visible from the URL. If the link requires auth (returns a login page), report to the user:

> "Figma link found but requires authentication — please paste the relevant comp screenshot or description."

Then wait for the user to supply it before proceeding.

### No design reference

If the ticket contains no Stitch or Figma reference, skip this phase and proceed to Phase 2.75.

---

## Phase 2.75: Pre-implementation Re-validation

> The ticket description was written at a point in time. By the time it is picked up, sibling stories may have shipped that moved files, renamed symbols, or made the proposed work already-done or obsolete. This phase grounds every code anchor in the description against the current repo state BEFORE planning. If anything has drifted, the description is replaced with revised instructions; if intent is unclear, the human is asked.
>
> **Audit focus, in priority order:**
> 1. **Every explicit file path mentioned in the description** — exists? moved? deleted? renamed?
> 2. **Every line-number reference** (`file.ts:N` patterns) — does line N still match the description's claim, or has the content shifted up/down (or vanished)?
> 3. Secondary anchors — function / class / type / slice / facade / route / Firestore path / callable names mentioned alongside the above.
>
> Files + line numbers are the primary drift surfaces. Secondary anchors are confirmatory signals.

### 2.75a — Skip conditions

Skip this phase if any of:
- `--no-revalidate` was passed in `$ARGUMENTS`
- The ticket description contains no file-path references AND no line-number references AND no symbol mentions (pure-prose / pure-acceptance-criteria ticket — nothing to ground)

Otherwise, run.

### 2.75b — Spawn re-validation subagent

Use the `Agent` tool with `subagent_type: general-purpose` and **`model: opus`**. Intent inference under drift is the most error-prone part of this skill (the dry-run on REX-389 produced one hallucinated drift finding under default model selection); the cost of an Opus run is justified by the cost of a wrong revised description landing in Jira. One foreground agent — the audit needs the full ticket in context.

Prompt template:

```
You are the pre-implementation re-validation agent for a Jira ticket about to be coded.

Your job: read the ticket description, ground every code anchor in the current repo
state, and decide whether the description is still actionable AS-IS.

If it is, return ALIGNED.

If it is not, infer the ORIGINAL INTENT of each drifted instruction (what was the
author trying to achieve?), then write a REVISED description that achieves the same
intent against the current code. Be conservative — when intent is ambiguous, flag it
as an open question rather than guess.

## Ticket

Key: <KEY>
Summary: <summary>
Description (current, from Jira):
<full description markdown>

## Audit dimensions (priority order)

PRIMARY — these are the must-audit anchors:

1. **Every explicit file path** mentioned in the description (every `libs/...`,
   `apps/...`, or relative path mention). For each:
   - Does the file exist at that path TODAY? (Read / Bash `ls`)
   - If not, has it been moved or renamed? (Bash `git log --diff-filter=R --follow`,
     `git log --diff-filter=D`, or grep the new tree for a matching basename)
   - Was it deleted with no replacement?

2. **Every line-number reference** of the form `file:N` or `file.ts:N` in the
   description. For each:
   - Read that exact line in the current file.
   - Does its content still match what the description claims is there?
   - If not, grep the file for the description's claimed content — has it shifted to
     a different line, or has it vanished entirely?
   - Distinguish line-number-drift (same content, different line) from
     structural-drift (content gone or changed).

SECONDARY — these are confirmatory signals, audited in service of the primary anchors:

3. Function / class / type / interface / slice / facade / selector / route /
   Firestore path / callable names mentioned alongside primary anchors. Confirm
   each still exists and matches the description's claimed shape (signature,
   members, location).

4. Acceptance-criteria items that reference any of the above.

## What to look for

For each anchor in the primary set, classify drift as one of:
- **Renamed** — same conceptual thing, new name; description should refer to the new name
- **Moved** — same content, different path; description's path should update
- **Removed-and-replaced** — original is gone; a sibling story shipped the replacement
- **Removed entirely** — gone with no replacement; description's premise is broken
- **Reshaped** — still there but signature/fields/types differ from the description
- **Already done** — the work the description proposes is already in the code
- **Line-shifted** — same content, different line number; trivial fix to the description
- **Now-obsolete** — a sibling story made the proposed work irrelevant

## Output

Return exactly one of two structured blocks:

REVALIDATION_RESULT_START
Verdict: ALIGNED
(no further content)
REVALIDATION_RESULT_END

OR

REVALIDATION_RESULT_START
Verdict: DRIFTED

Drift findings:
  - <anchor (path or path:line)> — <drift class from above> — <one-line impact on the description>
    Source quote: "<verbatim substring from the description that introduced this anchor>"
  - ...

Intent inference (per drifted section of the description):
  - § <section name> — Original intent: <one sentence>. Confidence: high | medium | low.
  - ...

Open questions (only if any intent confidence is medium or low):
  - <question for the human, framed so a single sentence resolves it>
  - ...

Revised description (full markdown, ready to replace verbatim):

<the entire new description>

REVALIDATION_RESULT_END

## Rules of conduct

- Never invent code anchors. If you cannot verify something, surface it as an open
  question rather than guessing.
- **Source-quote requirement.** Every drift finding MUST carry a `Source quote:`
  sub-line containing a verbatim substring of the description (the text that
  introduced the anchor — file path, line reference, symbol name, etc.). If you
  cannot quote the anchor from the description verbatim, DROP THE FINDING —
  do not list it. This rule exists to suppress hallucinated drift findings.
- **Only list DRIFTED anchors in the drift findings block.** Aligned anchors stay
  silent — do NOT include them with an "Aligned" label or a "no drift on this
  anchor" note. The drift findings block exists exclusively to enumerate items
  the revised description will change.
- Preserve the description's existing structure (Summary / Files / Plan / AC / etc.) —
  revise the contents, not the skeleton.
- Preserve every acceptance-criteria checkbox. If an AC item is now obsolete, mark
  it ~struck-through~ with a one-line note rather than deleting it. The human
  decides whether to remove obsolete AC.
- Cite each drift finding with file_path:line_number (current state, not what the
  description claimed).
- If you find that the proposed work is already done, that IS drift — say so
  explicitly in findings and have the revised description either reduce scope to the
  remaining work or recommend closing the ticket.
- Line-shifted-only drift (content found, just at a different line) is real drift —
  fix the line numbers in the revised description.
```

### 2.75c — Parse + present

Parse the subagent output between `REVALIDATION_RESULT_START` / `REVALIDATION_RESULT_END`.

- **ALIGNED** → print one line ("✓ Description is current — no revision needed.") and continue to Phase 3.
- **DRIFTED** →
  1. Print the drift findings + intent inference.
  2. If any open questions exist, ask the user via `AskUserQuestion`. Cannot revise until they are answered. After answers come back, re-spawn the subagent with the answers folded into the prompt (under a new `## Human-resolved questions` section) so it can produce a final revised description.
  3. Otherwise, gate via `AskUserQuestion`: *"Replace ticket description with revised version? (yes / preview / no)"*
     - `preview` → print the full proposed new description, then re-ask
     - `yes` → proceed to 2.75d
     - `no` → continue to Phase 3 with the ORIGINAL description (the audit becomes informational only; the human implicitly accepts that the plan will be against the as-written description)

### 2.75d — Replace description + breadcrumb

The description lives in the plans repo — replace it **there**, not in Jira (never `editJiraIssue(fields={description})`; Jira's description is only a stub). `Edit` the local plan file you read in Phase 1 (`$path`, i.e. `~/Dev/gigasoftware-plans/<prefix>/<KEY>.md`): replace its **body** (everything below the front matter) with the revised description verbatim, preserving the `jira/project/board/type/epic/summary` front-matter block. You already read this file in Phase 1, so you have its current body to match against.

Then post a one-line breadcrumb comment so future readers know the description was re-validated (not modified by a human):

> *Pre-implementation re-validation (`/jira`, <today's date>) — description revised against current code state. Original preserved in the plans-repo git history.*

Use `mcp__claude_ai_Atlassian__addCommentToJiraIssue` with a minimal ADF document containing just that one paragraph.

Refresh the saved ticket details from Phase 1 (Step 5) with the revised description so Phase 3 plans against the up-to-date version.

### 2.75e — Autonomous-pipeline behavior

When invoked from `/epic-next` or `/epic-pipeline` (i.e. no human is sitting at the keyboard):

- If the subagent returns **ALIGNED**, proceed normally.
- If the subagent returns **DRIFTED**, **STOP the pipeline** and surface the findings to the user. Drift means the autonomous run cannot trust the description; a human must confirm the revised version (or modify it) before implementation continues. Never auto-revise + auto-continue.

---

## Phase 3: Plan the Implementation

1. **Discover relevant AGENTS.md files** before entering plan mode. Based on the ticket scope, identify which apps and libraries will be touched (inferred from the ticket description, domain keywords, or obvious feature area). Then read the AGENTS.md for each relevant path. Typical locations to check:

   - Root: `AGENTS.md`
   - Affected app: `apps/<app>/app/AGENTS.md`
   - UI library for the domain: `libs/<domain>/ui/AGENTS.md`
   - Store library: `libs/<domain>/store/AGENTS.md`
   - Shared design library: `libs/shared/ui-design-library-deprecated/AGENTS.md`
   - Domain-specific design library (if present): `libs/<domain>/design-library/AGENTS.md`
   - Theme library: `libs/<domain>/themes/AGENTS.md`

   Read each file that exists for the affected scope. These files define component conventions, CSS variable contracts, available reusable components, state patterns, and review checklists. **All of this must inform the plan.**

2. **Enter plan mode** using the `EnterPlanMode` tool. This will trigger codebase exploration and plan creation per the system's plan mode workflow.

3. **During plan mode**, use the ticket description, comments, **every sub-task description from Phase 1** (each sub-task is a required slice of this story — the plan must cover all of them), acceptance criteria, **design comp summary from Phase 2.5**, and **AGENTS.md context** as requirements. Explore the codebase to understand:
   - Which files need to be created or modified
   - Existing `dlc-*` or domain-prefixed design library components that can be reused (check `libs/shared/ui-design-library-deprecated` and domain design-library)
   - Existing patterns and conventions to follow (from AGENTS.md files)
   - Dependencies and related code
   - Testing approach

4. **Write the plan** to the plan file as directed by plan mode.

5. **Present the plan** to the user for approval via `ExitPlanMode`.

## Phase 4: Update Jira Ticket

After the user approves the plan (i.e., after exiting plan mode):

1. **Post the implementation plan as a comment** on the Jira ticket using `mcp__claude_ai_Atlassian__addCommentToJiraIssue`. The comment body must be in Atlassian Document Format (ADF).

   Build the ADF document with this structure:

   ```json
   {
     "version": 1,
     "type": "doc",
     "content": [
       {
         "type": "heading",
         "attrs": { "level": 2 },
         "content": [{ "type": "text", "text": "Implementation Plan" }]
       },
       {
         "type": "heading",
         "attrs": { "level": 3 },
         "content": [{ "type": "text", "text": "Context" }]
       },
       {
         "type": "paragraph",
         "content": [
           { "type": "text", "text": "<1-2 sentence summary of the problem and approach>" }
         ]
       },
       {
         "type": "heading",
         "attrs": { "level": 3 },
         "content": [{ "type": "text", "text": "Changes" }]
       },
       {
         "type": "bulletList",
         "content": [
           {
             "type": "listItem",
             "content": [
               {
                 "type": "paragraph",
                 "content": [
                   { "type": "text", "text": "<file-path>", "marks": [{ "type": "code" }] },
                   { "type": "text", "text": " — <what changes>" }
                 ]
               }
             ]
           }
         ]
       },
       {
         "type": "heading",
         "attrs": { "level": 3 },
         "content": [{ "type": "text", "text": "Branch" }]
       },
       {
         "type": "paragraph",
         "content": [{ "type": "text", "text": "<branch-name>", "marks": [{ "type": "code" }] }]
       }
     ]
   }
   ```

   Call:

   ```
   mcp__claude_ai_Atlassian__addCommentToJiraIssue(cloudId, issueIdOrKey, commentBody=<ADF document above>)
   ```

   Populate the ADF with the actual plan content:
   - **Context**: A concise summary of the problem and the chosen approach
   - **Changes**: One bullet per file being created or modified, with the file path in code format and a short description of the change
   - **Branch**: The current git branch name

2. **Report** to the user:

   ```
   Jira ticket <KEY> updated:
   - Comment added with Implementation Plan
   - Branch: <branch-name>

   Ready to start coding.
   ```

## Phase 5: Start Coding

> **Never commit.** Do not run `git add` or `git commit`. Leave all changes unstaged for the user to review and commit manually.

Implement according to the approved plan using a **team of parallel agents**. Divide work into as many agents as makes sense for the scope, then run a mandatory review gate before proceeding to Phase 6.

### 5a: Parallel Implementation Agents

Use the `Agent` tool (subagent_type: `general-purpose`) to spawn parallel building agents. Divide work along natural boundaries — e.g. one agent per library, one per feature area, one per domain layer. Each agent receives:
- The full approved plan
- Its specific slice of files to create/modify
- All relevant context (existing patterns, imports, conventions from CLAUDE.md)

Each agent must:
- Follow all project conventions from CLAUDE.md
- Write unit tests alongside the code
- Run `npx nx run <project>:lint` and `npx nx run <project>:test` and fix any failures before reporting done

Typical split (adjust to ticket scope):
- **Store agent** (`general-purpose`) — state, services, guards in `libs/*/store`
- **UI agent** (`general-purpose`) — components, templates, styles in `libs/*/ui`
- **Wiring agent** (`general-purpose`) — app routes, app config, index exports in `apps/`

> If the work is small enough to fit in one agent, use a single `general-purpose` agent rather than splitting artificially.

> **Orchestrator rule:** Do not read implementation files yourself to prepare these prompts.
> Pass the plan text and the specific file list from the plan directly to each agent.
> Agents do their own codebase exploration — loading files into the main context here
> defeats the purpose of delegation.

### 5b: Mandatory Review Gate (run in parallel after 5a)

Once implementation agents complete, launch these review agents **in parallel** (single message, multiple Agent tool calls):

1. **AC Review agent** (`feature-dev:code-reviewer`)
   - Load the ticket description and acceptance criteria
   - Check every AC item: does the code satisfy it? Is any AC missing?
   - Report: `✓ AC met` / `✗ AC not met — <what's missing>`

2. **Unit Test agent** (`feature-dev:code-reviewer`)
   - Verify tests cover: component creation, key behaviors, edge cases, guard logic
   - Run `npx nx run <project>:test` and confirm all pass
   - Flag any missing coverage for critical paths

3. **Design Review agent** (`feature-dev:code-reviewer`) — *only if a Stitch design reference is in the ticket*
   - Compare component HTML/SCSS against the Stitch board referenced in the ticket (via `mcp__stitch__get_screen` if available, or screenshot)
   - Check: layout matches, typography matches, spacing/color tokens match, interactive states match
   - Report: `✓ Design matches` / `✗ Mismatch — <what differs>`

### 5c: Fix review findings

If any failures were reported in 5b, spawn a new round of fix agents (same `general-purpose`
split as 5a). Pass each agent the review findings relevant to its slice plus the original plan.
Each fix agent must re-run `npx nx run <project>:lint` and `npx nx run <project>:test` and
confirm clean before reporting done.

If 5b reported no failures, skip this step.

### 5d: Document deviations from the ticket

After fixes are applied, compare the final implementation against the original ticket AC and specs. If **anything was intentionally built differently** — due to architectural constraints, a better approach discovered during development, a spec ambiguity resolved a certain way, or a scope reduction — post a comment on the Jira ticket documenting it.

Use `mcp__claude_ai_Atlassian__addCommentToJiraIssue` with an ADF comment structured as:

```
## Implementation Notes

### Deviations from Spec
- **<AC item or spec section>** — Originally specified as X. Implemented as Y instead.
  *Reason:* <brief architectural/technical rationale>

### Decisions Made
- <Any ambiguity in the ticket that was resolved during development, and how>
```

**When to post this comment:**
- A guard, component, or route was structured differently than the ticket described
- A specified behavior was simplified, deferred, or replaced with a stub
- An AC item was partially implemented (note what's covered and what isn't)
- An architectural pattern was chosen that differs from any example in the ticket

**When to skip it:**
- The implementation matches the ticket exactly with no notable deviations

This comment becomes the authoritative record of why the code diverged from the spec, visible to future developers and the PM without needing to trace git history.

## Phase 6: Build, Lint, Test (no PR)

Do **not** create a PR per ticket. Instead:

1. **Build first** — catches type errors and module-resolution issues that lint and unit tests miss. For every affected project that declares a `build` target:
   ```
   npx nx run <project>:build
   ```
   If a project has no `build` target (pure test-only library), skip it. Use `npx nx show project <project> --json | jq '.targets | keys'` if unsure which targets exist. For the main app, also run the app's build target — a ticket that only touches libraries can still break the app build via barrel/type drift.
2. Run lint and tests for any affected projects:
   ```
   npx nx run <project>:lint
   npx nx run <project>:test
   ```
3. **Fix any failures before proceeding.** Build failures in particular block the PR when the epic ships — do not defer them. If a build failure is pre-existing (not introduced by this ticket), verify by stashing the diff and rebuilding on the base commit; report to the user and continue only if it reproduces clean.
4. Report results to the user.
5. The PR is created once for the entire epic branch when all tickets are complete.

## Phase 7: Generate Test Plan

> **This phase always runs** — even when Phase 6 is skipped.

After implementation (and PR if applicable), spawn a `general-purpose` agent to produce the test plan. Pass it:
- The ticket key, summary, and acceptance criteria
- The Stitch project name and screens from Phase 2.5 (project name, each screen's name and ID)
- The routes/pages touched by the implementation (derived from the plan)
- The app name inferred from the affected file paths

The agent must:
1. Read `docs/reference/commands.md` to find the correct serve command and port for the app
2. Write step-by-step navigation instructions to reach each affected route from the app's home screen
3. Output the test plan in this format:

```
Test Plan — <TICKET-KEY>

## Run the app
<serve command>
Open: localhost:<port>

## Navigate to the feature
1. <step — e.g. "Click the nav menu">
2. <step>
...

## Acceptance Criteria
- [ ] <AC item verbatim from ticket>
- [ ] <AC item verbatim from ticket>

## Design Validation (Stitch)
Board: <project name>
- <screen name> — https://stitch.withgoogle.com/projects/<projectId>/screens/<screenId> — verify: <what to check against the implementation>

## Edge Cases
- <anything tricky or non-obvious>
```

Print the test plan output in the conversation.

## Error Handling

- If `$ARGUMENTS` is empty, ask the user for a ticket ID and stop.
- If the ticket is not found, inform the user and stop.
- If on an unexpected branch, confirm with the user before proceeding.
- If the Jira comment fails, report the error but continue with coding — the update is non-blocking.
- If the transition fails, report it but continue.
- Never force push. Never discard uncommitted changes.
- **Never commit.** Do not run `git add` or `git commit` at any point during this skill. Leave all changes staged/unstaged for the user to review.
