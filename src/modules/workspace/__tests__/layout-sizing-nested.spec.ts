import { computeLayoutSizes } from '@modules/workspace/layout-sizing'
import { describe, expect, it } from 'vitest'
import { buildTree, column, row, selector, view } from './grid-tree-builders'

/* A branch whose children are all branches (a 2×2 block built from rows)
 * has no view of its own to be resized through */
const block = (weight = 1) =>
    column(weight, row(1, view('a'), view('b')), row(1, view('c'), view('d')))

describe('computeLayoutSizes with a branch that has no view of its own', () => {
    it('sizes the block through its neighbour when it is second to last', () => {
        const before = buildTree(1000, 700, block())
        /* A selector column dropped at the right outer edge */
        const after = buildTree(1000, 700, row(1, block(), selector('s')))

        const requests = computeLayoutSizes(before, after, {
            kind: 'insert',
            placedId: 's',
        })

        /* The selector gets its preferred width; the block takes the rest,
         * and its views are sized within that rest */
        expect(requests).toContainEqual({ id: 's', width: 320 })
        expect(requests).toContainEqual({ id: 'a', width: 340 })
        expect(requests).toContainEqual({ id: 'c', width: 340 })
    })

    it('leaves the line as dockview spread it, and sizes the block within its real length, when it sits further in', () => {
        /* The block is 600px wide, split 3 to 1 inside */
        const unevenBlock = (weight: number) =>
            column(
                weight,
                row(1, view('a', 3), view('b', 1)),
                row(1, view('c', 3), view('d', 1))
            )
        const before = buildTree(
            1200,
            700,
            row(1, unevenBlock(2), view('x', 1), view('z', 1))
        )
        /* dockview spread the line evenly, and the block's rows too */
        const after = buildTree(
            1200,
            700,
            row(1, block(1), view('x', 1), view('z', 1))
        )

        const widths = computeLayoutSizes(before, after).filter(
            (request) => 'width' in request
        )

        /* No request can size the block in this line, so the line is left
         * alone, and the block's views keep their 3 to 1 split of the
         * 400px it has, not of the 600px it had */
        expect(widths.map(({ id }) => id)).not.toContain('x')
        expect(widths).toContainEqual({ id: 'a', width: 300 })
        expect(widths).toContainEqual({ id: 'c', width: 300 })
    })
})
