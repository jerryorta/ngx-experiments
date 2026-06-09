---
description: DEPRECATED — this skill was replaced by `/seed-mock-test-anchor` on 2026-05-17. The new skill is broader (handles brokerage id OR any test-persona uid) AND reads from the new single source of truth `apps/concierge/backend/tools/seed-configs/test-anchors.json`. Tell the user to use `/seed-mock-test-anchor brokerage <new-id>` instead. Do NOT auto-forward.
---

# Deprecated — use `/seed-mock-test-anchor brokerage <new-id>`

This slash command was replaced on 2026-05-17. The new skill:

- Reads from `apps/concierge/backend/tools/seed-configs/test-anchors.json` (the new single source of truth for the brokerage id + every test-persona uid)
- Handles user uids as well as the brokerage (e.g. `/seed-mock-test-anchor buyer <new-uid>`)

Usage:

```
/seed-mock-test-anchor brokerage <NEW_ORG_ID>
/seed-mock-test-anchor broker <NEW_UID>
/seed-mock-test-anchor buyer <NEW_UID>
/seed-mock-test-anchor seller <NEW_UID>
/seed-mock-test-anchor agent <NEW_UID>
```

## What to do

Report this rename to the user and recommend `/seed-mock-test-anchor brokerage <new-id>` (substituting the user's intended new id). Do not auto-forward — the rename is intentional so users learn the broader anchor surface.
