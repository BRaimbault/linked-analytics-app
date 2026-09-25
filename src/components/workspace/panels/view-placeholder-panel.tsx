import { ViewTypeIcon } from '@components/workspace/view-type-icon'
import { useWorkspaceApi } from '@components/workspace/workspace-api-context'
import {
    openSettings,
    type ViewPanelParams,
} from '@components/workspace/workspace-controller'
import i18n from '@dhis2/d2-i18n'
import { Button, IconSettings16 } from '@dhis2/ui'
import { getViewKind, getViewTypeLabel } from '@modules/workspace/view-types'
import type { IDockviewPanelProps } from 'dockview-react'
import type { FC } from 'react'
import classes from './styles/panels.module.css'

export const ViewPlaceholderPanel: FC<IDockviewPanelProps<ViewPanelParams>> = ({
    params,
    api,
}) => {
    const workspaceApi = useWorkspaceApi()

    return (
        <div
            className={classes.placeholder}
            data-test="view-placeholder"
            data-view-id={api.id}
        >
            <ViewTypeIcon type={params.type} />
            <span className={classes.placeholderType}>
                {getViewTypeLabel(params.type)}
            </span>
            <span className={classes.placeholderHint}>
                {getViewKind(params.type) === 'selector'
                    ? i18n.t('The picker will render here')
                    : i18n.t('The plugin will render here')}
            </span>
            <div className={classes.placeholderActions}>
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
