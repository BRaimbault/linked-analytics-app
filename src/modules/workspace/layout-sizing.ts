import {
    axisOf,
    getGridLength,
    getLeafRects,
    getLeaves,
    getLineCount,
    getMinLength,
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

const halve = (rect: Rect, axis: SplitAxis): [Rect, Rect] => {
    if (axis === 'horizontal') {
        const width = rect.width / 2
        return [
            { ...rect, width },
            { ...rect, left: rect.left + width, width },
        ]
    }
    const height = rect.height / 2
    return [
        { ...rect, height },
        { ...rect, top: rect.top + height, height },
    ]
}

const isSideBySide = (a: Rect, b: Rect): boolean =>
    Math.abs(a.top - b.top) <= TOLERANCE &&
    Math.abs(a.height - b.height) <= TOLERANCE

/* Where each view was before the change: the sizes to keep in proportion.
 * A view that split another one's cell takes half of that cell. */
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
    const [first, second] = halve(targetBefore, axis)
    const placedFirst = startOf(placed, axis) < startOf(target, axis)
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

/* Lengths below their minimum are raised to it, and the others share what
 * is left in proportion, until all fit. When even the minimums don't fit,
 * the lengths are left for the grid to clamp. */
export const fitToMinimums = (
    lengths: number[],
    minimums: number[],
    total: number
): number[] => {
    if (sum(minimums) > total) {
        return lengths
    }
    const fixed = new Set<number>()
    let fitted = [...lengths]
    let short = fitted.flatMap((length, index) =>
        length < minimums[index] ? [index] : []
    )
    while (short.length) {
        short.forEach((index) => fixed.add(index))
        const free = lengths.flatMap((_, index) =>
            fixed.has(index) ? [] : [index]
        )
        const freeTotal = total - sum([...fixed].map((i) => minimums[i]))
        const freeWeight = sum(free.map((index) => lengths[index]))
        fitted = lengths.map((length, index) => {
            if (fixed.has(index)) {
                return minimums[index]
            }
            return freeWeight > 0
                ? (freeTotal * length) / freeWeight
                : freeTotal / free.length
        })
        short = fitted.flatMap((length, index) =>
            !fixed.has(index) && length < minimums[index] ? [index] : []
        )
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
 * - a split cell is halved, the other cells keep their size;
 * - a new line gets as much room as the lines it joins, one share per view
 *   met along it;
 * - space a view leaves goes to its neighbours in proportion.
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
        const lines = children.map((child) =>
            getLineCount(child, childOrientation, { axis })
        )
        const newShares = extents.map((extent, index) =>
            extent === null ? (length * lines[index]) / sum(lines) : 0
        )
        const knownLength = length - sum(newShares)
        const knownTotal = sum(extents.map((extent) => extent ?? 0))
        const targets = extents.map((extent, index) =>
            extent === null
                ? newShares[index]
                : (knownLength * extent) / knownTotal
        )
        const minimums = children.map((child) =>
            getMinLength(child, childOrientation, { axis })
        )
        const sizes = roundToTotal(
            fitToMinimums(targets, minimums, length),
            length
        )

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
    sizeChildren(after.root, after.orientation, {
        length: getGridLength(after, rootAxis),
        crossLength: getGridLength(
            after,
            axisOf(orthogonal(after.orientation))
        ),
    })
    return changed ? requests : []
}
