import type { OrgUnitDepth } from '@modules/interactions/apply-links'
import {
    findSelectorChannel,
    findViewChannel,
    getNextChannelLabel,
    LINK_DIMENSIONS,
    setValue,
    type Channel,
    type ChannelMember,
    type LinkDimension,
} from '@modules/interactions/channels'
import type { SelectedPoint } from '@modules/interactions/clicks'
import type { Drills } from '@modules/interactions/drills'
import type { PluginViewType } from '@modules/workspace/view-types'

/* Who belongs to which channel, and how that changes: the defaults of
 * docs/interactions.md §5.1, and the choices made in a view's Links
 * section (§5.4). These change the state in place, as the interactions
 * slice's reducers do. */

export type LinkableView = { id: string; type: PluginViewType }

export type InteractionsState = {
    channels: Channel[]
    /* The views that can send and receive: maps and visualizations */
    linkableViews: LinkableView[]
    /* Dimensions a view was taken out of: the defaults leave it out */
    detached: Record<string, LinkDimension[]>
    drills: Drills
    /* The points each view selected by clicking */
    selectedPoints: Record<string, SelectedPoint[]>
}

/* One view's link for one dimension */
export type ViewLink = { viewId: string; dimension: LinkDimension }

/* What a view's clicks can carry: a map click has no period */
const SENT_DIMENSIONS: Record<PluginViewType, readonly LinkDimension[]> = {
    visualization: ['ou', 'pe'],
    map: ['ou'],
}

export const canSend = (
    type: PluginViewType,
    dimension: LinkDimension
): boolean => SENT_DIMENSIONS[type].includes(dimension)

const defaultMember = (
    { type }: LinkableView,
    dimension: LinkDimension
): ChannelMember => ({ send: canSend(type, dimension), receive: true })

const isDetached = (
    state: InteractionsState,
    { viewId, dimension }: ViewLink
) => state.detached[viewId]?.includes(dimension) ?? false

const setDetached = (
    state: InteractionsState,
    { viewId, dimension }: ViewLink,
    detached: boolean
) => {
    const others = (state.detached[viewId] ?? []).filter(
        (entry) => entry !== dimension
    )
    state.detached[viewId] = detached ? [...others, dimension] : others
}

/* A view the defaults may add to a channel: in none of that dimension,
 * and not taken out of it */
const isFree = (state: InteractionsState, link: ViewLink) =>
    !findViewChannel(state.channels, link.viewId, link.dimension) &&
    !isDetached(state, link)

/* The free views join a new channel, with the defaults: views send what
 * they can, and follow the value */
export const createChannel = (
    state: InteractionsState,
    dimension: LinkDimension,
    {
        selectorViewId = null,
        joinFreeViews = true,
    }: { selectorViewId?: string | null; joinFreeViews?: boolean } = {}
): Channel => {
    const channel: Channel = {
        label: getNextChannelLabel(state.channels),
        dimension,
        value: [],
        setBy: null,
        before: [],
        selectorViewId,
        members: {},
    }
    if (joinFreeViews) {
        for (const view of state.linkableViews) {
            if (isFree(state, { viewId: view.id, dimension })) {
                channel.members[view.id] = defaultMember(view, dimension)
            }
        }
    }
    state.channels.push(channel)
    return channel
}

/* A new view joins the first channel of each dimension */
export const joinChannels = (state: InteractionsState, view: LinkableView) => {
    for (const dimension of LINK_DIMENSIONS) {
        const channel = state.channels.find(
            (candidate) => candidate.dimension === dimension
        )
        if (channel && isFree(state, { viewId: view.id, dimension })) {
            channel.members[view.id] = defaultMember(view, dimension)
        }
    }
}

/* A channel with no selector and no members goes */
const removeUnusedChannels = (state: InteractionsState) => {
    state.channels = state.channels.filter(
        (channel) =>
            channel.selectorViewId !== null ||
            Object.keys(channel.members).length > 0
    )
}

/* A value keeps showing once the view that set it leaves */
const leaveChannel = (channel: Channel, viewId: string) => {
    delete channel.members[viewId]
    if (channel.setBy === viewId) {
        setValue(channel, channel.value)
    }
}

export const removeView = (state: InteractionsState, viewId: string) => {
    for (const channel of state.channels) {
        leaveChannel(channel, viewId)
        if (channel.selectorViewId === viewId) {
            channel.selectorViewId = null
        }
    }
    state.linkableViews = state.linkableViews.filter(({ id }) => id !== viewId)
    delete state.detached[viewId]
    delete state.drills[viewId]
    delete state.selectedPoints[viewId]
    removeUnusedChannels(state)
}

/* Where a view or a selector goes: a channel, by its letter, or a new
 * one; a view can also go to none */
export type ChannelChoice = { label: string } | 'new' | 'none'

const findChoice = (
    state: InteractionsState,
    dimension: LinkDimension,
    label: string
) =>
    state.channels.find(
        (channel) => channel.label === label && channel.dimension === dimension
    )

/* Moves a view to another channel of a dimension, keeping what it sends
 * and follows. A new channel starts with this view only. */
export const moveViewToChannel = (
    state: InteractionsState,
    link: ViewLink,
    choice: ChannelChoice
) => {
    const view = state.linkableViews.find(({ id }) => id === link.viewId)
    const current = findViewChannel(state.channels, link.viewId, link.dimension)
    const existing =
        typeof choice === 'object'
            ? findChoice(state, link.dimension, choice.label)
            : undefined
    if (
        !view ||
        (typeof choice === 'object' && (!existing || existing === current)) ||
        (choice === 'none' && !current)
    ) {
        return
    }
    const member =
        current?.members[link.viewId] ?? defaultMember(view, link.dimension)
    const target =
        choice === 'new'
            ? createChannel(state, link.dimension, { joinFreeViews: false })
            : existing
    if (current) {
        leaveChannel(current, link.viewId)
    }
    if (target) {
        target.members[link.viewId] = member
    }
    setDetached(state, link, !target)
    removeUnusedChannels(state)
}

/* Sending nothing and following nothing is being in no channel */
export const setMemberRoles = (
    state: InteractionsState,
    link: ViewLink,
    roles: Pick<ChannelMember, 'send' | 'receive'>
) => {
    const channel = findViewChannel(state.channels, link.viewId, link.dimension)
    if (!channel) {
        return
    }
    if (!roles.send && !roles.receive) {
        moveViewToChannel(state, link, 'none')
        return
    }
    channel.members[link.viewId] = { ...channel.members[link.viewId], ...roles }
    if (!roles.send && channel.setBy === link.viewId) {
        setValue(channel, channel.value)
    }
}

/* Kept with the view's membership, so it moves with it between channels */
export const setOrgUnitDepth = (
    state: InteractionsState,
    viewId: string,
    depth: OrgUnitDepth
) => {
    const channel = findViewChannel(state.channels, viewId, 'ou')
    if (channel) {
        channel.members[viewId].depth = depth
    }
}

/* A selector drives one channel, and a channel has at most one selector.
 * The channel it leaves keeps its views, and goes if it has none. */
export const moveSelectorToChannel = (
    state: InteractionsState,
    selectorViewId: string,
    choice: { label: string } | 'new'
) => {
    const current = findSelectorChannel(state.channels, selectorViewId)
    const existing =
        current && choice !== 'new'
            ? findChoice(state, current.dimension, choice.label)
            : undefined
    if (!current || (choice !== 'new' && existing?.selectorViewId !== null)) {
        return
    }
    const target =
        existing ??
        createChannel(state, current.dimension, {
            selectorViewId,
            joinFreeViews: false,
        })
    current.selectorViewId = null
    target.selectorViewId = selectorViewId
    removeUnusedChannels(state)
}
