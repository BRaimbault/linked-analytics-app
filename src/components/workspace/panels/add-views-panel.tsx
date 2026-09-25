import { useAddView } from '@components/workspace/use-add-view'
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
import { canAddView, getViewLimitMessage } from '@modules/workspace/rules'
import {
    getViewKind,
    getViewTypeLabel,
    VIEW_TYPES,
    type ViewKind,
    type ViewType,
} from '@modules/workspace/view-types'
import { selectActiveView, selectViews } from '@store/workspace-slice'
import type { DragEvent, FC } from 'react'
import classes from './styles/panels.module.css'

const ViewTile: FC<{ type: ViewType; disabled: boolean }> = ({
    type,
    disabled,
}) => {
    const api = useWorkspaceApi()
    const activeViewId = useAppSelector(selectActiveView)?.id ?? null
    const addView = useAddView(api, activeViewId)

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

    return disabled ? (
        <Tooltip content={getViewLimitMessage(type)}>{tile}</Tooltip>
    ) : (
        tile
    )
}

const TILE_GROUPS: { kind: ViewKind; heading: () => string }[] = [
    { kind: 'plugin', heading: () => i18n.t('Analytics') },
    { kind: 'selector', heading: () => i18n.t('Selectors') },
]

export const AddViewsPanel: FC = () => {
    const views = useAppSelector(selectViews)

    return (
        <div className={classes.tool}>
            <div className={classes.tileGroups}>
                {TILE_GROUPS.map(({ kind, heading }) => (
                    <section
                        key={kind}
                        className={classes.tileGroup}
                        aria-label={heading()}
                        data-test={`add-views-${kind}s`}
                    >
                        <h3 className={classes.tileGroupHeading}>
                            {heading()}
                        </h3>
                        <div className={classes.tiles}>
                            {VIEW_TYPES.filter(
                                (type) => getViewKind(type) === kind
                            ).map((type) => (
                                <ViewTile
                                    key={type}
                                    type={type}
                                    disabled={!canAddView(type, views)}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
}
