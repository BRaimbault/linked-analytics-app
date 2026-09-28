import { evenOutSizes } from '@components/workspace/controller/grid-layout'
import { useWorkspaceApi } from '@components/workspace/workspace-api-context'
import i18n from '@dhis2/d2-i18n'
import { Button, Switch } from '@dhis2/ui'
import { useAppDispatch, useAppSelector } from '@hooks'
import {
    selectViewHeaders,
    viewHeadersChanged,
} from '@store/workspace-settings-slice'
import { selectViews } from '@store/workspace-slice'
import type { IDockviewPanelProps } from 'dockview-react'
import type { FC } from 'react'
import classes from './styles/panels.module.css'
import { ToolPanel } from './tool-panel'

/* Settings of the whole workspace, rather than of one view */
export const WorkspacePanel: FC<IDockviewPanelProps> = ({ api }) => {
    const workspaceApi = useWorkspaceApi()
    const views = useAppSelector(selectViews)
    const viewHeaders = useAppSelector(selectViewHeaders)
    const dispatch = useAppDispatch()

    return (
        <ToolPanel api={api} dataTest="workspace-panel">
            <section
                className={classes.toolSection}
                aria-labelledby="workspace-layout-heading"
            >
                <h2
                    id="workspace-layout-heading"
                    className={classes.tileGroupHeading}
                >
                    {i18n.t('Layout')}
                </h2>
                <div className={classes.toolSectionRow}>
                    <Button
                        small
                        secondary
                        dataTest="even-out-sizes"
                        disabled={views.length < 2}
                        onClick={() =>
                            workspaceApi && evenOutSizes(workspaceApi)
                        }
                    >
                        {i18n.t('Even out sizes')}
                    </Button>
                    <span className={classes.placeholderHint}>
                        {i18n.t(
                            'Gives maps and visualizations the same size, and selectors their usual size.'
                        )}
                    </span>
                </div>
            </section>
            <section
                className={classes.toolSection}
                aria-labelledby="workspace-views-heading"
            >
                <h2
                    id="workspace-views-heading"
                    className={classes.tileGroupHeading}
                >
                    {i18n.t('Views')}
                </h2>
                <Switch
                    dense
                    dataTest="view-headers-on-hover"
                    label={i18n.t('Show view headers only on hover')}
                    checked={viewHeaders === 'hover'}
                    onChange={({ checked }) =>
                        dispatch(
                            viewHeadersChanged(checked ? 'hover' : 'always')
                        )
                    }
                />
            </section>
        </ToolPanel>
    )
}
