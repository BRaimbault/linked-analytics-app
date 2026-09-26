# Workspace grid

- **Status**: decided and implemented (plan step 2).
- **Related**: [interactions.md](interactions.md) (what the selectors drive), [selector-controls.md](selector-controls.md) (selector sizes), [plugins.md](plugins.md) (what goes in a view).

How the workspace grid behaves and why, for anyone changing it. The grid is built on `dockview-react`. The rules an agent needs in every session are in [CLAUDE.md](../CLAUDE.md#workspace); this document has the detail behind them.

## 1. Layout

- **One view per cell**: the grid has no tabs of its own; each view has one tab header, 35px high (`VIEW_HEADER_HEIGHT`).
- **The tools strip**: a dockview edge group, at the top by default. Its ⋯ menu moves it to any edge, and it can be collapsed. It holds "Add views" (the palette), then one settings tab per view, in the order the views were added.
- **dockview is the source of truth.** The layout is mirrored into the `workspace` Redux slice from dockview events. The dockview api is shared through `WorkspaceApiContext`, not Redux.

## 2. View kinds and limits

- Each view type in the registry (`view-types.ts`) is a **plugin** (map or visualization: an app in an iframe) or a **selector** (a light picker that drives plugins).
- **At most 4 plugins** (`MAX_PLUGIN_VIEWS`). Selectors don't count toward it, but each selector type is capped at the number of plugins + 1. The palette disables a tile when its type is full, with the reason in a tooltip.
- **Sizes per type** (`sizes` in the registry):
    - every type has a minimum (`sizes.min`): 240×160px for plugins, 240×96px for selectors;
    - selectors also have a preferred size (320×120px), used when they are placed;
    - **there is no maximum**: a selector can be dragged as big as a plugin, and grows and shrinks with the window like any view.

## 3. Adding and placing views

- **Clicking a palette tile** adds the view to the right of the selected view, or below it if there's no room, then tries the other cells before alerting that there is no room. Adding a view keeps the palette open.
- **A clicked selector goes to the selector bar** (`getSelectorPlacement`): the row of selectors across the top of the grid, like a filter bar. It joins the bar after its last selector; with no bar yet, or no room left in it, it starts a new row across the top.
- **Room checks** use the minimum size of the view being placed. A drop that would push any view below its minimum is refused. A moved view's own space counts as free.
- **Selecting a view by hand** (a click on it or its tab, even when it's already active) brings its settings tab forward. Closing the selected view selects a neighbor; an empty grid brings back "Add views".

## 4. Sizes keep the user's proportions

dockview spreads space evenly after every add, move or close. After each change the controller puts the sizes back (`computeLayoutSizes`):

- **Splitting a cell halves it**; the other cells keep their size.
- **Selector lines**: next to a map or visualization, a line of selectors alone keeps its length, or gets its preferred length when new. A selector splitting a cell takes its preferred length and leaves the rest. In a branch with no map or visualization (e.g. the selector bar), nothing takes the rest, so its selectors share it like any lines.
- **A new line with a plugin** shares what the selector lines leave, one share per view met along it, so it matches its neighbors; the others shrink in proportion. A selector next to a plugin in a line counts like a plugin.
- **Space a view leaves** goes to its neighbors in proportion. A swap changes nothing.
- **No line goes below its views' minimums** (`fitToMinimums`).

How this is applied:

- The layout is read from `api.toJSON().grid` before each change (`onWillMutateLayout`), and sizes are fixed after it (`onDidMutateLayout`) through `group.api.setSize`, parents first.
- A tab dropped at the grid's outer edge reshapes the grid before `onWillMutateLayout`, so the layout is read in `onWillDrop` instead.
- That same drop runs as two layout changes in dockview (a new cell, then the view moving in). So the expected change is kept until the current JavaScript task ends, and sizes are fixed after each of the two.
- **Never read the grid while a view is maximized.** dockview stores each `setSize` and re-applies it when a group becomes visible again, e.g. when a maximized view is restored, which would undo sash drags made since; and `toJSON` briefly restores the layout. So the grid isn't read then, and sizes are put back from the layout read before maximizing.

## 5. Drops

- **Cells**: dockview's drop zones, widened with `dropOverlayModel` to a third of the cell per side. A drop on a cell's edge halves the cell and shows dockview's shaded half.
- **Swap**: dropping a view onto the middle third of another view swaps them. The view's ⋯ menu does the same from the keyboard. dockview has no swap: `swapViews` moves the two panels through temporary spacer tabs, since dockview removes a group as soon as it's empty, and moves are what keep iframes alive.
- **A drop on a view's tab does nothing**: dockview's tab targets only reorder tabs.
- **New lines show as a line** (`InsertZones`): while dragging, strips lie over the dividers between lines (dockview has no such target) and along the grid's outer edges. The hovered strip shows a blue insertion line.
    - A divider drop adds the view next to a reference view on one side of it; an outer-edge drop adds it at the root.
    - A horizontal divider's strip also covers the headers just below it, and the top edge's strip covers the top row's headers. So a view dragged by its tab onto another view's header lands on the line above that header.
- **No pointless previews**: `isNoOpMove` hides drops that would leave a view where it is: its own cell, the facing edge of its neighbor, or the outer edge it already runs along.
- **Tools tabs** can be reordered by dragging within the tools strip. The drop shows a blue line between two tabs, or after the last tab over the empty part of the row (`dndTabIndicator: 'line'`, plus CSS for the empty part, which dockview otherwise shades whole).

## 6. Touch

Checked with Chrome's touch emulation:

- **Works**: swapping, cell-edge drops, dividers and tap-to-add. Every tab shows its × (there's no hover).
- **Doesn't work: outer-edge docking.** During a pointer drag, the cell under the finger always wins over dockview's outer band, so a touch drag can't add a row or column along the grid's edge.
- The insert strips only take HTML5 (mouse) drags. On a touch-first device dockview drags with pointer events, so `getOuterEdgeDropModel` turns dockview's own outer-edge targets back on there (48px band, same media queries dockview uses). Elsewhere `dndEdges` is off.

## 7. Iframes and pointer events

- **`renderer: 'always'` keeps iframes alive** when panels move; moving an iframe in the DOM otherwise reloads it. Checked with real iframes: no reload on add, move to an edge, insert between, swap, maximize and restore, moving or collapsing the tools strip, closing another view, or a window resize.
- **View bodies live in an overlay** (`.dv-render-overlay`) above the grid, which catches the pointer. During a drag only tab bars would then reach the drop zones.
- So while any drag is in progress, `workspace.tsx` sets `data-dragging` (from `useCurrentDrag`), and CSS turns off pointer events on the overlays of views (`.dv-render-overlay:has([data-view-id])`) and on iframes.
- **Never on all overlays**: the tools live in overlays too, and Chrome cancels a drag whose source (a palette tile) stops taking the pointer.
- **A view's body must keep `data-view-id`** when the plugins replace the placeholders.
- jsdom can't evaluate this CSS, so real drags are checked in Cypress and the browser.

## 8. Accessibility

- Screen-reader announcements go through `getWorkspaceAnnouncement`: only view changes are spoken, translated.
- A collapsed tools strip keeps its panels mounted in a zero-size overlay, outside the group's element. `ToolPanel` makes them `inert`, so Tab can't reach them.
- Tabs, their close buttons and our icon buttons share one focus ring (`--theme-focus`).
- No RTL support (dockview issue #388).

## 9. Code layout

- **Pure layout logic** in `src/modules/workspace/`, independent of dockview and unit-tested:
    - `view-types.ts` (the registry), `view-limits.ts` (limits and numbering), `drag-payload.ts` (what a palette drag carries);
    - `grid-tree.ts` (the layout tree), `grid-measures.ts` (minimum and preferred lengths on it);
    - `drop-rules.ts` (allowed drops and room checks), `selector-placement.ts` (the selector bar);
    - `layout-sizing.ts` and `line-lengths.ts` (sizes after a change), `insert-zones.ts` (the strips between lines).
- **Every dockview call** in `src/components/workspace/controller/`, one file per topic:
    - `panels.ts` (ids and lookups), `grid-layout.ts` (reading the tree and fixing sizes after a change);
    - `add-view.ts`, `swap-views.ts`, `settings.ts` (tools panels and settings tabs), `tools-strip.ts`;
    - `view-events.ts` (views added, removed and selected: the store, settings tabs, and bringing settings forward);
    - `drags.ts` and `room.ts` (what is dragged, and whether it fits), `drops.ts` (the drop handlers, insert strips and empty grid);
    - `announcements.ts`, and `setup-workspace.ts`, which only wires dockview's events to named handlers.
- **Components** in `src/components/workspace/`:
    - `workspace.tsx`, `workspace-api-context.tsx`, `view-type-icon.tsx`;
    - `tabs/` (the tab and its header actions), `insert-zones/`;
    - `panels/`: the palette, settings, placeholders, `ToolPanel` and the empty-grid watermark;
    - shared hooks: `use-current-drag`, `use-drop-target`, `use-add-view`, `use-dockview-value`.
- Each folder has its own CSS module; `styles/workspace.module.css` keeps only the theme and dockview overrides.

## 10. Tests

- Vitest covers the pure modules and the controller (against `__tests__/fake-dockview.ts`), and the components in jsdom. It owns the 100% coverage.
- Cypress component tests cover what jsdom can't: real layout, CSS and drag and drop. The scenarios live in `src/components/workspace/__tests__/grid/`, one spec per group (adding, moving, swapping, sizing, selectors, tools), sharing `grid-helpers.tsx`.
