import { HeaderActions } from '@components/workspace/header-actions'
import { AddViewsPanel } from '@components/workspace/panels/add-views-panel'
import { InteractionsPanel } from '@components/workspace/panels/interactions-panel'
import { SettingsPanel } from '@components/workspace/panels/settings-panel'
import { ViewPlaceholderPanel } from '@components/workspace/panels/view-placeholder-panel'
import { useIsDragging } from '@components/workspace/use-is-dragging'
import { Watermark } from '@components/workspace/watermark'
import { WorkspaceApiContext } from '@components/workspace/workspace-api-context'
import {
    ADD_VIEWS_PANEL_ID,
    INTERACTIONS_PANEL_ID,
    getWorkspaceAnnouncement,
    setupWorkspace,
    SWAP_SPACER_COMPONENT,
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
    [INTERACTIONS_PANEL_ID]: InteractionsPanel,
    [SWAP_SPACER_COMPONENT]: () => null,
}

export const Workspace: FC = () => {
    const dispatch = useAppDispatch()
    const [api, setApi] = useState<DockviewApi | null>(null)
    const isDragging = useIsDragging()

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
            interactions: i18n.t('Interactions'),
        })
    }, [api, dispatch])

    return (
        <WorkspaceApiContext.Provider value={api}>
            <div
                className={classes.workspace}
                data-test="workspace"
                data-dragging={isDragging || undefined}
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
                    dndEdges={OUTER_EDGE_DROP_MODEL}
                    dropOverlayModel={getDropOverlayModel}
                    getAnnouncement={getWorkspaceAnnouncement}
                    onReady={(event: DockviewReadyEvent) => setApi(event.api)}
                />
            </div>
        </WorkspaceApiContext.Provider>
    )
}
