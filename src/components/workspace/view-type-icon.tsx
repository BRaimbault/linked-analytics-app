import {
    IconCalendar24,
    IconList24,
    IconLocation24,
    IconVisualizationColumn24,
    IconWorld24,
} from '@dhis2/ui'
import type { ViewType } from '@modules/workspace/view-types'
import type { FC, ReactElement } from 'react'

const ICONS: Record<ViewType, () => ReactElement> = {
    map: () => <IconWorld24 />,
    visualization: () => <IconVisualizationColumn24 />,
    'period-selector': () => <IconCalendar24 />,
    'org-unit-selector': () => <IconLocation24 />,
    'data-selector': () => <IconList24 />,
}

export const ViewTypeIcon: FC<{ type: ViewType }> = ({ type }) => ICONS[type]()
