import { ChannelBadges } from '@components/interactions/channel-badges'
import { useDrillActions } from '@components/interactions/use-drill-actions'
import {
    getEdgePlacements,
    moveViewToEdge,
    type EdgePlacement,
} from '@components/workspace/controller/move-to-edge'
import { hasRoomToSwap } from '@components/workspace/controller/room'
import { swapViewsById } from '@components/workspace/controller/swap-views'
import { focusViewTab } from '@components/workspace/controller/views'
import { useDockviewValue } from '@components/workspace/use-dockview-value'
import i18n from '@dhis2/d2-i18n'
import { IconFullscreen16, IconFullscreenExit16 } from '@dhis2/ui'
import { useAppDispatch, useAppSelector } from '@hooks'
import { getViewTitle } from '@modules/workspace/view-types'
import { activeViewChanged, selectViews } from '@store/workspace-slice'
import type {
    DockviewApi,
    IDockviewHeaderActionsProps,
    IDockviewPanel,
} from 'dockview-react'
import { useCallback, type FC } from 'react'
import { ActionsMenu } from './actions-menu'
import { IconButton } from './icon-button'
import classes from './styles/tabs.module.css'

const EDGE_LABELS: Record<EdgePlacement, () => string> = {
    top: () => i18n.t('Move to a new row at the top'),
    bottom: () => i18n.t('Move to a new row at the bottom'),
    left: () => i18n.t('Move to a new column on the left'),
    right: () => i18n.t('Move to a new column on the right'),
}

/* What the menu offers, read again whenever the layout changes: swaps where
 * each view fits the other's cell, and new lines at the grid's edges with
 * room for the view. Kept as text, so an unchanged offer keeps its value. */
const useViewMoves = (api: DockviewApi, view: IDockviewPanel) => {
    const views = useAppSelector(selectViews)
    const offer = useDockviewValue(
        useCallback(() => {
            const swapIds = views
                .filter(({ id }) => {
                    const target = api.getPanel(id)
                    return (
                        id !== view.id &&
                        target !== undefined &&
                        hasRoomToSwap(view, target)
                    )
                })
                .map(({ id }) => id)
            return JSON.stringify({
                swapIds,
                edges: getEdgePlacements(api, view),
            })
        }, [api, view, views]),
        useCallback((listener) => api.onDidLayoutChange(listener), [api])
    )
    const { swapIds, edges } = JSON.parse(offer) as {
        swapIds: string[]
        edges: EdgePlacement[]
    }
    return {
        swapTargets: views.filter(({ id }) => swapIds.includes(id)),
        edges,
    }
}

/* Moving a view by dragging needs a pointer; the menu does the same from
 * the keyboard: swaps, and new rows and columns at the grid's edges. Focus
 * follows the view to its tab in its new cell. */
const ViewMenu: FC<{ api: DockviewApi; view: IDockviewPanel }> = ({
    api,
    view,
}) => {
    const dispatch = useAppDispatch()
    const { swapTargets, edges } = useViewMoves(api, view)
    const drills = useDrillActions(view.id)

    const swaps = swapTargets.map((target) => ({
        key: target.id,
        label: i18n.t('Swap with {{title}}', {
            title: getViewTitle(target.type, target.number),
            interpolation: { escapeValue: false },
        }),
        dataTest: `swap-with-${target.id}`,
        onClick: () => {
            const selected = swapViewsById(api, view.id, target.id)
            if (selected) {
                dispatch(activeViewChanged(selected))
            }
            focusViewTab(api, view.id)
        },
    }))
    const moves = edges.map((position) => ({
        key: `edge-${position}`,
        label: EDGE_LABELS[position](),
        dataTest: `move-to-edge-${position}`,
        onClick: () => {
            moveViewToEdge(api, view, position)
            focusViewTab(api, view.id)
        },
    }))

    const actions = [...drills, ...swaps, ...moves]
    if (!actions.length) {
        return null
    }

    return (
        <ActionsMenu
            label={i18n.t('View actions')}
            dataTest="view-actions-button"
            actions={actions}
        />
    )
}

export const ViewActions: FC<IDockviewHeaderActionsProps> = ({
    api,
    containerApi,
    activePanel,
}) => {
    const isMaximized = useDockviewValue(
        useCallback(() => api.isMaximized(), [api]),
        useCallback(
            (listener) => containerApi.onDidMaximizedGroupChange(listener),
            [containerApi]
        )
    )

    return (
        <div className={classes.headerActions}>
            {activePanel && <ChannelBadges viewId={activePanel.id} />}
            {activePanel && !isMaximized && (
                <ViewMenu api={containerApi} view={activePanel} />
            )}
            <IconButton
                label={isMaximized ? i18n.t('Restore') : i18n.t('Maximize')}
                icon={
                    isMaximized ? (
                        <IconFullscreenExit16 />
                    ) : (
                        <IconFullscreen16 />
                    )
                }
                dataTest="maximize-view-button"
                onClick={() =>
                    isMaximized ? api.exitMaximized() : api.maximize()
                }
            />
        </div>
    )
}
