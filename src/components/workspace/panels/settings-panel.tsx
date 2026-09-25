import { ViewTypeIcon } from '@components/workspace/view-type-icon'
import type { ViewSettingsPanelParams } from '@components/workspace/workspace-controller'
import i18n from '@dhis2/d2-i18n'
import { useAppSelector } from '@hooks'
import { getViewTitle } from '@modules/workspace/view-types'
import { selectViews } from '@store/workspace-slice'
import type { IDockviewPanelProps } from 'dockview-react'
import type { FC } from 'react'
import classes from './styles/panels.module.css'

export const SettingsPanel: FC<
    IDockviewPanelProps<ViewSettingsPanelParams>
> = ({ params }) => {
    const view = useAppSelector(selectViews).find(
        ({ id }) => id === params.viewId
    )

    if (!view) {
        return null
    }

    return (
        <div className={classes.tool} data-test={`settings-panel-${view.id}`}>
            <p className={classes.settingsTitle}>
                <ViewTypeIcon type={view.type} />
                {getViewTitle(view.type, view.number)}
            </p>
            <p className={classes.toolHint}>
                {view.type === 'map'
                    ? i18n.t(
                          'Choosing a saved map, or creating one with layers, will happen here.'
                      )
                    : i18n.t(
                          'Choosing a saved visualization, or creating one with its data, periods and org units, will happen here.'
                      )}
            </p>
        </div>
    )
}
