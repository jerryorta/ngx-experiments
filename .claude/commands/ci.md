Clean reinstall of the workspace-root dependencies — remove `node_modules` and run `npm ci`.

## Steps

Run from the repository root:

1. Ensure Node ≥ 24.15.0 is active (Angular 22 requires it) — e.g. `source ~/.nvm/nvm.sh && nvm use 24`. This repo has no `.nvmrc`, so the version must be selected explicitly.
2. `rm -rf node_modules`
3. `npm ci` — clean-installs exactly from `package-lock.json`. No `--legacy-peer-deps` flag is needed: this repo's `.npmrc` already sets `legacy-peer-deps=true` globally (NgRx runs ahead of its Angular peer range).
4. Report the result (packages added, elapsed time, any errors).

## Why clean, not incremental

A plain `npm install` across a major Angular/Nx bump in this repo has hit npm's `ERR_INVALID_ARG_TYPE` reify-rollback crash, which masks the real resolution error and leaves `node_modules/.bin` half-broken. For any major/minor framework bump, always remove `node_modules` first rather than installing on top.
