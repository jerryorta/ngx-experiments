Review all local changes (staged and unstaged), iterate with Codex in a ralph-wiggum loop until clean, then create the PR.

## Overview

This skill bridges "coding done" and "PR open". It runs after `/jira` finishes coding.

Flow:
1. Collect all local changes
2. Enter a Codex-powered review loop (max 10 iterations):
   - Codex reviews the full diff for its clean, structured output
   - Main thread classifies findings (valid/invalid) and presents to user — no code edits here
   - Parallel fix agents spawn for confirmed-valid findings; each runs lint+test before reporting done
   - Loop re-runs Codex with fresh eyes after each fix round
   - Loop exits when Codex reports no findings or 10 iterations are reached
3. Create the PR via `commit-commands:commit-push-pr`

---

## Phase 1: Collect Changes

Run these in parallel:

```bash
git branch --show-current
git diff --cached --stat
git diff --stat
git status --short
```

Then read the full diff for context (not just stats):

```bash
git diff --cached
git diff
```

Report a summary to the user:

```
Branch: <branch-name>
Staged:   <N files changed>
Unstaged: <N files changed>
Untracked: <list of new files>
```

If there are no local changes (clean working tree and no untracked files), inform the user and stop.

---

## Phase 2: Codex Review Loop (max 10 iterations)

Repeat the following steps until `REVIEW_COMPLETE` or 10 iterations are reached.

---

### Step A: Run Codex Review

Invoke:

```
Skill(codex:review)
```

Follow the codex:review skill's flow exactly. Return its output verbatim.

---

### Step B: Classify Findings

Parse the Codex output. If Codex reports no findings: output `REVIEW_COMPLETE` and stop — proceed to Phase 3.

Classify each finding as **Valid** or **Invalid**:

- **Valid**: real bug, logic error, unused import, constraint violation, missing test, style token misuse, deviation from project conventions
- **Invalid**: reviewer misunderstands the code, concern already handled elsewhere, intentionally written that way, would break other functionality

Build the findings table:

| # | File:line | Verdict | Action |
|---|-----------|---------|--------|
| 1 | path:line | Valid/Invalid | Fix: description / No change: reason |

---

### Step C: Present to User

Output the table. Then use `AskUserQuestion` with exactly two options:

```
question: "How would you like to proceed?"
options: ["proceed", "make changes"]
```

**If "proceed"**: apply all Valid findings, skip Invalid ones.

**If "make changes"**: stop and output:

```
Paused. You can:
- Override a verdict: "flip #2 to invalid", "mark #3 as valid"
- Skip a finding: "skip #1"
- Adjust planned action: "for #3, use X approach instead"

Type your changes and I'll update the table and ask again.
```

After user input: update the table, re-display it, and present `AskUserQuestion` again.

If all findings are Invalid: output `REVIEW_COMPLETE` and stop — proceed to Phase 3.

---

### Step D: Spawn Parallel Fix Agents

Spawn one `general-purpose` agent per natural domain boundary (e.g., one per library, one per feature area, one per domain layer). Pass each agent:

- The full diff (staged + unstaged) for context
- Its specific slice of valid findings to fix
- All relevant conventions (from CLAUDE.md: `inject()`, `input()`/`output()`, `@if`/`@for`, Tailwind-first, ES private fields `#`, `perfectionist/sort-classes` ordering)

Each fix agent must:
- Make minimal changes — fix the finding, nothing else
- Run `npx nx run <project>:lint` and `npx nx run <project>:test` and fix any failures before reporting done
- Report which files were changed

> If the work is small enough to fit in one agent, use a single agent rather than splitting artificially.

After all fix agents complete, collect their reports.

---

### Step E: Check Loop Condition

- If this was iteration 10: report remaining unresolved findings and stop — do not create the PR.
- Otherwise: return to Step A. Codex gets fresh eyes on the updated files — new issues introduced by fixes may surface.

---

## Phase 3: Create PR

Before invoking the commit skill, **pre-format all changed files** to ensure lint-staged has nothing to write back during the pre-commit hook (avoids `index.lock` conflicts with the editor):

```bash
(git diff --name-only HEAD; git ls-files --others --exclude-standard) | xargs npx prettier --write --ignore-unknown 2>/dev/null || true
```

Then invoke:

```
Skill(commit-commands:commit-push-pr)
```

---

## Error Handling

- If there are no local changes (clean working tree), inform the user and stop.
- If the Codex review loop reaches 10 iterations without `REVIEW_COMPLETE`, report the remaining findings and stop — do not create the PR.
- If lint or tests fail after a fix and cannot be resolved, report the failure, leave that finding unresolved, and continue to the next finding.
- Never force push. If push fails, report the error.
