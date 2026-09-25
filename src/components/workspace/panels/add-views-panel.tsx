import { useAddView } from '@components/workspace/use-add-view'
import { ViewTypeIcon } from '@components/workspace/view-type-icon'
import { useWorkspaceApi } from '@components/workspace/workspace-api-context'
import i18n from '@dhis2/d2-i18n'
import { Tooltip } from '@dhis2/ui'
import { useAppSelector } from '@hooks'
import { encodeViewDrag, VIEW_DRAG_MIME } from '@modules/workspace/drag-payload'
import { canAddView, MAX_VIEWS } from '@modules/workspace/rules'
import {
    getViewTypeLabel,
    VIEW_TYPES,
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
        event.dataTransfer.effectAllowed = 'copy'
    }

    return (
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
}

export const AddViewsPanel: FC = () => {
    const viewCount = useAppSelector(selectViews).length
    const isFull = !canAddView(viewCount)

    const tiles = (
        <div className={classes.tiles}>
            {VIEW_TYPES.map((type) => (
                <ViewTile key={type} type={type} disabled={isFull} />
            ))}
        </div>
    )

    return (
        <div className={classes.tool}>
            <p className={classes.toolHint}>
                {i18n.t(
                    'Drag a view onto an edge of the grid or of another view, or click to add it next to the selected view. To swap two views, drag one by its tab onto the middle of the other.'
                )}
            </p>
            {isFull ? (
                <Tooltip
                    content={i18n.t('A workspace holds up to {{max}} views', {
                        max: MAX_VIEWS,
                    })}
                >
                    {tiles}
                </Tooltip>
            ) : (
                tiles
            )}
        </div>
    )
}
