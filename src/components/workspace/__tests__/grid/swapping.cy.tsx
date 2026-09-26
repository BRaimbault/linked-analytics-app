import {
    dragTo,
    expectLayout,
    getCell,
    PREVIEW,
    pointIn,
    setUpSeventyThirty,
    setUpStack,
    SMOKE,
    toolTabs,
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

        cy.document().then((doc) =>
            cy
                .wrap(
                    getCell(doc, 'Map 1').querySelector(
                        '[data-test="view-actions-button"]'
                    ) as HTMLElement
                )
                .click()
        )
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

    it('keeps each view’s settings tab through a swap', () => {
        setUpSeventyThirty()

        dragTo({ tab: 'Visualization 1' }, (doc) =>
            pointIn(doc, 'Map 1', [0.5, 0.5])
        )

        toolTabs().should('deep.equal', [
            'Add views',
            'Map 1 settings',
            'Visualization 1 settings',
        ])
        cy.get('[data-test="selected-view-tab"]').should(
            'have.text',
            'Visualization 1'
        )
    })
})
