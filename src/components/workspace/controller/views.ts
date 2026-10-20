import type { PluginObject } from '@modules/plugins/contract'
import type { DockviewApi } from 'dockview-react'
import { getViewGroups, type ViewPanelParams } from './panels'

/* The saved item a plugin view shows, kept in its params, which dockview
 * keeps with the layout; the view itself stays where it is */
export const setViewObject = (
    api: DockviewApi,
    viewId: string,
    object: PluginObject
): void => {
    const view = api.getPanel(viewId)
    view?.api.updateParameters({ ...view.params, object })
}

export const getViewObject = (
    api: DockviewApi,
    viewId: string
): PluginObject | undefined =>
    (api.getPanel(viewId)?.params as ViewPanelParams | undefined)?.object

/* Calls back when a view's params change, e.g. its saved item */
export const onViewParamsChange = (
    api: DockviewApi,
    viewId: string,
    listener: () => void
): { dispose: () => void } =>
    api.getPanel(viewId)?.api.onDidParametersChange(listener) ?? {
        dispose: () => {},
    }

export const closeView = (api: DockviewApi, viewId: string): void => {
    const view = api.getPanel(viewId)
    if (view) {
        api.removePanel(view)
    }
}

/* Puts focus on a view's tab, e.g. once a swap has moved the view away
 * from the keyboard's focus */
export const focusViewTab = (api: DockviewApi, viewId: string): void => {
    api.getPanel(viewId)
        ?.group.element.querySelector<HTMLElement>('.dv-tab.dv-active-tab')
        ?.focus()
}

const VIEW_ID_ATTRIBUTE = 'data-view-id'

/* The view a pointer target is in. A cell's body is rendered in an
 * overlay outside the group element, so it carries the view id itself;
 * tabs sit inside the group element. */
export const getTargetViewId = (
    api: DockviewApi,
    target: EventTarget | null
): string | null => {
    if (!(target instanceof Element)) {
        return null
    }
    const bodyViewId = target
        .closest(`[${VIEW_ID_ATTRIBUTE}]`)
        ?.getAttribute(VIEW_ID_ATTRIBUTE)
    const tabViewId = getViewGroups(api).find((group) =>
        group.element.contains(target)
    )?.activePanel?.id
    return bodyViewId ?? tabViewId ?? null
}

/* Marks the cell of the view under the pointer, for headers shown on
 * hover: CSS :hover can't tell, as a view's body is outside its cell */
export const markHoveredView = (
    api: DockviewApi | null,
    target: EventTarget | null
): void => {
    if (!api) {
        return
    }
    const hoveredViewId = getTargetViewId(api, target)
    for (const group of getViewGroups(api)) {
        group.element.toggleAttribute(
            'data-hovered',
            group.activePanel?.id === hoveredViewId
        )
    }
}
