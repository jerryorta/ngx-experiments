Audit an already-implemented Jira story against its Stitch design boards, fix any gaps in the code in place, and update the alignment plan: $ARGUMENTS

## Prerequisites

Load required MCP tools using the ToolSearch tool:

1. `select:mcp__claude_ai_Atlassian__getAccessibleAtlassianResources`
2. `select:mcp__claude_ai_Atlassian__getJiraIssue`
3. `select:mcp__claude_ai_Atlassian__addCommentToJiraIssue`
4. `select:mcp__stitch__get_project`
5. `select:mcp__stitch__list_screens`
6. `select:mcp__stitch__get_screen`

## UX Flow Principle

**Audit in dependency order.** Every screen is reachable via a navigation path. Before auditing visual details of a screen, verify its full navigation chain is functional. There is no point fixing the appearance of a page that cannot be reached.

When the ticket being audited is a **detail/child view** (e.g. task detail, contact detail, property detail), first confirm that the parent route and its linking UI are correctly implemented. If the parent is not yet audited, note the dependency in Phase 3 and audit the parent first.

---

## Phase 1: Read the Ticket

1. **Parse the ticket ID** from `$ARGUMENTS`. If empty, ask the user for a ticket ID and stop.

2. **Get the Atlassian Cloud ID:**
   ```
   mcp__claude_ai_Atlassian__getAccessibleAtlassianResources()
   ```

3. **Read the ticket:**
   ```
   mcp__claude_ai_Atlassian__getJiraIssue(cloudId, issueIdOrKey, expand="renderedFields",
     fields=["summary","description","status","comment"])
   ```

4. **Extract Stitch board URLs** from the description. Look for any
   `stitch.withgoogle.com/projects/<id>` links. If none are found, check
   `docs-projects/rex-stitch-boards.md` for the story's feature area and use
   the appropriate board(s) from there.

5. **Display to the user:**
   ```
   Auditing: <KEY> — <summary>
   Stitch boards: <list of project IDs>
   ```

---

## Phase 2: Fetch Stitch Comps

For each Stitch project ID extracted in Phase 1:

1. Load project overview:
   ```
   mcp__stitch__get_project(projectId)
   ```

2. List all screens:
   ```
   mcp__stitch__list_screens(projectId)
   ```

3. Fetch every screen:
   ```
   mcp__stitch__get_screen(projectId, screenId)
   ```

4. Build a **comp summary** — for each screen, note:
   - Layout structure (columns, sections, sticky elements)
   - Component names and hierarchy
   - Typography (font family, weight, size)
   - Color tokens (backgrounds, accents, text colors)
   - Interactive / state variants (active, unread, action-needed, etc.)
   - Any labelled annotations or spec notes

---

## Phase 3: Routing & Navigation Audit

Before reading implementation files, verify the screen is actually reachable in the app.
Navigation is not always strictly route-tree based — a screen may be reachable from multiple
places in the UX (e.g. task detail reachable from circles workspace, dashboard, and notifications).

### 3a — Map all UX entry points

From the Stitch comps and ticket description, identify **every place in the UX** that should
navigate to this screen. These may come from different route branches entirely.

Example for Task Detail:
- `Sidebar → Circles → [circle row] → task list → [task row]`
- `Dashboard → recent tasks widget → [task row]`
- `Notifications → [task notification]`

List each entry point separately.

### 3b — Audit the routing config

Locate the relevant routes files with Glob (`*.routes.ts`) and verify:

1. Is the route defined for this screen?
2. Is `loadComponent` / `loadChildren` pointing to the correct component file?
3. Are any required route guards present?

### 3c — Audit each entry point's linking UI

For **each entry point** identified in 3a, read the originating component's HTML and confirm:

1. Does it render the element (row, card, button, notification item) that should link here?
2. Does that element have a `[routerLink]` or programmatic `router.navigate` pointing to the correct route?
3. Are route params (e.g. `:circleId`, `:taskId`) passed correctly?

Record findings per entry point:
- `✓ [origin] links correctly` / `✗ [origin] link missing or wrong param`

### 3d — Dependency gate

If any routing gap is found (`✗`):
- Fix the routing/linking issue in the originating component first (before any visual fixes).
- If that originating component is in a **not-yet-audited story** (check `stitch-alignment-plan.md`),
  note it: "Entry point in REX-XX not yet audited — link fix applied but that page's visual
  audit is still pending." Do not audit the originating page's visuals now; continue with
  this ticket's visual audit once the link is fixed.

---

## Phase 4: Find the Implementation

Based on the ticket's route or feature area, locate the relevant component files
in `libs/concierge/ui/src/lib/`. Use Glob and Grep to find:

- The page component (`.component.ts`, `.component.html`, `.component.scss`)
- Any sub-view components referenced by the page
- Shared components used by this screen (e.g. `dlc-*`, `cg-*` design library components)

Read each file in full before comparing.

---

## Phase 5: Compare — Comp vs Code

Compare the comp summary against the implementation across six dimensions (routing first):

| Dimension | What to check |
|-----------|--------------|
| **Routing / Navigation** | Route defined, parent links correctly, route params passed, guards present |
| **Layout** | Column structure, section order, sticky/fixed elements, spacing rhythm |
| **Typography** | Font family (Manrope/DM Sans/Literata/etc.), weight, size, letter-spacing |
| **Color** | Persona accent color, surface colors, text colors, status chip colors |
| **Interactive states** | Active nav item, unread card treatment, action-needed tint, phase header colors |
| **Component names** | Are the right `dlc-*` / `cg-*` components used? Any raw HTML where a component should be? |

For each dimension record: `✓ matches` or `✗ gap — <description>`.

---

## Phase 6: Fix Gaps

For every `✗` found in Phase 5:

1. Fix routing/navigation gaps **first** — in order of the navigation path (outermost parent → deepest child).
2. Then fix visual gaps (layout, typography, color, interactive states, component names).
3. Keep fixes minimal and targeted — do not refactor surrounding code.
4. After all fixes are applied, run:
   ```
   npx nx run concierge-ui:lint
   npx nx run concierge-ui:test
   ```
   Fix any lint or test failures before continuing.

If there are no gaps (`✓` across all dimensions), skip to Phase 7 directly.

---

## Phase 7: Update the Alignment Plan

Open `docs-projects/projects/rex/stitch-alignment-plan.md`.

1. Find the row for this ticket in the Phase 2 audit table.
2. Mark `Audited` as `[x]`.
3. Fill in `Gaps found` with a short summary:
   - If fixes were made: list each gap fixed (e.g. "missing routerLink on task row, color token on action-needed card")
   - If no gaps: `none`

---

## Phase 8: Post Audit Comment on Jira

Post a comment on the ticket summarising the audit result using
`mcp__claude_ai_Atlassian__addCommentToJiraIssue` with `contentFormat: "markdown"`:

```markdown
## Stitch Audit Complete

**Boards reviewed:** <list of stitch project URLs>

### Findings

| Dimension | Result |
|-----------|--------|
| Routing / Navigation | ✓ / ✗ gap — <description> |
| Layout | ✓ / ✗ gap — <description> |
| Typography | ✓ / ✗ gap — <description> |
| Color | ✓ / ✗ gap — <description> |
| Interactive states | ✓ / ✗ gap — <description> |
| Component names | ✓ / ✗ gap — <description> |

### Fixes applied
<bullet list of what was changed, or "No gaps found — implementation matches comp.">
```

---

## Phase 9: Verification Plan

After posting the Jira comment, output a concise browser verification plan so the user can
visually confirm every fix in the running app.

### 9a — Derive the navigation path

From Phase 3's entry-point map, build the shortest click-path from the app root to the
audited screen. Express it as a numbered step list:

```
1. Run `npm run s.app.concierge` (serves on http://localhost:4202)
2. Open http://localhost:4202
3. Log in (or confirm already logged in as Broker persona via /mock-login)
4. <Step 4 — first click in nav>
5. <Step 5 — …>
6. You are now on: <screen name / route>
```

If the screen has multiple entry points (Phase 3a), list one path per entry point, labelled
by origin (e.g. "**Via Sidebar**", "**Via Dashboard widget**").

### 9b — What to check per fix

For every gap fixed in Phase 6, add a bullet describing the specific visual change to look
for:

```
- [ ] <Fix description> — <what it should look like now vs. before>
```

Examples:
- `[ ] Column header reads "Days on Market" (was "Days Active")`
- `[ ] Third stats card shows "PENDING CLOSE" with a dollar value (was "AVG COMMISSION")`
- `[ ] Row separators in the table are barely visible ghost lines, not solid grey`

### 9c — Format

Output the full plan as a fenced markdown block so the user can copy it:

````markdown
### Verification Plan — <KEY>

**App:** `http://localhost:4202` (`npm run s.app.concierge`) · **Login:** `/mock-login` → Broker

#### Navigation path

**Via <origin>**
1. …

#### Checks

- [ ] …
````

---

## Error Handling

- If no Stitch boards are found in the ticket description AND none can be inferred
  from `docs-projects/rex-stitch-boards.md`, report to the user and stop.
- If a Stitch project ID returns an error (deleted/inaccessible board), note it
  and continue with any remaining boards.
- If lint or tests fail after fixes, do not proceed to Phase 7 — report the
  failure to the user and ask how to proceed.
- Never create new files unless a missing sub-component is clearly required by
  the comp and absent from the codebase.
