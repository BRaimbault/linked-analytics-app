import type { ViewSizes } from '@modules/workspace/grid-tree'
import { getSelectorPlacement } from '@modules/workspace/selector-placement'
import { canAddView, getNextViewNumber } from '@modules/workspace/view-limits'
import {
    getViewKind,
    getViewTitle,
    getViewTypeSizes,
    type ViewType,
} from '@modules/workspace/view-types'
import type {
    AddPanelPositionOptions,
    DockviewApi,
    DockviewGroupPanel,
} from 'dockview-react'
import { expectLayoutChange, readGridTree } from './grid-layout'
import {
    getViewGroups,
    getViewPanels,
    toWorkspaceView,
    VIEW_COMPONENT,
    type ViewPanelParams,
} from './panels'
import { hasRoomToSplit } from './room'

/* A click adds the view next to the selected one (or the last one), to its
 * right or else below it, in the first cell with room for a split. The
 * tools strip takes focus when its tile is clicked, so the selected view
 * comes from the caller. Returns null when no cell has room. */
const getDefaultPlacement = (
    api: DockviewApi,
    nextToViewId: string | null,
    placedSizes: ViewSizes
): AddPanelPositionOptions | null => {
    const groups = getViewGroups(api)
    if (!groups.length) {
        return { direction: 'right' }
    }
    const preferred =
        (nextToViewId && api.getPanel(nextToViewId)?.group) || groups.at(-1)
    const candidates = [
        preferred,
        ...groups
            .filter((group) => group !== preferred)
            .sort(
                (a, b) =>
                    b.api.width * b.api.height - a.api.width * a.api.height
            ),
    ].filter((group): group is DockviewGroupPanel => Boolean(group))

    for (const group of candidates) {
        if (hasRoomToSplit(group, 'horizontal', placedSizes)) {
            return { referenceGroup: group, direction: 'right' }
        }
        if (hasRoomToSplit(group, 'vertical', placedSizes)) {
            return { referenceGroup: group, direction: 'below' }
        }
    }
    return null
}

/* A clicked selector joins the bar of selectors across the top, or starts
 * one (see getSelectorPlacement); it is a new line either way */
const getSelectorPosition = (
    api: DockviewApi,
    sizes: ViewSizes
): AddPanelPositionOptions | null => {
    const tree = readGridTree(api)
    const placement = tree && getSelectorPlacement(tree, sizes)
    if (!placement) {
        return null
    }
    return 'edge' in placement
        ? { direction: 'above' }
        : { referenceGroup: placement.referenceId, direction: 'right' }
}

export type AddViewResult =
    | { status: 'added'; viewId: string }
    | { status: 'full' }
    | { status: 'no-room' }

const getReferenceGroupId = (
    position: AddPanelPositionOptions
): string | null => {
    if (!('referenceGroup' in position) || !position.referenceGroup) {
        return null
    }
    const reference = position.referenceGroup
    return typeof reference === 'string' ? reference : reference.id
}

export const addView = (
    api: DockviewApi,
    type: ViewType,
    {
        placement,
        nextToViewId = null,
        sizing,
    }: {
        placement?: AddPanelPositionOptions
        nextToViewId?: string | null
        /* A split halves the reference cell; an insert adds a new line.
         * Defaults to a split when there is a reference cell. */
        sizing?: 'split' | 'insert'
    } = {}
): AddViewResult => {
    const views = getViewPanels(api).map(toWorkspaceView)
    if (!canAddView(type, views)) {
        return { status: 'full' }
    }
    const sizes = getViewTypeSizes(type)
    const selectorPosition =
        placement || getViewKind(type) !== 'selector'
            ? null
            : getSelectorPosition(api, sizes)
    const position =
        placement ??
        selectorPosition ??
        getDefaultPlacement(api, nextToViewId, sizes)
    if (!position) {
        return { status: 'no-room' }
    }
    const number = getNextViewNumber(type, views)
    const params: ViewPanelParams = { type, number }
    const viewId = `${type}-${crypto.randomUUID()}`
    const targetGroupId = getReferenceGroupId(position)
    expectLayoutChange(
        api,
        targetGroupId && sizing !== 'insert' && !selectorPosition
            ? { kind: 'split', viewId, targetGroupId }
            : { kind: 'insert', viewId }
    )
    api.addPanel({
        id: viewId,
        component: VIEW_COMPONENT,
        title: getViewTitle(type, number),
        params,
        renderer: 'always',
        position,
        minimumWidth: sizes.min.width,
        minimumHeight: sizes.min.height,
    })
    return { status: 'added', viewId }
}
