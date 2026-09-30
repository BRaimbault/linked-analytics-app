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
    sendsByDefault,
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
    /* Where its points hold nothing, the channel may hold anyone's value */
    const isCurrent = targets.every(({ dimension, channel }) => {
        const selected = itemsOf(points, dimension)
        return selected.length
            ? channel.setBy === viewId && sameIds(channel.value, selected)
            : true
    })
    return isCurrent ? points : []
}

/* Ctrl or Cmd adds the point, or takes it out. A plain click replaces the
 * points that share a dimension with it, and keeps the others: a cell
 * replaces everything, a column header the periods only, so the rows
 * picked stay. Clicking the one point it would replace takes it out. */
const nextPoints = (
    points: SelectedPoint[],
    point: SelectedPoint,
    additive: boolean
) => {
    if (additive) {
        return points.some(({ key }) => key === point.key)
            ? points.filter(({ key }) => key !== point.key)
            : [...points, point]
    }
    const dimensions = Object.keys(point.items) as LinkDimension[]
    const sharesDimension = ({ items }: SelectedPoint) =>
        dimensions.some((dimension) => items[dimension])
    const replaced = points.filter(sharesDimension)
    const kept = points.filter((selected) => !sharesDimension(selected))
    const isRepeat = replaced.length === 1 && replaced[0].key === point.key
    return isRepeat ? kept : [...kept, point]
}

export const applyClick = (
    state: InteractionsState,
    viewId: string,
    { click, additive }: { click: DataClick; additive: boolean }
) => {
    const view = state.linkableViews.find(({ id }) => id === viewId)
    if (!view) {
        return
    }
    const clicked = getClickedItems(click)
    const targets = LINK_DIMENSIONS.flatMap((dimension): Target[] => {
        if (!clicked[dimension]) {
            return []
        }
        /* The first click starts a channel of what views send by default:
         * a data channel starts with a data selector, or in a view's Links */
        const hasChannel = state.channels.some(
            (channel) => channel.dimension === dimension
        )
        if (!hasChannel && sendsByDefault(view.type, dimension)) {
            createChannel(state, dimension)
        }
        const channel = findViewChannel(state.channels, viewId, dimension)
        return channel?.members[viewId].send ? [{ dimension, channel }] : []
    })

    /* The point holds what the view sends: a series' data item is no part
     * of a selection that doesn't set data */
    const items = Object.fromEntries(
        targets.map(({ dimension }) => [dimension, clicked[dimension]])
    )
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
