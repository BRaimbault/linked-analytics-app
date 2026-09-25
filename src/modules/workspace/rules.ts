import type { ViewType } from './view-types'

export const MAX_VIEWS = 4

export const canAddView = (viewCount: number): boolean => viewCount < MAX_VIEWS

/* Below this a plugin has no room to be readable */
export const VIEW_MIN_SIZE = { width: 240, height: 160 }

export type SplitAxis = 'horizontal' | 'vertical'

const minLengthOf = (axis: SplitAxis): number =>
    axis === 'horizontal' ? VIEW_MIN_SIZE.width : VIEW_MIN_SIZE.height

export const getSplitAxis = (position: DropPosition): SplitAxis | null => {
    if (position === 'left' || position === 'right') {
        return 'horizontal'
    }
    if (position === 'top' || position === 'bottom') {
        return 'vertical'
    }
    return null
}

/* Splitting a cell halves it; docking at the outer edge of the grid adds a
 * row or column and shrinks the existing ones proportionally, so the
 * narrowest one is what must stay readable. */
export const hasRoomToSplitCell = (
    cellLength: number,
    axis: SplitAxis
): boolean => cellLength / 2 >= minLengthOf(axis)

export const hasRoomToDockAtEdge = (
    narrowestLength: number,
    lineCount: number,
    axis: SplitAxis
): boolean =>
    (narrowestLength * lineCount) / (lineCount + 1) >= minLengthOf(axis)

/* A view docked at the outer edge spans the whole grid, so it gets 1/n of
 * the grid along that axis (n views in total), like every other line;
 * left alone, docking across the current layout would give it half. */
export const getEdgeDockLength = (
    gridLength: number,
    viewCount: number
): number => gridLength / Math.max(viewCount, 1)

/* Numbers freed by closing a view are reused, so titles stay short */
export const getNextViewNumber = (
    type: ViewType,
    views: ReadonlyArray<{ type: ViewType; number: number }>
): number => {
    const taken = new Set(
        views.filter((view) => view.type === type).map((view) => view.number)
    )
    let number = 1
    while (taken.has(number)) {
        number++
    }
    return number
}

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
}

/* A view dropped onto the middle (or the tab) of another view swaps the
 * two; everywhere else in a cell, a drop splits it. */
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
    (kind === 'content' || kind === 'tab')

/* Views tile the grid one per cell, so a drop always splits or swaps; the
 * tool panels only live in edge groups, where they can be reordered as tabs. */
export const isAllowedDrop = (context: DropContext): boolean => {
    const { kind, position, targetIsEdgeGroup, source, gridIsEmpty } = context
    if (source === 'tool') {
        return targetIsEdgeGroup
    }
    if (targetIsEdgeGroup) {
        return false
    }
    if (position === 'center') {
        return isSwapDrop(context) || gridIsEmpty
    }
    return kind === 'content' || kind === 'edge'
}
