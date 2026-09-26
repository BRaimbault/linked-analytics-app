import { getEdgePosition } from '@components/workspace/controller/panels'
import type { IDockviewHeaderActionsProps } from 'dockview-react'
import type { FC } from 'react'
import { ToolActions } from './tool-actions'
import { ViewActions } from './view-actions'

/* The buttons at the end of a tab bar: the tools strip's, or a view's */
export const HeaderActions: FC<IDockviewHeaderActionsProps> = (props) => {
    const edge = getEdgePosition(props.group)
    return edge ? (
        <ToolActions {...props} edge={edge} />
    ) : (
        <ViewActions {...props} />
    )
}
