Address GitHub PR review comments on the current branch: evaluate, respond, refactor, resolve threads, commit, and push.

## Phase 1: Discover

1. **Determine the current branch:**
   ```
   git branch --show-current
   ```
2. **Find the open PR for this branch:**
   ```
   gh pr list --head <branch-name> --json number,title,url --jq '.[0]'
   ```
   - If no PR found, inform the user and stop.
3. **Get the repo owner and name:**
   ```
   gh repo view --json owner,name --jq '.owner.login + "/" + .name'
   ```
4. **Fetch all review threads via GraphQL** (includes thread IDs, resolution status, diff context, and full comment details):
   ```
   gh api graphql -f query='query { repository(owner:"{owner}", name:"{repo}") {
     pullRequest(number:{number}) { reviewThreads(first:100) { nodes {
       id isResolved comments(first:10) { nodes {
         id databaseId body path line originalLine diffHunk
       } }
   } } } } }'
   ```
   **Important:** Do NOT add `inReplyToId` or `in_reply_to_id` to this query — that field does not exist in the GraphQL schema. The `reviewThreads` API already groups comments by thread, so the first comment in each thread's `comments.nodes` array is the top-level comment.
5. **Filter** to threads where `isResolved: false`. The first comment in each thread is the review comment to address; subsequent comments are replies.
6. If no unresolved threads exist, inform the user and stop.

## Phase 2: Analyze

For each unresolved thread:

1. **Read the referenced file** at the specified `path` and surrounding context (at least 50 lines around the referenced `line`).
2. **Understand the codebase context:**
   - Read related files if the comment references behavior in other files.
   - Check how similar patterns are handled elsewhere in the codebase.
   - Look at the project's existing conventions and patterns.
3. **Evaluate the comment** against the actual code. Consider:
   - Is the suggestion factually correct? (Does the comment reference the right code, right values, right types?)
   - Is it architecturally appropriate? (Does it match the project's conventions and current stage of development?)
   - Is it actionable? (Is the suggested fix valid code that would compile and pass tests?)
   - Is it proportionate? (Does the benefit justify the change, or is it premature optimization / over-engineering?)
   - Is it a duplicate of another comment already addressed?
4. **Classify** the comment:

   A comment is **Valid** if:
   - It identifies a real bug, logic error, or inconsistency.
   - It points out dead code, unused imports, or unnecessary operations.
   - It highlights a deviation from established codebase patterns.
   - It identifies a potential runtime error or data integrity issue.
   - The suggested fix is correct and wouldn't break other functionality.

   A comment is **Invalid** if:
   - The reviewer misunderstands how the code works (explain the actual behavior).
   - The issue described doesn't apply because of context the reviewer may not see.
   - The suggested change would break other functionality.
   - The code is intentionally written that way for a documented reason.
   - The concern is already handled elsewhere in the codebase.

5. **Record the evaluation** with: comment ID, thread ID, file path, line, verdict, reasoning, and planned action.

## Phase 3: Report

Output a summary table BEFORE making any changes or posting replies:

| # | File | Comment (short) | Verdict | Action |
|---|------|-----------------|---------|--------|
| 1 | path:line | Brief summary | Valid/Invalid | Refactor: description / No change needed: reason |

Then present a TUI select prompt using the `AskUserQuestion` tool with exactly two options:

```
AskUserQuestion(
  question: "How would you like to proceed?",
  options: ["proceed", "make changes"]
)
```

**If "proceed" is selected:** Continue directly to Phase 4 with all evaluations as-is.

**If "make changes" is selected:** Stop and output the following message, then wait for the user to respond in the terminal:

```
Paused. You can:
- Override a verdict: "flip #2 to invalid", "mark #3 as valid"
- Skip a thread: "skip #1", "skip #2 and #4"
- Adjust the planned action: "for #3, redirect to /home instead"
- Any combination of the above

Type your changes and I'll update the plan and show the table again.
```

After the user provides their changes, update the evaluations accordingly, re-display the summary table with the changes applied, and present the TUI select prompt again.

## Phase 4: Apply

After user confirmation, for each thread:

### If Valid:
1. **Refactor the code** to address the comment. Follow existing project conventions:
   - ES private fields (`#`) not TypeScript `private`
   - `perfectionist/sort-classes` member ordering
   - Keep changes minimal and focused on the comment's concern
   - If a comment suggests a specific code change (e.g., a `suggestion` block), prefer using that suggestion if it is correct
2. **Verify the fix** doesn't break the immediate file (check for syntax errors, unused imports, type consistency).
3. **Reply** to the comment thread explaining what was changed:
   - Confirm the issue was valid
   - Briefly describe the fix applied, referencing specific lines/changes
   - Be concise (2-4 sentences)
4. **Resolve** the thread via GraphQL.

### If Invalid:
1. **Reply** to the comment thread with a clear explanation:
   - Be professional and respectful
   - Be specific about why the concern doesn't apply
   - Reference the actual code behavior with file paths and line numbers
   - Be concise (2-4 sentences)
2. **Resolve** the thread via GraphQL.

### Posting Replies
Use the GitHub API to reply to comment threads:
```
gh api repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies \
  -f body="<reply text>"
```

### Resolving Threads
Use GraphQL to resolve each thread (use the thread `id`, e.g. `PRRT_kwDONWBIos5uNZPI`, NOT the comment `id`):
```
gh api graphql -f query='mutation {
  resolveReviewThread(input: {threadId: "<thread_node_id>"}) {
    thread { isResolved }
  }
}'
```

## Phase 5: Commit and Push

After all threads are processed:

1. If any code was changed, **pre-format the files before staging** to ensure lint-staged has nothing to write back during the pre-commit hook (avoids `index.lock` conflicts with the editor):
   ```
   npx prettier --write <file1> <file2> ...
   ```
2. Stage only the modified files:
   ```
   git add <file1> <file2> ...
   ```
3. Create a commit with a descriptive message:
   ```
   git commit -m "$(cat <<'EOF'
   fix: address PR review feedback

   Addressed N of M unresolved review comments:
   - [brief description of each fix]

   Replied to K comments explaining why they don't apply.

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```
4. Push to the remote branch:
   ```
   git push
   ```
5. If the push fails, report the error and do NOT force push.
6. **Post-push thread cleanup:** A push can cause GitHub to automatically unresolve threads when the underlying diff context changes. After a successful push, re-fetch ALL review threads (same GraphQL query from Phase 1) and resolve any threads that are still unresolved — including threads that were previously resolved but got reopened by the push. Use the same GraphQL `resolveReviewThread` mutation for each.

## Phase 6: Summary

Output a final summary:

### PR Review Resolution: PR #<number>

**PR:** <url from Phase 1 step 2>

#### Addressed (Valid)
- [file:line] — [summary of fix] (resolved)

#### Replied (Invalid)
- [file:line] — [summary of why invalid] (resolved)

#### Summary
- **Total unresolved comments:** N
- **Fixed:** X
- **Replied (invalid):** Y
- **Threads resolved:** Z
- **Commit:** `<commit-hash>` (or "No code changes")
- **Push status:** Success / Failed / N/A

## Error Handling

- If no PR is found for the current branch, inform the user and stop.
- If there are no unresolved comments, inform the user and stop.
- If a code fix introduces lint or type errors, attempt to resolve them. If unable, skip that fix, leave the comment unaddressed, and report it.
- Never force push. If push fails, report the error.
- If unable to determine the repo owner/name, ask the user.
