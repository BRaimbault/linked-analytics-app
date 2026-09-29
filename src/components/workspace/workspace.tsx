import { getWorkspaceAnnouncement } from '@components/workspace/controller/announcements'
import {
    getDropOverlayModel,
    getOuterEdgeDropModel,
} from '@components/workspace/controller/drop-models'
import {
    ADD_VIEWS_PANEL_ID,
    SWAP_SPACER_COMPONENT,
    VIEW_COMPONENT,
    VIEW_SETTINGS_COMPONENT,
    WORKSPACE_PANEL_ID,
} from '@components/workspace/controller/panels'
import { loadPreset } from '@components/workspace/controller/preset'
import {
    keepCloseFromSelecting,
    showSettingsForTarget,
} from '@components/workspace/controller/settings'
import { setupWorkspace } from '@components/workspace/controller/setup-workspace'
import { markHoveredView } from '@components/workspace/controller/views'
import { InsertZones } from '@components/workspace/insert-zones/insert-zones'
import { AddViewsPanel } from '@components/workspace/panels/add-views-panel'
import { SettingsPanel } from '@components/workspace/panels/settings-panel'
import { SwapSpacer } from '@components/workspace/panels/swap-spacer'
import { ViewPanel } from '@components/workspace/panels/view-panel'
import { Watermark } from '@components/workspace/panels/watermark'
import { WorkspacePanel } from '@components/workspace/panels/workspace-panel'
import { HeaderActions } from '@components/workspace/tabs/header-actions'
import { WorkspaceTab } from '@components/workspace/tabs/workspace-tab'
import { useCurrentDrag } from '@components/workspace/use-current-drag'
import { useWorkspaceMinimumSize } from '@components/workspace/use-workspace-minimum-size'
import { WorkspaceApiContext } from '@components/workspace/workspace-api-context'
import {
    WorkspacePresetContext,
    type WorkspacePreset,
} from '@components/workspace/workspace-preset'
import i18n from '@dhis2/d2-i18n'
import { useAppDispatch, useAppSelector } from '@hooks'
import { selectViewHeaders } from '@store/workspace-settings-slice'
import { activeViewChanged } from '@store/workspace-slice'
import {
    DockviewReact,
    themeLight,
    type DockviewApi,
    type DockviewTheme,
    type DockviewReadyEvent,
} from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import { useEffect, useRef, useState, type FC } from 'react'
import classes from './styles/workspace.module.css'

/* Tabs are reordered only in the tools strip, and a tab dropped there lands
 * between two tabs, so its preview is a line at that tab edge rather than a
 * shaded half tab. tabAnimation unset would open a gap in a view's header
 * as if the view could join it; views never share a cell. */
const THEME: DockviewTheme = {
    ...themeLight,
    dndTabIndicator: 'line',
    tabAnimation: 'default',
}

/* Defined once: a new object on every render makes dockview reconfigure */
const components = {
    [VIEW_COMPONENT]: ViewPanel,
    [WORKSPACE_PANEL_ID]: WorkspacePanel,
    [ADD_VIEWS_PANEL_ID]: AddViewsPanel,
    [VIEW_SETTINGS_COMPONENT]: SettingsPanel,
    [SWAP_SPACER_COMPONENT]: SwapSpacer,
}

export const Workspace: FC<{ preset?: WorkspacePreset }> = ({ preset }) => {
    const dispatch = useAppDispatch()
    const [api, setApi] = useState<DockviewApi | null>(null)
    const dragFormats = useCurrentDrag()
    const minimumSize = useWorkspaceMinimumSize(api)
    const viewHeaders = useAppSelector(selectViewHeaders)

    /* A floating header gives a view's content its room: dockview places
     * view bodies from their cell's content box, but only when it lays out */
    const workspaceRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const element = workspaceRef.current
        if (api && element) {
            api.layout(element.clientWidth, element.clientHeight, true)
        }
    }, [api, viewHeaders])

    useEffect(() => {
        if (!api) {
            return
        }
        return setupWorkspace(api, dispatch, {
            workspace: i18n.t('Workspace'),
            addViews: i18n.t('Add views'),
        })
    }, [api, dispatch])

    /* After the effects above: the grid has its size, which the preset's
     * views are placed and sized from */
    useEffect(() => {
        if (api && preset) {
            loadPreset(api, preset.load)
        }
    }, [api, preset])

    return (
        <WorkspaceApiContext.Provider value={api}>
            <WorkspacePresetContext.Provider value={preset ?? null}>
                <div
                    ref={workspaceRef}
                    className={classes.workspace}
                    data-test="workspace"
                    data-dragging={dragFormats ? true : undefined}
                    data-view-headers={viewHeaders}
                    onPointerOver={(event) =>
                        markHoveredView(api, event.target)
                    }
                    onPointerLeave={() => markHoveredView(api, null)}
                    style={minimumSize}
                    onPointerDownCapture={(event) => {
                        if (keepCloseFromSelecting(event) || !api) {
                            return
                        }
                        const viewId = showSettingsForTarget(api, event.target)
                        if (viewId) {
                            dispatch(activeViewChanged(viewId))
                        }
                    }}
                    onClickCapture={keepCloseFromSelecting}
                >
                    <DockviewReact
                        theme={THEME}
                        components={components}
                        defaultTabComponent={WorkspaceTab}
                        rightHeaderActionsComponent={HeaderActions}
                        watermarkComponent={Watermark}
                        singleTabMode="fullwidth"
                        defaultRenderer="always"
                        dndEdges={getOuterEdgeDropModel()}
                        dropOverlayModel={getDropOverlayModel}
                        getAnnouncement={getWorkspaceAnnouncement}
                        onReady={(event: DockviewReadyEvent) =>
                            setApi(event.api)
                        }
                    />
                    <InsertZones api={api} dragFormats={dragFormats} />
                </div>
            </WorkspacePresetContext.Provider>
        </WorkspaceApiContext.Provider>
    )
}
