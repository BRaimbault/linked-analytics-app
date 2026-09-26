import type { DockviewApi } from 'dockview-react'
import { createContext, useContext } from 'react'

/* The dockview api is a live, non-serializable object, so it is shared
 * through context rather than the Redux store. */
export const WorkspaceApiContext = createContext<DockviewApi | null>(null)

export const useWorkspaceApi = (): DockviewApi | null =>
    useContext(WorkspaceApiContext)
