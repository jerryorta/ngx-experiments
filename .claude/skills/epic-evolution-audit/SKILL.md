Audit sibling and downstream stories of an in-progress epic for staleness against the just-completed story, then apply targeted edits so the rest of the epic reflects what actually shipped. Run **directly before `/epic-story-complete`** as the canonical propagation step for `epicEvolutionRules`.

**Usage:**
- `/epic-evolution-audit` — preferred. Infer the board + just-completed ticket key from the current conversation context.
- `/epic-evolution-audit <board> <KEY>` — explicit override.
- `/epic-evolution-audit --dry-run` — produce the findings list, do not apply edits. Useful when you want to review before letting the skill write the edits to the local plan files.
- `/epic-evolution-audit --include=KEY1,KEY2` — restrict the audit to a specific subset of sibling keys (skip the auto-discovery of children).
- `/epic-evolution-audit --skip=KEY1,KEY2` — exclude specific siblings from the audit.

**Available boards:** same as `/epic-next` — defined by `epic.<board>.json` files in `.claude/skills/epic-next/`.

> **Session model:** assumes one story per session, same as `/epic-next` and `/epic-story-complete`. The conversation that planned, implemented, and validated the story is the same conversation that runs this audit.

---

## When to use

- Right after `/epic-next` finishes the per-story `/jira` handoff, **before** running `/epic-story-complete`. The story has been implemented and the test/build gate passed; the next step is to make sure the rest of the epic reflects what just landed.
- After any in-session decision that surfaced an architectural shift, naming canonicalization, deferred AC, new gap, or open question that got settled.
- Whenever the parent epic's wave plan mentions stories whose descriptions might have been written before the just-completed work changed something.

## When NOT to use

- The just-completed work was a pure refactor / typo fix / docs-only change with zero architectural surface area.
- `config.epicEvolutionRules` is `null` for this board (the board opted out of epic evolution propagation; respect that).
- The session has already left for an unrelated task — re-establish context first or use the explicit-args form.

---

## Step 0 — Resolve board + just-completed ticket key

Same resolution chain as `/epic-story-complete`:

1. **Explicit args first.** If `<board>` and `KEY-123`-shaped token both appear in args, use them.
2. **Branch fallback.** Read `git rev-parse --abbrev-ref HEAD`. The current branch should be `feat/<key-lower>-<slug>`. Extract the key from the first two segments after `feat/`. Match the key's prefix (e.g. `NGE`) against each `epic.*.json`'s `epicKey` prefix to resolve the board.
3. **Conversation context.** If branch parsing fails, look for the most recent `/epic-next <board>` and the dominant in-progress ticket key.
4. **Last resort: ask** via `AskUserQuestion`.

Echo the resolved values prominently in Step 7's confirmation block so a wrong inference is visible before edits fire.

## Step 1 — Load board config

Read `.claude/skills/epic-next/epic.<board>.json` and bind fields as `config.field`. Fields this skill consumes:

- `config.epicKey` — the parent epic to audit children of
- `config.epicEvolutionRules` — **required**; if `null`, stop and tell the user this board opted out
- `config.commitScope` — passed into the audit context (optional)

If `config.epicEvolutionRules` is `null`, print a one-line note that the board opted out, and stop.

## Step 2 — Parse remaining flags

After stripping board + ticket key:

- `--dry-run` — print the audit findings and proposed edits but skip writing them to the plan files
- `--include=KEY1,KEY2,…` — restrict siblings to this list (still includes the parent epic for wave-plan check unless explicitly excluded)
- `--skip=KEY1,KEY2,…` — exclude these from the audit

## Step 3 — Load Atlassian MCP tools

Board navigation and ticket content (descriptions / wave plans) come from the **gigasoftware-plans** repo, not the Atlassian MCP (which returns a ~5.5k-char fat envelope per issue and ignores field-narrowing — a 10-issue board query is ~55k chars). Canonical guide: `~/Dev/gigasoftware-plans/AGENTS.md`. Descriptions are **read from and written to** the local `<board>/<KEY>.md` files; comments (and the scoped status / labels read) stay on the MCP, and board navigation goes through the plans board-nav script.

Load via ToolSearch the two tools this skill still calls on the MCP:

- `select:mcp__claude_ai_Atlassian__getAccessibleAtlassianResources`
- `select:mcp__claude_ai_Atlassian__getJiraIssue`

`getJiraIssue` is used only for the scoped `comment` read (plus status / labels) — the §2 hybrid pattern in the plans guide; descriptions come from the local plan files. `getAccessibleAtlassianResources` supplies the `cloudId` that scoped read needs.

(Do **not** load `searchJiraIssuesUsingJql` — board nav goes through the plans board-nav script. Do **not** load `editJiraIssue` — description edits are written to the local plan files, never to Jira. Do **not** load create/transition/comment tools — this skill only edits descriptions. Creating new sibling stories is a separate user action.)

## Step 4 — Get cloud ID + read the just-completed ticket

The **description** comes from the local plan file (source of truth); **comments + status + labels** come from a scoped MCP read (the §2 hybrid pattern in the plans guide) — drop `expand="renderedFields"` and `description` from the field list:

```
python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <KEY>   → prints the local <prefix>/<KEY>.md path; Read it for the description
mcp__claude_ai_Atlassian__getAccessibleAtlassianResources()  → cloudId
mcp__claude_ai_Atlassian__getJiraIssue(cloudId, KEY, fields=["summary","comment","status","labels"], responseContentFormat="markdown")
```

Save: `summary`, `description` (from the local plan file), full comment body list, status, labels. The audit subagent uses these to understand what the just-completed story actually settled.

## Step 5 — Discover candidate sibling + downstream stories

Default candidate set:

1. **All child stories of the parent epic** that aren't the just-completed one and aren't already `Done` — via the plans board-nav script (live status, ~200 B/issue):
   ```
   python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py board --jql 'parent = <config.epicKey> AND key != <KEY> AND status != Done'
   ```
   Returns JSON `[{key,status,category,type,priority,parent,summary}]`; use `key`, `summary`, `status` for the candidate list.
2. **Explicitly referenced sibling keys** from the just-completed ticket's description and comments. Regex-match `[A-Z]+-\d+` against both, dedupe against the board-nav results, and status-check any extras with a second board-nav query (`board --jql 'key in (KEY1, KEY2, …)'`) — keep only To Do / In Progress / In Review.
3. **The parent epic itself** (`config.epicKey`) — its wave-plan / description may need updates to reflect new siblings created during the just-completed story.

Apply `--include` / `--skip` filters from Step 2.

If the candidate set is empty after filters, print a one-line summary ("No siblings to audit; epic is clean.") and stop.

## Step 6 — Spawn the audit subagent

This is the heart of the skill. Use the `Agent` tool (subagent_type: `general-purpose`) to run the audit. Spawn **one foreground agent**, do not parallelize — the audit needs to reason about cross-story interactions and a single agent has the full picture.

Give the subagent:

1. The just-completed ticket: full summary, full description, all comments, status, labels.
2. The candidate sibling list: keys + summaries (the agent reads each description from its local plan file itself).
3. The relevant code surface: file paths the just-completed story touched (extract from the conversation transcript or from `git diff --stat HEAD~1` if the commit hasn't happened yet — Step 4 of /epic-story-complete may have already produced this; otherwise re-derive).
4. The `config.epicEvolutionRules` verbatim — these are the binding rules the audit enforces.
5. The cloud ID + the tools it uses to read each candidate: the plans script (`jira_to_md.py ensure <KEY>` + Read) for descriptions, and `mcp__claude_ai_Atlassian__getJiraIssue` for comments.

Subagent prompt template:

---
```
You are the epic-evolution audit agent for a single just-completed story. Your job is to find every place
the rest of the epic has gone stale because of what this story actually settled, and propose surgical
description edits per sibling/downstream story.

## Just-completed story
Key: <KEY>
Summary: <Jira summary>
Status: <status>
Labels: <labels>

Description (markdown):
<full description>

Comments (most recent first):
<each comment body>

## Code surface (files this story modified)
<list of file paths from the diff>

## Epic evolution rules (binding)
<verbatim copy of config.epicEvolutionRules>

## Candidate siblings to audit
<for each: KEY — summary — current status>
Also audit the parent epic itself: <config.epicKey>.

## Ticket access
- Description / wave plan (source of truth): run
  `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <KEY>` to print the local `<prefix>/<KEY>.md` path, then Read it.
- Comments: scoped MCP read — Cloud ID: <cloudId>; for each candidate call
  mcp__claude_ai_Atlassian__getJiraIssue(cloudId, KEY, fields=["summary","comment"], responseContentFormat="markdown")
- Read the full description (local plan file) plus all comments (MCP) before judging staleness.

## Audit dimensions

For each candidate, check whether the description (or a comment marked as authoritative)
contains any of the following types of staleness against the just-completed story:

1. **Field-name drift** — names that were renamed by the just-completed story (e.g. orgId → entityId).
2. **Type / enum drift** — added or removed enum values, narrowed types, new shared model interfaces.
3. **API contract drift** — callables, function signatures, HTTP endpoints whose shape was settled differently
   from what the candidate description assumed.
4. **Locked-decision drift** — questions the candidate description still treats as open that the just-completed
   story actually settled.
5. **Deferred AC propagation** — acceptance criteria from the just-completed story that were deferred to a
   sibling. Verify the right sibling has the deferred AC in its scope (or recommend creating a new sibling
   story if no existing sibling fits).
6. **Status / dependency drift** — descriptions saying "depends on NGE-X" / "NGE-X must ship first" when
   NGE-X is the just-completed story. Update to "shipped <date>" or "NGE-X provides X, Y, Z".
7. **Wave-plan currency (parent epic only)** — new sibling stories created during the just-completed work
   should appear in the wave plan **as a one-line `KEY — short summary` entry only**; the wave plan should
   not silently drift from the actual story set. NEVER add per-story implementation annotations to the epic.
8. **Cross-cutting pivot additions (parent epic only)** — if this story established a genuinely *cross-cutting*
   pivot (one that changes how multiple siblings are built), the parent epic's "Key decisions / pivots"
   section may get ONE new one-line bullet for it. Do NOT copy implementation-level invariants or detailed
   rules into the epic (e.g. "library X is a leaf — zero framework imports" belongs in library X's own ticket
   or `docs/ai/CONSTRAINTS.md`, not the epic). The epic stays slim: overall description + wave order
   (one-liners) + a few high-level pivots.

## Audit non-goals

- Do NOT propose summary changes. Summaries usually outlive descriptions and renaming them creates
  notification noise.
- Do NOT touch acceptance criteria status checkboxes — those track work, not facts.
- Do NOT rewrite an entire description. Surgical edits only — change the smallest contiguous block that
  resolves the staleness.
- Do NOT propose creating new sibling stories yourself — only flag where one would be needed and let the
  user decide. (The user runs that creation step, not this skill.)
- Do NOT add implementation detail, acceptance criteria, locked-invariant prose, or follow-up specs to the
  PARENT EPIC description. The epic holds ONLY its overall description + wave order (one-liners) + a few
  high-level pivots; all story-level detail lives in the child ticket whose scope it is (or the linked docs).
  Scope must be readable from the child ticket alone. Edits that push detail INTO a child ticket are fine and
  encouraged; edits that push detail into the epic are the anti-pattern this audit must not commit.

## Output format

Return a single structured block in this exact shape, one section per candidate, in the order received:

EVOLUTION_AUDIT_START

### NGE-XXX — <summary>
Status: <status>
Verdict: STALE | CLEAN | NEW_STORY_RECOMMENDED

<If STALE:>
Findings:
  - <dimension #N>: <one-line description of the drift>
  - <dimension #N>: <…>

Proposed edit:
  ```
  <the EXACT replacement text — only the contiguous block that changes;
   include 2-3 lines of context above and below so the user can place it visually>
  ```
  Replacing:
  ```
  <the EXACT existing block being replaced>
  ```

<If NEW_STORY_RECOMMENDED:>
Recommended new story:
  Title: <proposed summary>
  Why: <which dimension surfaced this — usually deferred AC>
  Suggested status on creation: To Do if ready to be worked next (/epic-next's JQL only picks up To Do);
    Backlog if deferred / not-yet-ready (tracked but not auto-picked). Either way it is a CHILD ticket — its
    scope/detail lives in the ticket, never copied into the parent epic description.
  Suggested parent: <config.epicKey>
  Suggested label hint: <e.g. observability, schema, adoption>

<If CLEAN:>
(no findings)

EVOLUTION_AUDIT_END

## Rules of conduct

- Quote exactly. Never paraphrase the existing description text in the "Replacing" block. The skill's
  next step does a literal find-and-replace in the candidate's local plan file.
- If the existing block is too long to embed verbatim safely (over ~200 lines), break it into smaller
  contiguous edits. Each "Proposed edit" / "Replacing" pair must be a unique substring of the existing
  description so the find-and-replace is unambiguous.
- Confidence threshold: only emit findings you are ≥80% sure of. Borderline cases stay silent. The user
  will catch anything missed and re-run if needed.
- Cite the source of each finding (e.g. "from NGE-253 description § Schema: timestamp is ISO 8601, not
  EpochMillis").
```
---

Wait for the subagent to return. Parse the content between `EVOLUTION_AUDIT_START` and `EVOLUTION_AUDIT_END`.

## Step 7 — Confirmation gate

Print a digest of the audit findings followed by a confirmation prompt via `AskUserQuestion`:

```
/epic-evolution-audit — findings

Just-completed:  <KEY> — <summary>   (status: <status>)
Parent epic:     <config.epicKey>
Audited:         <N> candidates
Verdicts:        <X> stale  •  <Y> clean  •  <Z> new-story-recommended
Mode:            apply | dry-run

Stale candidates:
  - NGE-A — <one-line drift summary>
  - NGE-B — …

New story recommendations:
  - <title> — <one-line why>
  - …

Clean (no edits proposed):
  - NGE-C, NGE-D, …

Apply all proposed edits to the stale candidates? (yes / pick / no)
  yes  → apply every proposed edit to its local plan file
  pick → ask, candidate by candidate, which to apply
  no   → stop, print the audit so the user can act manually
```

Three responses to handle:

- **yes** → proceed to Step 8 with the full edit set.
- **pick** → for each stale candidate, ask `AskUserQuestion` "apply edit to NGE-X? (yes/no/preview)". `preview` re-shows the proposed-vs-replacing blocks.
- **no** → print the full audit verbatim and stop. The user takes manual action.

If `--dry-run` was passed, skip the prompt entirely and behave as if the user picked **no** (print the audit, stop).

## Step 8 — Apply description edits

For each candidate the user approved, edit its **local plan file** directly (per §4 of the plans guide — descriptions are files, never `editJiraIssue`). Resolve the file path once, then apply the audit's edit as a literal find-and-replace of the "Replacing" block with the "Proposed edit" block:

```
path=$(python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <KEY>)   → <prefix>/<KEY>.md
```

Use the `Edit` tool on `$path` to swap the "Replacing" block for the "Proposed edit" block (or `Write` the full updated file if the block spans too much to match safely).

> **Atomicity note:** edit each candidate's file in its own `Edit` / `Write` call. Failures on one don't affect the others.
> If the find-and-replace match fails (the "Replacing" block isn't found verbatim in the local file), report it to the user
> and skip that candidate — never let the description go to the file partially mangled.
> The plan file is the only copy of the description; Jira keeps status. Re-pointing Jira's stub description at the file (the DESTRUCTIVE `jira_to_md.py stub <KEY>` pass, §4) is a separate user action — this skill never writes descriptions to Jira.

## Step 9 — Final report

```
✓ Epic evolution audit complete

Audited:      <N> candidates of <config.epicKey>
Edits applied: <K> of <X> stale candidates
Skipped:      <Z> (user declined or find-and-replace mismatch)

Updates:
  - NGE-A — <one-line summary of edit>
  - NGE-B — …

New story recommendations (NOT auto-created — user action):
  - <title> — <why> — create in 'To Do' status with parent <config.epicKey>
    Suggested: /claude-task or manual creation in Jira

Next: run /epic-story-complete to wrap up <KEY>.
```

If any new-story recommendations exist, suggest the user create them **before** running `/epic-story-complete` so the parent epic's wave-plan edit (if applicable) can reference them by key. The audit re-run is idempotent — re-running after creation will pick up the new sibling and add it to the wave plan if needed.

---

## Composition with neighbouring skills

| Skill | Relationship |
|---|---|
| `/epic-next` | Produces the just-completed story. This skill audits the rest of the epic for drift the story introduced. |
| `/epic-story-complete` | Runs **after** this skill. Its built-in Step 5b (`Epic evolution check`) becomes a no-op once this skill has propagated the decisions explicitly. |
| `/epic-config` | View / update the `epicEvolutionRules` field that drives this skill's audit dimensions. |
| `/epic-plan` | Uses the same wave-plan structure this skill keeps in sync. |

---

## Error handling

- **Missing board / KEY** → resolve via Step 0 chain; ask if all four paths fail.
- **`config.epicEvolutionRules` is null** → stop with a one-line note. The board opted out.
- **Empty candidate set after filters** → stop, no audit needed.
- **Subagent returns malformed output** (no `EVOLUTION_AUDIT_START` / `EVOLUTION_AUDIT_END` markers, or unparseable sections) → re-prompt the agent once with stricter formatting instructions, then surface the raw response and stop.
- **find-and-replace mismatch** during Step 8 → report the candidate, skip it, continue with the rest. Do not partial-write.
- **Atlassian API error on a single candidate** → report it, continue with the rest.
- **`--dry-run`** → skip Step 7's prompt and Step 8; print the audit findings and stop.

## Notes

- This skill makes **description edits only**. It does not transition tickets, create new stories, or post status comments. Those are deliberate user actions — the skill's job is to surface what needs them.
- The audit is conservative: it errs on the side of leaving descriptions alone when the staleness is borderline. The user can always re-run with a tighter `--include=` set if a sibling slipped through.
- Re-running after creating new sibling stories is idempotent and safe — the audit picks up new children and updates the wave plan accordingly.
- The skill does NOT auto-update long-form design docs (this repo keeps them under `docs/architecture/` and `docs/demos/`) — those edits stay manual since they often need human judgement about what to add. (A future variant could surface document drift, but it's intentionally out of scope here.)
