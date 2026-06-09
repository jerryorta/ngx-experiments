Wraps up a finished epic story on its **per-story feature branch**: commit the unstaged changes (in strict Commitizen / `cz-conventional-changelog` format), push the branch, open a PR, and transition the Jira ticket to **In Review**. Designed as the natural session-end follow-up to `/epic-next` (which leaves changes unstaged after `/jira` finishes its in-conversation phases).

**Usage:**
- `/epic-story-complete` — preferred. Infer the board + ticket key from the current conversation context.
- `/epic-story-complete <board> <KEY>` — explicit override.
- `/epic-story-complete --no-push` — commit only, defer the push + PR + Jira transition.
- `/epic-story-complete --type=<type>` — override the conventional-commit type (default: inferred from ticket labels).
- `/epic-story-complete --yes` — skip the Step 7 confirmation gate (prints the pre-flight block for the record, then proceeds). For autonomous callers like `/epic-pipeline --auto`; only safe when the caller has already gated on a validated diff + clean cross-actor PASS.
- Flags compose: `/epic-story-complete <board> <KEY> --no-push --type=chore`.

**Available boards:** same as `/epic-next` — defined by `epic.<board>.json` files in `.claude/skills/epic-next/`.

> **Session model:** one story per session. The conversation that ran `/epic-next <board>`, planned via `/jira`, implemented it, and ran the build/test gate is the same conversation that invokes this skill. The branch in play is the per-story `feat/<key>-<slug>` cut by `/epic-next`.

> **Where this fits in the lifecycle:** `/epic-next` (pick + branch + /jira) → `/epic-story-complete` (commit + push + PR + → In Review) → reviewer approves + merges → `/post-merge-cleanup` (delete branch + → Done). This skill is the middle step.

---

## When to use

- After `/epic-next <board>` + `/jira <KEY>` complete a story and you've reviewed the unstaged diff.
- Tests, lint, and the build gate already passed during `/jira` Phase 6 — this skill trusts those results and does not re-run them by default. Pass `--build` if you want a final safety net.

## When NOT to use

- The branch is `main` or some unrelated branch — refuse and stop. This skill expects `feat/<key>-<slug>` from `/epic-next`.
- The work spans multiple stories and the diff is mixed — split the changes manually first, then run this skill once per story (each on its own per-story branch).
- The PR is already open for this branch — this is a finalize-once skill; subsequent edits on the same branch are handled by `git commit` + `git push` directly (the existing PR auto-updates).

---

## Step 0 — Resolve board + ticket key

Args are intentionally optional. Resolve in this order:

1. **Explicit args first.** If the args contain a board name (`rex` / `cog` / `vwb` / etc.) and a ticket key matching `[A-Z]+-\d+`, use them verbatim. Skip to Step 1.
2. **Branch fallback.** Read `git rev-parse --abbrev-ref HEAD`. The current branch should be `feat/<key-lower>-<slug>`. Extract the key from the first two segments after `feat/`. Match the key's prefix (e.g. `REX`) against each `epic.*.json`'s `epicKey` prefix to resolve the board.
3. **Conversation context.** If branch parsing fails, inspect the transcript for the most recent `/epic-next <board>` invocation and dominant in-progress ticket key.
4. **Last resort: ask.** Use `AskUserQuestion` with two questions: "Which board?" and "Which ticket key?". Do not guess.

Whatever path resolved them, **echo both values prominently in the Step 7 confirmation gate** so the user can catch a wrong inference before commits/push/PR/transition fire.

## Step 1 — Load board config

Read `.claude/skills/epic-next/epic.<board>.json` and bind all fields as `config.field`. The fields this skill consumes:

- `config.commitScope` — used as the conventional-commit scope
- `config.epicKey` — included in the PR body for traceability
- `config.buildCommand` — optional; used only if the user passes `--build` to re-run the gate
- `config.epicEvolutionRules` — optional; if non-null, drives the Step 5b epic-evolution check

If the config file does not exist, list available `epic.*.json` files in `.claude/skills/epic-next/` and stop.

## Step 2 — Parse remaining flags

After stripping board + ticket key (whether explicit or inferred):

- `--no-push` — skip `git push` + `gh pr create` + Jira transition + final comment. Useful when you want to commit locally and finalize later.
- `--type=<type>` — override the conventional-commit type (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `ci`, `build`, `revert`)
- `--build` — re-run `config.buildCommand` as a final safety net before committing (useful after long pauses between `/jira` finishing and running this skill)
- `--yes` — skip the Step 7 confirmation gate and proceed straight to commit/push/PR/transition (the pre-flight block is still printed for the record). Intended for autonomous callers like `/epic-pipeline --auto` that have already gated on a clean cross-actor PASS. Composes with the other flags.

## Step 3 — Load Atlassian MCP tools

Load via ToolSearch:
- `select:mcp__claude_ai_Atlassian__getAccessibleAtlassianResources`
- `select:mcp__claude_ai_Atlassian__getJiraIssue`
- `select:mcp__claude_ai_Atlassian__getTransitionsForJiraIssue`
- `select:mcp__claude_ai_Atlassian__transitionJiraIssue`
- `select:mcp__claude_ai_Atlassian__addCommentToJiraIssue`

## Step 4 — Verify git state

Run all three in parallel:

1. `git rev-parse --abbrev-ref HEAD` — current branch name
2. `git status --short` — uncommitted changes
3. `git diff --stat` — diff summary (file count + line totals)

**Refuse to proceed** if any of:

- Current branch === `main` (or `master`). Stop — this skill never runs on main.
- Current branch does not match `feat/<key-lower>-<...>` where `<key-lower>` matches the resolved KEY (case-insensitive). Tell the user the expected branch shape and stop. Do not auto-checkout.
- `git status --short` is empty. Nothing to commit. Stop.
- The diff includes files from completely unrelated areas — surface the file list and ask the user to confirm rather than refusing outright. (Heuristic only; the user has final say.)

## Step 5 — Get cloud ID + read ticket

```
mcp__claude_ai_Atlassian__getAccessibleAtlassianResources()  → cloudId
mcp__claude_ai_Atlassian__getJiraIssue(cloudId, KEY, fields=["summary", "status", "labels"], responseContentFormat="markdown")
```

Save: `summary`, current status (warn if not "In Progress"), labels.

## Step 5b — Epic evolution check (skip if `config.epicEvolutionRules` is null)

Before composing the commit message, scan the **current conversation transcript** for evidence that this story surfaced anything that propagates beyond it:

- An architectural constraint or pivot ("we're not going to do X after all," "we need to use Y instead").
- A schema / API decision that downstream stories were going to (or are going to) make.
- A discovered gap — work that wasn't anticipated and needs a new story.
- A clarification that a sibling/discovery story was waiting on (no longer needs to research it).

For each finding, identify the **affected sibling or downstream stories** in this epic. To do this:

1. List child stories of `config.epicKey` (cached if `/epic-next` did this earlier in the session, otherwise call `mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql(cloudId, jql='parent = <config.epicKey>', fields=["summary","status"])`).
2. For each finding, name the affected story keys and what each one needs (a Jira-comment paste, a description edit, a new sub-story to create).

Hold the list. It will appear in the Step 7 confirmation block under "Epic evolution items" and the user will decide what to do about it before the commit fires.

> **Epic-description discipline:** a "description edit" item targets the CHILD ticket whose scope it is — never the parent epic. Do not add story-level implementation detail, acceptance criteria, or follow-up specs to the epic; it stays overall-description + wave order (one-liners) + a few high-level pivots. New work → a child ticket (`To Do` if ready-next, `Backlog` if deferred), referenced in the wave plan as a one-liner.

If the scan turns up nothing, just record `epicEvolutionItems = []` and continue. Don't invent items to fill the section.

> **Heavier alternative:** `/epic-evolution-audit` runs a dedicated subagent for the cross-story drift check and proposes surgical Jira description edits. Run that before this skill if the story settled something architecturally significant. This step's lightweight scan is the everyday default.

## Step 6 — Build commit message (strict Commitizen / `cz-conventional-changelog`)

The repo uses `cz-conventional-changelog`. The subject must satisfy:

- **Format:** `<type>(<scope>): <KEY> <subject>`
- **Type:** lowercase, from the allowed set (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `ci`, `build`, `revert`).
- **Scope:** `config.commitScope` (e.g. `concierge`). Always include — never omit the parens.
- **KEY at the start of the subject** (matches repo convention — see `git log --oneline --no-merges -20`).
- **Subject length:** the entire header line must be **≤ 100 characters** (cz default `subject-max-length`).
- **No trailing period.**
- **Imperative, present tense** ("delete dormant load paths", not "deleted" or "deletes").
- **Lowercase first word of the descriptive subject** (the part after `<KEY> `). The KEY itself stays in its native casing (e.g. `REX-320`).

### Type inference (skipped if `--type=` was passed)

Match in this order — first hit wins:

| Ticket label / signal | Type |
|---|---|
| Label `bug` / `defect`, or summary contains `fix:` / `bug:` | `fix` |
| Label `cleanup` / `tech-debt` / `chore` / `dead-code` / `dormant` | `chore` |
| Label `docs` / `documentation` | `docs` |
| Label `refactor` / `refactoring` | `refactor` |
| Label `test` / `testing` | `test` |
| Label `perf` / `performance` | `perf` |
| Label `ci` | `ci` |
| Label `build` | `build` |
| (default) | `feat` |

### Subject text composition

Start from the Jira summary. Apply these transforms in order:

1. Lowercase the first word.
2. Strip a trailing period if present.
3. Convert past tense to imperative when obvious (`Deleted X` → `delete X`).
4. If `<type>(<scope>): <KEY> <summary>` exceeds 100 chars, **paraphrase** to fit — keep the load-bearing nouns, drop articles/connectors. Do not truncate with ellipsis (cz rejects).

### Body and footers (Commitizen-compliant)

- **Body:** none by default. The Jira ticket holds the plan and AC; the commit's job is to be a discoverable index entry. Include a body only if the diff has a non-obvious decision the user explicitly mentioned in the conversation that won't survive in Jira (rare).
- **Footer 1 (refs):** omit by default. Since the KEY is already in the subject, commitlint's `references-empty` rule passes.
- **Footer 2 (co-author):** always include the harness convention:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

## Step 7 — Confirmation gate

Print the block below. **If `--yes` was passed, skip the `AskUserQuestion` — print the block for the record (it stays as an audit trail in the transcript), then proceed straight to Step 8.** The autonomous caller (`/epic-pipeline --auto`) has already gated on a clean, zero-finding cross-actor PASS, so the human confirmation is redundant there. Otherwise, ask the user to confirm with `AskUserQuestion` (yes / no / edit message). The first three lines exist specifically so the user can catch a wrong inference from Step 0 — scan them carefully before approving.

Do not run any of the destructive steps that follow (commit, push, PR, transition) until the user approves — unless `--yes` is set.

```
Story complete

Board:            <board>            ← inferred from <conversation | branch | explicit arg>
Ticket key:       <KEY>              ← inferred from <conversation | branch | explicit arg>
Ticket summary:   <Jira summary>
Ticket status:    <current Jira status>  →  In Review

Branch:           <current-branch>   (per-story feature branch ✓)
Files changed:    <N> (<insertions>+ / <deletions>->)

Proposed commit (cz-conventional-changelog, <subject-length>/100 chars):
  <subject line>

Push:             yes | no   (--no-push → no)
PR:               will open via gh after push   (--no-push → skipped)
Build re-run:     yes | no   (--build → yes)
Final comment:    will post PR link back to <KEY>

Files:
  <git status --short output>

<If epicEvolutionItems is non-empty:>
Epic evolution items detected (from this story):
  - <KEY-of-affected-story> — <one-line description of what to add/edit/create>
  - <KEY-of-affected-story> — ...
  - (new story) — <proposed summary of work to add to this epic>
After commit/push/PR/transition, the skill will print these as "Suggested next actions"
so you can decide what to update in Jira (or run /jira on each one).
Consider running /epic-evolution-audit before this skill for a deeper cross-story sweep.
</If>
```

Three responses to handle (interactive only — `--yes` bypasses the prompt and proceeds as if **yes**):

- **yes** → proceed to Step 8.
- **no** → stop. The user will either fix the diff or re-invoke with different flags.
- **edit** → ask for a replacement subject line via `AskUserQuestion`, validate it against the cz format rules in Step 6 (type from the allowed set, scope present, KEY at the start, ≤ 100 chars, no trailing period), then re-show the confirmation block with the new subject.

The user can amend or strike items from the "Epic evolution items" list before approving — re-show the block with the revised list if so. The final approved list is what gets surfaced in Step 13.

## Step 8 — Optional build gate (`--build` only)

```
<config.buildCommand>
```

Stop on failure — print the error and let the user fix it. Do not commit a broken build.

## Step 9 — Stage and commit

Stage all unstaged changes (modifications, additions, deletions) for the working tree shown in Step 4. Use `git add -A` only if the diff was reviewed and confirmed in Step 7; otherwise stage by explicit path list.

> **Never use `--no-verify`** — pre-commit hooks must run.

```
git commit -m "$(cat <<'EOF'
<subject>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If a pre-commit hook fails: report the failure, do **not** retry with `--no-verify`, do **not** amend, leave the changes staged so the user can fix and re-run.

Capture the resulting short SHA — used in the PR body and final comment.

> If `--no-push` was passed: stop here. Print "Commit ready locally. Run `git push -u origin <branch>` + `gh pr create` manually when ready (or re-run without `--no-push`)." and exit cleanly.

## Step 10 — Push the per-story branch

This is the first push for the branch — always sets upstream:

```
git push -u origin <current-branch>
```

If the push is rejected (extremely rare on a fresh per-story branch — usually means somebody pushed the same branch name concurrently), stop and surface the rejection. Do **not** force-push. Per-story branches are short-lived; a name collision means a deeper coordination issue the user must investigate.

## Step 11 — Open the PR via gh

Compose the PR title and body:

**Title:** the cz commit subject (same line built in Step 6).

**Body template:**

```markdown
## Summary
<1–3 bullets distilled from the Jira summary + key implementation notes from the /jira plan>

## Jira
- <KEY>: <Jira summary>
- Epic: <config.epicKey>

## Test plan
<Paste the test plan /jira Phase 7 produced verbatim. If somehow missing, ask the user.>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Open the PR:

```
gh pr create \
  --title "<commit subject>" \
  --base main \
  --head <current-branch> \
  --body "$(cat <<'EOF'
<body as above>
EOF
)"
```

Capture the PR URL from `gh`'s stdout — used in Step 12 + 13.

If `gh pr create` fails (missing `gh` auth, branch not pushed, etc.), surface the error. The commit + push already succeeded; the user can retry the PR creation manually.

> **Parallelization for Steps 12 + 13:** these two Jira side-effects (transition + final comment) are independent of each other once the PR URL is in hand. **Default path:** issue them as parallel tool calls in a single assistant message.

## Step 12 — Transition to In Review

```
mcp__claude_ai_Atlassian__getTransitionsForJiraIssue(cloudId, KEY)
```

Find a transition whose `name` matches **In Review** (case-insensitive; common variants: "In Review", "Code Review", "Ready for Review"). If multiple match, prefer the exact "In Review" string.

```
mcp__claude_ai_Atlassian__transitionJiraIssue(cloudId, KEY, transition={id: <in-review-id>})
```

If no "In Review" transition is reachable from the current status:
- Surface the available transitions and let the user pick.
- If the workflow doesn't have a review state at all, fall back to leaving the ticket "In Progress" and note it in the final report — the PR link comment (Step 13) still posts so the linkage is captured.

## Step 13 — Final comment on the ticket

Post a short ADF comment on the Jira ticket so the link from Jira → PR is discoverable without scanning git history.

```json
{
  "version": 1,
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "In Review" }] },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "PR: " },
        { "type": "text", "text": "<PR URL>", "marks": [{ "type": "link", "attrs": { "href": "<PR URL>" } }] }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Commit: " },
        { "type": "text", "text": "<short-sha>", "marks": [{ "type": "code" }] },
        { "type": "text", "text": " on branch " },
        { "type": "text", "text": "<current-branch>", "marks": [{ "type": "code" }] },
        { "type": "text", "text": " (epic " },
        { "type": "text", "text": "<config.epicKey>", "marks": [{ "type": "code" }] },
        { "type": "text", "text": ")." }
      ]
    }
  ]
}
```

If the comment fails to post, report the error but do not roll back the commit/push/PR/transition — the comment is non-blocking.

## Step 14 — Final report

> **Queue a desktop notification first.** This is the "story complete" moment the user wants to be pinged on (especially when this skill runs inside an autonomous `/epic-pipeline` inner session). Write one line to the notification handoff file — the global Stop hook fires it (persistent terminal-notifier Alert) at turn end: `printf '%s' '<KEY> · story complete — PR #<N> ready for review' > /tmp/claude-notify-message.txt` (use the real KEY + PR number). **Body format is `<KEY> · <task>` — lead with the Jira key (it already encodes the board, so do NOT add the board name). Do NOT include the repo name or path either; the Stop hook auto-stamps those as the notification title + subtitle from the session's cwd.** Consumed + deleted on read; ignore write failures. **Skip this entirely on the `--no-push` early-exit (Step 9)** — the story isn't complete then, just committed locally.
>
> **Canonical notification behavior** (handoff file, `<KEY> · <task>` body, `CLAUDE · <status>` title + `~`-repo-path subtitle auto-stamped by the global Stop hook in `~/.claude/settings.json`) is shared across `/epic-pipeline`, `/epic-story-complete`, `/epic-next`, and `/notify`, and documented in the notify memory. If you change the format, update all of them together.

```
✓ Story <KEY> ready for review

Commit:   <short-sha> — <subject>
Branch:   <current-branch> (pushed ✓)
PR:       #<N> — <PR URL>
Ticket:   <KEY> → In Review
Comment:  posted ✓ | skipped

<If epicEvolutionItems was non-empty and user approved them in Step 7:>
Suggested next actions (epic evolution items from this story):
  - <KEY-of-affected-story> — <description>; consider /jira <KEY-of-affected-story>
  - (new story) — <proposed summary>; create as a CHILD ticket of <config.epicKey> via /claude-task or
    manually in Jira — 'To Do' if ready to be worked next (/epic-next's JQL only picks up 'To Do'),
    'Backlog' if deferred. Put the scope/detail in the ticket; never paste it into the epic description.
These propagate the decisions surfaced in <KEY> into the rest of <config.epicKey>
per the epic evolution rules. The skill does NOT auto-update sibling stories —
you decide what to update and when.
</If>

Next:
  • Reviewer approves + merges the PR.
  • After merge, run /post-merge-cleanup to delete the branch and transition <KEY> → Done.
  • To start the next story in the epic: /epic-next <board>
```

---

## Error handling

- **Missing ticket key arg + cannot infer** → ask via AskUserQuestion.
- **Wrong branch** (main or non-`feat/<key>-…`) → error and stop. Do not auto-checkout.
- **No uncommitted changes** → error and stop.
- **Pre-commit hook failure** → leave the staged changes, report the failure, do not retry with `--no-verify`.
- **Push rejected** → stop, do not force. Per-story branches don't tolerate concurrent writers.
- **`gh pr create` failure** → surface the error; commit + push already succeeded, user can retry PR creation manually.
- **Transition unavailable** → list available transitions, let the user pick.
- **Final comment fails** → log it, continue. The commit + PR + transition already succeeded.

## Notes

- This skill is for the **per-story** wrap-up to In Review. The post-merge wrap-up to Done is `/post-merge-cleanup`.
- Commit-message format is intentionally aligned with `commit-commands:commit` and the existing repo history so `git log --oneline` stays scannable.
- The PR body's `## Test plan` section comes from `/jira` Phase 7 output. If `/jira` was skipped or aborted mid-flight, ask the user to supply one before opening the PR — `gh pr create` will still succeed without one, but the reviewer needs it.
