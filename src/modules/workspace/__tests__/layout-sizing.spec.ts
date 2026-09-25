import { describe, expect, it } from 'vitest'
import { computeLayoutSizes, fitToLimits } from '../layout-sizing'
import { buildTree, column, row, view, selector } from './grid-tree-builders'

/* 1200×800 grids. `before` is the user's layout; `after` is how dockview
 * lays it out after the change, spreading space evenly. */
const W = 1200
const H = 800

describe('computeLayoutSizes', () => {
    it('gives a column added at the outer edge its share and keeps the others in proportion', () => {
        const before = buildTree(W, H, row(1, view('a', 70), view('b', 30)))
        const after = buildTree(W, H, row(1, view('a'), view('b'), view('d')))

        expect(
            computeLayoutSizes(before, after, {
                kind: 'insert',
                placedId: 'd',
            })
        ).toEqual([
            { id: 'a', width: 560 },
            { id: 'b', width: 240 },
        ])
    })

    it('gives a row added at the bottom the height of the row it joins, keeping the columns above', () => {
        const before = buildTree(W, H, row(1, view('a', 70), view('b', 30)))
        const after = buildTree(
            W,
            H,
            column(1, row(3, view('a'), view('b')), view('d', 1))
        )

        expect(
            computeLayoutSizes(before, after, {
                kind: 'insert',
                placedId: 'd',
            })
        ).toEqual([
            { id: 'a', height: 400 },
            { id: 'a', width: 840 },
        ])
    })

    it('counts stacked views when sizing a new row, so it matches its neighbours', () => {
        const before = buildTree(
            W,
            H,
            row(1, view('a'), column(1, view('b'), view('c')))
        )
        const after = buildTree(
            W,
            H,
            column(
                1,
                row(1, view('a'), column(1, view('b'), view('c'))),
                view('d')
            )
        )

        expect(
            computeLayoutSizes(before, after, {
                kind: 'insert',
                placedId: 'd',
            })
        ).toEqual([
            { id: 'a', height: 533 },
            { id: 'a', width: 600 },
            { id: 'b', height: 267 },
        ])
    })

    it('halves a split cell and leaves the others as they were', () => {
        const before = buildTree(W, H, row(1, view('a', 70), view('b', 30)))
        const after = buildTree(W, H, row(1, view('a'), view('d'), view('b')))

        expect(
            computeLayoutSizes(before, after, {
                kind: 'split',
                placedId: 'd',
                targetId: 'a',
            })
        ).toEqual([
            { id: 'a', width: 420 },
            { id: 'd', width: 420 },
        ])
    })

    it('puts the placed view on the side it was dropped on', () => {
        const before = buildTree(W, H, row(1, view('a', 70), view('b', 30)))
        const after = buildTree(W, H, row(1, view('d'), view('a'), view('b')))

        expect(
            computeLayoutSizes(before, after, {
                kind: 'split',
                placedId: 'd',
                targetId: 'a',
            })
        ).toEqual([
            { id: 'd', width: 420 },
            { id: 'a', width: 420 },
        ])
    })

    it('halves a cell split across, keeping its column width', () => {
        const before = buildTree(W, H, row(1, view('a', 70), view('b', 30)))
        const after = buildTree(
            W,
            H,
            row(1, column(1, view('a'), view('d')), view('b'))
        )

        expect(
            computeLayoutSizes(before, after, {
                kind: 'split',
                placedId: 'd',
                targetId: 'a',
            })
        ).toEqual([
            { id: 'a', width: 840 },
            { id: 'a', height: 400 },
        ])
    })

    it('shares the space of a closed view among its neighbours in proportion', () => {
        const before = buildTree(
            W,
            H,
            row(1, view('a', 48), view('b', 19), view('c', 33))
        )

        const closeMiddle = buildTree(W, H, row(1, view('a'), view('c')))
        expect(computeLayoutSizes(before, closeMiddle)).toEqual([
            { id: 'a', width: 711 },
        ])

        const closeLast = buildTree(W, H, row(1, view('a'), view('b')))
        expect(computeLayoutSizes(before, closeLast)).toEqual([
            { id: 'a', width: 860 },
        ])
    })

    it('frees the space of a view moved to the outer edge', () => {
        const before = buildTree(
            W,
            H,
            row(1, view('a', 35), column(65, view('b'), view('c')))
        )
        const after = buildTree(W, H, row(1, view('a'), view('b'), view('c')))

        expect(
            computeLayoutSizes(before, after, {
                kind: 'insert',
                placedId: 'c',
            })
        ).toEqual([
            { id: 'a', width: 280 },
            { id: 'b', width: 520 },
        ])
    })

    it('gives a view inserted between two stacked views a third of the stack', () => {
        const before = buildTree(
            W,
            H,
            row(1, view('a'), column(1, view('b'), view('c')))
        )
        const after = buildTree(
            W,
            H,
            row(1, view('a'), column(1, view('b', 2), view('d'), view('c')))
        )

        expect(
            computeLayoutSizes(before, after, {
                kind: 'insert',
                placedId: 'd',
            })
        ).toEqual([
            { id: 'a', width: 600 },
            { id: 'b', height: 267 },
            { id: 'd', height: 266 },
        ])
    })

    it('changes nothing when the layout already matches, e.g. after a swap', () => {
        const layout = buildTree(W, H, row(1, view('a', 70), view('b', 30)))

        expect(computeLayoutSizes(layout, layout)).toEqual([])
    })

    it('puts back the sizes a view had before another one was maximized', () => {
        const before = buildTree(W, H, row(1, view('a', 70), view('b', 30)))
        const restored = buildTree(W, H, row(1, view('a'), view('b')))

        expect(computeLayoutSizes(before, restored)).toEqual([
            { id: 'a', width: 840 },
        ])
    })

    it('keeps every view at its minimum size, taking the room from the larger ones', () => {
        const before = buildTree(
            W,
            H,
            row(1, view('a', 60), view('b', 20), view('c', 20))
        )
        const after = buildTree(
            W,
            H,
            row(1, view('a'), view('b'), view('c'), view('d'))
        )

        expect(
            computeLayoutSizes(before, after, {
                kind: 'insert',
                placedId: 'd',
            })
        ).toEqual([
            { id: 'a', width: 463 },
            { id: 'b', width: 240 },
            { id: 'c', width: 240 },
        ])
    })

    it('fills the first view of an empty grid as it is', () => {
        const empty = buildTree(W, H, row(1))
        const first = buildTree(W, H, row(1, view('a')))

        expect(
            computeLayoutSizes(empty, first, {
                kind: 'insert',
                placedId: 'a',
            })
        ).toEqual([])
    })

    it('treats a split of an unknown cell as a new line', () => {
        const before = buildTree(W, H, row(1, view('a', 70), view('b', 30)))
        const after = buildTree(W, H, row(1, view('a'), view('b'), view('d')))

        expect(
            computeLayoutSizes(before, after, {
                kind: 'split',
                placedId: 'd',
                targetId: 'gone',
            })
        ).toEqual([
            { id: 'a', width: 560 },
            { id: 'b', width: 240 },
        ])
    })

    it('does nothing before the grid has a size', () => {
        const before = buildTree(W, H, row(1, view('a', 70), view('b', 30)))
        const unmeasured = buildTree(0, 0, row(1, view('a'), view('b')))

        expect(computeLayoutSizes(before, unmeasured)).toEqual([])
    })

    it('skips a branch that holds no view of its own to resize it by', () => {
        const before = buildTree(
            W,
            H,
            row(
                1,
                column(
                    3,
                    row(1, view('a'), view('b')),
                    row(1, view('c'), view('d'))
                ),
                view('e', 1)
            )
        )
        const after = buildTree(
            W,
            H,
            row(
                1,
                column(
                    1,
                    row(1, view('a'), view('b')),
                    row(1, view('c'), view('d'))
                ),
                view('e', 1)
            )
        )

        expect(computeLayoutSizes(before, after)).toEqual([
            { id: 'a', height: 400 },
            { id: 'a', width: 450 },
            { id: 'c', width: 450 },
        ])
    })
})

describe('computeLayoutSizes with selectors', () => {
    /* The placeholder selector: preferred 320×120, at most 640×240 */

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

    it('keeps a selector row when a neighbour closes, within its maximum', () => {
        const before = buildTree(
            W,
            H,
            column(1, selector('w'), view('a'), view('b'))
        )
        const after = buildTree(W, H, column(1, selector('w'), view('a')))

        /* It had a third (267px), more than its 240px maximum */
        expect(computeLayoutSizes(before, after)).toEqual([
            { id: 'w', height: 240 },
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

        expect(computeLayoutSizes(before, after)).toEqual([
            { id: 'w', width: 640 },
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

        /* Each gets half the height, past the selector maximum */
        expect(computeLayoutSizes(before, after)).toEqual([
            { id: 'a', width: 900 },
            { id: 'w', height: 400 },
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

describe('fitToLimits', () => {
    const withMinimums = (minimums: number[]) => ({
        minimums,
        maximums: minimums.map(() => Infinity),
    })

    it('raises lengths below their minimum and shares the rest in proportion', () => {
        expect(
            fitToLimits([900, 100, 200], withMinimums([100, 200, 100]), 1200)
        ).toEqual([(1000 * 900) / 1100, 200, (1000 * 200) / 1100])
    })

    it('keeps raising lengths until every one fits', () => {
        expect(
            fitToLimits([1000, 150, 250], withMinimums([100, 200, 240]), 1200)
        ).toEqual([760, 200, 240])
    })

    it('shares the rest equally when the others had no length', () => {
        expect(
            fitToLimits([0, 0, 0], withMinimums([100, 100, 0]), 300)
        ).toEqual([100, 100, 100])
    })

    it('leaves the lengths to the grid when even the minimums do not fit', () => {
        expect(fitToLimits([100, 100], withMinimums([200, 200]), 300)).toEqual([
            100, 100,
        ])
    })

    it('holds lengths above their maximum down and gives the rest to the others', () => {
        expect(
            fitToLimits(
                [600, 600],
                { minimums: [100, 100], maximums: [200, Infinity] },
                1200
            )
        ).toEqual([200, 1000])
    })
})
