# Embedding the analytics plugins

- **Status**: research, September 2026, against DHIS2 2.44-SNAPSHOT (DV 101.6.3, Maps 101.17.3, LL 102.4.1) and app-runtime 3.17.4. The single source for plugin behavior: other docs link here.
- **Related**: [interactions.md](interactions.md) (the links and the upstream contract), [demo-mode.md](demo-mode.md) (fakes that copy these limits), [view-settings.md](view-settings.md).

What the DV, Maps, Line Listing (LL) and Event Visualizer (EV) plugins accept when this app embeds them, and what that means for plan step 3, "Render plugins". Two sources:

- **A live spike**: real DV and Maps plugins mounted with `Plugin` from `@dhis2/app-runtime/experimental` on the dev server, fed objects fetched with the dashboard's field lists, then rewritten in place. It was throwaway code, not kept.
- **A read of the code** on each repo's default branch ([Sources](#sources)).

## 1. How `Plugin` passes props

- Props cross the iframe through post-robot. **Callbacks cross too**: a function prop becomes a call back into the host.
- **If any prop changes identity, all props are re-sent**, and the plugin receives new objects each time. DV then refetches analytics, and Maps rebuilds its config. So the host must keep every prop stable per view (`useMemo`, `useCallback`): an inline callback alone makes DV refetch.
- **`width` and `height` size the iframe; they aren't sent to the plugin.** There is no `onResize`: the plugins follow resize events inside their iframe. In the spike, 20 size changes in a second (like dragging a divider) resized all 4 plugins with no reload and no error.
- **`pluginLaunchUrl`** in `/api/apps` exists from DHIS2 2.39 (DHIS2-13710). DV, Maps and LL build a `plugin.html`. The dashboard has no app key for Maps and always uses the `dhis-web-maps/plugin.html` path.

## 2. Plugin by plugin

|                         | DV                                             | Maps                                             | Line Listing                        | Event Visualizer                              |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------ | ----------------------------------- | --------------------------------------------- |
| Object it uses          | the one passed                                 | the one passed                                   | the one passed, **frozen at mount** | fetched **by id**, once on mount              |
| A new object in place   | refetches and redraws, same iframe             | redraws only if `didViewsChange` says so (below) | ignored; remount to change          | ignored                                       |
| Unsaved object (no ids) | renders                                        | renders                                          | not tested                          | no (needs an id)                              |
| Props it reads          | 9 (below)                                      | `visualization` only                             | `visualization`, `filters`          | `visualization`, `displayProperty`, `filters` |
| `filters` it applies    | `relativePeriodDate`, `userOrgUnit`            | none on the plugin path                          | `relativePeriodDate`                | `relativePeriodDate`                          |
| Callbacks to the host   | `onDrill` (org units)                          | none                                             | none                                | none                                          |
| Load signal             | none: the wrapper swallows `onLoadingComplete` | none                                             | none                                | none                                          |

### DV

- **Its wrapper passes through only 9 props** (`VisualizationPluginWrapper.jsx`): `displayProperty`, `visualization`, `filters`, `forDashboard`, `id`, `isInModal`, `style`, `onChartGenerated` and `onDrill`.
- **The wrapper keeps `onLoadingComplete` for itself**, to drive its own loading state. So a host never learns when a view has finished loading; the spike never received it.
- **`onDrill` works, but only for some views.** It fires for pivot table cells and bar and column charts, and a chart click finds the org unit by name. The payload is `{ ou: { id } }` to drill up and `{ ou: { id, path, level } }` to drill down, and **`level` is the level's UID, not a number**.
- **A new `visualization` refetches and redraws in the same iframe.** In the spike, period and org unit rewrites updated both the chart and the pivot table, with no iframe reload.
- **Never pass `onChartGenerated`**: it hands the whole Highcharts chart object across the iframe.

### Maps

- **It reads only `visualization`.** The plugin forwards `displayProperty` too, but `MapContainer` ignores it, and layers use the user setting.
- **Whether a new object redraws is decided by `didViewsChange`** (`src/util/pluginHelper.js`). It compares only the items of each view's `filters` and `rows`, position by position:
    - **a changed data item isn't seen**, because a thematic layer keeps `dx` in `columns`;
    - **style changes aren't seen**: color scale, classes, opacity, radius, labels…;
    - Earth Engine layers are skipped, and so are date ranges (`startDate`, `endDate`) and `relativePeriodDate`;
    - **a map that gains a layer crashes the plugin** ("Cannot read properties of undefined (reading 'layer')"); one that loses a layer sees nothing.
- **When a change is seen, Maps applies the whole new object.** In the spike, changing the data item and the style showed nothing; the next period change then redrew the map with all three changes.
- **Every accepted change rebuilds the map from scratch.** While layers reload, `plugin/Map.jsx` unmounts `MapView`, so the user's zoom and pan are lost.
- **Clicks stay inside the plugin**: left click opens a popup, and right click opens the drill menu, which only changes the layer internally.
- **Relative periods**: the thematic loader reads `relativePeriodDate` from each map view (`thematicLoader.js`), so the host can set it there without an upstream change. Since `didViewsChange` ignores it, a change takes effect only on a remount.

### Line Listing and Event Visualizer

- **Line Listing uses the object the host passes, but freezes it when it mounts.** So `ou` and `pe` links reach it through a remount (a new iframe); only `filters.relativePeriodDate` updates live.
- **Event Visualizer fetches by id**, once on mount, and shows "Filters are not applied" for any `filters` key except `relativePeriodDate`.
- **The newer EV dashboard plugin** (dashboard-app#3344, open, DHIS2 2.43+) receives `visualizationId` plus `filters` and applies the filters itself. It expects the app key `individual-data-visualizer`.

## 3. Cost

- 4 plugins at once (2 DV, 2 Maps), with bundles cached: every plugin was ready within about 0.9 s of its object arriving.
- **A remount** (new iframe, warm cache): ready in 0.8–1.0 s for all 4. So remounting Maps as a fallback costs about a second per change, plus the zoom and pan.
- Uncompressed entry bundles: DV `plugin.html` about 650 KB (about 0.7 s to load), Maps about 3.4 MB, 2.6 MB of it `maps-gl` (about 0.8 s). A second iframe of the same plugin comes from the cache, but still parses and runs its own copy.
- **Not measured**: memory, and the CPU cost on the app's main thread. In the spike the plugins came from another site than `localhost`, so Chrome ran them in their own processes. In production they're served from the same server as the app, so they may share its process and main thread. Measure this on a deployed build.

## 4. What this means for the app

- **One stable set of props per view**: memoize the object and every callback. Rewrite a view's object only when its own links change, never on unrelated renders.
- **DV** takes links as object rewrites, in place. Use `onDrill` as the interim org unit sender, with the level as a UID.
- **Maps** takes `ou` and `pe` links in place when they sit in `filters` or `rows`, which is where they are in thematic layers. Everything else needs a **remount** (a new `key`, so a new iframe) until the [Maps PR](interactions.md#maps-pr-maps-app):
    - a changed data item;
    - a style edit from the map editor;
    - a period on an event layer (`startDate`, `endDate`), or a changed `relativePeriodDate`;
    - adding or removing a layer, which would otherwise crash the plugin.
- A remount for a content change is deliberate. The workspace itself must never remount a view when it moves, which `renderer: 'always'` guarantees ([workspace-grid.md §7](workspace-grid.md#7-iframes-and-pointer-events)).
- **Line Listing** receives `ou` and `pe` links by remounting, and `relativePeriodDate` in place.
- **No plugin gives a load signal**, so the period selector's play mode steps on a fixed delay until the upstream PRs add `onLoadingComplete`.
- **The upstream contract** (`onDataClick`, `highlight`, `onLoadingComplete`), including what this research found, is in [interactions.md §6](interactions.md#6-upstream-prs).
- The fake plugins in [demo-mode.md](demo-mode.md) copy these limits in their `released` profile. When a real plugin changes, update this doc first, then the demo's table.

## 5. Upstream activity

As of September 2026, nothing upstream proposes click callbacks, cross-filtering or highlight.

- **dashboard-app#3344** (open, DHIS2-21962): the EV plugin with `visualizationId` plus `filters`, see above.
- **dashboard-app#3264**: plugin developer docs, including the `dashboardItemFilters` shape `{ ou: [{ id, name, path }], pe: [...] }`. Our `filters` and click payloads should reuse it.
- **maps-app data table series** (#3714–#3769, DHIS2-21456): map and table selection sync, which a `highlight` prop could build on.
- JIRA: DHIS2-8768 (period drill in pivot tables, To do) and DHIS2-18723 (feedback when a custom plugin doesn't support filtering, To do).

## Sources

- app-runtime 3.17.4: `services/plugin/src/Plugin.tsx`; app-platform: `shell/src/PluginLoader.jsx`.
- data-visualizer-app: `src/components/VisualizationPlugin/VisualizationPluginWrapper.jsx`, `src/components/VisualizationPlugin/ContextualMenu.jsx`.
- analytics: `src/visualizations/config/adapters/dhis_highcharts/plotOptions.js`.
- maps-app: `src/components/plugin/{Plugin,MapContainer,Map}.jsx`, `src/util/pluginHelper.js`, `src/loaders/thematicLoader.js`, `Layer.js` (`onFeatureRightClick`).
- line-listing-app: `src/components/Visualization/VisualizationPluginWrapper.jsx`.
- event-visualizer-app: `src/dashboard-plugin.tsx`.
- dashboard-app: `src/components/Item/VisualizationItem/Visualization/{IframePlugin.jsx,getFilteredVisualization.js}`, `src/api/metadata.js` (`getFavoriteFields`, `getMapFields`).
- dhis2-core: commit d29b2e89 (`pluginLaunchUrl`, DHIS2-13710).
- Dev server (GET only): `/api/apps`, `/api/system/info`, `/api/visualizations`, `/api/maps`.
