---
name: re-ui-e2e
description: Run E2E persona tests on the Real Estate app using playwright-cli against the live backend. Tests full user journeys across multiple pages with real Firebase data. Use when you want to verify end-to-end flows like a broker navigating the app.
allowed-tools: "Bash(playwright-cli:*)"
---

# Real Estate E2E Testing Skill

Run end-to-end persona tests against the **live backend**. One agent walks through a real user journey — no mocking, no route interception.

## When to Use

- Testing a full user journey across multiple pages
- Verifying integration with Firebase (auth, Firestore, real-time listeners)
- Running a persona flow (broker, seller, buyer, admin)
- Regression testing after backend or routing changes

**Keywords:** "persona", "flow", "e2e", "journey", "walkthrough"

---

## Phase 1: Setup

1. **Verify dev server** at `http://localhost:4200`:
   ```bash
   playwright-cli -s=re open http://localhost:4200 --persistent
   ```
   Wait **10-15 seconds** for Angular + Firebase to initialize, then:
   ```bash
   playwright-cli -s=re snapshot
   ```
   If unreachable, tell the user: "Start the dev server with `npm run s.prod.app.re.com`."

2. **Handle the access gate.** Read `references/access-gate-bypass.md`. Check snapshot for `data-testid="access-gate-container"`:
   - Present → follow bypass procedure
   - Absent → gate already bypassed

3. **Save state** for reuse (if gate was just bypassed):
   ```bash
   playwright-cli -s=re state-save .claude/skills/re-ui-e2e/re-auth-state.json
   ```

## Phase 2: Plan Tests

1. **Read `references/known-pages.md`** to identify routes, UI elements, and access requirements for the target.

2. **Read `references/performance-notes.md`** for tips on handling live backend latency.

3. **Plan the persona journey.** Parse `$ARGUMENTS` to determine which persona:

   | Persona | Key pages | Auth required |
   |---------|-----------|---------------|
   | Visitor | Home, Search, Privacy, Terms, Support | No |
   | Seller | Seller Intake, Home Valuation | No (subdomain-gated) |
   | Buyer | Buyer Intake, Search | No (subdomain-gated) |
   | Broker | Dashboard, Brokerage, Workspace, Leads | Yes |
   | Admin | Dashboard, Admin pages | Yes + Admin role |

## Phase 3: Execute Tests

Single agent, sequential flow:

```bash
# Load saved state (access gate + any auth)
playwright-cli -s=re open http://localhost:4200 --persistent
playwright-cli -s=re state-load .claude/skills/re-ui-e2e/re-auth-state.json
playwright-cli -s=re reload
```

Wait **10-15 seconds** for Firebase to connect, then navigate through the persona journey page by page. Take snapshots at each step.

### Test Patterns

**Page load checks:**
- Snapshot shows expected content (heading, key elements)
- No error overlays or blocking modals
- Navigation links are present and clickable

**Form interaction checks:**
- Fields can be filled with valid data
- Submit button is clickable after valid input
- Success/error states appear after submission

**Navigation checks:**
- Click links/buttons → verify URL change via snapshot
- Back navigation works
- Sidenav drawer links navigate correctly

### Handling Slow Loads

The live backend adds latency. After any navigation or action:
1. Wait a few seconds
2. Take a snapshot
3. If content hasn't loaded, wait longer and snapshot again
4. See `references/performance-notes.md` for specific bottlenecks

### AppVersionUpdate Modal

A `disableClose: true` dialog may appear if the deployed version differs from the dev build. If the snapshot shows a dialog overlay:

```bash
playwright-cli -s=re eval "document.querySelector('mat-dialog-container button')?.click()"
```

## Phase 4: Report Results

```markdown
## E2E Test Results — [Persona] Flow

**Mode:** E2E (live backend)

### Journey
| Step | Page | Action | Result |
|------|------|--------|--------|
| 1 | / | Page load | OK — hero section visible |
| 2 | /seller-intake | Fill form | OK — all fields editable |
| ... | ... | ... | ... |

### Failures (if any)
| Page | Test | Expected | Actual |
|------|------|----------|--------|
| /dashboard | Card click | Navigate to workspace | No response |

### Recommendations
- [Any issues found that need developer attention]
```

## Cleanup

Always close sessions when done:
```bash
playwright-cli -s=re close
```

## Notes

- **Headless by default.** If the user says "headed" or "show me", add `--headed` to the `open` command.
- **Live backend is slow.** Firestore listeners, auth chains, and eager module loading add latency. See `references/performance-notes.md`.
- **AppVersionUpdate risk.** A `disableClose` dialog may appear if deployed version differs from dev build.
- **Persistent sessions recommended.** Use `--persistent` for E2E to retain localStorage and cookies across reloads.
