# Code structure

- **Status**: research (September 2026) and proposal. The rules in §4 are decided, and the import direction is enforced; the moves in §5 each say when to make them.
- **Related**: [CLAUDE.md](../CLAUDE.md) (code conventions and the plan), [workspace-grid.md §9](workspace-grid.md#9-code-layout) (the workspace's file map).

How `src/` is organized, what common guides recommend, and the rules and moves to follow as plugins, demo mode, view settings, interactions and persistence arrive.

## 1. Where we stand

The layout follows [event-visualizer-app](https://github.com/dhis2/event-visualizer-app) (EV), the reference project: folders by layer at the top.

- `api/`: the RTK Query base and endpoints.
- `components/`: one folder per area of the UI (`app/`, `app-wrapper/`, `workspace/`).
- `modules/`: pure logic by domain (`modules/workspace/`), plus the logger and debug mode.
- `store/`: Redux slices (`workspace-slice.ts`, `workspace-settings-slice.ts`).
- `hooks/`, `types/`, `locales/`.

What already matches the guides in §2:

- Tests (`__tests__/`) and CSS modules (`styles/`) sit next to the code they cover.
- No barrel files, except `@hooks` (as in EV).
- Nesting stays within 4 levels under `src/`.
- Pure logic stays out of React and out of dockview.
- Imports flow one way: nothing in `modules/`, `store/`, `api/` or `hooks/` imports from `components/`. ESLint holds this (§4.1).

Where it strains, as of 2026-09-28:

- **One domain spreads over three trees.** The workspace lives in `modules/workspace/` (13 files), `components/workspace/` (including `controller/`, 17 files) and `store/workspace-*-slice.ts`. With one domain that is easy to follow; with five more planned, finding "everything about X" gets harder.
- **`components/workspace/controller/` holds no components.** It is the dockview adapter: every dockview call, one file per topic. The name is documented but off.
- **Test helpers are local.** `render-with-store.tsx` and `fake-dockview.ts` live in `components/workspace/__tests__/`, which is right while the workspace is their only user.

The older DHIS2 apps (DV, Maps, LL) use a Redux-era layout (`actions/`, `reducers/`, `components/<Area>/`). It is not a model to follow.

## 2. What the guides recommend

- **React team**: group by feature or by file type, both work. Keep nesting to 3 or 4 levels, and don't spend long choosing: refactor once the shape is clear.
- **Colocation** (Kent C. Dodds): "Place code as close to where it's relevant as possible." Tests, styles and helpers live next to what they serve; only cross-cutting tests and docs sit at the root.
- **Bulletproof React**: a `features/<name>/` folder per feature (its own components, hooks, api, store), plus shared folders. Imports flow one way (shared → features → app), features don't import each other, and the app composes them. Import files directly: barrels hurt Vite.
- **Feature-Sliced Design**: 7 layers (app, pages, widgets, features, entities, shared), slices by domain, segments by purpose, and imports only from lower layers. Its own docs say to adopt it to fix real pain, not to prevent pain that may never come.

## 3. The choice

**Keep EV's layered layout**, and add the rules in §4 so new domains stay easy to find.

- The project rules name EV as the reference: other DHIS2 developers will find their way in it.
- A move to feature folders (Bulletproof) or to Feature-Sliced Design would touch every file for a structure the project doesn't need at its size.
- The one real gain of feature folders, everything about a domain in one place, comes mostly from naming: the same domain name in each layer (§4.2).

## 4. Rules for new code

### 4.1 Import direction

- `modules/` never imports from `components/`, `store/`, `api/` or `hooks/`.
- `store/` and `api/` never import from `components/`.
- `components/` may import from every layer.
- One domain's pure logic may use another's (`modules/interactions/` may read `modules/workspace/view-types.ts`), as long as there is no cycle.

ESLint enforces the first two, tests included (`LAYERS` in `eslint.config.mjs`). It matches the alias names (`@components/*`, `@store/*`, `@api/*`, `@hooks`) with `no-restricted-imports`, since every import in `src` uses an alias and the config has no alias-aware resolver for `import/no-restricted-paths`. A new layer boundary is one more entry in `LAYERS`.

### 4.2 One domain, the same name in each layer

A new domain gets the same set of places, each only when it has content:

- `modules/<domain>/`: pure, unit-tested logic;
- `components/<domain>/`: its UI, and its adapter to any library it drives (as `controller/` is for dockview);
- `store/<domain>-slice.ts`: its state;
- `api/<domain>.ts`: its endpoints.

Where the planned work goes:

| Domain        | modules/                                             | components/                       | store/ and api/                                                          |
| ------------- | ---------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| Plugins       | `plugins/` (props per view, if they need logic)      | `plugins/` (the plugin adapter)   | `api/plugins.ts` (launch URL lookup, fetching the full object)           |
| Demo mode     | `demo/` (synthetic data, capability profiles)        | `demo/` (fake plugins, providers) | none planned                                                             |
| View settings | `visualization/` (editing a saved object, as EV has) | `view-settings/`                  | `api/visualizations.ts`, `api/maps.ts` when saving lands                 |
| Interactions  | `interactions/` (channels, `applyLinks`)             | `interactions/` (link mode)       | `store/interactions-slice.ts`                                            |
| Persistence   | `persistence/` (workspace to URL and back)           | only if it needs UI               | `store/` reads it at startup; `api/data-store.ts` for the dataStore step |

[demo-mode.md](demo-mode.md) already places demo mode this way.

### 4.3 Where a helper lives

As in CLAUDE.md: in the domain of what it **produces**, not of what it reads. `applyLinks` produces a rewritten object for a view, so it lives in `modules/interactions/`, although it reads workspace views and visualization objects.

## 5. Moves to make later

In order, each at the moment given:

1. **Subfolders in `modules/workspace/`**. When: the next file would take it past about 15 (13 as of 2026-09-28). A grouping by topic:
    - `grid/`: `grid-tree`, `grid-measures`, `line-lengths`, `layout-sizing`, `layout-targets`;
    - `drops/`: `drop-rules`, `insert-zones`, `drag-payload`;
    - `views/`: `view-types`, `view-limits`, `balanced-split`, `bar-placement`.
2. **Rename `components/workspace/controller/`** to `src/workspace-controller/` (with an alias if imports get long). When: together with step 1, so the workspace's paths change once. Update [workspace-grid.md §9](workspace-grid.md#9-code-layout) and CLAUDE.md with it.
3. **A shared `src/test-utils/`**, as EV has. When: a second domain needs `render-with-store` or the fake dockview. Move them there then, not before.
4. **Review this doc** once plugins and interactions have landed: if finding a domain's code has become hard in spite of §4.2, reconsider feature folders then, with real pain to point at.

## 6. Open questions

- Should `hooks/` keep only app-wide hooks, with domain hooks next to their components (as `components/workspace/use-*.ts` already are)? Proposed: yes.
- Does the plugin adapter belong to `components/plugins/` or to `components/workspace/`? Proposed: `components/plugins/`, since demo mode and view settings also mount plugins.

## Sources

- [Bulletproof React: project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
- [Feature-Sliced Design: overview](https://feature-sliced.design/docs/get-started/overview)
- [React docs: file structure FAQ](https://legacy.reactjs.org/docs/faq-structure.html)
- [Kent C. Dodds: Colocation](https://kentcdodds.com/blog/colocation)
- [dhis2/event-visualizer-app](https://github.com/dhis2/event-visualizer-app), and the data-visualizer-app, maps-app and line-listing-app repos, read through the GitHub API (September 2026).
