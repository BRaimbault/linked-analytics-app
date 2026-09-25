/* Below this a plugin has no room to be readable */
export const VIEW_MIN_SIZE = { width: 240, height: 160 }

export type SplitAxis = 'horizontal' | 'vertical'

/* A plain copy of the grid's layout tree: branches lay their children out
 * side by side along their orientation, alternating at each level, and a
 * child's size is its length along its parent's orientation. */

export type GridOrientation = 'HORIZONTAL' | 'VERTICAL'
export type GridLeaf = { type: 'leaf'; id: string; size: number }
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

export const orthogonal = (orientation: GridOrientation): GridOrientation =>
    orientation === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL'

export const axisOf = (orientation: GridOrientation): SplitAxis =>
    orientation === 'HORIZONTAL' ? 'horizontal' : 'vertical'

export const minLengthOf = (axis: SplitAxis): number =>
    axis === 'horizontal' ? VIEW_MIN_SIZE.width : VIEW_MIN_SIZE.height

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

/* The smallest length the node can shrink to along the axis while each
 * view keeps its minimum size */
export const getMinLength = (
    node: GridNode,
    orientation: GridOrientation,
    measure: Measure
): number =>
    getLineCount(node, orientation, measure) * minLengthOf(measure.axis)

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
