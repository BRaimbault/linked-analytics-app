import {
    IconCalendar16,
    IconCalendar24,
    IconList16,
    IconList24,
    IconLocation16,
    IconLocation24,
    IconTextBox16,
    IconTextBox24,
    IconVisualizationColumn16,
    IconVisualizationColumn24,
    IconWorld16,
    IconWorld24,
} from '@dhis2/ui'
import type { ViewType } from '@modules/workspace/view-types'
import type { FC, ReactElement } from 'react'

type IconSize = 16 | 24

const ICONS: Record<ViewType, Record<IconSize, () => ReactElement>> = {
    map: { 16: () => <IconWorld16 />, 24: () => <IconWorld24 /> },
    visualization: {
        16: () => <IconVisualizationColumn16 />,
        24: () => <IconVisualizationColumn24 />,
    },
    'period-selector': {
        16: () => <IconCalendar16 />,
        24: () => <IconCalendar24 />,
    },
    'org-unit-selector': {
        16: () => <IconLocation16 />,
        24: () => <IconLocation24 />,
    },
    'data-selector': { 16: () => <IconList16 />, 24: () => <IconList24 /> },
    text: { 16: () => <IconTextBox16 />, 24: () => <IconTextBox24 /> },
}

/* 24px in the palette and bodies, 16px in tabs */
export const ViewTypeIcon: FC<{ type: ViewType; size?: IconSize }> = ({
    type,
    size = 24,
}) => ICONS[type][size]()
