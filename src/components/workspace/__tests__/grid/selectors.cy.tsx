import {
    cellSize,
    clickTile,
    closeView,
    dragDivider,
    dragTo,
    expectLayout,
    getCell,
    INSERT_LINE,
    mountWorkspace,
    outerEdge,
    pointIn,
    setUpSeventyThirty,
    SMOKE,
    expectViewCount,
    inViewHeader,
} from './grid-helpers'

/* The placeholder selectors: 96px high at least, 320×120 preferred, and no
 * maximum */
describe('selectors', () => {
    it(
        'gives a selector row at the top edge its preferred height, and lets it grow',
        SMOKE,
        () => {
            setUpSeventyThirty()

            dragTo({ tile: 'period-selector' }, (doc) =>
                outerEdge(doc, 'top')
            ).should('deep.equal', INSERT_LINE)

            cellSize('Period 1').its('height').should('be.closeTo', 120, 2)
            expectLayout({
                'Period 1': { w: 100 },
                'Map 1': { w: 70 },
                'Visualization 1': { w: 30 },
            })

            dragDivider('Period 1', 'bottom', 0.6)
            expectLayout({
                'Period 1': { h: 60 },
                'Map 1': { h: 40 },
                'Visualization 1': { h: 40 },
            })
        }
    )

    it('still takes a selector once four maps and visualizations are open', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        clickTile('map')
        clickTile('visualization')

        cy.get('[data-test="add-view-org-unit-selector"]').should(
            'not.have.attr',
            'aria-disabled'
        )
        dragTo({ tile: 'org-unit-selector' }, (doc) =>
            outerEdge(doc, 'top')
        ).should('deep.equal', INSERT_LINE)

        cellSize('Org unit 1').its('height').should('be.closeTo', 120, 2)
    })

    it(
        'adds clicked selectors to a bar across the top, sharing it',
        SMOKE,
        () => {
            mountWorkspace()
            clickTile('map')

            clickTile('period-selector')
            cellSize('Period 1').its('height').should('be.closeTo', 120, 2)
            expectLayout({
                'Period 1': { y: 0, w: 100 },
                'Map 1': { w: 100 },
            })

            clickTile('data-selector')
            expectLayout({
                'Period 1': { x: 0, y: 0, w: 50 },
                'Data 1': { x: 50, y: 0, w: 50 },
                'Map 1': { w: 100 },
            })
            cellSize('Data 1').its('height').should('be.closeTo', 120, 2)
        }
    )

    it('adds a selector dropped at the side as a column of its preferred width', () => {
        mountWorkspace()
        clickTile('map')

        dragTo({ tile: 'data-selector' }, (doc) => outerEdge(doc, 'right'))

        cellSize('Data 1').its('width').should('be.closeTo', 320, 2)
        expectLayout({
            'Map 1': { x: 0, h: 100 },
            'Data 1': { h: 100 },
        })
    })
    it('gives a selector splitting a view its preferred size, the view the rest', () => {
        setUpSeventyThirty()

        dragTo({ tile: 'period-selector' }, (doc) =>
            pointIn(doc, 'Map 1', [0.5, 0.9])
        )

        cellSize('Period 1').its('height').should('be.closeTo', 120, 2)
        expectLayout({
            'Map 1': { w: 70 },
            'Period 1': { w: 70 },
            'Visualization 1': { w: 30, h: 100 },
        })
    })

    it('lets stacked selectors fill their column rather than leave a gap', () => {
        mountWorkspace()
        clickTile('map')
        dragTo({ tile: 'org-unit-selector' }, (doc) => outerEdge(doc, 'right'))
        dragTo({ tile: 'org-unit-selector' }, (doc) =>
            pointIn(doc, 'Org unit 1', [0.5, 0.9])
        )

        cy.document().should((doc) => {
            const map = pointIn(doc, 'Map 1', [1, 1])
            /* The two stack to the full height of the map beside them */
            expect(pointIn(doc, 'Org unit 2', [0, 0])[1]).to.be.greaterThan(
                pointIn(doc, 'Org unit 1', [0, 0])[1]
            )
            expect(pointIn(doc, 'Org unit 2', [1, 1])[1]).to.be.closeTo(
                map[1],
                2
            )
        })
    })
    it('keeps the grid full width when only selectors are left', () => {
        mountWorkspace()
        clickTile('map')
        dragTo({ tile: 'org-unit-selector' }, (doc) => outerEdge(doc, 'right'))
        dragTo({ tile: 'org-unit-selector' }, (doc) =>
            pointIn(doc, 'Org unit 1', [0.5, 0.9])
        )

        closeView('Map 1')

        expectLayout({
            'Org unit 1': { w: 100 },
            'Org unit 2': { w: 100 },
        })
        /* Both measured on each retry: the page scrollbar can come and go */
        cy.get('[data-test="workspace"]').should(([workspace]) => {
            const grid = workspace.querySelector('.dv-grid-view') as HTMLElement
            expect(grid.clientWidth).to.be.closeTo(workspace.clientWidth, 2)
        })
    })
    it('counts a selector next to a view like a view when a row is added', () => {
        mountWorkspace()
        clickTile('map')
        dragTo({ tile: 'period-selector' }, (doc) =>
            pointIn(doc, 'Map 1', [0.9, 0.5])
        )

        dragTo({ tile: 'visualization' }, (doc) => outerEdge(doc, 'bottom'))

        expectLayout({
            'Map 1': { h: 50 },
            'Period 1': { h: 50 },
            'Visualization 1': { y: 50, w: 100, h: 50 },
        })
    })
    it('allows one more selector of a type than there are maps and visualizations', () => {
        mountWorkspace()

        clickTile('period-selector')
        cy.get('[data-test="add-view-period-selector"]').should(
            'have.attr',
            'aria-disabled',
            'true'
        )
        cy.get('[data-test="add-view-data-selector"]').should(
            'not.have.attr',
            'aria-disabled'
        )

        clickTile('map')
        cy.get('[data-test="add-view-period-selector"]').should(
            'not.have.attr',
            'aria-disabled'
        )
        clickTile('period-selector')
        cy.get('[data-test="add-view-period-selector"]').should(
            'have.attr',
            'aria-disabled',
            'true'
        )
        expectViewCount(3)
    })

    it('keeps the selector bar’s height when two of its selectors swap', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('period-selector')
        clickTile('org-unit-selector')
        cellSize('Period 1').its('height').should('be.closeTo', 120, 2)

        inViewHeader('Period 1', '[data-test="view-actions-button"]').click()
        cy.contains('Swap with Org unit 1').click()

        expectLayout({
            'Org unit 1': { x: 0, y: 0, w: 50 },
            'Period 1': { x: 50, y: 0, w: 50 },
            'Map 1': { w: 100 },
        })
        cellSize('Period 1').its('height').should('be.closeTo', 120, 2)
        cellSize('Org unit 1').its('height').should('be.closeTo', 120, 2)
    })

    it('keeps a clicked map out of the selector bar', () => {
        mountWorkspace()
        clickTile('map')
        /* The selector just added is the selected view */
        clickTile('period-selector')

        clickTile('map')

        cellSize('Period 1').its('height').should('be.closeTo', 120, 2)
        expectLayout({
            'Period 1': { y: 0, w: 100 },
            'Map 1': { w: 50 },
            'Map 2': { w: 50 },
        })
    })

    it('fits a selector’s placeholder in one row at its preferred height', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('period-selector')

        cellSize('Period 1').its('height').should('be.closeTo', 120, 2)
        /* Measured against the cell, which dockview lays out at once; a
         * view's body follows it on the next animation frame */
        cy.document().should((doc) => {
            const cell = getCell(doc, 'Period 1').getBoundingClientRect()
            const body = doc.querySelector(
                '[data-view-id^="period-selector"]'
            ) as HTMLElement
            const button = (
                body.querySelector(
                    '[data-test="edit-view-settings"]'
                ) as HTMLElement
            ).getBoundingClientRect()
            const icon = (
                body.querySelector('svg') as SVGElement
            ).getBoundingClientRect()
            expect(button.top).to.be.at.least(cell.top)
            expect(button.bottom).to.be.at.most(cell.bottom)
            expect(icon.height).to.equal(24)
        })
        cy.get('[data-view-id^="period-selector"]')
            .contains('The picker will render here')
            .should('not.be.visible')
        cy.get('[data-view-id^="map"]')
            .contains('The plugin will render here')
            .should('be.visible')
    })
})
