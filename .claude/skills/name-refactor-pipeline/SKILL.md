Autonomous single-story pipeline for the ARCH "Name Refactor" epic: pick the NEXT To-Do child of the epic, delegate the rename to ONE worker agent (`/refactor-ng-pat-to-giga`), gate the result, fast-forward it onto `main` and push directly (NO per-story PR), clean up, and transition Jira In Progress → Done. Processes EXACTLY ONE story per invocation — the refactor has a large blast radius, so never batch files. $ARGUMENTS

**Usage:**
- `/name-refactor-pipeline` — process the next To-Do story of epic `ARCH-75`
- `/name-refactor-pipeline <EPIC-KEY>` — same loop against a different epic's To-Do children (rare)

**Architecture (fixed):** the MAIN session is the orchestrator — it owns Jira, the merge, and cleanup. ONE foreground worker agent per run does the refactor as a single commit on a LOCAL branch (never pushed). Never spawn a second worker, never run in background, never parallelize: sibling stories edit the same barrels and consumers, so each story must land on `main` before the next story is even selected.

**Merge policy — NO per-story PRs:** decided by the user 2026-06-09 — autonomous merging was already authorized for this mechanical-rename epic, so a PR per story added ceremony without review. Each story lands as ONE commit fast-forwarded onto `main` and pushed directly, with the residue gate run BEFORE the push (an improvement over the PR flow, which could only gate after merge). The worker's local branch is the safety net: a failed story leaves `main` untouched and the branch in place for inspection. This direct-push exception applies ONLY to this skill — `/epic-pipeline` feature work keeps PRs and manual merges. Hard-stop on anything non-nominal instead of fixing forward.

Repo root: `/Users/gigasoftware_developer/Dev/DEV_GIGA/gigasoftware`.

---

## Step 0 — Pre-flight (hard gates)

1. `git branch --show-current` + `git status --porcelain` + `git pull`.
   - Not on `main` → checkout `main` first (only if the tree is clean).
   - Modified/staged TRACKED files → **hard-stop**: surface the dirty paths, tell the user to commit/stash. Never stash automatically here — the worker needs a deterministic tree.
   - Untracked files (`??` lines) are tolerated — surface them and proceed (the worker is forbidden from staging them).
2. Resolve the epic key: first token of `$ARGUMENTS` matching `[A-Z]+-\d+`, else `ARCH-75`.

## Step 1 — Select the next story

Load Atlassian tools via ToolSearch (`select:mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql,mcp__claude_ai_Atlassian__transitionJiraIssue,mcp__claude_ai_Atlassian__getTransitionsForJiraIssue`). cloudId: `gigasoftware.atlassian.net`.

```
JQL: parent = <EPIC-KEY> AND status = "To Do" ORDER BY created ASC
```

Take the FIRST result only. Its **summary is the target file path** (epic convention).

- No results → report "epic <EPIC-KEY> has no To-Do stories" and stop (suggest checking for stories stuck In Progress from a prior hard-stop).
- Sanity-check the file exists on `main` (`ls <path>`). Missing → **hard-stop** (stale ticket; do not guess a path).

Transition the story → **In Progress** (ARCH transition id `31`; if a transition id fails, re-fetch ids via `getTransitionsForJiraIssue` — ids: In Progress `31`, Done `41`. In Review is NOT used: there is no PR to review).

## Step 2 — Spawn the worker (ONE, foreground)

Spawn a single `general-purpose` agent named `name-refactor-worker` and WAIT for it (no `run_in_background`). Its prompt must contain:

> You are the name-refactor worker for story **<KEY>** in `/Users/gigasoftware_developer/Dev/DEV_GIGA/gigasoftware`. Target file: `<file path>`.
>
> Invoke the Skill tool: skill `refactor-ng-pat-to-giga`, args = the target file path. If the Skill tool doesn't list it, Read `/Users/gigasoftware_developer/.claude/skills/refactor-ng-pat-to-giga/SKILL.md` and follow it exactly. Two deviations from that skill:
> 1. **SKIP its Jira step entirely** — the orchestrator owns all Jira transitions.
> 2. **Do NOT push and do NOT open a PR** — your job ends at a clean LOCAL commit on the feature branch; the orchestrator merges it into `main` and pushes.
>
> Non-negotiables: `git mv` (preserve history); whole-identifier (word-boundary) renames only; symbols owned by OTHER files stay (note them instead); skip deprecated libs `@gigasoftware/material` + `@gigasoftware/ui-design-library`; branch `chore/name-refactor-<short>` cut from up-to-date `main`; ONE commit; commit message `refactor(<nx-scope>): rename <Old> → <New> (<KEY>)` ending with the Claude Co-Authored-By line.
>
> Gates you must run and report (the orchestrator re-verifies before pushing):
> - stage explicitly (`git add <paths>`), NEVER `git add -A` — unrelated untracked files may sit in the tree
> - after committing, `git show --stat HEAD` and confirm the commit contains BOTH the renames AND the symbol/consumer edits — the lint-staged pre-commit hook can drop hunks via partial staging (bit ARCH-79); `git commit --amend` if anything is missing
> - residue grep for THIS story's old identifiers + old filename across `libs apps` → must be 0 hits on your branch
> - `npx nx affected -t lint test --base=HEAD` (run BEFORE committing, so HEAD is the comparison base) — ALL tests must pass. Lint failures are acceptable ONLY in files your diff does not touch (`git diff --name-only main` to triage); a lint error in a touched file must be fixed before commit. `main` is known to carry pre-existing lint failures in ~11 projects — never try to fix those.
> - leave the working tree clean (everything committed); do NOT push anything
>
> Hard-stop instead of improvising if: the file's exports have no NgPat/ngPat names; a rename would collide with an existing symbol; tests fail for reasons you cannot attribute to your change; or the blast radius crosses into the deprecated libs in a way the skill forbids.
>
> Your final message is consumed by the orchestrator — return EXACTLY this report, no prose around it:
> ```
> STATUS: success | blocked
> KEY: <KEY>
> FILE: <old path> -> <new path>
> BRANCH: <branch>
> COMMIT: <sha> <subject>
> SYMBOLS: <Old> -> <New> [, ...]
> FILES_CHANGED: <n>
> GATE_GREP: 0 hits | <details>
> GATE_TESTS: <pass counts / failing projects>
> GATE_LINT: <clean | pre-existing-only triage summary>
> ANOMALIES: none | <out-of-scope NgPat symbols spotted (candidate new stories), surprises, skipped consumers>
> BLOCKED_REASON: <only when STATUS: blocked>
> ```

**Worker returns `STATUS: blocked`** (or dies) → **hard-stop**: queue notification `printf '%s' '<KEY> · auto-paused — <short reason>' > /tmp/claude-notify-message.txt`, transition the story back to To Do (or leave In Progress with a note — judgment), surface the full report, leave any branch in place. Do NOT retry the worker.

## Step 3 — Orchestrator merge + pre-push gate + push (no PR)

1. The worker leaves the tree checked out on the feature branch — `git checkout main && git pull` now.
2. Sanity: the worker's branch is exactly ONE commit ahead of `main` (`git log main..<branch> --oneline` shows one line) and its sha matches the worker's `COMMIT` report.
3. Merge locally, linear history: `git merge --ff-only <branch>`.
   - ff fails (origin/main moved during the story): `git checkout <branch> && git rebase main && git checkout main && git merge --ff-only <branch>`. A rebase CONFLICT → `git rebase --abort`, **hard-stop** (branch intact, `main` untouched).
4. **Pre-push residue gate on merged-but-unpushed main:** grep the story's old identifiers + old filename across `libs apps` → MUST be 0. Non-zero → `git reset --hard origin/main`, **hard-stop** with notification `<KEY> · auto-paused — residue pre-push` (nothing shipped; branch intact for inspection).
5. `git push origin main`. Rejected because the remote moved → `git pull --rebase` once and retry; still failing → **hard-stop** (notification `<KEY> · auto-paused — push rejected`).

## Step 4 — Cleanup + Jira

1. `git branch -D <branch>` (never pushed, so there is no remote branch to clean).
2. Transition the story → **Done** (id `41`). No In Review phase — there is no PR. Any Jira error: do not retry; tell the user to transition manually (matches `/post-merge-cleanup` policy) and continue.

## Step 5 — Report + handoff

1. Queue the success notification: `printf '%s' '<KEY> · pushed to main & Done — <new basename>' > /tmp/claude-notify-message.txt` (body format `<KEY> · <task>`; the Stop hook stamps repo title/path — never include them).
2. Peek at the next To-Do story (same JQL) and output:
   ```
   Name-refactor pipeline — 1 story processed:
     <KEY>  <old basename> → <new basename>
     pushed to main (<sha>) · local branch deleted · Jira → Done
     Gates: grep 0 (pre-push) · tests <summary> · lint <summary>
     Anomalies: <…>
   Next on deck: <KEY+1> — <file> (run /name-refactor-pipeline again)
   Epic remaining: <count> To-Do stories.
   ```
3. If ANOMALIES listed out-of-scope NgPat symbols, surface them as candidate child tickets for the epic — do NOT create tickets unprompted.

## Hard-stop policy (summary)

Dirty tree · missing target file · worker blocked · branch not exactly one commit ahead · rebase conflict · residue grep hits pre-push · push rejected after one retry → stop, notify (`<KEY> · auto-paused — <reason>`, or `<EPIC-KEY> · auto-paused — <reason>` pre-story), surface everything, leave artifacts in place for a human (`main` is reset to `origin/main` first when the residue gate trips). Automate the boring path; escalate the interesting one. One invocation = one story, always.
