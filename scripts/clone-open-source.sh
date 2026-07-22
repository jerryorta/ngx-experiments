#!/usr/bin/env bash
#
# Ensure this repo has a SIBLING `open-source/` directory holding the pinned
# upstream framework SOURCE clones:
#
#   <parent>/ngx-experiments   <- this repo
#   <parent>/open-source/      (angular, components, platform, rxjs, d3 + all d3-* modules)
#
# Why: gives Claude (and developers) the readable framework SOURCE + tests +
# migration schematics to reference how to do something in the current stack
# (node_modules only ships the built .d.ts). It's a SIBLING (not inside the repo)
# so Nx / VSCode / tsc / ESLint / git -- all scoped to the repo root -- never see
# or index it.
#
# Portable AND machine-shared, but shared PER REPO, not wholesale. A shared copy
# (default ~/Dev/open-source, override with NGE_OSS_SHARED) is typically pinned for
# the *gigasoftware* stack, which trails this repo -- its angular/components clones
# are Angular 21 while this repo runs Angular 22. Symlinking the whole directory
# would therefore hand this repo the WRONG framework source and skip silently. So
# each pinned repo resolves independently:
#
#   1. Already present locally      -> verify its tag against the pin, warn on drift
#   2. Shared copy exists AND its tag MATCHES our pin -> symlink (free sharing:
#      rxjs / ngrx / the whole d3 set are identical across both repos)
#   3. Otherwise                    -> shallow-clone the pin into our own sibling
#
# Idempotent -- re-run any time (`npm run oss.sync`); re-running is how new pins
# propagate.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OSS="$(cd "$REPO_ROOT/.." && pwd)/open-source"
SHARED="${NGE_OSS_SHARED:-$HOME/Dev/open-source}"

# Heal a dangling symlink (shared copy moved or deleted)
if [ -L "$OSS" ] && [ ! -e "$OSS" ]; then
  echo "Removing dangling symlink $OSS"
  rm "$OSS"
fi
[ -e "$OSS" ] || { echo "Creating $OSS"; mkdir -p "$OSS"; }

# Pins are the EXACT verified tags matched to THIS repo's installed deps. The
# /update command re-pins these from node_modules whenever it bumps a pinned
# framework; keep them in sync. Tag formats DIFFER per repo/era -- angular +
# components are v-prefixed (v22.0.7), rxjs + ngrx are bare (7.8.2), and the whole
# d3 org is v-prefixed. Verify with `git ls-remote --tags <url>` when re-pinning,
# don't assume.
REPOS=(
  # -- Framework sources --------------------------------------------------------
  "rxjs|https://github.com/ReactiveX/rxjs.git|7.8.2"
  "platform|https://github.com/ngrx/platform.git|21.1.1"
  "components|https://github.com/angular/components.git|v22.0.5"
  "angular|https://github.com/angular/angular.git|v22.0.7"
  # -- D3: full module set ------------------------------------------------------
  # Pinned to the versions the `d3` meta-package installs into node_modules --
  # @nge/charts (libs/shared/charts) references these. The `d3` meta repo carries
  # the official API docs for every module in /docs. Callouts: d3-axis is the
  # fork-source for the custom grouped axis; d3-brush is interaction-pattern
  # reference ONLY (chart gestures are deliberately stateless -- no runtime
  # d3-brush/d3-zoom dependency). d3-hierarchy and d3-regression are direct
  # dependencies (hierarchical layers / analytical overlay fits); note
  # d3-regression is NOT in the d3 org -- it lives under HarryStevens.
  "d3|https://github.com/d3/d3.git|v7.9.0"
  "d3-array|https://github.com/d3/d3-array.git|v3.2.4"
  "d3-axis|https://github.com/d3/d3-axis.git|v3.0.0"
  "d3-brush|https://github.com/d3/d3-brush.git|v3.0.0"
  "d3-chord|https://github.com/d3/d3-chord.git|v3.0.1"
  "d3-color|https://github.com/d3/d3-color.git|v3.1.0"
  "d3-contour|https://github.com/d3/d3-contour.git|v4.0.2"
  "d3-delaunay|https://github.com/d3/d3-delaunay.git|v6.0.4"
  "d3-dispatch|https://github.com/d3/d3-dispatch.git|v3.0.1"
  "d3-drag|https://github.com/d3/d3-drag.git|v3.0.0"
  "d3-dsv|https://github.com/d3/d3-dsv.git|v3.0.1"
  "d3-ease|https://github.com/d3/d3-ease.git|v3.0.1"
  "d3-fetch|https://github.com/d3/d3-fetch.git|v3.0.1"
  "d3-force|https://github.com/d3/d3-force.git|v3.0.0"
  "d3-format|https://github.com/d3/d3-format.git|v3.1.2"
  "d3-geo|https://github.com/d3/d3-geo.git|v3.1.1"
  "d3-hierarchy|https://github.com/d3/d3-hierarchy.git|v3.1.2"
  "d3-interpolate|https://github.com/d3/d3-interpolate.git|v3.0.1"
  "d3-path|https://github.com/d3/d3-path.git|v3.1.0"
  "d3-polygon|https://github.com/d3/d3-polygon.git|v3.0.1"
  "d3-quadtree|https://github.com/d3/d3-quadtree.git|v3.0.1"
  "d3-random|https://github.com/d3/d3-random.git|v3.0.1"
  "d3-regression|https://github.com/HarryStevens/d3-regression.git|v2.2.0"
  "d3-scale|https://github.com/d3/d3-scale.git|v4.0.2"
  "d3-scale-chromatic|https://github.com/d3/d3-scale-chromatic.git|v3.1.0"
  "d3-selection|https://github.com/d3/d3-selection.git|v3.0.0"
  "d3-shape|https://github.com/d3/d3-shape.git|v3.2.0"
  "d3-time|https://github.com/d3/d3-time.git|v3.1.0"
  "d3-time-format|https://github.com/d3/d3-time-format.git|v4.1.0"
  "d3-timer|https://github.com/d3/d3-timer.git|v3.0.1"
  "d3-transition|https://github.com/d3/d3-transition.git|v3.0.1"
  "d3-zoom|https://github.com/d3/d3-zoom.git|v3.0.0"
)

# tag_of <dir> -> the checked-out tag, or empty
tag_of() { git -C "$1" describe --tags 2>/dev/null || true; }

echo "Syncing framework sources -> $OSS"
drift=0
for entry in "${REPOS[@]}"; do
  IFS='|' read -r name url tag <<< "$entry"
  dest="$OSS/$name"

  # Heal a per-repo dangling symlink
  if [ -L "$dest" ] && [ ! -e "$dest" ]; then rm "$dest"; fi

  if [ -d "$dest/.git" ]; then
    have="$(tag_of "$dest")"
    if [ -n "$have" ] && [ "$have" != "$tag" ]; then
      echo "  ! $name is at '$have' but this repo pins '$tag' -- re-pin or re-clone (see below)"
      drift=1
    else
      echo "  = $name present (${have:-?})"
    fi
    continue
  fi

  # Share the machine copy ONLY when its tag matches our pin.
  if [ -d "$SHARED/$name/.git" ] && [ "$SHARED" != "$OSS" ]; then
    shared_tag="$(tag_of "$SHARED/$name")"
    if [ "$shared_tag" = "$tag" ]; then
      echo "  ~ $name -> $SHARED/$name (shared, tag matches $tag)"
      ln -s "$SHARED/$name" "$dest"
      continue
    fi
    echo "  . $name shared copy is '$shared_tag' != pin '$tag' -- cloning our own"
  fi

  echo "  + $name @ $tag"
  git clone --depth 1 --single-branch --branch "$tag" "$url" "$dest"
done

if [ "$drift" = 1 ]; then
  echo
  echo "Some clones drifted from the pins above. To re-pin one atomically:"
  echo "  git clone --depth 1 --single-branch --branch <tag> <url> $OSS/<name>.new \\"
  echo "    && rm -rf $OSS/<name> && mv $OSS/<name>.new $OSS/<name>"
  echo "(atomic swap matters when the target is a shared copy serving other repos)"
fi

echo "Done. Reference from ../open-source/<repo> (e.g. ../open-source/platform for NgRx signalStore source)."
