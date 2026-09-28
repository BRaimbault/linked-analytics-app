import type { AppDispatch } from '@store/store'
import {
    activeViewChanged,
    viewAdded,
    viewRemoved,
} from '@store/workspace-slice'
import type { DockviewApi, IDockviewPanel } from 'dockview-react'
import {
    ADD_VIEWS_PANEL_ID,
    getSettingsPanelId,
    getSettingsViewId,
    isToolPanelId,
    isViewPanel,
    isViewSettingsPanel,
    toWorkspaceView,
} from './panels'
import {
    addViewSettingsPanel,
    focusToolTab,
    showToolPanel,
    showViewSettings,
} from './settings'

/* Keeps the store, the settings tabs and the selection in step as views
 * are added, closed and selected. A view is selected only while its
 * settings tab is shown: "Workspace" and "Add views" select none. */
export const createViewEvents = (api: DockviewApi, dispatch: AppDispatch) => {
    const select = (viewId: string | null) =>
        dispatch(activeViewChanged(viewId))

    const onViewAdded = (panel: IDockviewPanel) => {
        if (isViewPanel(panel)) {
            dispatch(viewAdded(toWorkspaceView(panel)))
            addViewSettingsPanel(api, panel)
        }
    }

    /* Closing a view goes back to the palette, the likely next step while
     * arranging, with no view selected. The tab closed may have had the
     * focus, which then goes to the palette's tab. */
    const onViewRemoved = (panel: IDockviewPanel) => {
        if (!isViewPanel(panel)) {
            return
        }
        dispatch(viewRemoved(panel.id))
        const settings = api.getPanel(getSettingsPanelId(panel.id))
        if (settings) {
            api.removePanel(settings)
        }
        showToolPanel(api, ADD_VIEWS_PANEL_ID)
        select(null)
        if (document.activeElement === document.body) {
            focusToolTab(api, ADD_VIEWS_PANEL_ID)
        }
    }

    /* A view the user picks shows its settings, and one just added from
     * the palette leaves the palette open for the next add. */
    const onViewSelected = ({
        panel,
        origin,
    }: {
        panel?: IDockviewPanel
        origin: string
    }) => {
        if (!panel) {
            return
        }
        if (isViewSettingsPanel(panel)) {
            select(getSettingsViewId(panel))
        } else if (isToolPanelId(panel.id)) {
            select(null)
        } else if (
            isViewPanel(panel) &&
            origin === 'user' &&
            showViewSettings(api, panel.id)
        ) {
            select(panel.id)
        }
    }

    return { onViewAdded, onViewRemoved, onViewSelected }
}
