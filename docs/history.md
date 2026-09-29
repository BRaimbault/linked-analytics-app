# History

- **Status**: a record. Add an entry when a milestone lands; don't rewrite old entries, even when things have changed since. Each entry describes the repo as it was on its date.
- **Related**: [CLAUDE.md](../CLAUDE.md) (the plan and the current rules), [README](../README.md) (the current setup).

How the repo got where it is: a timeline from the git history, then the reports written at each milestone.

## 1. Timeline

| Date              | Milestone                                                                                                                                    | Commits and PRs                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 24 September 2026 | Scaffold with `@dhis2/create-app`                                                                                                            | `548d4b7`                               |
| 25 September 2026 | Tooling ported from event-visualizer-app ([§2](#2-tooling-port-25-september-2026))                                                           | #1 (`94b3f76`)                          |
| 25 September 2026 | Dependabot updates: jsdom, `@dhis2/config-prettier`, `@dhis2/config-eslint`                                                                  | #2, #5, #3                              |
| 25 September 2026 | Unit test coverage, with a report on each PR                                                                                                 | #6 (`4608bf1`)                          |
| 25 September 2026 | 100% coverage required, tests tightened, git hooks run with the project's Node                                                               | #8 (`621f9c6`)                          |
| 25 September 2026 | Workspace grid with placeholder views (dockview)                                                                                             | `5927ebd`, branch `feat/workspace-grid` |
| 25 September 2026 | Layout proportions, insert lines between views and at the edges, no-op drops hidden, Cypress component tests                                 | `ef0201a`                               |
| 25 September 2026 | Selector views next to maps and visualizations                                                                                               | `6d4d8b1`                               |
| 26 September 2026 | Workspace restructure, grid refinements, accessibility fixes, design docs ([§3](#3-workspace-restructure-and-design-docs-26-september-2026)) | `08bccd7`                               |
| 28 September 2026 | Fixes from an external review, text views, a Workspace tab, balanced clicked views ([§4](#4-in-progress-fixes-from-an-external-review))      | `071ac10`, `06cc796`                    |
| 28 September 2026 | Fixed tools first, view icons on tabs, tile drags that lose their data                                                                       | `4354b0b`                               |
| 28 September 2026 | The palette in Firefox, Cypress in Chrome and Firefox on CI                                                                                  | `32e7574`                               |
| 28 September 2026 | A code structure doc, the import direction enforced                                                                                          | `2bf4153`                               |
| 28 September 2026 | Fixes from a second review of PR #7 ([§4](#4-in-progress-fixes-from-an-external-review), items 1 to 15)                                      | `481b877`                               |
| 28 September 2026 | The workspace grid merged into `main` (plan step 2 done)                                                                                     | #7 (`1ae364e`)                          |
| 28 September 2026 | Demo mode started (plan step 3)                                                                                                              | branch `feat/demo-mode`                 |

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

## 3. Workspace restructure and design docs (26 September 2026)

Commit `08bccd7`, on `feat/workspace-grid`:

- **Code restructure**: the workspace controller split into one file per topic (`src/components/workspace/controller/`), components into `tabs/`, `panels/` and `insert-zones/`, and the pure layout logic into separate modules.
- **Grid behavior**: tools tabs reorder with an insertion line; a view dropped on another view's header lands on the line above it; clicked selectors go to a bar across the top.
- **Selectors have no maximum size**; the cap code was removed.
- **Accessibility**: no clipped close buttons, one Tab stop per button, focus rings on tabs, and a collapsed tools strip made `inert`.
- **Design docs** in `docs/`: [interactions](interactions.md), [view settings](view-settings.md), [plugins](plugins.md) (with a live spike of DV and Maps), [demo mode](demo-mode.md), [map layers](map-layers.md), [selector controls](selector-controls.md), [workspace grid](workspace-grid.md), and this history.

## 4. In progress: fixes from an external review

After `08bccd7`, 4 independent reviews ran: correctness, tests, code quality, and the feature in a real browser. The problems they confirmed are fixed, each with a test that fails without the fix (and a Cypress scenario for the grid bugs):

- a block of views (a column made only of rows) beside a new selector column is sized, instead of keeping dockview's even split with views below their minimum;
- swapping two selectors keeps the bar's height (sizing is paused during a swap);
- a clicked map stays out of the selector bar: room is also checked across a split or new line;
- adding a view while another is maximized leaves maximize first;
- closing the selected view selects the nearest view, not the first one;
- the ⋯ menus work from the keyboard, and focus follows a view swapped from its menu;
- closing a maximized view is announced as closed, not restored;
- the view limit message is a whole sentence per selector type, so it translates;
- test gaps: the fake dockview copies more of dockview (hidden sizes while maximized, a leaving view's cell, edge groups discarding their panels), so the maximize guard and the tools strip move are now tested; boundary tests for rounding, minimums and the 1px tolerance; the fallback to the largest cell is tested; two conditions no test could reach were removed; Cypress layout checks retry; tests use the path aliases.
- tidy-ups: the placement of a new view carries how its sizes follow (split or new line); `layout-targets.ts`, `views.ts`, `drop-models.ts` and `panels/swap-spacer.tsx` split out of larger files; the drop handlers read the dragged view once; types and helpers used in one file are no longer exported, and an unused selector is gone.
- smaller issues from the browser review:
    - closing a view that isn't selected keeps the palette open;
    - opening a settings tab selects its view, so the settings shown and the selected view agree;
    - a narrow window scrolls to views instead of cutting them off (and only then: the workspace clips the hidden overlays dockview leaves below the grid);
    - a selector's placeholder fits in one row at its preferred height.
    - where a clicked selector goes when the top has no room for a row is documented and tested.
- nits: the header height is one constant (`VIEW_HEADER_HEIGHT` in `grid-tree.ts`) that the selector sizes build on; the tab reuses the panel checks; the palette's group headings and the empty grid's title are `h2`s, the first level on the page.
- a selector type is also capped at 4 (`MAX_SELECTORS_PER_TYPE`), so 4 maps and visualizations no longer allow 5 of a type; the limit message says which cap is reached.
- clicking a tile keeps the views balanced: it halves the largest cell across its line (`balanced-split.ts`), so four clicked views make an even 2×2 grid in any window, instead of going next to the selected view.
- tools tabs are all one length, with shorter default names (settings tabs take their view's title; selectors are "Period 1", "Org unit 1", "Data 1"); a name cut short shows in full in a DHIS2 tooltip that opens towards the grid, whichever edge the strip is at.
- a "Workspace" tab comes first in the tools strip, for settings of the whole workspace; it starts with "Even out view sizes". It and "Add views" carry an icon.
- text views: a third view kind for titles and notes, with no cap and no settings tab, written in place with the DHIS2 rich-text editor (`@dhis2/analytics` added); clicked, they go to a text row at the very top, above the selector bar.
- while a view is maximized, no view can be added: the palette's tiles are disabled, with the reason (this replaces leaving maximize to add).
- a view is selected only while its settings tab is shown; closing a view goes back to "Add views" with none selected (this replaces selecting the nearest view, from the first round of fixes). A double click on a view's header opens its settings.
- a workspace setting shows view headers only on hover, floating over the view, with the selected view's blue top line kept over its body.
- planned for persistence: a layout lock and a presentation mode ([workspace-grid.md §11](workspace-grid.md#11-later-lock-and-presentation)).
- "Workspace" and "Add views" stay first in the tools strip; settings tabs still reorder, in the tab row only.
- a settings tab dragged onto the grid moves its view; a divider follows "Add views"; a drop point between two tools tabs shows as one line.
- palette tiles could not be dropped anywhere in a Windows Chrome that passed the drag on without its custom formats; the page now keeps the dragged tile itself. The Cypress drag no longer drops where no `dragover` was taken, and drags that lose their data are tested.
- Firefox: palette tiles wrapped and overflowed the tools strip, and a tile's drag started only on its icon or name; both fixed. The Cypress scenarios now pass in Firefox too, and CI runs them in both browsers, each in its own job beside lint, unit tests and build; and the mount loads Roboto and `CssReset` as the app shell does (before, text was measured in each browser's fallback font).
- a code structure doc ([code-structure.md](code-structure.md)): the layered layout stays, each new domain takes the same name in each layer, and ESLint now enforces the import direction between layers.
- settings tabs and view headers carry their view type's icon; in a vertical tools strip, tab names were 2px off centre (dockview's right margin on them runs across the tab there), now fixed.
- Left as known limits: Tab reaches a view's body only after every header (bodies live in overlays).

Still to do: the 4 items left from the external review, and what a second review of PR #7 found (28 September 2026: 4 reviewers on logic, UI, tests, and docs and tooling, each finding checked against the code). In working order; ticked when done.

Bugs users hit:

- [x] 1. **Dragging "Workspace" or "Add views" leaves the page in drag mode.** dockview stores the tab's drag data and turns off iframe pointer events before `onWillDragPanel` runs; `keepFixedToolsInPlace` then cancelled the drag, and a cancelled drag gets no `dragend` to undo them. Tiles were refused on views' edges and insert strips after it, and view bodies ignored the pointer. Fixed: `cancelFixedToolDrag`, a capture listener on the document, cancels the drag before dockview's listener; `useCurrentDrag` ignores cancelled drags. Cypress: a tile dropped on a view's edge after a cancelled drag of "Workspace" (the empty grid can't show it: dockview's root target never reads the stuck data).
- [x] 2. **Escape in the "@" user list discarded the note being written.** The mention list doesn't handle Escape, so the text view's handler dropped the draft. Fixed: Escape discards only while none of the editor's pop-ups (a DHIS2 layer) is open. Cypress types into the real "@" list; the unit test stands in a layer, as jsdom can't lay out the list.
- [x] 3. **A swap ignored minimum sizes.** Swapping a map with a 120px selector, by a drop or from the ⋯ menu, put the map in a cell below its 160px minimum. Fixed: `hasRoomToSwap` (each view fits the other's cell) refuses the drop's preview and filters the menu's targets. Cypress: no preview and no menu item for a map onto the selector bar.
- [x] 4. **Headers on hover, on a touch screen.** The header showed but floated over the view, covering its top 35px. Fixed: the floating rules apply only under `(hover: hover)`; without hover, headers take their room as with "always", and the selected frame is hidden. Cypress: `headers.cy.tsx` runs the hover cases in Chrome and the touch case in Firefox (below, item 8).

Tests that can't be trusted:

- [x] 5. **"Keeps the Add views tab the same size" couldn't fail**: it aliased an `invoke()` query, which Cypress re-runs when read, and measured the name rather than the tab. It keeps the width in a variable now, and measures the tab.
- [x] 6. **Checks that read once**: `viewTitles()` and `toolTabs()` became `expectViewTitles`, `expectViewCount` and `expectToolTabs`, which retry; `inViewHeader` is a query chain (and replaces two inline copies); the `.then` reads in `sizing.cy.tsx`, `selectors.cy.tsx`, the tooltip placement and the editor's buttons retry too.
- [x] 7. **Cypress retries** (external review). After a failure screenshot, a retry gets almost no animation frames, so view bodies aren't positioned and a retry can pass by mistake. Done: `retries: 0`; `dragTo` and `dragDivider` wait for animation frames instead of fixed sleeps (the next render, however fast the machine), and the checks themselves retry (items 5 and 6). Without retries, one flaky scenario showed in Firefox: a drag's insert strips can take more than two frames to draw after the drag starts, so `dragTo` now waits for the workspace to show the drag (`data-dragging`), then two frames more.
- [x] 8. **Missing checks**: user sizes surviving a tools strip move. The fake dockview's edge groups emitted no layout events, while dockview's do; they do now, and a unit test and a Cypress scenario check 70/30 through a move to the left and back (the app already kept them). Hover headers on CI: Headless Chrome reported no hover, so those checks couldn't fail there, and its DevTools media emulation doesn't take in Cypress; Chrome is now launched as a desktop with a mouse (`--blink-settings` in `cypress.config.ts`), headless Firefox keeps no hover, and each header case runs where the media matches.

Accessibility:

- [x] 9. **A disabled palette tile didn't tell a screen reader why** (external review). The reason was in a tooltip on a wrapper around the native `disabled` button. Fixed: `aria-disabled`, the click and the drag guarded, the reason as the tile's description (`aria-describedby`), and the tooltip's handlers on the tile itself. Unit tests: focus, description, no add, no drag; Cypress clicks a disabled tile.
- [x] 10. **A keyboard path to move a view to a new row or column** (external review). Done: the view's ⋯ menu offers "Move to a new row at the top / bottom" and "Move to a new column on the left / right", the moves of the outer insert strips, where a drop would be allowed (`controller/move-to-edge.ts`). Strips between two views stay mouse-only (a known limit in [workspace-grid.md §8](workspace-grid.md#8-accessibility)). On the way: `isNoOpMove` now sees the outer edge through a root that holds a single line, as dockview keeps after a view is added below the first; before, dragging the top view of such a stack onto the top edge showed a preview for a move that changes nothing.
- [x] 11. **Focus**: it was lost after saving or cancelling a note, and after "Move to…" in the tools menu; in hover mode, a view's header faded out while its ⋯ menu was open (the menu's backdrop clears the hovered view, and the menu's focus is outside the header). Fixed: the note gives the focus back to its edit button (when it was in the editor); after a move, the focus goes to the new strip's open tab (`focusToolsStrip`); an open menu marks its button (`data-menu-open`), which keeps its header shown. Unit tests for the focus, Cypress for the header.

Smaller:

- [x] 12. **One or two layout changes?** (external review) One. In dockview 8.3.1, `dockToLayoutEdge` first adds the new cell at the edge (`orthogonalize`, `createGroupAtLocation`), which fires no layout event, then moves the view in within one `mutation("move")`. So the grid does reshape before `onWillMutateLayout` (why the layout is read in `onWillDrop`), but sizes are fixed once. The comment in `controller/grid-layout.ts`, [workspace-grid.md §4](workspace-grid.md#4-sizes-keep-the-users-proportions) and the unit test (which modelled two announced changes) now match the source.
- [x] 13. **Selection and drag state**: after a swap from a settings tab drag or the keyboard, the settings shown and the selected view disagreed (the settings come forward without a dockview event); `data-dragging` turned on for any native drag, such as moving text inside a note, which then couldn't drop in the note. Fixed: `swapViews` returns the view whose settings it showed, and the drop handler and the menu select it; `useCurrentDrag` reacts only to the workspace's own drags (`isWorkspaceDrag`). Unit tests for both, including a swap from a menu opened from the keyboard.
- [x] 14. **Code conventions**: `tools.cy.tsx` (681 lines) is split by topic into `tools-tabs`, `settings-tabs`, `tools-strip`, `palette` and `workspace-tab`; `drops.spec.ts` (569) into `drop-overlay`, `tools-drops` and `drops` (the jsdom `elementFromPoint` stub moved to the controller fixtures). Tests may no longer import `../`: the ESLint test override is gone, and `debug-mode.spec.ts` imports through the alias; `hooks/` joined the layer rule (not its tests, which render a provider). Left just over the ~400 lines: `grid-helpers.tsx` (442) and `fake-dockview.ts` (416).
- [x] 15. **Docs**: the timeline has a row per commit since `08bccd7`; no more "today" in `workspace-grid.md`; the terms, `interactions.md` and the Workspace tab's description name text views and the Workspace tab; the Cypress spec list is complete; `code-structure.md`'s counts are right, and its `hooks/` claim holds (item 14); the README lists `code-structure.md`, and the PR template asks for `docs/` and Cypress; the `selector-controls.md` status in the index reads as decided.

All 15 were done before the merge: the grid went into `main` with #7 (`1ae364e`), on 28 September 2026. Open, as known limits: the insert strips between two views take mouse drags only, and Tab reaches a view's body only after every header.

`.backup/` is untracked on purpose (its content is in §2 above).

## 5. In progress: demo mode (plan step 3)

Built in the order of [demo-mode.md §10](demo-mode.md#10-where-it-fits-in-the-plan), on branch `feat/demo-mode`; ticked when done.

- [x] 1. **Synthetic data** (`src/modules/demo/`): a made-up country ("Demoland"), 4 districts and 14 chiefdoms with polygons that tile each other, 3 levels and 2 groups (`org-units.ts`); the 24 months up to a fixed demo date (31 August 2026), their quarters and years, and 12 relative periods resolved against it (`periods.ts`); 4 data items, one with a legend set (`data-items.ts`); a seeded value formula whose totals add up across org units and periods, with coverage worked out from its parts (`values.ts`); 3 visualizations and 2 maps to open (`saved-items.ts`). Names are made up, so the numbers can't pass for real data. A shared type for the dimensions of a visualization or map view: `src/modules/visualization/analytical-object.ts`.
- [x] 2. **The plugin adapter**, and a fake visualization under the `proposed` profile.
    - The contract's props and click payload: `src/modules/plugins/contract.ts`, as [interactions.md §6](interactions.md#contract-same-in-both-plugins) plans them.
    - `PluginSourcesProvider` (`components/plugins/plugin-sources.tsx`) says which plugin draws each view type and which saved items can be opened; without one (the app, until plan step 4) views keep their placeholders.
    - `PluginView` (`components/plugins/plugin-view.tsx`) mounts the plugin sized to its view's body, and follows the body as it resizes.
    - The fake visualization (`components/demo/`) draws column and line charts in SVG and pivot tables in HTML, from `modules/demo/analytics.ts`, which reads a visualization's `columns`, `rows` and `filters` as DV does. Clicks send the point's ids through `onDataClick` (additive with Ctrl or Cmd), `highlight` dims the rest, and `onLoadingComplete` fires once drawn.
    - A view's saved item sits in its params (`object`), set from a "Saved item" picker in its settings tab when a source offers items (`setViewObject`).
    - Found on the way: DHIS2 UI's select (`@dhis2-ui/select` 10.17.0) debounces its window-resize handler without cancelling it on unmount, so a resize just before a picker unmounts throws `this.inputRef.current` is null. It shows only in the console (the error is in a timer); worth reporting upstream.
- [x] 3. **The fake map**: the map's first thematic layer (`modules/demo/map-layer.ts`), a feature per org unit colored from its legend set or, else, its color scale in equal intervals, with the outlines of the units they lie in and a legend (`components/demo/fake-map.tsx`). A feature click sends its `ou` (id, name, path, level UID) and the layer's `dx`; highlight dims the rest; `onLoadingComplete` fires once drawn. It keeps its own zoom and pan (wheel, drag, and +, − and "Whole map" buttons), also when its object changes, as the proposed contract asks. The wheel zooms without scrolling the page: React's wheel listeners are passive, so the map adds its own.
- [x] 4. **Channels and `applyLinks`** for `ou` and `pe`: period and org unit selectors with a short fixed list, and click-driven links.
    - `applyLinks` (`modules/interactions/apply-links.ts`) rewrites a view's object with the rules of [interactions.md §2](interactions.md#2-what-it-means-in-the-dhis2-data-model): `ou` on an axis becomes the selection plus the next level (`North;LEVEL-3`, which DHIS2 reads as North's chiefdoms), in a filter the selection; `pe` on an axis becomes the periods of the axis's type within the selection, or the one containing it (`periods.ts`, monthly, quarterly and yearly); a missing dimension goes to the filters; a custom title and subtitle are cleared; on a map, thematic layers only. Nothing incoming returns the object itself, so nothing redraws.
    - The channel rules (`modules/interactions/channels.ts`) and the `interactions` slice (`store/interactions-slice.ts`), with the defaults of [interactions.md §5.1](interactions.md#51-zero-configuration-by-default): a selector creates a channel that every map and visualization joins, both ways, unless it is in another channel of that dimension; new views join the first channel of each dimension; a first click on a dimension with no channel creates one, with no selector. A click sets the value, the same click clears it, Ctrl or Cmd adds or removes an item. A view isn't rewritten with the value it set, and highlights it instead. Closing a view takes it out; a channel with no selector and no members goes.
    - Views: `PluginPanel` passes the rewritten object, the highlight and `onDataClick` (`components/interactions/use-view-links.ts` reads them as text, so a plugin gets new props only when they change); selectors are a clearable select over the short list their source offers (the demo's: Demoland and its districts; the years and quarters from 2025), with the channel's color down the side; a clicked value outside the list is listed too. Header badges show the channel's letter on its color, with → and ←, and a tooltip with the channel, its value and the view's role.
    - Tests: the rules and the slice in Vitest, the linked flow end to end in `components/interactions/__tests__/links.spec.tsx` (only the plugins are fake), and `links.cy.tsx` for real clicks on the map and the badges in a real header.
- [x] 5. **The `?demo` switch**: the banner, lazy loading and a preset workspace.
    - `?demo` (with or without a value) loads `DemoWorkspace` through `React.lazy`: the demo's sources, the banner, and the workspace with the demo's preset. Checked in the browser: without the flag, the page downloads only the flag's check.
    - The preset (a chart, a map, a table and both selectors, with their items) is added as clicks add views, once the grid has its size. `Workspace` takes it as a prop, loads it only into an empty grid (setup runs twice under StrictMode), and the Workspace tab gets a "Demo" group with "Reset the demo", which closes every view and loads it again (`controller/preset.ts`).
    - Checked in the browser on the dev server: the preset, a district clicked on the map filtering the chart and the table, a month clicked on the chart setting the map's period and the table's quarter, both selectors showing the clicks, and the reset.
    - Tests: the flag, the preset and reset (controller), the demo workspace and the app with `?demo` in Vitest; the preset's layout in `demo.cy.tsx`.

All five items of the first demo are done. Left for plan step 3: share the demo and the contract with the DV and Maps maintainers ([interactions.md §6](interactions.md#6-upstream-prs)).

- [x] 6. **The Links section** (pulled forward from link mode, [interactions.md §7](interactions.md#7-order-of-work) item 4), so links can be configured before the real plugins: without it, every view joined every channel, and two districts couldn't be compared side by side.
    - In each map's, visualization's and selector's settings tab (`components/interactions/links-section.tsx`): per dimension, the channel (a select labelled with the dimension and prefixed "Channel": "A · North", "New channel", "None"), then "Set the value by clicking" and "Follow the value". A selector has the channel select, and its two roles shown ticked and disabled ("Set the value by picking", "Follow the value"): it always has both, and seeing them beside a view's makes the roles easier to grasp. Views and selectors use the same words, as both set a channel's value.
    - The rules (`modules/interactions/membership.ts`, used by the slice): a view keeps its roles when it moves; unticking both boxes takes it out; a view taken out of a dimension stays out (the defaults skip it); a new channel starts with the view, or the selector, alone; a selector only takes a channel without one. A map click carries no period, so maps join period channels only to follow them. Every disabled box says why in a tooltip, which the keyboard reaches too (the tooltip's own focusable wrapper, as a disabled checkbox can't take focus).
    - The badges tell one-way roles apart. The Workspace tab's reset became an icon button with its name beside it, like "Even out view sizes" (its text was squeezed into the 22px icon square).
    - Found on the way: the tools strip at the top is short, so a settings tab with a saved item and two link rows scrolls. Each dimension takes one line to limit it; the strip's height is worth a look.
    - Tests: the rules through the store (`interactions-links.spec.ts`), the form (`links-section.spec.tsx`), and a Cypress comparison: two org unit selectors, the chart moved to B, the map showing West and the chart East.
    - What a view shows for a selected org unit is its own choice, in the org unit row: "Show" the selected org unit, its sub-units (the default) or its sub-x2-units, as in the org unit picker. It applies when org units are on the view's axis (in a filter, sub-units add up to the same), stops at the deepest level, and moves with the view between channels. Before, a view always showed the sub-units, with nothing saying so.
    - A fourth saved visualization, "ANC 1st visits by district, last 12 months": a line per district over the months, so a click carries a district and a month.
    - The fake map outlines its selection, and the feature under the pointer: their edges are drawn last, over their neighbours and the district outlines, which hid them (a feature's own stroke, as the hover was, sits under the features drawn after it). The whole map, which zooming out also ends at, keeps a 16px margin. Its zoom and pan moved to `use-map-view.ts`.
    - **Known issue, from DHIS2 UI** (`@dhis2-ui/select` 10.17.0, still in 10.19.0): a select re-measures its input 50ms after a window resize, and the pending call isn't cancelled when it unmounts. With a select in every settings tab now, resizing the window and then closing a view throws "Cannot destructure property 'offsetWidth' of 'this.inputRef.current' as it is null". It comes from a timer, so it shows only in the console. It's the cause [dhis2/ui#186](https://github.com/dhis2/ui/issues/186) suspected in 2020, closed with a symptom fix. A fix is proposed upstream ("fix(select): cancel the pending resize measurement on unmount"). Until a release has it, Cypress ignores this one error (`cypress/support/component.ts`), as it hits whichever scenario resizes and then closes a view within 50ms, varying by browser and run; any other error still fails a test. Remove that handler after the upgrade.

- [x] 7. **Drilling, and a test pass on pivot tables and line charts.**
    - Drilling ([interactions.md §5.6](interactions.md#56-drilling-the-view-you-click)): a right-click on a point opens a menu at the pointer, and the view's ⋯ menu offers the same, from what the view shows. "Drill down into X" shows X's sub-units; "Drill up to P" (the parent) shows P's level, P alone at the top, and is offered whenever there is a parent; "Back to the saved item" while drilled. A drill counts as a click: the channel takes X or P. Rules in `modules/interactions/drills.ts`; the menu shares `ActionsPopover` with the ⋯ menu.
    - The contract gets the right-click ([interactions.md §6](interactions.md#contract-same-in-both-plugins)): `trigger: 'context'` and a `position` from the plugin's corner, which the adapter turns into page coordinates; the plugin opens no menu of its own. The sources get `getOrgUnitName`, for a parent a click names only in its path.
    - The fakes' highlight takes in related units (`modules/demo/highlight.ts`): a chiefdom highlights its district on a map by district, a district its chiefdoms. A drilled view drops an empty highlight, which would have highlighted everything.
    - A fourth saved item for the pass, a line per district over the months.
    - Found in the pass, and fixed:
        - a click on a point with two dimensions (a table cell, a line point) cleared the one it shared with the last click: another cell in the same row cleared the org unit, the other series in the same month cleared the month. "Clicking again" now means the same point, every dimension alike, the data item included (`modules/interactions/clicks.ts`);
        - a view that set a value went back to its saved item, losing the context it followed (a table following North and 2025 showed all chiefdoms and quarters after a click on a cell, all dimmed). It now keeps showing what it followed before its click, and clicking the same point again brings that back to every view (`before` on a channel).
    - Ctrl-click on a point with two dimensions toggled each on its own: in a table, a second cell of the same column cleared the quarter, of the same row the chiefdom. Now a view keeps the points it selected (`selectedPoints`), a Ctrl-click adds a point or takes it out, and each channel holds the items of those points: two cells of a column are two chiefdoms in one quarter. Checked on the table in twelve cases (one cell; a column; a row; across; adding and removing in any order; a plain click after). Left as a limit: two cells across (A×Q3, B×Q4) are "A or B, in Q3 or Q4" for the other views, and the table highlights the four; highlighting the two alone would need points in the contract's `highlight`.
    - After a drill, a double-click (a click, then the same point again) looked like a drill: bringing back the value from before left the channel with no sender, so the drilled view's own drill was reset as a follower's, and it showed what the channel held. Now the view that makes a change keeps its drill, whoever the channel's sender becomes.
    - A drilled view with nothing left selected passes the unit it's drilled into, not what the channel held before the drill: deselecting a chiefdom on a map drilled into North leaves every view on North, as the map.
    - Labels and headers are clickable, to pick a whole row, column or category: the fake charts' category labels and the fake table's row and column headers send their own dimension alone, with Ctrl and the right-click as for points. A plain click now replaces only the points sharing a dimension with it, so picking a column keeps the rows picked; a view's selection is dropped only when a value its points hold was changed by others.
    - The contract in [interactions.md §6](interactions.md#contract-same-in-both-plugins) is written for the maintainers: what each prop is for, what the app sends and reads, and what's their call (how highlight looks, how their own drill menu and column sorting step aside, the keyboard). `onLoadingComplete` stays in it, for play mode, loading states and tests.
    - The fake map's automatic legend is locked by default on its first classes, with a padlock to unlock (the classes then follow the data) and a button to fit them to the data shown (`use-legend-lock.ts`, `fake-map-legend.tsx`), so its colors keep their meaning through links and drills. It's the Maps request in [interactions.md §6](interactions.md#maps-pr-maps-app), item 8, after the MSF Dashboard's colorlock.
    - The fake map's shapes look like a country, not a grid of boxes: a concave mainland (a bay, a peninsula, two straight land borders) and Juniper as an island. Each chiefdom is the land nearest its seed in a bent plane, a few pairs meet along a straight line, and borders are traced along a grid of cells and smoothed, so neighbours share their borders exactly (`land-grid.ts`, `shapes.ts`). A shape now has a ring per part, as a GeoJSON MultiPolygon. The Cypress map clicks pick a point on the feature itself, as a box's centre can now fall on a neighbour.
    - The fake charts' legend series are clickable, as the axis labels: a line per district sends the district. The pivot table comes last among the saved visualizations.
    - Decided after the pass ([interactions.md §8](interactions.md#8-decisions-and-open-questions)): a map keeps its zoom when a link or a drill rewrites it (a drilled district's chiefdoms may sit in a corner), and no Shift-click ranges for now.
    - Tests: `drills.spec.ts`, `interactions-drills.spec.ts`, `drilling.spec.tsx`, `use-drill-actions.spec.tsx`, the fakes' right-clicks, and a Cypress scenario for the menu at the pointer.
