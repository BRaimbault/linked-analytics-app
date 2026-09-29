import type { LinkItem } from '@modules/interactions/apply-links'
import {
    findSelectorChannel,
    findViewChannel,
    getClickedItems,
    getNextChannelLabel,
    LINK_DIMENSIONS,
    SELECTOR_DIMENSIONS,
    toggleValue,
    type Channel,
    type LinkDimension,
} from '@modules/interactions/channels'
import type { DataClick } from '@modules/plugins/contract'
import { isPluginViewType } from '@modules/workspace/view-types'
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { viewAdded, viewRemoved } from './workspace-slice'

type InteractionsState = {
    channels: Channel[]
    /* The views that can send and receive: maps and visualizations */
    linkableViewIds: string[]
}

const initialState: InteractionsState = {
    channels: [],
    linkableViewIds: [],
}

/* With the defaults of docs/interactions.md §5.1 (views send, new views
 * join), a view joins a new channel both ways, unless it is already in
 * another channel of that dimension */
const createChannel = (
    state: InteractionsState,
    dimension: LinkDimension,
    selectorViewId: string | null
): Channel => {
    const channel: Channel = {
        label: getNextChannelLabel(state.channels),
        dimension,
        value: [],
        setBy: null,
        selectorViewId,
        members: {},
    }
    for (const viewId of state.linkableViewIds) {
        if (!findViewChannel(state.channels, viewId, dimension)) {
            channel.members[viewId] = { send: true, receive: true }
        }
    }
    state.channels.push(channel)
    return channel
}

const joinChannels = (state: InteractionsState, viewId: string) => {
    for (const dimension of LINK_DIMENSIONS) {
        const channel = state.channels.find(
            (candidate) => candidate.dimension === dimension
        )
        if (channel && !findViewChannel(state.channels, viewId, dimension)) {
            channel.members[viewId] = { send: true, receive: true }
        }
    }
}

/* Closing a view takes it out of its channels; a channel with no selector
 * and no members goes. A value keeps showing once its sender is closed. */
const leaveChannels = (state: InteractionsState, viewId: string) => {
    for (const channel of state.channels) {
        delete channel.members[viewId]
        if (channel.selectorViewId === viewId) {
            channel.selectorViewId = null
        }
        if (channel.setBy === viewId) {
            channel.setBy = null
        }
    }
    state.channels = state.channels.filter(
        (channel) =>
            channel.selectorViewId !== null ||
            Object.keys(channel.members).length > 0
    )
}

/* The channels between views (docs/interactions.md §4) */
export const interactionsSlice = createSlice({
    name: 'interactions',
    initialState,
    reducers: {
        /* A view's first click on a dimension with no channel creates one,
         * with no selector */
        dataClicked(
            state,
            action: PayloadAction<{
                viewId: string
                click: DataClick
                additive: boolean
            }>
        ) {
            const { viewId, click, additive } = action.payload
            if (!state.linkableViewIds.includes(viewId)) {
                return
            }
            const items = getClickedItems(click)
            for (const dimension of LINK_DIMENSIONS) {
                const item = items[dimension]
                const channel = item
                    ? (findViewChannel(state.channels, viewId, dimension) ??
                      createChannel(state, dimension, null))
                    : undefined
                if (item && channel?.members[viewId]?.send) {
                    channel.value = toggleValue(channel.value, item, additive)
                    channel.setBy = channel.value.length ? viewId : null
                }
            }
        },
        selectorValueChanged(
            state,
            action: PayloadAction<{ viewId: string; value: LinkItem[] }>
        ) {
            const channel = findSelectorChannel(
                state.channels,
                action.payload.viewId
            )
            if (channel) {
                channel.value = action.payload.value
                channel.setBy = null
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(viewAdded, (state, { payload: view }) => {
                if (isPluginViewType(view.type)) {
                    if (!state.linkableViewIds.includes(view.id)) {
                        state.linkableViewIds.push(view.id)
                        joinChannels(state, view.id)
                    }
                    return
                }
                const dimension = SELECTOR_DIMENSIONS[view.type]
                if (
                    dimension &&
                    !findSelectorChannel(state.channels, view.id)
                ) {
                    createChannel(state, dimension, view.id)
                }
            })
            .addCase(viewRemoved, (state, { payload: viewId }) => {
                state.linkableViewIds = state.linkableViewIds.filter(
                    (id) => id !== viewId
                )
                leaveChannels(state, viewId)
            })
    },
    selectors: {
        selectChannels: (state) => state.channels,
    },
})

export const { dataClicked, selectorValueChanged } = interactionsSlice.actions
export const { selectChannels } = interactionsSlice.selectors
