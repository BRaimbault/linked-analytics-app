import type { GridNode, GridTree } from '../grid-tree'

/* Describes a layout by relative weights: `row` lays its children out side
 * by side, `column` stacks them. Weights are shares of the parent. */
type ViewSpec = { id: string; weight: number }
type BranchSpec = {
    kind: 'row' | 'column'
    weight: number
    children: Spec[]
}
type Spec = ViewSpec | BranchSpec

export const view = (id: string, weight = 1): ViewSpec => ({ id, weight })

export const row = (weight: number, ...children: Spec[]): BranchSpec => ({
    kind: 'row',
    weight,
    children,
})

export const column = (weight: number, ...children: Spec[]): BranchSpec => ({
    kind: 'column',
    weight,
    children,
})

/* size: the node's length along its parent's axis; ownLength: the length
 * its children share */
const toNode = (spec: Spec, size: number, ownLength: number): GridNode => {
    if (!('kind' in spec)) {
        return { type: 'leaf', id: spec.id, size }
    }
    const total = spec.children.reduce((sum, child) => sum + child.weight, 0)
    return {
        type: 'branch',
        size,
        children: spec.children.map((child) =>
            toNode(child, (ownLength * child.weight) / total, size)
        ),
    }
}

export const buildTree = (
    width: number,
    height: number,
    root: BranchSpec
): GridTree => {
    const isRow = root.kind === 'row'
    return {
        orientation: isRow ? 'HORIZONTAL' : 'VERTICAL',
        width,
        height,
        root: toNode(
            root,
            isRow ? height : width,
            isRow ? width : height
        ) as GridTree['root'],
    }
}
