import i18n from '@dhis2/d2-i18n'
import {
    axisOf,
    findLeafLocation,
    getLeaves,
    type GridTree,
    type SplitAxis,
} from './grid-tree'
import { getViewKind, getViewTypeLabel, type ViewType } from './view-types'

/* Each plugin loads a whole app in an iframe, so their number is capped.
 * Selectors are light, but each drives plugins, so a workspace holds at most
 * one more selector of a type than it has plugins. */
export const MAX_PLUGIN_VIEWS = 4

const countPlugins = (views: ReadonlyArray<{ type: ViewType }>): number =>
    views.filter((view) => getViewKind(view.type) === 'plugin').length

export const canAddView = (
    type: ViewType,
    views: ReadonlyArray<{ type: ViewType }>
): boolean => {
    const plugins = countPlugins(views)
    if (getViewKind(type) === 'plugin') {
        return plugins < MAX_PLUGIN_VIEWS
    }
    const sameType = views.filter((view) => view.type === type).length
    return sameType + 1 <= plugins + 1
}

/* Why a view of this type can't be added */
export const getViewLimitMessage = (type: ViewType): string =>
    getViewKind(type) === 'plugin'
        ? i18n.t('A workspace holds up to {{max}} maps and visualizations', {
              max: MAX_PLUGIN_VIEWS,
          })
        : i18n.t(
              'A workspace holds at most one more {{selector}} selector than it has maps and visualizations',
              { selector: getViewTypeLabel(type).toLowerCase() }
          )

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
    if (targetIsEdgeGroup || context.isNoOpMove) {
        return false
    }
    if (position === 'center') {
        return isSwapDrop(context) || gridIsEmpty
    }
    return kind === 'content' || kind === 'edge'
}
