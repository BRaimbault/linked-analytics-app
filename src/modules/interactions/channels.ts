import {
    DEFAULT_ORG_UNIT_DEPTH,
    type IncomingLinks,
    type LinkItem,
    type OrgUnitDepth,
} from '@modules/interactions/apply-links'
import type { DataClick, Highlight } from '@modules/plugins/contract'
import { isPluginViewType, type ViewType } from '@modules/workspace/view-types'

/* A channel is one dimension with one shared value, and the views that
 * belong to it (docs/interactions.md §4): senders set the value with their
 * clicks, receivers are rewritten with it, and a selector, if any, shows
 * and sets it. Channels are named by a letter, which the view headers show
 * with the channel's color. */

export type LinkDimension = 'ou' | 'pe'

export const LINK_DIMENSIONS: readonly LinkDimension[] = ['ou', 'pe']

export type ChannelMember = {
    send: boolean
    receive: boolean
    /* Org unit channels only: what the view shows for the selection */
    depth?: OrgUnitDepth
}

export type Channel = {
    label: string
    dimension: LinkDimension
    value: LinkItem[]
    /* The view that set the value: it isn't rewritten with it, but
     * highlights it, and keeps showing the value from before (`before`),
     * so its own click doesn't take it back to its saved item */
    setBy: string | null
    before: LinkItem[]
    selectorViewId: string | null
    members: Record<string, ChannelMember>
}

/* A view sets the value by a click or a drill. What the channel held
 * before is kept for that view, unless the view had set it itself. An
 * empty value brings the one from before back. */
export const setValueFromView = (
    channel: Channel,
    viewId: string,
    value: LinkItem[]
) => {
    if (!value.length) {
        setValue(channel, channel.before)
        return
    }
    if (channel.setBy !== viewId) {
        channel.before = channel.value
    }
    channel.value = value
    channel.setBy = viewId
}

/* A value set by no view: a selector's, or one a sender left behind */
export const setValue = (channel: Channel, value: LinkItem[]) => {
    channel.value = value
    channel.setBy = null
    channel.before = []
}

export const SELECTOR_DIMENSIONS: Partial<Record<ViewType, LinkDimension>> = {
    'org-unit-selector': 'ou',
    'period-selector': 'pe',
}

/* Maps and visualizations, and the selectors that drive a channel */
export const canLink = (type: ViewType): boolean =>
    isPluginViewType(type) || SELECTOR_DIMENSIONS[type] !== undefined

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/* The first letter no channel has; a workspace never holds 26 channels
 * (at most one per selector, and one per plugin view and dimension) */
export const getNextChannelLabel = (channels: Channel[]): string =>
    [...LABELS].find((label) =>
        channels.every((channel) => channel.label !== label)
    ) as string

/* The channel a view belongs to for a dimension: a view is in at most one */
export const findViewChannel = (
    channels: Channel[],
    viewId: string,
    dimension: LinkDimension
): Channel | undefined =>
    channels.find(
        (channel) =>
            channel.dimension === dimension &&
            Object.hasOwn(channel.members, viewId)
    )

export const findSelectorChannel = (
    channels: Channel[],
    selectorViewId: string
): Channel | undefined =>
    channels.find((channel) => channel.selectorViewId === selectorViewId)

/* What a view shows for a selected org unit: its sub-units unless set */
export const getOrgUnitDepth = (
    channels: Channel[],
    viewId: string
): OrgUnitDepth =>
    findViewChannel(channels, viewId, 'ou')?.members[viewId].depth ??
    DEFAULT_ORG_UNIT_DEPTH

/* The values a view is rewritten with: those of the channels it receives,
 * except the values it set itself */
export const getIncomingLinks = (
    channels: Channel[],
    viewId: string
): IncomingLinks =>
    Object.fromEntries(
        channels
            .filter((channel) => channel.members[viewId]?.receive)
            .map((channel) => [
                channel.dimension,
                channel.setBy === viewId ? channel.before : channel.value,
            ])
            .filter(([, value]) => value.length > 0)
    )

/* What a view emphasizes: the values it set with its own clicks */
export const getHighlight = (
    channels: Channel[],
    viewId: string
): Highlight | undefined => {
    const own = channels.filter((channel) => channel.setBy === viewId)
    return own.length
        ? Object.fromEntries(
              own.map((channel) => [
                  channel.dimension,
                  channel.value.map(({ id }) => id),
              ])
          )
        : undefined
}

/* The items a click sets, per dimension it carries */
export const getClickedItems = (
    click: DataClick
): Partial<Record<LinkDimension, LinkItem>> => {
    const items: Partial<Record<LinkDimension, LinkItem>> = {}
    if (click.ou) {
        const { id, name, path } = click.ou
        items.ou = { id, name, path }
    }
    if (click.pe) {
        const { id, name } = click.pe
        items.pe = { id, name }
    }
    return items
}

/* Which point was clicked: two points are the same when every dimension
 * they carry is, the data item included (two series at the same place are
 * two points, although only their org unit and period link) */
export const getClickKey = ({ ou, pe, dx }: DataClick): string =>
    JSON.stringify([ou?.id, pe?.id, dx?.id])
