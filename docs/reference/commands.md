# Commands Reference

Repo-local command reference. Skills read this file to resolve serve commands, ports and verification targets
(`/jira` Phase 7 test plans, `/epic-pipeline` Step 3a dev-server lookup).

> This file is **ngx-owned** — it is not part of the curated `docs/` mirror from gigasoftware, so edit it here.

## Dev servers

| App | Launch command | Port | Log file (convention) |
| --- | --- | --- | --- |
| Storybook (`storybook-app`) | `npm run storybook` | `4400` | `/tmp/ngx-storybook.log` |
| Ledger demo (`ledger-app`) | `npm run s.app.ledger` | `4203` | `/tmp/ledger-dev-server.log` |

When a session will drive the app in a browser, launch with stdout redirected to the log file
(`<launch-command> > <log-file> 2>&1 &`) and arm a compile-error monitor on it — a TypeScript error in a
freshly-written file otherwise masquerades as a runtime/data bug:

```
tail -f <log-file> | grep -E --line-buffered "ERROR|TS[0-9]+|✘|Application bundle generation complete"
```

Health-check before browser work: `curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:<port>` → `200`.

## Build

- **Storybook (static)**: `npm run build-storybook` — also the cheapest full-surface check for design-library / charts work
- **Ledger app (prod)**: `npm run b.app.ledger`
- **Any project**: `npx nx run <project>:build`

## Lint & test

There are **no `npm` lint/test scripts** — go through Nx directly:

- Single project: `npx nx run <project>:lint` · `npx nx run <project>:test`
- Everything: `npx nx run-many -t lint test`
- Affected only: `npx nx affected -t lint test`
- List projects: `npx nx show projects` · inspect targets: `npx nx show project <project> --json | jq '.targets | keys'`

**Nx invocation form**: `npx nx run [project]:[target]` — never `nx [target] [project]`.

## Projects

- **Apps**: `storybook-app`, `ledger-app`
- **Shared libs**: `shared-ui-design-library` (`@nge/ui-design-library`, `dlc-` prefix), `themes` (`@nge/themes`),
  `shared-charts`, `shared-calendar`, `date`, `shared-rxjs`, `shared-storybook`
- **Ledger domain libs**: `ledger-ui`, `ledger-store`, `ledger-models`, `ledger-utils`, `ledger-mocks`,
  `ledger-design-library`, `ledger-themes`

## Utilities

- **Dependency-cycle checks**: `npm run madge:check` (quick) · `npm run madge:analyze` · `npm run madge:source`
- **Sync OSS reference clones**: `npm run oss.sync` — refreshes the version-pinned Angular/CDK/NgRx/RxJS/d3 source
  clones used for latest-pattern reference
- **Clear Nx cache**: `npx nx reset`

## Deploying

Push to `main` auto-deploys GitHub Pages (demo + Storybook). See README § Deploying.

## Jira / tickets

Jira project **NGE** ("Ngx Exp") tracks this repo. Jira holds **status only** — ticket content lives in the sibling
plans repo as `~/Dev/gigasoftware-plans/nge/<KEY>.md`:

- Read content: `path=$(python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py ensure <KEY>)` then read `$path`
- Board nav (live status): `python3 ~/Dev/gigasoftware-plans/scripts/jira_to_md.py board --jql '<jql>'`
- Status transitions / comments: Atlassian MCP (`getTransitionsForJiraIssue`, `transitionJiraIssue`, `addCommentToJiraIssue`)

Full guide: `~/Dev/gigasoftware-plans/AGENTS.md`.
