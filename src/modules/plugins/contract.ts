import type {
    MapObject,
    VisualizationObject,
} from '@modules/visualization/analytical-object'

/* What this app passes a plugin, and what a plugin calls back with: the
 * props DV and Maps would take under the proposed upstream contract
 * (docs/interactions.md §6). The fake plugins take the same. */

export type DataClickItem = { id: string; name?: string }

/* The dimensions on a clicked point's axes, as ids */
export type DataClick = {
    /* level is the level's UID, as DV's onDrill sends it */
    ou?: DataClickItem & { path?: string; level?: string }
    pe?: DataClickItem
    dx?: DataClickItem
}

/* How a point was clicked. A right-click (`trigger: 'context'`) asks what
 * can be done with the point rather than selecting it: the plugin sends
 * where it happened, from its own top-left corner (an iframe's viewport),
 * so the app can open its menu there. The plugin opens no menu of its own
 * and stops the browser's. */
export type DataClickOptions = {
    additive: boolean
    trigger?: 'context'
    position?: { x: number; y: number }
}

export type OnDataClick = (click: DataClick, options: DataClickOptions) => void

/* Items to restyle, without refetching */
export type Highlight = { ou?: string[]; pe?: string[]; dx?: string[] }

export type PluginObject = VisualizationObject | MapObject

export type PluginProps<T extends PluginObject = PluginObject> = {
    visualization: T
    /* The size of the view's body; a plugin fills it */
    width: number
    height: number
    onDataClick?: OnDataClick
    highlight?: Highlight
    onLoadingComplete?: () => void
}

export const isHighlighted = (
    highlight: Highlight | undefined,
    click: DataClick
): boolean =>
    !highlight ||
    (['ou', 'pe', 'dx'] as const).every((dimension) => {
        const ids = highlight[dimension]
        const id = click[dimension]?.id
        return !ids?.length || id === undefined || ids.includes(id)
    })
