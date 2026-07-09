Clean up after a PR merge: delete the merged branch (local + remote) and transition the Jira ticket to Done: $ARGUMENTS

> **Two modes:** (1) **PR-mode boards** — run per story on the merged `feat/<key>-<slug>` branch (deletes it + transitions the story → Done). (2) **Epic-branch-mode boards** (`mergeMode:"epic-branch"`) — stories were already taken to Done by `/epic-story-complete`, so here you run this **once per epic** on the merged epic branch (e.g. `/post-merge-cleanup feat/rex-548-finish-messaging-migration`) to delete the epic branch + transition the **epic** ticket → Done. The branch-name key parse picks up whichever key the branch encodes (story or epic).

## Determine the branch to clean up

1. **If `$ARGUMENTS` is provided**, determine if it is a PR number or a branch name:
   - **PR number** (purely numeric, e.g., `57` or `#57` — strip the `#` if present): Look up the branch name from the PR:
     ```
     gh pr view <number> --json headRefName --jq '.headRefName'
     ```
     Use the returned value as the branch name to delete.
   - **Branch name** (not purely numeric): Use it directly as the branch name to delete.

2. **If `$ARGUMENTS` is empty**, detect the current branch:
   ```
   git branch --show-current
   ```
   - If already on `main`, inform the user: "Already on main. Provide a PR number or branch name as an argument (e.g., `/post-merge-cleanup 57` or `/post-merge-cleanup feat/my-branch`)." and stop.
   - Otherwise, use the current branch as the branch to delete.

Save the branch name for later steps.

## Handle current branch safely

1. **Check the current branch and working tree status:**
   ```
   git branch --show-current
   git status --porcelain
   ```
   Save the current branch name as `<original-branch>`. If `git status --porcelain` produces any output, there are uncommitted changes — set a `needs-stash` flag.

2. **If there are uncommitted changes** (`needs-stash` is true):
   ```
   git stash push -m "post-merge-cleanup: auto-stash"
   ```

3. **If the current branch IS the branch to be cleaned up:**
   - Switch to main:
     ```
     git checkout main
     ```
   - Pull latest:
     ```
     git pull
     ```
   - Note: after cleanup, the user will remain on `main` (since their branch was deleted). If changes were stashed, they will be unstashed on `main`.

4. **If the current branch is NOT the branch to be cleaned up** (i.e., the user is on a different working branch):
   - Switch to main:
     ```
     git checkout main
     ```
   - Pull latest:
     ```
     git pull
     ```
   - Note: after cleanup, the skill will return to `<original-branch>` and restore any stashed changes.

## Delete the feature branch

1. **Delete the local branch** (if it exists):
   ```
   git branch -D <branch-name>
   ```
   - If the branch doesn't exist locally, that's fine — report it was not found locally.
   - Defensive (only if someone used native `isolation: worktree` agents): if `<branch-name>` is still checked out in a `git worktree`, run `git worktree remove <dir>` then `git worktree prune` before deleting it.

2. **Check if the remote branch exists, then delete it:**
   ```
   git ls-remote --heads origin <branch-name>
   ```
   - If the output is empty, the remote branch was already removed (e.g., via GitHub PR merge) — skip deletion and report it was already removed.
   - If the output is non-empty, delete it:
     ```
     git push origin --delete <branch-name>
     ```

3. **Prune stale remote refs:**
   ```
   git remote prune origin
   ```

## Transition Jira Ticket to Done

1. **Extract the ticket key** from the branch name. Branch names follow the pattern `feat/<KEY>-description` or `fix/<KEY>-description` (e.g., `feat/CON-204-lead-detail-refresh` → `CON-204`). Parse the key as the segment between the first `/` and the second `-`-separated word that is not uppercase (i.e., match the pattern `[A-Z]+-\d+`). Keys may be lowercase in the branch (`rex-548`) — uppercase them for the Jira API. For an epic-branch-mode **epic branch** (e.g. `feat/rex-548-finish-messaging-migration`) the same parse yields the **epic** key (`REX-548`), so this transitions the **epic** → Done.

2. **If a ticket key is found**, load the required Atlassian MCP tools using the ToolSearch tool:
   - `select:mcp__claude_ai_Atlassian__getAccessibleAtlassianResources`
   - `select:mcp__claude_ai_Atlassian__getJiraIssue`
   - `select:mcp__claude_ai_Atlassian__getTransitionsForJiraIssue`
   - `select:mcp__claude_ai_Atlassian__transitionJiraIssue`

3. **Get the Atlassian Cloud ID:**
   ```
   mcp__claude_ai_Atlassian__getAccessibleAtlassianResources()
   ```

4. **Check the ticket's current status:**
   ```
   mcp__claude_ai_Atlassian__getJiraIssue(cloudId, issueIdOrKey, fields=["status"])
   ```
   - If already "Done", skip the transition.

5. **Get available transitions and transition to Done:**
   ```
   mcp__claude_ai_Atlassian__getTransitionsForJiraIssue(cloudId, issueIdOrKey)
   ```
   - Find the transition with `name: "Done"` and use its `id`.
   ```
   mcp__claude_ai_Atlassian__transitionJiraIssue(cloudId, issueIdOrKey, transition={id: "<transition-id>"})
   ```

5b. **Close the ticket's sub-tasks → Done.** A decomposed story's sub-tasks reach Done with the story; this sweeps any still open (typically already closed by `/epic-story-complete`). For an epic-branch-mode **epic** key this is a no-op — epics have no sub-tasks.
   ```
   mcp__claude_ai_Atlassian__getJiraIssue(cloudId, issueIdOrKey, fields=["subtasks"])
   ```
   For each sub-task **not already "Done"**, read its transitions and transition it to **Done** (match by name, never guess the id). On any error, note it and continue — do not fail cleanup over a sub-task.

6. **If no ticket key was found** in the branch name, skip this step silently.
7. **If any Atlassian MCP call fails or returns an error** (at any step — cloud ID lookup, issue fetch, transitions fetch, or transition), do not retry. Instead, inform the user:
   > "Could not transition `<KEY>` automatically (Atlassian returned an error). Please mark it Done manually in Jira."
   Then continue with the rest of the cleanup without failing.

## Clean up plan files

1. **Check for plan files associated with the branch** in `.claude/plans/`:
   ```
   ls .claude/plans/
   ```
2. **Read each plan file** and check if it references the Jira ticket key or the branch name.
3. **If a matching plan file is found**, delete it — the work is complete and merged.
4. **If no plan files exist or none match**, skip silently.

## Return to working branch

1. **If `<original-branch>` is different from `main`** (i.e., the user was on a different working branch):
   ```
   git checkout <original-branch>
   ```

## Restore stashed changes

1. **If `needs-stash` was true**, pop the stash to restore uncommitted changes:
   ```
   git stash pop
   ```
   - If the pop fails (e.g., merge conflict), report the warning: "Stashed changes could not be auto-applied. Run `git stash pop` manually to resolve."

## Summary

Output a summary:

```
Post-merge cleanup complete:
- Current branch: <current-branch> (unchanged) or "switched to main"
- Deleted local branch: <branch-name> (or "not found locally")
- Deleted remote branch: <branch-name> (or "already removed")
- Jira <KEY>: transitioned to Done (or "no ticket found" or "already Done")
- Sub-tasks: <N> → Done (or "none")
- Plan file: deleted <filename> (or "no matching plan found")
```
