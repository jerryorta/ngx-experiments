Create small, self-contained Jira tickets designed for autonomous Claude execution: $ARGUMENTS

## Overview

`claude-task` tickets are small, well-scoped work items that Claude can execute almost autonomously in a single session. Each ticket includes detailed file paths, a development plan, and clear acceptance criteria so execution requires minimal back-and-forth.

## When to Use

- **Explicitly**: User invokes `/claude-task` to create tickets or get suggestions
- **Proactively**: At the end of a session, suggest small follow-up tasks that fit the criteria

## Ticket Criteria

A good `claude-task` ticket is:
- **Small**: 1-3 files to create/modify
- **Self-contained**: Not heavily dependent on other in-progress work
- **Clear**: Unambiguous acceptance criteria
- **Autonomous**: Can be completed in a single session without extensive clarification

## Phase 1: Determine Mode

Parse `$ARGUMENTS` to determine the mode:

- **If arguments contain ticket descriptions**: Go to Phase 3 (Create Tickets)
- **If arguments say "suggest" or are empty**: Go to Phase 2 (Suggest Tasks)
- **If arguments say "suggest and create"**: Do Phase 2, then Phase 3

## Phase 2: Suggest Tasks

1. **Identify the current work context:**
   - Check the current git branch for the active epic/feature area
   - Read recent commits to understand what was just worked on
   - Identify the relevant Jira epic

2. **Scan for small task opportunities:**
   - Look for TODOs, FIXMEs, or incomplete patterns in recently modified files
   - Identify missing tests, documentation, or AGENTS.md files for new components
   - Look for cleanup, refactoring, or consistency improvements
   - Check for hardcoded values that should be configurable
   - Identify missing error handling or edge cases

3. **Present suggestions** to the user as a numbered list:
   ```
   Suggested claude-task tickets for epic <EPIC-KEY>:

   1. <title> — <1-line description>
      Files: <file paths>

   2. <title> — <1-line description>
      Files: <file paths>
   ```

4. **Ask the user** which ones to create (or let them modify/add).

## Phase 3: Create Tickets

For each ticket to create:

1. **Get the Atlassian Cloud ID:**
   ```
   mcp__claude_ai_Atlassian__getAccessibleAtlassianResources()
   ```
   Cloud ID: `0c34459b-6029-4c84-962e-da03ad010fd0`

2. **Identify the parent epic:**
   - If the user specifies an epic, use it
   - Otherwise, check the current branch name for a ticket key (e.g., `feature/CON-306-...`)
   - Look up that ticket's parent epic using `mcp__claude_ai_Atlassian__getJiraIssue`
   - Ask the user to confirm the epic if uncertain

3. **Create each ticket** with `mcp__claude_ai_Atlassian__createJiraIssue`:
   - **Project**: `CON`
   - **Issue type**: `Story`
   - **Parent**: The identified epic key
   - **Summary**: Concise title (under 80 chars)
   - **Description**: Use this template:

   ```markdown
   ## Summary

   <1-2 sentence description of what needs to be done and why>

   ## Files to Modify

   - `<full/path/to/file.ts>` — <what to change>
   - `<full/path/to/file.html>` — <what to change>

   ## Development Plan

   1. <Step 1>
   2. <Step 2>
   3. <Step 3>

   ## Acceptance Criteria

   - [ ] <Criterion 1>
   - [ ] <Criterion 2>
   ```

4. **Add the `claude-task` label** to the ticket:
   ```
   mcp__claude_ai_Atlassian__editJiraIssue(cloudId, issueIdOrKey, fields={ "labels": ["claude-task"] })
   ```

5. **Transition to "Selected for Development":**
   ```
   mcp__claude_ai_Atlassian__transitionJiraIssue(cloudId, issueIdOrKey, transition={ "id": "21" })
   ```

6. **Attach screenshots** when the ticket involves a visual issue or UI change:
   - Use the **TEST BROKER** browser (switch with `mcp__Claude_in_Chrome__switch_browser` if needed) — this is the browser logged into `test.broker@gigasoftware.io` at `localhost:4200`
   - Take a screenshot using `mcp__Claude_in_Chrome__computer` (action: `screenshot`) before creating the ticket
   - Save the screenshot to a temp file (e.g., `/tmp/<KEY>.png`)
   - Read the file as Base64: `base64 -i /tmp/<KEY>.png`
   - Attach via the `jira-mcp` MCP server:
     ```
     mcp__jira-mcp__add_attachment(issueKey="<KEY>", fileContent=<base64_string>, filename="<KEY>.png")
     ```
   - Clean up the temp file after successful upload
   - **Fallback** (if jira-mcp is not available): Use curl with credentials from `~/.claude/credentials/jira.md`:
     ```bash
     curl -s -X POST \
       -u "<email>:<api_token>" \
       -H "X-Atlassian-Token: no-check" \
       -F "file=@/tmp/<KEY>.png" \
       "https://gigasoftware.atlassian.net/rest/api/3/issue/<KEY>/attachments"
     ```
   - If both methods fail, include a clear description of the visual issue in the ticket description

7. **Report** the created tickets:
   ```
   Created claude-task tickets:

   - <KEY> — <summary> (epic: <EPIC-KEY>) [screenshot attached]
   - <KEY> — <summary> (epic: <EPIC-KEY>)
   ```

## Phase 4: End-of-Session Suggestions (Proactive)

At the end of a coding session, if significant work was done:

1. Review the files modified during the session
2. Identify 2-3 small follow-up tasks that fit the `claude-task` criteria
3. Present them to the user:
   ```
   Based on this session, here are some potential claude-task tickets:

   1. <title> — <description>
   2. <title> — <description>

   Want me to create any of these?
   ```

## Jira API Credentials

Screenshot attachments use the `jira-mcp` MCP server (cosmix/jira-mcp), which is configured with credentials via env vars in `~/.claude.json`. The `jira-mcp` server is installed at `~/.claude/mcp-servers/jira-mcp/`.

A backup copy of credentials is also stored at `~/.claude/credentials/jira.md` for the curl fallback.

If the `jira-mcp` MCP server is not available or the API token is expired/invalid:
1. Ask the user to create an API token at: https://id.atlassian.com/manage-profile/security/api-tokens
2. Update the `jira-mcp` env vars in `~/.claude.json` (under `mcpServers.jira-mcp.env.JIRA_API_TOKEN`)
3. Also update `~/.claude/credentials/jira.md` for the curl fallback:
   ```markdown
   # Jira API Credentials

   - **Instance:** https://gigasoftware.atlassian.net/
   - **Email:** <user's email>
   - **API Token:** <token from Atlassian>
   ```
4. Set file permissions: `chmod 600 ~/.claude/credentials/jira.md`

## Error Handling

- If no epic can be identified, ask the user which epic to use
- If the `claude-task` label doesn't exist yet in Jira, it will be created automatically when first applied
- If transition to "Selected for Development" fails, report but continue — the ticket is still created
- Never create duplicate tickets — check existing tickets under the epic first if unsure
- If the Jira API token is missing or invalid, prompt the user to create one (see Jira API Credentials above)
