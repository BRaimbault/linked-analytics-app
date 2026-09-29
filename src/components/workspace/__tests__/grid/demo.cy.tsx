import { openSavedItem } from './demo-helpers'
import {
    cellSize,
    clickTile,
    dragDivider,
    getCell,
    mountWorkspace,
} from './grid-helpers'

describe('demo plugins', () => {
    it('draws a saved visualization in its view, filling the view’s body', () => {
        mountWorkspace({ demo: true })
        clickTile('visualization')

        openSavedItem(
            'Visualization 1',
            'Malaria cases by district, last 12 months'
        )

        /* One series, a bar per district */
        cy.get('[data-test="fake-point"]').should('have.length', 4)
        cy.get('[data-test="fake-visualization"]').should(
            'contain.text',
            'Malaria cases by district'
        )
        cy.document().should((doc) => {
            const body = (
                doc.querySelector('[data-test="plugin-view"]') as HTMLElement
            ).getBoundingClientRect()
            const cell = getCell(doc, 'Visualization 1').getBoundingClientRect()
            expect(body.width).to.be.closeTo(cell.width, 1)
            const chart = (
                doc.querySelector('[data-test="fake-chart"]') as SVGElement
            ).getBoundingClientRect()
            expect(chart.width).to.be.closeTo(body.width, 1)
            expect(chart.bottom).to.be.at.most(body.bottom + 1)
        })
    })

    it('follows its view as it resizes', () => {
        mountWorkspace({ demo: true })
        clickTile('visualization')
        clickTile('map')
        openSavedItem('Visualization 1', 'ANC visits, last 12 months')
        cy.get('[data-test="fake-chart"]').should('exist')

        dragDivider('Visualization 1', 'right', 0.7)

        cellSize('Visualization 1')
            .its('width')
            .then((width) =>
                cy
                    .get('[data-test="fake-chart"]')
                    .invoke('outerWidth')
                    .should('be.closeTo', width, 1)
            )
    })

    it('draws a pivot table, a row per chiefdom and a column per quarter', () => {
        mountWorkspace({ demo: true })
        clickTile('visualization')

        openSavedItem(
            'Visualization 1',
            'Penta 3 coverage by chiefdom, last 4 quarters'
        )

        cy.get('[data-test="fake-table"] tbody tr').should('have.length', 14)
        cy.get('[data-test="fake-table"] thead th').should('have.length', 5)
    })

    it('draws a saved map filling its view, and keeps its zoom for another map', () => {
        mountWorkspace({ demo: true })
        clickTile('map')
        clickTile('visualization')

        openSavedItem('Map 1', 'Penta 3 coverage by chiefdom')
        cy.get('[data-test="fake-feature"]').should('have.length', 14)
        cy.document().should((doc) => {
            const map = (
                doc.querySelector('[data-test="fake-map"]') as HTMLElement
            ).getBoundingClientRect()
            const cell = getCell(doc, 'Map 1').getBoundingClientRect()
            expect(map.width).to.be.closeTo(cell.width, 1)
            expect(map.bottom).to.be.closeTo(cell.bottom, 1)
        })
        const scale = () =>
            cy
                .get('[data-test="fake-map-plane"]')
                .invoke('attr', 'transform')
                .then((transform) =>
                    Number(/scale\(([\d.]+)\)/.exec(String(transform))?.[1])
                )
        let whole = 0
        scale().then((value) => {
            whole = value
        })
        /* By the wheel, where it is: a click on the zoom button would focus
         * it, and scrolling it into view would scroll the 800px mount */
        cy.get('[data-test="fake-map"] svg[role="img"]').trigger('wheel', {
            deltaY: -100,
            scrollBehavior: false,
        })
        cy.get('[data-test="workspace-scroller"]')
            .invoke('scrollTop')
            .should('equal', 0)

        openSavedItem('Map 1', 'Malaria cases by district')

        cy.get('[data-test="fake-feature"]').should('have.length', 4)
        scale().should((value) =>
            expect(value).to.be.closeTo(whole * 1.25, 0.01)
        )
    })
})
