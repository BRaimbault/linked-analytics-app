import type { DockviewApi, IDockviewPanel } from 'dockview-react'
import {
    ADD_VIEWS_PANEL_ID,
    WORKSPACE_PANEL_ID,
    getPanelKind,
    getSettingsPanelId,
    VIEW_SETTINGS_COMPONENT,
    type ViewSettingsPanelParams,
} from './panels'
import { getOrAddEdgeGroupId } from './tools-strip'
import { getTargetViewId } from './views'

/* Brings a tools tab forward without making the tools strip the active
 * group or expanding it when collapsed. False when there is no such tab
 * (e.g. a text view has no settings). */
export const showToolPanel = (api: DockviewApi, panelId: string): boolean => {
    const panel = api.getPanel(panelId)
    panel?.group.model.openPanel(panel, { skipSetGroupActive: true })
    return Boolean(panel)
}

export const showViewSettings = (api: DockviewApi, viewId: string): boolean =>
    showToolPanel(api, getSettingsPanelId(viewId))

/* Puts focus on a tools tab, e.g. once the tab that had it is gone */
export const focusToolTab = (api: DockviewApi, panelId: string): void => {
    api.getPanel(panelId)
        ?.group.element.querySelector<HTMLElement>(
            `[data-tab-panel-id="${panelId}"]`
        )
        ?.focus()
}

const isTabCloseButton = (target: EventTarget | null): boolean =>
    target instanceof Element &&
    target.closest('.dv-default-tab-action') !== null

/* A tab's close button sits inside the tab, so dockview would select the
 * view on pointer-down, or open the settings tab on click, before closing
 * it. dockview skips events already handled, so marking them keeps the
 * selection and the tools strip as they were. */
export const keepCloseFromSelecting = (event: {
    target: EventTarget | null
    preventDefault: () => void
}): boolean => {
    const isClose = isTabCloseButton(event.target)
    if (isClose) {
        event.preventDefault()
    }
    return isClose
}

/* Clicking a view that is already active fires no dockview event, so
 * pointer-downs in a view's cell also bring its settings forward. Returns
 * the view whose settings are shown, to select it. */
export const showSettingsForTarget = (
    api: DockviewApi,
    target: EventTarget | null
): string | null => {
    const viewId = getTargetViewId(api, target)
    return viewId && showViewSettings(api, viewId) ? viewId : null
}

/* Closing a view also removes its settings tab (see setupWorkspace) */
export const openSettings = (api: DockviewApi, viewId: string): void => {
    const settings = api.getPanel(getSettingsPanelId(viewId))
    settings?.group.api.expand()
    settings?.api.setActive()
}

export type ToolTitles = {
    workspace: string
    addViews: string
}

/* "Workspace" (settings of the whole workspace) comes first; "Add views"
 * is the tab shown */
export const addToolPanels = (api: DockviewApi, titles: ToolTitles): void => {
    if (api.getPanel(ADD_VIEWS_PANEL_ID)) {
        return
    }
    const topGroupId = getOrAddEdgeGroupId(api, 'top')
    api.addPanel({
        id: WORKSPACE_PANEL_ID,
        component: WORKSPACE_PANEL_ID,
        title: titles.workspace,
        position: { referenceGroup: topGroupId },
        inactive: true,
    })
    api.addPanel({
        id: ADD_VIEWS_PANEL_ID,
        component: ADD_VIEWS_PANEL_ID,
        title: titles.addViews,
        position: { referenceGroup: topGroupId },
    })
}

/* Settings tabs follow "Add views", in the order the views were added,
 * titled like their view: the strip is where settings live, and its tabs are
 * short. Text views are edited in place, so they have none, and none is
 * added once the tools are gone, e.g. during teardown. */
export const addViewSettingsPanel = (
    api: DockviewApi,
    view: IDockviewPanel
): void => {
    const id = getSettingsPanelId(view.id)
    const addViews = api.getPanel(ADD_VIEWS_PANEL_ID)
    if (api.getPanel(id) || !addViews || getPanelKind(view) === 'text') {
        return
    }
    const params: ViewSettingsPanelParams = { viewId: view.id }
    api.addPanel({
        id,
        component: VIEW_SETTINGS_COMPONENT,
        title: view.title ?? '',
        params,
        position: {
            referenceGroup: addViews.group,
            index: addViews.group.panels.length,
        },
        inactive: true,
    })
}
