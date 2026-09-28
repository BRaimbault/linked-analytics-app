import {
    clickTile,
    expectLayout,
    expectViewCount,
    getToolTab,
    mountWorkspace,
    setUpSeventyThirty,
} from './grid-helpers'

/* The side of the tab the tooltip must open on: towards the grid (within
 * half a pixel, as Firefox places it at a fraction of one) */
const TOOLTIP_SIDES = {
    top: (tooltip: DOMRect, tab: DOMRect) =>
        expect(tooltip.top).to.be.at.least(tab.bottom - 0.5),
    bottom: (tooltip: DOMRect, tab: DOMRect) =>
        expect(tooltip.bottom).to.be.at.most(tab.top + 0.5),
    left: (tooltip: DOMRect, tab: DOMRect) =>
        expect(tooltip.left).to.be.at.least(tab.right - 0.5),
    right: (tooltip: DOMRect, tab: DOMRect) =>
        expect(tooltip.right).to.be.at.most(tab.left + 0.5),
}

/* Each icon is centred across its tab, level with its name, and 4px
 * before it; along the tab, it starts at the same place on every tab of a
 * strip. A tab of a vertical strip runs down. */
const expectIconsInLine = (icons: JQuery<HTMLElement>, count: number) => {
    expect(icons).to.have.length(count)
    const starts = new Map<Element, Set<number>>()
    for (const icon of icons) {
        const tab = icon.closest('.dv-tab') as HTMLElement
        const label = tab.querySelector(
            '.dv-default-tab-content'
        ) as HTMLElement
        const name = label.textContent ?? ''
        const [iconBox, labelBox, tabBox] = [icon, label, tab].map((element) =>
            element.getBoundingClientRect()
        )
        const strip = tab.closest('.dv-tabs-container') as HTMLElement
        const [across, acrossSize, along, alongEnd] = strip.matches(
            '.dv-tabs-container-vertical'
        )
            ? (['left', 'width', 'top', 'bottom'] as const)
            : (['top', 'height', 'left', 'right'] as const)
        const middle = (box: DOMRect) => box[across] + box[acrossSize] / 2
        expect(middle(iconBox), name).to.be.closeTo(middle(tabBox), 0.5)
        expect(iconBox[across], name).to.equal(labelBox[across])
        expect(iconBox[acrossSize], name).to.equal(16)
        expect(labelBox[acrossSize], name).to.equal(16)
        expect(labelBox[along] - iconBox[alongEnd], name).to.equal(4)
        const stripStarts = starts.get(strip) ?? new Set()
        starts.set(strip, stripStarts.add(iconBox[along] - tabBox[along]))
    }
    for (const stripStarts of starts.values()) {
        expect([...stripStarts]).to.have.length(1)
    }
}

describe('the tools strip', () => {
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
        expectViewCount(2)

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

    it('keeps the user’s proportions when the tools strip moves', () => {
        setUpSeventyThirty()

        cy.get('[data-test="move-tools-button"]').click()
        cy.get('[data-test="move-tools-left"]').click()
        cy.get('.dv-edge-group').should(([strip]) =>
            expect(strip.getBoundingClientRect().left).to.be.closeTo(0, 1)
        )
        expectLayout({ 'Map 1': { w: 70 }, 'Visualization 1': { w: 30 } })

        cy.get('[data-test="move-tools-button"]').click()
        cy.get('[data-test="move-tools-top"] [role="menuitem"]').click({
            force: true,
        })
        cy.get('.dv-edge-group').should(([strip]) =>
            expect(strip.getBoundingClientRect().top).to.be.closeTo(0, 1)
        )
        expectLayout({ 'Map 1': { w: 70 }, 'Visualization 1': { w: 30 } })
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

    it('shows each tab’s close button in full, with no scrolling', () => {
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
        const addViewsWidth = (doc: Document) =>
            getToolTab(doc, 'Add views').getBoundingClientRect().width
        mountWorkspace()
        /* A value, not an alias: aliased queries are run again when read */
        let alone = 0
        cy.document().then((doc) => {
            alone = addViewsWidth(doc)
        })

        clickTile('map')

        cy.get('.dv-edge-group .dv-tab').should('have.length', 3)
        cy.document().should((doc) => {
            expect(alone).to.be.greaterThan(0)
            expect(addViewsWidth(doc)).to.be.closeTo(alone, 1)
        })
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

            cy.get('[role="tooltip"]').should(([tooltip]) => {
                expect(tooltip).to.have.text('Visualization 1')
                TOOLTIP_SIDES[edge](
                    tooltip.getBoundingClientRect(),
                    getToolTab(
                        tooltip.ownerDocument,
                        'Visualization 1'
                    ).getBoundingClientRect()
                )
            })
        })
    }

    it('keeps the icon of a tab level with its name, at any window size', () => {
        for (const [width, height] of [
            [1280, 800],
            [1111, 777],
            [987, 733],
        ]) {
            cy.viewport(width, height)
            mountWorkspace()
            clickTile('map')
            clickTile('org-unit-selector')
            /* Workspace, Add views, two settings tabs and two view tabs */
            cy.get('[data-test="tab-icon"]').should((icons) =>
                expectIconsInLine(icons, 6)
            )
        }
    })

    it('keeps the icon of a tab level with its name in a vertical strip', () => {
        mountWorkspace()
        clickTile('visualization')
        cy.get('[data-test="move-tools-button"]').click()
        cy.get('[data-test="move-tools-left"] [role="menuitem"]').click({
            force: true,
        })

        cy.get('.dv-tabs-container-vertical [data-test="tab-icon"]').should(
            (icons) => expectIconsInLine(icons, 3)
        )
    })
})
