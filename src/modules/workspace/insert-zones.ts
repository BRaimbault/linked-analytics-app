import {
    axisOf,
    getGridLength,
    getLeaves,
    getMinLength,
    getNodeRects,
    lengthOf,
    orthogonal,
    startOf,
    type GridNode,
    type GridOrientation,
    type GridTree,
    type Rect,
    type SplitAxis,
} from './grid-tree'
import { getSplitAxis, hasRoomToInsertLine, isNoOpMove } from './rules'

export type InsertPosition = 'left' | 'right' | 'top' | 'bottom'

/* A strip where a dragged view can be dropped to become a new line: over
 * the divider between two lines, or along an outer edge of the grid. A
 * divider's strip is placed next to a reference view in the same branch,
 * which keeps it between the two lines even once the dragged view has
 * left its old place; an outer edge has no reference view. */
export type InsertZone = {
    axis: SplitAxis
    rect: Rect
    referenceId: string | null
    position: InsertPosition
}

export const INSERT_ZONE_THICKNESS = 24
/* Wider, as the pointer is easily pushed past the grid's edge */
export const OUTER_ZONE_THICKNESS = 40

const OUTER_POSITIONS: InsertPosition[] = ['left', 'right', 'top', 'bottom']

const getOuterZones = (
    tree: GridTree,
    { sourceId, thickness }: { sourceId: string | null; thickness: number }
): InsertZone[] => {
    const { width, height } = tree
    const rects: Record<InsertPosition, Rect> = {
        left: { left: 0, top: 0, width: thickness, height },
        right: { left: width - thickness, top: 0, width: thickness, height },
        top: { left: 0, top: 0, width, height: thickness },
        bottom: { left: 0, top: height - thickness, width, height: thickness },
    }
    return OUTER_POSITIONS.flatMap((position) => {
        const axis = getSplitAxis(position) as SplitAxis
        const hasRoom = hasRoomToInsertLine({
            minLength: getMinLength(tree.root, tree.orientation, {
                axis,
                excludeId: sourceId,
            }),
            length: getGridLength(tree, axis),
            axis,
        })
        const isNoOp =
            sourceId !== null &&
            isNoOpMove(tree, sourceId, { type: 'edge', position })
        return hasRoom && !isNoOp
            ? [{ axis, rect: rects[position], referenceId: null, position }]
            : []
    })
}

/* The view a new line can be placed next to on this side of the divider:
 * the node itself, or what is left of a pair once the dragged view has
 * moved out of it. Dividers next to the dragged view itself are skipped
 * before this. */
const getReferenceId = (
    node: GridNode,
    sourceId: string | null
): string | null => {
    if (node.type === 'leaf') {
        return node.id
    }
    const [first, second, ...rest] = node.children
    if (rest.length || first?.type !== 'leaf' || second?.type !== 'leaf') {
        return null
    }
    if (first.id === sourceId) {
        return second.id
    }
    return second.id === sourceId ? first.id : null
}

const isLeaf = (node: GridNode, id: string | null): boolean =>
    node.type === 'leaf' && node.id === id

export const getInsertZones = (
    tree: GridTree,
    {
        sourceId = null,
        thickness = INSERT_ZONE_THICKNESS,
        outerThickness = OUTER_ZONE_THICKNESS,
    }: {
        sourceId?: string | null
        thickness?: number
        outerThickness?: number
    } = {}
): InsertZone[] => {
    /* An empty grid takes its first view anywhere */
    if (!getLeaves(tree.root).length) {
        return []
    }
    const rects = getNodeRects(tree)
    const zones: InsertZone[] = []

    const visit = (node: GridNode, orientation: GridOrientation): void => {
        if (node.type === 'leaf') {
            return
        }
        const axis = axisOf(orientation)
        const branchRect = rects.get(node) as Rect
        const hasRoom = hasRoomToInsertLine({
            minLength: getMinLength(node, orientation, {
                axis,
                excludeId: sourceId,
            }),
            length: lengthOf(branchRect, axis),
            axis,
        })

        node.children.forEach((after, index) => {
            const before = node.children[index - 1]
            if (
                !before ||
                !hasRoom ||
                isLeaf(before, sourceId) ||
                isLeaf(after, sourceId)
            ) {
                return
            }
            const beforeId = getReferenceId(before, sourceId)
            const afterId = getReferenceId(after, sourceId)
            const reference = beforeId
                ? {
                      referenceId: beforeId,
                      position: (axis === 'horizontal'
                          ? 'right'
                          : 'bottom') as InsertPosition,
                  }
                : afterId && {
                      referenceId: afterId,
                      position: (axis === 'horizontal'
                          ? 'left'
                          : 'top') as InsertPosition,
                  }
            if (!reference) {
                return
            }
            const divider =
                startOf(rects.get(after) as Rect, axis) - thickness / 2
            zones.push({
                axis,
                ...reference,
                rect:
                    axis === 'horizontal'
                        ? { ...branchRect, left: divider, width: thickness }
                        : { ...branchRect, top: divider, height: thickness },
            })
        })
        node.children.forEach((child) => visit(child, orthogonal(orientation)))
    }

    visit(tree.root, tree.orientation)
    /* Last, so they sit above the ends of the dividers' strips */
    return [
        ...zones,
        ...getOuterZones(tree, { sourceId, thickness: outerThickness }),
    ]
}
