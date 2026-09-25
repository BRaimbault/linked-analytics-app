import { HeaderActions } from '@components/workspace/header-actions'
import { InsertZones } from '@components/workspace/insert-zones'
import { AddViewsPanel } from '@components/workspace/panels/add-views-panel'
import { SettingsPanel } from '@components/workspace/panels/settings-panel'
import { ViewPlaceholderPanel } from '@components/workspace/panels/view-placeholder-panel'
import { useCurrentDrag } from '@components/workspace/use-current-drag'
import { Watermark } from '@components/workspace/watermark'
import { WorkspaceApiContext } from '@components/workspace/workspace-api-context'
import {
    ADD_VIEWS_PANEL_ID,
    getWorkspaceAnnouncement,
    setupWorkspace,
    SWAP_SPACER_COMPONENT,
    SwapSpacer,
    showSettingsForTarget,
    VIEW_COMPONENT,
    VIEW_SETTINGS_COMPONENT,
} from '@components/workspace/workspace-controller'
import { WorkspaceTab } from '@components/workspace/workspace-tab'
import i18n from '@dhis2/d2-i18n'
import { useAppDispatch } from '@hooks'
import {
    DockviewReact,
    themeLight,
    type DockviewApi,
    type DockviewReadyEvent,
    type DroptargetOverlayModel,
    type DropOverlayModelParams,
} from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import { useEffect, useState, type FC } from 'react'
import classes from './styles/workspace.module.css'

/* dockview's defaults are a 10px band at the outer edges and 20% per side
 * within a cell, which leaves most of a cell to swapping. Wider bands make
 * adding or moving a view to an edge easy to hit; the middle third of a
 * cell still swaps. */
const OUTER_EDGE_DROP_MODEL: DroptargetOverlayModel = {
    activationSize: { type: 'pixels', value: 48 },
    size: { type: 'percentage', value: 25 },
}

/* The outer edges are InsertZones, like the lines between views, but those
 * only take mouse drags. On a touch screen dockview drags with pointer
 * events (it checks the same media queries), so its own outer edges stay. */
export const getOuterEdgeDropModel = (): DroptargetOverlayModel | false =>
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(pointer: fine)').matches &&
    OUTER_EDGE_DROP_MODEL
const CELL_DROP_MODEL: DroptargetOverlayModel = {
    activationSize: { type: 'percentage', value: 33 },
}
const getDropOverlayModel = ({ location }: DropOverlayModelParams) =>
    location === 'content' ? CELL_DROP_MODEL : undefined

/* Defined once: a new object on every render makes dockview reconfigure */
const components = {
    [VIEW_COMPONENT]: ViewPlaceholderPanel,
    [ADD_VIEWS_PANEL_ID]: AddViewsPanel,
    [VIEW_SETTINGS_COMPONENT]: SettingsPanel,
    [SWAP_SPACER_COMPONENT]: SwapSpacer,
}

export const Workspace: FC = () => {
    const dispatch = useAppDispatch()
    const [api, setApi] = useState<DockviewApi | null>(null)
    const dragFormats = useCurrentDrag()

    useEffect(() => {
        if (!api) {
            return
        }
        return setupWorkspace(api, dispatch, {
            addViews: i18n.t('Add views'),
            viewSettings: (viewTitle) =>
                i18n.t('{{title}} settings', {
                    title: viewTitle,
                    interpolation: { escapeValue: false },
                }),
        })
    }, [api, dispatch])

    return (
        <WorkspaceApiContext.Provider value={api}>
            <div
                className={classes.workspace}
                data-test="workspace"
                data-dragging={dragFormats ? true : undefined}
                onPointerDownCapture={(event) =>
                    api && showSettingsForTarget(api, event.target)
                }
            >
                <DockviewReact
                    theme={themeLight}
                    components={components}
                    defaultTabComponent={WorkspaceTab}
                    rightHeaderActionsComponent={HeaderActions}
                    watermarkComponent={Watermark}
                    singleTabMode="fullwidth"
                    defaultRenderer="always"
                    dndEdges={getOuterEdgeDropModel()}
                    dropOverlayModel={getDropOverlayModel}
                    getAnnouncement={getWorkspaceAnnouncement}
                    onReady={(event: DockviewReadyEvent) => setApi(event.api)}
                />
                <InsertZones api={api} dragFormats={dragFormats} />
            </div>
        </WorkspaceApiContext.Provider>
    )
}
