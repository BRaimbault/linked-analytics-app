import type { AppDispatch } from '@store/store'
import { viewHeadersHiddenChanged } from '@store/workspace-settings-slice'
import type { DockviewApi } from 'dockview-react'
import { createContext, useContext } from 'react'

/* Views a workspace starts with, such as the demo's: loaded into an empty
 * grid, and again from the Workspace tab, which then offers to reset */
export type WorkspacePreset = {
    /* Adds the views; `dispatch` sets how they follow their channels */
    load: (api: DockviewApi, dispatch: AppDispatch) => void
    /* The Workspace tab's heading and button for it */
    name: () => string
    resetLabel: () => string
    /* Whether the views start without headers, as a first look can */
    viewHeadersHidden: boolean
}

/* The settings a preset starts with, set when it loads or is reset */
export const applyPresetSettings = (
    dispatch: AppDispatch,
    preset: WorkspacePreset
): void => {
    dispatch(viewHeadersHiddenChanged(preset.viewHeadersHidden))
}

export const WorkspacePresetContext = createContext<WorkspacePreset | null>(
    null
)

export const useWorkspacePreset = (): WorkspacePreset | null =>
    useContext(WorkspacePresetContext)
