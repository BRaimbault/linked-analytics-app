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
        dragTo({ toolTab: 'Map 1' }, pastTheLastTab, {
            whileOver: (doc) => (line = toolDropLine(doc)),
        })

        cy.then(() => expect(line).to.be.within(1, 4))

        toolTabs().should('deep.equal', [
            'Workspace',
            'Add views',
            'Visualization 1',
            'Map 1',
        ])
    })

    it('keeps Workspace and Add views first', () => {
        mountWorkspace()
        clickTile('map')
        const intoAddViews = (doc: Document): [number, number] => {
            const rect = getToolTab(doc, 'Add views').getBoundingClientRect()
            return [rect.left + rect.width * 0.2, rect.top + rect.height / 2]
        }

        let line: number | null = null
        dragTo({ toolTab: 'Map 1' }, intoAddViews, {
            whileOver: (doc) => (line = toolDropLine(doc)),
        })
        cy.then(() => expect(line).to.equal(null))
        dragTo({ toolTab: 'Add views' }, (doc) => {
            const rect = getToolTab(doc, 'Map 1').getBoundingClientRect()
            return [rect.right - 10, rect.top + rect.height / 2]
        })

        toolTabs().should('deep.equal', ['Workspace', 'Add views', 'Map 1'])
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

    /* The side of the tab the tooltip must open on: towards the grid
     * (within half a pixel, as Firefox places it at a fraction of one) */
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

    it('lays each group of tiles on one row in a wide window, inside the strip', () => {
        mountWorkspace()

        cy.get('[data-test^="add-views-"]').should((groups) => {
            expect(groups).to.have.length(3)
            for (const group of groups) {
                const tops = [
                    ...group.querySelectorAll('[data-test^="add-view-"]'),
                ].map((tile) => tile.getBoundingClientRect().top)
                expect(new Set(tops).size, group.dataset.test).to.equal(1)
                /* The palette lives in an overlay, outside the strip's
                 * element */
                const strip = (
                    group.ownerDocument.querySelector(
                        '.dv-edge-group'
                    ) as HTMLElement
                ).getBoundingClientRect()
                expect(group.getBoundingClientRect().bottom).to.be.at.most(
                    strip.bottom
                )
            }
        })
    })

    /* Firefox starts no drag on a button itself, only on what it holds */
    it('makes the whole face of a tile its content, so a drag starts anywhere on it', () => {
        mountWorkspace()

        cy.get('[data-test^="add-view-"]').should((tiles) => {
            for (const tile of tiles) {
                const box = tile.getBoundingClientRect()
                for (const [x, y] of [
                    [box.left + 2, box.top + 2],
                    [box.right - 2, box.bottom - 2],
                    [box.right - 10, box.top + box.height / 2],
                ]) {
                    const hit = tile.ownerDocument.elementFromPoint(x, y)
                    expect(tile.contains(hit), tile.dataset.test).to.equal(true)
                    expect(hit, tile.dataset.test).not.to.equal(tile)
                }
            }
        })
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

    /* Each icon is centred across its tab, level with its name, and 4px
     * before it; along the tab, it starts at the same place on every tab of
     * a strip. A tab of a vertical strip runs down. */
    const expectIconsInLine = (icons: JQuery<HTMLElement>, count: number) => {
        expect(icons).to.have.length(count)
        const starts = new Map<Element, Set<number>>()
        for (const icon of icons) {
            const tab = icon.closest('.dv-tab') as HTMLElement
            const label = tab.querySelector(
                '.dv-default-tab-content'
            ) as HTMLElement
            const name = label.textContent ?? ''
            const [iconBox, labelBox, tabBox] = [icon, label, tab].map(
                (element) => element.getBoundingClientRect()
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

    it('lines up the Workspace settings: controls, names, and each name on its control', () => {
        mountWorkspace()
        clickTile('map')
        toolTab('Workspace').click()

        cy.get('[data-test="workspace-panel"]').should(([panel]) => {
            const button = (
                panel.querySelector(
                    '[data-test="even-out-sizes"]'
                ) as HTMLElement
            ).getBoundingClientRect()
            const checkbox = panel.querySelector(
                '[data-test="view-headers-on-hover"]'
            ) as HTMLElement
            const box = (
                checkbox.querySelector('.icon') as HTMLElement
            ).getBoundingClientRect()
            const name = (
                panel.querySelector('[aria-hidden="true"]') as HTMLElement
            ).getBoundingClientRect()
            const label = checkbox.ownerDocument.createRange()
            label.selectNodeContents(checkbox.lastChild as Node)

            expect(button.left + button.width / 2).to.be.closeTo(
                box.left + box.width / 2,
                0.5
            )
            expect(name.left).to.be.closeTo(
                label.getBoundingClientRect().left,
                0.5
            )
            /* Each name centred on its control */
            const middle = (rect: DOMRect) => rect.top + rect.height / 2
            expect(middle(name)).to.be.closeTo(middle(button), 0.5)
            expect(middle(label.getBoundingClientRect())).to.be.closeTo(
                middle(box),
                0.5
            )
        })
    })

    it('gives the Workspace checkbox a 2px focus ring', () => {
        mountWorkspace()
        toolTab('Workspace').click()

        cy.get('[data-test="view-headers-on-hover"] input').focus()

        cy.get('[data-test="view-headers-on-hover"] .icon')
            .should('have.css', 'outline-width', '2px')
            .and('have.css', 'outline-offset', '-3px')
    })

    it('shows one insertion line between two settings tabs, from either side, and never mid-tab', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        clickTile('period-selector')
        const lineLeft = (doc: Document) =>
            [
                ...doc.querySelectorAll<HTMLElement>(
                    '.dv-edge-group .dv-drop-target-selection'
                ),
            ]
                .map((element) => element.getBoundingClientRect())
                .find((rect) => rect.width > 0)?.left
        const at =
            (title: string, fraction: number) =>
            (doc: Document): [number, number] => {
                const rect = getToolTab(doc, title).getBoundingClientRect()
                return [
                    rect.left + rect.width * fraction,
                    rect.top + rect.height / 2,
                ]
            }
        let fromBefore: number | undefined
        let fromAfter: number | undefined
        let slides: string | undefined

        dragTo({ toolTab: 'Period 1' }, at('Map 1', 0.8), {
            drop: false,
            whileOver: (doc) => {
                fromBefore = lineLeft(doc)
                const line = doc.querySelector(
                    '.dv-edge-group .dv-drop-target-selection-line'
                )
                slides = line
                    ? getComputedStyle(line).transitionProperty
                    : undefined
            },
        })
        dragTo({ toolTab: 'Period 1' }, at('Visualization 1', 0.2), {
            drop: false,
            whileOver: (doc) => (fromAfter = lineLeft(doc)),
        })

        cy.then(() => {
            expect(fromBefore).to.be.a('number')
            expect(fromAfter).to.equal(fromBefore)
            /* It jumps between the sides of a tab, never across its middle */
            expect(slides).to.equal('opacity')
        })
    })

    it('shows one full insertion line at the end of the row, from the last tab or after it', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        /* The line shown, and how much of it the tab row lets through */
        const shownLine = (doc: Document) => {
            const line = [
                ...doc.querySelectorAll<HTMLElement>(
                    '.dv-edge-group .dv-drop-target-selection'
                ),
            ].find((element) => element.getBoundingClientRect().width > 0)
            if (!line) {
                return null
            }
            const rect = line.getBoundingClientRect()
            const clip = line
                .closest('.dv-tabs-container')
                ?.getBoundingClientRect()
            const right = clip ? Math.min(rect.right, clip.right) : rect.right
            return { left: rect.left, visible: right - rect.left }
        }
        const lastTab = (doc: Document) =>
            getToolTab(doc, 'Visualization 1').getBoundingClientRect()
        let onLastTab: ReturnType<typeof shownLine> = null
        let afterIt: ReturnType<typeof shownLine> = null

        dragTo(
            { toolTab: 'Map 1' },
            (doc) => [
                lastTab(doc).left + lastTab(doc).width * 0.8,
                lastTab(doc).top + 10,
            ],
            { drop: false, whileOver: (doc) => (onLastTab = shownLine(doc)) }
        )
        dragTo(
            { toolTab: 'Map 1' },
            (doc) => [lastTab(doc).right + 100, lastTab(doc).top + 10],
            { drop: false, whileOver: (doc) => (afterIt = shownLine(doc)) }
        )

        cy.then(() => {
            expect(onLastTab?.visible).to.equal(4)
            expect(afterIt?.visible).to.equal(4)
            expect(afterIt?.left).to.equal(onLastTab?.left)
        })
    })
})
