import {
    EDGE_POSITIONS,
    getEdgePosition,
    moveTools,
    swapViewsById,
    type EdgePosition,
} from '@components/workspace/workspace-controller'
import i18n from '@dhis2/d2-i18n'
import {
    FlyoutMenu,
    IconChevronDown16,
    IconChevronLeft16,
    IconChevronRight16,
    IconChevronUp16,
    IconFullscreen16,
    IconFullscreenExit16,
    IconMore16,
    MenuItem,
    Popover,
    Tooltip,
} from '@dhis2/ui'
import { useAppSelector } from '@hooks'
import { getViewTitle } from '@modules/workspace/view-types'
import { selectViews } from '@store/workspace-slice'
import type {
    DockviewApi,
    IDockviewHeaderActionsProps,
    IDockviewPanel,
} from 'dockview-react'
import { useEffect, useRef, useState, type FC, type ReactElement } from 'react'
import classes from './styles/workspace.module.css'

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

/* Borderless, to match dockview's own tab close button */
const IconButton: FC<{
    label: string
    icon: ReactElement
    dataTest: string
    onClick: () => void
}> = ({ label, icon, dataTest, onClick }) => (
    <Tooltip content={label}>
        <button
            type="button"
            className={classes.iconButton}
            aria-label={label}
            data-test={dataTest}
            onClick={onClick}
        >
            {icon}
        </button>
    </Tooltip>
)

type MenuAction = {
    key: string
    label: string
    dataTest: string
    onClick: () => void
}

const ActionsMenu: FC<{
    label: string
    dataTest: string
    actions: MenuAction[]
}> = ({ label, dataTest, actions }) => {
    const anchorRef = useRef<HTMLSpanElement>(null)
    const [isOpen, setIsOpen] = useState(false)

    return (
        <span ref={anchorRef}>
            <IconButton
                label={label}
                icon={<IconMore16 />}
                dataTest={dataTest}
                onClick={() => setIsOpen((open) => !open)}
            />
            {isOpen && (
                <Popover
                    reference={anchorRef}
                    placement="bottom-end"
                    arrow={false}
                    onClickOutside={() => setIsOpen(false)}
                >
                    <FlyoutMenu dense>
                        {actions.map((action) => (
                            <MenuItem
                                key={action.key}
                                dataTest={action.dataTest}
                                label={action.label}
                                onClick={() => {
                                    setIsOpen(false)
                                    action.onClick()
                                }}
                            />
                        ))}
                    </FlyoutMenu>
                </Popover>
            )}
        </span>
    )
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

/* Swapping by dragging a tab onto another view needs a pointer; the menu
 * does the same from the keyboard. */
const SwapMenu: FC<{ api: DockviewApi; view: IDockviewPanel }> = ({
    api,
    view,
}) => {
    const views = useAppSelector(selectViews)
    const targets = views.filter(({ id }) => id !== view.id)

    if (!targets.length) {
        return null
    }

    return (
        <ActionsMenu
            label={i18n.t('View actions')}
            dataTest="view-actions-button"
            actions={targets.map((target) => ({
                key: target.id,
                label: i18n.t('Swap with {{title}}', {
                    title: getViewTitle(target.type, target.number),
                    interpolation: { escapeValue: false },
                }),
                dataTest: `swap-with-${target.id}`,
                onClick: () => swapViewsById(api, view.id, target.id),
            }))}
        />
    )
}

const ToolActions: FC<IDockviewHeaderActionsProps & { edge: EdgePosition }> = ({
    api,
    containerApi,
    edge,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(api.isCollapsed())

    useEffect(() => {
        const listener = api.onDidCollapsedChange(() =>
            setIsCollapsed(api.isCollapsed())
        )
        return () => listener.dispose()
    }, [api])

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

const ViewActions: FC<IDockviewHeaderActionsProps> = ({
    api,
    containerApi,
    activePanel,
}) => {
    const [isMaximized, setIsMaximized] = useState(api.isMaximized())

    useEffect(() => {
        const listener = containerApi.onDidMaximizedGroupChange(() =>
            setIsMaximized(api.isMaximized())
        )
        return () => listener.dispose()
    }, [api, containerApi])

    return (
        <div className={classes.headerActions}>
            {activePanel && !isMaximized && (
                <SwapMenu api={containerApi} view={activePanel} />
            )}
            <IconButton
                label={isMaximized ? i18n.t('Restore') : i18n.t('Maximize')}
                icon={
                    isMaximized ? (
                        <IconFullscreenExit16 />
                    ) : (
                        <IconFullscreen16 />
                    )
                }
                dataTest="maximize-view-button"
                onClick={() =>
                    isMaximized ? api.exitMaximized() : api.maximize()
                }
            />
        </div>
    )
}

export const HeaderActions: FC<IDockviewHeaderActionsProps> = (props) => {
    const edge = getEdgePosition(props.group)
    return edge ? (
        <ToolActions {...props} edge={edge} />
    ) : (
        <ViewActions {...props} />
    )
}
