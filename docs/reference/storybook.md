# Storybook

## Overview

The workspace has **two** Storybook apps.

| App | Nx project | Config location | Port | Covers |
|---|---|---|---|---|
| Workspace Storybook | `storybook-app` | `apps/storybook-app/.storybook/` | `http://localhost:4400` | 12 libraries (below) |
| Got You Storybook | `got-you-storybook` | `apps/got-you/storybook/.storybook/` | `http://localhost:4406` | every `libs/got-you/*` library, via one glob |

Neither config serves static assets — both set `staticDirs: []`. Both load the
`@storybook/addon-docs` and `@storybook/addon-a11y` addons.

## Included Libraries — workspace Storybook

One glob per library in `apps/storybook-app/.storybook/main.ts`, each matched by a
`*.stories.ts` include in `apps/storybook-app/.storybook/tsconfig.json`.

| Library |
|---|
| `libs/shared/calendar` |
| `libs/shared/charts` |
| `libs/shared/table` |
| `libs/shared/ui-design-library` |
| `libs/media-workbench/ui` |
| `libs/media-workbench/design-library` |
| `libs/concierge/design-library` |
| `libs/nge-marketing/design-library` |
| `libs/cognition/design-library` |
| `libs/cognition/ui` |
| `libs/got-you/design-library` |
| `libs/jerryorta/design-library` |

`libs/got-you/design-library` is reachable from both Storybooks — the workspace config
names it explicitly, and the Got You config's `libs/got-you/**` glob sweeps it up.

## Adding a New Library

When adding stories from a new library, update **both** config files:

### 1. `main.ts` — Story discovery

Add the library's story glob to the `stories` array:

```typescript
'../../../libs/<domain>/<lib>/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
```

### 2. `.storybook/tsconfig.json` — TypeScript compilation

Add one matching include — the same path, narrowed to `*.stories.ts`:

```json
"../../../libs/<domain>/<lib>/src/**/*.stories.ts",
```

The `include` array carries exactly these story globs plus `preview.ts`; there is no
`exclude` array and no per-extension fan-out. Stories pull their components through
`@nge/*` path aliases, so component sources need no include of their own.

**Important:** The `main.ts` globs and `tsconfig.json` includes must stay in sync. If Storybook discovers a story file that tsconfig doesn't include, the build fails with:

```
■ [file] is missing from the TypeScript compilation.
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run storybook` | Clear the Nx cache, then start the workspace Storybook at `localhost:4400` |
| `npm run storybook.got-you` | Start the Got You Storybook at `localhost:4406` |
| `npm run build-storybook` | Production build to `dist/storybook/storybook-app` |
| `npm run chromatic` | Clean cache, build, and publish to Chromatic for visual review |
| `npm run d.storybook.got-you` | Build + deploy the Got You Storybook to the `got-you-storybook` Hosting site (`scripts/got-you/storybook/d.storybook.got-you.sh`) |
| `npm run d.storybook.firebase` | Build + deploy the workspace Storybook to the `ngesoft-storybook` Hosting site (`apps/nge-marketing/backend/d.storybook.prd.sh`) |

## Story File Conventions

Stories live alongside their components in a `stories/` subdirectory:

```
libs/<domain>/<lib>/src/lib/<feature>/
├── <component>/
│   ├── <component>.component.ts
│   ├── <component>.component.html
│   └── <component>.component.scss
└── stories/
    └── <story-name>/
        ├── <story-name>.stories.ts
        ├── <story-name>-stories.component.ts   (wrapper component)
        ├── <story-name>-stories.component.html
        └── <story-name>-stories.component.scss
```
