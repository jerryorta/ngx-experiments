#!/usr/bin/env bash
#
# PreToolUse hook — artifact- and library-scoped standards loader.
#
# Fires on Write|Edit|MultiEdit. Infers the artifact type (file suffix) AND the
# library (path) of the target, and injects ONLY the matching standards via
# additionalContext. Nothing loads on a normal turn — rules appear exactly when
# that kind of file, in that library, is written.
#
# LOADER, not copy — every piece is pulled live from its source, so editing the
# source changes what the hook serves. Three routing layers:
#   • GLOBAL invariants   ← docs/ai/CONSTRAINTS.md (section) + docs/ai/ANTI-PATTERNS.json (id)
#     + docs/ai-instructions/standards/*.md artifact fragments — routed by FILE SUFFIX
#   • LIBRARY-TYPE standard ← docs/ai-instructions/standards/lib-types/<type>.md — routed by
#     DIRECTORY glob (applyTo `libs/*/<type>/**`); `libs/*/` also covers type-named shared libs
#     (libs/shared/store …) and naturally excludes bespoke shared libs (charts, calendar …)
#   • LIBRARY-INSTANCE notes ← the nearest AGENTS.md above the file — instance deltas + bespoke
#     shared-lib guidance
#   • deep-guide pointers ← docs/ai-instructions/reference/*.instructions.md — routed by applyTo
# Precise applyTo glob = inject; `**` = general/procedure, never injected.
#
# Throttled per scope per session: global once per artifact, type standard once per lib-type,
# instance notes once per library. Mode A only (allow + additionalContext) — never blocks.
# Fail-open: any error / missing dep / unknown file type => exit 0.

input=$(cat)
command -v jq >/dev/null 2>&1 || exit 0

fp=$(printf '%s' "$input"  | jq -r '.tool_input.file_path // empty' 2>/dev/null)
sid=$(printf '%s' "$input" | jq -r '.session_id // "nosession"'     2>/dev/null)
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty'                  2>/dev/null)
[ -n "$fp" ] || exit 0

root=$(git -C "${cwd:-.}" rev-parse --show-toplevel 2>/dev/null || printf '%s' "${cwd:-.}")
CONSTRAINTS="$root/docs/ai/CONSTRAINTS.md"
ANTIPATTERNS="$root/docs/ai/ANTI-PATTERNS.json"
INSTRUCTIONS="$root/docs/ai-instructions"
STANDARDS="$INSTRUCTIONS/standards"
LIBTYPES="$STANDARDS/lib-types"
[ -f "$CONSTRAINTS" ] || exit 0
rel="${fp#$root/}"

# (gigasoftware's legacy-Material skip for evolving-cognition / real-estate is dropped here —
#  ngx-experiments has no legacy apps and no @angular/material at all.)

# read_applyto <file> -> raw applyTo frontmatter value (unquoted), or empty.
read_applyto() {
  grep -m1 '^applyTo:' "$1" 2>/dev/null | sed -E "s/^applyTo:[[:space:]]*//; s/^['\"]//; s/['\"][[:space:]]*$//"
}
# path_matches <applyTo-spec> -> 0 if $rel matches (precise globs only; '**' never matches).
path_matches() {
  local spec="$1" g pat rc=1
  { [ -z "$spec" ] || [ "$spec" = '**' ]; } && return 1
  local IFS=,
  set -f                       # disable pathname expansion — a glob like libs/*/ui/** must
  for g in $spec; do           # stay literal here, NOT expand against the filesystem
    g="${g//[[:space:]]/}"
    { [ -z "$g" ] || [ "$g" = '**' ]; } && continue
    pat="${g//\*\*\//}"
    case "$rel" in $pat) rc=0; break ;; esac
  done
  set +f
  return $rc
}
# strip_frontmatter <file> -> file body with a leading --- YAML block removed.
strip_frontmatter() {
  awk 'NR==1 && $0=="---" { fm=1; next } fm && $0=="---" { fm=0; next } !fm { print }' "$1" 2>/dev/null
}

# ---- Artifact detection: path -> (label, CONSTRAINTS headings, anti-pattern ids, refguide) ----
artifact=""; headings=""; ids="[]"; refguide=""
case "$fp" in
  *.spec.ts)
    artifact="test"; headings=$'Testing\nZoneless Change Detection'
    ids='["jasmine-import"]'; refguide="docs/reference/testing-strategy.md" ;;
  *.component.html)
    artifact="template"; headings=$'Angular Conventions'
    ids='["legacy-ngIf","legacy-ngFor","legacy-ngSwitch","mat-component-selector"]' ;;
  *.component.ts)
    artifact="component"
    headings=$'Component File Structure\nAngular Conventions\nComponent-Scoped State'
    ids='["constructor-injection","input-decorator","output-decorator","inline-template","inline-styles","angular-material-import"]'
    case "$fp" in */src/app/*) headings="$headings"$'\nApplication Components' ;; esac
    # ngx has no *-deprecated lib; the live shared design library IS the uidl scope here.
    case "$fp" in */libs/shared/ui-design-library/*)
      artifact="uidl"; headings=$'UI Design Library\nComponent File Structure'
      ids='["uidl-host-selector","uidl-missing-host-class","inline-template","inline-styles"]'
      refguide="libs/shared/ui-design-library/COMPONENT-ARCHITECTURE-BEST-PRACTICES.md" ;;
    esac ;;
  *.service.ts)
    artifact="service"; headings=$'Angular Conventions'
    ids='["constructor-injection","service-lifecycle-hook"]' ;;
  *.selectors.ts|*.reducer.ts|*.effects.ts|*.actions.ts|*.facade.ts)
    artifact="ngrx"; headings=$'NgRx Facades & Selectors'
    ids='["constructor-injection"]'; refguide="docs/reference/ngrx/facades-and-selectors.md" ;;
  *.store.ts|*/store/*)
    artifact="store"; headings=$'Component-Scoped State\nNgRx Facades & Selectors'
    ids='["constructor-injection"]' ;;
  *.component.scss|*.scss)
    artifact="styling"; headings=$'Styling\nAngular Material — Legacy Only (NOT for New Development)'
    ids='["mat-sys-token"]'; refguide="docs/reference/styling-conventions.md" ;;
  *.ts)
    artifact="angular"; headings=$'Angular Conventions'
    ids='["constructor-injection","any-type"]' ;;
  *) artifact="" ;;
esac

mark_dir="${TMPDIR:-/tmp}/claude-standards-injected/$sid"
mkdir -p "$mark_dir" 2>/dev/null

# ---- GLOBAL scope (invariants + anti-patterns + artifact fragments + guides) — once per artifact ----
sections=""; patterns=""; frags=""; guides=""
if [ -n "$artifact" ] && [ ! -e "$mark_dir/art-$artifact" ]; then
  : > "$mark_dir/art-$artifact" 2>/dev/null
  while IFS= read -r h; do
    [ -n "$h" ] || continue
    sec=$(awk -v h="$h" '
      /^## / { cur = substr($0, 4); if (substr(cur, 1, length(h)) == h) { cap = 1; print; next } else if (cap) { cap = 0 } }
      cap { print }' "$CONSTRAINTS" 2>/dev/null)
    [ -n "$sec" ] && sections="$sections$sec"$'\n\n'
  done <<< "$headings"
  if [ -f "$ANTIPATTERNS" ] && [ "$ids" != "[]" ]; then
    patterns=$(jq -r --argjson ids "$ids" '
      .patterns[] | select(.id as $x | $ids | any(. == $x))
      | "- [\(.severity)] \(.description)" + (if .fix then " → " + .fix else "" end)' "$ANTIPATTERNS" 2>/dev/null)
  fi
  if [ -d "$STANDARDS" ]; then
    while IFS= read -r frag; do
      path_matches "$(read_applyto "$frag")" || continue
      body=$(strip_frontmatter "$frag"); [ -n "$body" ] && frags="${frags}${body}"$'\n\n'
    done < <(find "$STANDARDS" -maxdepth 1 -name '*.md' 2>/dev/null | sort)
  fi
  if [ -d "$INSTRUCTIONS" ]; then
    while IFS= read -r doc; do
      path_matches "$(read_applyto "$doc")" || continue
      title=$(grep -m1 '^# ' "$doc" 2>/dev/null | sed 's/^#[[:space:]]*//')
      guides="${guides}- ${doc#$root/}${title:+ — $title}"$'\n'
    done < <(find "$INSTRUCTIONS" -name '*.instructions.md' 2>/dev/null | sort)
  fi
  [ -n "$refguide" ] && guides="- ${refguide}"$'\n'"${guides}"
fi

# ---- LIBRARY-TYPE scope (standards/lib-types/<type>.md) — once per lib-type ----
libstd=""
if [ -d "$LIBTYPES" ]; then
  while IFS= read -r frag; do
    path_matches "$(read_applyto "$frag")" || continue
    key="libtype-$(basename "$frag" .md)"
    [ -e "$mark_dir/$key" ] && continue
    : > "$mark_dir/$key" 2>/dev/null
    body=$(strip_frontmatter "$frag"); [ -n "$body" ] && libstd="${libstd}${body}"$'\n\n'
  done < <(find "$LIBTYPES" -name '*.md' 2>/dev/null | sort)
fi

# ---- LIBRARY-INSTANCE scope (nearest AGENTS.md above the file) — once per library ----
libnotes=""; libpath=""
d=$(dirname "$fp")
while [ -n "$d" ] && [ "$d" != "/" ] && [ "$d" != "$root" ]; do
  if [ -f "$d/AGENTS.md" ]; then
    key="lib-$(printf '%s' "${d#$root/}" | tr '/.' '__')"
    if [ ! -e "$mark_dir/$key" ]; then
      : > "$mark_dir/$key" 2>/dev/null
      libnotes=$(strip_frontmatter "$d/AGENTS.md"); libpath="${d#$root/}/AGENTS.md"
    fi
    break
  fi
  nd=$(dirname "$d"); [ "$nd" = "$d" ] && break; d="$nd"
done

# ---- Nothing new this session? stay silent. ----
[ -z "$sections$frags$patterns$guides$libstd$libnotes" ] && exit 0

# ---- Assemble additionalContext ----
ctx="📐 Standards for this ${artifact:-source} file ($(basename "$fp")) — apply these BEFORE writing."
[ -n "$sections" ] && ctx="${ctx}

── Constraints (authoritative · docs/ai/CONSTRAINTS.md) ──
${sections}"
[ -n "$frags" ] && ctx="${ctx}── Patterns & shapes (docs/ai-instructions/standards) ──
${frags}"
[ -n "$libstd" ] && ctx="${ctx}── Library-type standard (docs/ai-instructions/standards/lib-types) ──
${libstd}"
[ -n "$patterns" ] && ctx="${ctx}── Anti-patterns to avoid (docs/ai/ANTI-PATTERNS.json) ──
${patterns}
"
[ -n "$guides" ] && ctx="${ctx}── Deep guides — open if relevant (routed by applyTo) ──
${guides}"
[ -n "$libnotes" ] && ctx="${ctx}── Library notes (${libpath}) ──
${libnotes}
"

jq -n --arg ctx "$ctx" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    additionalContext: $ctx
  }
}' 2>/dev/null

exit 0
