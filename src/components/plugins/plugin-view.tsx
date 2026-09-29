import type {
    DataClick,
    Highlight,
    PluginObject,
} from '@modules/plugins/contract'
import type { PluginViewType } from '@modules/workspace/view-types'
import { useRef, type FC } from 'react'
import { usePluginSources } from './plugin-sources'
import classes from './styles/plugin-view.module.css'
import { useElementSize } from './use-element-size'

export type PluginViewProps = {
    type: PluginViewType
    object: PluginObject
    onDataClick?: (click: DataClick, options: { additive: boolean }) => void
    highlight?: Highlight
    onLoadingComplete?: () => void
}

/* The plugin adapter: mounts a view's plugin with the props of the plugin
 * contract, sized to the view's body. The plugin draws only once the body
 * has a size, and follows it as it resizes. */
export const PluginView: FC<PluginViewProps> = ({ type, object, ...props }) => {
    const Renderer = usePluginSources().renderers[type]
    const bodyRef = useRef<HTMLDivElement>(null)
    const size = useElementSize(bodyRef)

    return (
        <div
            ref={bodyRef}
            className={classes.pluginView}
            data-test="plugin-view"
        >
            {Renderer && size && (
                <Renderer
                    visualization={object}
                    width={size.width}
                    height={size.height}
                    {...props}
                />
            )}
        </div>
    )
}
