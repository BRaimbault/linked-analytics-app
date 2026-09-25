import { Workspace } from '@components/workspace/workspace'
import { CssVariables } from '@dhis2/ui'
import { createStore } from '@store/store'
import type { DataEngine } from '@types'
import { Provider } from 'react-redux'

/* Scenarios that need a real browser: real layout, CSS and drag events.
 * Sizes are read from the page, as percentages of the grid, and compared
 * to the rules in modules/workspace/layout-sizing. */

type Box = { x: number; y: number; w: number; h: number }
type Point = [number, number]

const TOLERANCE = 1.5

const mountWorkspace = () => {
    cy.mount(
        <Provider store={createStore({} as DataEngine)}>
            <CssVariables colors spacers theme />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '800px',
                }}
            >
                <Workspace />
            </div>
        </Provider>
    )
    cy.get('[data-test="add-view-map"]').should('be.visible')
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getCell = (doc: Document, title: string): HTMLElement => {
    const tab = [...doc.querySelectorAll('.dv-grid-view .dv-tab')].find(
        (element) => element.textContent?.trim() === title
    )
    const cell = tab?.closest<HTMLElement>('.dv-groupview')
    if (!cell) {
        throw new Error(`No view titled ${title}`)
    }
    return cell
}

const getCells = (doc: Document) => [
    ...doc.querySelectorAll<HTMLElement>('.dv-grid-view .dv-groupview'),
]

const getGridBounds = (doc: Document) => {
    const rects = getCells(doc).map((cell) => cell.getBoundingClientRect())
    const left = Math.min(...rects.map((rect) => rect.left))
    const top = Math.min(...rects.map((rect) => rect.top))
    return {
        left,
        top,
        width: Math.max(...rects.map((rect) => rect.right)) - left,
        height: Math.max(...rects.map((rect) => rect.bottom)) - top,
    }
}

/* Each view's box, in percent of the grid */
const readLayout = (doc: Document): Record<string, Box> => {
    const grid = getGridBounds(doc)
    return Object.fromEntries(
        getCells(doc).map((cell) => {
            const rect = cell.getBoundingClientRect()
            const title = cell.querySelector('.dv-tab')?.textContent?.trim()
            return [
                title,
                {
                    x: ((rect.left - grid.left) / grid.width) * 100,
                    y: ((rect.top - grid.top) / grid.height) * 100,
                    w: (rect.width / grid.width) * 100,
                    h: (rect.height / grid.height) * 100,
                },
            ]
        })
    )
}

const expectLayout = (expected: Record<string, Partial<Box>>) =>
    cy.document().then((doc) => {
        const layout = readLayout(doc)
        expect(Object.keys(layout).sort()).to.deep.equal(
            Object.keys(expected).sort()
        )
        for (const [title, box] of Object.entries(expected)) {
            for (const [key, value] of Object.entries(box)) {
                expect(
                    layout[title][key as keyof Box],
                    `${title} ${key}`
                ).to.be.closeTo(value, TOLERANCE)
            }
        }
    })

const pointIn = (doc: Document, title: string, [fx, fy]: Point) => {
    const rect = getCell(doc, title).getBoundingClientRect()
    return [rect.left + rect.width * fx, rect.top + rect.height * fy] as Point
}

/* Inside the band dockview offers for the grid's outer edges */
const outerEdge = (
    doc: Document,
    side: 'left' | 'right' | 'top' | 'bottom',
    along = 0.3
): Point => {
    const grid = getGridBounds(doc)
    const x = grid.left + grid.width * along
    const y = grid.top + grid.height * along
    return {
        left: [grid.left + 20, y],
        right: [grid.left + grid.width - 20, y],
        top: [x, grid.top + 20],
        bottom: [x, grid.top + grid.height - 20],
    }[side] as Point
}

type DragSource = { tile: 'map' | 'visualization' } | { tab: string }

const getSource = (doc: Document, source: DragSource): HTMLElement => {
    if ('tile' in source) {
        return doc.querySelector(
            `[data-test="add-view-${source.tile}"]`
        ) as HTMLElement
    }
    return getCell(doc, source.tab).querySelector('.dv-tab') as HTMLElement
}

type DragResult = {
    /* dockview shows a drop preview */
    preview: boolean
    /* an insertion line between two views shows */
    insertLine: boolean
}

/* An HTML5 drag, event by event, as a browser fires it, ending with a drop
 * (or a cancel) at the point */
const dragTo = (
    source: DragSource,
    point: (doc: Document) => Point,
    { drop = true } = {}
) =>
    cy.document().then(async (doc): Promise<DragResult> => {
        const fire = (type: string, target: Element, [x, y]: Point) =>
            target.dispatchEvent(
                new DragEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y,
                    dataTransfer,
                })
            )
        const dataTransfer = new DataTransfer()
        const from = getSource(doc, source)
        fire('dragstart', from, [0, 0])
        await sleep(50)
        const at = point(doc)
        const target = doc.elementFromPoint(...at) as Element
        fire('dragenter', target, at)
        fire('dragover', target, at)
        await sleep(30)
        fire('dragover', target, at)
        await sleep(30)
        const result = {
            preview: [
                ...doc.querySelectorAll('.dv-drop-target-selection'),
            ].some((element) => (element as HTMLElement).offsetWidth > 0),
            insertLine: Boolean(
                doc.querySelector('[data-test="insert-zone"][data-active]')
            ),
        }
        fire(drop ? 'drop' : 'dragleave', target, at)
        fire('dragend', from, at)
        await sleep(50)
        return result
    })

/* Drags the divider on the given side of a view to a share of the grid */
const dragDivider = (title: string, side: 'right' | 'bottom', to: number) =>
    cy.document().then(async (doc) => {
        const cell = getCell(doc, title).getBoundingClientRect()
        const grid = getGridBounds(doc)
        const isVertical = side === 'right'
        const edge = isVertical ? cell.right : cell.bottom
        const sash = [...doc.querySelectorAll<HTMLElement>('.dv-sash')].find(
            (element) => {
                const rect = element.getBoundingClientRect()
                const middle = isVertical
                    ? (rect.left + rect.right) / 2
                    : (rect.top + rect.bottom) / 2
                const length = isVertical ? rect.height : rect.width
                return Math.abs(middle - edge) < 6 && length > 100
            }
        ) as HTMLElement
        const rect = sash.getBoundingClientRect()
        const from: Point = [
            (rect.left + rect.right) / 2,
            (rect.top + rect.bottom) / 2,
        ]
        const target = isVertical
            ? grid.left + grid.width * to
            : grid.top + grid.height * to
        const fire = (type: string, element: EventTarget, position: number) =>
            element.dispatchEvent(
                new PointerEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    pointerId: 1,
                    isPrimary: true,
                    button: 0,
                    buttons: type === 'pointerup' ? 0 : 1,
                    clientX: isVertical ? position : from[0],
                    clientY: isVertical ? from[1] : position,
                })
            )
        const start = isVertical ? from[0] : from[1]
        fire('pointerdown', sash, start)
        fire('pointermove', doc, (start + target) / 2)
        fire('pointermove', doc, target)
        fire('pointerup', doc, target)
        await sleep(50)
    })

const clickTile = (tile: 'map' | 'visualization') =>
    cy.get(`[data-test="add-view-${tile}"]`).click()

/* Map 1 | Visualization 1, split 70/30 by the user */
const setUpSeventyThirty = () => {
    mountWorkspace()
    clickTile('map')
    clickTile('visualization')
    dragDivider('Map 1', 'right', 0.7)
    expectLayout({ 'Map 1': { w: 70 }, 'Visualization 1': { w: 30 } })
}

describe('workspace grid', () => {
    it('gives a column added at the outer edge a third, keeping 70/30 between the others', () => {
        setUpSeventyThirty()

        dragTo({ tile: 'map' }, (doc) => outerEdge(doc, 'right')).should(
            'deep.equal',
            { preview: false, insertLine: true }
        )

        expectLayout({
            'Map 1': { x: 0, w: 46.7 },
            'Visualization 1': { x: 46.7, w: 20 },
            'Map 2': { x: 66.7, w: 33.3, h: 100 },
        })
    })

    it('gives a row added at the bottom the height of the row above', () => {
        setUpSeventyThirty()

        dragTo({ tile: 'map' }, (doc) => outerEdge(doc, 'bottom'))

        expectLayout({
            'Map 1': { w: 70, h: 50 },
            'Visualization 1': { w: 30, h: 50 },
            'Map 2': { y: 50, w: 100, h: 50 },
        })
    })

    it('halves the view whose edge a new view is dropped on', () => {
        setUpSeventyThirty()

        dragTo({ tile: 'map' }, (doc) => pointIn(doc, 'Map 1', [0.9, 0.5]))

        expectLayout({
            'Map 1': { x: 0, w: 35 },
            'Map 2': { x: 35, w: 35 },
            'Visualization 1': { x: 70, w: 30 },
        })
    })

    it('inserts a view on the line between two views', () => {
        setUpSeventyThirty()

        dragTo({ tile: 'map' }, (doc) =>
            pointIn(doc, 'Visualization 1', [0, 0.5])
        ).should('deep.equal', { preview: false, insertLine: true })

        expectLayout({
            'Map 1': { x: 0, w: 46.7 },
            'Map 2': { x: 46.7, w: 33.3 },
            'Visualization 1': { x: 80, w: 20 },
        })
    })

    it('shares a closed view’s space with the others in proportion', () => {
        setUpSeventyThirty()
        dragTo({ tile: 'map' }, (doc) => outerEdge(doc, 'right'))

        cy.document().then((doc) => {
            const close = getCell(doc, 'Visualization 1').querySelector(
                '.dv-default-tab-action'
            ) as HTMLElement
            close.click()
        })

        expectLayout({ 'Map 1': { w: 58.3 }, 'Map 2': { w: 41.7 } })
    })

    it('swaps two views without resizing them', () => {
        setUpSeventyThirty()

        dragTo({ tab: 'Visualization 1' }, (doc) =>
            pointIn(doc, 'Map 1', [0.5, 0.5])
        )

        expectLayout({
            'Visualization 1': { x: 0, w: 70 },
            'Map 1': { x: 70, w: 30 },
        })
    })

    it('moves a short row spanning part of the grid to the top or bottom edge', () => {
        /* Map 1 | ((Visualization 2 | Visualization 1) over Map 2) */
        const setUpCapture = () => {
            mountWorkspace()
            clickTile('map')
            dragTo({ tile: 'visualization' }, (doc) =>
                pointIn(doc, 'Map 1', [0.85, 0.5])
            )
            dragTo({ tile: 'map' }, (doc) =>
                pointIn(doc, 'Visualization 1', [0.5, 0.8])
            )
            dragTo({ tile: 'visualization' }, (doc) =>
                pointIn(doc, 'Visualization 1', [0.15, 0.3])
            )
            /* As short as its minimum height allows */
            dragDivider('Visualization 1', 'bottom', 0.9)
            expectLayout({
                'Map 1': { w: 50, h: 100 },
                'Visualization 2': { x: 50, w: 25 },
                'Visualization 1': { x: 75, w: 25 },
                'Map 2': { x: 50, w: 50, h: 24 },
            })
        }

        setUpCapture()
        dragTo({ tab: 'Map 2' }, (doc) => outerEdge(doc, 'top')).should(
            'deep.equal',
            { preview: false, insertLine: true }
        )
        expectLayout({
            'Map 2': { y: 0, w: 100, h: 50 },
            'Map 1': { y: 50, w: 50, h: 50 },
            'Visualization 2': { y: 50, w: 25 },
            'Visualization 1': { y: 50, w: 25 },
        })

        setUpCapture()
        dragTo({ tab: 'Map 2' }, (doc) => outerEdge(doc, 'bottom'))
        expectLayout({
            'Map 1': { y: 0, w: 50, h: 50 },
            'Visualization 2': { y: 0, w: 25 },
            'Visualization 1': { y: 0, w: 25 },
            'Map 2': { y: 50, w: 100, h: 50 },
        })
    })

    it('shows no preview for a drop that would leave a view where it is', () => {
        setUpSeventyThirty()
        const noPreview = { preview: false, insertLine: false }

        dragTo({ tab: 'Map 1' }, (doc) => pointIn(doc, 'Map 1', [0.4, 0.5]), {
            drop: false,
        }).should('deep.equal', noPreview)
        dragTo(
            { tab: 'Map 1' },
            (doc) => pointIn(doc, 'Visualization 1', [0.1, 0.5]),
            { drop: false }
        ).should('deep.equal', noPreview)
        dragTo({ tab: 'Map 1' }, (doc) => outerEdge(doc, 'left'), {
            drop: false,
        }).should('deep.equal', noPreview)
        dragTo({ tab: 'Map 1' }, (doc) => outerEdge(doc, 'bottom'), {
            drop: false,
        }).should('deep.equal', { preview: false, insertLine: true })

        expectLayout({ 'Map 1': { w: 70 }, 'Visualization 1': { w: 30 } })
    })

    it('puts back the sizes the user set after a view is maximized', () => {
        setUpSeventyThirty()
        dragDivider('Map 1', 'right', 0.4)

        cy.get('[data-test="maximize-view-button"]').first().click()
        cy.get('[data-test="maximize-view-button"]').first().click()

        expectLayout({ 'Map 1': { w: 40 }, 'Visualization 1': { w: 60 } })
    })

    it('stops offering room once four views are open', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')
        clickTile('map')
        clickTile('visualization')

        cy.get('[data-test="add-view-map"]').should('be.disabled')
        dragTo({ tile: 'map' }, (doc) =>
            pointIn(doc, 'Map 1', [1, 0.5])
        ).should('deep.equal', { preview: false, insertLine: false })
    })
})
