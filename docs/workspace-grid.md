# Workspace grid

- **Status**: decided and implemented (plan step 2).
- **Related**: [interactions.md](interactions.md) (what the selectors drive), [selector-controls.md](selector-controls.md) (selector sizes), [plugins.md](plugins.md) (what goes in a view).

How the workspace grid behaves and why, for anyone changing it. The grid is built on `dockview-react`. The rules an agent needs in every session are in [CLAUDE.md](../CLAUDE.md#workspace); this document has the detail behind them.

## 1. Layout

- **One view per cell**: the grid has no tabs of its own; each view has one tab header, 35px high (`VIEW_HEADER_HEIGHT`).
- **The tools strip**: a dockview edge group, at the top by default. Its ⋯ menu moves it to any edge, and it can be collapsed. It holds "Workspace" (settings of the whole workspace), "Add views" (the palette, the tab shown by default), then one settings tab per view, in the order the views were added. "Workspace" and "Add views" can't be closed (`IconTab`). Every tab carries a 16px icon: those two their own, and a settings tab and its view's header both the view type's icon (`WithTabIcon` around dockview's default tab, which has no slot for one). The icon is centred on the name's line and starts at the same place on every tab of a strip, vertical strips included; dockview's physical `margin-right` on the tab name is made logical for that, as in a vertical strip it runs across the tab (Cypress checks this, `tools.cy.tsx`).
- **The Workspace tab** holds what applies to the whole workspace: **Show view headers only on hover** (below), and **Even out view sizes** (`evenOutSizes`): maps and visualizations get the same size, and lines of selectors their preferred length (`computeEvenSizes`, which sizes every line as if it were new). Every setting that applies to the whole workspace belongs there: link defaults such as filter or highlight on click ([interactions.md §5.1](interactions.md#51-zero-configuration-by-default)), and later saving the workspace. A setting of one view or selector stays in its own settings tab.
- **Tools tabs are all 160px long**, in either direction. A settings tab takes its view's title ("Map 1", "Period 1"): the strip is where settings live. Every default name fits; a longer one is cut short with an ellipsis, and hovering the tab shows it in full in a DHIS2 `Tooltip` (`TabNameTooltip`), opening towards the grid (below the tab when the strip is at the top, to its left when at the right, and so on). Screen readers get the full name from the tab's `aria-label`.
- **View headers can show only on hover** (a checkbox in the Workspace tab, `viewHeaders` in the `workspaceSettings` slice). The header then floats over the top of its view instead of taking room, so no view (and no plugin's iframe) resizes as the pointer moves. It shows while the view is hovered, holds the focus, has its ⋯ menu open (`data-menu-open`: the menu opens in a layer outside the header) or is being dragged. On a device that can't hover (`(hover: none)`: a touch screen), headers take their room as with "always", since a floating one would always show over the top of its view; the selected view's frame is hidden there, as its tab shows the line. Details:
    - A view's body is drawn in an overlay outside its cell, so CSS `:hover` can't tell: `markHoveredView` marks the hovered cell (`data-hovered`) from pointer events on the workspace.
    - dockview places bodies from their cell's content box only when it lays out, so switching the setting asks for a layout.
    - The selected view keeps its tab's blue top line, drawn over its body (`ViewPanel`): dockview's cell sits under the body, and forces `outline: none` on it.
    - dockview still subtracts the header from the size it reports for a view's content. A plugin must size itself from its body element, not from those dimensions.
    - The text view's edit button moves below the floating header.
- **dockview is the source of truth.** The layout is mirrored into the `workspace` Redux slice from dockview events. The dockview api is shared through `WorkspaceApiContext`, not Redux.
- **A narrow window scrolls** instead of cutting views off. dockview clips views that don't fit its element, so the workspace takes the views' minimum size (`getWorkspaceMinimumSize`: dockview's own minimum, plus the tools strip along its axis, which dockview leaves out), and the app scrolls when the window is smaller. The workspace clips everything else: dockview leaves the overlays of views and tools it hasn't shown yet below the grid, hidden, and they must not make the app scroll.

## 2. View kinds and limits

- Each view type in the registry (`view-types.ts`) is a **plugin** (map or visualization: an app in an iframe), a **selector** (a light picker that drives plugins) or **text** (a title or a note).
- **At most 4 plugins** (`MAX_PLUGIN_VIEWS`). Selectors don't count toward it, but each selector type is capped at the number of plugins + 1, and never more than 4 (`MAX_SELECTORS_PER_TYPE`). The palette disables a tile when its type is full, with the reason in a tooltip and as the tile's description for screen readers (the tile stays focusable, with `aria-disabled`): each selector type has a whole sentence for each of its two limits, so they translate. **Text views have no cap**: the room left in the grid limits them.
- **Sizes per type** (`sizes` in the registry):
    - every type has a minimum (`sizes.min`): 240×160px for plugins, 240×96px for selectors, 240×71px for text (one line);
    - selectors and text views also have a preferred size (320×120px), used when they are placed;
    - **there is no maximum**: a selector can be dragged as big as a plugin, and grows and shrinks with the window like any view.

## 3. Adding and placing views

- **Clicking a palette tile keeps the views balanced**: it halves the largest cell, across the line that cell sits in (a cell in a row splits top and bottom, a cell in a column side by side). A cell alone splits side by side when it's wider than 16:9, top and bottom otherwise (`getBalancedSplitOrder`). So four clicked views make an even 2×2 grid, in any window. If that split has no room, it tries the other way, then the next largest cell, before alerting that there is no room. The selected view doesn't matter: exact placement is what dragging is for. Adding a view keeps the palette open.
- **Clicked text and selectors go to bars across the top** (`getBarPlacement`): a row of text views at the very top (titles and notes), then the selector bar, like a filter bar.
    - A clicked view joins its bar after the last view in it; with no bar yet, or no room left in it, it starts a new row.
    - A new text row goes at the very top. A new selector row goes right below the text row when that row is a single text view; dockview can't add a full-width row below a row of several views, so the selector row then goes at the very top.
    - When the grid is too short for a new row, the view is placed like any other.
    - Grid leaves carry their view's kind (`withViewInfo`), so the two bars never mix.
- **Room checks** use the minimum size of the view being placed. A drop that would push any view below its minimum is refused. A moved view's own space counts as free.
- **Room is checked across the split too**: a split or a new line never makes the space it lands in longer that way, so the placed view must fit it as it is. So a map (160px high at least) never goes beside a selector in a 120px bar, by click or drop.
- **No view is added while one is maximized**: it would land out of sight. The palette's tiles are disabled then, with the reason in their tooltip, and `addView` refuses (`status: 'maximized'`).
- **A view is selected only while its settings tab is shown.** Selecting a view by hand (a click on it or its tab, even when it's already active) brings its settings tab forward, and opening a settings tab selects its view. "Workspace" and "Add views" select none, and neither does a text view, which has no settings tab. A double click on a view's header opens its settings, expanding a collapsed tools strip.
- **Closing a view** goes back to "Add views", with no view selected: while arranging, the palette is the likely next step. When the closed tab had the focus, it goes to the "Add views" tab. A press on a tab's close button is marked handled (`keepCloseFromSelecting`), so dockview doesn't select the view, or open its settings tab, just before closing it.

- **Text views are written in place**, with the DHIS2 rich-text editor and parser from `@dhis2/analytics` (the interpretations' Markdown-style text: bold, italics, headings, lists, links, emoji; no raw HTML). They have no settings tab.
    - The edit icon, or a double click anywhere in the view (a single one may follow a link), opens the editor. The icon floats over the text's top-right corner on a blurred white backdrop, shown while the view is hovered or holds the focus, and always on touch screens. A view too short for it (under 180px of body: toolbar, four lines, buttons) is maximized while writing, then put back; any column is wide enough, as a compact "Preview" (and "Back to write mode") keeps the toolbar on one row at 240px.
    - **Ctrl+Enter** (Cmd+Enter) or "Done" saves; **Escape** or "Cancel" discards. Escape does nothing while one of the editor's pop-ups is open (the "@" user list, the emoji picker): they don't close on Escape, and the note would be lost.
    - The editor fills the view, 1px in. Focus only turns the text area's border blue: the editor's own focus ring would shrink and shift the text. Its text area and its preview take the reading view's font, line height and text box, and all three break long words the same way, so lines break at the same words everywhere.
    - The editor's "Mention a user" button is hidden (CSS on its position in the toolbar, checked in Cypress): mentions belong to interpretations. Typing "@" still suggests users; the editor has no option to turn that off.
    - The text is kept in the panel's params (`ViewPanelParams.text`), which dockview keeps with the layout.

## 4. Sizes keep the user's proportions

dockview spreads space evenly after every add, move or close. After each change the controller puts the sizes back (`computeLayoutSizes`):

- **Splitting a cell halves it**; the other cells keep their size.
- **Selector lines**: next to a map or visualization, a line of selectors alone keeps its length, or gets its preferred length when new. A selector splitting a cell takes its preferred length and leaves the rest. In a branch with no map or visualization (e.g. the selector bar), nothing takes the rest, so its selectors share it like any lines.
- **A new line with a plugin** shares what the selector lines leave, one share per view met along it, so it matches its neighbors; the others shrink in proportion. A selector next to a plugin in a line counts like a plugin.
- **Space a view leaves** goes to its neighbors in proportion. A swap changes nothing.
- **No line goes below its views' minimums** (`fitToMinimums`).
- **A swap changes no size**: it runs through temporary spacer tabs (§5), so sizes are neither read nor fixed while it runs (`withoutSizing`).

How this is applied:

- The layout is read from `api.toJSON().grid` before each change (`onWillMutateLayout`), and sizes are fixed after it (`onDidMutateLayout`) through `group.api.setSize`, parents first.
- **`setSize` sets one cell, and dockview takes the difference from the others starting with the last child of the line.** So each line's children are set in order and the last takes the rest.
- **A branch is resized through one of its own cells.** A branch whose children are all branches (e.g. a 2×2 block made of rows) has none. It takes the rest instead when it is last or second to last, with its siblings set. Anywhere else no set of requests can size that line, so it stays as dockview laid it out, and the branch's own children are sized within the length it really has.
- A tab dropped at the grid's outer edge reshapes the grid before `onWillMutateLayout`, so the layout is read in `onWillDrop` instead. In dockview 8.3.1 (`dockToLayoutEdge`), the new cell at the edge is added without a layout event, then the view moves in as one layout change. The expected change is dropped when the current JavaScript task ends, in case dockview never makes it.
- **Never read the grid while a view is maximized.** dockview stores each `setSize` and re-applies it when a group becomes visible again, e.g. when a maximized view is restored, which would undo sash drags made since; and `toJSON` briefly restores the layout. So the grid isn't read then, and sizes are put back from the layout read before maximizing.

## 5. Drops

- **A palette tile's drag** carries its type as custom formats (`drag-payload.ts`), but the page also keeps the dragged tile (`controller/tile-drag.ts`) and reads that when the formats are missing. Some systems pass a drag on to the page without its custom formats (seen in a Windows Chrome: no ghost image, no types on `dragover`, an empty `getData` on drop), and every drop target then refused the tile. dockview keeps its own tab drags in page memory the same way. Cypress checks tile drops that lose their data (`losesData` in `dragTo`), and `dragTo` drops only where the last `dragover` was taken, as a browser does.
- **Cells**: dockview's drop zones, widened with `dropOverlayModel` to a third of the cell per side. A drop on a cell's edge halves the cell and shows dockview's shaded half.
- **Swap**: dropping a view onto the middle third of another view swaps them. The view's ⋯ menu does the same from the keyboard. A swap keeps both cells' sizes, so it is offered only when each view fits the other's cell (`hasRoomToSwap`): a map doesn't go in a selector's 120px row. The menu reads that again whenever the layout changes. dockview has no swap: `swapViews` moves the two panels through temporary spacer tabs, since dockview removes a group as soon as it's empty, and moves are what keep iframes alive.
- **A drop on a view's tab does nothing**: dockview's tab targets only reorder tabs.
- **A settings tab dragged onto the grid moves its view**, as if the view's own tab were dragged: it swaps, splits, and goes to insert strips and outer edges the same way. dockview would move the settings tab itself, so the drop handler cancels that and moves the view.
- **New lines show as a line** (`InsertZones`): while dragging, strips lie over the dividers between lines (dockview has no such target) and along the grid's outer edges. The hovered strip shows a blue insertion line.
    - A divider drop adds the view next to a reference view on one side of it; an outer-edge drop adds it at the root.
    - A horizontal divider's strip also covers the headers just below it, and the top edge's strip covers the top row's headers. So a view dragged by its tab onto another view's header lands on the line above that header.
- **No pointless previews**: `isNoOpMove` hides drops that would leave a view where it is: its own cell, the facing edge of its neighbor, or the outer edge it already runs along.
- **Settings tabs** can be reordered by dragging in the tools strip's tab row. The drop shows a blue line between two tabs, or after the last tab over the empty part of the row (`dndTabIndicator: 'line'`, plus CSS for the empty part, which dockview otherwise shades whole). "Workspace" and "Add views" stay first, with a divider after them: they can't be dragged (a mouse drag of one doesn't start, and any other drag drops nowhere), and nothing drops before them. On either side of a boundary between two tabs, dockview draws the drop line inside a different tab; both lines are moved onto the boundary, so a drop point shows as one line. At the end of the row the tab row clips at the last tab's end, so there both lines (on the last tab's second half, and on the empty part after it) are drawn inside the last tab instead. The line jumps between the sides of a tab rather than sliding, which would show it in the tab's middle. dockview's drop event names the group's shown tab rather than the tab under the pointer, so the drop rules read that one from the pointer. A tab dropped in the strip's body goes nowhere.

## 6. Touch

Checked with Chrome's touch emulation:

- **Works**: swapping, cell-edge drops, dividers and tap-to-add. Every tab shows its × (there's no hover).
- **Doesn't work: outer-edge docking.** During a pointer drag, the cell under the finger always wins over dockview's outer band, so a touch drag can't add a row or column along the grid's edge.
- The insert strips only take HTML5 (mouse) drags. On a touch-first device dockview drags with pointer events, so `getOuterEdgeDropModel` turns dockview's own outer-edge targets back on there (48px band, same media queries dockview uses). Elsewhere `dndEdges` is off.

## 7. Iframes and pointer events

- **`renderer: 'always'` keeps iframes alive** when panels move; moving an iframe in the DOM otherwise reloads it. Checked with real iframes: no reload on add, move to an edge, insert between, swap, maximize and restore, moving or collapsing the tools strip, closing another view, or a window resize.
- **View bodies live in an overlay** (`.dv-render-overlay`) above the grid, which catches the pointer. During a drag only tab bars would then reach the drop zones.
- So while one of the workspace's drags is in progress (a palette tile or a tab: `isWorkspaceDrag`), `workspace.tsx` sets `data-dragging` (from `useCurrentDrag`), and CSS turns off pointer events on the overlays of views (`.dv-render-overlay:has([data-view-id])`) and on iframes. Other drags, like text moved within a note, leave the views alone; so does a drag cancelled as it starts, which never ends.
- **Never on all overlays**: the tools live in overlays too, and Chrome cancels a drag whose source (a palette tile) stops taking the pointer.
- **A view's body must keep `data-view-id`** when the plugins replace the placeholders.
- jsdom can't evaluate this CSS, so real drags are checked in Cypress and the browser.

## 8. Accessibility

- Screen-reader announcements go through `getWorkspaceAnnouncement`: only view changes are spoken, translated. Closing a maximized view also restores the grid; that "restored" is dropped, so "closed" is what the live region keeps.
- **The ⋯ menus work from the keyboard** (`ActionsMenu`): the menu takes focus when it opens, the arrow keys move through it, Enter runs an item, and Escape or Tab closes it, with focus back on the button. After "Swap with…", focus follows the swapped view to its tab in the new cell (`focusViewTab`).
- **Moving a view from the keyboard**: a view's ⋯ menu offers the swaps where each view fits the other's cell, and "Move to a new row at the top / bottom" and "Move to a new column on the left / right" (`controller/move-to-edge.ts`). These are the moves a drop on an outer insert strip makes, with the same sizes, and they're offered only where a drop would be allowed: not along an edge the view already runs along (`isNoOpMove`), and only with room for the new line. The menu reads them again when the layout changes. Focus follows the view to its tab.
- **Known limit**: the insert strips _between_ two views take mouse drags only; the keyboard reaches the grid's outer edges and swaps.
- A collapsed tools strip keeps its panels mounted in a zero-size overlay, outside the group's element. `ToolPanel` makes them `inert`, so Tab can't reach them.
- Tabs, their close buttons and our icon buttons share one focus ring (`--theme-focus`).
- **A disabled palette tile stays focusable** (`aria-disabled`, not `disabled`), so the keyboard reaches it and a screen reader reads why it can't add its view (`aria-describedby`, the tooltip's text). Its click and drag do nothing.
- **Known limit**: view bodies live in overlays after the grid in the page (see §7), so Tab reaches a view's body only after every header.
- No RTL support (dockview issue #388).

## 9. Code layout

- **Pure layout logic** in `src/modules/workspace/`, independent of dockview and unit-tested:
    - `view-types.ts` (the registry), `view-limits.ts` (limits and numbering), `drag-payload.ts` (what a palette drag carries);
    - `grid-tree.ts` (the layout tree), `grid-measures.ts` (minimum and preferred lengths on it);
    - `drop-rules.ts` (allowed drops and room checks), `bar-placement.ts` (the text and selector bars), `balanced-split.ts` (how a clicked view splits a cell);
    - `layout-sizing.ts`, `layout-targets.ts` and `line-lengths.ts` (sizes after a change), `insert-zones.ts` (the strips between lines).
- **Every dockview call** in `src/components/workspace/controller/`, one file per topic:
    - `panels.ts` (ids and lookups), `grid-layout.ts` (reading the tree and fixing sizes after a change);
    - `add-view.ts`, `swap-views.ts`, `views.ts` (closing a view, focusing its tab), `settings.ts` (tools panels and settings tabs), `tools-strip.ts`;
    - `view-events.ts` (views added, removed and selected: the store, settings tabs, and bringing settings forward);
    - `drags.ts`, `tile-drag.ts` and `room.ts` (what is dragged, the palette tile in page memory, and whether it fits), `drops.ts` (the drop handlers, insert strips and empty grid), `drop-models.ts` (the size of dockview's drop targets);
    - `minimum-size.ts` (the room the views need, for scrolling), `announcements.ts`, and `setup-workspace.ts`, which only wires dockview's events to named handlers.
- **Components** in `src/components/workspace/`:
    - `workspace.tsx`, `workspace-api-context.tsx`, `view-type-icon.tsx`;
    - `tabs/` (the tab, the icon tab, its name tooltip and its header actions), `insert-zones/`;
    - `panels/`: the Workspace tab, the palette, settings, `view-panel` (a view's body by kind), the text view, placeholders, `ToolPanel`, the swap spacer and the empty-grid watermark;
    - shared hooks: `use-current-drag`, `use-drop-target`, `use-add-view`, `use-dockview-value`, `use-workspace-minimum-size`.
- Each folder has its own CSS module; `styles/workspace.module.css` keeps only the theme and dockview overrides.

## 10. Tests

- Vitest covers the pure modules and the controller (against `__tests__/fake-dockview.ts`), and the components in jsdom. It owns the 100% coverage.
- The fake dockview copies the behavior the controller relies on: will and did events around each layout change; hidden (zero) sizes while a view is maximized; the cell a view leaves showing its next tab; removing an edge group discarding its panels; leaving maximize as a layout change. When the controller starts relying on more, the fake learns it first.
- Cypress component tests cover what jsdom can't: real layout, CSS and drag and drop. The scenarios live in `src/components/workspace/__tests__/grid/`, one spec per group (adding, moving, swapping, sizing, selectors, text, headers, the palette, the tools strip, its tabs, settings tabs and the Workspace tab), sharing `grid-helpers.tsx`.
- The mount renders like the app shell: Roboto (`typeface-roboto`, imported in `cypress/support/component.ts`) and DHIS2's `CssReset`, which makes buttons take the page's font. Without them each browser measured text in its own fallback font, and layout checks tested what no user sees.
- They pass in Chrome and in Firefox (`pnpm cy:comp:run --browser firefox`). Two Firefox differences shaped the palette: a wrapping flex row is sized from its items' content, so tiles have a width and not only a flex basis; and a drag starts only on what a button holds, not on the button itself, so a tile's content fills its whole face.

## 11. Later: lock and presentation

Planned with persistence (plan step 7): until a workspace can be saved and opened by someone else, nobody else is there to protect it from.

- **Layout lock**: a Workspace setting, next to the header one. Someone exploring a shared workspace keeps every view working, but can't break its layout by accident.
    - Locked: no dragging views (dockview's drag and drop off), no resizing (the dividers ignore the pointer), no adding (the palette's tiles disabled with the reason, as while a view is maximized), no closing (no close buttons, no close from the settings tabs).
    - Still working: maximize and restore, the selectors, the links, and each view's settings.
    - Every path that changes the layout checks it: `addView`, the drop handlers, `swapViews`, `closeView`, "Even out view sizes".
- **Presentation mode**: an action ("Present"), not a setting. It is the lock plus no chrome: no view headers and no tools strip, so the views fill the page. A clear way out: Escape, or a small floating button.
- **No "hidden" header setting on its own**: with no header, a view can't be moved, swapped, maximized or closed from the grid, and its title is gone. That only makes sense read-only, which is what presentation mode is.
