import type { LinkItem } from '@modules/interactions/apply-links'
import {
    findViewChannel,
    getClickKey,
    getClickedItems,
    LINK_DIMENSIONS,
    setValueFromView,
    type Channel,
    type LinkDimension,
} from '@modules/interactions/channels'
import { resetFollowersDrills } from '@modules/interactions/drills'
import {
    createChannel,
    type InteractionsState,
} from '@modules/interactions/membership'
import type { DataClick } from '@modules/plugins/contract'

/* A view's clicks on points (docs/interactions.md §4). The view keeps the
 * points it selected, and each of its channels holds the items of those
 * points for its dimension: two cells of a column are two chiefdoms in
 * one quarter. A click selects its point alone, or none when it's the one
 * selected; Ctrl or Cmd adds the point, or takes it out. With no point
 * left, the channels get back what they held before. Changes the state in
 * place, as the slice's reducers do. */

export type SelectedPoint = {
    key: string
    items: Partial<Record<LinkDimension, LinkItem>>
}

type Target = { dimension: LinkDimension; channel: Channel }

const itemsOf = (points: SelectedPoint[], dimension: LinkDimension) => {
    const items = new Map<string, LinkItem>()
    for (const point of points) {
        const item = point.items[dimension]
        if (item && !items.has(item.id)) {
            items.set(item.id, item)
        }
    }
    return [...items.values()]
}

const sameIds = (a: LinkItem[], b: LinkItem[]) =>
    a.length === b.length &&
    a.every(({ id }) => b.some((item) => item.id === id))

/* The view's selection, while its channels still hold what it set */
const currentPoints = (
    state: InteractionsState,
    viewId: string,
    targets: Target[]
) => {
    const points = state.selectedPoints[viewId] ?? []
    const isCurrent = targets.every(
        ({ dimension, channel }) =>
            channel.setBy === viewId &&
            sameIds(channel.value, itemsOf(points, dimension))
    )
    return isCurrent ? points : []
}

const nextPoints = (
    points: SelectedPoint[],
    point: SelectedPoint,
    additive: boolean
) => {
    const isSelected = points.some(({ key }) => key === point.key)
    if (additive) {
        return isSelected
            ? points.filter(({ key }) => key !== point.key)
            : [...points, point]
    }
    return isSelected && points.length === 1 ? [] : [point]
}

export const applyClick = (
    state: InteractionsState,
    viewId: string,
    { click, additive }: { click: DataClick; additive: boolean }
) => {
    if (!state.linkableViews.some(({ id }) => id === viewId)) {
        return
    }
    const items = getClickedItems(click)
    const targets = LINK_DIMENSIONS.flatMap((dimension): Target[] => {
        if (!items[dimension]) {
            return []
        }
        const hasChannel = state.channels.some(
            (channel) => channel.dimension === dimension
        )
        if (!hasChannel) {
            createChannel(state, dimension)
        }
        const channel = findViewChannel(state.channels, viewId, dimension)
        return channel?.members[viewId].send ? [{ dimension, channel }] : []
    })

    const point = { key: getClickKey(click), items }
    const points = nextPoints(
        currentPoints(state, viewId, targets),
        point,
        additive
    )
    /* With nothing selected, a drilled view passes the unit it's drilled
     * into, so the others show what it shows */
    const drilledInto = state.drills[viewId]?.item
    for (const { dimension, channel } of targets) {
        const selected = itemsOf(points, dimension)
        const value =
            !selected.length && dimension === 'ou' && drilledInto
                ? [drilledInto]
                : selected
        setValueFromView(channel, viewId, value)
        resetFollowersDrills(state, channel, viewId)
    }
    if (points.length) {
        state.selectedPoints[viewId] = points
    } else {
        delete state.selectedPoints[viewId]
    }
}
