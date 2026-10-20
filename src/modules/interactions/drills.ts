import type {
    IncomingLinks,
    LinkItem,
    OrgUnitDepth,
} from '@modules/interactions/apply-links'
import {
    findViewChannel,
    getHighlight,
    getIncomingLinks,
    getOrgUnitDepth,
    setValueFromView,
    type Channel,
} from '@modules/interactions/channels'
import {
    createChannel,
    type InteractionsState,
} from '@modules/interactions/membership'
import type { Highlight } from '@modules/plugins/contract'

/* Drilling a view (docs/interactions.md §5.6), from a right-click on a
 * point or the view's ⋯ menu. A drilled view shows a focus, whatever its
 * channel holds: down into X, X's sub-units; up to P, P's level (P and
 * its siblings, within P's parent; P alone at the top). A drill counts as
 * a click on X or P for the view's channel. */

export type DrillFocus = { item: LinkItem; depth: OrgUnitDepth }

export type Drills = Record<string, DrillFocus>

/* The part of the interactions state these read */
export type LinksState = { channels: Channel[]; drills: Drills }

const pathIds = ({ path }: LinkItem) => path?.split('/').filter(Boolean) ?? []

/* The unit above, from the path; its name is for the caller to find */
export const getParentOf = (item: LinkItem): LinkItem | null => {
    const ids = pathIds(item).slice(0, -1)
    return ids.length
        ? { id: ids.at(-1) as string, path: `/${ids.join('/')}` }
        : null
}

/* Whether a view can drill into an org unit: above the deepest level, and
 * not the one whose sub-units it shows already */
export const canDrillInto = (
    drills: Drills,
    viewId: string,
    { item, orgUnitLevelCount }: { item: LinkItem; orgUnitLevelCount: number }
): boolean => {
    const level = pathIds(item).length
    const focus = drills[viewId]
    const showsItsSubUnits = focus?.item.id === item.id && focus.depth > 0
    return level > 0 && level < orgUnitLevelCount && !showsItsSubUnits
}

/* The org unit the view set by its last click, alone */
const getOwnOrgUnit = (channels: Channel[], viewId: string) => {
    const channel = findViewChannel(channels, viewId, 'ou')
    const [item, ...others] = channel?.setBy === viewId ? channel.value : []
    return others.length ? undefined : item
}

/* What the ⋯ menu offers, from what the view shows: down into the unit it
 * set by a click; up to the level of the unit it's drilled into, or of
 * the parent of the unit it set */
export const getMenuDrillTargets = (
    { channels, drills }: LinksState,
    viewId: string,
    orgUnitLevelCount: number
): { down: LinkItem | null; up: LinkItem | null } => {
    const own = getOwnOrgUnit(channels, viewId)
    const focus = drills[viewId]
    const down =
        own && canDrillInto(drills, viewId, { item: own, orgUnitLevelCount })
            ? own
            : null
    if (focus) {
        return {
            down,
            up: focus.depth > 0 ? focus.item : getParentOf(focus.item),
        }
    }
    return { down, up: own ? getParentOf(own) : null }
}

/* What a view is rewritten with, and what it highlights: a drilled view
 * shows its focus, whatever its channel holds, and doesn't highlight the
 * unit whose sub-units it shows, which it doesn't draw */
export const getViewLinks = (
    { channels, drills }: LinksState,
    viewId: string
): {
    incoming: IncomingLinks
    orgUnitDepth: OrgUnitDepth
    highlight: Highlight | undefined
} => {
    const focus = drills[viewId]
    const incoming = getIncomingLinks(channels, viewId)
    const highlight = getHighlight(channels, viewId)
    if (!focus) {
        return {
            incoming,
            orgUnitDepth: getOrgUnitDepth(channels, viewId),
            highlight,
        }
    }
    return {
        incoming: { ...incoming, ou: [focus.item] },
        orgUnitDepth: focus.depth,
        highlight:
            focus.depth > 0
                ? withoutOrgUnit(highlight, focus.item.id)
                : highlight,
    }
}

/* The changes below apply to the interactions state in place, as the
 * slice's reducers do */

/* A new org unit value is followed again by the views drilled elsewhere,
 * except the one that changed it (`changedBy`, none for a selector),
 * which drills from it, even when its change brought back a value from
 * before that no view set */
export const resetFollowersDrills = (
    state: InteractionsState,
    channel: Channel,
    changedBy: string | null
) => {
    if (channel.dimension !== 'ou') {
        return
    }
    for (const viewId of Object.keys(channel.members)) {
        if (viewId !== changedBy && channel.members[viewId].receive) {
            delete state.drills[viewId]
        }
    }
}

/* A drill counts as a click on the unit the view drills to: a view that
 * sends sets its org unit channel to it, which a first one creates. Back
 * at its saved item, the channel gets back what it held before the view
 * set it; a value set since by others stays. */
const sendDrill = (
    state: InteractionsState,
    viewId: string,
    item: LinkItem | undefined
) => {
    const hasChannel = state.channels.some(
        ({ dimension }) => dimension === 'ou'
    )
    if (item && !hasChannel) {
        createChannel(state, 'ou')
    }
    const channel = findViewChannel(state.channels, viewId, 'ou')
    if (!channel?.members[viewId].send) {
        return
    }
    if (item) {
        setValueFromView(channel, viewId, [item])
    } else if (channel.setBy === viewId) {
        setValueFromView(channel, viewId, [])
    }
    resetFollowersDrills(state, channel, viewId)
}

export const drillDown = (
    state: InteractionsState,
    viewId: string,
    item: LinkItem
) => {
    state.drills[viewId] = { item, depth: 1 }
    sendDrill(state, viewId, item)
}

/* Shows the level of `item`: its parent's sub-units, or itself at the
 * top */
export const drillUpTo = (
    state: InteractionsState,
    viewId: string,
    item: LinkItem
) => {
    const parent = getParentOf(item)
    state.drills[viewId] = parent
        ? { item: parent, depth: 1 }
        : { item, depth: 0 }
    sendDrill(state, viewId, item)
}

export const resetDrill = (state: InteractionsState, viewId: string) => {
    delete state.drills[viewId]
    sendDrill(state, viewId, undefined)
}

/* An empty list would highlight everything, so it goes, and so does a
 * highlight left with nothing */
const withoutOrgUnit = (
    highlight: Highlight | undefined,
    orgUnitId: string
): Highlight | undefined => {
    const rest: Highlight = { ...highlight }
    const ou = highlight?.ou?.filter((id) => id !== orgUnitId) ?? []
    if (ou.length) {
        rest.ou = ou
    } else {
        delete rest.ou
    }
    return Object.values(rest).some((ids) => ids?.length) ? rest : undefined
}
