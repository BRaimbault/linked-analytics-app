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

/* Items to restyle, without refetching */
export type Highlight = { ou?: string[]; pe?: string[]; dx?: string[] }

export type PluginObject = VisualizationObject | MapObject

export type PluginProps<T extends PluginObject = PluginObject> = {
    visualization: T
    /* The size of the view's body; a plugin fills it */
    width: number
    height: number
    onDataClick?: (click: DataClick, options: { additive: boolean }) => void
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
