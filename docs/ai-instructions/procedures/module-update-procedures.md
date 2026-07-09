# Module Update Procedures

This is the authoritative guide for updating npm modules in the Gigasoftware workspace. It combines all module update procedures, priority orders, and restrictions.

## Quick Reference

When you need to update modules, use these command formats:

### Comprehensive Update (Recommended)

```
update
```

This single command will systematically update all packages following the priority order below.

### Targeted Updates

```
update [module-name(s)]
```

**Examples:**

- `update @storybook/angular` - Single module
- `update @angular/core @angular/common` - Multiple modules
- `update @angular/*` - All modules matching pattern
- `update @storybook/*` - Pattern matching

## Priority Update Order

**ALWAYS update packages in this exact order to minimize conflicts:**

1. **@nx/\*** - Nx workspace packages (check restrictions below)
2. **@angular/\*** - Angular framework packages
3. **@angular-\*** - Angular-related packages
4. **@schematics/\*** - Angular schematics
5. **@ngrx/\*** - State management
6. **@storybook/\*** - Storybook packages
7. **@syncfusion/\*** - UI component library
8. **es-toolkit** - Utility library
9. **eslint** and related:
   - eslint
   - eslint-\*
   - typescript-eslint
   - @typescript-eslint/\*
10. **vite** and related:
    - vite
    - vite/\*
    - vite-\*
11. **stylelint** - Style linting
12. **@types/\*** - TypeScript type definitions
13. **@capacitor/\*** - Mobile app framework
14. **@capgo/\*** - Capacitor plugins (capacitor-social-login)
15. **@revenuecat/\*** - Revenue management (purchases-capacitor, purchases-js)
16. **@algolia/\*** - Search functionality
17. **firebase** - Backend services

## DO NOT UPDATE - Package Restrictions

### Permanent Restrictions

These packages should NOT be updated due to compatibility constraints:

- **codemirror**: Stay on 5.x - Version 6.x requires significant refactoring

### Temporary Restrictions

Monitor these for changes:

## Comprehensive Update Procedure

When the user simply says `update` without specifying modules, perform a systematic update of all packages:

### Step 1: Check Outdated Packages

```bash
npm outdated
```

Analyze the output to identify which packages need updating.

### Step 2: Present Update Plan and Get Confirmation

After analyzing `npm outdated`, present a categorized list of packages that will be updated:

```
📋 Packages to Update (by priority group):

**Group 1 - Nx Workspace**
- nx: 22.1.0 → 22.2.5
- @nx/angular: 22.1.0 → 22.2.5
- ... (list all)

**Group 2 - Angular Ecosystem**
- @angular/core: 21.0.0 → 21.0.5
- @angular/common: 21.0.0 → 21.0.5
- ... (list all)

... (continue for all groups with outdated packages)

**⏭️ Skipped (DO NOT UPDATE):**
- codemirror: 5.65.20 (staying on 5.x)
- react: 19.2.0 (staying on current)
- ... (list any skipped packages and reason)

Total packages to update: X
```

**IMPORTANT:** Wait for user confirmation before proceeding. Ask:

> "Do you want me to proceed with these updates? (yes/no)"

Only proceed to Step 3 after receiving explicit user confirmation.

### Step 3: Update by Priority Groups

Process each group in order, stopping if migrations are generated:

**Group 1 - Nx Workspace** (check restrictions first)

- Run: `update @nx/*` if GitHub issue #30416 is resolved
- Skip with notification if issue is still open

**Group 2 - Angular Ecosystem**

- Run: `update @angular/*`
- Run: `update @angular-*` (if any exist)
- Run: `update @schematics/*`

**Group 3 - State Management**

- Run: `update @ngrx/*`

**Group 4 - UI Libraries**

- Run: `update @storybook/*`
- Run: `update @syncfusion/*`

**Group 5 - Build Tools**

- Run: `update es-toolkit`
- Run: `update eslint eslint-*`
- Run: `update typescript-eslint @typescript-eslint/*`
- Run: `update vite vite-* @vitejs/*`
- Run: `update stylelint stylelint-*`

**Group 6 - Type Definitions**

- Run: `update @types/*`

**Group 7 - Third-party Services**

- Run: `update @revenuecat/*` (purchases-capacitor, purchases-js)
- Run: `update @algolia/*`
- Run: `update firebase`

**Group 8 - Other Dependencies**

- Check `npm outdated` for remaining packages
- Update any remaining outdated packages not in DO NOT UPDATE list

For each group:

- Use pattern matching where applicable
- Follow the standard update procedure for each package
- Stop immediately if migrations are generated
- Report progress after each group completes
- Skip packages in the DO NOT UPDATE list

### Step 4: Update Backend & Desktop Standalone Projects

These projects live inside the monorepo but are **NOT Nx projects**. Do NOT use `npx nx migrate` — use yarn/npm directly.

**Package manager and Node version by directory:**

| Directory                               | Package manager | Node version | Has build step?      |
| --------------------------------------- | --------------- | ------------ | -------------------- |
| `apps/evolving-cognition/backend/`           | npm             | 24.2.0       | No                   |
| `apps/evolving-cognition/backend/functions/` | **yarn**        | **22.19.0**  | Yes: `npm run build` |
| `apps/concierge/backend/`               | npm             | 24.2.0       | No                   |
| `apps/concierge/backend/functions/`     | **yarn**        | **22.19.0**  | Yes: `npm run build` |
| `apps/media-workbench/desktop/`         | npm             | 24.2.0       | No                   |

**Update functions/ directories (yarn + Node 22.19.0):**

```bash
source ~/.nvm/nvm.sh && nvm use 22.19.0
cd apps/evolving-cognition/backend/functions
yarn outdated           # review what's changing
yarn upgrade            # updates within semver ranges
npm run build           # verify it still compiles

cd ../../../apps/concierge/backend/functions
yarn outdated
yarn upgrade
npm run build
```

**Update backend roots and desktop (npm + Node 24.2.0):**

```bash
cd apps/evolving-cognition/backend && npm update
cd ../real-estate && npm update
cd ../../apps/media-workbench/desktop && npm update
```

**Commit:** Single commit for all backend/desktop lock file changes:

```bash
git add backend/ apps/media-workbench/desktop/
git commit -m "chore: update backend and desktop dependencies"
```

### Step 5: Final Verification

After all updates:

```bash
npm run lint -- --fix
npm test
npm run build
```

### Step 6: Report Summary

Provide a comprehensive summary of all updates performed.

## Standard Update Procedure

For each module specified (or found via pattern/comprehensive update), follow this exact sequence:

### Step 1: Run Migration Command

```bash
npx nx migrate [module-name] latest
```

For specific versions:

```bash
npx nx migrate [module-name] [version]
```

### Step 2: Check for Generated Migrations

- Look for `migrations.json` file in workspace root
- If `migrations.json` is created or updated with new migrations:
  - **STOP immediately** - do not proceed
  - Inform user:
    ```
    🛑 Migrations generated for [module-name]
    📋 Please review migrations.json
    ⚠️  Run migrations manually: npx nx migrate --run-migrations
    🔄 Continue upgrade after migrations complete
    ```
  - Do NOT process next module until migrations are resolved
  - Do NOT remove migrations.json if migrations fail

### Step 3: Run Migrations (if generated)

If migrations were generated:

```bash
npx nx migrate --run-migrations
```

- If migrations fail: STOP and notify user of the error
- If migrations succeed: Continue to next step
- Only remove migrations.json after successful migration

### Step 4: Install Dependencies

If no migrations or after successful migration:

```bash
npm install
```

### Step 5: Clean Up

Only if migrations succeeded:

```bash
rm migrations.json
```

### Step 6: Commit Changes

Individual commit per module for clean history:

```bash
git add . && git commit -m "Update [module-name] to [version]"
```

### Step 7: Continue to Next Module

Repeat steps 1-6 for each remaining module.

## Pattern Matching

When user specifies patterns like `@angular/*` or `@storybook/*`:

1. **Find matching modules** in package.json:

   ```bash
   grep -o '"@storybook/[^"]*"' package.json | sort | uniq
   ```

2. **List found modules** and ask user to confirm before proceeding

3. **Process each module individually** using the standard procedure

## Check Outdated Packages

To check and update outdated packages strategically:

```bash
npm outdated
```

Then update packages following the priority order above.

## Error Handling

### Migration Command Failures

If `npx nx migrate [module]` fails:

1. Check module name spelling
2. Verify module exists in package.json
3. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
4. Retry migration command
5. Report specific error to user if still failing

### NPM Install Failures

If `npm install` fails:

1. Try with legacy peer deps:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Try with force flag:
   ```bash
   npm install --legacy-peer-deps --force
   ```
3. Try clean install:
   ```bash
   npm ci --legacy-peer-deps
   ```
4. Clear node_modules and retry:
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   ```
5. Report error and suggest manual intervention

### Git Commit Failures

If commit fails:

1. Check for changes:
   ```bash
   git status
   ```
2. If no changes: Note "No updates available for [module-name]"
3. If uncommitted changes exist: Check for conflicts and resolve
4. Continue to next module

### Build Failures After Update

1. Clear Nx cache: `npm run clean.cache`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check for breaking changes in module documentation
4. Run tests to identify issues: `npm test`
5. Run lint with fix: `npm run lint -- --fix`

### TypeScript Errors After Update

1. Check TypeScript version compatibility
2. Update @types packages if needed
3. Review breaking changes in updated modules
4. Update code to match new APIs if required

## Success Reporting

After completing all module upgrades, provide a comprehensive summary:

### All Successful

```
✅ Module Update Complete!

**Updated packages:**
- @angular/core: 20.0.0 → 20.0.4
- @angular/common: 20.0.0 → 20.0.4
- @angular/cli: 20.0.0 → 20.0.4
- @storybook/angular: 7.0.0 → 7.6.17

**Commits created:** 3
- `abc1234de` - chore: update @angular/core to 20.0.4
- `def5678gh` - chore: update @angular/common to 20.0.4
- `ijk9012lm` - chore: update @storybook/angular to 7.6.17

**Skipped (intentionally):**
- codemirror: 5.65.20 (staying on 5.x - v6 requires refactoring)

**Build:** Production build successful
```

### With Migrations

```
⚠️  Module Upgrade Paused

**Completed packages:**
- @storybook/angular: 7.0.0 → 7.6.17

**Commits created:** 1
- `abc1234de` - chore: update @storybook/angular to 7.6.17

**Pending migrations:**
- @angular/core: Requires manual migration review

**Next steps:**
1. Review migrations.json
2. Run: npx nx migrate --run-migrations
3. Test application
4. Continue with remaining modules
```

### Summary Requirements

The final summary MUST include:

1. **Updated packages** - List each package with old → new version
2. **Commits created** - Show commit count and list each with hash and message
3. **Skipped packages** - List any packages intentionally skipped with reason
4. **Build status** - Confirm production build passed or note any issues

## Workspace Configuration

### Package Manager

- **Manager**: npm (not yarn or pnpm)
- **Lock file**: package-lock.json (commit after updates)
- **Peer deps**: Use `--legacy-peer-deps` when needed

### Nx Workspace

- **Current Version**: 22.6.1
- **Migration tool**: Uses Nx migrate for compatibility
- **Cache**: May require clearing after updates (`npm run clean.cache`)

### Git Workflow

- **Separate commits**: One commit per module
- **Descriptive messages**: "Update [module-name] to [version]"
- **Branch strategy**: Work on current branch unless specified
- **No automatic pushing**: User controls when to push

### Mobile Node Apps (Separate Repository)

The mobile apps have their own package.json files in a separate repository (`gigasoftware_node_apps`). These must be updated **manually** when updating Capacitor or related mobile packages.

**Locations:**

- `gigasoftware_node_apps/evolving-cognition/mobile/package.json`
- `gigasoftware_node_apps/real-estate/mobile/package.json`

**Important:**

- **DO NOT use `npx nx migrate`** - These are not Nx projects
- Edit package.json directly to update version numbers
- Run `npm install` in each mobile directory after updating
- Commit changes to the `gigasoftware_node_apps` repository

**Packages to keep in sync:**

- `@capacitor/*` - Must match main workspace versions
- `@capgo/capacitor-social-login` - Must match main workspace version
- `@revenuecat/purchases-capacitor` - Mobile-specific RevenueCat package

**Update procedure:**

```bash
# 1. Update package.json versions manually (edit file)

# 2. Install dependencies
cd gigasoftware_node_apps/evolving-cognition/mobile && npm install
cd gigasoftware_node_apps/real-estate/mobile && npm install

# 3. Commit changes
cd gigasoftware_node_apps
git add . && git commit -m "chore: update mobile packages"
```

## Common Update Scenarios

### Angular Ecosystem

```bash
# Core Angular packages
update @angular/core @angular/common @angular/router @angular/forms

# Material Design
update @angular/material @angular/cdk

# Build tools
update @angular/animations @angular/platform-browser
```

### Storybook Ecosystem

```bash
# All Storybook packages
update @storybook/*

# Specific packages
update @storybook/angular @storybook/addon-essentials
```

### Development Tools

```bash
# TypeScript and linting
update typescript
update eslint @typescript-eslint/*
update prettier
```

### Testing Libraries

```bash
# Jest ecosystem
update jest @types/jest
update @testing-library/angular
```

## Version Handling

- **No version specified**: Use `latest`
  ```bash
  npx nx migrate @angular/core latest
  ```
- **Specific version**: Use exact version
  ```bash
  npx nx migrate @angular/core 20.0.4
  ```
- **Pattern with version**: Apply to all matching
  ```bash
  update @angular/* 20.0.4
  ```

## Important Notes

- **Always use** the priority order when updating multiple package groups
- **Check** `npm outdated` before starting to identify what needs updating
- **Test** the application after updates with `npm test` and `npm run build`
- **Run lint** after all updates: `npm run lint -- --fix`
- **Preserve** migrations.json if migrations fail for debugging
- **Commit** each module separately for easy rollback if needed
- **Monitor** GitHub issues for packages with restrictions

## Recent Update History

From last successful update session (2026-03-22):

- @nx/\* packages: 22.5.0 → 22.6.1 (migrations ran, no code changes)
- @angular/\* packages: 21.1.3 → 21.2.5 (no migrations)
- @angular/cdk, @angular/cli, @angular/material, @angular/build, @angular/pwa: 21.1.3 → 21.2.3
- @angular-eslint/_: 21.2.0 → 21.3.1 (updated via nx migrate @nx/_)
- @schematics/angular: 21.1.3 → 21.2.3
- @storybook/\*, storybook, eslint-plugin-storybook: 10.2.8 → 10.3.1
- @syncfusion/ej2-\* (21 packages): 32.2.3 → 33.1.44
- es-toolkit: 1.44.0 → 1.45.1
- eslint, @eslint/js: 9.39.2 → 9.39.4 (staying on 9.x; 10.x is major jump)
- typescript-eslint, @typescript-eslint/\*: 8.55.0 → 8.57.1
- vitest, @vitest/ui: 4.0.18 → 4.1.0
- stylelint: 17.0.0 → 17.5.0
- @types/node: 25.2.3 → 25.5.0
- @capacitor/core: 8.0.2 → 8.2.0; capacitor plugins: 8.0.0 → 8.0.x
- @capgo/capacitor-social-login: 8.3.0 → 8.3.9
- @revenuecat/purchases-\*: 12.1.1 → 12.3.0; purchases-js: 1.25.0 → 1.29.0
- @algolia/client-search: 5.48.0 → 5.49.2
- firebase: 12.9.0 → 12.11.0; firebase-admin: 13.6.1 → 13.7.0
- zone.js: 0.16.0 → 0.16.1
- tailwindcss, @tailwindcss/postcss: 4.1.18 → 4.2.2
- jest, jest-preset-angular, jest-environment-jsdom: 30.2.0 → 30.3.0
- pdfjs-dist: 5.4.624 → 5.5.207; marked: 17.0.1 → 17.0.5
- @ionic/angular: 8.7.17 → 8.8.1; @swc/core: 1.15.11 → 1.15.18
- eslint.config.js: fixed jsonc-eslint-parser v3 import + added flat/angular registration
- Backend ec/functions (yarn): firebase 12.5→12.11, openai 6.7→6.32, @google-cloud/speech, pdfjs-dist, axios, es-toolkit, typescript-eslint
- Backend re/functions (yarn): firebase 12.7→12.11, openai 6.16→6.32, @aws-sdk/client-s3, @google-cloud/firestore, pdfjs-dist, eslint-plugin-perfectionist
- Backend re root (npm): firebase-admin 13.6→13.7, firebase-functions, firebase-tools, fs-extra
- Skipped: codemirror (5.x), eslint/vite major jumps (10.x, 8.x)
