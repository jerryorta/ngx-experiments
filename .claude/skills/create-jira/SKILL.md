Capture ONE Jira finding (bug / task / story) under an epic during an app review — board-parameterized, born-split, evidence-as-asset. Stateless so you can `/clear` between tickets: $ARGUMENTS

## What this does

Logs a single reviewer finding as a child ticket of a named epic, on **any** board in this repo, following the plans-repo **born-split** (Jira = status stub, `gigasoftware-plans/<board>/<KEY>.md` = content). Screenshots are saved as git-versioned assets next to the ticket. Root cause is researched in a **subagent** so the verbose output never lands in your main context.

**Use it like this:** `/create-jira cog 50` → describe the finding + drop a screenshot path → a ticket is filed under COG-50 → you `/clear` → repeat. One finding per invocation.

Companion to (not a caller of) `/claude-task` (autonomous-exec archetype + suggest-mode) and `/jira` (works a ticket). All three share the born-split convention in `~/Dev/gigasoftware-plans/AGENTS.md`.

## Design invariants (preserve when editing)

- **Stateless across invocations.** Everything comes from `$ARGUMENTS` + files on disk (plans repo, `epic.<board>.json`, `jira.json`) — NEVER from conversation history. This is what makes `/clear` between tickets lossless.
- **Args win over config.** The board arg is authoritative for project + plans-dir; the epic is authoritative from the id arg. `epic.<board>.json` is read ONLY for optional domain enrichment and its `epicKey` is IGNORED. This keeps `/create-jira` independent of whatever `/epic-next` is doing on the same board.
- **Offload verbose work to a subagent.** Code research + screenshot triage run in an Agent; only a compact result returns to the main context.
- **Capture only.** Never fix code or open a PR here — that's `/jira`.

## Arguments

`/create-jira <board> [epic-id] [type] [free-text description…]`

- **`<board>`** (required) — the lowercased Jira project key, which is also its plans-repo folder: `cog`, `arch`, `rex`, `gy`, `sp`, … → `projectKey = board.upperCase()`, `plansDir = ~/Dev/gigasoftware-plans/<board>/`.
- **`[epic-id]`** (optional) — the parent epic. A bare number (`50` → `<PROJECT>-50`) or a full key (`COG-50`). If **omitted**, fall back to `epic.<board>.json`'s `epicKey` and **echo which epic you're filing under before creating anything**.
- **`[type]`** (optional) — `bug` | `task` | `story`. If omitted, infer and state it.
- Remaining tokens (and anything the user says this turn) = the finding description + screenshot path(s).

Parse tokens left-to-right: token 0 = board; token 1 = epic-id iff it matches `^\d+$` or `^[A-Za-z]+-\d+$` (else there is no id → config fallback); next token = type iff it matches `^(bug|task|story)$`; the rest is free text.

---

## Step 0 — Resolve board + epic (cheap, do first)

1. Parse `$ARGUMENTS`. If no board token, list `~/Dev/gigasoftware-plans/*/` folders as the valid boards and stop.
2. `projectKey = board.toUpperCase()`; `plansDir = ~/Dev/gigasoftware-plans/<board>`.
3. **Epic key:**
   - id given → `epicKey = <PROJECT>-<num>` (or the full key as-is).
   - id omitted → read `.claude/skills/epic-next/epic.<board>.json` and use its `epicKey`; **print** `Filing under <epicKey> (default from epic.<board>.json — pass an explicit id to override).`
4. **Verify the epic exists** (never assume): `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py board --jql 'key = <epicKey>'` → confirm one row of `type: Epic`. If missing/not an epic, stop and report (likely a wrong board or number).
5. **cloudId:** read from `~/Dev/gigasoftware_secrets/jira.json` (`python3 -c "import json;print(json.load(open('…/jira.json'))['cloudId'])"`). Known value fallback: `0c34459b-6029-4c84-962e-da03ad010fd0`.
6. **Optional domain enrichment** — if `.claude/skills/epic-next/epic.<board>.json` exists, read only these domain-stable fields and bind them: `commitScope`, `app`, `libraries` (research-scope hints), `conventions`, `domainMemoryIndex`. **Ignore `epicKey`.** If `domainMemoryIndex` is set, Read `/Users/gigasoftware_developer/Dev/gigasoftware-memory/memory/<domainMemoryIndex>`. Missing config → skip enrichment; `commitScope` defaults to `<board>` and research falls back to a scoped repo search.
7. **Load MCP tools:** `ToolSearch("select:mcp__claude_ai_Atlassian__createJiraIssue,mcp__claude_ai_Atlassian__getTransitionsForJiraIssue,mcp__claude_ai_Atlassian__transitionJiraIssue")`.

## Step 1 — Capture the finding

1. Collect from the user this turn: the description, an optional `type`, and screenshot path(s).
2. **Copy-on-receipt (FIRST action for any screenshot path).** macOS screenshot temp files are purged fast and their names use a narrow no-break space (`U+202F`) before AM/PM — so **glob, never exact-name**:
   ```bash
   FILE=$(find "<dir-of-the-given-path>" -maxdepth 1 -type f -iname '<prefix>*.png' | head -1)
   cp "$FILE" "<scratchpad>/cj-shot-NN.png"
   ```
   Then `Read` the staged copy to triage it (or delegate this to the Step 2 subagent to keep image tokens out of your context).
3. Ask a clarifying question ONLY if the ticket would otherwise be ambiguous. Default to proceeding.

## Step 2 — Research root cause (subagent)

For a code-related finding, spawn ONE subagent (Agent tool, `Explore` or `general-purpose`) scoped to `app` + `libraries` from Step 0. Prompt it to return **only**: the root cause, the `file:line` anchors (handler + template + spec), and a one-line suggested fix. Do the grep/read there, not in the main context. Skip for non-code findings (copy, content, pure-visual) or research inline if trivial.

## Step 3 — Create the ticket (born-split)

1. **Type:** use the given `type`, else infer — broken / regressed / wrong-behavior → **Bug**; polish / copy / small enhancement / standards-alignment → **Task**; needs real acceptance criteria / multi-part → **Story**. State the chosen type.
2. **Mint the KEY** — `createJiraIssue(cloudId, projectKey, issueTypeName=<Bug|Task|Story>, parent=<epicKey>, summary=<concise, <80 chars>, description="See gigasoftware-plans/<board>/<KEY>.md")`. Read `key` from the response.
3. **Write** `<plansDir>/<KEY>.md` using the matching template below (front matter `jira/project/board/type/epic/summary` + body).
4. **Assets** — for each staged screenshot: `mkdir -p <plansDir>/assets/<KEY>` then `cp` it to `<plansDir>/assets/<KEY>/NN-<slug>.png`, and embed in the md with a **relative** link: `![<alt>](assets/<KEY>/NN-<slug>.png)`.
5. **Epic index (conditional)** — if `<plansDir>/<epicKey>.md` has a Findings/index section, append `- <KEY> — <summary> · <Type>` under the right area subheader (create the subheader if absent). If no such section, skip (the Jira parent link is the source of truth).
6. **Transition** — `getTransitionsForJiraIssue(cloudId, KEY)`; pick the transition whose target status name is `To Do` and apply it (`transitionJiraIssue`). Never guess the id — it varies by project (COG happens to be `61`). If there's no `To Do`, leave it as created and note it.
7. **Stub** — `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py stub <KEY>`.
8. **Commit (plans repo, local only — do NOT push; the user batches pushes):**
   ```bash
   cd ~/Dev/gigasoftware-plans && git add <board>/<KEY>.md <board>/assets/<KEY> <board>/<epicKey>.md && \
   git commit -m "docs(<board>): <KEY> <short summary>"   # + the session's standard co-author trailer
   ```
9. **Desktop cleanup** — for any screenshot that came from `~/Desktop`, delete the original ONLY after a byte-verify against the committed asset:
   ```bash
   cmp -s "<desktop-original>" "<plansDir>/assets/<KEY>/NN-<slug>.png" && rm "<desktop-original>"
   ```
   Locate the original by glob (U+202F-safe). Never delete on a mismatch.

## Step 4 — Report, then clear

Print one compact block and nothing else verbose:

```
<KEY> · <type> · To Do · under <epicKey>
<summary>
root cause: <file:line> — <one line>
files: <board>/<KEY>.md · assets/<KEY>/NN-*.png
https://gigasoftware.atlassian.net/browse/<KEY>
```

Then remind: `/clear` and run the next `/create-jira <board> <epic>`.

---

## Content templates

### Bug — `<plansDir>/<KEY>.md`

```markdown
---
jira: <KEY>
project: <PROJECT>
board: <board>
type: bug
epic: <epicKey>
summary: "<summary>"
---

# <KEY> — <summary>

**Type:** Bug · **Epic:** <epicKey> · **Area:** <area> · **Viewport:** <mobile|desktop|both>

## Steps to reproduce
1. …

## Expected
…

## Actual
…

## Root cause
- `path/to/file.ts:LINE` — <what's wrong>

## Suggested fix
- <one or two lines>

## Evidence
![<alt>](assets/<KEY>/01-<slug>.png)

## Acceptance
- <verifiable outcome>
- `<domain>-*` lint + test green.
```

### Task / Story — `<plansDir>/<KEY>.md`

```markdown
---
jira: <KEY>
project: <PROJECT>
board: <board>
type: <task|story>
epic: <epicKey>
summary: "<summary>"
---

# <KEY> — <summary>

**Type:** <Task|Story> · **Epic:** <epicKey> · **Area:** <area> · **Viewport:** <mobile|desktop|both>

## Goal
<what should change and why>

## Scope
- `path/to/file` — <change>

## Evidence
![<alt>](assets/<KEY>/01-<slug>.png)

## Acceptance
- <criterion>
- `<domain>-*` lint + test green.
```

## Error handling

- Epic not found / not an Epic → stop, report (wrong board or number).
- No screenshot supplied → omit the Evidence section (don't fabricate one).
- `createJiraIssue` custom-field error → retry with a minimal payload; if it persists, report and leave no orphan file.
- Transition step fails → ticket still exists; report it as `Backlog` and continue.
- This skill never pushes and never touches app code.
