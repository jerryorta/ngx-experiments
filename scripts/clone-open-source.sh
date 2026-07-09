#!/usr/bin/env bash
#
# Clone the upstream framework SOURCE repos (shallow, version-pinned) into a
# SIBLING `open-source/` directory next to this repo:
#
#   <parent>/ngx-experiments   <- this repo
#   <parent>/open-source/      <- created here (angular, components, platform, rxjs)
#
# Why: gives Claude the readable framework SOURCE + tests + migration schematics to
# reference how to do something in the current stack (node_modules only ships the
# built .d.ts). It's a SIBLING (not inside the repo) so Nx / VSCode / tsc / ESLint /
# git -- all scoped to the repo root -- never see or index it. Safe to re-run.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OSS="$(cd "$REPO_ROOT/.." && pwd)/open-source"
mkdir -p "$OSS"

# Pins: rxjs + ngrx match the installed versions exactly; angular + components use
# the latest stable 21.x tag (installed 21.2.x isn't publicly tagged upstream -- the
# 21.x public API is stable across patches). Bump these as you upgrade the workspace.
REPOS=(
  "rxjs|https://github.com/ReactiveX/rxjs.git|7.8.2"
  "platform|https://github.com/ngrx/platform.git|21.1.1"
  "components|https://github.com/angular/components.git|21.0.2"
  "angular|https://github.com/angular/angular.git|21.0.3"
)

echo "Cloning framework sources -> $OSS"
for entry in "${REPOS[@]}"; do
  IFS='|' read -r name url tag <<< "$entry"
  if [ -d "$OSS/$name/.git" ]; then
    echo "  = $name present ($(git -C "$OSS/$name" describe --tags 2>/dev/null || echo '?')) -- skipping"
  else
    echo "  + $name @ $tag"
    git clone --depth 1 --single-branch --branch "$tag" "$url" "$OSS/$name"
  fi
done
echo "Done. Reference from ../open-source/<repo> (e.g. ../open-source/platform for NgRx signalStore source)."
