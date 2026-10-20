import type { DockviewApi } from 'dockview-react'
import { getViewPanels } from './panels'
import { closeView } from './views'

/* A preset fills the grid only while it has no views: under StrictMode
 * the workspace is set up twice, and it must load once */
export const loadPreset = (
    api: DockviewApi,
    load: (api: DockviewApi) => void
): void => {
    if (!getViewPanels(api).length) {
        load(api)
    }
}

/* Closes every view, which takes it out of its channels too, and loads the
 * preset again. A maximized view would keep the new views out of sight. */
export const resetToPreset = (
    api: DockviewApi,
    load: (api: DockviewApi) => void
): void => {
    if (api.hasMaximizedGroup()) {
        api.exitMaximizedGroup()
    }
    for (const view of getViewPanels(api)) {
        closeView(api, view.id)
    }
    load(api)
}
