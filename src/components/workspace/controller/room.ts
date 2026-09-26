import {
    hasRoomToInsertLine,
    hasRoomToSplitCell,
    getSplitAxis,
} from '@modules/workspace/drop-rules'
import { getMinLength } from '@modules/workspace/grid-measures'
import {
    along,
    getGridLength,
    type GridTree,
    type SplitAxis,
    type ViewSizes,
} from '@modules/workspace/grid-tree'
import type { DockviewGroupPanel, Position } from 'dockview-react'
import { getCellLength, getPanelSizes, isEdgeGroup } from './panels'

export const hasRoomToSplit = (
    group: DockviewGroupPanel,
    axis: SplitAxis,
    placedSizes: ViewSizes
): boolean =>
    hasRoomToSplitCell({
        length: getCellLength(group, axis),
        targetMin: along(getPanelSizes(group.activePanel).min, axis),
        placedMin: along(placedSizes.min, axis),
        halves: !placedSizes.preferred,
    })

/* The dragged view is left out of the room checks: moving it frees its
 * space. */
export const hasRoomForDrop = (
    tree: GridTree | null,
    {
        group,
        position,
        sourceGroupId,
        placedSizes,
    }: {
        group: DockviewGroupPanel | undefined
        position: Position
        sourceGroupId: string | null
        placedSizes: ViewSizes
    }
): boolean => {
    const axis = getSplitAxis(position)
    if (!axis) {
        return true
    }
    if (group && !isEdgeGroup(group)) {
        return hasRoomToSplit(group, axis, placedSizes)
    }
    return (
        !tree ||
        hasRoomToInsertLine({
            minLength: getMinLength(tree.root, tree.orientation, {
                axis,
                excludeId: sourceGroupId,
            }),
            length: getGridLength(tree, axis),
            placedMin: along(placedSizes.min, axis),
        })
    )
}
