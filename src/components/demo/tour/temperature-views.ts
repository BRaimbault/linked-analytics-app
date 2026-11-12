import { addView } from '@components/workspace/controller/add-view'
import {
    closeView,
    getViewObject,
    setViewObject,
} from '@components/workspace/controller/views'
import { DEMO_MAPS, DEMO_VISUALIZATIONS } from '@modules/demo/saved-items'
import type { PluginObject } from '@modules/plugins/contract'
import {
    highlightOnlyChanged,
    viewChannelChanged,
} from '@store/interactions-slice'
import type { AppDispatch } from '@store/store'
import type { DockviewApi, IDockviewPanel } from 'dockview-react'

const savedItem = (items: PluginObject[], id: string) =>
    items.find((item) => item.id === id) as PluginObject

const temperatureMap = savedItem(DEMO_MAPS, 'DemoMapTmp1')
const TEMPERATURE_CHART = savedItem(DEMO_VISUALIZATIONS, 'DemoVisTmp1')

/* What the climate tour shows to compare precipitation and temperature:
 * - a temperature map below the preset's map, as Add views would add it,
 *   which marks the place picked, as the first one does, and leaves the
 *   data channel, so it keeps temperature whatever is picked;
 * - the temperature chart in the table's place, as its settings tab would
 *   pick it; it compares three data items, so a pick of another leaves it
 *   as it is. Hidden, the table comes back. */
export const createTemperatureViews = (
    api: DockviewApi,
    dispatch: AppDispatch,
    { mapViewId, tableViewId }: { mapViewId: string; tableViewId: string }
) => {
    let addedMapId: string | null = null
    const table = getViewObject(api, tableViewId) as PluginObject

    const map = {
        isShown: () => addedMapId !== null,
        show: () => {
            const result = addView(api, 'map', {
                placement: {
                    referenceGroup: (api.getPanel(mapViewId) as IDockviewPanel)
                        .group,
                    direction: 'below',
                },
            })
            if (result.status !== 'added') {
                return
            }
            const viewId = result.viewId
            addedMapId = viewId
            setViewObject(api, viewId, temperatureMap)
            dispatch(
                viewChannelChanged({ viewId, dimension: 'dx', choice: 'none' })
            )
            dispatch(
                highlightOnlyChanged({
                    viewId,
                    dimension: 'ou',
                    highlightOnly: true,
                })
            )
        },
        hide: () => {
            if (addedMapId !== null) {
                closeView(api, addedMapId)
                addedMapId = null
            }
        },
    }

    const isChartShown = () =>
        getViewObject(api, tableViewId)?.id === TEMPERATURE_CHART.id
    const chart = {
        /* As the table's saved item picker names it */
        name: TEMPERATURE_CHART.name as string,
        isShown: isChartShown,
        show: () => setViewObject(api, tableViewId, TEMPERATURE_CHART),
        hide: () => {
            if (isChartShown()) {
                setViewObject(api, tableViewId, table)
            }
        },
    }

    return { map, chart }
}
