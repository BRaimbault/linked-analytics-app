import { ADD_VIEWS_PANEL_ID } from '@components/workspace/controller/panels'
import {
    hasChangedSincePreset,
    markPresetLoaded,
    resetToPreset,
} from '@components/workspace/controller/preset'
import { useWorkspaceApi } from '@components/workspace/workspace-api-context'
import {
    applyPresetSettings,
    type WorkspacePreset,
} from '@components/workspace/workspace-preset'
import { useAppDispatch, useAppSelector, useAppStore } from '@hooks'
import { getDataItem } from '@modules/demo/data-items'
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
import { useCallback, useEffect, useRef, useState, type FC } from 'react'
import { startDemoTour, type DemoTourHandle } from './run-tour'
import { createTemperatureViews } from './temperature-views'
import { afterLayout } from './tour-dom'
import { TourResetConfirm } from './tour-reset-confirm'
import type { TourViews } from './tour-steps'
import { TOURS } from './tours'
import type { TourRequest } from './use-tour-request'

/* The preset's views, once they're all in the grid */
export const findTourViews = (views: WorkspaceView[]): TourViews | null => {
    const ofType = (type: WorkspaceView['type']) =>
        views.filter((view) => view.type === type).map(({ id }) => id)
    const [chart, table] = ofType('visualization')
    const [map] = ofType('map')
    const [orgUnitSelector] = ofType('org-unit-selector')
    const [periodSelector] = ofType('period-selector')
    const [dataSelector] = ofType('data-selector')
    const ids = {
        chart,
        table,
        map,
        orgUnitSelector,
        periodSelector,
        dataSelector,
    }
    return Object.values(ids).every(Boolean) ? ids : null
}

/* Starts the tour asked for, each time a new request comes, from its
 * preset: the steps point at its views. The workspace then keeps that
 * preset, which "Reset the demo" brings back. */
export const DemoTour: FC<{
    request: TourRequest | null
    onStart: () => void
    onPresetLoad: (preset: WorkspacePreset) => void
}> = ({ request, onStart, onPresetLoad }) => {
    const api = useWorkspaceApi()
    const views = useAppSelector(selectViews)
    const dispatch = useAppDispatch()
    const store = useAppStore()
    const handledId = useRef(0)
    const tourRef = useRef<DemoTourHandle | null>(null)
    const [waiting, setWaiting] = useState<{
        api: DockviewApi
        request: TourRequest
    } | null>(null)
    const [confirming, setConfirming] = useState<TourRequest | null>(null)

    const startFromPreset = useCallback(
        (workspaceApi: DockviewApi, tourRequest: TourRequest) => {
            const { preset } = TOURS[tourRequest.kind]
            applyPresetSettings(dispatch, preset)
            resetToPreset(workspaceApi, preset.load, dispatch)
            markPresetLoaded(workspaceApi, store.getState())
            onPresetLoad(preset)
            setWaiting({ api: workspaceApi, request: tourRequest })
        },
        [dispatch, store, onPresetLoad]
    )

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
        /* A running tour leaves the demo as it found it */
        tourRef.current?.close()
        if (hasChangedSincePreset(api, store.getState())) {
            setConfirming(request)
            return
        }
        startFromPreset(api, request)
    }, [api, request, views, store, startFromPreset])

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
                dataPick: {
                    get: () => channelOf('dx').value[0]?.id ?? null,
                    set: (dataItemId) =>
                        dispatch(
                            selectorValueChanged({
                                viewId: tourViews.dataSelector,
                                value: dataItemId
                                    ? [
                                          {
                                              id: dataItemId,
                                              name: getDataItem(dataItemId)
                                                  ?.name,
                                          },
                                      ]
                                    : [],
                            })
                        ),
                },
                temperatureViews: createTemperatureViews(
                    waiting.api,
                    dispatch,
                    { mapViewId: tourViews.map, tableViewId: tourViews.table }
                ),
                /* What the tour left counts as the preset: the next tour
                 * doesn't ask before replacing it */
                onFinish: () => markPresetLoaded(waiting.api, store.getState()),
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

    return confirming && api ? (
        <TourResetConfirm
            onStart={() => {
                setConfirming(null)
                startFromPreset(api, confirming)
            }}
            onCancel={() => setConfirming(null)}
        />
    ) : null
}
