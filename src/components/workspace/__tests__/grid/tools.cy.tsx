import {
    clickTile,
    closeView,
    expectLayout,
    dragTo,
    getCell,
    getToolTab,
    mountWorkspace,
    SMOKE,
    toolTabs,
    viewTitles,
} from './grid-helpers'

const toolTab = (title: string) =>
    cy.get('.dv-edge-group .dv-tab').contains(title)

/* The thickness of the drop preview shown in the tools strip */
const toolDropLine = (doc: Document) => {
    const shown = [
        ...doc.querySelectorAll<HTMLElement>(
            '.dv-edge-group .dv-drop-target-selection'
        ),
    ].find((element) => element.offsetWidth > 0)
    const rect = shown?.getBoundingClientRect()
    return rect ? Math.min(rect.width, rect.height) : null
}

describe('tools strip and settings', () => {
    it(
        'moves a tools tab between two others, showing a line there',
        SMOKE,
        () => {
            mountWorkspace()
            clickTile('map')
            clickTile('visualization')

            const intoMapSettings = (doc: Document): [number, number] => {
                const rect = getToolTab(
                    doc,
                    'Map 1 settings'
                ).getBoundingClientRect()
                return [
                    rect.left + rect.width * 0.2,
                    rect.top + rect.height / 2,
                ]
            }
            let line: number | null = null

            dragTo({ toolTab: 'Visualization 1 settings' }, intoMapSettings, {
                whileOver: (doc) => (line = toolDropLine(doc)),
            })

            cy.then(() => expect(line).to.be.within(1, 4))

            toolTabs().should('deep.equal', [
                'Add views',
                'Visualization 1 settings',
                'Map 1 settings',
            ])
        }
    )

    it('moves a tools tab dropped past the last one to the end of the row', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        const pastTheLastTab = (doc: Document): [number, number] => {
            const rect = getToolTab(
                doc,
                'Visualization 1 settings'
            ).getBoundingClientRect()
            return [rect.right + 200, rect.top + rect.height / 2]
        }

        let line: number | null = null
        dragTo({ toolTab: 'Add views' }, pastTheLastTab, {
            whileOver: (doc) => (line = toolDropLine(doc)),
        })

        cy.then(() => expect(line).to.be.within(1, 4))

        toolTabs().should('deep.equal', [
            'Map 1 settings',
            'Visualization 1 settings',
            'Add views',
        ])
    })

    it(
        'gives each view a settings tab after Add views, in the order they were added',
        SMOKE,
        () => {
            mountWorkspace()
            clickTile('map')
            clickTile('period-selector')
            clickTile('visualization')

            toolTabs().should('deep.equal', [
                'Add views',
                'Map 1 settings',
                'Period selector 1 settings',
                'Visualization 1 settings',
            ])
        }
    )

    it(
        'brings a view’s settings forward when the user selects it',
        SMOKE,
        () => {
            mountWorkspace()
            clickTile('map')
            clickTile('visualization')

            cy.document().then((doc) =>
                cy
                    .wrap(
                        getCell(doc, 'Map 1').querySelector(
                            '.dv-tab'
                        ) as HTMLElement
                    )
                    .click()
            )
            cy.get('[data-test="selected-view-tab"]').should(
                'have.text',
                'Map 1'
            )
            cy.get('.dv-edge-group .dv-active-tab').should(
                'have.text',
                'Map 1 settings'
            )

            cy.get('[data-test="view-placeholder"]').last().click()
            cy.get('.dv-edge-group .dv-active-tab').should(
                'have.text',
                'Visualization 1 settings'
            )
        }
    )

    it('opens the settings from a view’s placeholder button', () => {
        mountWorkspace()
        clickTile('map')

        cy.get('[data-test="edit-view-settings"]').click()

        cy.get('.dv-edge-group .dv-active-tab').should(
            'have.text',
            'Map 1 settings'
        )
        cy.contains('Links to other views will be set here.').should(
            'be.visible'
        )
    })

    it('closes a view from its settings tab', SMOKE, () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')

        toolTab('Map 1 settings')
            .closest('.dv-tab')
            .find('.dv-default-tab-action')
            /* shown on hover, like any tab that isn't the open one */
            .click({ force: true })

        viewTitles().should('deep.equal', ['Visualization 1'])
        toolTabs().should('deep.equal', [
            'Add views',
            'Visualization 1 settings',
        ])
        expectLayout({ 'Visualization 1': { w: 100 } })
    })

    it('selects a neighbour when the selected view closes, and the palette once none is left', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')

        closeView('Visualization 1')
        cy.get('[data-test="selected-view-tab"]').should('have.text', 'Map 1')

        closeView('Map 1')
        cy.get('[data-test="workspace-watermark"]').should('be.visible')
        cy.get('.dv-edge-group .dv-active-tab').should('have.text', 'Add views')
    })

    it('moves the tools strip to another edge and back, still adding views', () => {
        mountWorkspace()
        clickTile('map')

        cy.get('[data-test="move-tools-button"]').click()
        cy.get('[data-test="move-tools-left"]').click()
        cy.get('.dv-edge-group').should(([strip]) => {
            const rect = strip.getBoundingClientRect()
            expect(rect.left).to.be.closeTo(0, 1)
            expect(rect.height).to.be.greaterThan(rect.width)
        })
        clickTile('visualization')
        viewTitles().should('have.length', 2)

        cy.get('[data-test="move-tools-button"]').click()
        /* Cypress wrongly reports this bottom-anchored menu item as hidden;
         * the element at its centre is its own label */
        cy.get('[data-test="move-tools-top"] [role="menuitem"]').click({
            force: true,
        })
        cy.get('.dv-edge-group').should(([strip]) => {
            const rect = strip.getBoundingClientRect()
            expect(rect.width).to.be.greaterThan(rect.height)
        })
    })

    it('collapses and expands the tools strip, giving the grid its room', () => {
        mountWorkspace()
        clickTile('map')
        /* A value, not an alias: aliased queries are run again when read */
        let gridHeight = 0
        cy.get('.dv-grid-view')
            .invoke('height')
            .then((height) => {
                gridHeight = Number(height)
            })

        cy.get('[data-test="collapse-tools-button"]').click()
        /* The palette is clipped away: nothing of it takes the pointer */
        cy.get('[data-test="add-view-map"]').should(([tile]) => {
            const rect = tile.getBoundingClientRect()
            const hit = tile.ownerDocument.elementFromPoint(
                rect.left + 5,
                rect.top + 5
            )
            expect(tile.contains(hit)).to.equal(false)
        })
        cy.get('.dv-grid-view')
            .invoke('height')
            .should((height) => expect(height).to.be.greaterThan(gridHeight))

        /* Without the DHIS2 header above, its tooltip flips over it */
        cy.get('[data-test="collapse-tools-button"]').click({ force: true })
        cy.get('[data-test="add-view-map"]').should('be.visible')
    })

    it('shows each tab\u2019s close button in full, with no scrolling', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')

        cy.get('.dv-tab .dv-default-tab-action').each(([button]) => {
            const row = button.closest('.dv-tabs-container') as HTMLElement
            const rect = button.getBoundingClientRect()
            const rowRect = row.getBoundingClientRect()
            expect(rect.right).to.be.at.most(rowRect.right + 0.5)
            expect(row.scrollWidth).to.be.at.most(row.clientWidth)
        })
    })

    it('keeps the Add views tab the same size alone and among settings tabs', () => {
        mountWorkspace()
        toolTab('Add views').invoke('outerWidth').as('alone')

        clickTile('map')

        cy.get('@alone').then((alone) =>
            toolTab('Add views')
                .invoke('outerWidth')
                .should('be.closeTo', Number(alone), 1)
        )
    })

    it('keeps the palette tiles the same size when some run out', () => {
        mountWorkspace()
        clickTile('period-selector')

        cy.get('[data-test="add-view-period-selector"]')
            .should('be.disabled')
            .invoke('outerWidth')
            .should('equal', 160)
        cy.get('[data-test="add-view-map"]')
            .invoke('outerWidth')
            .should('equal', 160)
    })
})
