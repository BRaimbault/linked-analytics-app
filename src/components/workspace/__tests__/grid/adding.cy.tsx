import {
    clickTile,
    dragTo,
    expectLayout,
    INSERT_LINE,
    mountWorkspace,
    NO_PREVIEW,
    outerEdge,
    pointIn,
    PREVIEW,
    setUpSeventyThirty,
    SMOKE,
    viewTitles,
} from './grid-helpers'

describe('adding views', () => {
    it('fills the empty grid with a tile dropped on it', SMOKE, () => {
        mountWorkspace()

        cy.get('[data-test="workspace-watermark"]').should('be.visible')
        dragTo({ tile: 'map' }, (doc) => {
            const empty = doc
                .querySelector('[data-test="workspace-watermark"]')
                ?.getBoundingClientRect() as DOMRect
            return [empty.left + empty.width / 2, empty.top + 20]
        })

        expectLayout({ 'Map 1': { x: 0, y: 0, w: 100, h: 100 } })
        cy.get('[data-test="workspace-watermark"]').should('not.exist')
    })

    it('fills the empty grid from its buttons', () => {
        mountWorkspace()

        cy.get('[data-test="watermark-add-visualization"]').click()

        expectLayout({ 'Visualization 1': { w: 100, h: 100 } })
    })

    it('adds a clicked tile next to the selected view', SMOKE, () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')

        expectLayout({
            'Map 1': { x: 0, w: 50, h: 100 },
            'Visualization 1': { x: 50, w: 50, h: 100 },
        })
    })

    it('adds a clicked tile below the selected view once it is too narrow to split', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        clickTile('map')
        clickTile('visualization')

        viewTitles().should('have.length', 4)
        cy.document().then((doc) => {
            const [third, fourth] = ['Map 2', 'Visualization 2'].map((title) =>
                pointIn(doc, title, [0, 0])
            )
            /* Stacked in the same column */
            expect(fourth[0]).to.be.closeTo(third[0], 1)
            expect(fourth[1]).to.be.greaterThan(third[1])
        })
    })

    for (const side of ['left', 'right', 'top', 'bottom'] as const) {
        it(`adds a line at the ${side} outer edge, half of the grid next to a single view`, () => {
            mountWorkspace()
            clickTile('map')

            dragTo({ tile: 'visualization' }, (doc) =>
                outerEdge(doc, side, 0.5)
            ).should('deep.equal', INSERT_LINE)

            const isRow = side === 'top' || side === 'bottom'
            const first = side === 'left' || side === 'top'
            expectLayout({
                'Map 1': isRow ? { h: 50, w: 100 } : { w: 50, h: 100 },
                'Visualization 1': isRow
                    ? { h: 50, y: first ? 0 : 50 }
                    : { w: 50, x: first ? 0 : 50 },
            })
        })
    }

    it(
        'gives a column added at the outer edge a third, keeping 70/30 between the others',
        SMOKE,
        () => {
            setUpSeventyThirty()

            dragTo({ tile: 'map' }, (doc) => outerEdge(doc, 'right')).should(
                'deep.equal',
                INSERT_LINE
            )

            expectLayout({
                'Map 1': { x: 0, w: 46.7 },
                'Visualization 1': { x: 46.7, w: 20 },
                'Map 2': { x: 66.7, w: 33.3, h: 100 },
            })
        }
    )

    it('gives a row added at the bottom the height of the row above', () => {
        setUpSeventyThirty()

        dragTo({ tile: 'map' }, (doc) => outerEdge(doc, 'bottom'))

        expectLayout({
            'Map 1': { w: 70, h: 50 },
            'Visualization 1': { w: 30, h: 50 },
            'Map 2': { y: 50, w: 100, h: 50 },
        })
    })

    it('halves the view whose edge a tile is dropped on', () => {
        setUpSeventyThirty()

        dragTo({ tile: 'map' }, (doc) =>
            pointIn(doc, 'Map 1', [0.9, 0.5])
        ).should('deep.equal', PREVIEW)

        expectLayout({
            'Map 1': { x: 0, w: 35 },
            'Map 2': { x: 35, w: 35 },
            'Visualization 1': { x: 70, w: 30 },
        })
    })

    it('halves a view across when a tile is dropped on its bottom edge', () => {
        setUpSeventyThirty()

        dragTo({ tile: 'visualization' }, (doc) =>
            pointIn(doc, 'Map 1', [0.5, 0.85])
        )

        expectLayout({
            'Map 1': { w: 70, h: 50 },
            'Visualization 2': { x: 0, y: 50, w: 70, h: 50 },
            'Visualization 1': { x: 70, w: 30, h: 100 },
        })
    })

    it('inserts a tile on the line between two views', SMOKE, () => {
        setUpSeventyThirty()

        dragTo({ tile: 'map' }, (doc) =>
            pointIn(doc, 'Visualization 1', [0, 0.5])
        ).should('deep.equal', INSERT_LINE)

        expectLayout({
            'Map 1': { x: 0, w: 46.7 },
            'Map 2': { x: 46.7, w: 33.3 },
            'Visualization 1': { x: 80, w: 20 },
        })
    })

    it('inserts a tile between two stacked views, a third each', () => {
        mountWorkspace()
        clickTile('map')
        dragTo({ tile: 'visualization' }, (doc) =>
            pointIn(doc, 'Map 1', [0.5, 0.85])
        )

        dragTo({ tile: 'map' }, (doc) =>
            pointIn(doc, 'Visualization 1', [0.5, 0])
        ).should('deep.equal', INSERT_LINE)

        expectLayout({
            'Map 1': { y: 0, h: 33.3 },
            'Map 2': { y: 33.3, h: 33.3 },
            'Visualization 1': { y: 66.7, h: 33.3 },
        })
    })

    it('offers no split of a view too small to halve', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        clickTile('map')

        /* Three columns of about 427px: halves would be under 240px */
        dragTo(
            { tile: 'visualization' },
            (doc) => pointIn(doc, 'Visualization 1', [0.95, 0.5]),
            { drop: false }
        ).should('deep.equal', NO_PREVIEW)
    })

    it('stops taking maps and visualizations once four are open', SMOKE, () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        clickTile('map')
        clickTile('visualization')

        cy.get('[data-test="add-view-map"]').should('be.disabled')
        cy.get('[data-test="add-view-visualization"]').should('be.disabled')
        dragTo({ tile: 'map' }, (doc) =>
            pointIn(doc, 'Map 1', [1, 0.5])
        ).should('deep.equal', NO_PREVIEW)
        viewTitles().should('have.length', 4)
    })
})
