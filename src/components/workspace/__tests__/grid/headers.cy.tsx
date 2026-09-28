import { VIEW_HEADER_HEIGHT } from '@modules/workspace/grid-tree'
import { clickTile, getCell, mountWorkspace, SMOKE } from './grid-helpers'

const header = (doc: Document, title: string) =>
    getCell(doc, title).querySelector(
        '.dv-tabs-and-actions-container'
    ) as HTMLElement

const body = (doc: Document, type: string) =>
    doc.querySelector(`[data-view-id^="${type}"]`) as HTMLElement

const toggleHoverHeaders = () => {
    cy.get('.dv-edge-group .dv-tab').contains('Workspace').click()
    cy.get('[data-test="view-headers-on-hover"]').click()
}

type Hover = 'hover' | 'none'

/* Each case runs where the browser's media matches it: Chrome is launched
 * as a desktop with a mouse (cypress.config.ts), headless Firefox reports
 * no hover, and CI runs both */
const withHover = (hover: Hover) => {
    beforeEach(function () {
        if (!window.matchMedia(`(hover: ${hover})`).matches) {
            this.skip()
        }
    })
}

describe('view headers on hover, with a pointer that hovers', () => {
    withHover('hover')

    it(
        'shows a header only over its view, and gives the view its room',
        SMOKE,
        () => {
            mountWorkspace()
            clickTile('map')
            clickTile('visualization')

            toggleHoverHeaders()

            cy.document().should((doc) => {
                expect(getComputedStyle(header(doc, 'Map 1')).opacity).to.equal(
                    '0'
                )
                const cell = getCell(doc, 'Map 1').getBoundingClientRect()
                const mapBody = body(doc, 'map').getBoundingClientRect()
                expect(mapBody.top).to.be.closeTo(cell.top, 1)
                expect(mapBody.height).to.be.closeTo(cell.height, 1)
            })

            cy.get('[data-view-id^="map"]').trigger('pointerover')
            cy.document().should((doc) => {
                expect(getComputedStyle(header(doc, 'Map 1')).opacity).to.equal(
                    '1'
                )
                expect(
                    getComputedStyle(header(doc, 'Visualization 1')).opacity
                ).to.equal('0')
            })
        }
    )

    it('frames the selected view, as its header is out of sight', () => {
        mountWorkspace()
        clickTile('map')
        toggleHoverHeaders()
        cy.get('[data-test="selected-frame"]').should('not.exist')

        cy.get('.dv-edge-group .dv-tab').contains('Map 1').click()

        cy.document().should((doc) => {
            const frame = (
                doc.querySelector('[data-test="selected-frame"]') as HTMLElement
            ).getBoundingClientRect()
            const cell = getCell(doc, 'Map 1').getBoundingClientRect()
            expect(frame.top).to.be.closeTo(cell.top, 1)
            expect(frame.height).to.be.closeTo(cell.height, 1)
        })
    })

    it('keeps a header shown while its menu is open, outside the header', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        toggleHoverHeaders()

        cy.get('[data-view-id^="map"]').trigger('pointerover')
        cy.document().then((doc) =>
            header(doc, 'Map 1')
                .querySelector<HTMLElement>('[data-test="view-actions-button"]')
                ?.click()
        )
        cy.get('[role="menu"]').should('be.visible')
        /* The menu's backdrop covers the page, the pointer's over it */
        cy.get('[data-test="dhis2-uicore-layer"]').last().trigger('pointerover')

        cy.document().should((doc) =>
            expect(getComputedStyle(header(doc, 'Map 1')).opacity).to.equal('1')
        )
    })

    it('puts the headers back above the views when switched off', () => {
        mountWorkspace()
        clickTile('map')
        toggleHoverHeaders()
        cy.get('[data-test="view-headers-on-hover"]').click()

        cy.document().should((doc) => {
            expect(getComputedStyle(header(doc, 'Map 1')).opacity).to.equal('1')
            const cell = getCell(doc, 'Map 1').getBoundingClientRect()
            expect(body(doc, 'map').getBoundingClientRect().top).to.be.closeTo(
                cell.top + VIEW_HEADER_HEIGHT,
                1
            )
        })
    })
})

/* A floating header would always show there, over the top of its view */
describe('view headers on hover, on a touch screen', () => {
    withHover('none')

    it('keeps every header above its view, taking its room', () => {
        mountWorkspace()
        clickTile('map')
        toggleHoverHeaders()
        cy.get('.dv-edge-group .dv-tab').contains('Map 1').click()

        cy.document().should((doc) => {
            expect(getComputedStyle(header(doc, 'Map 1')).opacity).to.equal('1')
            const cell = getCell(doc, 'Map 1').getBoundingClientRect()
            expect(body(doc, 'map').getBoundingClientRect().top).to.be.closeTo(
                cell.top + VIEW_HEADER_HEIGHT,
                1
            )
            /* The selected tab shows its own line */
            const frame = doc.querySelector('[data-test="selected-frame"]')
            expect(frame && getComputedStyle(frame).display).to.equal('none')
        })
    })
})
