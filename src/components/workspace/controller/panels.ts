import type { SplitAxis, ViewSizes } from '@modules/workspace/grid-tree'
import { PLUGIN_SIZES } from '@modules/workspace/grid-tree'
import { getViewTypeSizes } from '@modules/workspace/view-types'
import type { WorkspaceView } from '@store/workspace-slice'
import type {
    DockviewApi,
    DockviewGroupPanel,
    IDockviewPanel,
} from 'dockview-react'

export const VIEW_COMPONENT = 'view'

export const VIEW_SETTINGS_COMPONENT = 'view-settings'

export const SWAP_SPACER_COMPONENT = 'swap-spacer'

export const ADD_VIEWS_PANEL_ID = 'add-views'

const TOOL_PANEL_IDS = [ADD_VIEWS_PANEL_ID]

const SETTINGS_PANEL_PREFIX = 'settings-'

export const getSettingsPanelId = (viewId: string): string =>
    `${SETTINGS_PANEL_PREFIX}${viewId}`

export const isToolPanelId = (id: string): boolean =>
    TOOL_PANEL_IDS.includes(id) || id.startsWith(SETTINGS_PANEL_PREFIX)

export type EdgePosition = 'top' | 'bottom' | 'left' | 'right'

export const EDGE_POSITIONS: EdgePosition[] = ['top', 'left', 'right', 'bottom']

export type ViewPanelParams = Pick<WorkspaceView, 'type' | 'number'>

export type ViewSettingsPanelParams = { viewId: string }

export const isViewPanel = (panel: IDockviewPanel): boolean =>
    panel.api.component === VIEW_COMPONENT

export const isEdgeGroup = (group: DockviewGroupPanel | undefined): boolean =>
    group?.api.location.type === 'edge'

export const getEdgePosition = (
    group: DockviewGroupPanel
): EdgePosition | null => {
    const location = group.api.location
    return location.type === 'edge' ? location.position : null
}

export const getViewPanels = (api: DockviewApi): IDockviewPanel[] =>
    api.panels.filter(isViewPanel)

export const toWorkspaceView = (
    panel: IDockviewPanel
): Omit<WorkspaceView, 'kind'> => {
    const params = panel.params as ViewPanelParams
    return { id: panel.id, type: params.type, number: params.number }
}

export const getPanelSizes = (panel: IDockviewPanel | undefined): ViewSizes =>
    panel && isViewPanel(panel)
        ? getViewTypeSizes((panel.params as ViewPanelParams).type)
        : PLUGIN_SIZES

export const getViewGroups = (api: DockviewApi): DockviewGroupPanel[] => [
    ...new Set(getViewPanels(api).map((panel) => panel.group)),
]

export const getCellLength = (
    group: DockviewGroupPanel,
    axis: SplitAxis
): number => (axis === 'horizontal' ? group.api.width : group.api.height)

/* getGroup is typed with the group interface, but moveTo needs the group
 * class; the returned object is that class at runtime. */
export const getGroupPanel = (
    api: DockviewApi,
    id: string
): DockviewGroupPanel | undefined =>
    api.getGroup(id) as DockviewGroupPanel | undefined
