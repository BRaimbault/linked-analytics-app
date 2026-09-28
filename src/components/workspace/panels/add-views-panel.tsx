import { startTileDrag } from '@components/workspace/controller/tile-drag'
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
import {
    useCallback,
    useId,
    type DragEvent,
    type FC,
    type HTMLAttributes,
    type MutableRefObject,
    type Ref,
} from 'react'
import classes from './styles/panels.module.css'
import { ToolPanel } from './tool-panel'

type TooltipHandlers = Partial<
    Pick<
        HTMLAttributes<HTMLButtonElement>,
        'onMouseOver' | 'onMouseOut' | 'onFocus' | 'onBlur'
    >
>

/* A tile that can't add its view says why: in a tooltip, and to screen
 * readers as its description. It stays focusable (aria-disabled rather
 * than disabled), so both can reach it; its click and drag do nothing. */
const ViewTile: FC<{ type: ViewType; disabledReason: string | null }> = ({
    type,
    disabledReason,
}) => {
    const api = useWorkspaceApi()
    const addView = useAddView(api)
    const reasonId = useId()
    const disabled = disabledReason !== null

    const onDragStart = (event: DragEvent<HTMLButtonElement>) => {
        if (disabled) {
            event.preventDefault()
            return
        }
        event.dataTransfer.setData(VIEW_DRAG_MIME, encodeViewDrag(type))
        event.dataTransfer.setData(getViewTypeMime(type), '')
        event.dataTransfer.effectAllowed = 'copy'
        startTileDrag(type)
    }

    const renderTile = (
        handlers: TooltipHandlers = {},
        ref?: Ref<HTMLButtonElement>
    ) => (
        <button
            {...handlers}
            ref={ref}
            type="button"
            className={classes.tile}
            data-test={`add-view-${type}`}
            draggable={!disabled}
            aria-disabled={disabled || undefined}
            aria-describedby={disabled ? reasonId : undefined}
            onDragStart={onDragStart}
            onClick={() => {
                if (!disabled) {
                    addView(type)
                }
            }}
        >
            <span className={classes.tileContent}>
                <ViewTypeIcon type={type} />
                {getViewTypeLabel(type)}
            </span>
        </button>
    )

    if (!disabled) {
        return renderTile()
    }
    return (
        <>
            <Tooltip content={disabledReason}>
                {({ ref, ...handlers }) =>
                    renderTile(
                        handlers,
                        ref as MutableRefObject<HTMLButtonElement>
                    )
                }
            </Tooltip>
            <span id={reasonId} hidden>
                {disabledReason}
            </span>
        </>
    )
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
