import type { ViewSettingsPanelParams } from '@components/workspace/controller/panels'
import { ViewTypeIcon } from '@components/workspace/view-type-icon'
import i18n from '@dhis2/d2-i18n'
import { useAppSelector } from '@hooks'
import { getViewTitle, type ViewType } from '@modules/workspace/view-types'
import { selectViews } from '@store/workspace-slice'
import type { IDockviewPanelProps } from 'dockview-react'
import type { FC } from 'react'
import classes from './styles/panels.module.css'
import { ToolPanel } from './tool-panel'

const SETTINGS_HINTS: Record<ViewType, () => string> = {
    map: () =>
        i18n.t(
            'Choosing a saved map, or creating one with layers, will happen here.'
        ),
    visualization: () =>
        i18n.t(
            'Choosing a saved visualization, or creating one with its data, periods and org units, will happen here.'
        ),
    'period-selector': () =>
        i18n.t('Choosing the periods this selector offers will happen here.'),
    'org-unit-selector': () =>
        i18n.t('Choosing the org units this selector offers will happen here.'),
    'data-selector': () =>
        i18n.t(
            'Choosing the data items this selector offers will happen here.'
        ),
}

export const SettingsPanel: FC<
    IDockviewPanelProps<ViewSettingsPanelParams>
> = ({ api, params }) => {
    const view = useAppSelector(selectViews).find(
        ({ id }) => id === params.viewId
    )

    if (!view) {
        return null
    }

    return (
        <ToolPanel api={api} dataTest={`settings-panel-${view.id}`}>
            <p className={classes.settingsTitle}>
                <ViewTypeIcon type={view.type} />
                {getViewTitle(view.type, view.number)}
            </p>
            <p className={classes.toolHint}>{SETTINGS_HINTS[view.type]()}</p>
            <p className={classes.toolHint}>
                {i18n.t('Links to other views will be set here.')}
            </p>
        </ToolPanel>
    )
}
