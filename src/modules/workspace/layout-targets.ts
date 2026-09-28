import { getLineCount, getMinLength, getPreferredLength } from './grid-measures'
import {
    axisOf,
    getLeafRects,
    getLeaves,
    getViewSizes,
    along,
    lengthOf,
    orthogonal,
    startOf,
    type GridNode,
    type GridOrientation,
    type GridTree,
    type Rect,
    type SplitAxis,
} from './grid-tree'
import { fitToMinimums, roundToTotal, sum } from './line-lengths'

/* How a view was placed: splitting another view's cell, or as a new line
 * (a row or column at the grid's outer edge or between two lines). A view
 * that moved counts as removed from where it was. */
export type LayoutChange =
    | { kind: 'split'; placedId: string; targetId: string }
    | { kind: 'insert'; placedId: string }

/* Sizes this close are left alone, which absorbs rounding */
export const SIZE_TOLERANCE = 1

/* Cuts the rectangle in two along the axis, the first part `first` long */
const cut = (rect: Rect, axis: SplitAxis, first: number): [Rect, Rect] => {
    if (axis === 'horizontal') {
        return [
            { ...rect, width: first },
            { ...rect, left: rect.left + first, width: rect.width - first },
        ]
    }
    return [
        { ...rect, height: first },
        { ...rect, top: rect.top + first, height: rect.height - first },
    ]
}

/* After a split, two cells side by side share their top; stacked ones
 * can't, as a cell is never that short */
const isSideBySide = (a: Rect, b: Rect): boolean =>
    Math.abs(a.top - b.top) <= SIZE_TOLERANCE

/* Where each view was before the change: the sizes to keep in proportion.
 * A view that split another one's cell takes half of that cell, or its
 * preferred length if it has one (a selector). */
export const getKnownRects = (
    before: GridTree,
    after: GridTree,
    change: LayoutChange | undefined
): Map<string, Rect> => {
    const known = getLeafRects(before)
    if (!change) {
        return known
    }
    known.delete(change.placedId)
    if (change.kind !== 'split') {
        return known
    }
    const targetBefore = known.get(change.targetId)
    const afterRects = getLeafRects(after)
    const placed = afterRects.get(change.placedId)
    const target = afterRects.get(change.targetId)
    if (!targetBefore || !placed || !target) {
        return known
    }
    const axis = isSideBySide(placed, target) ? 'horizontal' : 'vertical'
    const placedLeaf = getLeaves(after.root).find(
        (leaf) => leaf.id === change.placedId
    )
    const preferred = placedLeaf && getViewSizes(placedLeaf).preferred
    const cellLength = lengthOf(targetBefore, axis)
    const placedLength = preferred
        ? Math.min(along(preferred, axis), cellLength)
        : cellLength / 2
    const placedFirst = startOf(placed, axis) < startOf(target, axis)
    const [first, second] = cut(
        targetBefore,
        axis,
        placedFirst ? placedLength : cellLength - placedLength
    )
    known.set(change.placedId, placedFirst ? first : second)
    known.set(change.targetId, placedFirst ? second : first)
    return known
}

/* The length the node's views covered along the axis before the change,
 * or null for a node holding only newly placed views */
const getKnownExtent = (
    leafIds: string[],
    known: Map<string, Rect>,
    axis: SplitAxis
): number | null => {
    const rects = leafIds
        .map((id) => known.get(id))
        .filter((rect): rect is Rect => Boolean(rect))
    if (!rects.length) {
        return null
    }
    const start = Math.min(...rects.map((rect) => startOf(rect, axis)))
    const end = Math.max(
        ...rects.map((rect) => startOf(rect, axis) + lengthOf(rect, axis))
    )
    return end - start
}

/* The length each child of a branch takes along the branch's axis, from
 * where its views were before the change (the rules of computeLayoutSizes),
 * within their minimums and in whole pixels adding up to the branch's
 * length */
export const getLineLengths = (
    children: GridNode[],
    orientation: GridOrientation,
    { length, known }: { length: number; known: Map<string, Rect> }
): number[] => {
    const axis = axisOf(orientation)
    const childOrientation = orthogonal(orientation)
    const extents = children.map((child) =>
        getKnownExtent(
            getLeaves(child).map((leaf) => leaf.id),
            known,
            axis
        )
    )
    const measure = { axis }
    const preferred = children.map((child) =>
        getPreferredLength(child, childOrientation, measure)
    )
    /* With no map or visualization in the branch, nothing takes the
     * rest of it, so its selector lines share it like any lines
     * (e.g. a bar of selectors across the top) */
    const hasPluginLine = preferred.some((length) => length === null)
    const isSelectorLine = (index: number) =>
        hasPluginLine && preferred[index] !== null
    /* Lines of selectors alone keep their length, or ask for their own */
    const selectorLengths = children.map((_, index) =>
        isSelectorLine(index)
            ? (extents[index] ?? (preferred[index] as number))
            : 0
    )
    const pluginLength = length - sum(selectorLengths)
    const lines = children.map((child, index) =>
        isSelectorLine(index)
            ? 0
            : getLineCount(child, childOrientation, measure)
    )
    const newShares = extents.map((extent, index) =>
        extent === null && !isSelectorLine(index)
            ? (pluginLength * lines[index]) / sum(lines)
            : 0
    )
    const knownPluginLength = pluginLength - sum(newShares)
    const knownPluginTotal = sum(
        extents.map((extent, index) =>
            isSelectorLine(index) ? 0 : (extent ?? 0)
        )
    )
    const shareOf = (index: number): number => {
        if (isSelectorLine(index)) {
            return selectorLengths[index]
        }
        const extent = extents[index]
        return extent === null
            ? newShares[index]
            : (knownPluginLength * extent) / (knownPluginTotal || 1)
    }
    const targets = children.map((_, index) => shareOf(index))
    const minimums = children.map((child) =>
        getMinLength(child, childOrientation, measure)
    )
    return roundToTotal(fitToMinimums(targets, minimums, length), length)
}
