# Demo mode: fake plugins on synthetic data

- **Status**: decided where [§11](#11-decisions-and-open-questions) says so. The first demo is built (branch `feat/demo-mode`, 28 and 29 September 2026: the five items of [§10](#10-where-it-fits-in-the-plan)); what comes after it is still a proposal. Open it with `?demo`.
- **Related**: [plugins.md](plugins.md) (what the real plugins do), [interactions.md §6](interactions.md#6-upstream-prs) (the contract the fakes implement), [view-settings.md](view-settings.md).

A mode where every view is a **fake plugin**: a small stand-in for DV or Maps that takes exactly the props of the real plugin, and draws synthetic data. Nothing is requested from a DHIS2 server.

Two terms used throughout:

- the **plugin adapter** is our component that mounts a view's plugin with typed props. In demo mode it mounts a fake instead of the real `Plugin`;
- a **capability profile** says which behavior a fake copies: `released` (the real plugins' limits, from [plugins.md](plugins.md)) or `proposed` (the upstream contract).

## 1. Why

- **Build and show the interactions before the upstream PRs land.** Channels, selectors, link mode and `applyLinks` don't have to wait for the PRs, or work around Maps' remounts.
- **A spec you can run.** A fake plugin implements the planned contract (`onDataClick`, `highlight`, `onLoadingComplete`). We try the contract before asking maintainers to build it, and a live demo pitches the PRs better than a document.
- **It can also mimic the released plugins.** The difference between the `released` and `proposed` profiles is the spec of the PRs, item by item.
- **Fast, stable tests.** The whole linked flow runs in Vitest and Cypress without a server, and without depending on what the demo database holds.
- **Demos from the real app.** Demo mode is a hidden switch in the app itself ([§7](#7-turning-it-on)), so it can be shown on any server, even one whose plugins are too old for the interactions, and without touching its data.

## 2. What is fake and what is real

**Real** (the same code as the app):

- the workspace, the view settings, channels, selectors, link mode and `applyLinks`;
- the pickers from `@dhis2/analytics` (`DataDimension`, `PeriodDimension`, `OrgUnitDimension`…);
- the plugin adapter and the props it sends.

**Fake**:

- the plugin inside each view;
- the data engine's answers (synthetic metadata and analytics);
- in tests only, the server config (`systemInfo`, user settings).

So in the app only two things are swapped: **the plugin** behind the adapter, and **the data engine** behind app-runtime. Everything a user touches is the real app.

## 3. Capability profiles

Each fake plugin reads its profile and behaves accordingly. Each `released` cell comes from [plugins.md §2](plugins.md#2-plugin-by-plugin). When a real plugin changes, update plugins.md first, then its row here.

| Capability                            | DV `released`                                                                     | Maps `released`                       | `proposed` (both)                   |
| ------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------- |
| Uses the object passed, saved or not  | yes                                                                               | yes                                   | yes                                 |
| A new `pe` or `ou` in filters or rows | redraws in place                                                                  | redraws, map rebuilt (zoom lost)      | redraws in place, zoom kept         |
| A new data item (`dx`)                | redraws                                                                           | **ignored**                           | redraws                             |
| A style change                        | redraws                                                                           | **ignored**                           | redraws                             |
| A layer added                         | —                                                                                 | **crashes**                           | redraws                             |
| `filters.relativePeriodDate`          | applied                                                                           | dropped (read per map view, on mount) | applied                             |
| Click callback                        | `onDrill`, org units only, `level` as a UID, pivot cells and bar or column charts | none                                  | `onDataClick` with `ou`, `pe`, `dx` |
| `highlight`                           | no                                                                                | no                                    | yes, without refetching             |
| `onLoadingComplete`                   | swallowed by the wrapper                                                          | none                                  | called after each load              |
| Props it reads                        | the 9 of DV's wrapper                                                             | `visualization` only                  | the contract                        |

- The profile is set per plugin type, so a demo can mix, e.g. DV `proposed` next to Maps `released`, to show what one PR alone brings.
- "Crashes" shows the plugin's error box, as the real plugin does, so the app's handling of a broken view gets tested too.
- A fake **counts its remounts** and shows a small "reloaded" flash. That makes the cost of the Maps workarounds under `released` visible in a demo.

## 4. The fake plugins

**Fake visualization** (stands in for DV):

- Types: column, line and pivot table, which cover most of the dev server's items ([view-settings.md §1](view-settings.md#what-the-dev-server-holds)). Other types draw as a pivot table with a "shown as a table in demo mode" note.
- Reads `dx`, `pe` and `ou` from `columns`, `rows` and `filters`, like DV's analytics request. Relative periods (`LAST_12_MONTHS`, `THIS_YEAR`…), `USER_ORGUNIT` and `LEVEL-n` resolve against the synthetic data.
- Draws plain SVG bars and lines, and an HTML table: clearly not the real apps, so a demo can't be mistaken for them.
- Clicks: under `released`, only an org unit on a bar, column or pivot cell, through `onDrill`. Under `proposed`, any point or cell calls `onDataClick` with the ids on its axes; Ctrl/Cmd-click sets `additive`.

**Fake map** (stands in for Maps):

- Layers: a thematic layer (choropleth), and org unit boundaries drawn from the same shapes. Other layer types draw as an empty layer with a "not in demo mode" note. How many layers a map may have follows [map-layers.md](map-layers.md).
- Reads each map view like the real plugin: `dx` in `columns`, `ou` in `rows`, `pe` in `filters`, and `colorScale`, `classes`, `method` for the style.
- Draws made-up district and chiefdom shapes (not real boundaries: a concave mainland with a bay, a peninsula and two straight land borders, plus one chiefdom that is an island. On a grid of cells, each cell goes to the nearest chiefdom seed in a bent plane, and a few pairs of chiefdoms meet along a straight line; borders are traced along the cells and smoothed. A shape has a ring per part, as a GeoJSON MultiPolygon; `modules/demo/land-grid.ts` and `shapes.ts`) as SVG, with a legend, and keeps its own zoom and pan so the `released` rebuild visibly loses them.
- Clicks: none under `released`. Under `proposed`, a feature click calls `onDataClick` with `ou` (`id`, `name`, `path`, `level`) and the layer's `dx`.

Both take a **`loadDelay`** (e.g. 300–1200 ms) before drawing and calling `onLoadingComplete`. That way the period selector's play mode, loading states and "wait for every receiver" can be tried as they would behave on a real server.

## 5. Synthetic data

Small and deterministic, so the same click gives the same numbers in every demo and test run.

- **Org units**: 1 country, 4 districts, 3 to 4 chiefdoms each, about 20 units in all. Each has an `id`, `name`, `path`, `level` (as the real UID), and a made-up polygon for the map: chiefdoms tile their district, and districts tile the country.
- **Levels and groups**: 3 levels (National, District, Chiefdom), and 2 org unit groups, so the org unit picker's level and group selects have content.
- **Periods**: monthly, quarterly and yearly periods for the two years before a fixed demo date. Relative periods are resolved against that date, so demos don't change with the real date.
- **Data items**: 3 or 4 indicators and data elements (e.g. ANC 1st visit, ANC 4th visit, Penta 3 coverage), with a legend set for one of them.
- **Values**: a seeded formula per data item: a base per district, a seasonal curve over the months, and noise from the org unit and period ids. Totals roll up from chiefdoms to districts and the country, so drilling gives consistent numbers.
- **Demo items**: a few saved-looking visualizations and maps built from these, so "Open a saved item" has something to open.

## 6. Running without a server

- **First version: no fake data engine.** The fake plugins read the synthetic data directly from `src/modules/demo/`, and the demo's selectors offer a short fixed list from it. The fake data engine below comes when the real pickers run in demo mode.
- **Data engine**: demo mode wraps the workspace in app-runtime's `CustomDataProvider`. Each resource the app and the pickers ask for is a function over the synthetic data:
    - for the pickers: `dataItems`, `indicators`, `indicatorGroups`, `dataElements`, `dataElementGroups`, `organisationUnits`, `organisationUnitLevels`, `organisationUnitGroups`, `dimensions`, `configuration/dataOutputPeriodTypes`, `userSettings`, and the `systemSettings/*` keys `PeriodDimension` reads;
    - for the app: `me`, `apps`, `visualizations`, `maps`, and `analytics` for any view that asks.
- **`failOnMiss` stays on** (the default), so any request we didn't fake fails loudly instead of going to a server. A test asserts that a full demo session makes no network request.
- **Config**: inside the app, the shell's real config stays (the calendar `PeriodDimension` reads from `useConfig`, and the version): it's read once and sends no data. Tests without the shell provide a fake `systemInfo` (`calendar: 'iso8601'`) and user settings through app-runtime's config provider.
- **Tests**: Vitest and Cypress mount the workspace with the same demo providers and no app shell, as the Cypress mount already does. No login, no proxy.

## 7. Turning it on

- **Hidden behind a URL flag**: `?demo` turns it on, and removing it turns it off. There's no menu entry, so everyday users don't meet it.
- **The whole workspace goes demo**: every view is fake, and real and demo views are never mixed.
- The demo providers wrap the workspace inside the app shell. The shell and its header stay real (the user is logged in), but everything below them talks to the fake engine.
- **A banner stays visible** while it's on ("Demo data. Nothing here comes from the server."), so a screenshot can't pass for real data.
- **A preset workspace** loads with the flag: a map, a chart, a pivot table, and a period and an org unit selector, already linked. "Reset the demo" in the Workspace tab brings it back, so a demo never starts with a minute of dragging views around.
    - As built (`components/demo/demo-preset.ts`): the views are added as clicks add them, so they take the same places and sizes. The chart (ANC visits by month) and the map (malaria by district) sit side by side, the table (Penta 3 by chiefdom and quarter) goes under the chart, and the selectors form a bar across the top. A district clicked on the map filters the chart and the table; a month clicked on the chart sets the map's period and the table's quarter.
    - The workspace takes a preset as a prop (`WorkspacePreset`): it loads into an empty grid once the grid has its size, and the Workspace tab offers the reset under the preset's name. Resetting closes every view, which clears the channels too.
- **The demo code loads on demand**, with a dynamic `import()` only when the flag is set, so the normal app doesn't download it.
- **Nothing is saved**: demo workspaces never go to the dataStore. At most the browser's own storage keeps the current one.

## 8. Using it for specs and tests

- **Contract scenarios**, written once as Cypress tests against the fakes, in both profiles. For example:
    - "click a district on the map, and the trend chart shows that district";
    - "change the period selector, and every receiver redraws once";
    - "play mode waits for the slowest receiver".

    Under `released` some scenarios fail on purpose, and the failures are the list of what the PRs must change. The same scenarios run against the real plugins later, once they're served locally for the upstream branches ([interactions.md, checks for the PRs](interactions.md#checks-for-the-prs)).

- **`applyLinks` and the channels** are tested end to end with no mocks of our own code: only the plugin and the data engine are fake.

## 9. Limits of the approach

- **In-process first.** The fakes render inside the app, not in an iframe, so they don't copy `Plugin`'s transport: every prop re-sent when one changes, and new objects each time. A host bug in memoizing props could hide there. Later, a fake can run in an iframe through the same `Plugin` bridge, as a small extra entry in this repo.
- **Aggregate `dx`, `pe` and `ou` only.** No dynamic dimensions, event data, Earth Engine or Line Listing in the first version.
- **Not a second analytics app.** Crude visuals, a few chart types, one map layer type with data. Anything more waits for a real need.
- **Drift.** The fakes are only as good as the `released` profile. It's checked against the real plugins at each upstream release we care about.

## 10. Where it fits in the plan

- **Plan step 3, right after the grid, and before the real plugins (step 4).** The first demos are for people who need to see where the app goes, as soon as possible, and only the `proposed` profile shows clicks from maps, highlight and play mode. The real plugins then become the adapter's second implementation.
- Order, up to the first demo:
    1. Synthetic data in `src/modules/demo/`: org units with their shapes, periods, data items and values.
    2. The plugin adapter, with a fake visualization (column chart and pivot table) under the `proposed` profile.
    3. The fake map: one thematic layer ([map-layers.md](map-layers.md) option A), with boundaries drawn from the same shapes.
    4. Channels, `applyLinks` for `ou` and `pe`, period and org unit selectors with a short fixed list, and click-driven links ([interactions.md §7](interactions.md#7-order-of-work), item 2).
    5. The `?demo` switch, the banner, the lazy loading and the preset workspace ([§7](#7-turning-it-on)).
- After the first demo, as needed:
    - `loadDelay` and the period selector's play mode;
    - the `released` profile, to show what each upstream PR brings;
    - the fake data engine ([§6](#6-running-without-a-server)), when the real pickers run in demo mode (plan step 6, view settings);
    - the contract scenarios in Cypress ([§8](#8-using-it-for-specs-and-tests)).
- **Code layout** (following [Where helpers live](../CLAUDE.md#where-helpers-live-in-srcmodules)):
    - `src/modules/demo/`: the synthetic data, value formula, period resolution and capability profiles, pure and unit-tested;
    - `src/components/demo/`: the fake plugins and the demo providers;
    - `src/components/plugins/`: the plugin adapter (`PluginView`) and `PluginSourcesProvider`, which the demo fills with the fakes, its saved items, its selector lists (`modules/demo/selector-items.ts`) and its number of org unit levels; `src/modules/plugins/contract.ts`: the contract's props;
    - the links themselves are not demo code: `src/modules/interactions/` (`applyLinks`, the period helper, the channel rules), `src/store/interactions-slice.ts`, and `src/components/interactions/` (badges, channel names and colors, `useViewLinks`);
    - the `?demo` switch in `components/app/app.tsx` (`modules/demo/demo-flag.ts`), which loads `components/demo/demo-workspace.tsx` with a dynamic `import()`: without the flag, only the flag's check is downloaded.

## 11. Decisions and open questions

**Decided:**

- Demo mode lives **inside the real app**, behind the `?demo` flag, rather than as a separate build.
- **No public hosting**: demos are given from the app on a DHIS2 server.
- **Made-up map shapes**, not real boundaries.
- **Made-up names** too ("Demoland", districts North, West, East and South, and chiefdoms such as Amber Hills): real district names with invented numbers could pass for real health data. The data items keep the dev server's names (ANC 1st visit, Penta 3 coverage), which read like the real database.
- **A fixed demo date**, 31 August 2026: relative periods resolve against it.
- **Opening an item**: in demo mode a view's settings tab has a "Saved item" select over the demo's items; the real app gets `OpenFileDialog` in plan step 4.
- **Demo mode comes before the real plugins**, since the first demos show the vision ([§10](#10-where-it-fits-in-the-plan)).
- **The first fakes read synthetic data directly**, without a fake data engine ([§6](#6-running-without-a-server)).

**Open**: none.
