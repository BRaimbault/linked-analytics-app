import type { SplitAxis, ViewSizes } from '@modules/workspace/grid-tree'
import { PLUGIN_SIZES } from '@modules/workspace/grid-tree'
import {
    getViewKind,
    getViewTypeSizes,
    type ViewKind,
    type ViewType,
} from '@modules/workspace/view-types'
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

export const WORKSPACE_PANEL_ID = 'workspace'

const SETTINGS_PANEL_PREFIX = 'settings-'

export const getSettingsPanelId = (viewId: string): string =>
    `${SETTINGS_PANEL_PREFIX}${viewId}`

/* The tools that stay first in the strip, in this order */
const FIXED_TOOL_PANEL_IDS = [WORKSPACE_PANEL_ID, ADD_VIEWS_PANEL_ID]

export const isFixedToolPanelId = (id: string): boolean =>
    FIXED_TOOL_PANEL_IDS.includes(id)

export const isToolPanelId = (id: string): boolean =>
    id === WORKSPACE_PANEL_ID ||
    id === ADD_VIEWS_PANEL_ID ||
    id.startsWith(SETTINGS_PANEL_PREFIX)

export type EdgePosition = 'top' | 'bottom' | 'left' | 'right'

export const EDGE_POSITIONS: EdgePosition[] = ['top', 'left', 'right', 'bottom']

/* A text view also holds its text */
export type ViewPanelParams = Pick<WorkspaceView, 'type' | 'number'> & {
    text?: string
}

export type ViewSettingsPanelParams = { viewId: string }

/* A panel, or a tab's props, which carry the same api and params */
type PanelLike = Pick<IDockviewPanel, 'api' | 'params'>

export const isViewPanel = (panel: PanelLike): boolean =>
    panel.api.component === VIEW_COMPONENT

export const isViewSettingsPanel = (panel: PanelLike): boolean =>
    panel.api.component === VIEW_SETTINGS_COMPONENT

export const getSettingsViewId = (settings: PanelLike): string =>
    (settings.params as ViewSettingsPanelParams).viewId

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

/* A view panel's params, which dockview types loosely */
const getViewParams = (panel: PanelLike): ViewPanelParams =>
    panel.params as ViewPanelParams

export const toWorkspaceView = (
    panel: IDockviewPanel
): Omit<WorkspaceView, 'kind'> => {
    const { type, number } = getViewParams(panel)
    return { id: panel.id, type, number }
}

/* A cell showing no view (e.g. a swap spacer) counts as a plugin */
export const getPanelKind = (panel: IDockviewPanel | undefined): ViewKind =>
    panel && isViewPanel(panel)
        ? getViewKind(getViewParams(panel).type)
        : 'plugin'

export const getPanelSizes = (panel: IDockviewPanel | undefined): ViewSizes =>
    panel && isViewPanel(panel)
        ? getViewTypeSizes(getViewParams(panel).type)
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

/* The type of the view a tab shows: a view's, or a settings tab's view's */
export const getTabViewType = (
    api: DockviewApi,
    tab: PanelLike
): ViewType | null => {
    const view = isViewSettingsPanel(tab)
        ? api.getPanel(getSettingsViewId(tab))
        : tab
    return view && isViewPanel(view) ? getViewParams(view).type : null
}
