# Performance Notes (E2E Mode)

## Why E2E Mode Is Slow

The RE app fires all of these on every cold start:

| Source | Impact | What it does |
|--------|--------|-------------|
| Access gate `onSnapshot` | HIGH | Real-time Firestore listener blocks render |
| Auth → Firestore account chain | HIGH | 2-3 sequential network round-trips |
| `AppVersionUpdateService` | HIGH | `onSnapshot` + potential blocking modal |
| Presence service | MEDIUM | Intercepts every mousedown/click |
| Remote config fetch | MEDIUM | Network call at effects init |
| Subdomain Firestore read | MEDIUM | `getDoc$` at `ROOT_EFFECTS_INIT` |
| PDF viewer module | MEDIUM | Eager wasm/worker load |
| Property Analytics Worker | MEDIUM | Worker spawn at provider init |

## Mitigations

### Use `state-load` for Session Reuse

Save state once and reload it to skip the access gate:

```bash
# One-time: save state from the setup session
playwright-cli -s=re state-save .claude/skills/re-ui-e2e/re-auth-state.json

# Reload state in new sessions
playwright-cli -s=re open http://localhost:4200 --persistent
playwright-cli -s=re state-load .claude/skills/re-ui-e2e/re-auth-state.json
playwright-cli -s=re reload
```

### Wait for Angular + Firebase to Initialize

After `open` or `reload`, wait **10-15 seconds** before taking the first snapshot. The app needs time for:
- Firestore `onSnapshot` listeners to connect
- Auth state to resolve
- NgRx effects to dispatch and settle

```bash
playwright-cli -s=re open http://localhost:4200 --persistent
# Wait 10-15 seconds
playwright-cli -s=re snapshot
```

### Headed Mode Is for Debugging Only

Always run **headless** for speed. Only add `--headed` when the user explicitly says "headed" or "show me".

## AppVersionUpdate Blocking Modal

`AppVersionUpdateService` at `apps/real-estate/app/src/app/app.component.ts:218` watches a Firestore document for version changes. If the deployed version is newer than the running dev build, it opens a **`disableClose: true` dialog** that blocks all interactions.

**Detection:** Snapshot shows a dialog overlay with update message.

**Dismissal:**
```bash
playwright-cli -s=re eval "document.querySelector('mat-dialog-container button')?.click()"
```

If the dialog persists, the button selector may differ. Take a snapshot and look for the dismiss/reload button reference, then click it.

## Presence Service Click Interception

The presence service (`ng-pat-presence.service.ts`) listens to `mousedown` events. When the app is in `USER_IDLE` or `NETWORK_OFFLINE` state, every Playwright click triggers a reconnection attempt. This adds latency to each interaction.

**Mitigation:** Keep test flows moving — avoid long pauses between actions. If the app goes idle (10+ minutes), expect the first click after idle to be slow (reconnection overhead).

## Firebase WebSocket Architecture

Firebase Firestore uses WebChannel (HTTP streaming protocol), NOT simple REST endpoints. This means:
- Route interception with fake HTTP responses causes infinite reconnection storms
- The SDK cannot be cleanly mocked at the network level
- **E2E mode accepts this** — it works with the real backend as-is
- For isolated component testing without Firebase, use the `ui-storybook` skill instead
