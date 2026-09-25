export type SplitAxis = 'horizontal' | 'vertical'

export type Size = { width: number; height: number }

/* What a view needs from its cell. A view with a preferred size (a
 * selector) gets that size when it has a line to itself, instead of a share
 * of the grid, and never grows past its maximum. */
export type ViewSizes = { min: Size; preferred?: Size; max?: Size }

/* Below this a plugin has no room to be readable */
export const PLUGIN_SIZES: ViewSizes = { min: { width: 240, height: 160 } }

/* A plain copy of the grid's layout tree: branches lay their children out
 * side by side along their orientation, alternating at each level, and a
 * child's size is its length along its parent's orientation. */

export type GridOrientation = 'HORIZONTAL' | 'VERTICAL'
export type GridLeaf = {
    type: 'leaf'
    id: string
    size: number
    /* Plugin sizes when left out */
    sizes?: ViewSizes
}
export type GridBranch = { type: 'branch'; size: number; children: GridNode[] }
export type GridNode = GridLeaf | GridBranch
export type GridTree = {
    orientation: GridOrientation
    width: number
    height: number
    root: GridBranch
}
export type Rect = { left: number; top: number; width: number; height: number }

/* The shape dockview serializes the grid to */
export type SerializedGridNode =
    | { type: 'leaf'; data: { id: string }; size?: number }
    | { type: 'branch'; data: SerializedGridNode[]; size?: number }

export type SerializedGrid = {
    root: SerializedGridNode
    width: number
    height: number
    orientation: GridOrientation
}

const fromSerializedNode = (node: SerializedGridNode): GridNode =>
    node.type === 'leaf'
        ? { type: 'leaf', id: node.data.id, size: node.size ?? 0 }
        : {
              type: 'branch',
              size: node.size ?? 0,
              children: node.data.map(fromSerializedNode),
          }

export const fromSerializedGrid = (grid: SerializedGrid): GridTree => {
    const root = fromSerializedNode(grid.root)
    return {
        orientation: grid.orientation,
        width: grid.width,
        height: grid.height,
        root:
            root.type === 'branch'
                ? root
                : { type: 'branch', size: root.size, children: [root] },
    }
}

/* The tree with each view's sizes, looked up by cell */
export const withViewSizes = (
    tree: GridTree,
    getSizes: (leafId: string) => ViewSizes
): GridTree => {
    const attach = (node: GridNode): GridNode =>
        node.type === 'leaf'
            ? { ...node, sizes: getSizes(node.id) }
            : { ...node, children: node.children.map(attach) }
    return { ...tree, root: attach(tree.root) as GridBranch }
}

export const orthogonal = (orientation: GridOrientation): GridOrientation =>
    orientation === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL'

export const axisOf = (orientation: GridOrientation): SplitAxis =>
    orientation === 'HORIZONTAL' ? 'horizontal' : 'vertical'

export const along = (size: Size, axis: SplitAxis): number =>
    axis === 'horizontal' ? size.width : size.height

export const getViewSizes = (leaf: GridLeaf): ViewSizes =>
    leaf.sizes ?? PLUGIN_SIZES

export const lengthOf = (rect: Rect, axis: SplitAxis): number =>
    axis === 'horizontal' ? rect.width : rect.height

export const startOf = (rect: Rect, axis: SplitAxis): number =>
    axis === 'horizontal' ? rect.left : rect.top

export const getGridLength = (tree: GridTree, axis: SplitAxis): number =>
    axis === 'horizontal' ? tree.width : tree.height

export const getLeaves = (node: GridNode): GridLeaf[] =>
    node.type === 'leaf' ? [node] : node.children.flatMap(getLeaves)

/* Each node's rectangle, from the grid's top-left corner */
export const getNodeRects = (tree: GridTree): Map<GridNode, Rect> => {
    const rects = new Map<GridNode, Rect>()
    const place = (
        node: GridNode,
        rect: Rect,
        orientation: GridOrientation
    ): void => {
        rects.set(node, rect)
        if (node.type === 'leaf') {
            return
        }
        let offset = 0
        for (const child of node.children) {
            const childRect =
                orientation === 'HORIZONTAL'
                    ? {
                          ...rect,
                          left: rect.left + offset,
                          width: child.size,
                      }
                    : { ...rect, top: rect.top + offset, height: child.size }
            place(child, childRect, orthogonal(orientation))
            offset += child.size
        }
    }
    place(
        tree.root,
        { left: 0, top: 0, width: tree.width, height: tree.height },
        tree.orientation
    )
    return rects
}

export const getLeafRects = (tree: GridTree): Map<string, Rect> =>
    new Map(
        [...getNodeRects(tree)]
            .filter(([node]) => node.type === 'leaf')
            .map(([node, rect]) => [(node as GridLeaf).id, rect])
    )

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
    return axisOf(orientation) === axis
        ? counts.reduce((sum, count) => sum + count, 0)
        : Math.max(0, ...counts)
}

/* Folds a length over the node's views: the lengths of views side by side
 * along the axis add up, and a stack takes the lengths of its views
 * together (the largest minimum, the smallest maximum). */
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
    return axisOf(orientation) === axis
        ? lengths.reduce((sum, length) => sum + length, 0)
        : stack(lengths)
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

/* The largest length the node can grow to along the axis: bounded only
 * when every view in it is bounded (see getViewMaxSizes) */
export const getMaxLength = (
    node: GridNode,
    orientation: GridOrientation,
    measure: Measure
): number =>
    measureNode(node, orientation, {
        ...measure,
        leafLength: (leaf) => {
            const max = getViewSizes(leaf).max
            return max ? along(max, measure.axis) : Infinity
        },
        stack: (lengths) =>
            lengths.includes(Infinity) ? Infinity : Math.min(...lengths),
    }) ?? Infinity

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

/* The maximum each selector can be given without holding back a plugin or
 * leaving the grid unfilled. Views side by side in a row share its height
 * (and stacked views share a column's width), so a selector's maximum along
 * an axis caps every view sharing that length with it: it only applies
 * when those are all selectors, and when the line they stack in has a view
 * with no maximum to take the rest. */
export const getViewMaxSizes = (
    tree: GridTree
): Map<string, { width?: number; height?: number }> => {
    const maxSizes = new Map<string, { width?: number; height?: number }>()
    type Ancestor = { node: GridBranch; orientation: GridOrientation }
    const isBounded = (node: GridNode) =>
        getLeaves(node).every((leaf) => getViewSizes(leaf).max)

    const visit = (node: GridNode, ancestors: Ancestor[]): void => {
        if (node.type === 'branch') {
            const orientation = ancestors.length
                ? orthogonal(ancestors[ancestors.length - 1].orientation)
                : tree.orientation
            node.children.forEach((child) =>
                visit(child, [...ancestors, { node, orientation }])
            )
            return
        }
        const max = getViewSizes(node).max
        if (!max) {
            return
        }
        /* Whether the selector's length along the axis can be capped: the
         * widest node sharing that length, and the branch stacking it */
        const canCap = (axis: SplitAxis): boolean => {
            let shared: GridNode = node
            for (const ancestor of [...ancestors].reverse()) {
                if (axisOf(ancestor.orientation) === axis) {
                    return (
                        isBounded(shared) &&
                        ancestor.node.children.some(
                            (child) => child !== shared && !isBounded(child)
                        )
                    )
                }
                shared = ancestor.node
            }
            return false
        }
        maxSizes.set(node.id, {
            width: canCap('horizontal') ? max.width : undefined,
            height: canCap('vertical') ? max.height : undefined,
        })
    }

    visit(tree.root, [])
    return maxSizes
}

/* The tree with each selector's maximum as it applies in this layout (see
 * getViewMaxSizes), for sizing that matches what the grid enforces */
export const withEffectiveMaxSizes = (tree: GridTree): GridTree => {
    const maxSizes = getViewMaxSizes(tree)
    const apply = (node: GridNode): GridNode => {
        if (node.type === 'branch') {
            return { ...node, children: node.children.map(apply) }
        }
        const max = maxSizes.get(node.id)
        return max
            ? {
                  ...node,
                  sizes: {
                      ...getViewSizes(node),
                      max: {
                          width: max.width ?? Infinity,
                          height: max.height ?? Infinity,
                      },
                  },
              }
            : node
    }
    return { ...tree, root: apply(tree.root) as GridBranch }
}

export type LeafLocation = {
    parent: GridBranch
    orientation: GridOrientation
    index: number
}

export const findLeafLocation = (
    tree: GridTree,
    id: string
): LeafLocation | null => {
    const search = (
        branch: GridBranch,
        orientation: GridOrientation
    ): LeafLocation | null => {
        for (const [index, child] of branch.children.entries()) {
            if (child.type === 'leaf') {
                if (child.id === id) {
                    return { parent: branch, orientation, index }
                }
                continue
            }
            const found = search(child, orthogonal(orientation))
            if (found) {
                return found
            }
        }
        return null
    }
    return search(tree.root, tree.orientation)
}
