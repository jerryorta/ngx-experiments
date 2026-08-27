# Storybook

## Overview

The workspace has **one** Storybook app.

| Nx project      | Config location                  | Port                    | Covers                                         |
| --------------- | -------------------------------- | ----------------------- | ---------------------------------------------- |
| `storybook-app` | `apps/storybook-app/.storybook/` | `http://localhost:4400` | the Welcome page plus the five libraries below |

The port is `targets.storybook.options.port` in `apps/storybook-app/project.json`, which declares
explicit `@storybook/angular:start-storybook` (`storybook`) and `@storybook/angular:build-storybook`
(`build-storybook`) executor targets — both with `compodoc: false`, both with a `ci` configuration
that sets `quiet: true`. Both name `browserTarget: storybook-app:build`, so the global styles
(`apps/storybook-app/src/styles.scss`, `apps/storybook-app/src/tailwind.css`), the SCSS include paths
and the `apps/storybook-app/public/` assets come from the app's `build` target; `main.ts` declares no
`staticDirs`.

`apps/storybook-app/.storybook/main.ts` uses the `@storybook/angular` framework and registers no
addons (`addons: []`).

### The Welcome page

Storybook opens on `apps/storybook-app/src/welcome/sb-welcome.component.ts` (story
`apps/storybook-app/src/welcome/welcome.stories.ts`, title `Welcome`). It lives in the app rather than
in a library because it describes all of them, and without it a visitor lands in whichever component
story sorts first. `options.storySort` in `preview.ts` pins `Welcome` first, and Storybook selects the
first sidebar story when no `?path=` is supplied — reordering that list changes the landing page.

### `preview.ts`

`apps/storybook-app/.storybook/preview.ts`:

- renders every story zoneless — `applicationConfig({ providers: [provideZonelessChangeDetection()] })`;
  the workspace has no Zone.js;
- applies the selected theme class to `document.body`, resolved through `@nge/storybook`'s
  `STORYBOOK_THEME_CONFIGS` and `resolveThemeForGroup`; the boot theme is the catalog's single
  `isDefault: true` entry (`getDefaultThemeConfig`), never a class named in `preview.ts`;
- loads the persona and icon fonts from Google Fonts once at startup;
- sets `layout: 'fullscreen'` and the sidebar order
  `['Welcome', 'UI Design Library', 'Charts', 'Table', 'Calendar']`.

The theme _switcher_ is a custom manager toolbar tool — `apps/storybook-app/.storybook/manager.tsx`
registers `theme-selector-tool.tsx` — so `globalTypes.theme` declares no `toolbar`. A story scopes the
picker to its persona group with `parameters: { themeGroup: 'cg' }`; see
`libs/shared/storybook/AGENTS.md`.

## Included Libraries

One glob per library in `apps/storybook-app/.storybook/main.ts`, each matched by a `*.stories.ts`
include in `apps/storybook-app/.storybook/tsconfig.json`. Story-file counts are
`find libs -name '*.stories.ts' | cut -d/ -f2-3 | sort | uniq -c`; the Welcome page's per-library
numbers count _published_ stories (exports — usually several per file), so they run higher.

| Library                         | Story files | Sidebar title                               |
| ------------------------------- | ----------- | ------------------------------------------- |
| `libs/shared/ui-design-library` | 43          | `UI Design Library` (+ `Mobile Footer Nav`) |
| `libs/shared/charts`            | 112         | `Charts`                                    |
| `libs/shared/table`             | 52          | `Table`                                     |
| `libs/shared/calendar`          | 16          | `Calendar`                                  |
| `libs/ledger/design-library`    | 10          | `Ledger Design Library`                     |

A sixth glob, `../src/**/*.stories.@(js|jsx|ts|tsx)`, covers the app itself and matches one file —
the Welcome story.

Sidebar sections are title-driven, not library-driven: `dlc-bottom-nav`'s stories in
`libs/shared/ui-design-library` are titled `Mobile Footer Nav/…`, so they form their own top-level
section (ordered after Calendar in `preview.ts` `storySort`) while living in the design library.

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

The file extends `../tsconfig.app.json`, sets `emitDecoratorMetadata`, and has `files: []`. Its
`include` array carries exactly the story globs — the app's own `../src/**/*.stories.ts` plus one per
library — and `preview.ts`; its `exclude` array drops every spec:
`["../**/*.spec.ts", "../../../libs/**/*.spec.ts"]`. Stories pull their components through `@nge/*`
path aliases, so component sources need no include of their own.

**Important:** The `main.ts` globs and `tsconfig.json` includes must stay in sync. If Storybook
discovers a story file that tsconfig doesn't include, the build fails with:

```
■ [file] is missing from the TypeScript compilation.
```

### 3. Sidebar order and the Welcome page

Add the library's sidebar title to `options.storySort.order` in `preview.ts` where it should sort
(titles absent from that list sort after it), and give it a card in the `libraries` array of
`apps/storybook-app/src/welcome/sb-welcome.component.ts`.

## Commands

The Storybook entries in `package.json` `scripts`:

| Command                   | Purpose                                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run storybook`       | `npx nx run storybook-app:storybook` — start Storybook at `localhost:4400`                                                                                                 |
| `npm run build-storybook` | `npx nx run storybook-app:build-storybook` — static build to `dist/storybook/storybook-app`; also the cheapest full-surface check for design-library / charts / table work |

There is no deploy script in `package.json` or `scripts/`. Publishing is CI-only:
`.github/workflows/storybook.yml` runs the static build and deploys `dist/storybook/storybook-app` to
Firebase Hosting (target `storybook` in `firebase.json` and `.firebaserc`) — the live channel on every
push to `main`, a seven-day preview channel whose URL is commented on the PR for pull requests from
this repository, and on `workflow_dispatch`. Live site: <https://jerryorta-storybook.web.app>.

## Story File Conventions

Stories sit next to their components — in a `stories/` subdirectory in the design library, charts,
table and the Ledger design library; the calendar keeps the composed calendar's stories under
`nge-calendar/stories/` and the pickers' and views' story files directly beside their components.
Charts and table add a facet level (`usage/`, `theming/`, `interaction/`) under each story name — the
`create-chart-storybook` and `create-table-storybook` skills generate that shape, `create-storybook`
the plain one:

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

The standard story wrapper is `NgeStorybookReviewContainerComponent` from `@nge/storybook`
(`libs/shared/storybook/src/lib/storybook-review/`); it reads the theme class off `document.body`.
