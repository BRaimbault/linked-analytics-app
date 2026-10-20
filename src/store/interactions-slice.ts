import type { LinkItem, OrgUnitDepth } from '@modules/interactions/apply-links'
import {
    findSelectorChannel,
    SELECTOR_DIMENSIONS,
    setValue,
    type ChannelMember,
} from '@modules/interactions/channels'
import { applyClick } from '@modules/interactions/clicks'
import {
    drillDown,
    drillUpTo,
    resetDrill,
    resetFollowersDrills,
    type LinksState,
} from '@modules/interactions/drills'
import {
    createChannel,
    joinChannels,
    moveSelectorToChannel,
    moveViewToChannel,
    removeView,
    setMemberRoles,
    setOrgUnitDepth,
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
    drills: {},
    selectedPoints: {},
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
            const { viewId, ...rest } = action.payload
            applyClick(state, viewId, rest)
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
                setValue(channel, action.payload.value)
                resetFollowersDrills(state, channel, null)
            }
        },
        viewDrilledDown(
            state,
            action: PayloadAction<{ viewId: string; item: LinkItem }>
        ) {
            drillDown(state, action.payload.viewId, action.payload.item)
        },
        viewDrilledUpTo(
            state,
            action: PayloadAction<{ viewId: string; item: LinkItem }>
        ) {
            drillUpTo(state, action.payload.viewId, action.payload.item)
        },
        viewDrillReset(state, action: PayloadAction<string>) {
            resetDrill(state, action.payload)
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
        orgUnitDepthChanged(
            state,
            action: PayloadAction<{ viewId: string; depth: OrgUnitDepth }>
        ) {
            setOrgUnitDepth(state, action.payload.viewId, action.payload.depth)
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
        selectDrills: (state) => state.drills,
    },
})

export const {
    dataClicked,
    selectorValueChanged,
    viewChannelChanged,
    viewRolesChanged,
    orgUnitDepthChanged,
    selectorChannelChanged,
    viewDrilledDown,
    viewDrilledUpTo,
    viewDrillReset,
} = interactionsSlice.actions
export const { selectChannels, selectDrills } = interactionsSlice.selectors

/* What the drill rules read. It's a new object each time, so derive a
 * value that compares by content from it (see useViewLinks) */
export const selectLinksState = (state: {
    interactions: InteractionsState
}): LinksState => ({
    channels: selectChannels(state),
    drills: selectDrills(state),
})
