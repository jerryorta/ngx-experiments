export const meta = {
  description:
    'Fail-fast readiness triage of the next N To-Do stories on an epic board, BEFORE the epic_runner spends a full 5-15 min implementation session on each. Parallel read-only Jira reads + per-story readiness verdicts.',
  name: 'epic-triage',
  phases: [
    { detail: 'resolve cloudId + pick the next N To-Do stories in wave order', title: 'Select' },
    {
      detail: 'one read-only agent per story scores implementation-readiness (parallel)',
      title: 'Judge',
    },
  ],
};

// ── Inputs (passed verbatim as `args` by the /epic-triage skill, read from epic.<board>.json) ──
//   { board, epicKey, jql, storyOrdering, groupLabel, completionMessage, conventions[], batchSize }
// Be robust to the harness delivering `args` as a JSON-encoded string instead of an object.
let cfg = args || {};
if (typeof cfg === 'string') {
  try {
    cfg = JSON.parse(cfg);
  } catch {
    cfg = {};
  }
}
const BATCH = Math.max(1, Number(cfg.batchSize) || 1);

if (!cfg.epicKey || !cfg.jql) {
  log(
    `epic-triage: missing required config (epicKey / jql). typeof args=${typeof args}; received keys=${Object.keys(cfg || {}).join(',') || '(none)'}.`
  );
  return { error: 'missing-config', noStoriesRemaining: false, verdicts: [] };
}

const SELECT_SCHEMA = {
  additionalProperties: false,
  properties: {
    cloudId: { type: 'string' },
    noStoriesRemaining: { type: 'boolean' },
    stories: {
      items: {
        additionalProperties: false,
        properties: {
          group: { type: 'string' },
          key: { type: 'string' },
          summary: { type: 'string' },
          wavePosition: { type: 'integer' },
        },
        required: ['key', 'summary', 'wavePosition', 'group'],
        type: 'object',
      },
      type: 'array',
    },
  },
  required: ['cloudId', 'noStoriesRemaining', 'stories'],
  type: 'object',
};

const JUDGE_SCHEMA = {
  additionalProperties: false,
  properties: {
    confidence: { enum: ['high', 'medium', 'low'], type: 'string' },
    findings: {
      items: {
        additionalProperties: false,
        properties: {
          detail: { type: 'string' },
          severity: { enum: ['blocker', 'warning'], type: 'string' },
          type: {
            enum: [
              'empty-description',
              'open-dependency',
              'unresolved-decision',
              'missing-artifact',
              'convention-conflict',
              'missing-acceptance-criteria',
              'oversized-scope',
              'soft-dependency',
              'other',
            ],
            type: 'string',
          },
        },
        required: ['severity', 'type', 'detail'],
        type: 'object',
      },
      type: 'array',
    },
    key: { type: 'string' },
    oneLineReason: { type: 'string' },
    status: { type: 'string' },
    summary: { type: 'string' },
    verdict: { enum: ['READY', 'RISKY', 'BLOCKED'], type: 'string' },
  },
  required: ['key', 'summary', 'status', 'verdict', 'confidence', 'findings', 'oneLineReason'],
  type: 'object',
};

// ── Stage 1: selection (single agent — selection is a global cross-ref of JQL ∩ wave order) ──
phase('Select');

const selectionPrompt =
  `You are the SELECTION stage of an epic-readiness triage. Resolve the Atlassian site and pick the next ` +
  `${BATCH} To-Do story/stories for this epic board, in the exact order the epic_runner would implement them.\n\n` +
  `Board: ${cfg.board}\nEpic key: ${cfg.epicKey}\n` +
  `JQL (finds To-Do children): ${cfg.jql}\n` +
  `Story ordering: ${cfg.storyOrdering || 'jql'}  ("jql" = JQL order directly; "epic-description" = order from the epic's description, cross-referenced against the JQL result)\n` +
  `Group label: ${cfg.groupLabel || 'Group'}\nBatch size N: ${BATCH}\n\n` +
  `Steps:\n` +
  `1. ToolSearch: select:mcp__claude_ai_Atlassian__getAccessibleAtlassianResources,mcp__claude_ai_Atlassian__getJiraIssue,mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql\n` +
  `2. getAccessibleAtlassianResources() → use the first resource's id as cloudId.\n` +
  `3. searchJiraIssuesUsingJql(cloudId, jql=<the JQL above>, fields=["summary","status","priority"]) → the set of To-Do stories. If it returns zero, set noStoriesRemaining=true and stories=[] and stop.\n` +
  `4. If ordering is "epic-description": getJiraIssue(cloudId, ${cfg.epicKey}, fields=["description"], responseContentFormat="markdown"); parse the ordered list of story keys top→bottom, preserving wave/section grouping as the group. Then cross-reference: take the first ${BATCH} keys from that ordered list that ALSO appear in the JQL result. ` +
  `If ordering is "jql": take the first ${BATCH} stories from the JQL result directly (group = priority).\n` +
  `5. Return cloudId, noStoriesRemaining, and stories[] with key, summary, 1-based wavePosition (in the picked order), and group. Cap at ${BATCH} stories. Use only real keys present in the JQL result — never invent keys.`;

const selection = await agent(selectionPrompt, {
  label: 'select',
  phase: 'Select',
  schema: SELECT_SCHEMA,
});

if (
  !selection ||
  selection.noStoriesRemaining ||
  !selection.stories ||
  selection.stories.length === 0
) {
  log(cfg.completionMessage || 'No To-Do stories remain on this board.');
  return {
    cloudId: selection ? selection.cloudId : null,
    noStoriesRemaining: true,
    verdicts: [],
  };
}

log(
  `Selected ${selection.stories.length} story/stories: ${selection.stories.map(s => s.key).join(', ')}`
);

// ── Stage 2: per-story readiness judges (parallel fan-out — the time-saving core) ──
phase('Judge');

const conventionsBlock = (cfg.conventions || []).map(c => `- ${c}`).join('\n') || '(none provided)';
const batchList = selection.stories.map(s => `${s.wavePosition}. ${s.key}`).join(', ');

const judgePrompt = (s, cloudId) =>
  `You are a READ-ONLY implementation-readiness judge in an epic pre-flight triage. Decide whether kicking off an ` +
  `autonomous 5-15 min implementation session on this ONE story RIGHT NOW would be a good use of that session, ` +
  `or whether it would likely stall / fail / sprawl because the story is not ready to implement.\n\n` +
  `Story: ${s.key} — ${s.summary}  (wave position ${s.wavePosition} of this batch)\n` +
  `Atlassian cloudId: ${cloudId}\n\n` +
  `BATCH ORDERING CONTEXT: this batch is implemented IN ORDER and each story merges to main before the next starts. ` +
  `Full ordered batch: ${batchList}. A dependency on a story EARLIER in this same batch is satisfied by the time we ` +
  `reach this one — do NOT treat it as a blocker. A dependency on a story that is NOT in this batch and NOT Done IS a blocker.\n\n` +
  `BOARD CONVENTIONS (locked — a story that explicitly asks for something these forbid is a convention-conflict blocker):\n${conventionsBlock}\n\n` +
  `Steps:\n` +
  `1. ToolSearch: select:mcp__claude_ai_Atlassian__getJiraIssue,mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql\n` +
  `2. getJiraIssue(cloudId, ${s.key}, fields=["summary","description","status","issuelinks","comment"], responseContentFormat="markdown"). ` +
  `Read the description, any acceptance criteria, the issue links (especially "is blocked by" / "depends on"), and recent comments.\n` +
  `3. For each "is blocked by" / "depends on" linked issue: read its status from the issuelinks payload. If a link's status is ` +
  `unclear, getJiraIssue on that key to confirm. Not-Done + not-earlier-in-this-batch ⇒ open-dependency blocker.\n\n` +
  `Judge against these classes.\n` +
  `BLOCKER severity (implementing now would waste the session):\n` +
  `  • empty-description — no implementable spec (just a title or a single vague sentence).\n` +
  `  • open-dependency — hard dependency on a not-Done issue outside this batch.\n` +
  `  • unresolved-decision — a load-bearing TBD / open question / unmade decision in the description or comments.\n` +
  `  • missing-artifact — references a design doc / Figma / seed fixture / spec that is required and clearly absent or itself unresolved.\n` +
  `  • convention-conflict — explicitly asks for something the board conventions forbid.\n` +
  `WARNING severity (implementable, but worth flagging):\n` +
  `  • missing-acceptance-criteria — scope is clear enough but "done" is ambiguous.\n` +
  `  • oversized-scope — clearly spans many files / multiple concerns (these stories are meant to be small); risk of a sprawling session.\n` +
  `  • soft-dependency — references a sibling without a hard block.\n\n` +
  `verdict = BLOCKED if ANY blocker-severity finding; RISKY if only warnings; READY if none. ` +
  `Set confidence by how clearly the ticket supports your call (low if the ticket is too thin to judge — and note that thinness itself is usually an empty-description blocker). ` +
  `Each finding.detail = one concrete sentence quoting or closely paraphrasing the ticket (no generic boilerplate). oneLineReason summarizes the call. ` +
  `Set key="${s.key}" and status to the current Jira status. Be decisive; do not inflate readiness, and do not manufacture blockers that the ticket does not support.`;

const verdicts = await parallel(
  selection.stories.map(
    s => () =>
      agent(judgePrompt(s, selection.cloudId), {
        label: `judge:${s.key}`,
        phase: 'Judge',
        schema: JUDGE_SCHEMA,
      }).then(v => (v ? { ...v, group: s.group, wavePosition: s.wavePosition } : null))
  )
);

const ordered = verdicts.filter(Boolean).sort((a, b) => a.wavePosition - b.wavePosition);

const counts = ordered.reduce((acc, v) => ((acc[v.verdict] = (acc[v.verdict] || 0) + 1), acc), {
  BLOCKED: 0,
  READY: 0,
  RISKY: 0,
});
log(`Triage verdicts — READY:${counts.READY} RISKY:${counts.RISKY} BLOCKED:${counts.BLOCKED}`);

return {
  board: cfg.board,
  cloudId: selection.cloudId,
  epicKey: cfg.epicKey,
  noStoriesRemaining: false,
  verdicts: ordered,
};
