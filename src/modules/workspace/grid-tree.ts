export type SplitAxis = 'horizontal' | 'vertical'

export type Size = { width: number; height: number }

/* What a view needs from its cell. A view with a preferred size (a
 * selector) gets that size when it has a line to itself, instead of a share
 * of the grid. */
export type ViewSizes = { min: Size; preferred?: Size }

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
