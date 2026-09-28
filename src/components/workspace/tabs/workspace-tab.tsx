import {
    getEdgePosition,
    getSettingsViewId,
    isViewPanel,
    isViewSettingsPanel,
} from '@components/workspace/controller/panels'
import { openSettings } from '@components/workspace/controller/settings'
import { closeView } from '@components/workspace/controller/views'
import { getTabIcon, IconTab } from '@components/workspace/tabs/icon-tab'
import { TabNameTooltip } from '@components/workspace/tabs/tab-name-tooltip'
import { useDockviewValue } from '@components/workspace/use-dockview-value'
import { useAppSelector } from '@hooks'
import { selectActiveView } from '@store/workspace-slice'
import {
    DockviewDefaultTab,
    type IDockviewPanelHeaderProps,
} from 'dockview-react'
import { useCallback, type FC } from 'react'

/* Views can be closed from their tab, or from their settings tab, which
 * closes the view with it; "Add views" is always there.
 * The selected view is marked from the store, because dockview's own
 * active group moves to the tools strip whenever it is clicked. The mark is
 * a data attribute, since DockviewDefaultTab overrides className. */
export const WorkspaceTab: FC<IDockviewPanelHeaderProps> = (props) => {
    const isView = isViewPanel(props)
    const isSettings = isViewSettingsPanel(props)
    const isSelected =
        useAppSelector(selectActiveView)?.id === props.api.id && isView

    const icon = getTabIcon(props.api.id)
    const tab = icon ? (
        <IconTab icon={icon} title={props.api.title} />
    ) : (
        <DockviewDefaultTab
            {...props}
            hideClose={!isView && !isSettings}
            closeActionOverride={
                isSettings
                    ? () =>
                          closeView(
                              props.containerApi,
                              getSettingsViewId(props)
                          )
                    : undefined
            }
            /* A double click on a view's header opens its settings,
             * expanding a collapsed tools strip */
            onDoubleClick={
                isView
                    ? () => openSettings(props.containerApi, props.api.id)
                    : undefined
            }
            data-selected={isSelected || undefined}
            data-test={isSelected ? 'selected-view-tab' : undefined}
        />
    )

    /* Moving the tools strip moves its tabs to another group */
    const toolsEdge = useDockviewValue(
        useCallback(() => getEdgePosition(props.api.group), [props.api]),
        useCallback(
            (listener) => props.api.onDidGroupChange(listener),
            [props.api]
        )
    )
    return toolsEdge ? (
        <TabNameTooltip name={props.api.title} edge={toolsEdge}>
            {tab}
        </TabNameTooltip>
    ) : (
        tab
    )
}
