import { describe, expect, it } from 'vitest'
import { computeLayoutSizes, fitToMinimums } from '../layout-sizing'
import { buildTree, column, row, view } from './grid-tree-builders'

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

describe('fitToMinimums', () => {
    it('raises lengths below their minimum and shares the rest in proportion', () => {
        expect(fitToMinimums([900, 100, 200], [100, 200, 100], 1200)).toEqual([
            (1000 * 900) / 1100,
            200,
            (1000 * 200) / 1100,
        ])
    })

    it('keeps raising lengths until every one fits', () => {
        expect(fitToMinimums([1000, 150, 250], [100, 200, 240], 1200)).toEqual([
            760, 200, 240,
        ])
    })

    it('shares the rest equally when the others had no length', () => {
        expect(fitToMinimums([0, 0, 0], [100, 100, 0], 300)).toEqual([
            100, 100, 100,
        ])
    })

    it('leaves the lengths to the grid when even the minimums do not fit', () => {
        expect(fitToMinimums([100, 100], [200, 200], 300)).toEqual([100, 100])
    })
})
