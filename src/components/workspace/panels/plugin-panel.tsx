import { DrillMenu } from '@components/interactions/drill-menu'
import { useViewLinks } from '@components/interactions/use-view-links'
import { usePluginSources } from '@components/plugins/plugin-sources'
import { PluginView } from '@components/plugins/plugin-view'
import { applyLinks, type LinkItem } from '@modules/interactions/apply-links'
import type { OnDataClick, PluginObject } from '@modules/plugins/contract'
import type { PluginViewType } from '@modules/workspace/view-types'
import { useCallback, useMemo, useState, type FC } from 'react'
import classes from './styles/panels.module.css'

type ContextMenu = {
    clicked: LinkItem | undefined
    position: { x: number; y: number }
}

/* A plugin view's body once it shows a saved item, rewritten with the
 * values of the channels it receives. A click sets them; a right-click
 * opens the drill menu at the pointer instead. */
export const PluginPanel: FC<{
    viewId: string
    type: PluginViewType
    object: PluginObject
}> = ({ viewId, type, object }) => {
    const { orgUnitLevelCount } = usePluginSources()
    const { incoming, orgUnitDepth, highlight, onDataClick } =
        useViewLinks(viewId)
    const linkedObject = useMemo(
        () => applyLinks(object, incoming, { orgUnitLevelCount, orgUnitDepth }),
        [object, incoming, orgUnitLevelCount, orgUnitDepth]
    )

    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
    const onClick = useCallback<OnDataClick>(
        (click, options) => {
            /* The contract sends a right-click with its position */
            if (options.trigger === 'context') {
                const { id, name, path } = click.ou ?? {}
                setContextMenu({
                    clicked: id ? { id, name, path } : undefined,
                    position: options.position as ContextMenu['position'],
                })
                return
            }
            onDataClick(click, options)
        },
        [onDataClick]
    )
    const closeContextMenu = useCallback(() => setContextMenu(null), [])

    return (
        <div className={classes.pluginBody} data-view-id={viewId}>
            <PluginView
                type={type}
                object={linkedObject}
                highlight={highlight}
                onDataClick={onClick}
            />
            {contextMenu && (
                <DrillMenu
                    viewId={viewId}
                    clicked={contextMenu.clicked}
                    position={contextMenu.position}
                    onClose={closeContextMenu}
                />
            )}
        </div>
    )
}
