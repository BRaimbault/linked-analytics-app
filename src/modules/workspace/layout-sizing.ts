import {
    axisOf,
    getGridLength,
    orthogonal,
    type GridBranch,
    type GridLeaf,
    type GridNode,
    type GridOrientation,
    type GridTree,
} from './grid-tree'
import {
    getKnownRects,
    getLineLengths,
    SIZE_TOLERANCE,
    type LayoutChange,
} from './layout-targets'

export type SizeRequest =
    { id: string; width: number } | { id: string; height: number }

/* The view a child is resized through: itself, or one of a branch's own
 * views. A branch whose children are all branches has none. */
const getResizeHandle = (child: GridNode): GridLeaf | undefined =>
    child.type === 'leaf'
        ? child
        : child.children.find((node): node is GridLeaf => node.type === 'leaf')

/* The child that takes what the others leave, as it can't be resized
 * itself: the last one, unless a child with no view of its own must take
 * it. dockview takes a resize from the last child first, so that child
 * can only be the last or the one before it; otherwise there is none, and
 * no set of requests sizes the line. */
const getRestTaker = (handles: (GridLeaf | undefined)[]): number | null => {
    const last = handles.length - 1
    const unsized = handles.flatMap((handle, index) => (handle ? [] : [index]))
    if (unsized.length === 0) {
        return last
    }
    return unsized.length === 1 && unsized[0] >= last - 1 ? unsized[0] : null
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
 * - no line goes below its views' minimum sizes.
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
        const sizes = getLineLengths(children, orientation, {
            length,
            known,
        })

        const handles = children.map(getResizeHandle)
        const taker = getRestTaker(handles)
        /* With no child able to take the rest, the line stays as dockview
         * laid it out, and its branches are sized within their real length */
        const lengths =
            taker === null ? children.map((child) => child.size) : sizes

        if (taker !== null) {
            children.forEach((child, index) => {
                if (Math.abs(sizes[index] - child.size) > SIZE_TOLERANCE) {
                    changed = true
                }
                const handle = handles[index]
                if (index !== taker && handle) {
                    requests.push(
                        axis === 'horizontal'
                            ? { id: handle.id, width: sizes[index] }
                            : { id: handle.id, height: sizes[index] }
                    )
                }
            })
        }
        children.forEach((child, index) => {
            if (child.type === 'branch') {
                sizeChildren(child, childOrientation, {
                    length: crossLength,
                    crossLength: lengths[index],
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

/* Every line sized as if new: lines of selectors alone at their preferred
 * length, the others sharing the rest, one share per view met along them.
 * So maps and visualizations get equal sizes. */
export const computeEvenSizes = (tree: GridTree): SizeRequest[] =>
    computeLayoutSizes({ ...tree, root: { ...tree.root, children: [] } }, tree)
