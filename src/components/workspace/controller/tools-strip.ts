import type { DockviewApi } from 'dockview-react'
import { getGroupPanel, type EdgePosition } from './panels'

const EDGE_GROUP_SIZE: Record<EdgePosition, number> = {
    top: 132,
    bottom: 132,
    left: 280,
    right: 280,
}

/* Room for the tab row and a line of the panel below it */
const TOOLS_MIN_SIZE = 80

export const getOrAddEdgeGroupId = (
    api: DockviewApi,
    position: EdgePosition
): string =>
    (
        api.getEdgeGroup(position) ??
        api.addEdgeGroup(position, {
            id: `tools-${position}`,
            initialSize: EDGE_GROUP_SIZE[position],
            minimumSize: TOOLS_MIN_SIZE,
        })
    ).id

export const moveTools = (
    api: DockviewApi,
    from: EdgePosition,
    to: EdgePosition
): void => {
    const source = api.getEdgeGroup(from)
    const sourceGroup = source && getGroupPanel(api, source.id)
    if (!sourceGroup || from === to) {
        return
    }
    const target = getGroupPanel(api, getOrAddEdgeGroupId(api, to))
    if (!target) {
        return
    }
    const activePanel = sourceGroup.activePanel
    const wasCollapsed = source.isCollapsed()
    for (const panel of [...sourceGroup.panels]) {
        panel.api.moveTo({ group: target })
    }
    api.removeEdgeGroup(from)
    activePanel?.api.setActive()
    if (wasCollapsed) {
        target.api.collapse()
    }
}

/* After a move from the strip's menu: the menu's button went with the old
 * strip, so the focus goes to the open tab of the new one */
export const focusToolsStrip = (
    api: DockviewApi,
    position: EdgePosition
): void => {
    const strip = api.getEdgeGroup(position)
    const group = strip && getGroupPanel(api, strip.id)
    group?.element.querySelector<HTMLElement>('.dv-tab.dv-active-tab')?.focus()
}
