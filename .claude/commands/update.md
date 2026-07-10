Update npm modules in the ngx-experiments workspace: $ARGUMENTS

A single **Nx 23 + Angular 22** workspace (npm; no backends, desktop, or mobile). Update
through `nx migrate` where migrations exist, plain `npm install` otherwise, and verify
with `nx run-many` + the Storybook build. Self-contained — no external procedure doc.

## Usage

- **Comprehensive** (no arguments): update ALL outdated packages in the priority order below.
- **Targeted** (arguments): specific modules or patterns —
  `@storybook/angular` · `@angular/core @angular/common` · `@angular/*`.

## Procedure

1. **See what's outdated:**

   ```bash
   npm outdated
   ```

2. **Present the plan and get confirmation** before changing anything:
   - Group the outdated packages by the priority order below.
   - List current → target versions; flag anything in **HOLD**.
   - Wait for the user to confirm.

3. **Update each group:**
   - Angular / Nx / NgRx / Storybook / ESLint ecosystem (they ship coordinated migrations):

     ```bash
     npx nx migrate <package>@latest      # or a specific version
     ```
     - If a `migrations.json` is generated → `npx nx migrate --run-migrations`, review the
       diff, then delete `migrations.json`.
     - If none → `npm install --legacy-peer-deps`.
   - Standalone runtime/tooling libs (no Nx migrations): `npm install <package>@latest --legacy-peer-deps`.
   - Commit each group on its own: `chore(deps): update <group>`.

4. **Priority order** (Angular ecosystem first — `nx migrate` coordinates it):
   1. `@nx/*` + `nx`
   2. `@angular/*`, `@angular-devkit/*`, `@schematics/*`, `@angular-eslint/*`
   3. `@ngrx/*`
   4. `@storybook/*` + `storybook`
   5. `tailwindcss` + `@tailwindcss/*` + `postcss` + `autoprefixer`
   6. `eslint` + `@typescript-eslint/*` + `@eslint/*`
   7. `jest` + `jest-preset-angular` + `@swc/*` + `@swc-node/*`
   8. `@types/*`
   9. runtime libs: `rxjs`, `date-fns`, `gsap`, `d3-*`, `zone.js`, `tslib`, `uuid`
   10. `typescript`, `prettier`

5. **HOLD — don't bump these majors without checking first:**
   - **NgRx is NOT a gate here.** This experiments repo intentionally runs Angular / Nx
     ahead of what `@ngrx/*` lists as a peer. Installs therefore use `--legacy-peer-deps`
     (already set as the default in `.npmrc`, so a bare `npm install` works too) to skip
     the peer-conflict error. Bump `@angular/*` / `@nx/*` freely; just re-install.
   - **`typescript`** — stay within the range the installed Angular supports
     (`~6.0`, i.e. `>=6.0 <6.1`, for Angular 22).
   - **Storybook runs on a deliberate `10.5.x` prerelease.** Stable `@storybook/angular`
     caps at Angular `<22`, so a bare `@latest` would *downgrade* it to 10.4.x and break the
     Angular-22 Storybook build. Bump `@storybook/angular` + `storybook` only within `10.5.x`
     (or to stable `10.5.x` once it ships), and keep `@angular-devkit/build-angular` at the
     Angular major.
   - Unused seed deps still in `package.json` (`@capacitor/*`, `@capgo/*`, `@tauri-apps/*`,
     `@awesome-cordova-plugins/*`, `firebase`) aren't wired into any project — skip them
     unless you're actually adding that surface.

6. **Re-pin the framework source clones** — keep `scripts/clone-open-source.sh` in sync:
   - Its `REPOS` pins mirror the installed framework versions, so if this run bumped
     Angular / CDK / NgRx / RxJS, update the pins from `node_modules`. **Mind the tag
     format: `angular` + `components` take a leading `v` (`v22.0.6`); `platform` (ngrx) +
     `rxjs` are bare (`21.1.1`).**

     ```bash
     node -p "'angular    v'+require('@angular/core/package.json').version"
     node -p "'components  v'+require('@angular/cdk/package.json').version"
     node -p "'platform    '+require('@ngrx/store/package.json').version"
     node -p "'rxjs        '+require('rxjs/package.json').version"
     ```
   - The script skips repos already cloned, so to actually refresh the sibling
     `../open-source/` sources, delete the changed repo dir(s) first, then re-run
     `./scripts/clone-open-source.sh`.

7. **Verify** (this workspace has no `npm run lint/test/build` scripts — use Nx):

   ```bash
   npx nx run-many --target=lint,test --all
   npx nx run storybook-app:build-storybook
   ```
   Auto-fix lint with `npx nx run-many --target=lint --all --fix`.
   If a `migrations.json` was left behind or state looks stale: `npx nx reset`.

8. **Summary report:**
   - Updated packages (old → new versions)
   - Commits created
   - Held / skipped packages, with reasons
   - Verify status (lint · test · build-storybook)
