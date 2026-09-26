# View settings

- **Status**: §1 research (September 2026, `@dhis2/analytics` 29.8.1) · §2–7 proposal. Plan step 4.
- **Related**: [interactions.md](interactions.md) (how views drive each other), [map-layers.md](map-layers.md) (the map editor's scope), [plugins.md](plugins.md), [selector-controls.md](selector-controls.md).

Every view has a settings tab in the tools strip. This doc covers what that tab does for maps and visualizations (picking a saved item, creating one in the app, editing it and saving it), plus the pickers selectors use. Scope: aggregate data first, so DV visualizations, and maps with thematic, org unit (boundary), facility and Earth Engine layers.

## 1. What exists upstream

### The plugins render objects that were never saved

- **DV plugin**: it fetches its data from the visualization's content (`dx`, `pe`, `ou` in columns, rows and filters), not from an id. An object built in the app renders as is, and a changed one updates in place (checked live, [plugins.md](plugins.md#dv)).
- **Maps plugin** (`MapContainer`): when the object has `mapViews`, it uses them directly; with only an `id`, it fetches the map first. An object built in the app renders as long as it has its `mapViews`.
- So a view's object doesn't have to exist on the server. That's what makes "create in the app" possible without saving anything.

### What `@dhis2/analytics` offers

The dimension pickers that DV, Maps and Line Listing show in their dialogs all come from `@dhis2/analytics`, as their imports confirm ([Sources](#sources)).

- **Versions**: DV and Maps use `^29.5.5`, Line Listing `^29.4.1`; the latest in September 2026 is 29.8.1. Its peer dependencies match ours (`@dhis2/app-runtime` 3, `@dhis2/ui` 10, React 18, `styled-jsx` 4).
- **The pickers are panel content, not dialogs.** Each app puts them in its own modal or tab:
    - DV: one modal per dimension (`DimensionsPanel/Dialogs/DialogManager.jsx`);
    - Maps: tabs in each layer dialog;
    - LL: `Dialogs/DialogManager.jsx`.
- **They fetch their own items** through app-runtime (`useDataQuery`, `useDataEngine`, `useConfig`), so they only need the app shell's providers. Our RTK Query rule covers our own code, not the library's. `PeriodDimension` reads the system calendar from `useConfig`, so non-Gregorian calendars work.

| Picker             | DV                             | Maps                                                                                                            | LL                                |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `DataDimension`    | data (`dx`)                    | thematic layer, with `maxSelections={1}`                                                                        | —                                 |
| `PeriodDimension`  | periods (`pe`)                 | thematic and event layers                                                                                       | period dimensions                 |
| `OrgUnitDimension` | org units (`ou`)               | every layer with org units (`OrgUnitSelect`): thematic, event, facility, tracked entity, org unit, Earth Engine | org unit dimension and conditions |
| `DynamicDimension` | other dimensions               | —                                                                                                               | other dimensions                  |
| `DimensionsPanel`  | the list of dimensions to drag | picking a dimension for a filter                                                                                | —                                 |

Their main props (from their `propTypes`):

- `DataDimension`: `selectedDimensions`, `onSelect`, `enabledDataTypes`, `maxSelections`, `visType`, `onCalculationSave` (calculations), `displayNameProp`, `height`.
- `PeriodDimension`: `selectedPeriods`, `onSelect`, `excludedPeriodTypes` (from the system's hidden periods), `infoBoxMessage`, `rightFooter`, `height`.
- `OrgUnitDimension`: `roots`, `selected`, `onSelect`, `hideUserOrgUnits`, `hideLevelSelect`, `hideGroupSelect`, `warning`, `displayNameProp`.
- `DynamicDimension`: `dimensionId`, `dimensionTitle`, `selectedItems`, `onSelect`, `rightFooter`.
- `DimensionsPanel`: `dimensions`, `selectedIds`, `onDimensionClick`.

The rest of what the library offers:

- **`OpenFileDialog`**: the "Open" dialog, for `visualization`, `map` and `eventVisualization` items. It has search, a created-by filter, a vis type filter (`filterVisTypes`), paging, `onFileSelect(id)` and `onNew`. The apps get it through the library's `FileMenu`, which also brings `SaveAsDialog`, `RenameDialog`, `DeleteDialog`, `GetLinkDialog` and `TranslationDialog`.
- **`VisualizationOptions`**: the options modal's frame (tabs, update and close), filled from an `optionsConfig` the app provides.
- **Layout helpers**: `layoutGet*`, `layoutReplaceDimension`, `dimensionCreate`, `getAdaptedUiLayoutByType`, `getLayoutTypeByVisType`, and the `VIS_TYPE_*` constants with their names and icons (`VisTypeIcon`).
- **Period constants** (`DAILY`, `WEEKLY`, `MONTHLY`…), which Maps and DV use for period types.

So the selectors in [interactions.md](interactions.md) get their pickers from the same place: the period selector from `PeriodDimension`, the org unit selector from `OrgUnitDimension`, the data selector from `DataDimension`, and dynamic dimension selectors from `DynamicDimension`.

### What is not reusable

- **DV**:
    - the layout panel (dragging dimensions between columns, rows and filter, `src/components/Layout/`);
    - the vis type selector (`VisualizationTypeSelector`);
    - the options themselves: every section and control of the options modal (`src/modules/options/`, `src/components/VisualizationOptions/`).
- **Maps**: the layer dialogs (`ThematicDialog`, the Earth Engine, event and facility dialogs, `LayerEdit`), and around the pickers: the start and end dates, the classification and legend, the style, and the associated geometry and selection mode of `OrgUnitSelect`. The pickers inside the dialogs are the library's.

### Handing off to the full apps

- **DV** opens a work-in-progress object: the caller writes it to the user data store (namespace `analytics`, key `currentAnalyticalObject`) and opens `dhis-web-data-visualizer/#/currentAnalyticalObject`. The user can then use every DV option and save there.
- **Maps** has the same route, but it expects a DV-style object and turns it into one thematic layer. So a map with several layers can't be handed over unsaved; it has to be saved first and opened by id (`dhis-web-maps/#/<id>`).

### What the dev server holds

- **277 visualizations**. The types that matter:
    - pivot table 130, column 87, line 17, pie 13, stacked column 10;
    - gauge 6, bar 4;
    - a few year-over-year, scatter, single value, area and radar.
- **93 maps**. Their layer counts, and what their layers share, are in [map-layers.md §1](map-layers.md#1-what-the-dev-server-holds). Layers are named:
    - `thematic`, plus legacy numbered names (`thematic1`, `thematic2`);
    - `boundary` (the old name of `orgUnit`) and `orgUnit`;
    - `facility`, `earthEngine`, `event` and `external`;
    - so the editor must recognize the legacy names.
- The admin user has `F_VISUALIZATION_PUBLIC_ADD` and `F_MAP_PUBLIC_ADD`, so saving public items is possible there.

## 2. Model: where a view's object comes from

A view holds one of two things:

- **A saved item**: `{ source: 'saved', type, id }`.
    - It is fetched with the dashboard's field lists (dashboard-app `getFavoriteFields`, `getMapFields`).
    - It is refetched when the workspace opens, so changes made in DV or Maps show up.
- **A local object**: `{ source: 'local', object }`.
    - Built in the app and stored with the workspace (plan step 6, persistence). It is not on the server.
    - The plugin gets it directly.

Editing a saved item in the app turns it into a local copy that remembers where it came from ("Modified from ANC coverage"). Its ⋯ menu then offers:

- **Save**: write it back (`PUT`), when the user can write the item.
- **Save as**: a new item (`POST`), and the view points to it.
- **Revert**: back to the saved item.

The object passed to the plugin is always the view's base object with the links applied on top (`applyLinks`, [interactions.md §4](interactions.md#4-model-channels)). Links are never saved into the base object.

## 3. UI: the settings tab

The tools strip is short (132px at the top). The tab shows a compact summary as **chips** (small buttons that each open a picker), and the pickers open in modals, as in DV.

### An empty view

Its settings tab and its placeholder both offer two actions:

- **Open a saved visualization / map…** (`OpenFileDialog`, filtered to the view's type).
- **Create a new one**, which fills the view with a sensible default ([§4](#4-the-visualization-editor), [§5](#5-the-map-editor)) that the user then adjusts.

### A visualization

One row:

```
[Column ▾]  [Data: 3 items]  [Period: Last 12 months]  [Org unit: Sierra Leone]  [Layout ▾]  [⋯]
```

- Each chip opens its picker (`DataDimension`, `PeriodDimension`, `OrgUnitDimension`) in a modal.
- Layout: which of data, period and org unit go to columns, rows and filter, preset per type (`getAdaptedUiLayoutByType`).
- The ⋯ menu:
    - Save, Save as, Revert ([§2](#2-model-where-a-views-object-comes-from));
    - Replace with a saved visualization…;
    - Open in Data Visualizer (by id, or through `currentAnalyticalObject` for a local object).

### A map

One row of layer chips, top layer first. How many layers the first version allows is still open ([map-layers.md](map-layers.md)); the example shows several:

```
[Thematic: ANC 1st visit ▾]  [Facilities ▾]  [Boundaries ▾]  [+ Add layer]  [Basemap: OSM Light ▾]  [⋯]
```

- A layer chip opens that layer's editor ([§5](#5-the-map-editor)) in a modal. Its menu also has show/hide, move up/down and remove.
- Layers the app can't edit (Earth Engine, event, external) show as read-only chips with "Edit in Maps".
- The ⋯ menu matches the visualization's; "Open in Maps" needs the map to be saved ([§1](#handing-off-to-the-full-apps)).

### Selectors

A selector's settings tab holds its dimension, its control (drop-down, radio group, tree… see [selector-controls.md](selector-controls.md)), its channel ([interactions.md §5.4](interactions.md#54-where-the-wiring-is-set-no-separate-tab)), and the values it offers, chosen with the same pickers:

- the period selector: `PeriodDimension`;
- the org unit selector: `OrgUnitDimension`;
- the data selector: `DataDimension`;
- a dynamic dimension selector: `DynamicDimension`.

These pickers set which values a selector offers, not a view's content.

## 4. The visualization editor

- **Types**:
    - column, stacked column, bar, line, pie, single value and pivot table cover about 95% of the dev server's items;
    - other types open and render when saved, and are edited in DV.
- **New visualization**: a column chart with no data yet, last 12 months, and the user's org unit. The Data chip is highlighted until data is picked.
- **Options**: only the title in the app. Everything else (legends, axes, sorting, totals…) is edited in DV through the hand-off, and kept as is when the object comes back.
- **Validation**: DV's rules (e.g. pie takes one data item). `getAdaptedUiLayoutByType` covers most; the rest are small checks in the app, unit-tested.

## 5. The map editor

Which layers a map may combine depends on [map-layers.md](map-layers.md).

- **Thematic layer**:
    - one data item; a period (or a start and end date);
    - org units with levels and groups (`OrgUnitDimension`);
    - choropleth or bubble;
    - a classification (equal intervals, equal counts, or a predefined legend set) and a color scale.
- **Org unit (boundary) layer**: org units with levels, and the line color and label.
- **Facility layer**: org units, a group set for icons, and labels.
- **Earth Engine**: saved maps only in the first version; the dataset, band, period and aggregation settings are edited in Maps. It's a candidate for a later editor.
- **Event layers**: out of scope (aggregate data first).
- **Timelines and split views** are not offered ([interactions.md §2](interactions.md#period-pe)); the period selector's play mode replaces them.
- **New map**: OSM Light basemap and no layers. "+ Add layer" opens a short list (Thematic, Boundaries, Facilities).
- **Until the Maps PR, edits show through a remount.** The Maps plugin doesn't redraw for a new data item, a style change or an added layer (an added layer crashes it), so each such edit remounts the view: about a second, and the zoom is lost. Period and org unit edits update in place ([plugins.md](plugins.md#maps)).
- The app builds `mapViews` in the shape the Maps plugin expects. The reference is maps-app `validateThematicLayer` and `initializeThematicLayer`, and the fields of the saved maps above.

## 6. Saving, access and sharing

- **Save as** creates a visualization (`POST /api/visualizations`) or a map (`POST /api/maps`) with `SaveAsDialog`. It needs the add authorities.
- **Save** writes back with `PUT` when the item's `access.write` is true; otherwise only Save as is offered.
- **A saved item the user can't read**, e.g. in a workspace shared with them, shows a "No access to this item" placeholder instead of an error.
- **A deleted saved item** shows "This item no longer exists", with Replace…
- Local objects travel with the workspace, so sharing a workspace shares them.

## 7. Order of work

1. **Pick a saved item**: `OpenFileDialog` for maps and visualizations, fetched with the dashboard's fields and rendered by the plugins. Do it with plan step 3 ("Render plugins"), which needs saved items to show anything.
2. **Hand-offs**: Open in DV or Maps by id, and Replace…
3. **Visualization editor** with local objects, then Save as. Includes the DV hand-off of a local object through `currentAnalyticalObject`.
4. **Map editor**: thematic, boundaries, facilities, within the scope chosen in [map-layers.md](map-layers.md).
5. **Modified saved items**: Save, Revert.
6. **Later**: an Earth Engine editor, event layers, and Line Listing and Event Visualizer items. EV fetches by id, so saved items only; LL uses the object passed, but unsaved LL objects are untested ([plugins.md](plugins.md#line-listing-and-event-visualizer)).

In demo mode the pickers get their items from synthetic data ([demo-mode.md §6](demo-mode.md#6-running-without-a-server)).

## 8. Open questions

- **Layers per map**: one layer, or layers sharing one period and one org unit area, in the first version ([map-layers.md](map-layers.md)).
- **`@dhis2/analytics` in the bundle**: DV, Maps and the dashboard all use it, so it's the expected choice, but check its size in our build.
- **New views local or saved by default**: local is proposed, so trying things out doesn't clutter the server.
- **How many DV options to bring into the app** before the hand-off is enough.
- **Upstream**: ask whether maps-app could export its layer dialogs, which would replace most of [§5](#5-the-map-editor).
- **Room**: whether the settings tab should grow the tools strip while it's open, or keep modals only.

## Sources

- data-visualizer-app: `src/modules/currentAnalyticalObject.js`, `src/components/App.jsx` (`#/currentAnalyticalObject`), `src/components/VisualizationPlugin/VisualizationPlugin.jsx`.
- maps-app: `src/components/plugin/MapContainer.jsx`, `src/components/app/useLoadMap.js`, `src/util/analyticalObject.js`, `src/components/edit/`.
- @dhis2/analytics 29.8.1: `src/index.js`, `src/components/{DataDimension,PeriodDimension,OrgUnitDimension,DynamicDimension,DimensionsPanel}/` (props from their `propTypes`), `src/components/OpenFileDialog/`, `src/components/FileMenu/FileMenu.js`, `src/components/Options/VisualizationOptions.js`, `src/components/AboutAOUnit/utils.js` (`AOTypeMap`).
- Where the apps use the pickers, read on their default branches (September 2026):
    - data-visualizer-app: `src/components/DimensionsPanel/Dialogs/DialogManager.jsx`, `src/components/App.jsx` (`DimensionsPanel`);
    - maps-app: `src/components/edit/thematic/ThematicDialog.jsx`, `src/components/edit/event/EventDialog.jsx`, `src/components/orgunits/OrgUnitSelect.jsx`, `src/components/dimensions/DimensionSelect.jsx`;
    - line-listing-app: `src/components/Dialogs/DialogManager.jsx`, `src/components/Dialogs/FixedDimension.jsx`, `src/components/Dialogs/Conditions/OrgUnitCondition.jsx`.
- dashboard-app: `src/api/metadata.js` (`getFavoriteFields`, `getMapFields`).
- Dev server (GET only): `/api/visualizations?fields=type`, `/api/maps?fields=mapViews[layer]`, `/api/me?fields=authorities`.
