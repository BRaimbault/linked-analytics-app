import type { DockviewApi } from 'dockview-react'
import { createContext, useContext } from 'react'

/* Views a workspace starts with, such as the demo's: loaded into an empty
 * grid, and again from the Workspace tab, which then offers to reset */
export type WorkspacePreset = {
    load: (api: DockviewApi) => void
    /* The Workspace tab's heading and button for it */
    name: () => string
    resetLabel: () => string
}

export const WorkspacePresetContext = createContext<WorkspacePreset | null>(
    null
)

export const useWorkspacePreset = (): WorkspacePreset | null =>
    useContext(WorkspacePresetContext)
