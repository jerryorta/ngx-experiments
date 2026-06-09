# Access Gate Bypass (E2E Mode)

The Real Estate app shows an access gate on first visit. Once the code is entered, it's stored in localStorage and the gate doesn't appear again.

## How It Works

- **Component:** `re-access-gate` at `apps/real-estate/app/src/app/components/access-gate/`
- **Service:** `ReAccessGateService` controls `isValidated` signal
- **localStorage key:** `re-access-validated`
- **Stored value:** `{"code":"RECA2026!","version":1}`
- **Validation:** Code is checked against Firestore; on Firestore error, falls back to localStorage

## Bypass via Form Fill

Use the form to bypass the gate with live Firestore validation.

**Step 1: Open persistent session**
```bash
playwright-cli -s=re open http://localhost:4200 --persistent
```
Wait **10-15 seconds** for Angular + Firebase to initialize, then:
```bash
playwright-cli -s=re snapshot
```

Add `--headed` if you want to see the browser (debugging):
```bash
playwright-cli -s=re open http://localhost:4200 --persistent --headed
```

**Step 2: Check the snapshot**

Look for `data-testid="access-gate-container"` in the snapshot output.
- **If present** → gate is showing, proceed to Step 3
- **If absent** → gate already bypassed, skip to "Save State"

**Step 3: Fill the form**

From the snapshot, identify these elements:

| Element | How to find it |
|---------|---------------|
| Access code input | `textbox "Access Code"` |
| Submit button | `button "Submit access code"` |

```bash
playwright-cli -s=re fill <input-ref> "RECA2026!"
playwright-cli -s=re snapshot
playwright-cli -s=re click <submit-ref>
```

**Step 4: Wait and verify**

The validation hits Firestore (may take a few seconds):
```bash
playwright-cli -s=re snapshot
```

- **Success:** Snapshot shows app content (header, navigation, main content area)
- **Failure:** Snapshot still shows access gate with error message

If the gate is still showing, reload to trigger the Firestore error handler fallback to localStorage:
```bash
playwright-cli -s=re reload
playwright-cli -s=re snapshot
```

**Save State** (important for reuse):
```bash
playwright-cli -s=re state-save .claude/skills/re-ui-e2e/re-auth-state.json
```

## Loading Saved State

Instead of bypassing the gate every time, load saved state:

```bash
playwright-cli -s=re open http://localhost:4200 --persistent
playwright-cli -s=re state-load .claude/skills/re-ui-e2e/re-auth-state.json
playwright-cli -s=re reload
playwright-cli -s=re snapshot
# Should show app content, not access gate
```

## Key Selectors

| Element | Selector Type | Value |
|---------|--------------|-------|
| Gate container | data-testid | `access-gate-container` |
| Gate form | data-testid | `access-gate-form` |
| Access code input | role + name | `textbox "Access Code"` |
| Submit button | aria-label | `Submit access code` |

## Resetting the Gate

If you need to test the gate itself or re-enter the code:

```bash
playwright-cli -s=re localstorage-delete re-access-validated
playwright-cli -s=re reload
```
