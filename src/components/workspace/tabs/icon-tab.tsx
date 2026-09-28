import {
    ADD_VIEWS_PANEL_ID,
    WORKSPACE_PANEL_ID,
} from '@components/workspace/controller/panels'
import { IconAdd16, IconDashboardWindow16 } from '@dhis2/ui'
import type { FC, ReactElement } from 'react'
import classes from './styles/tabs.module.css'

/* The tools tabs that are always there, marked with an icon so they stand
 * out from the settings tabs */
const TAB_ICONS: Record<string, () => ReactElement> = {
    [WORKSPACE_PANEL_ID]: () => <IconDashboardWindow16 />,
    [ADD_VIEWS_PANEL_ID]: () => <IconAdd16 />,
}

export const getTabIcon = (panelId: string): ReactElement | null =>
    TAB_ICONS[panelId]?.() ?? null

/* A tab with an icon before its name. Such tabs can't be closed, so they
 * need none of DockviewDefaultTab's close handling; they reuse its classes
 * to look the same. */
export const IconTab: FC<{ icon: ReactElement; title: string | undefined }> = ({
    icon,
    title,
}) => (
    <div className="dv-default-tab">
        <span className={classes.tabIcon} data-test="tab-icon">
            {icon}
        </span>
        <span className={`dv-default-tab-content ${classes.tabIconLabel}`}>
            {title}
        </span>
    </div>
)
