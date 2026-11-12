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
- **Periods**: ISO weeks, months, quarters and years for the two years before a fixed demo date, each a range of days (`modules/demo/calendar.ts`, `periods.ts`). Relative periods (weeks included) are resolved against that date, so demos don't change with the real date.
- **Data items**, collected and aggregated as DHIS2 does it, so the demo shows what linking periods runs into (`data-items.ts`):

    | Item                                                              | Collected                                                                  | Aggregation             |
    | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------- |
    | ANC 1st visit, ANC 4th visit                                      | monthly                                                                    | `SUM`                   |
    | Malaria cases confirmed                                           | weekly in North and West, monthly in East, South                           | `SUM`                   |
    | Penta 3 doses given                                               | monthly                                                                    | `SUM`                   |
    | Malaria vaccine 3rd doses given                                   | monthly                                                                    | `SUM`                   |
    | Population under 1 year, total population                         | yearly                                                                     | `AVERAGE_SUM_ORG_UNIT`  |
    | Antimalarial (ACT) stock on hand                                  | monthly                                                                    | `LAST`                  |
    | Penta 3 coverage <1y, malaria vaccine 3 coverage <1y (indicators) | doses ÷ population under 1 × 100, annualized, with the coverage legend set | —                       |
    | Malaria incidence per 1,000 (indicator)                           | cases ÷ total population × 1,000, annualized                               | —                       |
    | Precipitation (ERA5-Land)                                         | monthly, at every level, as the climate app imports it                     | `SUM`                   |
    | Air temperature, Max and Min air temperature (ERA5-Land)          | monthly, at every level, as the climate app imports it                     | `AVERAGE`, `MAX`, `MIN` |

- **Values**: a seeded formula per data element, chiefdom and period it's collected in (`values.ts`): a base per district, a season, a slow trend, and noise from the ids.
- **Climate**: monthly surfaces of precipitation and temperature (mean, max, min) over the land (`climate.ts`), the West African coast's pattern: a rainy season from May to October, heaviest in August and on the south-west coast; the hottest months at the end of the dry season, the inland north-east warmer. An org unit's value is the surface's mean over its land cells, as the climate app's import reduces a raster over an area, so each level holds its own values. The climate data elements name the raster layer, band and style they came from (`importedFrom`), which DHIS2 doesn't keep: a proposal, so a raster map can follow a data pick ([interactions.md, raster layer periods](interactions.md#raster-layer-periods)).
- **A public health story** the values tell together, checked against published figures for a coastal West African country where malaria is endemic all year: malaria weighs most where routine services reach fewest children.
    - Malaria incidence is about 300 per 1,000 a year nationally, from about 150 in North to about 520 in South; it rises by about a fifth with the rains from May and peaks in June.
    - Penta 3 coverage meets the 80% target in North and West and falls short in every chiefdom of East and South. The malaria vaccine, given at the same routine visits, follows it a few points lower.
    - Antimalarial stock is kept at about 3 months of cases and runs down after the peak, to under a month in South in July.
    - `modules/demo/story.ts` works out the facts the tour states, and its test checks them.
    - Climate: South is the wettest district (about 3,100 mm over the last 12 months), August the wettest month, and the rainy season brings more than 80% of the year's rain; the rainy months are the coolest. `climate-story.ts` works these out for the climate tour, and its test checks them.
- **Colors**, only what DV and Maps draw, so an item looks the same in every view: DV's default color set for series; Maps' YlOrBr scale (5 classes), no-data gray `#cccccc` and 90% opacity for thematic layers; a coverage legend set in WHO AFRO's bands (< 50, 50 – 79, 80 – 89, ≥ 90%), which colors the coverage cells of tables (DV's `legend`, by data item) and coverage maps.
- **Aggregation**, following what tests on 2.43 and 2.44 servers showed (`aggregation.ts`):
    - a period takes the stored values whose period has its middle day in it, and is no longer than it: a week counts in the month holding most of its days, and **a monthly value is never split into weeks**;
    - `SUM` adds up; `LAST` takes the latest; `AVERAGE_SUM_ORG_UNIT` weighs by days, so **the yearly population repeats into every shorter period**;
    - places add up; the indicator divides its parts' totals and scales to a year;
    - climate data is stored at every level, as the climate app advises: each org unit reads its own values, and the aggregation type combines the months, then the org units asked together (`SUM` adds, `AVERAGE` takes the mean, `MAX` and `MIN` the extremes).
    - So weeks sent to a monthly view give no data, and a weekly view of the whole country leaves East and South out. The fakes say why (`period-check.ts`, `components/demo/period-notices.tsx`): "No weekly values for ANC 1st visit, which is collected monthly", as the proposed `@dhis2/analytics` feature would let DV and Maps say it.
- **Demo items**: a few saved-looking visualizations and maps built from these, so "Open a saved item" has something to open. Two of the maps are raster layers, as Maps saves them (`layer: 'earthEngine'`, the dataset, band, style and period in `config`): precipitation in Maps' default style, and temperature on a range that fits the tropics (20 to 34 °C).
- **Raster layers** in the fake map (`raster-layer.ts`, `components/demo/fake-raster.tsx`), as Maps draws them: the month's raster in the legend's steps, at 90% opacity, within the layer's org units (as Maps clips it to the boundaries), precipitation hiding the land with none; the layer's org units as outlines over it, which take clicks, right-clicks and highlight as thematic features do, and give their mean on hover; and the legend with the unit. A highlighted place keeps its raster bright inside a dark outline, and the raster fades outside it.
- **Chart colors and types**: the fake charts use DV's color sets (`DEFAULT`, and `DARK` for the climate charts), copied from `@dhis2/analytics` `colorSets` and checked against them in a test. A climate data element names how to chart it and its color (`chartStyle`, a proposal: [interactions.md, data](interactions.md#data-dx)): precipitation in blue columns, temperature in a red line, so a data pick switches a chart's type too, and its color when it draws one series.
- **An axis lock** on the fake column and line charts, as the map's legend lock: off by default ("Follows data"); "Fixed" keeps the axis as it is, so a district with fewer cases shows lower, and "Refit" fits it to the data shown. A value over the kept axis gets a mark at the top. A proposal for DV ([interactions.md, DV PR](interactions.md#dv-pr-dhis2analytics--data-visualizer-app)).

## 6. Running without a server

- **First version: a small fake data engine.** The fake plugins read the synthetic data directly from `src/modules/demo/`, and the demo's drop-down selectors offer a short fixed list from it. `DemoDataProvider` answers only what the org unit tree asks for (`organisationUnits/{id}`, `answerOrgUnitRequest`); the full data engine below comes when the real pickers run in demo mode.
- **Data engine**: demo mode wraps the workspace in app-runtime's `CustomDataProvider`. Each resource the app and the pickers ask for is a function over the synthetic data:
    - for the pickers: `dataItems`, `indicators`, `indicatorGroups`, `dataElements`, `dataElementGroups`, `organisationUnits`, `organisationUnitLevels`, `organisationUnitGroups`, `dimensions`, `configuration/dataOutputPeriodTypes`, `userSettings`, and the `systemSettings/*` keys `PeriodDimension` reads;
    - for the app: `me`, `apps`, `visualizations`, `maps`, and `analytics` for any view that asks.
- **`failOnMiss` stays on** (the default), so any request we didn't fake fails loudly instead of going to a server. A test asserts that a full demo session makes no network request.
- **Config**: inside the app, the shell's real config stays (the calendar `PeriodDimension` reads from `useConfig`, and the version): it's read once and sends no data. Tests without the shell provide a fake `systemInfo` (`calendar: 'iso8601'`) and user settings through app-runtime's config provider.
- **Tests**: Vitest and Cypress mount the workspace with the same demo providers and no app shell, as the Cypress mount already does. No login, no proxy.

## 7. Turning it on

- **Hidden behind a URL flag**: `?demo` turns it on, and removing it turns it off. There's no menu entry, so everyday users don't meet it. A value names a tour to start on every visit, so a link can open one: `?demo=malaria`, `?demo=climate` or `?demo=how-it-works`.
- **The whole workspace goes demo**: every view is fake, and real and demo views are never mixed.
- The demo providers wrap the workspace inside the app shell. The shell and its header stay real (the user is logged in), but everything below them talks to the fake engine.
- **A banner stays visible** while it's on ("Demo data. Nothing here comes from the server."), so a screenshot can't pass for real data.
- **A preset workspace** loads with the flag: a map, a chart, a pivot table, and a period, an org unit and a data selector, already linked. "Reset the demo" in the Workspace tab brings it back, so a demo never starts with a minute of dragging views around.
    - As built (`components/demo/demo-preset.ts`): the views are placed in the order the story reads, then sized evenly once the tools strip is folded. The selectors in a column on the left (the period as a timeline at the top, the org unit tree taking the rest, the data drop-down at the bottom), then the map (malaria incidence by district), the chart (malaria incidence by district and month) on the right, and the table (malaria vaccine 3 coverage by chiefdom over the last 4 quarters: one data item, so a pick in the data selector replaces it) under the chart. The chart and the table name chiefdoms with their district ("South / Juniper"), and so does the map; the incidence map labels each unit with its own name. The preset hides view headers, for less on screen. A district clicked on the map shows its chiefdoms in the chart and the table; a month clicked on the chart sets the map's period. The chart and the table follow the period with _Highlight only_: a month from the timeline or play is marked on the chart's 12 months with a dashed line, and in the table the quarter holding it keeps its colors while the others fade, its header in bold. Neither is cut to one period. A data item picked in the data selector shows on the map, in the table and in the chart.
    - A climate layout too, which the climate tour loads: a column of selectors (the data drop-down at the top, then the timeline, then the org unit tree), then a raster map of precipitation, a column chart by month for the place picked (`Climate by month`) on its right, and a table of precipitation by chiefdom and month under the chart. The map keeps every district and marks the place (_Highlight only_ for org units); the chart shows the place itself, and the table its chiefdoms; both mark the month. A data pick switches all three. The workspace keeps the preset loaded last, and "Reset the demo" brings that one back.
- **Three guided tours** (`components/demo/tour/`, with driver.js in the demo's lazy code), from the banner's "Take a tour: Malaria story · Climate story · How it works", links in the banner's own color:
    - **Malaria story** (10 steps): where, when and why malaria weighs most, with numbers from the data, ending on what linked views save. A click on South makes every view answer for it; a drill down on the map then shows South's chiefdoms on the districts' classes, all in the top one, before the chart and the table show why. It starts by itself on a browser's first demo visit.
    - **How it works** (13 steps): the view headers (shown again early, hidden again at the end), the views and the tools, what a channel is, the org unit channel followed from the tree and the map to the chart and the table, the period channel in passing, play on the timeline, and Reset.
    - **Climate story** (10 steps): the climate app's Explore section in linked views. South picked in the tree, as in Explore's left panel; its precipitation by month, as Explore's Precipitation tab; the raster across the country; Air temperature picked in the data selector, as Explore's tabs, with the map, the chart and the table all switching (the chart to a red line); then what Explore can't do: a second map from Add views, which leaves the data channel to keep temperature, the table turned into a temperature chart (mean, max and min) through its settings tab's saved item, and the timeline playing by itself, both maps and both charts in view. It ends on climate and health data side by side.
    - Each starts from its preset (it resets the demo first). When the user changed anything since the demo loaded (a view, a pick, a setting), a tour asks before that reset ("Start the tour?"), and Cancel leaves the workspace as it is. At the steps that ask for a click on South (on the map, or in the tree for the climate tour), a drill down into it, or a data item, the user's own click moves the tour on, or Next does it for them: a ring shows where the tour clicks before the click lands, and a drop-down opens to show the pick. The map and the chart the climate tour adds go away on Back; a workspace already full refuses the map, and the tour doesn't try again. For the drill, Next right-clicks South and then picks "Drill down into South" in the map's menu, as the user would. A step's highlighted view takes the clicks its text invites (a pick in the org unit selector, a month on the chart, the map's drill menu), except Reset. A step that shows a tools tab opens the tools strip, which fits the tab. Every scroll stays as it was, so the workspace never slides under its headers. Closing a tour on the way clears its selection, takes away what it added, and folds the tools strip again; ending it leaves the workspace as its last step shows it, to go on from there.
- **A basemap** under the data (`modules/demo/basemap.ts`, `components/demo/fake-basemap.tsx`): Demoland is an island, with a continent (Ostland) across a strait to the north and east, seas, rivers, roads and towns, in the pale colors of a light basemap. The island's own land is drawn too, so a map of some units only still shows the rest of the island.
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
- **Aggregate `dx`, `pe` and `ou` only.** No dynamic dimensions, event data or Line Listing in the first version. Raster layers draw the demo's climate surfaces only.
- **Not a second analytics app.** Crude visuals, a few chart types, two map layer types with data (thematic and raster). Anything more waits for a real need.
- **The data selector offers every data item**, health and climate alike: choosing what a selector offers isn't built yet. A pick with no raster layer leaves a raster map as it is.
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
    - `src/components/plugins/`: the plugin adapter (`PluginView`) and `PluginSourcesProvider`, which the demo fills with the fakes, its saved items, its selector lists (`modules/demo/selector-items.ts`), its number of org unit levels and its data items' legend sets; `src/modules/plugins/contract.ts`: the contract's props;
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
- **The data tells one public health story** (2026-11-06), checked against published figures, so the views make sense together and the tour can tell it ([§5](#5-synthetic-data)).
- **Colors only from what DV and Maps draw** (2026-11-06), so the real plugins will look like the demo, and an item keeps its colors across views through its legend set.
- **Guided tours with driver.js** (2026-11-06): MIT, no dependencies, about 9 KB gzipped, framework-free so it works on dockview's views. intro.js and Shepherd are AGPL-3.0; react-joyride is heavier; @reactour had no release since May 2025. Two tours: one that sells (the story), one that explains (how it works).
- **Demoland is an island** (2026-11-06), with a made-up continent across a strait, so the basemap can show it whole.
- **Org units named with their hierarchy in the table**, through DV's `showHierarchy`, but without the country (2026-11-06): "South / Juniper". DV starts from the top ("Sierra Leone / Kenema / Gorama Mende"); the demo's one made-up country adds nothing there.

**Open**: none.
