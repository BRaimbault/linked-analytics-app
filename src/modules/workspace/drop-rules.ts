import { getMinLength } from './grid-measures'
import {
    along,
    axisOf,
    crossAxis,
    findLeafLocation,
    getLeaves,
    lengthOf,
    type GridNode,
    type GridOrientation,
    type GridTree,
    type Rect,
    type SplitAxis,
    type ViewSizes,
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

/* The room a placed view needs across the split: a split or a new line
 * never makes the space it lands in longer that way, so the placed view
 * must fit its length as it is (a map can't go beside a 120px selector) */
type CrossRoom = {
    /* The length across the split: the cell's, or the branch's */
    crossLength: number
    placedCrossMin: number
}

/* Splitting a cell halves it, unless the placed view is a selector, which
 * takes its preferred size and leaves the rest; either way both views keep
 * their minimum length. */
export const hasRoomToSplitCell = ({
    length,
    targetMin,
    placedMin,
    halves,
    crossLength,
    placedCrossMin,
}: {
    length: number
    targetMin: number
    placedMin: number
    halves: boolean
} & CrossRoom): boolean =>
    placedCrossMin <= crossLength &&
    (halves
        ? length / 2 >= Math.max(targetMin, placedMin)
        : targetMin + placedMin <= length)

/* A new line (a row or column added at the grid's outer edge or between
 * two lines) takes its room from the others, so it fits as long as every
 * line keeps its minimum length. */
export const hasRoomToInsertLine = ({
    minLength,
    length,
    placedMin,
    crossLength,
    placedCrossMin,
}: {
    /* The smallest length the existing lines can shrink to */
    minLength: number
    length: number
    placedMin: number
} & CrossRoom): boolean =>
    placedCrossMin <= crossLength && minLength + placedMin <= length

type NewLine = {
    axis: SplitAxis
    placedSizes: ViewSizes
    /* A view about to move away, whose space is free */
    excludeId?: string | null
}

/* Whether a new line along the axis fits in the space a node covers (a
 * branch, between two of its lines, or the whole grid at an outer edge) */
export const hasRoomForNewLine = (
    space: { node: GridNode; orientation: GridOrientation; rect: Rect },
    { axis, placedSizes, excludeId = null }: NewLine
): boolean =>
    hasRoomToInsertLine({
        minLength: getMinLength(space.node, space.orientation, {
            axis,
            excludeId,
        }),
        length: lengthOf(space.rect, axis),
        placedMin: along(placedSizes.min, axis),
        crossLength: lengthOf(space.rect, crossAxis(axis)),
        placedCrossMin: along(placedSizes.min, crossAxis(axis)),
    })

/* A new row or column along one of the grid's outer edges */
export const hasRoomForGridLine = (tree: GridTree, line: NewLine): boolean =>
    hasRoomForNewLine(
        {
            node: tree.root,
            orientation: tree.orientation,
            rect: { left: 0, top: 0, width: tree.width, height: tree.height },
        },
        line
    )

type DropKind = 'tab' | 'header_space' | 'content' | 'edge'
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

type MoveTarget =
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
