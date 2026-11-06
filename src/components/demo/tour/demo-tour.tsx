import { ADD_VIEWS_PANEL_ID } from '@components/workspace/controller/panels'
import { resetToPreset } from '@components/workspace/controller/preset'
import { useWorkspaceApi } from '@components/workspace/workspace-api-context'
import {
    applyPresetSettings,
    useWorkspacePreset,
    type WorkspacePreset,
} from '@components/workspace/workspace-preset'
import { useAppDispatch, useAppSelector, useAppStore } from '@hooks'
import { getOrgUnit, type DemoOrgUnit } from '@modules/demo/org-units'
import type { Channel, LinkDimension } from '@modules/interactions/channels'
import {
    selectChannels,
    selectDrills,
    selectorValueChanged,
    viewDrilledDown,
    viewDrillReset,
} from '@store/interactions-slice'
import {
    selectViewHeadersHidden,
    viewHeadersHiddenChanged,
} from '@store/workspace-settings-slice'
import { selectViews, type WorkspaceView } from '@store/workspace-slice'
import type { DockviewApi } from 'dockview-react'
import { useEffect, useRef, useState, type FC } from 'react'
import { afterLayout, startDemoTour, type DemoTourHandle } from './run-tour'
import type { TourViews } from './tour-steps'
import type { TourRequest } from './use-tour-request'

/* The preset's views, once they're all in the grid */
export const findTourViews = (views: WorkspaceView[]): TourViews | null => {
    const ofType = (type: WorkspaceView['type']) =>
        views.filter((view) => view.type === type).map(({ id }) => id)
    const [chart, table] = ofType('visualization')
    const [map] = ofType('map')
    const [orgUnitSelector] = ofType('org-unit-selector')
    const [periodSelector] = ofType('period-selector')
    const ids = { chart, table, map, orgUnitSelector, periodSelector }
    return Object.values(ids).every(Boolean) ? ids : null
}

/* Starts the tour asked for, each time a new request comes, from the
 * demo's preset: the steps point at its views */
export const DemoTour: FC<{
    request: TourRequest | null
    onStart: () => void
}> = ({ request, onStart }) => {
    const api = useWorkspaceApi()
    const preset = useWorkspacePreset() as WorkspacePreset
    const views = useAppSelector(selectViews)
    const dispatch = useAppDispatch()
    const store = useAppStore()
    const handledId = useRef(0)
    const tourRef = useRef<DemoTourHandle | null>(null)
    const [waiting, setWaiting] = useState<{
        api: DockviewApi
        request: TourRequest
    } | null>(null)

    /* A child's effects run before the workspace's own, which connect
     * dockview to the store and load the preset: wait for its tools, and
     * try again as views come in */
    useEffect(() => {
        if (
            !api?.getPanel(ADD_VIEWS_PANEL_ID) ||
            !request ||
            request.id === handledId.current
        ) {
            return
        }
        handledId.current = request.id
        tourRef.current?.close()
        resetToPreset(api, preset.load, dispatch)
        applyPresetSettings(dispatch, preset)
        setWaiting({ api, request })
    }, [api, preset, request, views, dispatch])

    useEffect(() => {
        const tourViews = findTourViews(views)
        if (!waiting || !tourViews) {
            return
        }
        setWaiting(null)
        /* The preset has one channel per dimension, its selectors' */
        const channelOf = (dimension: LinkDimension) =>
            selectChannels(store.getState()).find(
                (channel) => channel.dimension === dimension
            ) as Channel
        afterLayout(() => {
            tourRef.current = startDemoTour({
                kind: waiting.request.kind,
                api: waiting.api,
                views: tourViews,
                channels: {
                    orgUnit: channelOf('ou').label,
                    period: channelOf('pe').label,
                },
                getSelectedOrgUnitIds: () =>
                    channelOf('ou').value.map(({ id }) => id),
                subscribe: store.subscribe,
                clearDistrict: () =>
                    dispatch(
                        selectorValueChanged({
                            viewId: tourViews.orgUnitSelector,
                            value: [],
                        })
                    ),
                clearSelections: () => {
                    for (const viewId of Object.keys(
                        selectDrills(store.getState())
                    )) {
                        dispatch(viewDrillReset(viewId))
                    }
                    for (const view of selectViews(store.getState())) {
                        if (view.kind === 'selector') {
                            dispatch(
                                selectorValueChanged({
                                    viewId: view.id,
                                    value: [],
                                })
                            )
                        }
                    }
                },
                mapDrill: {
                    getDrilledId: () =>
                        selectDrills(store.getState())[tourViews.map]?.item
                            .id ?? null,
                    drillInto: (orgUnitId) => {
                        const { id, name, path } = getOrgUnit(
                            orgUnitId
                        ) as DemoOrgUnit
                        dispatch(
                            viewDrilledDown({
                                viewId: tourViews.map,
                                item: { id, name, path },
                            })
                        )
                    },
                    reset: () => dispatch(viewDrillReset(tourViews.map)),
                },
                viewHeaders: {
                    isHidden: () => selectViewHeadersHidden(store.getState()),
                    setHidden: (hidden) =>
                        dispatch(viewHeadersHiddenChanged(hidden)),
                },
            })
            onStart()
        })
    }, [waiting, views, store, dispatch, onStart])

    useEffect(() => () => tourRef.current?.closeQuietly(), [])

    return null
}
