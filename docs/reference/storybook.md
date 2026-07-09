# Storybook

## Overview

The Storybook app at `apps/storybook-app/` provides component documentation and interactive testing for UI libraries across the monorepo.

**Config location:** `apps/storybook-app/.storybook/`
**Port:** `http://localhost:4400`

## Included Libraries

| Library | Story path | Assets |
|---------|-----------|--------|
| `libs/shared/ui-design-library-deprecated` | `src/**/*.stories.ts` | `src/assets` → `assets/dlc` |
| `libs/shared/ui-design-library` | `src/**/*.stories.ts` | — |
| `libs/shared/charts` | `src/**/*.stories.ts` | — |
| `libs/evolving-cognition/ui` | `src/**/*.stories.ts` | `src/assets` → `assets/ec-ui` |
| `libs/real-estate/ui` | `src/**/*.stories.ts` | — |

## Adding a New Library

When adding stories from a new library, update **both** config files:

### 1. `main.ts` — Story discovery

Add the library's story glob to the `stories` array:

```typescript
'../../../libs/<domain>/<lib>/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
```

If the library has an `src/assets` directory referenced by stories, add a `staticDirs` entry:

```typescript
{ from: '../../../libs/<domain>/<lib>/src/assets', to: 'assets/<prefix>' },
```

### 2. `.storybook/tsconfig.json` — TypeScript compilation

Add include globs (all 6 extensions):

```json
"../../../libs/<domain>/<lib>/src/**/*.stories.ts",
"../../../libs/<domain>/<lib>/src/**/*.stories.js",
"../../../libs/<domain>/<lib>/src/**/*.stories.jsx",
"../../../libs/<domain>/<lib>/src/**/*.stories.tsx",
"../../../libs/<domain>/<lib>/src/**/*.stories.mdx",
"../../../libs/<domain>/<lib>/src/**/*.component.ts",
```

Add exclude glob for spec files:

```json
"../../../libs/<domain>/<lib>/src/**/*.spec.ts"
```

**Important:** The `main.ts` globs and `tsconfig.json` includes must stay in sync. If Storybook discovers a story file that tsconfig doesn't include, the build fails with:

```
■ [file] is missing from the TypeScript compilation.
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run storybook` | Start dev server at `localhost:4400` |
| `npm run build-storybook` | Production build to `dist/storybook/storybook-app` |
| `npm run chromatic` | Deploy to Chromatic for visual review |

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
