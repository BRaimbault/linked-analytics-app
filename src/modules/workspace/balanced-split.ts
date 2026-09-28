import {
    findLeafLocation,
    type GridOrientation,
    type GridTree,
    type Size,
} from './grid-tree'

/* Charts and maps read best in a landscape shape */
export const PREFERRED_VIEW_ASPECT = 16 / 9

export type SplitDirection = 'right' | 'below'

/* Across the line a cell sits in: a cell in a row splits top and bottom */
const ACROSS_LINE: Record<GridOrientation, SplitDirection[]> = {
    HORIZONTAL: ['below', 'right'],
    VERTICAL: ['right', 'below'],
}

/* Side by side halves a cell's aspect, top and bottom doubles it: the way
 * that lands nearer the preferred shape comes first */
const byShape = ({ width, height }: Size): SplitDirection[] =>
    width > height * PREFERRED_VIEW_ASPECT
        ? ['right', 'below']
        : ['below', 'right']

/* The ways to halve a click-added view's cell, best first. Splitting
 * across its line, rather than lengthening it, keeps the views balanced:
 * with the largest cell halved each time, four views make a 2×2 grid
 * whatever the window's shape. A cell alone (or in an unmeasured grid)
 * goes by its shape. */
export const getBalancedSplitOrder = (
    tree: GridTree | null,
    cell: { id: string } & Size
): SplitDirection[] => {
    const location = tree && findLeafLocation(tree, cell.id)
    return location && location.parent.children.length > 1
        ? ACROSS_LINE[location.orientation]
        : byShape(cell)
}
