import {
    usePluginSources,
    type PluginSources,
} from '@components/plugins/plugin-sources'
import type { ViewPanelParams } from '@components/workspace/controller/panels'
import { openSettings } from '@components/workspace/controller/settings'
import { ViewTypeIcon } from '@components/workspace/view-type-icon'
import { useWorkspaceApi } from '@components/workspace/workspace-api-context'
import i18n from '@dhis2/d2-i18n'
import { Button, IconSettings16 } from '@dhis2/ui'
import {
    getViewKind,
    getViewTypeLabel,
    isPluginViewType,
    type ViewType,
} from '@modules/workspace/view-types'
import type { IDockviewPanelProps } from 'dockview-react'
import type { FC } from 'react'
import classes from './styles/panels.module.css'

/* Where saved items are offered (the demo's), a new view's next step */
const getHint = (type: ViewType, savedItems: PluginSources['savedItems']) => {
    if (getViewKind(type) === 'selector') {
        return i18n.t('The picker will render here')
    }
    return isPluginViewType(type) && savedItems[type]?.length
        ? i18n.t('Pick a saved item in its settings')
        : i18n.t('The plugin will render here')
}

export const ViewPlaceholderPanel: FC<IDockviewPanelProps<ViewPanelParams>> = ({
    params,
    api,
}) => {
    const workspaceApi = useWorkspaceApi()
    const { savedItems } = usePluginSources()

    return (
        <div
            className={classes.placeholder}
            data-test="view-placeholder"
            data-view-id={api.id}
        >
            <div className={classes.placeholderContent}>
                <ViewTypeIcon type={params.type} />
                <span className={classes.placeholderType}>
                    {getViewTypeLabel(params.type)}
                </span>
                <span className={classes.placeholderHint}>
                    {getHint(params.type, savedItems)}
                </span>
                <Button
                    small
                    secondary
                    icon={<IconSettings16 />}
                    dataTest="edit-view-settings"
                    onClick={() => {
                        api.setActive()
                        if (workspaceApi) {
                            openSettings(workspaceApi, api.id)
                        }
                    }}
                >
                    {i18n.t('Edit settings')}
                </Button>
            </div>
        </div>
    )
}
