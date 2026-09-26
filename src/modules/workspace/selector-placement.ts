import { hasRoomToInsertLine } from './drop-rules'
import { getMinLength } from './grid-measures'
import {
    getLeaves,
    getViewSizes,
    type GridLeaf,
    type GridNode,
    type GridTree,
    type ViewSizes,
} from './grid-tree'
import { sum } from './line-lengths'

/* Where a clicked selector goes: next to the last one in the bar of
 * selectors across the top of the grid, like a filter bar, or in a new row
 * there when there is no bar yet or it is full. Null when there is no
 * room, or no view yet. */
export type SelectorPlacement = { referenceId: string } | { edge: 'top' }

const isSelectorLeaf = (node: GridNode): node is GridLeaf =>
    node.type === 'leaf' && getViewSizes(node).preferred !== undefined

/* The selectors in a row across the top of the grid, if there is one: the
 * top row of the grid, or the whole grid when it is that one row */
const getSelectorBar = ({ root, orientation }: GridTree): GridLeaf[] | null => {
    const row = orientation === 'HORIZONTAL' ? root : root.children[0]
    if (row.type === 'leaf') {
        return isSelectorLeaf(row) ? [row] : null
    }
    return row.children.every(isSelectorLeaf) ? row.children : null
}

export const getSelectorPlacement = (
    tree: GridTree,
    placedSizes: ViewSizes
): SelectorPlacement | null => {
    if (!getLeaves(tree.root).length) {
        return null
    }
    const bar = getSelectorBar(tree)
    const hasRoomInBar =
        bar &&
        hasRoomToInsertLine({
            minLength: sum(bar.map((leaf) => getViewSizes(leaf).min.width)),
            length: tree.width,
            placedMin: placedSizes.min.width,
        })
    if (bar && hasRoomInBar) {
        return { referenceId: bar[bar.length - 1].id }
    }
    /* No bar yet, or a full one: a new row across the top */
    const hasRoomForRow = hasRoomToInsertLine({
        minLength: getMinLength(tree.root, tree.orientation, {
            axis: 'vertical',
        }),
        length: tree.height,
        placedMin: placedSizes.min.height,
    })
    return hasRoomForRow ? { edge: 'top' } : null
}
