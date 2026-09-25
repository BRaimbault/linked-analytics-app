import { useAddView } from '@components/workspace/use-add-view'
import { ViewTypeIcon } from '@components/workspace/view-type-icon'
import i18n from '@dhis2/d2-i18n'
import { Button } from '@dhis2/ui'
import { MAX_VIEWS } from '@modules/workspace/rules'
import { VIEW_TYPES } from '@modules/workspace/view-types'
import type { IWatermarkPanelProps } from 'dockview-react'
import type { FC } from 'react'
import classes from './styles/workspace.module.css'

const ADD_LABELS = {
    map: () => i18n.t('Add a map'),
    visualization: () => i18n.t('Add a visualization'),
}

/* The buttons keep an empty grid usable while the tools strip is collapsed */
export const Watermark: FC<IWatermarkPanelProps> = ({ containerApi }) => {
    const addView = useAddView(containerApi)

    return (
        <div className={classes.watermark} data-test="workspace-watermark">
            <p className={classes.watermarkTitle}>
                {i18n.t('Drag a map or visualization here')}
            </p>
            <p>
                {i18n.t('Views tile side by side, up to {{max}} at a time.', {
                    max: MAX_VIEWS,
                })}
            </p>
            <div className={classes.watermarkActions}>
                {VIEW_TYPES.map((type) => (
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
