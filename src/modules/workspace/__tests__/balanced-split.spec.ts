import { getBalancedSplitOrder } from '@modules/workspace/balanced-split'
import { describe, expect, it } from 'vitest'
import { buildTree, column, row, view } from './grid-tree-builders'

describe('getBalancedSplitOrder', () => {
    it.each([
        ['a wide cell', { width: 1400, height: 700 }, ['right', 'below']],
        ['a square cell', { width: 700, height: 700 }, ['below', 'right']],
        ['exactly 16:9', { width: 1600, height: 900 }, ['below', 'right']],
        ['a tall cell', { width: 800, height: 1200 }, ['below', 'right']],
    ] as const)(
        'halves %s alone the way nearer 16:9 first',
        (_, size, order) => {
            const tree = buildTree(size.width, size.height, row(1, view('a')))

            expect(getBalancedSplitOrder(tree, { id: 'a', ...size })).toEqual(
                order
            )
        }
    )

    it('goes by shape in an unmeasured grid, or for a cell not in it', () => {
        const size = { width: 1400, height: 700 }
        const tree = buildTree(1400, 700, row(1, view('a')))

        expect(getBalancedSplitOrder(null, { id: 'a', ...size })).toEqual([
            'right',
            'below',
        ])
        expect(getBalancedSplitOrder(tree, { id: 'gone', ...size })).toEqual([
            'right',
            'below',
        ])
    })

    /* Whatever their shape, so four views end as 2×2 in any window */
    it('halves a cell across the line it sits in', () => {
        const wide = { width: 1400, height: 300 }
        const tall = { width: 300, height: 1400 }
        const sideBySide = buildTree(1400, 700, row(1, view('a'), view('b')))
        const stacked = buildTree(700, 1400, column(1, view('a'), view('b')))

        expect(getBalancedSplitOrder(sideBySide, { id: 'a', ...wide })).toEqual(
            ['below', 'right']
        )
        expect(getBalancedSplitOrder(stacked, { id: 'a', ...tall })).toEqual([
            'right',
            'below',
        ])
    })
})
