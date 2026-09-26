import {
    EDGE_POSITIONS,
    type EdgePosition,
} from '@components/workspace/controller/panels'
import { moveTools } from '@components/workspace/controller/tools-strip'
import { useDockviewValue } from '@components/workspace/use-dockview-value'
import i18n from '@dhis2/d2-i18n'
import {
    IconChevronDown16,
    IconChevronLeft16,
    IconChevronRight16,
    IconChevronUp16,
} from '@dhis2/ui'
import type { DockviewApi, IDockviewHeaderActionsProps } from 'dockview-react'
import { useCallback, type FC, type ReactElement } from 'react'
import { ActionsMenu } from './actions-menu'
import { IconButton } from './icon-button'
import classes from './styles/tabs.module.css'

const MOVE_LABELS: Record<EdgePosition, () => string> = {
    top: () => i18n.t('Move to top'),
    left: () => i18n.t('Move to left'),
    right: () => i18n.t('Move to right'),
    bottom: () => i18n.t('Move to bottom'),
}

/* The chevron points the way the strip will move: towards its edge to
 * collapse, away from it to expand. */
const COLLAPSE_ICONS: Record<
    EdgePosition,
    { collapse: ReactElement; expand: ReactElement }
> = {
    top: { collapse: <IconChevronUp16 />, expand: <IconChevronDown16 /> },
    bottom: { collapse: <IconChevronDown16 />, expand: <IconChevronUp16 /> },
    left: { collapse: <IconChevronLeft16 />, expand: <IconChevronRight16 /> },
    right: { collapse: <IconChevronRight16 />, expand: <IconChevronLeft16 /> },
}

/* Moving the tools between edges by dragging is a paid dockview feature, so
 * a menu does it instead. */
const MoveMenu: FC<{ api: DockviewApi; current: EdgePosition }> = ({
    api,
    current,
}) => (
    <ActionsMenu
        label={i18n.t('Move these panels')}
        dataTest="move-tools-button"
        actions={EDGE_POSITIONS.filter((position) => position !== current).map(
            (position) => ({
                key: position,
                label: MOVE_LABELS[position](),
                dataTest: `move-tools-${position}`,
                onClick: () => moveTools(api, current, position),
            })
        )}
    />
)

export const ToolActions: FC<
    IDockviewHeaderActionsProps & { edge: EdgePosition }
> = ({ api, containerApi, edge }) => {
    const isCollapsed = useDockviewValue(
        useCallback(() => api.isCollapsed(), [api]),
        useCallback((listener) => api.onDidCollapsedChange(listener), [api])
    )

    return (
        <div className={classes.headerActions}>
            <IconButton
                label={isCollapsed ? i18n.t('Expand') : i18n.t('Collapse')}
                icon={
                    isCollapsed
                        ? COLLAPSE_ICONS[edge].expand
                        : COLLAPSE_ICONS[edge].collapse
                }
                dataTest="collapse-tools-button"
                onClick={() => (isCollapsed ? api.expand() : api.collapse())}
            />
            <MoveMenu api={containerApi} current={edge} />
        </div>
    )
}
