import i18n from '@dhis2/d2-i18n'
import type { DemoStory } from '@modules/demo/story'
import type { DockviewApi, IDockviewPanel } from 'dockview-react'
import type { Popover } from 'driver.js'

/* The two tours: one tells the story the data hides and how linked views
 * reveal it; the other shows how this workspace is set up */
export type TourKind = 'story' | 'how-it-works'

/* The preset's views the tours point at */
export type TourViews = {
    chart: string
    map: string
    table: string
    orgUnitSelector: string
    periodSelector: string
}

/* A step and what it needs shown: the story's district selected or not,
 * and a tools tab open */
export type TourStep = {
    element?: () => Element
    /* side: where the popover goes, when it would cover what the step
     * invites the user to click */
    popover: Pick<Popover, 'title' | 'description' | 'side'>
    district: boolean
    /* The user's own click on the district moves the tour on */
    advancesOnDistrictClick?: boolean
    /* The map drilled down into the district; steps without it undo it */
    mapDrilled?: boolean
    /* The user's own drill down into the district moves the tour on */
    advancesOnMapDrill?: boolean
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
