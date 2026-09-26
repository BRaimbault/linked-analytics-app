import {
    clickTile,
    dragTo,
    expectLayout,
    inHeader,
    INSERT_LINE,
    mountWorkspace,
    NO_PREVIEW,
    outerEdge,
    pointIn,
    PREVIEW,
    setUpCapture,
    setUpSeventyThirty,
    setUpStack,
    SMOKE,
} from './grid-helpers'

describe('moving views', () => {
    it('moves a view to the outer edge, freeing its space', SMOKE, () => {
        setUpStack()

        dragTo({ tab: 'Map 2' }, (doc) => outerEdge(doc, 'right', 0.7)).should(
            'deep.equal',
            INSERT_LINE
        )

        expectLayout({
            'Map 1': { x: 0, w: 23.3, h: 100 },
            'Visualization 1': { x: 23.3, w: 43.3, h: 100 },
            'Map 2': { x: 66.7, w: 33.3, h: 100 },
        })
    })

    it(
        'moves a short row spanning part of the grid to the top or bottom edge',
        SMOKE,
        () => {
            setUpCapture()
            dragTo({ tab: 'Map 2' }, (doc) => outerEdge(doc, 'top')).should(
                'deep.equal',
                INSERT_LINE
            )
            expectLayout({
                'Map 2': { y: 0, w: 100, h: 50 },
                'Map 1': { y: 50, w: 50, h: 50 },
                'Visualization 2': { y: 50, w: 25 },
                'Visualization 1': { y: 50, w: 25 },
            })

            setUpCapture()
            dragTo({ tab: 'Map 2' }, (doc) => outerEdge(doc, 'bottom'))
            expectLayout({
                'Map 1': { y: 0, w: 50, h: 50 },
                'Visualization 2': { y: 0, w: 25 },
                'Visualization 1': { y: 0, w: 25 },
                'Map 2': { y: 50, w: 100, h: 50 },
            })
        }
    )

    it('moves a view onto the edge of another, halving it', () => {
        setUpStack()

        dragTo({ tab: 'Map 2' }, (doc) =>
            pointIn(doc, 'Map 1', [0.5, 0.85])
        ).should('deep.equal', PREVIEW)

        expectLayout({
            'Map 1': { x: 0, y: 0, w: 35, h: 50 },
            'Map 2': { x: 0, y: 50, w: 35, h: 50 },
            'Visualization 1': { x: 35, w: 65, h: 100 },
        })
    })

    it('moves a view between two others', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        clickTile('map')

        dragTo({ tab: 'Map 1' }, (doc) =>
            pointIn(doc, 'Map 2', [0, 0.5])
        ).should('deep.equal', INSERT_LINE)

        expectLayout({
            'Visualization 1': { x: 0, w: 33.3 },
            'Map 1': { x: 33.3, w: 33.3 },
            'Map 2': { x: 66.7, w: 33.3 },
        })
    })

    it('takes a view dropped on the header below a divider as a drop on the divider', () => {
        setUpStack()

        dragTo({ tab: 'Map 1' }, (doc) => inHeader(doc, 'Map 2')).should(
            'deep.equal',
            INSERT_LINE
        )

        expectLayout({
            'Visualization 1': { y: 0, w: 100, h: 33.3 },
            'Map 1': { y: 33.3, w: 100, h: 33.3 },
            'Map 2': { y: 66.7, w: 100, h: 33.3 },
        })
    })

    it('takes a view dropped on a top-row header as a drop on the top edge', () => {
        setUpSeventyThirty()

        dragTo({ tab: 'Visualization 1' }, (doc) =>
            inHeader(doc, 'Map 1')
        ).should('deep.equal', INSERT_LINE)

        expectLayout({
            'Visualization 1': { y: 0, w: 100, h: 50 },
            'Map 1': { y: 50, w: 100, h: 50 },
        })
    })

    it('does nothing for a view dropped on the header just below it', () => {
        setUpStack()

        dragTo({ tab: 'Visualization 1' }, (doc) =>
            inHeader(doc, 'Map 2')
        ).should('deep.equal', NO_PREVIEW)

        expectLayout({
            'Map 1': { w: 35, h: 100 },
            'Visualization 1': { x: 35, h: 50 },
            'Map 2': { x: 35, y: 50, h: 50 },
        })
    })

    it('moves a view out of a stack to the line beside it', () => {
        setUpStack()

        dragTo({ tab: 'Map 2' }, (doc) =>
            pointIn(doc, 'Visualization 1', [0, 0.5])
        ).should('deep.equal', INSERT_LINE)

        expectLayout({
            'Map 1': { x: 0, h: 100 },
            'Map 2': { h: 100 },
            'Visualization 1': { h: 100 },
        })
    })

    it(
        'shows no preview for a drop that would leave a view where it is',
        SMOKE,
        () => {
            setUpSeventyThirty()

            dragTo(
                { tab: 'Map 1' },
                (doc) => pointIn(doc, 'Map 1', [0.4, 0.5]),
                {
                    drop: false,
                }
            ).should('deep.equal', NO_PREVIEW)
            dragTo(
                { tab: 'Map 1' },
                (doc) => pointIn(doc, 'Visualization 1', [0.1, 0.5]),
                { drop: false }
            ).should('deep.equal', NO_PREVIEW)
            dragTo({ tab: 'Map 1' }, (doc) => outerEdge(doc, 'left'), {
                drop: false,
            }).should('deep.equal', NO_PREVIEW)
            dragTo({ tab: 'Map 1' }, (doc) => outerEdge(doc, 'bottom'), {
                drop: false,
            }).should('deep.equal', INSERT_LINE)

            expectLayout({ 'Map 1': { w: 70 }, 'Visualization 1': { w: 30 } })
        }
    )

    it('offers no line next to the view being moved', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        clickTile('map')

        /* The lines on both sides of Visualization 1 would leave it there */
        dragTo(
            { tab: 'Visualization 1' },
            (doc) => pointIn(doc, 'Visualization 1', [0, 0.5]),
            { drop: false }
        ).should('deep.equal', NO_PREVIEW)
        dragTo(
            { tab: 'Visualization 1' },
            (doc) => pointIn(doc, 'Map 2', [0, 0.5]),
            { drop: false }
        ).should('deep.equal', NO_PREVIEW)
    })

    it('leaves the only view where it is', () => {
        mountWorkspace()
        clickTile('map')

        for (const side of ['left', 'right', 'top', 'bottom'] as const) {
            dragTo({ tab: 'Map 1' }, (doc) => outerEdge(doc, side, 0.5), {
                drop: false,
            }).should('deep.equal', NO_PREVIEW)
        }
        expectLayout({ 'Map 1': { w: 100, h: 100 } })
    })
})
