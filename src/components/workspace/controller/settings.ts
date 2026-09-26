import type { DockviewApi, IDockviewPanel } from 'dockview-react'
import {
    ADD_VIEWS_PANEL_ID,
    getSettingsPanelId,
    getViewGroups,
    VIEW_SETTINGS_COMPONENT,
    type ViewSettingsPanelParams,
} from './panels'
import { getOrAddEdgeGroupId } from './tools-strip'

/* Brings a view's settings tab forward without making the tools strip the
 * active group or expanding it when collapsed. */
export const showToolPanel = (api: DockviewApi, panelId: string): void => {
    const panel = api.getPanel(panelId)
    panel?.group.model.openPanel(panel, { skipSetGroupActive: true })
}

export const showViewSettings = (api: DockviewApi, viewId: string): void =>
    showToolPanel(api, getSettingsPanelId(viewId))

const VIEW_ID_ATTRIBUTE = 'data-view-id'

/* Clicking a view that is already active fires no dockview event, so
 * pointer-downs in a view's cell also bring its settings forward. A cell's
 * body is rendered in an overlay outside the group element, so it carries
 * the view id itself; tabs sit inside the group element. */
export const showSettingsForTarget = (
    api: DockviewApi,
    target: EventTarget | null
): void => {
    if (!(target instanceof Element)) {
        return
    }
    const bodyViewId = target
        .closest(`[${VIEW_ID_ATTRIBUTE}]`)
        ?.getAttribute(VIEW_ID_ATTRIBUTE)
    const tabViewId = getViewGroups(api).find((group) =>
        group.element.contains(target)
    )?.activePanel?.id
    const viewId = bodyViewId ?? tabViewId
    if (viewId) {
        showViewSettings(api, viewId)
    }
}

/* Closing a view also removes its settings tab (see setupWorkspace) */
export const closeView = (api: DockviewApi, viewId: string): void => {
    const view = api.getPanel(viewId)
    if (view) {
        api.removePanel(view)
    }
}

export const openSettings = (api: DockviewApi, viewId: string): void => {
    const settings = api.getPanel(getSettingsPanelId(viewId))
    settings?.group.api.expand()
    settings?.api.setActive()
}

export type ToolTitles = {
    addViews: string
    viewSettings: (viewTitle: string) => string
}

export const addToolPanels = (api: DockviewApi, titles: ToolTitles): void => {
    if (api.getPanel(ADD_VIEWS_PANEL_ID)) {
        return
    }
    const topGroupId = getOrAddEdgeGroupId(api, 'top')
    api.addPanel({
        id: ADD_VIEWS_PANEL_ID,
        component: ADD_VIEWS_PANEL_ID,
        title: titles.addViews,
        position: { referenceGroup: topGroupId },
    })
}

/* Settings tabs follow "Add views", in the order the views were added.
 * None is added once the tools are gone, e.g. during teardown. */
export const addViewSettingsPanel = (
    api: DockviewApi,
    view: IDockviewPanel,
    titles: ToolTitles
): void => {
    const id = getSettingsPanelId(view.id)
    const addViews = api.getPanel(ADD_VIEWS_PANEL_ID)
    if (api.getPanel(id) || !addViews) {
        return
    }
    const params: ViewSettingsPanelParams = { viewId: view.id }
    api.addPanel({
        id,
        component: VIEW_SETTINGS_COMPONENT,
        title: titles.viewSettings(view.title ?? ''),
        params,
        position: {
            referenceGroup: addViews.group,
            index: addViews.group.panels.length,
        },
        inactive: true,
    })
}
