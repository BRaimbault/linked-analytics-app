import type { GridTree } from '@modules/workspace/grid-tree'
import type { AppDispatch } from '@store/store'
import type { DockviewApi } from 'dockview-react'
import { cancelFixedToolDrag, keepFixedToolsInPlace } from './drags'
import {
    acceptPaletteDrag,
    addTileDroppedOnGrid,
    refuseDisallowedDrop,
    swapOrExpectMove,
} from './drops'
import { isSizingPaused, readGridTree, restoreProportions } from './grid-layout'
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
    /* The layout as the user last left it, read before each change while
     * no view is maximized, so leaving maximize puts it back */
    let layoutBefore: GridTree | null = null
    const { onViewAdded, onViewRemoved, onViewSelected, select } =
        createViewEvents(api, dispatch)

    const disposables = [
        api.onDidAddPanel(onViewAdded),
        api.onDidRemovePanel(onViewRemoved),
        api.onDidActivePanelChange(onViewSelected),
        api.onWillMutateLayout(() => {
            if (!isSizingPaused(api)) {
                layoutBefore = readGridTree(api) ?? layoutBefore
            }
        }),
        api.onDidMutateLayout(() => {
            if (!isSizingPaused(api)) {
                restoreProportions(api, layoutBefore)
            }
        }),
        api.onWillDragPanel(keepFixedToolsInPlace),
        api.onUnhandledDragOver((event) => acceptPaletteDrag(api, event)),
        api.onWillShowOverlay((event) => refuseDisallowedDrop(api, event)),
        api.onWillDrop((event) => swapOrExpectMove(api, event, select)),
        api.onDidDrop((event) => addTileDroppedOnGrid(api, event)),
    ]
    document.addEventListener('dragstart', cancelFixedToolDrag, true)

    return () => {
        disposables.forEach((disposable) => disposable.dispose())
        document.removeEventListener('dragstart', cancelFixedToolDrag, true)
    }
}
