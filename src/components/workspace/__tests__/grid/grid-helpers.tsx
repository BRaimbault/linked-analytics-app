import { Workspace } from '@components/workspace/workspace'
import { CssVariables } from '@dhis2/ui'
import type { ViewType } from '@modules/workspace/view-types'
import { createStore } from '@store/store'
import type { DataEngine } from '@types'
import { Provider } from 'react-redux'

/* Helpers for the workspace grid scenarios, which need a real browser:
 * real layout, CSS and drag events. Sizes are read from the page, as
 * percentages of the grid, and compared to the rules in
 * modules/workspace/layout-sizing. */

export type Box = { x: number; y: number; w: number; h: number }
export type Point = [number, number]

const TOLERANCE = 1.5

export const mountWorkspace = () => {
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

export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

export const getCell = (doc: Document, title: string): HTMLElement => {
    const tab = [...doc.querySelectorAll('.dv-grid-view .dv-tab')].find(
        (element) => element.textContent?.trim() === title
    )
    const cell = tab?.closest<HTMLElement>('.dv-groupview')
    if (!cell) {
        throw new Error(`No view titled ${title}`)
    }
    return cell
}

/* The cells on screen; a maximized view hides the others */
export const getCells = (doc: Document) =>
    [
        ...doc.querySelectorAll<HTMLElement>('.dv-grid-view .dv-groupview'),
    ].filter((cell) => cell.offsetWidth > 0 && cell.offsetHeight > 0)

export const getGridBounds = (doc: Document) => {
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
export const readLayout = (doc: Document): Record<string, Box> => {
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

/* A view's size on screen, in pixels */
export const cellSize = (title: string) =>
    cy.document().then((doc) => {
        const rect = getCell(doc, title).getBoundingClientRect()
        return { width: rect.width, height: rect.height }
    })

export const expectLayout = (expected: Record<string, Partial<Box>>) =>
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

export const pointIn = (doc: Document, title: string, [fx, fy]: Point) => {
    const rect = getCell(doc, title).getBoundingClientRect()
    return [rect.left + rect.width * fx, rect.top + rect.height * fy] as Point
}

/* In a view's tab header, below the strip of the divider above it */
export const inHeader = (doc: Document, title: string): Point => {
    const rect = getCell(doc, title).getBoundingClientRect()
    return [rect.left + rect.width * 0.6, rect.top + 25]
}

/* Inside the band dockview offers for the grid's outer edges */
export const outerEdge = (
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

export const getToolTab = (doc: Document, title: string): HTMLElement => {
    const tab = [
        ...doc.querySelectorAll<HTMLElement>('.dv-edge-group .dv-tab'),
    ].find((element) => element.textContent?.trim() === title)
    if (!tab) {
        throw new Error(`No tools tab titled ${title}`)
    }
    return tab
}

export type DragSource =
    { tile: ViewType } | { tab: string } | { toolTab: string }

export const getSource = (doc: Document, source: DragSource): HTMLElement => {
    if ('tile' in source) {
        return doc.querySelector(
            `[data-test="add-view-${source.tile}"]`
        ) as HTMLElement
    }
    if ('toolTab' in source) {
        return getToolTab(doc, source.toolTab)
    }
    return getCell(doc, source.tab).querySelector('.dv-tab') as HTMLElement
}

export type DragResult = {
    /* dockview shows a drop preview */
    preview: boolean
    /* an insertion line between two views shows */
    insertLine: boolean
}

/* An HTML5 drag, event by event, as a browser fires it, ending with a drop
 * (or a cancel) at the point */
export const dragTo = (
    source: DragSource,
    point: (doc: Document) => Point,
    {
        drop = true,
        whileOver,
    }: {
        drop?: boolean
        /* Reads the page while the drag is over the point */
        whileOver?: (doc: Document) => void
    } = {}
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
        /* Clicking a palette tile can scroll the tools strip's tab row away */
        from.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        fire('dragstart', from, [0, 0])
        await sleep(50)
        const at = point(doc)
        const target = doc.elementFromPoint(...at) as Element
        fire('dragenter', target, at)
        fire('dragover', target, at)
        await sleep(30)
        fire('dragover', target, at)
        await sleep(30)
        whileOver?.(doc)
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
export const dragDivider = (
    title: string,
    side: 'right' | 'bottom',
    to: number
) =>
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

export const clickTile = (tile: ViewType) =>
    cy.get(`[data-test="add-view-${tile}"]`).click()

/* Map 1 | Visualization 1, split 70/30 by the user */
export const setUpSeventyThirty = () => {
    mountWorkspace()
    clickTile('map')
    clickTile('visualization')
    dragDivider('Map 1', 'right', 0.7)
    expectLayout({ 'Map 1': { w: 70 }, 'Visualization 1': { w: 30 } })
}

/* Tagged tests make the smoke run (pnpm cy:comp:smoke) */
export const SMOKE = { tags: '@smoke' }

export const NO_PREVIEW: DragResult = { preview: false, insertLine: false }
export const INSERT_LINE: DragResult = { preview: false, insertLine: true }
export const PREVIEW: DragResult = { preview: true, insertLine: false }

const titlesOf = (elements: JQuery<HTMLElement>) =>
    [...elements].map((element) => element.textContent?.trim())

/* The tabs of the tools strip, in order */
export const toolTabs = () => cy.get('.dv-edge-group .dv-tab').then(titlesOf)

/* The views' titles, in the order dockview lays them out */
export const viewTitles = () =>
    cy
        .document()
        .then((doc) =>
            getCells(doc).map((cell) =>
                cell.querySelector('.dv-tab')?.textContent?.trim()
            )
        )

/* Clicks inside a view's header, e.g. its close or maximize button */
export const inViewHeader = (title: string, selector: string) =>
    cy
        .document()
        .then((doc) =>
            cy.wrap(getCell(doc, title).querySelector(selector) as HTMLElement)
        )

export const closeView = (title: string) =>
    inViewHeader(title, '.dv-default-tab-action').click()

/* Map 1 | (Visualization 1 over Map 2), Map 1 at 35% */
export const setUpStack = () => {
    mountWorkspace()
    clickTile('map')
    dragTo({ tile: 'visualization' }, (doc) =>
        pointIn(doc, 'Map 1', [0.85, 0.5])
    )
    dragTo({ tile: 'map' }, (doc) =>
        pointIn(doc, 'Visualization 1', [0.5, 0.8])
    )
    dragDivider('Map 1', 'right', 0.35)
    expectLayout({
        'Map 1': { w: 35, h: 100 },
        'Visualization 1': { x: 35, w: 65, h: 50 },
        'Map 2': { x: 35, y: 50, w: 65, h: 50 },
    })
}

/* Map 1 | ((Visualization 2 | Visualization 1) over a short Map 2) */
export const setUpCapture = () => {
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
