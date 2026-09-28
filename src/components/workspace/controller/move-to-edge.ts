import { hasRoomForGridLine, isNoOpMove } from '@modules/workspace/drop-rules'
import type { SplitAxis } from '@modules/workspace/grid-tree'
import type { DockviewApi, IDockviewPanel } from 'dockview-react'
import { expectLayoutChange, readGridTree } from './grid-layout'
import { getPanelSizes } from './panels'

export type EdgePlacement = 'top' | 'bottom' | 'left' | 'right'

/* A row splits the grid top to bottom, a column side by side */
const EDGE_AXES: Record<EdgePlacement, SplitAxis> = {
    top: 'vertical',
    bottom: 'vertical',
    left: 'horizontal',
    right: 'horizontal',
}

const EDGE_PLACEMENTS = Object.keys(EDGE_AXES) as EdgePlacement[]

/* Where a view can go as a new row or column along the grid's outer edge,
 * as a drop on an outer insert strip does: not where it already runs along
 * that edge, and only with room for the new line. None while a view is
 * maximized (the grid can't be read then). */
export const getEdgePlacements = (
    api: DockviewApi,
    view: IDockviewPanel
): EdgePlacement[] => {
    const tree = readGridTree(api)
    if (!tree) {
        return []
    }
    const sourceId = view.group.id
    return EDGE_PLACEMENTS.filter(
        (position) =>
            !isNoOpMove(tree, sourceId, { type: 'edge', position }) &&
            hasRoomForGridLine(tree, {
                axis: EDGE_AXES[position],
                placedSizes: getPanelSizes(view),
                excludeId: sourceId,
            })
    )
}

/* The keyboard's way to the outer insert strips: sizes follow as for a
 * drop there. Without a target, a group moves into a new cell at the
 * edge. */
export const moveViewToEdge = (
    api: DockviewApi,
    view: IDockviewPanel,
    position: EdgePlacement
): void => {
    expectLayoutChange(api, { kind: 'insert', viewId: view.id })
    view.group.api.moveTo({ position })
}
