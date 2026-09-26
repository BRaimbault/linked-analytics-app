import {
    axisOf,
    findLeafLocation,
    getLeaves,
    type GridTree,
    type SplitAxis,
} from './grid-tree'

export const getSplitAxis = (position: DropPosition): SplitAxis | null => {
    if (position === 'left' || position === 'right') {
        return 'horizontal'
    }
    if (position === 'top' || position === 'bottom') {
        return 'vertical'
    }
    return null
}

/* Splitting a cell halves it, unless the placed view is a selector, which
 * takes its preferred size and leaves the rest; either way both views keep
 * their minimum length. */
export const hasRoomToSplitCell = ({
    length,
    targetMin,
    placedMin,
    halves,
}: {
    length: number
    targetMin: number
    placedMin: number
    halves: boolean
}): boolean =>
    halves
        ? length / 2 >= Math.max(targetMin, placedMin)
        : targetMin + placedMin <= length

/* A new line (a row or column added at the grid's outer edge or between
 * two lines) takes its room from the others, so it fits as long as every
 * line keeps its minimum length. */
export const hasRoomToInsertLine = ({
    minLength,
    length,
    placedMin,
}: {
    /* The smallest length the existing lines can shrink to */
    minLength: number
    length: number
    placedMin: number
}): boolean => minLength + placedMin <= length

export type DropKind = 'tab' | 'header_space' | 'content' | 'edge'
export type DropPosition = 'top' | 'bottom' | 'left' | 'right' | 'center'
export type DragSource = 'view' | 'tool' | 'external'

export type DropContext = {
    kind: DropKind
    position: DropPosition
    targetIsEdgeGroup: boolean
    /* The target cell already holds the dragged view */
    targetHoldsSource: boolean
    source: DragSource
    gridIsEmpty: boolean
    /* Dropping the dragged view there would leave the layout as it is */
    isNoOpMove: boolean
}

export type MoveTarget =
    | { type: 'cell'; id: string; position: DropPosition }
    | { type: 'edge'; position: DropPosition }

/* A move changes nothing when the view lands where it already is: in its
 * own cell, against the facing edge of the view next to it, or at the
 * outer edge it already runs along. */
export const isNoOpMove = (
    tree: GridTree,
    sourceId: string,
    target: MoveTarget
): boolean => {
    if (target.type === 'cell' && target.id === sourceId) {
        return true
    }
    if (getLeaves(tree.root).length <= 1) {
        return true
    }
    const axis = getSplitAxis(target.position)
    const source = findLeafLocation(tree, sourceId)
    if (!axis || !source || axisOf(source.orientation) !== axis) {
        return false
    }
    const siblings = source.parent.children
    const towardsStart = target.position === 'left' || target.position === 'top'
    if (target.type === 'edge') {
        return (
            source.parent === tree.root &&
            source.index === (towardsStart ? 0 : siblings.length - 1)
        )
    }
    const neighbour = siblings[source.index + (towardsStart ? 1 : -1)]
    return neighbour?.type === 'leaf' && neighbour.id === target.id
}

/* A view dropped onto the middle of another view swaps the two;
 * everywhere else in a cell, a drop splits it. dockview's tab targets only
 * reorder tabs, so a drop on a view's tab does nothing. */
export const isSwapDrop = ({
    kind,
    position,
    targetIsEdgeGroup,
    targetHoldsSource,
    source,
}: DropContext): boolean =>
    source === 'view' &&
    !targetIsEdgeGroup &&
    !targetHoldsSource &&
    position === 'center' &&
    kind === 'content'

/* Views tile the grid one per cell, so a drop always splits or swaps; the
 * tool panels only live in edge groups, where they can be reordered as tabs. */
export const isAllowedDrop = (context: DropContext): boolean => {
    const { kind, position, targetIsEdgeGroup, source, gridIsEmpty } = context
    if (source === 'tool') {
        return targetIsEdgeGroup
    }
    if (targetIsEdgeGroup || context.isNoOpMove) {
        return false
    }
    if (position === 'center') {
        return isSwapDrop(context) || gridIsEmpty
    }
    return kind === 'content' || kind === 'edge'
}
