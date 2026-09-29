import type { LinkItem } from '@modules/interactions/apply-links'
import {
    findSelectorChannel,
    findViewChannel,
    getClickedItems,
    LINK_DIMENSIONS,
    SELECTOR_DIMENSIONS,
    toggleValue,
    type ChannelMember,
} from '@modules/interactions/channels'
import {
    createChannel,
    joinChannels,
    moveSelectorToChannel,
    moveViewToChannel,
    removeView,
    setMemberRoles,
    type ChannelChoice,
    type InteractionsState,
    type ViewLink,
} from '@modules/interactions/membership'
import type { DataClick } from '@modules/plugins/contract'
import { isPluginViewType } from '@modules/workspace/view-types'
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { viewAdded, viewRemoved } from './workspace-slice'

const initialState: InteractionsState = {
    channels: [],
    linkableViews: [],
    detached: {},
}

/* The channels between views (docs/interactions.md §4) */
export const interactionsSlice = createSlice({
    name: 'interactions',
    initialState,
    reducers: {
        /* The first click on a dimension that has no channel creates one,
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
            if (!state.linkableViews.some(({ id }) => id === viewId)) {
                return
            }
            const items = getClickedItems(click)
            for (const dimension of LINK_DIMENSIONS) {
                const item = items[dimension]
                const hasChannel = state.channels.some(
                    (channel) => channel.dimension === dimension
                )
                if (item && !hasChannel) {
                    createChannel(state, dimension)
                }
                const channel = findViewChannel(
                    state.channels,
                    viewId,
                    dimension
                )
                if (item && channel?.members[viewId].send) {
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
        viewChannelChanged(
            state,
            action: PayloadAction<ViewLink & { choice: ChannelChoice }>
        ) {
            const { choice, ...link } = action.payload
            moveViewToChannel(state, link, choice)
        },
        viewRolesChanged(
            state,
            action: PayloadAction<ViewLink & { roles: ChannelMember }>
        ) {
            const { roles, ...link } = action.payload
            setMemberRoles(state, link, roles)
        },
        selectorChannelChanged(
            state,
            action: PayloadAction<{
                viewId: string
                choice: { label: string } | 'new'
            }>
        ) {
            moveSelectorToChannel(
                state,
                action.payload.viewId,
                action.payload.choice
            )
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(viewAdded, (state, { payload: view }) => {
                if (isPluginViewType(view.type)) {
                    if (!state.linkableViews.some(({ id }) => id === view.id)) {
                        const linkable = { id: view.id, type: view.type }
                        state.linkableViews.push(linkable)
                        joinChannels(state, linkable)
                    }
                    return
                }
                const dimension = SELECTOR_DIMENSIONS[view.type]
                if (
                    dimension &&
                    !findSelectorChannel(state.channels, view.id)
                ) {
                    createChannel(state, dimension, { selectorViewId: view.id })
                }
            })
            .addCase(viewRemoved, (state, { payload: viewId }) => {
                removeView(state, viewId)
            })
    },
    selectors: {
        selectChannels: (state) => state.channels,
    },
})

export const {
    dataClicked,
    selectorValueChanged,
    viewChannelChanged,
    viewRolesChanged,
    selectorChannelChanged,
} = interactionsSlice.actions
export const { selectChannels } = interactionsSlice.selectors
