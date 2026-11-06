import type {
    Highlight,
    OnDataClick,
    PluginObject,
} from '@modules/plugins/contract'
import type { PluginViewType } from '@modules/workspace/view-types'
import { useCallback, useRef, type FC } from 'react'
import { usePluginSources } from './plugin-sources'
import classes from './styles/plugin-view.module.css'
import { useElementSize } from './use-element-size'

export type PluginViewProps = {
    type: PluginViewType
    object: PluginObject
    /* A right-click's position comes out in page coordinates */
    onDataClick?: OnDataClick
    highlight?: Highlight
    onLoadingComplete?: () => void
}

/* The plugin adapter: mounts a view's plugin with the props of the plugin
 * contract, sized to the view's body. The plugin draws only once the body
 * has a size, and follows it as it resizes. It fills the body, so a
 * position from the plugin's top-left corner is one from the body's. */
export const PluginView: FC<PluginViewProps> = ({
    type,
    object,
    onDataClick,
    ...props
}) => {
    const Renderer = usePluginSources().renderers[type]
    const bodyRef = useRef<HTMLDivElement>(null)
    const size = useElementSize(bodyRef)

    const onPluginDataClick = useCallback<OnDataClick>(
        (click, options) => {
            /* The plugin only draws, and so can only be clicked, in it */
            const body = (
                bodyRef.current as HTMLDivElement
            ).getBoundingClientRect()
            const position = options.position && {
                x: body.left + options.position.x,
                y: body.top + options.position.y,
            }
            onDataClick?.(click, { ...options, position })
        },
        [onDataClick]
    )

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
                    onDataClick={onPluginDataClick}
                    {...props}
                />
            )}
        </div>
    )
}
