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
    getViewPanels,
    isViewPanel,
    toWorkspaceView,
} from './panels'
import {
    addViewSettingsPanel,
    showToolPanel,
    showViewSettings,
    type ToolTitles,
} from './settings'

/* Keeps the store, the settings tabs and the selection in step as views
 * are added, closed and selected */
export const createViewEvents = (
    api: DockviewApi,
    dispatch: AppDispatch,
    toolTitles: ToolTitles
) => {
    let selectedViewId: string | null = null

    const onViewAdded = (panel: IDockviewPanel) => {
        if (isViewPanel(panel)) {
            dispatch(viewAdded(toWorkspaceView(panel)))
            addViewSettingsPanel(api, panel, toolTitles)
        }
    }

    /* Closing the selected view selects a neighbour, like closing an editor
     * in VS Code; the strip then shows that view's settings, or the palette
     * once the grid is empty, instead of whichever tab dockview falls back to. */
    const onViewRemoved = (panel: IDockviewPanel) => {
        if (!isViewPanel(panel)) {
            return
        }
        dispatch(viewRemoved(panel.id))
        const settings = api.getPanel(getSettingsPanelId(panel.id))
        const settingsWasShown = Boolean(
            settings && settings.group.activePanel?.id === settings.id
        )
        if (settings) {
            api.removePanel(settings)
        }
        if (selectedViewId === panel.id) {
            selectedViewId = null
            getViewPanels(api)[0]?.api.setActive()
        }
        if (!settingsWasShown && selectedViewId !== null) {
            return
        }
        if (selectedViewId) {
            showViewSettings(api, selectedViewId)
        } else {
            showToolPanel(api, ADD_VIEWS_PANEL_ID)
        }
    }

    /* Only a view the user picks shows its settings; one just added from
     * the palette leaves the palette open for the next add. */
    const onViewSelected = ({
        panel,
        origin,
    }: {
        panel?: IDockviewPanel
        origin: string
    }) => {
        if (!panel || !isViewPanel(panel)) {
            return
        }
        selectedViewId = panel.id
        dispatch(activeViewChanged(panel.id))
        if (origin === 'user') {
            showViewSettings(api, panel.id)
        }
    }

    return { onViewAdded, onViewRemoved, onViewSelected }
}
