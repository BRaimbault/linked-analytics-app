import { usePluginSources } from '@components/plugins/plugin-sources'
import type { ViewPanelParams } from '@components/workspace/controller/panels'
import { useAppSelector } from '@hooks'
import { SELECTOR_DIMENSIONS } from '@modules/interactions/channels'
import { getViewKind, isPluginViewType } from '@modules/workspace/view-types'
import { selectViewHeaders } from '@store/workspace-settings-slice'
import { selectActiveView } from '@store/workspace-slice'
import type { IDockviewPanelProps } from 'dockview-react'
import type { FC } from 'react'
import { PluginPanel } from './plugin-panel'
import { SelectorPanel } from './selector-panel'
import classes from './styles/view-panel.module.css'
import { TextViewPanel } from './text-view-panel'
import { ViewPlaceholderPanel } from './view-placeholder-panel'

/* Every view is one dockview component; its body depends on its kind.
 * While headers only show on hover, the selected view keeps its tab's blue
 * top line, drawn over its body, which covers the whole cell then
 * (dockview's own cell is drawn under the body, and forces no outline). */
export const ViewPanel: FC<IDockviewPanelProps<ViewPanelParams>> = (props) => {
    const viewHeaders = useAppSelector(selectViewHeaders)
    const selectedViewId = useAppSelector(selectActiveView)?.id
    const isFramed = viewHeaders === 'hover' && selectedViewId === props.api.id

    const { renderers, selectorItems } = usePluginSources()
    const { type, object } = props.params
    const pluginType = isPluginViewType(type) && renderers[type] ? type : null
    const selectorDimension = SELECTOR_DIMENSIONS[type]
    const selectorList = selectorDimension && selectorItems[selectorDimension]

    const getBody = () => {
        if (getViewKind(type) === 'text') {
            return <TextViewPanel {...props} />
        }
        if (selectorList) {
            return <SelectorPanel viewId={props.api.id} items={selectorList} />
        }
        return pluginType && object ? (
            <PluginPanel
                viewId={props.api.id}
                type={pluginType}
                object={object}
            />
        ) : (
            <ViewPlaceholderPanel {...props} />
        )
    }

    return (
        <div className={classes.viewBody}>
            {getBody()}
            {isFramed && (
                <div
                    className={classes.selectedFrame}
                    data-test="selected-frame"
                />
            )}
        </div>
    )
}
