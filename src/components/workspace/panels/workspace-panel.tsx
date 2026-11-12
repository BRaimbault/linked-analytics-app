import { evenOutSizes } from '@components/workspace/controller/grid-layout'
import {
    markPresetLoaded,
    resetToPreset,
} from '@components/workspace/controller/preset'
import { useWorkspaceApi } from '@components/workspace/workspace-api-context'
import {
    applyPresetSettings,
    useWorkspacePreset,
} from '@components/workspace/workspace-preset'
import i18n from '@dhis2/d2-i18n'
import { Button, Checkbox, IconLayoutColumns16, IconSync16 } from '@dhis2/ui'
import { useAppDispatch, useAppSelector, useAppStore } from '@hooks'
import {
    selectViewHeaders,
    selectViewHeadersHidden,
    viewHeadersChanged,
    viewHeadersHiddenChanged,
} from '@store/workspace-settings-slice'
import { selectViews } from '@store/workspace-slice'
import type { DockviewApi, IDockviewPanelProps } from 'dockview-react'
import type { FC } from 'react'
import classes from './styles/panels.module.css'
import { ToolPanel } from './tool-panel'

/* Settings of the whole workspace, rather than of one view */
export const WorkspacePanel: FC<IDockviewPanelProps> = ({ api }) => {
    const workspaceApi = useWorkspaceApi()
    const views = useAppSelector(selectViews)
    const viewHeaders = useAppSelector(selectViewHeaders)
    const viewHeadersHidden = useAppSelector(selectViewHeadersHidden)
    const dispatch = useAppDispatch()
    const store = useAppStore()
    const canEvenOut = views.length >= 2
    const evenOutLabel = i18n.t('Even out view sizes')
    const evenOut = () => workspaceApi && evenOutSizes(workspaceApi)
    const preset = useWorkspacePreset()

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
                        {/* Icon only, its name beside it, like the checkbox
                         * below; the name is read once, on the button. It
                         * is the button's label: pressing it presses the
                         * button, which shows it, like a checkbox's label. */}
                        <Button
                            small
                            secondary
                            icon={<IconLayoutColumns16 />}
                            id="workspace-even-out"
                            aria-label={evenOutLabel}
                            dataTest="even-out-sizes"
                            disabled={!canEvenOut}
                            onClick={evenOut}
                        />
                        <label
                            htmlFor="workspace-even-out"
                            className={classes.settingLabel}
                            aria-hidden="true"
                            data-disabled={!canEvenOut || undefined}
                        >
                            {evenOutLabel}
                        </label>
                    </div>
                    <div className={classes.settingControl}>
                        <Checkbox
                            dataTest="view-headers-hidden"
                            label={i18n.t('Hide view headers')}
                            checked={viewHeadersHidden}
                            onChange={({ checked }) =>
                                dispatch(viewHeadersHiddenChanged(checked))
                            }
                        />
                    </div>
                    <div className={classes.settingControl}>
                        {/* Kept while headers are hidden, for when they show */}
                        <Checkbox
                            dataTest="view-headers-on-hover"
                            label={i18n.t('Show view headers only on hover')}
                            disabled={viewHeadersHidden}
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
                {preset && (
                    <section
                        className={`${classes.tileGroup} ${classes.settingGroup}`}
                        aria-labelledby="workspace-preset-heading"
                    >
                        <h2
                            id="workspace-preset-heading"
                            className={classes.tileGroupHeading}
                        >
                            {preset.name()}
                        </h2>
                        <div className={classes.settingControl}>
                            {/* Named like "Even out view sizes" */}
                            <Button
                                small
                                secondary
                                icon={<IconSync16 />}
                                id="workspace-reset-to-preset"
                                aria-label={preset.resetLabel()}
                                dataTest="reset-to-preset"
                                onClick={() => {
                                    /* The tab shows once the grid is set up */
                                    const api = workspaceApi as DockviewApi
                                    applyPresetSettings(dispatch, preset)
                                    resetToPreset(api, preset.load, dispatch)
                                    markPresetLoaded(api, store.getState())
                                }}
                            />
                            <label
                                htmlFor="workspace-reset-to-preset"
                                className={classes.settingLabel}
                                aria-hidden="true"
                            >
                                {preset.resetLabel()}
                            </label>
                        </div>
                    </section>
                )}
            </div>
        </ToolPanel>
    )
}
