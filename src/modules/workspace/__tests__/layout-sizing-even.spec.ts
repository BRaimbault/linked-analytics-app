import { computeEvenSizes } from '@modules/workspace/layout-sizing'
import { describe, expect, it } from 'vitest'
import { buildTree, column, row, selector, view } from './grid-tree-builders'

const W = 1200
const H = 800

describe('computeEvenSizes', () => {
    it('gives side-by-side views the same width', () => {
        const tree = buildTree(W, H, row(1, view('a', 70), view('b', 30)))

        expect(computeEvenSizes(tree)).toEqual([{ id: 'a', width: 600 }])
    })

    it('evens out every level of a nested layout', () => {
        const tree = buildTree(
            W,
            H,
            row(1, view('a', 1), column(3, view('b', 7), view('c', 3)))
        )

        expect(computeEvenSizes(tree)).toEqual([
            { id: 'a', width: 600 },
            { id: 'b', height: 400 },
        ])
    })

    it('gives a bar of selectors its preferred height, and the views the rest', () => {
        const tree = buildTree(
            W,
            H,
            column(1, selector('w', 1), row(1, view('a', 3), view('b', 1)))
        )

        expect(computeEvenSizes(tree)).toEqual([
            { id: 'w', height: 120 },
            { id: 'a', width: 600 },
        ])
    })

    it('asks for nothing when the sizes are already even', () => {
        const tree = buildTree(W, H, row(1, view('a'), view('b')))

        expect(computeEvenSizes(tree)).toEqual([])
    })
})
