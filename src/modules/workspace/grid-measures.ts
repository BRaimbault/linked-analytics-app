import {
    along,
    axisOf,
    getLeaves,
    getViewSizes,
    orthogonal,
    type GridLeaf,
    type GridNode,
    type GridOrientation,
    type Size,
    type SplitAxis,
} from './grid-tree'
import { sum } from './line-lengths'

export type Measure = {
    axis: SplitAxis
    /* A view about to move away, left out of the count */
    excludeId?: string | null
}

/* How many views a line across the node meets along the axis, at most:
 * views side by side along the axis add up, stacked ones don't. */
export const getLineCount = (
    node: GridNode,
    orientation: GridOrientation,
    { axis, excludeId = null }: Measure
): number => {
    if (node.type === 'leaf') {
        return node.id === excludeId ? 0 : 1
    }
    const counts = node.children.map((child) =>
        getLineCount(child, orthogonal(orientation), { axis, excludeId })
    )
    return axisOf(orientation) === axis ? sum(counts) : Math.max(0, ...counts)
}

/* Folds a length over the node's views: the lengths of views side by side
 * along the axis add up, and a stack takes the lengths of its views
 * together (the largest of them). */
const measureNode = (
    node: GridNode,
    orientation: GridOrientation,
    {
        axis,
        excludeId = null,
        leafLength,
        stack,
    }: Measure & {
        leafLength: (leaf: GridLeaf) => number | null
        stack: (lengths: number[]) => number
    }
): number | null => {
    const measure = (child: GridNode, childOrientation: GridOrientation) =>
        measureNode(child, childOrientation, {
            axis,
            excludeId,
            leafLength,
            stack,
        })
    if (node.type === 'leaf') {
        return node.id === excludeId ? null : leafLength(node)
    }
    const lengths = node.children
        .map((child) => measure(child, orthogonal(orientation)))
        .filter((length): length is number => length !== null)
    if (!lengths.length) {
        return null
    }
    return axisOf(orientation) === axis ? sum(lengths) : stack(lengths)
}

/* The smallest length the node can shrink to along the axis while each
 * view keeps its minimum size */
export const getMinLength = (
    node: GridNode,
    orientation: GridOrientation,
    measure: Measure
): number =>
    measureNode(node, orientation, {
        ...measure,
        leafLength: (leaf) => along(getViewSizes(leaf).min, measure.axis),
        stack: (lengths) => Math.max(...lengths),
    }) ?? 0

/* The length the node asks for along the axis when all its views have a
 * preferred size (selectors alone), or null: it then takes a share */
export const getPreferredLength = (
    node: GridNode,
    orientation: GridOrientation,
    measure: Measure
): number | null => {
    const hasPreferred = (candidate: GridNode): boolean =>
        getLeaves(candidate).every(
            (leaf) =>
                leaf.id === measure.excludeId ||
                getViewSizes(leaf).preferred !== undefined
        )
    if (!hasPreferred(node)) {
        return null
    }
    return measureNode(node, orientation, {
        ...measure,
        leafLength: (leaf) =>
            along(getViewSizes(leaf).preferred as Size, measure.axis),
        stack: (lengths) => Math.max(...lengths),
    })
}
