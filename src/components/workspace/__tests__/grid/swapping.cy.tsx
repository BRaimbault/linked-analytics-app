import {
    cellSize,
    clickTile,
    dragTo,
    expectLayout,
    inViewHeader,
    mountWorkspace,
    NO_PREVIEW,
    PREVIEW,
    pointIn,
    setUpSeventyThirty,
    setUpStack,
    SMOKE,
    expectToolTabs,
} from './grid-helpers'

describe('swapping views', () => {
    it(
        'swaps two views dropped onto each other, keeping their sizes',
        SMOKE,
        () => {
            setUpSeventyThirty()

            dragTo({ tab: 'Visualization 1' }, (doc) =>
                pointIn(doc, 'Map 1', [0.5, 0.5])
            ).should('deep.equal', PREVIEW)

            expectLayout({
                'Visualization 1': { x: 0, w: 70 },
                'Map 1': { x: 70, w: 30 },
            })
        }
    )

    it('swaps a view from its menu, without dragging', SMOKE, () => {
        setUpSeventyThirty()

        inViewHeader('Map 1', '[data-test="view-actions-button"]').click()
        cy.contains('Swap with Visualization 1').click()

        expectLayout({
            'Visualization 1': { x: 0, w: 70 },
            'Map 1': { x: 70, w: 30 },
        })
    })

    it('swaps views of different sizes in a stack, each taking the other’s cell', () => {
        setUpStack()

        dragTo({ tab: 'Map 1' }, (doc) => pointIn(doc, 'Map 2', [0.5, 0.5]))

        expectLayout({
            'Map 2': { x: 0, w: 35, h: 100 },
            'Visualization 1': { x: 35, y: 0, w: 65, h: 50 },
            'Map 1': { x: 35, y: 50, w: 65, h: 50 },
        })
    })

    it('offers no swap that would put a view in a cell below its minimum', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        clickTile('period-selector')
        cellSize('Period 1').its('height').should('be.closeTo', 120, 2)

        /* A map needs 160px; the selector bar is 120px */
        dragTo({ tab: 'Map 1' }, (doc) =>
            pointIn(doc, 'Period 1', [0.5, 0.5])
        ).should('deep.equal', NO_PREVIEW)
        inViewHeader('Map 1', '[data-test="view-actions-button"]').click()

        cy.contains('Swap with Visualization 1').should('be.visible')
        cy.contains('Swap with Period 1').should('not.exist')
        expectLayout({
            'Period 1': { y: 0, w: 100 },
            'Map 1': { x: 0, w: 50 },
            'Visualization 1': { x: 50, w: 50 },
        })
    })

    it('keeps each view’s settings tab through a swap', () => {
        setUpSeventyThirty()

        dragTo({ tab: 'Visualization 1' }, (doc) =>
            pointIn(doc, 'Map 1', [0.5, 0.5])
        )

        expectToolTabs(['Workspace', 'Add views', 'Map 1', 'Visualization 1'])
    })
})
