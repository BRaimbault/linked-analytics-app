# Linked Analytics App - Agent Guidelines

## Project Overview

A DHIS2 web app that opens up to four analytics plugins (Data Visualizer, Maps, later Line Listing / Event Visualizer) side by side in a flexible drag-and-drop grid, and lets them interact: e.g. selecting an org unit in one view updates the others.

Short description: View DHIS2 Maps, Data Visualizer and other analytics plugins side by side in a flexible grid, and link them so selections in one update the others.

Target: App Hub community app. Repo lives on a personal GitHub account for now and may move to an org later, so never hardcode the owner name.

### Frame of reference

- **Aggregate data first**: Data Visualizer visualizations, and Maps with thematic, org unit, facility and Earth Engine layers.
- **Create and edit inside the app**: each view gets its own settings tab (like DV's ribbon) where a saved item is picked or a new one is configured, not only imported.
- **Interactions between views are the new part**, and still need research (see Plan and Open design questions).

### Reference project

The tooling, conventions and architecture follow [dhis2/event-visualizer-app](https://github.com/dhis2/event-visualizer-app) (EV). When in doubt about how to set something up, check how EV does it and follow that.

### Project Stage

This is an unreleased app under active development. Some defaults that suit stable codebases are loosened:

- **Refactor freely when it improves clarity or reduces tech debt**, even outside the strict scope of the current task.
- **Keep README and other documentation in sync with code changes**: when you change behavior, structure, or setup steps, update the relevant docs (including the Plan section below) in the same change.

## Environment

- **Node**: 24 (see `.nvmrc`). `engines` in `package.json` requires ≥ 22.22.2 (jsdom/undici need it) and `engineStrict` makes pnpm refuse to install or run scripts on older versions. Run `nvm use` in the project dir if your default is older. The git hooks and the Claude Code format hook source `scripts/use-project-node.sh`, which does this for them when nvm is installed.
- **pnpm**: version pinned via `packageManager` in `package.json`.
- **Dev server**: `pnpm start --proxy https://dev.im.dhis2.org/analytics-dev`, then open `http://localhost:3000`. The login form asks for Server, Username and Password — use the server URL and credentials from `dhis2.env.json`.
- **`dhis2.env.json`** (gitignored, copied from `dhis2.env.template.json` on install) holds the dev server URL and credentials. Read it for API lookups and browser testing.

## DHIS2 App Shell Structure

### .d2 Directory (GENERATED - DO NOT EDIT)

- `.d2/shell/` contains the generated App Shell; `src/` is copied into it and wrapped with DHIS2 providers (auth, data engine, config, alerts).
- **Don't run `pnpm build` while `pnpm start` is running**: both regenerate `.d2/shell`, and the dev server then serves broken files (e.g. HTML for `manifest.json`). Restart the dev server if it happens.
- **The dev server crashes when a file is replaced through a temporary file** (atomic saves: `sed -i`, scripted rewrites, some editors). d2-app-scripts' watcher copies `src` into `.d2/shell` without error handling, and an `ENOENT` kills the process. Restart `pnpm start` when it happens.
- **Never write or modify files in `.d2/`**. If the shell looks stale after a dependency upgrade, delete `.d2` and restart the dev server.

### Generated TypeScript Types (DO NOT EDIT)

- **Location**: `src/types/dhis2-openapi-schemas/` (gitignored)
- **Contents**: types generated from the DHIS2 OpenAPI spec of the dev server
- **Usage**: import from the `@types` alias, not directly (enforced by ESLint). Re-export what you need in `src/types/index.ts`.
- **Regeneration**: `pnpm generate-types` (also runs on install when the types are missing, including in CI, so a fresh install needs the dev server to be reachable). It reads the server and credentials from `dhis2.env.json` and keeps the existing types if anything fails.
- **Debug logging**: set `localStorage.LINKED_ANALYTICS_LOG_LEVEL` (e.g. `debug`) in the browser; defaults are `debug` in development, `error` in production.

## Key technical findings

From reading `dhis2/dashboard-app` (`src/components/Item/VisualizationItem/Visualization/`) and EV:

- Plugins are embedded with `Plugin` from `@dhis2/app-runtime/experimental` (iframe + prop passing). `Plugin` types only its own layout props and forwards the rest untyped, so re-type it for the props we send (see EV `src/plugin-host/plugin-host-app.tsx`).
- **Plugin URL**: look up the app in `/api/apps` by key (`data-visualizer`, `maps`, `line-listing`) and use `pluginLaunchUrl`; fall back to `${baseUrl}/dhis-web-data-visualizer/plugin.html` or `${baseUrl}/dhis-web-maps/plugin.html`. Reference: `plugin.js` (`getPluginLaunchUrl`).
- **Props the dashboard passes**: `visualization` (full object), `isVisualizationLoaded: true`, `forDashboard: true`, `displayProperty` (user setting `keyAnalysisDisplayProperty`), `onError`, `onInstallationStatusChange`, `cacheId`, `isParentCached`, plus `width` / `height`. Without a fixed height some plugins render 0×0.
- **Fetching the visualization**: DV and Maps plugins expect the full object, fetched with specific fields. Reference: dashboard-app `src/api/metadata.js` (`getFavoriteFields`, `getMapFields`) and `src/api/fetchVisualization.js`.
- **EV / Line Listing plugins fetch their own visualization by id** and do **not** apply dashboard `filters` (they only show a "filters not applied" notice).
- **Filtering DV and Maps works by rewriting the visualization object**, not through a filter prop: replace `items` of the matching dimension in rows/columns/filters (or add it to filters). For maps, apply this to each thematic/event `mapView`. Reference: `getFilteredVisualization.js` (still current on dashboard-app master). Linked org unit/period filters for DV and Maps need no upstream changes; for EV/LL they do.
- Plugins do **not** emit events (map feature clicks, chart point clicks). True plugin-to-plugin interactions need upstream contributions (e.g. an `onOrgUnitClick`-style callback prop). `Plugin` can pass callbacks across the iframe boundary.
- Each plugin loads a full app bundle in its own iframe, so four at once is heavy. Watch performance.

## Plan

1. **Tooling** (done): EV setup — Vitest, strict TS, path aliases, ESLint/Stylelint/ls-lint/Prettier, commitlint + git hooks, RTK Query data layer, generated API types, CI.
2. **Workspace grid with placeholders** (in progress): dockview workspace, see "Workspace" below.
3. **Render plugins**: replace the placeholders with the DV and Maps plugins (`Plugin` from app-runtime), and check performance with 4 at once. Keep iframes alive across moves (`renderer: 'always'`) and disable their pointer events during palette drags.
4. **View settings**: pick a saved visualization or map, or create one, in each view's settings tab.
5. **Interactions**: shared org unit and period filters applied by rewriting visualization objects (pure, unit-tested `getFilteredVisualization`), then click-driven links once plugins emit events (needs upstream plugin changes; raise on the DHIS2 Community of Practice).
6. **Persistence**: save workspaces (URL first, then the dataStore).

### Workspace (dockview)

- `dockview-react`, one view per cell (no tabs in the grid), at most 4 views. Drop rules live in `src/modules/workspace/rules.ts`; every dockview call lives in `src/components/workspace/workspace-controller.ts`.
- A tools edge group (top by default, movable to any edge from its ⋯ menu, collapsible) holds "Add views", one settings tab per view, and "Interactions". Selecting a view by hand brings its settings tab forward; adding one keeps the palette open.
- Views keep a minimum size (`VIEW_MIN_SIZE`). A split or edge drop that would go below it is refused, and a click-add falls back from "right of the selected view" to "below it", then to other cells, before alerting that there is no room.
- Docking a view at an outer edge sizes the grid proportionally: every line along that axis holding a single view gets 1/n of the grid (n = number of views), a line of stacked views keeps the rest. Without this, docking across the current layout gives the new view half the grid.
- Dropping a view onto the middle or the tab of another view swaps them; the view's ⋯ menu does the same from the keyboard.
- Selecting a view by hand (click or tab, including one that is already active) brings its settings tab forward. Closing the selected view selects a neighbour; an empty grid brings back "Add views".
- The layout is mirrored into the `workspace` Redux slice from dockview events; dockview stays the source of truth. The dockview api is shared through `WorkspaceApiContext`, not Redux.
- **Dockview facts that matter here:**
    - `renderer: 'always'` keeps iframes alive when panels move; moving an iframe in the DOM otherwise reloads it.
    - With `renderer: 'always'`, view bodies live in an overlay (`.dv-render-overlay`) above the grid that catches the pointer, so during a drag only tab bars would reach the drop zones. The workspace turns off pointer events on that overlay and on iframes while any drag is in progress (`useIsDragging`).
    - Drop zones: dockview's defaults (a 10px band at the outer edges, 20% per side in a cell) are widened with `dndEdges` and `dropOverlayModel`, leaving the middle third of a cell for swapping.
    - Screen-reader announcements go through `getWorkspaceAnnouncement`: only view changes are spoken, translated.
        - `onReady` runs twice under StrictMode; setup must be idempotent and disposable.
        - No RTL support (dockview issue #388).
        - Docking a panel to an edge by dragging, and full keyboard docking, are paid (Enterprise) features.
        - There is no built-in swap. `swapViews` moves the two panels through temporary spacer tabs, because dockview removes a group as soon as it is empty; moves are what keep iframes alive.
        - `DockviewDefaultTab` overrides `className`; mark tabs with `data-*` attributes instead.

### Open design questions

- Drill semantics: clicking a district sets the target to that district, or to its children?
- Cycles and reset when panels drive each other.
- Positioning vs. the Dashboard app: focus on ad hoc exploration + interactions.

## Where helpers live in `src/modules`

A helper lives in the domain of what it **produces**, not the domains it reads from. Code not owned by any one domain — generic, cross-cutting utilities — goes in `modules/utils`; keep that bar high. A domain that outgrows a single file becomes a folder of sibling files; import the specific file you need (`@modules/<domain>/<file>`). Avoid `index.ts` barrels — Vite's performance guide advises against them.

## Code Conventions

### Communicating with the user

- Write plainly. Short sentences, common words, no filler.
- Explain things the way you would to a colleague, not in dense prose.
- Prefer a few clear lines over a wall of text.

### Code Style

- **Self-documenting code over comments**: prefer well-named intermediate variables and small helpers over explanatory comments.
- **When to comment**: only for (a) domain/business context that can't be inferred from the code, or (b) code that is genuinely hard to comprehend on its own. Default position is no comment. Never restate what the next line does.
- **Never include time-bound information** in comments: no refactor history, future plans or removed alternatives.
- **Multi-line comments always use `/* */`**. Never stack multiple `//` lines for a block comment.
- **JSDoc**: reserve for public API surfaces that genuinely benefit from it.

### TypeScript & Imports

- **Strict mode** is on.
- **Path aliases**: always use them (`@hooks`, `@components/*`, `@api/*`, `@modules/*`, `@store/*`, `@locales/*`, `@types`) — **never relative parent imports** (`../`). Aliases are defined in `import-aliases.mts` (Vite/Vitest) and `tsconfig.json` (TypeScript); keep them in sync.
- **Type imports**: use `import type` for type-only imports.
- **No default exports** (except entry points and config files).
- **No `any`** unless absolutely necessary.

### React Components

- Functional components with hooks; keep them focused and small.
- **Data fetching**: `useDataQuery` / `useDataMutation` / `useDataEngine` from app-runtime are restricted — use `useRtkQuery`, `useRtkLazyQuery` and `useRtkMutation` from `@hooks`.
- **Redux hooks**: use the typed `useAppDispatch` / `useAppSelector` / `useAppStore` from `@hooks`.
- **DHIS2 UI** components wherever possible so the app looks native.
- **Styling**: CSS modules, with logical properties (`margin-block`, `inline-size`, …; enforced by Stylelint).
- **i18n**: all user-facing strings through `i18n.t()` from `@dhis2/d2-i18n`. No `:` in a string: i18next reads it as a namespace separator and the scanner warns (`"X" does not exist in the namespaces`).

### State Management

- Redux Toolkit slices in `src/store/`; RTK Query endpoints in `src/api/`.
- The DHIS2 data engine is passed to thunks and the RTK Query base query as `extra.engine`.

### Naming Conventions

- **All file and directory names are kebab-case** (enforced by ls-lint), including components (`analytics-plugin.tsx`) and CSS modules (`analytics-plugin.module.css`).
- Components, types: PascalCase identifiers. Hooks: camelCase with `use` prefix.

### Testing Guidelines

- **Test behavior, not implementation details.**
- **Cover new functionality** in the same change, including edge cases and error conditions.
- **Vitest** unit tests: `*.spec.ts(x)`, co-located or in `__tests__` directories; import `describe`/`it`/`expect` from `vitest`; use `@testing-library/react` for components; test ids use the `data-test` attribute.
- `clearMocks`, `unstubEnvs` and `unstubGlobals` are on, so don't hand-write a `beforeEach` to reset mocks.

## Understanding the DHIS2 Web API

Never rely on training data for DHIS2 API specifics. Look them up against the dev server: see the `dhis2-api-lookup` skill (OpenAPI spec → probe the live API → read the `dhis2-core` source).

**GET requests only** against the dev server — never POST, PUT, PATCH, or DELETE, and never a production server.

## Browser testing

Drive the running app with the Chrome DevTools MCP (or claude-in-chrome). Verify each plan milestone in the browser before moving on.

## Git Workflow

**IMPORTANT FOR AI AGENTS**: **DO NOT stage files or create commits**. The user reviews diffs, stages changes, and commits.

- Git hooks live in `.hooks/` (wired up by `scripts/postinstall.sh` via `core.hooksPath`): commitlint on commit messages, i18n extract + a whole-project TypeScript check + lint-staged on commit, unit tests on push.
- **Conventional commits** (`feat:`, `fix:`, `chore:`, …), enforced by commitlint. Semantic-release comes later (see EV / data-visualizer-app workflows).
- Feature branches and PRs; PRs include tests for new functionality.

## Testing & Linting Workflow for AI Agents

**Golden rule**: during development, lint/test only the files you touched. Before finishing, always run `pnpm test` and `pnpm lint`.

- **Vitest**: `pnpm exec vitest run <file-path>`
- **Coverage**: `pnpm test:coverage` (HTML report in `coverage/`). Thresholds are 100% for lines, functions, branches and statements, and CI fails below that, so run it before finishing.
- **ESLint**: `pnpm exec eslint <file-path>` (add `--fix`)
- **Stylelint**: `pnpm exec stylelint <file-path> --max-warnings=0` (add `--fix`)
- **Prettier**: `pnpm exec prettier --write <file-path>`
- **TypeScript**: file-specific `tsc` is not possible; run `./scripts/check-typescript.sh`.

ESLint, Stylelint and Prettier run automatically via the PostToolUse hook in `.claude/settings.json` after Edit/Write. Files modified via Bash are **not** auto-formatted — run Prettier manually.

If lint fails on auto-fixable issues, run `pnpm format` then re-run `pnpm lint`.
