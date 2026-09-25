import { useAddView } from '@components/workspace/use-add-view'
import { ViewTypeIcon } from '@components/workspace/view-type-icon'
import {
    canDropOnEmptyGrid,
    dropOnEmptyGrid,
} from '@components/workspace/workspace-controller'
import i18n from '@dhis2/d2-i18n'
import { Button } from '@dhis2/ui'
import { MAX_PLUGIN_VIEWS } from '@modules/workspace/rules'
import { PLUGIN_VIEW_TYPES } from '@modules/workspace/view-types'
import type { IWatermarkPanelProps } from 'dockview-react'
import { useState, type DragEvent, type FC } from 'react'
import classes from './styles/workspace.module.css'

const ADD_LABELS: Record<(typeof PLUGIN_VIEW_TYPES)[number], () => string> = {
    map: () => i18n.t('Add a map'),
    visualization: () => i18n.t('Add a visualization'),
}

/* The buttons keep an empty grid usable while the tools strip is collapsed.
 * The whole message takes a view dragged from the palette. */
export const Watermark: FC<IWatermarkPanelProps> = ({ containerApi }) => {
    const addView = useAddView(containerApi)
    const [isDropTarget, setIsDropTarget] = useState(false)

    const onDragOver = (event: DragEvent) => {
        if (canDropOnEmptyGrid(containerApi, event.dataTransfer)) {
            event.preventDefault()
            setIsDropTarget(true)
        }
    }

    return (
        <div
            className={classes.watermark}
            data-test="workspace-watermark"
            data-drop-target={isDropTarget || undefined}
            onDragEnter={onDragOver}
            onDragOver={onDragOver}
            onDragLeave={(event) => {
                if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                    setIsDropTarget(false)
                }
            }}
            onDrop={(event) => {
                event.preventDefault()
                setIsDropTarget(false)
                dropOnEmptyGrid(containerApi, event.dataTransfer)
            }}
        >
            <p className={classes.watermarkTitle}>
                {i18n.t('Drag a map or visualization here')}
            </p>
            <p>
                {i18n.t(
                    'Views tile side by side, with up to {{max}} maps and visualizations at a time.',
                    { max: MAX_PLUGIN_VIEWS }
                )}
            </p>
            <div className={classes.watermarkActions}>
                {PLUGIN_VIEW_TYPES.map((type) => (
                    <Button
                        key={type}
                        small
                        secondary
                        icon={<ViewTypeIcon type={type} />}
                        dataTest={`watermark-add-${type}`}
                        onClick={() => addView(type)}
                    >
                        {ADD_LABELS[type]()}
                    </Button>
                ))}
            </div>
        </div>
    )
}
