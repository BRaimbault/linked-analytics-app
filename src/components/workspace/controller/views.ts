import type { DockviewApi } from 'dockview-react'
import { getViewGroups } from './panels'

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
