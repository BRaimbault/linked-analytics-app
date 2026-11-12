import i18n from '@dhis2/d2-i18n'
import type { DemoStory } from '@modules/demo/story'
import type { DockviewApi, IDockviewPanel } from 'dockview-react'
import type { Popover } from 'driver.js'

/* The tours: one tells the story the data hides and how linked views
 * reveal it; one shows how this workspace is set up; one shows the climate
 * app's Explore in linked views */
export type TourKind = 'malaria' | 'how-it-works' | 'climate'

/* The preset's views the tours point at */
export type TourViews = {
    chart: string
    map: string
    table: string
    orgUnitSelector: string
    periodSelector: string
    dataSelector: string
}

/* A step and what it needs shown: the story's district selected or not,
 * and a tools tab open */
export type TourStep = {
    element?: () => Element
    /* side and align: where the popover goes, when it would cover what the
     * step invites the user to click or look at */
    popover: Pick<Popover, 'title' | 'description' | 'side' | 'align'>
    district: boolean
    /* The user's own click on the district moves the tour on */
    advancesOnDistrictClick?: boolean
    /* The map drilled down into the district; steps without it undo it */
    mapDrilled?: boolean
    /* The user's own drill down into the district moves the tour on */
    advancesOnMapDrill?: boolean
    /* The data item the data selector holds, or none; steps without it
     * keep it as it is */
    dataPick?: string | null
    /* The user's own pick of this data item moves the tour on */
    advancesOnDataPick?: string
    /* The temperature map the tour adds, and the temperature chart it
     * picks for the table, shown or not */
    temperatureMap?: boolean
    temperatureChart?: boolean
    /* The tour plays the timeline through, once per visit */
    playsTimeline?: boolean
    toolPanelId?: string
    /* Whether the views show their headers; steps without it keep them as
     * they are */
    showsViewHeaders?: boolean
    /* The highlighted element takes clicks, as a step's text may invite,
     * unless a click would undo the tour (such as Reset) */
    blocksClicks?: boolean
}

export type StepContext = {
    api: DockviewApi
    views: TourViews
    story: DemoStory
    /* The letters of the org unit and period channels */
    channels: { orgUnit: string; period: string }
}

/* The cell a panel sits in, its header included */
export const panelCell = (api: DockviewApi, panelId: string): Element =>
    (api.getPanel(panelId) as IDockviewPanel).group.element

/* The line of cells a panel's cell sits in, a column or a row, as dockview
 * lays them out: two views a step talks about together */
export const lineOf = (api: DockviewApi, panelId: string): Element =>
    panelCell(api, panelId).parentElement?.closest('.dv-branch-node') as Element

const AREA_ID = 'demo-tour-area'

/* A box over several cells, for a step that talks about them together:
 * driver.js highlights one element. It takes no clicks, so the views under
 * it do. */
export const areaOf = (elements: Element[]): Element => {
    let area = document.getElementById(AREA_ID)
    if (!area) {
        area = document.createElement('div')
        area.id = AREA_ID
        area.dataset.test = 'tour-area'
        area.style.position = 'fixed'
        area.style.pointerEvents = 'none'
        document.body.append(area)
    }
    const boxes = elements.map((element) => element.getBoundingClientRect())
    const left = Math.min(...boxes.map((box) => box.left))
    const top = Math.min(...boxes.map((box) => box.top))
    area.style.left = `${left}px`
    area.style.top = `${top}px`
    area.style.width = `${Math.max(...boxes.map((box) => box.right)) - left}px`
    area.style.height = `${Math.max(...boxes.map((box) => box.bottom)) - top}px`
    return area
}

export const removeArea = () => document.getElementById(AREA_ID)?.remove()

/* A view's body, where its plugin takes clicks */
export const viewBody = (viewId: string): Element =>
    document.querySelector(`[data-view-id="${viewId}"]`) as Element

/* A tools tab's content, where its controls take clicks */
export const toolContent = (api: DockviewApi, panelId: string): Element =>
    (
        api.getPanel(panelId) as IDockviewPanel
    ).view.content.element.querySelector('[data-tool-panel]') as Element

export const inPanel = (selector: string, inner: string): Element =>
    document.querySelector(`[data-test="${selector}"] ${inner}`) as Element

export const format = (value: number): string =>
    Math.round(value).toLocaleString(i18n.language)
