View or update an `/epic-next` board config (`epic.<board>.json`).

**Usage:**
- `/epic-config <board>` — view and edit by board name (e.g. `nge`)
- `/epic-config <EPIC-KEY>` — resolve board from epic key (e.g. `NGE-10`)
- `/epic-config` (no argument) — list all available boards

---

## Step 1 — Resolve board name

Read `$ARGUMENTS`.

**No argument:** Read all files matching `.claude/skills/epic-next/epic.*.json`. List each board name and its `epicKey` and `name` fields:

```
Available boards:
  nge   NGE-10   <epic name>
```

If no `epic.*.json` exists yet (the state this repo ships in), say so and point the user at `/epic-plan <EPIC-KEY>` or `config-template.json`, then stop.

Then stop — no further steps.

**Epic key argument** (matches `[A-Z]+-\d+`, e.g. `NGE-10`): Extract the key prefix (letters before the first `-`). Scan all `epic.*.json` files, match by `epicKey` prefix. The board name is the `*` portion of the filename. If no match, report: "No epic config found for prefix `<PREFIX>`. Available boards: <list>." and stop.

**Board name argument** (e.g. `nge`): Use directly. Construct path `.claude/skills/epic-next/epic.<board>.json`. If the file does not exist, report it and list available boards, then stop.

Save: `boardName`, `configPath`.

## Step 2 — Read and display the current config

Read `configPath`. Display the current config in a human-readable table:

```
Config: epic.<board>.json
─────────────────────────────────────────────────────
name              <value>
epicKey           <value>
jql               <value>
storyOrdering     <value>
groupLabel        <value>
completionMessage <value>
commitScope       <value>
buildCommand      <value or "(none)">
app               <value>
libraries.ui      <value>
libraries.store   <value or "(none)">
libraries.designLibrary  <value or "(none)">
routingFiles      <count> file(s)
conventions       <count> item(s)
designReferences  <"(none)" or summary of keys>
epicEvolutionRules <count> rule(s) or "(none)"
─────────────────────────────────────────────────────
```

> **Legacy fields silently ignored:** `epicBranch`, `mode`, `phaseNote`. Drop them on the next edit; do not display.

For `routingFiles` and `conventions`, if the count > 0, list the values indented below the row.
For `designReferences`, if set, list each key and its value indented below.

## Step 3 — Ask what to update

After displaying the config, ask the user:

> "Which fields would you like to update? Describe the changes (e.g. 'add a convention', 'change the JQL', 'update the buildCommand', 'set commitScope to charts')."

If the user says nothing to change / "looks good" / "no changes": confirm the config is correct and stop.

## Step 4 — Apply changes

Parse the user's request and update the in-memory config object accordingly. Common patterns:

| Request | Action |
|---------|--------|
| `set <field> to <value>` | Replace the field value |
| `clear <field>` / `set <field> to null` | Set to `null` |
| `add convention: <text>` | Append to `conventions` array |
| `remove convention: <text>` | Remove matching entry from `conventions` array |
| `add routing file: <path>` | Append to `routingFiles` array |
| `remove routing file: <path>` | Remove matching entry from `routingFiles` array |
| `set libraries.store to <path>` | Update nested `libraries.store` |
| `set designReferences.<key> to <value>` | Update or create key in `designReferences` object |
| `clear designReferences` | Set `designReferences` to `null` |

If any request is ambiguous, ask for clarification before writing.

## Step 5 — Show diff and confirm

Display the proposed changes as a before/after diff of only the modified fields:

```
Proposed changes to epic.<board>.json:
  buildCommand: null → "npm run b.app.ledger"
  commitScope:  "charts" → "uidl"
```

Ask: "Apply these changes?"

If the user says no or requests further adjustments, return to Step 3.

## Step 6 — Write the updated config

Write the full updated JSON back to `configPath`. Preserve field ordering from the original file. Use 2-space indentation.

## Step 7 — Commit

```
git add .claude/skills/epic-next/epic.<board>.json
git commit -m "chore(skills): update epic.<board>.json config"
```

Report: "Done — `epic.<board>.json` updated and committed."
