import { evenOutSizes } from '@components/workspace/controller/grid-layout'
import { useWorkspaceApi } from '@components/workspace/workspace-api-context'
import i18n from '@dhis2/d2-i18n'
import { Button, IconLayoutColumns16, Switch } from '@dhis2/ui'
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
    const canEvenOut = views.length >= 2
    const evenOutLabel = i18n.t('Even out view sizes')
    const evenOut = () => workspaceApi && evenOutSizes(workspaceApi)

    return (
        <ToolPanel api={api} dataTest="workspace-panel">
            {/* Laid out like the palette: groups side by side, each a
             * heading over its settings */}
            <div className={classes.tileGroups}>
                <section
                    className={`${classes.tileGroup} ${classes.settingGroup}`}
                    aria-labelledby="workspace-layout-heading"
                >
                    <h2
                        id="workspace-layout-heading"
                        className={classes.tileGroupHeading}
                    >
                        {i18n.t('Layout')}
                    </h2>
                    <div className={classes.settingControl}>
                        {/* Icon only, its name beside it, like the switch
                         * below; the name is read once, on the button */}
                        <span className={classes.settingControlBox}>
                            <Button
                                small
                                secondary
                                icon={<IconLayoutColumns16 />}
                                aria-label={evenOutLabel}
                                dataTest="even-out-sizes"
                                disabled={!canEvenOut}
                                onClick={evenOut}
                            />
                        </span>
                        <span
                            className={classes.settingLabel}
                            aria-hidden="true"
                            data-disabled={!canEvenOut || undefined}
                            onClick={canEvenOut ? evenOut : undefined}
                        >
                            {evenOutLabel}
                        </span>
                    </div>
                    <div className={classes.settingControl}>
                        <Switch
                            dataTest="view-headers-on-hover"
                            label={i18n.t('Show view headers only on hover')}
                            checked={viewHeaders === 'hover'}
                            onChange={({ checked }) =>
                                dispatch(
                                    viewHeadersChanged(
                                        checked ? 'hover' : 'always'
                                    )
                                )
                            }
                        />
                    </div>
                </section>
            </div>
        </ToolPanel>
    )
}
