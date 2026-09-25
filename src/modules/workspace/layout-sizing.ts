import {
    axisOf,
    getGridLength,
    getLeafRects,
    getLeaves,
    getLineCount,
    getMaxLength,
    getMinLength,
    getPreferredLength,
    getViewSizes,
    withEffectiveMaxSizes,
    along,
    lengthOf,
    orthogonal,
    startOf,
    type GridBranch,
    type GridOrientation,
    type GridTree,
    type Rect,
    type SplitAxis,
} from './grid-tree'

/* How a view was placed: splitting another view's cell, or as a new line
 * (a row or column at the grid's outer edge or between two lines). A view
 * that moved counts as removed from where it was. */
export type LayoutChange =
    | { kind: 'split'; placedId: string; targetId: string }
    | { kind: 'insert'; placedId: string }

export type SizeRequest =
    { id: string; width: number } | { id: string; height: number }

/* Sizes this close are left alone, which absorbs rounding */
const TOLERANCE = 1

const sum = (values: number[]): number =>
    values.reduce((total, value) => total + value, 0)

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

const isSideBySide = (a: Rect, b: Rect): boolean =>
    Math.abs(a.top - b.top) <= TOLERANCE &&
    Math.abs(a.height - b.height) <= TOLERANCE

/* Where each view was before the change: the sizes to keep in proportion.
 * A view that split another one's cell takes half of that cell, or its
 * preferred length if it has one (a selector). */
const getKnownRects = (
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

/* Lengths outside their limits are clamped to them, and the others share
 * what is left in proportion, until all fit. When even the minimums don't
 * fit, the lengths are left for the grid to clamp. */
export const fitToLimits = (
    lengths: number[],
    { minimums, maximums }: { minimums: number[]; maximums: number[] },
    total: number
): number[] => {
    if (sum(minimums) > total) {
        return lengths
    }
    const clamp = (length: number, index: number) =>
        Math.min(Math.max(length, minimums[index]), maximums[index])
    const fixed = new Map<number, number>()
    let fitted = [...lengths]
    const outOfLimits = () =>
        fitted.flatMap((length, index) =>
            !fixed.has(index) && clamp(length, index) !== length ? [index] : []
        )
    let clamped = outOfLimits()
    while (clamped.length) {
        clamped.forEach((index) =>
            fixed.set(index, clamp(fitted[index], index))
        )
        const free = lengths.flatMap((_, index) =>
            fixed.has(index) ? [] : [index]
        )
        const freeTotal = total - sum([...fixed.values()])
        const freeWeight = sum(free.map((index) => lengths[index]))
        fitted = lengths.map((length, index) => {
            const fixedLength = fixed.get(index)
            if (fixedLength !== undefined) {
                return fixedLength
            }
            return freeWeight > 0
                ? (freeTotal * length) / freeWeight
                : freeTotal / free.length
        })
        clamped = outOfLimits()
    }
    return fitted
}

/* Whole pixels that still add up to the total */
const roundToTotal = (lengths: number[], total: number): number[] => {
    let end = 0
    let previousEnd = 0
    return lengths.map((length, index) => {
        end += length
        const roundedEnd =
            index === lengths.length - 1 ? Math.round(total) : Math.round(end)
        const rounded = roundedEnd - previousEnd
        previousEnd = roundedEnd
        return rounded
    })
}

/* The sizes that keep the user's proportions after a view is added,
 * moved or closed:
 * - a split cell is halved (or gives a selector its preferred length), the
 *   other cells keep their size;
 * - a line of selectors alone keeps its length, or gets its preferred length
 *   when new; the other lines share the rest;
 * - among those, a new line gets as much room as the lines it joins, one
 *   share per view met along it;
 * - space a view leaves goes to its neighbours in proportion;
 * - no line passes its views' minimum or maximum sizes.
 * Returned in the order to apply them: each branch's children before
 * their own children, the last child of each branch taking what is left.
 * Empty when the layout already matches. */
export const computeLayoutSizes = (
    before: GridTree,
    after: GridTree,
    change?: LayoutChange
): SizeRequest[] => {
    if (after.width <= 0 || after.height <= 0) {
        return []
    }
    const known = getKnownRects(before, after, change)
    const capped = withEffectiveMaxSizes(after)
    const requests: SizeRequest[] = []
    let changed = false

    /* length: the branch's length along its orientation; crossLength: the
     * other one, which its branch children lay their own children along */
    const sizeChildren = (
        branch: GridBranch,
        orientation: GridOrientation,
        { length, crossLength }: { length: number; crossLength: number }
    ): void => {
        const axis = axisOf(orientation)
        const childOrientation = orthogonal(orientation)
        const { children } = branch
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
        const isSelectorLine = (index: number) => preferred[index] !== null
        const hasPluginLine = children.some(
            (_, index) => !isSelectorLine(index)
        )
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
        const shares = children.map((_, index) => shareOf(index))
        /* With no plugin to take the rest, the selector lines share it */
        const targets = hasPluginLine
            ? shares
            : shares.map((share) => (length * share) / sum(shares))
        const limits = {
            minimums: children.map((child) =>
                getMinLength(child, childOrientation, measure)
            ),
            maximums: children.map((child) =>
                getMaxLength(child, childOrientation, measure)
            ),
        }
        const sizes = roundToTotal(fitToLimits(targets, limits, length), length)

        children.forEach((child, index) => {
            if (Math.abs(sizes[index] - child.size) > TOLERANCE) {
                changed = true
            }
            /* A branch is resized through one of its own views */
            const leaf =
                child.type === 'leaf'
                    ? child
                    : child.children.find((node) => node.type === 'leaf')
            if (index < children.length - 1 && leaf?.type === 'leaf') {
                requests.push(
                    axis === 'horizontal'
                        ? { id: leaf.id, width: sizes[index] }
                        : { id: leaf.id, height: sizes[index] }
                )
            }
        })
        children.forEach((child, index) => {
            if (child.type === 'branch') {
                sizeChildren(child, childOrientation, {
                    length: crossLength,
                    crossLength: sizes[index],
                })
            }
        })
    }

    const rootAxis = axisOf(after.orientation)
    sizeChildren(capped.root, capped.orientation, {
        length: getGridLength(after, rootAxis),
        crossLength: getGridLength(
            after,
            axisOf(orthogonal(after.orientation))
        ),
    })
    return changed ? requests : []
}
