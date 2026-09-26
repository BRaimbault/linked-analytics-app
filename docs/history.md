# History

- **Status**: a record. Add an entry when a milestone lands; don't rewrite old entries, even when things have changed since. Each entry describes the repo as it was on its date.
- **Related**: [CLAUDE.md](../CLAUDE.md) (the plan and the current rules), [README](../README.md) (the current setup).

How the repo got where it is: a timeline from the git history, then the reports written at each milestone.

## 1. Timeline

| Date              | Milestone                                                                                                    | Commits and PRs                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| 24 September 2026 | Scaffold with `@dhis2/create-app`                                                                            | `548d4b7`                               |
| 25 September 2026 | Tooling ported from event-visualizer-app ([§2](#2-tooling-port-25-september-2026))                           | #1 (`94b3f76`)                          |
| 25 September 2026 | Dependabot updates: jsdom, `@dhis2/config-prettier`, `@dhis2/config-eslint`                                  | #2, #5, #3                              |
| 25 September 2026 | Unit test coverage, with a report on each PR                                                                 | #6 (`4608bf1`)                          |
| 25 September 2026 | 100% coverage required, tests tightened, git hooks run with the project's Node                               | #8 (`621f9c6`)                          |
| 25 September 2026 | Workspace grid with placeholder views (dockview)                                                             | `5927ebd`, branch `feat/workspace-grid` |
| 25 September 2026 | Layout proportions, insert lines between views and at the edges, no-op drops hidden, Cypress component tests | `ef0201a`                               |
| 25 September 2026 | Selector views next to maps and visualizations                                                               | `6d4d8b1`                               |
| September 2026    | In progress on `feat/workspace-grid`, not yet committed: see [§3](#3-in-progress-on-featworkspace-grid)      | —                                       |

## 2. Tooling port (25 September 2026)

The report written when the scaffold's tooling was replaced with event-visualizer-app's (PR #1), kept as written; its section numbers are its own. What changed afterwards is under [Since then](#since-then).

This change replaces the `@dhis2/create-app` scaffold with the tooling and conventions of [dhis2/event-visualizer-app](https://github.com/dhis2/event-visualizer-app) (EV, compared at `6dc1d3b`, 22 Sep 2026). It contains no product features yet: the app only greets the signed-in user. The plugin grid comes next (see the Plan in `CLAUDE.md`).

Three review passes ran on top of the port. Several of the bugs they found are in EV too; they are listed at the end as candidates to report upstream.

**Checked:** `pnpm lint` (TypeScript, ESLint, Stylelint, ls-lint, Prettier), `pnpm test` (23 tests) and `pnpm build` all pass on Node 24. The app runs against `https://dev.im.dhis2.org/analytics-dev`.

### 1. Changes from the scaffold

#### Removed

| Scaffold file                                         | Why                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/App.tsx`, `src/App.module.css`                   | Demo page. Replaced by `src/app.ts` → `src/components/app/app.tsx`          |
| `src/components/DataElementsList.tsx` + `.module.css` | Demo component                                                              |
| `src/App.test.tsx`                                    | Jest smoke test. Replaced by Vitest specs                                   |
| `types/global.d.ts`, `types/modules.d.ts`             | Moved to the root as `global.d.ts` and `module.d.ts` (EV layout)            |
| `viteConfigExtensions.mts`                            | Renamed `vite-extensions.config.mts`, aliases moved to `import-aliases.mts` |

#### Replaced or rewritten

| File                  | Scaffold                                  | Now                                                                                                                    |
| --------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `package.json`        | Jest, `lint` = eslint + prettier          | Vitest, `lint` = `scripts/lint.sh`, `format`, `generate-types`, `postinstall`, `lint-staged`, `engines.node >=22.22.2` |
| `pnpm-workspace.yaml` | pnpm 10 (`onlyBuiltDependencies`)         | pnpm 11 (`allowBuilds`), `engineStrict`, `minimumReleaseAge`                                                           |
| `tsconfig.json`       | Non-strict, one `@/*` alias, `jsx: react` | `strict`, per-folder aliases, `jsx: react-jsx`, `moduleResolution: bundler`, CSS-modules plugin                        |
| `eslint.config.mjs`   | DHIS2 base config only                    | DHIS2 React config plus EV's rules (see §2)                                                                            |
| `d2.config.js`        | No name, title or description             | `name`, `title`, `description`, `direction: 'auto'`, entry `src/app.ts`                                                |
| `.gitignore`          | Scaffold defaults                         | Adds `dhis2.env.json`, `build`, `opensrc`, `.claude/settings.local.json`, `.vscode`                                    |
| `README.md`           | yarn-based scaffold text                  | pnpm scripts, Node requirement, dev server, contributing                                                               |
| `CLAUDE.md`           | Project notes                             | Project notes merged with EV's agent guidelines                                                                        |

#### Version changes

| Package / tool           | Scaffold                 | Now                                |
| ------------------------ | ------------------------ | ---------------------------------- |
| Node                     | 20                       | 24 (`.nvmrc`)                      |
| pnpm                     | 10.13.1                  | 11.5.2                             |
| `@dhis2/cli-app-scripts` | 12.10.3                  | ^12.11.5                           |
| `@dhis2/app-runtime`     | ^3.15.1                  | ^3.17.4                            |
| `@dhis2/ui`              | ^10.11.0                 | ^10.17.0                           |
| `@types/react(-dom)`     | ^19 (wrong for React 18) | ^18                                |
| TypeScript               | ^5.9                     | ^6                                 |
| Test runner              | Jest                     | Vitest 4 + Testing Library + jsdom |

**Added dependencies:** `@reduxjs/toolkit`, `react-redux`, `loglevel`. `pnpm dedupe` was needed so the app shell and the app share one `@dhis2/app-runtime` (3.17.4). With two copies the app failed with "DHIS2 data context must be initialized".

**Added license:** `LICENSE` (BSD-3-Clause, "2026, University of Oslo", as in EV). Confirm the copyright holder.

### 2. Taken from EV

Copied as-is or with small edits:

- **Data layer:** RTK Query on top of the DHIS2 data engine (`src/api/api.ts`, `custom-base-query.ts`, `parse-engine-error.ts`). You use it through `useRtkQuery`, `useRtkLazyQuery` and `useRtkMutation` from `@hooks`, with typed `useAppDispatch` and `useAppSelector`.
- **ESLint rules:**
    - no default exports, `import type`, no `console`
    - no `../` imports; use path aliases
    - `useDataQuery`, `useDataEngine` and the untyped react-redux hooks are banned
    - generated types are imported only through `@types`
    - specs use Testing Library rules and import `describe`/`it`/`expect` from `vitest`
- **Other linters:** kebab-case file names (ls-lint), logical CSS properties (Stylelint), `@dhis2/config-prettier`, commitlint (conventional commits).
- **Git hooks** in `.hooks/`, wired up by `postinstall`:
    - `commit-msg`: commitlint
    - `pre-commit`: i18n extract, TypeScript, lint-staged
    - `pre-push`: unit tests
- **Scripts:** `lint.sh`, `format.sh`, `check-typescript.sh`, `generate-types.sh` (OpenAPI → TypeScript), `claude-format-hook.sh`.
- **Claude Code setup:** `.claude/settings.json` (format hook, plugins, grep MCP), the `dhis2-api-lookup` skill, `.mcp.json`, and the structure of `CLAUDE.md`.
- **CI:** `verify-pr.yml` (lint, unit tests, build) and `dhis2-verify-commits.yml` (PR title and commits), plus `dependabot.yml` and the PR template.
- **Editor settings:** `.editorconfig`.

### 3. Where we differ from EV

#### Left out, for now

| EV part                                                                                                                 | Reason                                              |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Cypress (E2E + component tests), `cypress.env.json`                                                                     | No UI worth testing yet; add once the grid exists   |
| SonarQube, Netlify, d2-ci publish, AWX deploy, BOM, check-tasklist, Dependabot auto-merge workflows                     | Release/deploy infrastructure not needed yet        |
| Dashboard plugin entry point and dev `plugin-host` page                                                                 | This app hosts plugins; it is not one               |
| `@dhis2/analytics` and its hand-written types, metadata store, app-cached-data provider, dnd-kit and other feature deps | EV-specific features                                |
| Most of EV's CLAUDE.md (program dimension IDs, legends, …)                                                              | EV domain knowledge                                 |
| `testing-with-fake-timers` skill                                                                                        | It describes EV test helpers that do not exist here |
| `@constants`, `@assets`, `@test-utils` aliases                                                                          | No such folders yet                                 |

#### Adapted

| Area              | EV                                                                                                      | Here                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Dev server config | `cypress.env.json`                                                                                      | `dhis2.env.json` (gitignored, copied from `dhis2.env.template.json`), read by `generate-types.sh` and the API-lookup skill |
| Server            | `test.e2e.dhis2.org/anly-dev`                                                                           | `dev.im.dhis2.org/analytics-dev` (2.44)                                                                                    |
| Node              | `.nvmrc` = `lts/*`, no `engines`                                                                        | `.nvmrc` = `24`, `engines.node >=22.22.2`, `engineStrict`; CI uses `node-version-file: .nvmrc`                             |
| Store             | Many slices, engine + metadata store + cached data as thunk extras                                      | Only the RTK Query API; the engine is the only extra                                                                       |
| Logger            | Root `loglevel` logger, level persisted, env-var override                                               | Named `linked-analytics` logger, level not persisted, override only via `localStorage.LINKED_ANALYTICS_LOG_LEVEL`          |
| Aliases           | `@types`, `@hooks`, `@api`, `@assets`, `@components`, `@constants`, `@modules`, `@store`, `@test-utils` | `@types`, `@hooks`, `@api`, `@components`, `@locales`, `@modules`, `@store`                                                |
| Locales import    | `'../../locales/index.js'` with an eslint-disable                                                       | `@locales/index.js`                                                                                                        |
| `postinstall`     | Hooks path, types, env file                                                                             | Also runs `i18n generate`, so a fresh clone can test; type generation is non-fatal; skips git setup outside a work tree    |
| CI                | Separate "Generate translations" step, E2E matrix, Sonar                                                | Install → lint → unit tests → build                                                                                        |
| `pre-push`        | Vitest + Cypress component tests                                                                        | Vitest only                                                                                                                |
| ls-lint           | `{cypress,scripts,src,types}`                                                                           | `{scripts,src}`, plus root `.d.ts`/`.mts` names                                                                            |
| PR template       | Cypress/Jest and d2-ci checklist items                                                                  | Vitest, browser check, docs                                                                                                |
| `.prettierignore` | Repeats `.gitignore`                                                                                    | Lists only tracked files that must not be reformatted (Prettier 3 reads `.gitignore`)                                      |
| Welcome page      | —                                                                                                       | "Welcome, {name}!" with a subtitle, no HTML-escaping of the name                                                           |

### 4. Bugs fixed that also exist in EV

EV has each of these as of `6dc1d3b`. They could go into one upstream issue or PR.

| #   | File                                                                   | Bug                                                                                                                                                                                           | Fix here                                                                                                              |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | `.github/workflows/dhis2-verify-commits.yml`                           | **Shell injection:** the PR title is pasted into `run:` (`echo "${{ github.event.pull_request.title }}"`), so a crafted title runs code in CI                                                 | Pass it through `env:` and `printf '%s\n' "$PR_TITLE"`                                                                |
| 2   | `src/hooks/use-rtk-lazy-query.ts`                                      | The trigger is typed `UseLazyQueryTrigger<TriggerArg>`, so `unwrap()` claims to return the query object, not the data                                                                         | `UseLazyQueryTrigger<T>`                                                                                              |
| 3   | `src/api/custom-base-query.ts`                                         | RTK's `api.signal` is never passed to the engine, so aborted or superseded requests keep running                                                                                              | Pass `{ signal: api.signal }` to `engine.query` / `engine.mutate`                                                     |
| 4   | `src/api/custom-base-query.ts`                                         | Runtime/unknown errors are logged twice (here and in `parseEngineError`)                                                                                                                      | Log only in `parseEngineError`                                                                                        |
| 5   | `src/modules/logger.ts`                                                | `log.setLevel()` on the root logger persists the level to `localStorage.loglevel` for the whole DHIS2 origin, shared by every app                                                             | Named logger, `setLevel(level, false)`                                                                                |
| 6   | `src/modules/debug-mode.ts`                                            | The env-var log-level override can never work in the browser (`process` is undefined, and the var is not `DHIS2_`-prefixed)                                                                   | Removed; localStorage override only                                                                                   |
| 7   | `eslint.config.mjs`                                                    | The `__tests__` override redefines `no-restricted-imports`, and flat config replaces the whole rule, so specs lose the `useDataQuery`, react-redux and generated-types restrictions           | Shared `patterns` / `paths` constants reused in the override                                                          |
| 8   | `eslint.config.mjs`                                                    | The `consistent-type-imports` block targets `src/**/*.{ts,mts,cts,tsx}`, but the base config only loads `@typescript-eslint` for `.ts/.tsx`, so ESLint crashes on any `.mts`/`.cts` in `src/` | Target `src/**/*.{ts,tsx}`                                                                                            |
| 9   | `scripts/generate-types.sh`                                            | `curl` without `--fail` saves error pages as the spec; the existing types are deleted before generation succeeds; credentials hardcoded                                                       | `--fail --location`; build in a temp dir and move into place at the end; guard on empty output; read `dhis2.env.json` |
| 10  | `scripts/generate-types.sh`                                            | The end-of-schemas regex (`/^[ ]{6}\}/`) never matches (the block closes with 4 spaces), so the scan runs through the rest of the file and only works thanks to hard-coded exclusions         | Read only the `components.schemas` block and stop at its closing brace (same 948 aliases today)                       |
| 11  | `scripts/generate-types.sh`                                            | The final Prettier step does nothing: the folder is in `.prettierignore`                                                                                                                      | Removed                                                                                                               |
| 12  | `scripts/postinstall.sh`                                               | `git config core.hooksPath` fails outside a git checkout (source zip, Docker), which fails `pnpm install`                                                                                     | Only run inside a git work tree                                                                                       |
| 13  | `.hooks/pre-commit`                                                    | `#!/bin/sh` with the bash-only `$'\n'` (breaks under dash); substring `grep "$file"` matches other files                                                                                      | bash shebang (the filter itself was then removed, see 14)                                                             |
| 14  | `.hooks/pre-commit`                                                    | TypeScript errors are only reported for staged `ACM` files, so renames and errors a change causes in other files get through                                                                  | Fail on any `tsc` error, like CI                                                                                      |
| 15  | `scripts/claude-format-hook.sh`                                        | Skips `.mts`/`.mjs`/`.js`/`.cjs`, never stylelints `.tsx`, and runs Prettier twice per edit                                                                                                   | Same file groups as `lint-staged`; a single `prettier --write --list-different`                                       |
| 16  | `.github/pull_request_template.md`, `tsconfig.json`, `.prettierignore` | Stale or rule-breaking comments (stacked `//`, history/future-plan notes, a `.prettierignore` that repeats `.gitignore`)                                                                      | Cleaned up                                                                                                            |

### 5. Issues introduced by the port (fixed)

These were mistakes in the port itself, not EV bugs:

- **No `.stylelintignore`.** EV has one; I didn't copy it, so `pnpm lint` and `pnpm format` ran Stylelint on `build/`.
- **Two `@dhis2/app-runtime` copies** from the reused scaffold lockfile. Fixed with `pnpm dedupe`.
- **Escaped names in the greeting.** `i18n.t` HTML-escaped the name, so "O'Brien" showed as `O&#39;Brien`. Now `interpolation: { escapeValue: false }`, and a spec covers it.
- **No spec for the new app page or the log-level logic** after the scaffold's test was deleted. Both are added.
- **Fresh clones couldn't run tests,** because nothing on install generated `src/locales`. `postinstall` now does.

### 6. Known gotchas

- **Node 20 is refused** by pnpm (`ERR_PNPM_UNSUPPORTED_ENGINE`). Run `nvm use`, or `nvm alias default 24`.
- **Don't run `pnpm build` while `pnpm start` is running:** both regenerate `.d2/shell`, and the dev server then serves broken files.
- **`pnpm deploy` is a built-in pnpm command.** Use `pnpm run deploy`.

### Since then

Added after the report, without changing it:

- **Cypress was added** with the grid (`ef0201a`): component tests only, smoke tags through `@cypress/grep`, run in CI and not on pre-push.
- **Coverage** is reported on each PR (#6) and required at 100% (#8).
- **The git hooks run with the project's Node** (#8), through `scripts/use-project-node.sh`.
- **The welcome page** was replaced by the workspace, and `dockview-react` joined the dependencies.

## 3. In progress on `feat/workspace-grid`

Work done after `6d4d8b1`, not yet committed:

- **Code restructure**: the workspace controller split into one file per topic (`src/components/workspace/controller/`), components into `tabs/`, `panels/` and `insert-zones/`, and the pure layout logic into separate modules.
- **Grid behavior**: tools tabs reorder with an insertion line; a view dropped on another view's header lands on the line above it; clicked selectors go to a bar across the top.
- **Selectors have no maximum size**; the cap code was removed.
- **Accessibility**: no clipped close buttons, one Tab stop per button, focus rings on tabs, and a collapsed tools strip made `inert`.
- **Design docs** in `docs/`: [interactions](interactions.md), [view settings](view-settings.md), [plugins](plugins.md) (with a live spike of DV and Maps), [demo mode](demo-mode.md), [map layers](map-layers.md), [selector controls](selector-controls.md), [workspace grid](workspace-grid.md), and this history.
