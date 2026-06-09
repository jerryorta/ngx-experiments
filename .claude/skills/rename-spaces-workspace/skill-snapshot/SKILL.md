Rename the file at the path: $ARGUMENTS — replacing all spaces (including Unicode spaces like narrow no-break space U+202F) with underscores.

The argument is a **hint path**: the directory must be exact, but the filename may differ from the actual filename due to special Unicode space characters that are hard to type.

## Steps

1. Extract the directory and filename hint from the argument.

2. Run this Python snippet via Bash to find and rename the file:

```bash
python3 - <<'EOF'
import os, sys, unicodedata

hint_path = "$ARGUMENTS"
dir_path = os.path.dirname(hint_path)
hint_name = os.path.basename(hint_path)

def normalize(s):
    """Replace all Unicode space variants with a plain space for comparison."""
    return "".join(" " if unicodedata.category(c).startswith("Z") or c in "\t\n\r" else c for c in s)

try:
    entries = os.listdir(dir_path)
except FileNotFoundError:
    print(f"ERROR: directory not found: {dir_path}", file=sys.stderr)
    sys.exit(1)

# Find file whose normalized name matches the normalized hint
match = next((f for f in entries if normalize(f) == normalize(hint_name)), None)

if match is None:
    print(f"ERROR: no file matching '{hint_name}' found in {dir_path}", file=sys.stderr)
    print("Files in directory:", file=sys.stderr)
    for f in entries:
        print(f"  {repr(f)}", file=sys.stderr)
    sys.exit(1)

new_name = "".join("_" if unicodedata.category(c).startswith("Z") or c == " " else c for c in match)

if match == new_name:
    print(f"No change needed: '{match}' has no spaces.")
    sys.exit(0)

src = os.path.join(dir_path, match)
dst = os.path.join(dir_path, new_name)

if os.path.exists(dst):
    print(f"ERROR: destination already exists: {dst}", file=sys.stderr)
    sys.exit(1)

os.rename(src, dst)
print(f"Renamed:\n  {match}\n→ {new_name}")
EOF
```

3. Report the result to the user: old name → new name, or the error message if no match was found.

## Notes

- The directory part of the argument must be the exact path.
- The filename part is a hint — spaces in the hint are matched against all Unicode space characters (U+0020, U+00A0, U+202F, etc.) in the real filename.
- Only the filename is renamed; the directory is unchanged.
- If multiple files in the directory normalize to the same hint, the first match is used — warn the user if this happens.
