# Linked Analytics: agent guidelines

## Project

View DHIS2 Maps, Data Visualizer and other analytics plugins side by side in a drag-and-drop grid, and link them so a selection in one updates the others. Up to 4 plugins at once; Line Listing and Event Visualizer come later.

- **Target**: an App Hub community app. The repo lives on a personal GitHub account and may move to an org, so never hardcode the owner name.
- **Stage**: unreleased, under active development. So:
    - **refactor freely** when it improves clarity or reduces tech debt, even outside the task's strict scope;
    - **keep the docs in sync** with the code: when behavior, structure or setup changes, update README, this file (including the Plan) and `docs/` in the same change.
- **Reference project**: tooling, conventions and architecture follow [dhis2/event-visualizer-app](https://github.com/dhis2/event-visualizer-app) (EV). When in doubt, check how EV does it and follow that.

### Frame of reference

- **Aggregate data first**: DV visualizations, and Maps with thematic, org unit (boundary), facility and Earth Engine layers.
- **Create and edit inside the app**: each view has a settings tab (like DV's ribbon) where a saved item is picked or a new one is configured.
- **Interactions between views are the new part.**

### Docs

The design and the repo's history live in `docs/` ([index, terms and conventions](docs/README.md)). Keep each design doc in sync when its design changes.

- [workspace-grid.md](docs/workspace-grid.md): the grid, in detail (placing, sizing, drops, touch, iframes).
- [history.md](docs/history.md): a timeline of the repo and the report of each milestone (the tooling port first, with the EV bugs fixed here). Add an entry when a milestone lands; never rewrite old ones.
- [interactions.md](docs/interactions.md): channels, selectors, link mode, and the upstream plugin PRs.
- [plugins.md](docs/plugins.md): what the real plugins accept. **The single source** for plugin behavior.
- [view-settings.md](docs/view-settings.md): picking, creating and editing a view's item.
- [selector-controls.md](docs/selector-controls.md): selector controls and their sizes.
- [map-layers.md](docs/map-layers.md): options to limit layers per map (proposal).
- [demo-mode.md](docs/demo-mode.md): fake plugins on synthetic data. Its `released` profile mirrors plugins.md.

## Working with the user

- Write plainly: short sentences, common words, no filler. Explain things as you would to a colleague; prefer a few clear lines over a wall of text.
- **Do not stage files or create commits.** The user reviews diffs, stages changes and commits.
- **GET requests only** against the dev server: never POST, PUT, PATCH or DELETE, and never a production server.

## Environment

- **Node**: 24 (see `.nvmrc`). `engines` in `package.json` requires 22.22.2 or newer (jsdom and undici need it), and `engineStrict` (in `pnpm-workspace.yaml`) makes pnpm refuse to install or run scripts on older versions. Run `nvm use` in the project dir if your default is older. The git hooks and the Claude Code format hook source `scripts/use-project-node.sh`, which does this for them when nvm is installed.
- **pnpm**: the version is pinned by `packageManager` in `package.json`.
- **Dev server**: `pnpm start --proxy https://dev.im.dhis2.org/analytics-dev`, then open http://localhost:3000. The login form asks for Server, Username and Password: use the values in `dhis2.env.json`.
- **`dhis2.env.json`** (gitignored, copied from `dhis2.env.template.json` on install) holds the dev server URL and credentials. Read it for API lookups and browser testing.
- **Debug logging**: set `localStorage.LINKED_ANALYTICS_LOG_LEVEL` (e.g. `debug`) in the browser. Defaults: `debug` in development, `error` in production.

## Generated code (do not edit)

- **`.d2/`** holds the generated app shell: `src/` is copied into `.d2/shell/` and wrapped with the DHIS2 providers (auth, data engine, config, alerts). **Never write or modify files in `.d2/`.** If the shell looks stale after a dependency upgrade, delete `.d2` and restart the dev server.
    - **Don't run `pnpm build` while `pnpm start` runs**: both regenerate `.d2/shell`, and the dev server then serves broken files (e.g. HTML for `manifest.json`). Restart the dev server if it happens.
    - **While `pnpm start` runs, edit files with the Edit and Write tools, not `sed -i` or scripted rewrites.** A file replaced through a temporary file (an atomic save) crashes the dev server: d2-app-scripts' watcher copies `src` into `.d2/shell` without error handling, and an `ENOENT` kills it. Restart `pnpm start` if it happens.
- **API types** in `src/types/dhis2-openapi-schemas/` (gitignored) are generated from the dev server's OpenAPI spec.
    - Import them from the `@types` alias, never directly (enforced by ESLint); re-export what you need in `src/types/index.ts`.
    - `pnpm generate-types` regenerates them from the server in `dhis2.env.json`, and keeps the existing types if anything fails. It also runs on install when they're missing, including in CI, so a fresh install needs the dev server to be reachable.

## DHIS2 Web API

Never rely on training data for DHIS2 API specifics. Look them up against the dev server: see the `dhis2-api-lookup` skill (OpenAPI spec, then the live API, then the `dhis2-core` source).

## Plugins

What each plugin accepts, with sources, is in [docs/plugins.md](docs/plugins.md). The rules that shape code:

- **Embed with `Plugin`** from `@dhis2/app-runtime/experimental` (an iframe plus props passed over post-robot). It types only its own layout props, so re-type it for the props we send (see EV `src/plugin-host/plugin-host-app.tsx`). Give it a fixed `width` and `height`: without them some plugins render at 0×0.
- **Plugin URL**: look the app up in `/api/apps` by key (`data-visualizer`, `maps`, `line-listing`) and use `pluginLaunchUrl`; fall back to `${baseUrl}/dhis-web-data-visualizer/plugin.html` or `${baseUrl}/dhis-web-maps/plugin.html`. Reference: dashboard-app `plugin.js` (`getPluginLaunchUrl`).
- **Props**: pass what the dashboard passes (dashboard-app `IframePlugin.jsx`): `visualization`, `isVisualizationLoaded: true`, `forDashboard: true`, `displayProperty`, `onError`, `onInstallationStatusChange`, `cacheId`, `isParentCached`.
- **Memoize every prop per view.** `Plugin` re-sends all props when any one changes identity, and DV then refetches. **Never pass `onChartGenerated`**: it sends the whole Highcharts chart across the iframe.
- **Fetch the full object** with the dashboard's field lists: dashboard-app `src/api/metadata.js` (`getFavoriteFields`, `getMapFields`).
- **Link by rewriting the object**, not through `filters`: replace the `items` of the matching dimension in `rows`, `columns` or `filters` (or add it to `filters`); for maps, in each thematic or event map view. Reference: dashboard-app `getFilteredVisualization.js`.
    - **DV** updates in place.
    - **Maps** updates in place only for changes in `filters` and `rows` (so `ou` and `pe` on thematic layers). A new data item, a style change, an event layer's dates, `relativePeriodDate`, or a changed number of layers need a **remount** (a new `key`, so a new iframe) until the Maps PR; an added layer otherwise crashes the plugin.
    - **Line Listing** freezes the object at mount, so it takes links by remounting. **EV** fetches by id and needs an upstream change.
- **No plugin gives a load signal, and only DV sends clicks** (`onDrill`, org units only), until the upstream PRs. The planned contract (`onDataClick`, `highlight`, `onLoadingComplete`) is in [docs/interactions.md §6](docs/interactions.md#6-upstream-prs).
- **The dimension pickers come from `@dhis2/analytics`** (`DataDimension`, `PeriodDimension`, `OrgUnitDimension`, `DynamicDimension`, and `OpenFileDialog` through `FileMenu`), as in DV, Maps and LL. See [docs/view-settings.md](docs/view-settings.md#what-dhis2analytics-offers).
- **Each plugin loads a full app in its own iframe**, so 4 at once is heavy: watch performance ([docs/plugins.md §3](docs/plugins.md#3-cost)).

## Plan

1. **Tooling** (done): the EV setup: Vitest, strict TypeScript, path aliases, ESLint, Stylelint, ls-lint, Prettier, commitlint and git hooks, the RTK Query data layer, generated API types, CI.
2. **Workspace grid with placeholders** (in progress): the dockview workspace, with view kinds (plugin or selector) and sizes per type. See [Workspace](#workspace) and [docs/workspace-grid.md](docs/workspace-grid.md).
3. **Render plugins** (next): replace the placeholders with the DV and Maps plugins, and check performance with 4 at once, including memory and main-thread cost on a deployed build. Keep iframes alive across moves (`renderer: 'always'`), and turn off their pointer events during any drag. See [docs/plugins.md](docs/plugins.md).
    - **Demo mode**, alongside it ([docs/demo-mode.md](docs/demo-mode.md)): fake DV and Maps plugins on synthetic data, mounted by the same plugin adapter. Each fake acts like the released plugins or like the proposed upstream contract, so the interactions can be built and shown before the upstream PRs.
4. **View settings** (planned; [docs/view-settings.md §7](docs/view-settings.md#7-order-of-work)): pick a saved item with `OpenFileDialog` (together with step 3), hand off to DV or Maps for full editing, then in-app editors for visualizations and map layers, with Save as, Save and Revert. The map editor's scope depends on [docs/map-layers.md](docs/map-layers.md).
5. **Interactions** (planned; [docs/interactions.md §7](docs/interactions.md#7-order-of-work)): channels, selectors and link mode, with a pure, unit-tested `applyLinks`; then click-driven links once the upstream `onDataClick` and `highlight` props land. Needs only step 3, so it can run alongside step 4.
6. **Persistence** (planned): save workspaces, in the URL first, then the dataStore.

## Workspace

The grid is `dockview-react`, one view per cell. Detail and reasons: [docs/workspace-grid.md](docs/workspace-grid.md).

- **Code layout**: pure layout logic in `src/modules/workspace/` (no dockview, unit-tested); **every dockview call** in `src/components/workspace/controller/`, one file per topic, with `setup-workspace.ts` only wiring events to named handlers; components in `src/components/workspace/` (`tabs/`, `panels/`, `insert-zones/`). The file map is in [docs/workspace-grid.md §9](docs/workspace-grid.md#9-code-layout).
- **dockview is the source of truth**; the `workspace` Redux slice mirrors it from dockview events. Share the api through `WorkspaceApiContext`, not Redux.
- **Views**: at most 4 plugins (`MAX_PLUGIN_VIEWS`); each selector type is capped at the number of plugins + 1. Sizes come from the registry (`sizes.min`, and `sizes.preferred` for selectors). Selectors have **no maximum size**.
- **Sizes**: after every add, move or close, the controller restores the user's proportions (`computeLayoutSizes`), reading the layout in `onWillMutateLayout` (or `onWillDrop` for a tab dropped at the outer edge) and applying `group.api.setSize` in `onDidMutateLayout`, parents first. **Never read the grid while a view is maximized**: dockview re-applies stored sizes when it restores one.
- **Iframes**: `renderer: 'always'` keeps them alive when panels move. View bodies live in an overlay above the grid, so during a drag `workspace.tsx` sets `data-dragging` and CSS turns off pointer events on view overlays (`.dv-render-overlay:has([data-view-id])`) and iframes, never on all overlays (the tools live in overlays too). **A view's body must keep `data-view-id`.** jsdom can't evaluate this CSS: check real drags in Cypress or the browser.
- **dockview gotchas**:
    - `onReady` runs twice under StrictMode: setup must be idempotent and disposable.
    - There is no built-in swap; `swapViews` moves panels through temporary spacer tabs, since dockview removes a group as soon as it's empty.
    - `DockviewDefaultTab` overrides `className`: mark tabs with `data-*` attributes.
    - Our padding on `.dv-default-tab` needs `box-sizing: border-box`, or the tab row overflows and hides the close button.
    - The theme sets `tabAnimation: 'default'` explicitly (unset, dockview opens a gap in a view's header when another view is dragged over it) and `dndTabIndicator: 'line'`.
    - `singleTabMode="fullwidth"` applies to every group; the tools strip's CSS undoes it (`.dv-edge-group .dv-single-tab`).
    - A collapsed edge group keeps its panels mounted outside the group's element; `ToolPanel` makes them `inert`.
    - Docking a panel to an edge by dragging, and full keyboard docking, are paid (Enterprise) features. No RTL support (dockview issue #388).

## Code conventions

### Where helpers live in `src/modules`

A helper lives in the domain of what it **produces**, not the domains it reads from. Code owned by no one domain (generic, cross-cutting utilities) goes in `modules/utils`; keep that bar high. A domain that outgrows one file becomes a folder of sibling files; import the specific file you need (`@modules/<domain>/<file>`). Avoid `index.ts` barrels: Vite's performance guide advises against them.

### Code style

- **Self-documenting code over comments**: prefer well-named intermediate variables and small helpers.
- **Comment only** for domain context that can't be inferred from the code, or code that is genuinely hard to follow. Never restate what the next line does.
- **No time-bound information** in comments: no refactor history, future plans or removed alternatives.
- **Multi-line comments use `/* */`**, never stacked `//` lines.
- **JSDoc** only for public API surfaces that genuinely benefit from it.
- **One topic per file**, named after it. When a file mixes topics or grows past about 250 lines (tests about 400), split it into sibling files in a folder named after the domain, and move its tests along. Lift a pattern into a shared helper or hook the second time it's written, not before.

### TypeScript and imports

- **Strict mode** is on. **No `any`** unless absolutely necessary.
- **Path aliases** always (`@hooks`, `@components/*`, `@api/*`, `@modules/*`, `@store/*`, `@locales/*`, `@types`), **never relative parent imports** (`../`) in source files. Aliases are defined in `import-aliases.mts` (Vite and Vitest) and `tsconfig.json` (TypeScript); keep them in sync.
- **`import type`** for type-only imports.
- **No default exports**, except entry points and config files.

### React

- Functional components with hooks; keep them focused and small.
- **Data fetching**: `useDataQuery`, `useDataMutation` and `useDataEngine` from app-runtime are restricted; use `useRtkQuery`, `useRtkLazyQuery` and `useRtkMutation` from `@hooks`.
- **Redux**: the typed `useAppDispatch`, `useAppSelector` and `useAppStore` from `@hooks`. Slices in `src/store/`, RTK Query endpoints in `src/api/`; the data engine reaches thunks and the base query as `extra.engine`.
- **DHIS2 UI** components wherever possible, so the app looks native. Give `Tooltip` a render function around a focusable child: with a plain child it wraps it in a focusable `<span>`, a second Tab stop. (A disabled button is the exception, since it can't take focus.)
- **Styling**: CSS modules, with logical properties (`margin-block`, `inline-size`…; enforced by Stylelint).
- **i18n**: every user-facing string through `i18n.t()` from `@dhis2/d2-i18n`. No `:` in a string: i18next reads it as a namespace separator, and the scanner warns.

### Naming

- **All file and directory names are kebab-case** (enforced by ls-lint), including components (`analytics-plugin.tsx`) and CSS modules (`analytics-plugin.module.css`).
- Components and types: PascalCase. Hooks: camelCase with a `use` prefix.

## Testing and linting

### Writing tests

- **Test behavior, not implementation details**, and **cover new functionality in the same change**, including edge cases and errors.
- **Vitest**: `*.spec.ts(x)`, co-located or in `__tests__`; import `describe`, `it` and `expect` from `vitest`; `@testing-library/react` for components; test ids use the `data-test` attribute. `clearMocks`, `unstubEnvs` and `unstubGlobals` are on, so don't hand-write a `beforeEach` to reset mocks. Vitest owns the **100% coverage** (lines, functions, branches, statements), and CI fails below it.
- **Cypress component tests** (`*.cy.tsx` in `__tests__`, mounted with `cy.mount`) cover only what jsdom can't: real layout, CSS and drag and drop.
    - The workspace scenarios are in `src/components/workspace/__tests__/grid/`, one spec per group, sharing `grid-helpers.tsx`.
    - A few scenarios per group are tagged `SMOKE` (`{ tags: '@smoke' }`, through `@cypress/grep`): the ones that would catch a broken group fastest. Tag a new scenario only when it covers something no smoke test does.
    - CI runs them all; the git hooks don't.
    - Pitfalls: a DHIS2 `MenuItem` ignores clicks on its `li` (click its `[role="menuitem"]`); aliases of `invoke()` queries are re-run when read (store values in variables); the mount has no DHIS2 header, so tooltips at the top flip over their buttons; the 800px mount is taller than the screenshot viewport, so focusing or clicking can scroll the page (`dragTo` scrolls its source into view first).

### Running checks

**Before finishing**, run `pnpm test:coverage` and `pnpm lint`. While working, test and lint only the files you touched:

- **Vitest**: `pnpm exec vitest run <file-path>`.
- **Cypress**: `pnpm cy:comp:smoke` (a few seconds) or `pnpm cy:comp:run` (all; `pnpm cy:comp:open` for the interactive runner). From VS Code's terminal, prefix it with `env -u ELECTRON_RUN_AS_NODE`: VS Code sets that variable, and Cypress then fails with "bad option: --no-sandbox".
- **ESLint**: `pnpm exec eslint <file-path>` (add `--fix`). **Stylelint**: `pnpm exec stylelint <file-path> --max-warnings=0` (add `--fix`). **Prettier**: `pnpm exec prettier --write <file-path>`.
- **TypeScript**: file-specific `tsc` isn't possible; run `./scripts/check-typescript.sh`.
- ESLint, Stylelint and Prettier run automatically after Edit and Write (the PostToolUse hook in `.claude/settings.json`). **Files changed through Bash are not formatted**: run Prettier on them. If lint fails on auto-fixable issues, run `pnpm format`, then `pnpm lint` again.

### Browser testing

Drive the running app with the Chrome DevTools MCP (or claude-in-chrome). Verify each plan milestone in the browser before moving on.

## Git

- **Do not stage files or create commits** (see [Working with the user](#working-with-the-user)).
- Git hooks live in `.hooks/` (wired up by `scripts/postinstall.sh` through `core.hooksPath`): commitlint on commit messages; i18n extract, a whole-project TypeScript check and lint-staged on commit; unit tests on push.
- **Conventional commits** (`feat:`, `fix:`, `chore:`…), enforced by commitlint.
- Feature branches and pull requests; pull requests include tests for new functionality.
