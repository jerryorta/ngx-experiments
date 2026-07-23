Fail-fast readiness triage for the next N To-Do stories on an epic board. Runs a parallel, read-only Workflow that reads each candidate story from Jira and judges whether it is ready to implement — so `/epic-pipeline` (the `epic_runner`) never sinks a full 5–15 min implementation session into a story that is blocked, under-specified, or depends on unmerged work. The triage itself is ~30–60s of parallel Jira reads; the time it saves is the wasted implementation session it lets you skip.

**Usage:**
- `/epic-triage <board>` — triage the single next To-Do story
- `/epic-triage <board> <N>` — triage the next N To-Do stories (the batch `/epic-pipeline <board> <N>` would run)

**Available boards:** any `epic.<board>.json` under `.claude/skills/epic-next/` — none ship with this repo; create one with `/epic-plan <EPIC-KEY>` (Jira project **NGE**).

This is a **read-only** skill — it makes no Jira writes, no git changes, and starts no implementation. It only reports a gate verdict. It is the natural pre-flight for `/epic-pipeline` (see that skill's Step 0.5), and can also be run standalone any time you want to know whether the top of a board is worth starting.

---

## Step 0 — Parse arguments

Read `$ARGUMENTS`:
- **First token** = board name (required). If missing, list available boards from `.claude/skills/epic-next/epic.*.json` and stop — do not pick a default.
- **Second token** (optional) = a positive integer `N` (batch size). Default `1`.

## Step 1 — Load the board config

Read `.claude/skills/epic-next/epic.<board>.json`. If it does not exist, surface the path + the list of available boards and stop.

Extract: `name`, `epicKey`, `jql`, `storyOrdering`, `groupLabel`, `completionMessage`, `conventions`. (These are exactly the fields the triage engine needs; everything else in the config is for the implementation skills.)

## Step 2 — Run the triage workflow

Invoke the **Workflow** tool against the co-located engine, passing the config fields + batch size as `args`:

```
Workflow({
  scriptPath: "/Users/gigasoftware_developer/Dev/DEV_NGX_EXPERIMENTS/ngx-experiments/.claude/skills/epic-triage/triage-workflow.js",
  args: {
    board:             "<board>",
    epicKey:           config.epicKey,
    jql:               config.jql,
    storyOrdering:     config.storyOrdering,
    groupLabel:        config.groupLabel,
    completionMessage: config.completionMessage,
    conventions:       config.conventions,
    batchSize:         <N>
  }
})
```

The workflow runs in the background and notifies on completion. It:
1. **Select** (1 agent): resolves the Atlassian `cloudId`, runs `config.jql`, and — for `storyOrdering: "epic-description"` — cross-references the epic's description wave order to pick the next `N` To-Do stories **in the exact order `epic_runner` would implement them**. This mirrors `/epic-next` Steps 3–7.
2. **Judge** (N agents, parallel): one read-only agent per story reads its description / acceptance criteria / issue links / comments and returns a structured readiness verdict.

It returns `{ noStoriesRemaining, board, epicKey, cloudId, verdicts: [...] }`, ordered by `wavePosition`. Each verdict:

```
{ key, summary, status, wavePosition, group,
  verdict: "READY" | "RISKY" | "BLOCKED",
  confidence: "high" | "medium" | "low",
  findings: [{ severity: "blocker" | "warning", type, detail }],
  oneLineReason }
```

If `noStoriesRemaining` is true, report `config.completionMessage` and stop.

## Step 3 — Compute the gate

The story the runner implements FIRST is `verdicts[0]` (lowest `wavePosition`). The gate keys off it, because the runner is sequential + fail-fast:

| Condition | Gate | Meaning |
|---|---|---|
| `verdicts[0].verdict === "BLOCKED"` | 🔴 **RED** | Do NOT start the runner — the very next story would burn a session and fail. |
| `verdicts[0]` is READY/RISKY **and** some later story is BLOCKED | 🟡 **AMBER** | Safe to start, but the batch will stall when it reaches the blocked story — trim `N` or fix it first. |
| `verdicts[0].verdict === "RISKY"` (and no later BLOCKED) | 🟡 **AMBER** | Implementable, but flagged — eyeball the warning before committing a session. |
| All `READY` | 🟢 **GREEN** | Clear to run. |

## Step 4 — Render the report

Lead with the gate banner, then a per-story table, then the findings for anything not READY:

```
Epic triage — <config.name> (<epicKey>)   ·   N story/stories   ·   <🟢 GREEN | 🟡 AMBER | 🔴 RED>

| # | Key      | <groupLabel> | Verdict   | Conf | One-line reason |
|---|----------|--------------|-----------|------|-----------------|
| 1 | NGE-xxx  | Wave 2       | 🔴 BLOCKED | high | <oneLineReason> |
| 2 | NGE-yyy  | Wave 2       | 🟢 READY   | high | <oneLineReason> |

Findings (non-READY only):
  NGE-xxx  [blocker · open-dependency] <detail>
  NGE-xxx  [warning · missing-acceptance-criteria] <detail>
```

Then a one-line recommendation derived from the gate:
- 🟢 GREEN → `Clear to run: /epic-pipeline <board> <N>`
- 🟡 AMBER → name the risk and the cheaper option (e.g. `Run /epic-pipeline <board> 1` to take only the ready story, or resolve <KEY>'s <finding> first).
- 🔴 RED → `Hold. Resolve <KEY>'s <blocker> before starting the runner.` Point at the specific finding(s); offer to open the ticket.

## Notes

- **Triage is advice, not a guarantee.** It reliably catches the cheap-to-detect classes (empty/thin description, explicit blocked-by links to unmerged work, load-bearing TBDs, named-but-missing artifacts, convention conflicts). A story can still look ready on the ticket and reveal problems mid-implementation — the gate lowers wasted-session risk, it does not eliminate it. Confidence is reported per story; treat `low`-confidence verdicts as "the ticket was too thin to judge well" (often itself a readiness smell).
- **Intra-batch dependencies are not blockers.** Because the runner cuts each branch from a freshly-pulled `main`, a dependency on a story earlier in the SAME batch is satisfied by the time the runner reaches the dependent story. The engine tells each judge the full ordered batch so it only flags dependencies on work outside the batch that isn't Done.
- **Cost.** N+1 read-only agents (1 selection + N judges), all Jira reads, ~30–60s wall-clock regardless of N (judges run in parallel, cap ~10–16). No writes anywhere.
- **MCP namespace:** the engine uses `mcp__claude_ai_Atlassian__*` (the live server). The older `mcp__atlassian__*` names in `/epic-next` are stale aliases.
- Pairs with `/epic-pipeline` (Step 0.5 runs this automatically unless `--skip-triage`) and `/epic-next` (interactive single-story flow). Board configs are owned by `/epic-config`.
