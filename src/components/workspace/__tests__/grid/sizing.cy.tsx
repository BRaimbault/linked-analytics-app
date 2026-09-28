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
    clickTile,
    getCell,
    getCells,
    INSERT_LINE,
    mountWorkspace,
    pointIn,
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

    it('scrolls to views that don’t fit a narrow window, instead of cutting them off', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        /* Nothing scrolls while the views fit, not even the overlays
         * dockview hasn't positioned yet */
        cy.get('[data-test="workspace-scroller"]').should(([scroller]) => {
            expect(scroller.scrollHeight).to.equal(scroller.clientHeight)
            expect(scroller.scrollWidth).to.equal(scroller.clientWidth)
        })

        cy.get('[data-test="workspace-scroller"]').invoke(
            'css',
            'width',
            '360px'
        )

        cy.get('[data-test="workspace"]')
            .invoke('outerWidth')
            .should('be.at.least', 480)
        inViewHeader('Visualization 1', '.dv-default-tab-action')
            .scrollIntoView()
            .should('be.visible')
            .click()
        cy.get('[data-test="workspace"]')
            .invoke('outerWidth')
            .should('be.closeTo', 360, 1)
    })

    it('counts the tools strip on the side in the room a narrow window scrolls to', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        cy.get('[data-test="move-tools-button"]').click()
        cy.get('[data-test="move-tools-left"]').click()

        cy.get('[data-test="workspace-scroller"]').invoke(
            'css',
            'width',
            '360px'
        )

        cy.get('[data-test="workspace"]').should(([workspace]) => {
            const right = workspace.getBoundingClientRect().right
            for (const cell of getCells(workspace.ownerDocument)) {
                expect(cell.getBoundingClientRect().right).to.be.at.most(
                    right + 1
                )
            }
        })
        inViewHeader('Visualization 1', '.dv-default-tab-action')
            .scrollIntoView()
            .should('be.visible')
    })

    it('sizes a block of views when a selector column is dropped beside it', () => {
        /* Map 1 | Visualization 1 over Map 2 | Visualization 2 */
        mountWorkspace()
        clickTile('map')
        dragTo({ tile: 'visualization' }, (doc) =>
            pointIn(doc, 'Map 1', [0.85, 0.5])
        )
        dragTo({ tile: 'map' }, (doc) => outerEdge(doc, 'bottom'))
        dragTo({ tile: 'visualization' }, (doc) =>
            pointIn(doc, 'Map 2', [0.85, 0.5])
        )

        dragTo({ tile: 'org-unit-selector' }, (doc) =>
            outerEdge(doc, 'right')
        ).should('deep.equal', INSERT_LINE)

        /* The column gets its preferred width, and the block shares the
         * rest evenly, every view above its minimum */
        cellSize('Org unit 1').its('width').should('be.closeTo', 320, 2)
        cy.document().then((doc) => {
            const widths = [
                'Map 1',
                'Visualization 1',
                'Map 2',
                'Visualization 2',
            ].map((title) => getCell(doc, title).getBoundingClientRect().width)
            for (const width of widths) {
                expect(width).to.be.closeTo(widths[0], 2)
                expect(width).to.be.at.least(240)
            }
        })
    })

    it('adds no view while one is maximized, until it is restored', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        inViewHeader('Map 1', '[data-test="maximize-view-button"]').click()
        /* Maximizing selects Map 1, which brings its settings forward */
        cy.get('.dv-edge-group .dv-tab').contains('Add views').click()

        cy.get('[data-test="add-view-period-selector"]').should('be.disabled')

        inViewHeader('Map 1', '[data-test="maximize-view-button"]').click()
        cy.get('.dv-edge-group .dv-tab').contains('Add views').click()
        clickTile('period-selector')
        expectLayout({
            'Period 1': { y: 0, w: 100 },
            'Map 1': { w: 50 },
            'Visualization 1': { w: 50 },
        })
        cellSize('Period 1').its('height').should('be.closeTo', 120, 2)
    })

    it(
        'evens out the sizes from the Workspace tab, giving the selector bar its height back',
        SMOKE,
        () => {
            setUpSeventyThirty()
            clickTile('period-selector')
            dragDivider('Period 1', 'bottom', 0.4)
            cellSize('Period 1').its('height').should('be.greaterThan', 200)

            cy.get('.dv-edge-group .dv-tab').contains('Workspace').click()
            cy.get('[data-test="even-out-sizes"]').click()

            cellSize('Period 1').its('height').should('be.closeTo', 120, 2)
            expectLayout({
                'Period 1': { w: 100 },
                'Map 1': { w: 50 },
                'Visualization 1': { w: 50 },
            })
        }
    )
})
