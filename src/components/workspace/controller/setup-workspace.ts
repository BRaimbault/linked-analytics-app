import type { GridTree } from '@modules/workspace/grid-tree'
import type { AppDispatch } from '@store/store'
import type { DockviewApi } from 'dockview-react'
import {
    acceptPaletteDrag,
    addTileDroppedOnGrid,
    refuseDisallowedDrop,
    swapOrExpectMove,
} from './drops'
import { readGridTree, restoreProportions } from './grid-layout'
import { addToolPanels, type ToolTitles } from './settings'
import { createViewEvents } from './view-events'

/* Wires dockview's events to the view events, the drop rules and the sizing.
 * Returns a cleanup that disposes every listener, so a remount (e.g.
 * StrictMode) starts clean. */
export const setupWorkspace = (
    api: DockviewApi,
    dispatch: AppDispatch,
    toolTitles: ToolTitles
): (() => void) => {
    addToolPanels(api, toolTitles)
    const { onViewAdded, onViewRemoved, onViewSelected } = createViewEvents(
        api,
        dispatch,
        toolTitles
    )
    /* The layout as the user last left it, read before each change while
     * no view is maximized, so leaving maximize puts it back */
    let layoutBefore: GridTree | null = null

    const disposables = [
        api.onDidAddPanel(onViewAdded),
        api.onDidRemovePanel(onViewRemoved),
        api.onDidActivePanelChange(onViewSelected),
        api.onWillMutateLayout(() => {
            layoutBefore = readGridTree(api) ?? layoutBefore
        }),
        api.onDidMutateLayout(() => restoreProportions(api, layoutBefore)),
        api.onUnhandledDragOver((event) => acceptPaletteDrag(api, event)),
        api.onWillShowOverlay((event) => refuseDisallowedDrop(api, event)),
        api.onWillDrop((event) => swapOrExpectMove(api, event)),
        api.onDidDrop((event) => addTileDroppedOnGrid(api, event)),
    ]

    return () => disposables.forEach((disposable) => disposable.dispose())
}
