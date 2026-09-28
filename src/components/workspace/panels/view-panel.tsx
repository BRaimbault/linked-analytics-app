import type { ViewPanelParams } from '@components/workspace/controller/panels'
import { useAppSelector } from '@hooks'
import { getViewKind } from '@modules/workspace/view-types'
import { selectViewHeaders } from '@store/workspace-settings-slice'
import { selectActiveView } from '@store/workspace-slice'
import type { IDockviewPanelProps } from 'dockview-react'
import type { FC } from 'react'
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

    return (
        <div className={classes.viewBody}>
            {getViewKind(props.params.type) === 'text' ? (
                <TextViewPanel {...props} />
            ) : (
                <ViewPlaceholderPanel {...props} />
            )}
            {isFramed && (
                <div
                    className={classes.selectedFrame}
                    data-test="selected-frame"
                />
            )}
        </div>
    )
}
