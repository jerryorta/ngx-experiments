---
name: rename-spaces
description: Rename a file by replacing all spaces (including Unicode variants like narrow no-break space U+202F) with underscores. The argument is a hint path — the directory must be exact, but spaces in the filename are matched fuzzily against any Unicode space character, so the user doesn't need to type the exact bytes. Only renames files, not directories. Use this skill whenever the user asks to rename a file that has spaces, or uses the /rename-spaces command, or mentions a file path where spaces are causing problems.
---

# rename-spaces

Rename the file at: **$ARGUMENTS**

Replace all spaces (and Unicode space variants) in the filename with underscores. Only files are renamed — directories are rejected.

## Steps

1. Run the bundled script, substituting `$ARGUMENTS` for the hint path:

```bash
python3 /path/to/skill/scripts/rename_spaces.py "$ARGUMENTS"
```

The script path is relative to this SKILL.md file. Use the actual absolute path of this skill's `scripts/rename_spaces.py`.

2. Report the result to the user exactly as the script printed it:
   - Success: `Renamed:\n  <old>\n→ <new>`
   - No-op: `No change needed: '<name>' has no spaces.`
   - Error: the error message from stderr

## How the hint path works

The **directory** must be the exact path on disk. The **filename** is a hint — any space character you type (regular space U+0020) will match any Unicode space variant in the real filename (narrow no-break space U+202F, non-breaking space U+00A0, etc.). This is why the skill exists: filenames from macOS screen recordings often contain U+202F before "AM"/"PM", which is impossible to type directly.

## Script location

The script lives at `scripts/rename_spaces.py` next to this SKILL.md. It:
- Finds the file by normalizing all Unicode spaces to plain spaces for comparison
- Rejects directories (only renames files)
- Warns if multiple files in the directory normalize to the same hint
- Errors if the destination already exists
