import { computeViewChangeSizes } from '@modules/workspace/layout-sizing'
import { describe, expect, it } from 'vitest'
import {
    buildTree,
    column,
    row,
    selectorWith,
    view,
} from './grid-tree-builders'

/* 1200×800 grids laid out as the user left them; the selector `t` has
 * just changed control, so the tree holds its new sizes in its old cell.
 * Headers are hidden: a drop-down's preferred height is 61. */
const W = 1200
const H = 800

describe('computeViewChangeSizes', () => {
    it('shrinks a drop-down that was a tree to its preferred height, the map below taking the rest', () => {
        const tree = buildTree(
            W,
            H,
            column(1, selectorWith('t', 50, 'drop-down'), view('m', 50))
        )

        expect(computeViewChangeSizes(tree, 't')).toEqual([
            { id: 't', height: 61 },
        ])
    })

    it('grows a tree that was a drop-down to its minimum height', () => {
        const tree = buildTree(
            W,
            H,
            column(1, selectorWith('t', 61, 'tree'), view('m', 739))
        )

        expect(computeViewChangeSizes(tree, 't')).toEqual([
            { id: 't', height: 160 },
        ])
    })

    it('narrows a selector alone in its column to its preferred width', () => {
        const tree = buildTree(
            W,
            H,
            row(1, selectorWith('t', 400, 'drop-down'), view('m', 800))
        )

        expect(computeViewChangeSizes(tree, 't')).toEqual([
            { id: 't', width: 320 },
        ])
    })

    it('shares a column of selectors alone in proportion, as when a view leaves', () => {
        const tree = buildTree(
            W,
            H,
            row(
                1,
                column(
                    340,
                    selectorWith('p', 63, 'timeline'),
                    selectorWith('t', 676, 'drop-down'),
                    selectorWith('d', 61, 'drop-down')
                ),
                view('m', 860)
            )
        )

        /* 63, 61 and 61 shared over the 800px column, which keeps its width */
        expect(computeViewChangeSizes(tree, 't')).toEqual([
            { id: 'p', width: 340 },
            { id: 'p', height: 272 },
            { id: 't', height: 264 },
        ])
    })

    it('gives the column back to a tree, its neighbours back at their preferred heights', () => {
        /* The drop-down `d` kept a share from when all three were drop-downs */
        const tree = buildTree(
            W,
            H,
            row(
                1,
                column(
                    340,
                    selectorWith('p', 200, 'timeline'),
                    selectorWith('t', 400, 'tree'),
                    selectorWith('d', 200, 'drop-down')
                ),
                view('m', 860)
            )
        )

        /* 63 and 61 for the timeline and the drop-down, the rest for the
         * tree */
        expect(computeViewChangeSizes(tree, 't')).toEqual([
            { id: 'p', width: 340 },
            { id: 'p', height: 63 },
            { id: 't', height: 676 },
        ])
    })

    it('leaves the grid as it is when the view already has its size, has no preferred size, or is gone', () => {
        const tree = buildTree(
            W,
            H,
            column(1, selectorWith('t', 61, 'drop-down'), view('m', 739))
        )

        expect(computeViewChangeSizes(tree, 't')).toEqual([])
        expect(computeViewChangeSizes(tree, 'm')).toEqual([])
        expect(computeViewChangeSizes(tree, 'gone')).toEqual([])
    })
})
