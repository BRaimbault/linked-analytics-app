import type { IncomingLinks, LinkItem } from '@modules/interactions/apply-links'
import type { DataClick, Highlight } from '@modules/plugins/contract'
import type { ViewType } from '@modules/workspace/view-types'

/* A channel is one dimension with one shared value, and the views that
 * belong to it (docs/interactions.md §4): senders set the value with their
 * clicks, receivers are rewritten with it, and a selector, if any, shows
 * and sets it. Channels are named by a letter, which the view headers show
 * with the channel's color. */

export type LinkDimension = 'ou' | 'pe'

export const LINK_DIMENSIONS: readonly LinkDimension[] = ['ou', 'pe']

export type ChannelMember = { send: boolean; receive: boolean }

export type Channel = {
    label: string
    dimension: LinkDimension
    value: LinkItem[]
    /* The view that set the value: it isn't rewritten with it, but
     * highlights it */
    setBy: string | null
    selectorViewId: string | null
    members: Record<string, ChannelMember>
}

export const SELECTOR_DIMENSIONS: Partial<Record<ViewType, LinkDimension>> = {
    'org-unit-selector': 'ou',
    'period-selector': 'pe',
}

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/* The first letter no channel has; a workspace never holds 26 channels
 * (a channel per selector, and one per dimension without one) */
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

/* The values a view is rewritten with: those of the channels it receives,
 * except the values it set itself */
export const getIncomingLinks = (
    channels: Channel[],
    viewId: string
): IncomingLinks =>
    Object.fromEntries(
        channels
            .filter(
                (channel) =>
                    channel.members[viewId]?.receive &&
                    channel.setBy !== viewId &&
                    channel.value.length > 0
            )
            .map((channel) => [channel.dimension, channel.value])
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

/* A click selects its item; clicking the selection again clears it.
 * An additive click (Ctrl or Cmd) adds the item, or takes it out. */
export const toggleValue = (
    value: LinkItem[],
    item: LinkItem,
    additive: boolean
): LinkItem[] => {
    const isSelected = value.some(({ id }) => id === item.id)
    if (additive) {
        return isSelected
            ? value.filter(({ id }) => id !== item.id)
            : [...value, item]
    }
    return isSelected && value.length === 1 ? [] : [item]
}
