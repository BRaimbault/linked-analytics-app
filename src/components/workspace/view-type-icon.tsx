import { IconVisualizationColumn24, IconWorld24 } from '@dhis2/ui'
import type { ViewType } from '@modules/workspace/view-types'
import type { FC } from 'react'

export const ViewTypeIcon: FC<{ type: ViewType }> = ({ type }) =>
    type === 'map' ? <IconWorld24 /> : <IconVisualizationColumn24 />
