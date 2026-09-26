import {
    cellSize,
    closeView,
    dragDivider,
    dragTo,
    expectLayout,
    inViewHeader,
    outerEdge,
    setUpSeventyThirty,
    setUpStack,
    SMOKE,
} from './grid-helpers'

describe('sizing', () => {
    it(
        'shares a closed view’s space with the others in proportion',
        SMOKE,
        () => {
            setUpSeventyThirty()
            dragTo({ tile: 'map' }, (doc) => outerEdge(doc, 'right'))

            closeView('Visualization 1')

            expectLayout({ 'Map 1': { w: 58.3 }, 'Map 2': { w: 41.7 } })
        }
    )

    it('gives the space of the last view back to the others', () => {
        setUpSeventyThirty()
        dragTo({ tile: 'map' }, (doc) => outerEdge(doc, 'right'))

        closeView('Map 2')

        expectLayout({ 'Map 1': { w: 70 }, 'Visualization 1': { w: 30 } })
    })

    it('gives a closed view’s space to its neighbour in a stack', () => {
        setUpStack()

        closeView('Map 2')

        expectLayout({
            'Map 1': { w: 35, h: 100 },
            'Visualization 1': { x: 35, w: 65, h: 100 },
        })
    })

    it(
        'puts back the sizes the user set after a view is maximized',
        SMOKE,
        () => {
            setUpSeventyThirty()
            dragDivider('Map 1', 'right', 0.4)

            inViewHeader('Map 1', '[data-test="maximize-view-button"]').click()
            expectLayout({ 'Map 1': { w: 100, h: 100 } })
            inViewHeader('Map 1', '[data-test="maximize-view-button"]').click()

            expectLayout({ 'Map 1': { w: 40 }, 'Visualization 1': { w: 60 } })
        }
    )

    it('stops a divider at the minimum size of a view', () => {
        setUpSeventyThirty()

        dragDivider('Map 1', 'right', 0.02)
        cellSize('Map 1').its('width').should('be.closeTo', 240, 2)

        dragDivider('Map 1', 'right', 0.98)
        cellSize('Visualization 1').its('width').should('be.closeTo', 240, 2)
    })

    it('keeps the proportions when the window is resized', () => {
        setUpSeventyThirty()

        cy.viewport(1600, 800)
        expectLayout({ 'Map 1': { w: 70 }, 'Visualization 1': { w: 30 } })

        cy.viewport(1000, 800)
        expectLayout({ 'Map 1': { w: 70 }, 'Visualization 1': { w: 30 } })
    })
})
