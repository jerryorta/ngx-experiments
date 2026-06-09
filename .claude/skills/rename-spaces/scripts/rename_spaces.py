#!/usr/bin/env python3
"""
rename_spaces.py <hint_path>

Finds the file in <dir(hint_path)> whose name matches <basename(hint_path)>
after normalizing all Unicode space variants to plain spaces, then renames
it so every space (ASCII or Unicode) becomes an underscore.

Only renames files — directories are rejected with an error.
"""
import os, sys, unicodedata


def normalize(s: str) -> str:
    """Collapse all Unicode space variants to a plain ASCII space."""
    return "".join(
        " " if unicodedata.category(c).startswith("Z") or c in "\t\n\r" else c
        for c in s
    )


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: rename_spaces.py <hint_path>", file=sys.stderr)
        sys.exit(1)

    hint_path = sys.argv[1]
    dir_path = os.path.dirname(hint_path) or "."
    hint_name = os.path.basename(hint_path)

    try:
        entries = os.listdir(dir_path)
    except FileNotFoundError:
        print(f"ERROR: directory not found: {dir_path}", file=sys.stderr)
        sys.exit(1)

    norm_hint = normalize(hint_name)
    matches = [f for f in entries if normalize(f) == norm_hint]

    if not matches:
        print(f"ERROR: no file matching '{hint_name}' found in {dir_path}", file=sys.stderr)
        print("Files in directory:", file=sys.stderr)
        for f in sorted(entries):
            print(f"  {repr(f)}", file=sys.stderr)
        sys.exit(1)

    if len(matches) > 1:
        print(
            f"WARNING: multiple files match the hint '{hint_name}' — using the first one.",
            file=sys.stderr,
        )
        for m in matches:
            print(f"  {repr(m)}", file=sys.stderr)

    match = matches[0]
    src = os.path.join(dir_path, match)

    if not os.path.isfile(src):
        print(f"ERROR: '{match}' is not a file (it may be a directory).", file=sys.stderr)
        sys.exit(1)

    new_name = "".join(
        "_" if unicodedata.category(c).startswith("Z") or c == " " else c
        for c in match
    )

    if match == new_name:
        print(f"No change needed: '{match}' has no spaces.")
        sys.exit(0)

    dst = os.path.join(dir_path, new_name)
    if os.path.exists(dst):
        print(f"ERROR: destination already exists: {dst}", file=sys.stderr)
        sys.exit(1)

    os.rename(src, dst)
    print(f"Renamed:\n  {match}\n→ {new_name}")


if __name__ == "__main__":
    main()
