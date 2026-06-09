Find the next unstarted COG UI implementation story (or a batch of N) and start work on it on a **per-story feature branch**.

Usage: `/cog-next` (single) or `/cog-next 3` (sequential batch of 3 — one branch + one PR per story)

<!-- Tracker Epic: EC-98 -->

> **PROTOTYPE PHASE** — Stories in this epic are building a UI prototype only. Do NOT implement
> real data services, API integrations, authentication, or business logic. Use mock data throughout.
> Mock all state with hardcoded fixtures or simple signals — NO NgRx store, NO real API calls.
> Follow the same pattern as the concierge app: lightweight, illustrative, flow-proving.

> **Branch model (changed 2026-05-17):** every story gets its own `feat/<key-lower>-<slug>` branch cut from `origin/main`. After `/jira` finishes its in-conversation phases, `/epic-story-complete` commits, pushes, opens a PR, and transitions the Jira ticket to In Review. The next story (if any) starts from a freshly-pulled `main`. No shared `feat/ec-98-…` epic branch.

---

## Step 1 — Parse arguments

Read `$ARGUMENTS`. If a number N is provided (e.g. `3`), set `batchSize = N`. Otherwise `batchSize = 1`.

## Step 2 — Load Atlassian MCP tools

Load the following tools via ToolSearch:
- `select:mcp__claude_ai_Atlassian__getAccessibleAtlassianResources`
- `select:mcp__claude_ai_Atlassian__getJiraIssue`
- `select:mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql`

## Step 3 — Get Cloud ID

```
mcp__claude_ai_Atlassian__getAccessibleAtlassianResources()
```

Save the `id` field as `cloudId` for all subsequent Jira calls.

## Step 4 — Read the tracker epic description

```
mcp__claude_ai_Atlassian__getJiraIssue(cloudId, issueIdOrKey="EC-98", fields=["description"], responseContentFormat="markdown")
```

Parse the description to extract the **ordered list of story keys** (e.g., `EC-10`, `EC-12`, …) in the sequence they appear, top to bottom, preserving wave groupings.

## Step 5 — Find To Do stories via JQL

```
mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql(
  cloudId,
  jql='key in (EC-10, EC-12, EC-17, EC-13, EC-18, EC-8, EC-3, EC-4, EC-1, EC-2, EC-9, EC-11, EC-7, EC-15, EC-6, EC-16, EC-14, EC-23, EC-5, EC-21, EC-22, EC-19, EC-20) AND statusCategory = "To Do"',
  fields=["summary", "status"]
)
```

## Step 6 — Pick the next N stories

Cross-reference the JQL results against the ordered list from Step 4. Take the **first `batchSize` keys in the ordered list that appear in the JQL results**.

For each picked story, note its `Key`, `summary`, and `Wave` name from the epic description section heading it appears under.

If **no stories are in "To Do"**, report: "All COG UI implementation stories are complete!" and stop.

If fewer than `batchSize` stories remain, use however many are available.

## Step 7 — Report to the user

For a single story:
```
Next up: <KEY> — <Story title> (Wave <N> — <Wave name>)
Branch: feat/<key-lower>-<short-slug>
```

For a batch:
```
Sequential batch (<count> stories, one PR each):
  1. <KEY> — <Story title> (Wave <N> — <Wave name>)
       branch: feat/<key-lower>-<short-slug>
  2. ...
After each story finishes /jira, /epic-story-complete will commit, push, and open a PR.
The next story (if any) will be cut from a freshly-pulled main.
```

---

## Step 8 — Process the story (single or current item in batch loop)

This is the unit of work. Single mode runs it once; batch mode (Step 9) loops it.

### 8a — Create the per-story feature branch

Derive the slug: lowercase the key (`EC-10` → `ec-10`), append `-` + the first 4–6 words of the Jira summary lowercased with non-alphanumerics replaced by `-`, collapse runs, trim, cap at ~60 chars total.

```
git checkout main
git pull --ff-only
git checkout -b feat/<key-lower>-<slug>
```

**If the branch already exists** (unusual — usually a partial re-run): ask the user whether to resume or pick a `-v2` suffix.

Report: `Created branch feat/<key-lower>-<slug> from origin/main at <short-sha>`.

### 8b — Hand off to /jira

Invoke the `jira` skill with the ticket key as the argument (equivalent to `/jira <KEY>`).

**PROTOTYPE PHASE override** — surface this to /jira:
- Use mock data only. No real APIs, NgRx store, or business logic.
- If a real service already exists, use it. Otherwise create a minimal mock with hardcoded fixtures or signals.

**Cognition conventions** — surface these to /jira's plan mode:
- App: `apps/cognition/app`
- UI library: `libs/cognition/ui`
- Design library: `libs/cognition/design-library` (CHECK HERE FIRST — use existing `cog-*` components, never rebuild)
- Themes: `libs/cognition/themes`
- Routing files:
    - Root: `apps/cognition/app/src/app/app.routes.ts`
    - Mobile: `libs/cognition/ui/src/lib/mobile-shell/mobile-shell.routes.ts` (or equivalent)
    - Desktop: `libs/cognition/ui/src/lib/desktop-shell/desktop-shell.routes.ts` (or equivalent)
- Signals: `input()` / `output()` — NO `@Input()` / `@Output()`
- DI: `inject()` — NO constructor injection
- Control flow: `@if`, `@for`, `@switch` — NO `*ngIf` / `*ngFor`
- NO Angular Material — use `@angular/cdk` instead
- NO shadows — tonal elevation via `--cog-surface-*` tokens only
- NO 1px borders — surface color shifts only
- NO pill shapes — `--cog-radius-md` (8px) everywhere
- Tailwind first; SCSS only for pseudo-selectors / child selectors / GSAP targets
- App components: default encapsulation + `:host {}` for styles
- Design library components: `ViewEncapsulation.None` + `host: { class: 'cog-component-name' }`
- Separate files: `.ts`, `.html`, `.scss`, `.spec.ts` — NEVER inline template/styles
- Jest only — NEVER Jasmine

**Design references** — Source of truth is the approved Stitch screens listed in the ticket. Also pass:
- Stitch boards index: `docs-projects/projects/cognition-redesign/cognition-stitch-boards.md`
- Design spec: `.stitch/cognition/DESIGN.md`
- Tokens: `libs/cognition/themes/src/lib/styles/_cog-tokens.scss`
- AGENTS.md: `libs/cognition/design-library/AGENTS.md` (read this first)

Let /jira run its phases normally. It will NOT create a PR (Phase 6 is no-PR by design); `/epic-story-complete` handles that next.

### 8c — Hand off to /epic-story-complete

After /jira finishes and the user has reviewed the diff, invoke `/epic-story-complete cog <KEY>` (or let it infer from branch + conversation). It commits with `feat(cognition): <KEY> <summary>`, pushes, opens a PR, and transitions the ticket to In Review.

### 8d — Single-story stop

If `batchSize === 1`, stop here. The user reviews the PR; `/post-merge-cleanup` runs after the merge.

---

## Step 9 — Batch loop (skipped if `batchSize === 1`)

Process the picked stories **sequentially**, one full Step 8 cycle per story.

For each story in `pickedStories` (in order):

1. **Sanity-check the starting point.** Before running Step 8a:
   ```
   git checkout main
   git pull --ff-only
   ```
   Guarantees the next branch is cut from the latest main even if a previous PR in this batch has already merged.

2. **Run Steps 8a → 8b → 8c** for the current story.

3. **Inter-story confirmation gate.** After `/epic-story-complete` finishes:
   ```
   Story <KEY> done — PR #<N>: <PR URL>
   Next: <next-KEY> — <next-summary>
   Continue to the next story? (yes / stop)
   ```
   - **yes** → continue the loop.
   - **stop** → exit the batch cleanly. Report progress so far and remaining stories.

After all stories complete (or the user stops), print:

```
Sequential batch complete — EC-98 (Cognition UI Implementation):
| # | Ticket | Summary | Wave | Branch | PR |
|---|--------|---------|------|--------|----|
| 1 | EC-10  | ...     | 1    | feat/ec-10-slug | #N |
| 2 | EC-12  | ...     | 1    | feat/ec-12-slug | #N+1 |
```

No further action — the user reviews each PR individually. `/post-merge-cleanup` handles per-PR cleanup after merges.
