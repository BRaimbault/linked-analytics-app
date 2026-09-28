import { hasRoomForGridLine, hasRoomToInsertLine } from './drop-rules'
import {
    getLeafRects,
    getLeaves,
    getViewSizes,
    type GridLeaf,
    type GridNode,
    type GridTree,
    type Rect,
    type ViewSizes,
} from './grid-tree'
import { sum } from './line-lengths'
import type { ViewKind } from './view-types'

/* The kinds whose clicked views gather in rows across the top of the grid:
 * text (titles and notes) on top, then the selectors, like a filter bar */
export type BarKind = Exclude<ViewKind, 'plugin'>

/* Next to the last view of its bar, or a new row: at the very top for
 * text; for selectors, right below the text bar, which dockview can only
 * do when that bar is a single view (so at the very top otherwise) */
type BarPlacement =
    { referenceId: string; direction: 'right' | 'below' } | { edge: 'top' }

const isLeafOf =
    (kind: BarKind) =>
    (node: GridNode): node is GridLeaf =>
        node.type === 'leaf' && node.kind === kind

/* The views of a row, when they are all of that kind */
const getBar = (
    row: GridNode | undefined,
    kind: BarKind
): GridLeaf[] | null => {
    if (!row) {
        return null
    }
    if (row.type === 'leaf') {
        return isLeafOf(kind)(row) ? [row] : null
    }
    return row.children.every(isLeafOf(kind))
        ? (row.children as GridLeaf[])
        : null
}

/* The rows across the top: the grid's rows, or the whole grid when it is
 * one row */
const getTopRows = ({ root, orientation }: GridTree): GridNode[] =>
    orientation === 'HORIZONTAL' ? [root] : root.children

const hasRoomInBar = (
    tree: GridTree,
    bar: GridLeaf[],
    placedSizes: ViewSizes
): boolean =>
    hasRoomToInsertLine({
        minLength: sum(bar.map((leaf) => getViewSizes(leaf).min.width)),
        length: tree.width,
        placedMin: placedSizes.min.width,
        /* The bar's views come from this tree, so they have a rect */
        crossLength: (getLeafRects(tree).get(bar[0].id) as Rect).height,
        placedCrossMin: placedSizes.min.height,
    })

/* Where a clicked text or selector view goes. Null when there is no room,
 * or no view yet. */
export const getBarPlacement = (
    tree: GridTree,
    kind: BarKind,
    placedSizes: ViewSizes
): BarPlacement | null => {
    if (!getLeaves(tree.root).length) {
        return null
    }
    const [first, second] = getTopRows(tree)
    const textBar = getBar(first, 'text')
    const bar =
        kind === 'text' ? textBar : getBar(textBar ? second : first, kind)
    if (bar && hasRoomInBar(tree, bar, placedSizes)) {
        return { referenceId: bar[bar.length - 1].id, direction: 'right' }
    }
    if (!hasRoomForGridLine(tree, { axis: 'vertical', placedSizes })) {
        return null
    }
    /* A single text view is a row of the grid's column itself, so a view
     * added below it makes a new row */
    if (kind === 'selector' && textBar && first.type === 'leaf') {
        return { referenceId: first.id, direction: 'below' }
    }
    return { edge: 'top' }
}
