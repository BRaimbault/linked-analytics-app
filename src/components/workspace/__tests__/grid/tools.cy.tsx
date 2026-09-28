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

const viewTab = (title: string) =>
    cy.get('.dv-grid-view .dv-tab').contains(title)

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
                const rect = getToolTab(doc, 'Map 1').getBoundingClientRect()
                return [
                    rect.left + rect.width * 0.2,
                    rect.top + rect.height / 2,
                ]
            }
            let line: number | null = null

            dragTo({ toolTab: 'Visualization 1' }, intoMapSettings, {
                whileOver: (doc) => (line = toolDropLine(doc)),
            })

            cy.then(() => expect(line).to.be.within(1, 4))

            toolTabs().should('deep.equal', [
                'Workspace',
                'Add views',
                'Visualization 1',
                'Map 1',
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
                'Visualization 1'
            ).getBoundingClientRect()
            return [rect.right + 200, rect.top + rect.height / 2]
        }

        let line: number | null = null
        dragTo({ toolTab: 'Add views' }, pastTheLastTab, {
            whileOver: (doc) => (line = toolDropLine(doc)),
        })

        cy.then(() => expect(line).to.be.within(1, 4))

        toolTabs().should('deep.equal', [
            'Workspace',
            'Map 1',
            'Visualization 1',
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
                'Workspace',
                'Add views',
                'Map 1',
                'Period 1',
                'Visualization 1',
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
            cy.get('.dv-edge-group .dv-active-tab').should('have.text', 'Map 1')

            cy.get('[data-test="view-placeholder"]').last().click()
            cy.get('.dv-edge-group .dv-active-tab').should(
                'have.text',
                'Visualization 1'
            )
        }
    )

    it('opens the settings from a view’s placeholder button', () => {
        mountWorkspace()
        clickTile('map')

        cy.get('[data-test="edit-view-settings"]').click()

        cy.get('.dv-edge-group .dv-active-tab').should('have.text', 'Map 1')
        cy.contains('Links to other views will be set here.').should(
            'be.visible'
        )
    })

    it('closes a view from its settings tab', SMOKE, () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')

        toolTab('Map 1')
            .closest('.dv-tab')
            .find('.dv-default-tab-action')
            /* shown on hover, like any tab that isn't the open one */
            .click({ force: true })

        viewTitles().should('deep.equal', ['Visualization 1'])
        toolTabs().should('deep.equal', [
            'Workspace',
            'Add views',
            'Visualization 1',
        ])
        expectLayout({ 'Visualization 1': { w: 100 } })
        cy.get('.dv-edge-group .dv-active-tab').should('have.text', 'Add views')
    })

    it(
        'goes back to the palette, with no view selected, when a view closes',
        SMOKE,
        () => {
            mountWorkspace()
            clickTile('map')
            clickTile('visualization')
            viewTab('Map 1').click()
            cy.get('[data-test="selected-view-tab"]').should(
                'have.text',
                'Map 1'
            )

            closeView('Visualization 1')
            cy.get('.dv-edge-group .dv-active-tab').should(
                'have.text',
                'Add views'
            )
            cy.get('[data-test="selected-view-tab"]').should('not.exist')

            viewTab('Map 1').click()
            closeView('Map 1')
            cy.get('[data-test="workspace-watermark"]').should('be.visible')
            cy.get('.dv-edge-group .dv-active-tab').should(
                'have.text',
                'Add views'
            )
        }
    )

    it('selects the view whose settings tab is opened, and none on the other tools', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')

        toolTab('Map 1').click()
        cy.get('[data-test="selected-view-tab"]').should('have.text', 'Map 1')

        toolTab('Add views').click()
        cy.get('[data-test="selected-view-tab"]').should('not.exist')

        toolTab('Map 1').click()
        toolTab('Workspace').click()
        cy.get('[data-test="selected-view-tab"]').should('not.exist')
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

    it('gives every tools tab one length, cutting no default name short', () => {
        mountWorkspace()
        clickTile('visualization')
        clickTile('org-unit-selector')

        cy.get('.dv-edge-group .dv-tab').should((tabs) => {
            const widths = [...tabs].map((tab) => tab.offsetWidth)
            expect(widths).to.have.length(4)
            expect(new Set(widths).size, widths.join()).to.equal(1)
        })
        cy.get('.dv-edge-group .dv-default-tab-content').each(([name]) =>
            expect(name.scrollWidth, name.textContent ?? '').to.equal(
                name.clientWidth
            )
        )
    })

    /* The side of the tab the tooltip must open on: towards the grid */
    const TOOLTIP_SIDES = {
        top: (tooltip: DOMRect, tab: DOMRect) =>
            expect(tooltip.top).to.be.at.least(tab.bottom),
        bottom: (tooltip: DOMRect, tab: DOMRect) =>
            expect(tooltip.bottom).to.be.at.most(tab.top),
        left: (tooltip: DOMRect, tab: DOMRect) =>
            expect(tooltip.left).to.be.at.least(tab.right),
        right: (tooltip: DOMRect, tab: DOMRect) =>
            expect(tooltip.right).to.be.at.most(tab.left),
    }

    for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
        it(`shows a cut-short tab name in a tooltip towards the grid, with the tools at the ${edge}`, () => {
            mountWorkspace()
            clickTile('visualization')
            if (edge !== 'top') {
                cy.get('[data-test="move-tools-button"]').click()
                /* Cypress may report a menu item near the page's edge as
                 * hidden; the element at its centre is its own label */
                cy.get(
                    `[data-test="move-tools-${edge}"] [role="menuitem"]`
                ).click({ force: true })
            }
            /* Default names fit, so the tabs are made shorter than one */
            cy.document().then((doc) => {
                const style = doc.createElement('style')
                style.textContent =
                    '.dv-edge-group .dv-tab { inline-size: 90px !important }'
                doc.head.appendChild(style)
            })

            cy.get('.dv-edge-group .dv-default-tab-content')
                .contains('Visualization 1')
                .should(([name]) =>
                    expect(
                        Math.max(
                            name.scrollWidth - name.clientWidth,
                            name.scrollHeight - name.clientHeight
                        )
                    ).to.be.greaterThan(0)
                )
                .trigger('mouseover')

            cy.get('[role="tooltip"]')
                .should('have.text', 'Visualization 1')
                .then(([tooltip]) =>
                    toolTab('Visualization 1').then(([name]) =>
                        TOOLTIP_SIDES[edge](
                            tooltip.getBoundingClientRect(),
                            (
                                name.closest('.dv-tab') as HTMLElement
                            ).getBoundingClientRect()
                        )
                    )
                )
        })
    }

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

    it('keeps the icon of a tab level with its name, at any window size', () => {
        for (const [width, height] of [
            [1280, 800],
            [1111, 777],
            [987, 733],
        ]) {
            cy.viewport(width, height)
            mountWorkspace()
            cy.get('[data-test="tab-icon"]').should((icons) => {
                expect(icons).to.have.length(2)
                for (const icon of icons) {
                    const label = icon.nextElementSibling as HTMLElement
                    const iconBox = icon.getBoundingClientRect()
                    const labelBox = label.getBoundingClientRect()
                    expect(iconBox.top, label.textContent ?? '').to.equal(
                        labelBox.top
                    )
                    expect(iconBox.height).to.equal(labelBox.height)
                }
            })
        }
    })
})
