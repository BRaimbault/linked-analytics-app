import {
    hasRoomForGridLine,
    hasRoomToSplitCell,
    getSplitAxis,
} from '@modules/workspace/drop-rules'
import {
    along,
    crossAxis,
    type GridTree,
    type SplitAxis,
    type ViewSizes,
} from '@modules/workspace/grid-tree'
import { SIZE_TOLERANCE } from '@modules/workspace/layout-targets'
import type {
    DockviewGroupPanel,
    IDockviewPanel,
    Position,
} from 'dockview-react'
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
        crossLength: getCellLength(group, crossAxis(axis)),
        placedCrossMin: along(placedSizes.min, crossAxis(axis)),
    })

const fitsCell = (view: IDockviewPanel, group: DockviewGroupPanel): boolean =>
    (['horizontal', 'vertical'] as const).every(
        (axis) =>
            along(getPanelSizes(view).min, axis) <=
            getCellLength(group, axis) + SIZE_TOLERANCE
    )

/* A swap keeps both cells' sizes (sizing is paused while it runs), so each
 * view must fit the cell it gets: a map doesn't go in a selector's 120px
 * row */
export const hasRoomToSwap = (
    first: IDockviewPanel,
    second: IDockviewPanel
): boolean => fitsCell(first, second.group) && fitsCell(second, first.group)

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
        hasRoomForGridLine(tree, {
            axis,
            placedSizes,
            excludeId: sourceGroupId,
        })
    )
}
