import {
    closeView,
    VIEW_COMPONENT,
    VIEW_SETTINGS_COMPONENT,
    type ViewSettingsPanelParams,
} from '@components/workspace/workspace-controller'
import { useAppSelector } from '@hooks'
import { selectActiveView } from '@store/workspace-slice'
import {
    DockviewDefaultTab,
    type IDockviewPanelHeaderProps,
} from 'dockview-react'
import type { FC } from 'react'

/* Views can be closed from their tab, or from their settings tab, which
 * closes the view with it; "Add views" is always there.
 * The selected view is marked from the store, because dockview's own
 * active group moves to the tools strip whenever it is clicked. The mark is
 * a data attribute, since DockviewDefaultTab overrides className. */
export const WorkspaceTab: FC<IDockviewPanelHeaderProps> = (props) => {
    const isView = props.api.component === VIEW_COMPONENT
    const isSettings = props.api.component === VIEW_SETTINGS_COMPONENT
    const isSelected =
        useAppSelector(selectActiveView)?.id === props.api.id && isView

    return (
        <DockviewDefaultTab
            {...props}
            hideClose={!isView && !isSettings}
            closeActionOverride={
                isSettings
                    ? () =>
                          closeView(
                              props.containerApi,
                              (props.params as ViewSettingsPanelParams).viewId
                          )
                    : undefined
            }
            data-selected={isSelected || undefined}
            data-test={isSelected ? 'selected-view-tab' : undefined}
        />
    )
}
