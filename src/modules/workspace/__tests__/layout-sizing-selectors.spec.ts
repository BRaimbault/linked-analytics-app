import { describe, expect, it } from 'vitest'
import { PLUGIN_SIZES } from '../grid-tree'
import { computeLayoutSizes } from '../layout-sizing'
import { buildTree, column, row, view, selector } from './grid-tree-builders'

/* 1200×800 grids. `before` is the user's layout; `after` is how dockview
 * lays it out after the change, spreading space evenly. */
const W = 1200
const H = 800

describe('computeLayoutSizes with selectors', () => {
    /* The placeholder selector: preferred 320×120 */

    it('gives a selector row at the outer edge its preferred height', () => {
        const before = buildTree(W, H, row(1, view('a', 70), view('b', 30)))
        const after = buildTree(
            W,
            H,
            column(1, selector('w'), row(1, view('a'), view('b')))
        )

        expect(
            computeLayoutSizes(before, after, { kind: 'insert', placedId: 'w' })
        ).toEqual([
            { id: 'w', height: 120 },
            { id: 'a', width: 840 },
        ])
    })

    it('counts a selector next to a plugin like a plugin', () => {
        const before = buildTree(
            W,
            H,
            column(1, row(1, selector('w'), view('a')), view('b'))
        )
        const after = buildTree(
            W,
            H,
            column(
                1,
                row(2, selector('w'), view('a')),
                view('b', 1),
                view('c', 1)
            )
        )

        /* Three rows of a third; the selector keeps its width in its row */
        expect(
            computeLayoutSizes(before, after, { kind: 'insert', placedId: 'c' })
        ).toEqual([
            { id: 'w', height: 267 },
            { id: 'b', height: 266 },
            { id: 'w', width: 600 },
        ])
    })

    it('gives a selector splitting a plugin its preferred size, the plugin the rest', () => {
        const before = buildTree(W, H, row(1, view('a', 70), view('b', 30)))
        const after = buildTree(
            W,
            H,
            row(1, view('a'), selector('w'), view('b'))
        )

        expect(
            computeLayoutSizes(before, after, {
                kind: 'split',
                placedId: 'w',
                targetId: 'a',
            })
        ).toEqual([
            { id: 'a', width: 520 },
            { id: 'w', width: 320 },
        ])
    })

    it('keeps a selector row\u2019s height when a neighbour closes', () => {
        const before = buildTree(
            W,
            H,
            column(1, selector('w'), view('a'), view('b'))
        )
        const after = buildTree(W, H, column(1, selector('w'), view('a')))

        /* It had a third of the height, and keeps it */
        expect(computeLayoutSizes(before, after)).toEqual([
            { id: 'w', height: 267 },
        ])
    })

    it('gives a closed selector\u2019s space to its neighbours in proportion', () => {
        const before = buildTree(
            W,
            H,
            column(1, view('a', 240), view('b', 440), selector('w', 120))
        )
        const after = buildTree(W, H, column(1, view('a'), view('b')))

        expect(computeLayoutSizes(before, after)).toEqual([
            { id: 'a', height: 282 },
        ])
    })

    it('copes with a plugin that had no room at all', () => {
        const before = buildTree(W, H, row(1, selector('w', 1), view('a', 0)))
        const after = buildTree(W, H, row(1, selector('w'), view('a')))

        /* The selector keeps all it can, leaving the plugin its minimum */
        expect(computeLayoutSizes(before, after)).toEqual([
            { id: 'w', width: W - PLUGIN_SIZES.min.width },
        ])
    })

    it('lets two stacked selectors next to a plugin fill their column', () => {
        const before = buildTree(
            W,
            H,
            row(1, view('a', 3), column(1, selector('w'), selector('v')))
        )
        const after = buildTree(
            W,
            H,
            row(1, view('a', 3), column(1, selector('w', 1), selector('v', 3)))
        )

        /* Each gets half the height */
        expect(computeLayoutSizes(before, after)).toEqual([
            { id: 'a', width: 900 },
            { id: 'w', height: 400 },
        ])
    })

    it('shares a bar of selectors equally when one joins it', () => {
        const before = buildTree(
            W,
            H,
            column(1, selector('s1', 120), view('a', 680))
        )
        const after = buildTree(
            W,
            H,
            column(
                1,
                row(120, selector('s1', 3), selector('s2', 1)),
                view('a', 680)
            )
        )

        expect(
            computeLayoutSizes(before, after, {
                kind: 'insert',
                placedId: 's2',
            })
        ).toEqual([
            { id: 's1', height: 120 },
            { id: 's1', width: 600 },
        ])
    })

    it('shares the grid among selectors when no plugin is left', () => {
        const before = buildTree(
            W,
            H,
            row(1, selector('w1', 300), selector('w2', 300), view('a', 600))
        )
        const after = buildTree(
            W,
            H,
            row(1, selector('w1', 2), selector('w2', 1))
        )

        expect(computeLayoutSizes(before, after)).toEqual([
            { id: 'w1', width: 600 },
        ])
    })
})
