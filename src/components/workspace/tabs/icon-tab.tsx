import {
    ADD_VIEWS_PANEL_ID,
    WORKSPACE_PANEL_ID,
} from '@components/workspace/controller/panels'
import { IconAdd16, IconDashboardWindow16 } from '@dhis2/ui'
import type { FC, ReactElement, ReactNode } from 'react'
import classes from './styles/tabs.module.css'

/* The tools tabs that are always there, marked with an icon so they stand
 * out from the settings tabs */
const TAB_ICONS: Record<string, () => ReactElement> = {
    [WORKSPACE_PANEL_ID]: () => <IconDashboardWindow16 />,
    [ADD_VIEWS_PANEL_ID]: () => <IconAdd16 />,
}

export const getTabIcon = (panelId: string): ReactElement | null =>
    TAB_ICONS[panelId]?.() ?? null

const TabIcon: FC<{ icon: ReactElement }> = ({ icon }) => (
    <span className={classes.tabIcon} data-test="tab-icon">
        {icon}
    </span>
)

/* A tab with an icon before its name. Such tabs can't be closed, so they
 * need none of DockviewDefaultTab's close handling; they reuse its classes
 * to look the same. */
export const IconTab: FC<{ icon: ReactElement; title: string | undefined }> = ({
    icon,
    title,
}) => (
    <div className="dv-default-tab">
        <TabIcon icon={icon} />
        <span className={`dv-default-tab-content ${classes.tabIconLabel}`}>
            {title}
        </span>
    </div>
)

/* Puts an icon before a DockviewDefaultTab, which has no slot for one */
export const WithTabIcon: FC<{
    icon: ReactElement
    isSelected: boolean
    children: ReactNode
}> = ({ icon, isSelected, children }) => (
    <div
        className={classes.withTabIcon}
        data-selected={isSelected || undefined}
        data-test={isSelected ? 'selected-view-tab' : undefined}
    >
        <TabIcon icon={icon} />
        {children}
    </div>
)
