import {
    clickTile,
    dragTo,
    expectToolTabs,
    getToolTab,
    mountWorkspace,
    SMOKE,
} from './grid-helpers'

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

describe('tools tabs: their order', () => {
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

            expectToolTabs([
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

        expectToolTabs(['Workspace', 'Add views', 'Visualization 1', 'Map 1'])
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

        expectToolTabs(['Workspace', 'Add views', 'Map 1'])
    })

    it(
        'gives each view a settings tab after Add views, in the order they were added',
        SMOKE,
        () => {
            mountWorkspace()
            clickTile('map')
            clickTile('period-selector')
            clickTile('visualization')

            expectToolTabs([
                'Workspace',
                'Add views',
                'Map 1',
                'Period 1',
                'Visualization 1',
            ])
        }
    )

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
