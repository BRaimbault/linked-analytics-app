import type { EdgePosition } from '@components/workspace/controller/panels'
import { Tooltip } from '@dhis2/ui'
import type { FC, MouseEvent, MutableRefObject, ReactNode } from 'react'
import classes from './styles/tabs.module.css'

const isCutShort = (tab: HTMLElement): boolean => {
    const name = tab.querySelector('.dv-default-tab-content')
    return (
        name !== null &&
        (name.scrollWidth > name.clientWidth ||
            name.scrollHeight > name.clientHeight)
    )
}

/* Towards the grid, away from the edge the tools strip is docked at */
const PLACEMENT: Record<EdgePosition, EdgePosition> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
}

/* Tools tabs share one length and cut long names short (see the workspace
 * CSS); hovering one shows its full name, as the app's other tooltips do.
 * The wrapper takes no focus, so it adds no Tab stop; screen readers
 * already get the full name from the tab's aria-label. */
export const TabNameTooltip: FC<{
    name: string | undefined
    edge: EdgePosition
    children: ReactNode
}> = ({ name, edge, children }) => (
    <Tooltip content={name} placement={PLACEMENT[edge]}>
        {({ ref, onMouseOver, onMouseOut }) => (
            <div
                ref={ref as MutableRefObject<HTMLDivElement>}
                className={classes.tabNameTooltip}
                onMouseOver={(event: MouseEvent<HTMLDivElement>) => {
                    if (isCutShort(event.currentTarget)) {
                        onMouseOver(event)
                    }
                }}
                onMouseOut={onMouseOut}
            >
                {children}
            </div>
        )}
    </Tooltip>
)
