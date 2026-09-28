import { useAddView } from '@components/workspace/use-add-view'
import { useDockviewValue } from '@components/workspace/use-dockview-value'
import { ViewTypeIcon } from '@components/workspace/view-type-icon'
import { useWorkspaceApi } from '@components/workspace/workspace-api-context'
import i18n from '@dhis2/d2-i18n'
import { Tooltip } from '@dhis2/ui'
import { useAppSelector } from '@hooks'
import {
    encodeViewDrag,
    getViewTypeMime,
    VIEW_DRAG_MIME,
} from '@modules/workspace/drag-payload'
import { canAddView, getViewLimitMessage } from '@modules/workspace/view-limits'
import {
    getViewKind,
    getViewTypeLabel,
    VIEW_TYPES,
    type ViewKind,
    type ViewType,
} from '@modules/workspace/view-types'
import { selectViews } from '@store/workspace-slice'
import type { IDockviewPanelProps } from 'dockview-react'
import { useCallback, type DragEvent, type FC } from 'react'
import classes from './styles/panels.module.css'
import { ToolPanel } from './tool-panel'

/* A tile that can't add its view says why in its tooltip */
const ViewTile: FC<{ type: ViewType; disabledReason: string | null }> = ({
    type,
    disabledReason,
}) => {
    const api = useWorkspaceApi()
    const addView = useAddView(api)
    const disabled = disabledReason !== null

    const onDragStart = (event: DragEvent<HTMLButtonElement>) => {
        event.dataTransfer.setData(VIEW_DRAG_MIME, encodeViewDrag(type))
        event.dataTransfer.setData(getViewTypeMime(type), '')
        event.dataTransfer.effectAllowed = 'copy'
    }

    const tile = (
        <button
            type="button"
            className={classes.tile}
            data-test={`add-view-${type}`}
            draggable={!disabled}
            disabled={disabled}
            onDragStart={onDragStart}
            onClick={() => addView(type)}
        >
            <ViewTypeIcon type={type} />
            {getViewTypeLabel(type)}
        </button>
    )

    return disabled ? <Tooltip content={disabledReason}>{tile}</Tooltip> : tile
}

const TILE_GROUPS: { kind: ViewKind; heading: () => string }[] = [
    { kind: 'plugin', heading: () => i18n.t('Analytics') },
    { kind: 'selector', heading: () => i18n.t('Selectors') },
    { kind: 'text', heading: () => i18n.t('Notes') },
]

/* A maximized view hides the grid: a new view would land out of sight */
const useIsViewMaximized = (): boolean => {
    const api = useWorkspaceApi()
    return useDockviewValue(
        useCallback(() => api?.hasMaximizedGroup() ?? false, [api]),
        useCallback(
            (listener: () => void) =>
                api?.onDidMaximizedGroupChange(listener) ?? {
                    dispose: () => {},
                },
            [api]
        )
    )
}

export const AddViewsPanel: FC<IDockviewPanelProps> = ({ api }) => {
    const views = useAppSelector(selectViews)
    const isViewMaximized = useIsViewMaximized()
    const getDisabledReason = (type: ViewType): string | null => {
        if (isViewMaximized) {
            return i18n.t('Restore the maximized view to add another')
        }
        return canAddView(type, views) ? null : getViewLimitMessage(type, views)
    }

    return (
        <ToolPanel api={api}>
            <div className={classes.tileGroups}>
                {TILE_GROUPS.map(({ kind, heading }) => (
                    <section
                        key={kind}
                        className={classes.tileGroup}
                        aria-label={heading()}
                        data-test={`add-views-${kind}s`}
                    >
                        <h2 className={classes.tileGroupHeading}>
                            {heading()}
                        </h2>
                        <div className={classes.tiles}>
                            {VIEW_TYPES.filter(
                                (type) => getViewKind(type) === kind
                            ).map((type) => (
                                <ViewTile
                                    key={type}
                                    type={type}
                                    disabledReason={getDisabledReason(type)}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </ToolPanel>
    )
}
