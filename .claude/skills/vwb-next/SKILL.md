Find the next unstarted VWB story and start work on it on a **per-story feature branch**.

<!-- Tracker Epic: VWB-55 -->

> **Branch model:** the story gets its own `feat/<key-lower>-<slug>` branch cut from `origin/main`. After `/jira` finishes its in-conversation phases, `/epic-story-complete` commits, pushes, opens a PR, and transitions the Jira ticket to In Review.

## Step 1 — Load Atlassian MCP tools

Load the following tools via ToolSearch:
- `select:mcp__claude_ai_Atlassian__getAccessibleAtlassianResources`
- `select:mcp__claude_ai_Atlassian__getJiraIssue`
- `select:mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql`

## Step 2 — Get Cloud ID

```
mcp__claude_ai_Atlassian__getAccessibleAtlassianResources()
```

## Step 3 — Read the tracker epic description

```
mcp__claude_ai_Atlassian__getJiraIssue(cloudId, issueIdOrKey="VWB-55", fields=["description"], responseContentFormat="markdown")
```

Parse the description to extract the **ordered list of story keys** (e.g., `VWB-42`, `VWB-33`, …) in the sequence they appear, top to bottom.

## Step 4 — Find To Do stories via JQL

```
mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql(
  cloudId,
  jql='key in (VWB-42, VWB-33, VWB-32, VWB-56, VWB-57, VWB-58, VWB-59, VWB-41, VWB-38, VWB-27, VWB-28, VWB-29, VWB-43, VWB-44, VWB-14, VWB-16, VWB-15, VWB-22, VWB-31, VWB-23, VWB-24, VWB-25, VWB-30) AND status = "To Do"',
  fields=["summary", "status"]
)
```

## Step 5 — Pick the next story

Cross-reference the JQL results against the ordered list from Step 3. The **first key in the ordered list that appears in the JQL results** is the next story.

- Extract its `Key` and `summary` for context.
- Note the `Track` name from the epic description section heading it appears under.

If **no stories are in "To Do"**, report: "All VWB stories are complete!" and stop.

## Step 6 — Report to the user

```
Next up: <KEY> — <Story title> (Track <N> — <Track name>)
Branch: feat/<key-lower>-<short-slug>
```

## Step 7 — Create the per-story feature branch

Derive the slug: lowercase the key (`VWB-42` → `vwb-42`), append `-` + the first 4–6 words of the Jira summary lowercased with non-alphanumerics replaced by `-`, collapse runs, trim, cap at ~60 chars total.

```
git checkout main
git pull --ff-only
git checkout -b feat/<key-lower>-<slug>
```

**If the branch already exists** (unusual — usually a partial re-run): ask the user whether to resume or pick a `-v2` suffix.

## Step 8 — Hand off to /jira

Invoke the `jira` skill with the ticket key as the argument (equivalent to `/jira <KEY>`). Let /jira run its phases normally on the branch you just created. /jira will NOT create a PR — `/epic-story-complete` does that next.

## Step 9 — After /jira finishes, hand off to /epic-story-complete

Invoke `/epic-story-complete vwb <KEY>` (or let it infer from branch + conversation). It commits with `feat(mw): <KEY> <summary>`, pushes, opens a PR, and transitions the ticket to In Review.

After the PR merges, run `/post-merge-cleanup` to delete the branch and transition the ticket to Done.
