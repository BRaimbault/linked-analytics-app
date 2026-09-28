import type { DockviewApi } from 'dockview-react'
import { EDGE_POSITIONS, getGroupPanel } from './panels'

/* The smallest the workspace can be with every view at its minimum.
 * dockview's own minimum leaves out the edge groups (the tools strip), so
 * their current size is added along their axis. */
export const getWorkspaceMinimumSize = (
    api: DockviewApi
): { width: number; height: number } => {
    let width = api.minimumWidth
    let height = api.minimumHeight
    for (const position of EDGE_POSITIONS) {
        const edge = api.getEdgeGroup(position)
        const group = edge && getGroupPanel(api, edge.id)
        if (!group) {
            continue
        }
        if (position === 'left' || position === 'right') {
            width += group.api.width
        } else {
            height += group.api.height
        }
    }
    return { width, height }
}
