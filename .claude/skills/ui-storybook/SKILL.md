---
name: ui-storybook
description: Run component interaction tests using playwright-cli against Storybook. Tests form inputs, button clicks, accessibility, and edge cases in complete isolation — no Firebase, no auth, no access gate. Use when you want to test UI components after making changes.
allowed-tools: "Bash(playwright-cli:*)"
---

# Storybook Testing Skill

Run component interaction tests against **Storybook** at `localhost:4400`. Components render in complete isolation — no Firebase, no auth, no access gate. Supports parallel subagents for fast test execution.

> **IMPORTANT:** Always use the **iframe URL** (`/iframe.html?id=<story-id>`) — NOT the full Storybook UI (`/?path=/story/...`). The full UI shell is too heavy and causes snapshot timeouts.

## When to Use

- Testing a specific UI component after making changes
- Verifying form inputs, button behavior, accessibility
- Testing edge cases (special characters, long inputs, rapid clicks)
- Running validation checks on design library components
- Any component that has a `.stories.ts` file

**Keywords:** "component", "storybook", "form", "button", "input", "validation", "accessibility"

---

## Phase 0: Resolve Target Component

The skill accepts an **optional argument** — a component name, selector, or path to a `.stories.ts` file.

**Resolution order:**

1. **Argument provided** — use it directly:
   - Full path (e.g., `libs/.../cma-property-card.stories.ts`) → use that file
   - Component name or selector (e.g., `cma-property-card`, `dlc-input`) → Glob for matching stories:
     ```
     Glob pattern: "**/*<argument>*.stories.ts"
     ```
2. **No argument, conversation context available** — infer the component from files recently created, modified, or discussed in the conversation. Glob for its stories.
3. **No argument, no clear context** — list all available stories and ask the user which to test:
   ```
   Glob pattern: "**/*.stories.ts"
   ```
   Present as a numbered list with library and component name, then ask: "Which story would you like to test?"

## Phase 1: Setup

1. **Find the component's story** (using the target resolved in Phase 0). If no story exists, tell the user: "No Storybook story found for this component. Create a story first, or use `re-ui-e2e` for live backend testing."

2. **Read the `.stories.ts` file** to determine the story ID (see Phase 2).

3. **Open the story in playwright-cli:**
   ```bash
   # Headless (default):
   playwright-cli -s=sb open "http://localhost:4400/iframe.html?id=<story-id>&viewMode=story"
   # Headed (if user says "headed" or "show me"):
   playwright-cli -s=sb open "http://localhost:4400/iframe.html?id=<story-id>&viewMode=story" --headed
   ```
   If `net::ERR_CONNECTION_REFUSED`, tell the user: "Start Storybook with `npm run storybook`."

4. **Wait for Angular to bootstrap**, then take a snapshot:
   ```bash
   playwright-cli -s=sb snapshot
   ```
   If the snapshot times out, the component is still loading. Wait a moment and retry:
   ```bash
   playwright-cli -s=sb eval "await new Promise(r => setTimeout(r, 3000))"
   playwright-cli -s=sb snapshot
   ```

## Phase 2: Find the Story URL

Story IDs are derived from the `.stories.ts` file's `title` and export name. The ID is `<title-kebab-case>--<export-name-kebab-case>`.

**Always use the iframe URL:**
```
http://localhost:4400/iframe.html?id=<story-id>&viewMode=story
```

**Read the `.stories.ts` file** to find the `title` and exported story names.

Examples:
| `title` | Export | Story ID | iframe URL |
|---------|--------|----------|------------|
| `'Input'` | `InputOutline` | `input--input-outline` | `/iframe.html?id=input--input-outline&viewMode=story` |
| `'M3 Button'` | `Primary` | `m3-button--primary` | `/iframe.html?id=m3-button--primary&viewMode=story` |

> **Note:** If a story has a `name` property, the ID uses the kebab-cased `name` instead of the export name. Check the page title after loading — Storybook may auto-correct the ID (e.g. `input--input` → `input--input-outline`).

### Available Story Libraries

Stories are located in these libraries:

| Library | Path | Components |
|---------|------|------------|
| UI Design Library | `libs/shared/ui-design-library/src/lib/components/` | Input, Button, Autocomplete, etc. |
| Charts | `libs/shared/charts/src/lib/giga-chart/stories/` | Bar, Line, Bullet, Grouped Bar, Composite |
| Real Estate UI | `libs/real-estate/ui/src/lib/` | CMA Property Card, etc. |
| Evolving Cognition UI | `libs/evolving-cognition/ui/src/lib/` | Quiz grades, Bookmarks |

## Phase 3: Execute Tests

### Parallel Subagents

Spawn **2 parallel subagents** (via the Agent tool), each with its own session:

```
Agent 1: -s=sb-1  → Happy path + validation tests
Agent 2: -s=sb-2  → Edge case + accessibility tests
```

Each subagent prompt must include:
- The `playwright-cli` skill reference
- The Storybook URL to open
- The specific test angle
- Instructions to use `playwright-cli -s=<unique-session-name>` for all commands
- Instructions to close session when done

### Subagent Setup

Each subagent opens its own browser session. Add `--headed` if the user requested it.

```bash
# Open Storybook directly to the story iframe (fast, no Storybook shell)
playwright-cli -s=sb-1 open "http://localhost:4400/iframe.html?id=<story-id>&viewMode=story" --headed
# Wait for Angular bootstrap if snapshot times out
playwright-cli -s=sb-1 snapshot

# Interact — use ref IDs from the snapshot (e.g., e27, e35)
playwright-cli -s=sb-1 fill e27 "Test value"
playwright-cli -s=sb-1 click e35
playwright-cli -s=sb-1 snapshot

# Keyboard navigation
playwright-cli -s=sb-1 press Tab
playwright-cli -s=sb-1 snapshot
```

### Test Patterns

**Happy path checks:**
- Component renders correctly (snapshot shows expected elements)
- Input fields accept text
- Buttons are clickable and trigger expected state changes
- Select dropdowns open and options are selectable
- Checkboxes and radio buttons toggle correctly

**Validation checks:**
- Required fields show errors when submitted empty
- Invalid email/phone formats are rejected
- Error messages are descriptive and visible
- Submit buttons disable/enable based on form validity

**Edge case checks:**
- Special characters in text fields (`<script>`, `"quotes"`, `emoji 🏠`)
- Very long input strings (500+ characters)
- Rapid double-clicks on buttons
- Empty state renders correctly

**Accessibility checks:**
- All interactive elements have accessible names
- Focus order is logical (tab through the component)
- Error messages are associated with their fields

### Testing Multiple Story Variants

Most components have multiple story variants (Default, Error, Loading, Empty). Test each one:

```bash
playwright-cli -s=sb-1 open "http://localhost:4400/iframe.html?id=input--input-outline&viewMode=story"
playwright-cli -s=sb-1 snapshot
# ... test default state ...

playwright-cli -s=sb-1 goto "http://localhost:4400/iframe.html?id=input--with-error&viewMode=story"
playwright-cli -s=sb-1 snapshot
# ... test error state ...
```

## Phase 4: Report Results

```markdown
## Storybook Test Results — [Component Name]

**Mode:** Storybook (isolated)

### Summary
| Angle | Passed | Failed | Total |
|-------|--------|--------|-------|
| Happy Path | X | Y | Z |
| Validation | X | Y | Z |
| Edge Cases | X | Y | Z |
| Accessibility | X | Y | Z |

### Failures (if any)
| Story | Test | Expected | Actual |
|-------|------|----------|--------|
| input--default | Type special chars | Value accepted | Input rejected `<script>` |

### Recommendations
- [Any issues found that need developer attention]
```

## Cleanup

Always close sessions when done:
```bash
playwright-cli -s=sb-1 close
playwright-cli -s=sb-2 close
```

## Verified Behavior (from live testing)

These behaviors have been confirmed working:

- **`snapshot`** captures the full component accessibility tree including all headings, textboxes, labels, placeholders, icons, and interactive refs
- **`fill <ref> "text"`** works — types text into inputs, replaces existing values
- **`click <ref>`** works — clicks buttons and interactive elements
- **`press Tab`** works — moves focus between form fields in logical order
- **Special characters** (`<script>`, emoji, 200+ char strings) are all handled correctly
- **Prefix/suffix decorations** ($, GHz, icons) render alongside input values
- **Error states** appear on blur when configured in the story (e.g., "Some Error" messages)
- **Angular Material `mat-form-field`** components are fully accessible — labels linked via `for`/`id`, placeholders present

### What does NOT work

- **Full Storybook UI URL** (`/?path=/story/...`) — causes snapshot timeouts due to heavy UI shell. Always use the iframe URL.
- **Snapshot on first load** may timeout if Angular hasn't bootstrapped yet — wait and retry.

## Notes

- **Headless by default.** Subagents run headless for speed. If the user says "headed" or "show me", add `--headed` to the `open` command.
- **No Firebase, no auth, no access gate.** Storybook renders components in complete isolation. All mock data is pre-configured in the story file.
- **Fast.** No live backend latency — pages load in seconds (Angular bootstrap time only).
- **Parallel subagents.** Each subagent gets its own playwright-cli session for concurrent testing.
- **Story variants.** Check the `.stories.ts` file for available variants (Default, Error, Loading, Empty, etc.).
- **Navigation between stories.** Use `goto` (not `navigate`) to switch between story variants within the same session.
