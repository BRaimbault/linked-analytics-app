import { useViewLinks } from '@components/interactions/use-view-links'
import { usePluginSources } from '@components/plugins/plugin-sources'
import { PluginView } from '@components/plugins/plugin-view'
import { applyLinks } from '@modules/interactions/apply-links'
import type { PluginObject } from '@modules/plugins/contract'
import type { PluginViewType } from '@modules/workspace/view-types'
import { useMemo, type FC } from 'react'
import classes from './styles/panels.module.css'

/* A plugin view's body once it shows a saved item, rewritten with the
 * values of the channels it receives */
export const PluginPanel: FC<{
    viewId: string
    type: PluginViewType
    object: PluginObject
}> = ({ viewId, type, object }) => {
    const { orgUnitLevelCount } = usePluginSources()
    const { incoming, highlight, onDataClick } = useViewLinks(viewId)
    const linkedObject = useMemo(
        () => applyLinks(object, incoming, { orgUnitLevelCount }),
        [object, incoming, orgUnitLevelCount]
    )

    return (
        <div className={classes.pluginBody} data-view-id={viewId}>
            <PluginView
                type={type}
                object={linkedObject}
                highlight={highlight}
                onDataClick={onDataClick}
            />
        </div>
    )
}
