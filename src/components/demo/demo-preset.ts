import { addView } from '@components/workspace/controller/add-view'
import { evenOutSizes } from '@components/workspace/controller/grid-layout'
import { collapseTools } from '@components/workspace/controller/settings'
import {
    setViewControl,
    setViewObject,
} from '@components/workspace/controller/views'
import type { WorkspacePreset } from '@components/workspace/workspace-preset'
import i18n from '@dhis2/d2-i18n'
import { DEMO_MAPS, DEMO_VISUALIZATIONS } from '@modules/demo/saved-items'
import type { OrgUnitDepth } from '@modules/interactions/apply-links'
import type { LinkDimension } from '@modules/interactions/channels'
import type { PluginObject } from '@modules/plugins/contract'
import type { SelectorControl } from '@modules/selectors/controls'
import type { ViewType } from '@modules/workspace/view-types'
import {
    highlightOnlyChanged,
    orgUnitDepthChanged,
} from '@store/interactions-slice'
import type { AppDispatch } from '@store/store'
import type { DockviewApi, IDockviewPanel } from 'dockview-react'

const savedItem = <T extends PluginObject>(items: T[], id: string) =>
    items.find((item) => item.id === id) as T

const incidenceByDistrict = savedItem(DEMO_VISUALIZATIONS, 'DemoVisInc1')
const malariaVaccineByChiefdom = savedItem(DEMO_VISUALIZATIONS, 'DemoVisCov1')
const incidenceMap = savedItem(DEMO_MAPS, 'DemoMapInc1')
const climateByMonth = savedItem(DEMO_VISUALIZATIONS, 'DemoVisClm1')
const climateByArea = savedItem(DEMO_VISUALIZATIONS, 'DemoVisClm2')
const climateMap = savedItem(DEMO_MAPS, 'DemoMapClm1')

type PresetView = {
    type: ViewType
    object?: PluginObject
    control?: SelectorControl
    /* Dimensions it follows with "Highlight only", keeping its own */
    highlightsOnly?: LinkDimension[]
    /* "When it follows" for org units, when not the sub-units */
    orgUnitDepth?: OrgUnitDepth
    /* Next to a view added before it; without it, where a click adds it */
    beside?: { index: number; direction: 'left' | 'right' | 'below' }
}

/* One story across the views, read as the tour tells it: malaria weighs
 * most where routine services reach fewest children. Where (the map),
 * when (the chart, right of it), who the visits reach (the table, under
 * the chart); the selectors in a column left of the map, the period
 * timeline and the data selector at their own height and the org unit
 * tree taking the rest. Every view joins the selectors' channels. A
 * district clicked on the map shows its chiefdoms in the chart and the
 * table; a month clicked on the chart sets the map's period. A data item
 * picked shows in every view. */
const DEMO_VIEWS: PresetView[] = [
    { type: 'map', object: incidenceMap },
    /* A trend: it keeps its 12 months and marks the one picked, so play
     * moves a mark along it */
    {
        type: 'visualization',
        object: incidenceByDistrict,
        highlightsOnly: ['pe'],
        beside: { index: 0, direction: 'right' },
    },
    /* It keeps its 4 quarters too, and marks the one holding the month */
    {
        type: 'visualization',
        object: malariaVaccineByChiefdom,
        highlightsOnly: ['pe'],
        beside: { index: 1, direction: 'below' },
    },
    /* Added in the order of their channels' letters: A, B, C */
    {
        type: 'period-selector',
        control: 'timeline',
        beside: { index: 0, direction: 'left' },
    },
    {
        type: 'org-unit-selector',
        control: 'tree',
        beside: { index: 3, direction: 'below' },
    },
    {
        type: 'data-selector',
        beside: { index: 4, direction: 'below' },
    },
]

/* The climate app's Explore in linked views, laid out as the story's: the
 * data item picked in the data selector (Explore's tabs), at the top where
 * it shows, and the place in the tree (its left panel) show in a raster
 * map, a chart by month right of it, and a table of the place's areas by
 * month under the chart. The map keeps every district and marks the place;
 * the chart shows the place itself, the table its areas; both keep their
 * months, marking the one picked. Added in the order of their channels'
 * letters: data A, period B, org unit C. */
const CLIMATE_VIEWS: PresetView[] = [
    { type: 'map', object: climateMap, highlightsOnly: ['ou'] },
    {
        type: 'visualization',
        object: climateByMonth,
        highlightsOnly: ['pe'],
        orgUnitDepth: 0,
        beside: { index: 0, direction: 'right' },
    },
    {
        type: 'visualization',
        object: climateByArea,
        highlightsOnly: ['pe'],
        beside: { index: 1, direction: 'below' },
    },
    {
        type: 'data-selector',
        beside: { index: 0, direction: 'left' },
    },
    {
        type: 'period-selector',
        control: 'timeline',
        beside: { index: 3, direction: 'below' },
    },
    {
        type: 'org-unit-selector',
        control: 'tree',
        beside: { index: 4, direction: 'below' },
    },
]

/* How a view follows its channels, once every view has joined them */
const applyLinkSettings = (
    { highlightsOnly = [], orgUnitDepth }: PresetView,
    viewId: string,
    dispatch: AppDispatch
) => {
    for (const dimension of highlightsOnly) {
        dispatch(
            highlightOnlyChanged({ viewId, dimension, highlightOnly: true })
        )
    }
    if (orgUnitDepth !== undefined) {
        dispatch(orgUnitDepthChanged({ viewId, depth: orgUnitDepth }))
    }
}

/* The tools strip starts folded, so the views have the room: the tour
 * opens it where it shows the tools. The views are placed first, then
 * sized again in the room the folded strip leaves. */
const loadViews =
    (views: PresetView[]) =>
    (api: DockviewApi, dispatch: AppDispatch): void => {
        const viewIds: string[] = []
        for (const { type, object, control, beside } of views) {
            const result = addView(
                api,
                type,
                beside && {
                    placement: {
                        referenceGroup: (
                            api.getPanel(
                                viewIds[beside.index]
                            ) as IDockviewPanel
                        ).group,
                        direction: beside.direction,
                    },
                }
            )
            /* An empty grid has room for every view of the preset */
            const { viewId } = result as { status: 'added'; viewId: string }
            viewIds.push(viewId)
            if (object) {
                setViewObject(api, viewId, object)
            }
            if (control) {
                setViewControl(api, viewId, control)
            }
        }
        views.forEach((view, index) =>
            applyLinkSettings(view, viewIds[index], dispatch)
        )
        collapseTools(api)
        evenOutSizes(api)
    }

export const DEMO_PRESET: WorkspacePreset = {
    load: loadViews(DEMO_VIEWS),
    name: () => i18n.t('Demo'),
    resetLabel: () => i18n.t('Reset the demo'),
    /* Less on screen for a first look; "How it works" shows them */
    viewHeadersHidden: true,
}

/* The climate tour's: the demo still, which Reset brings back */
export const CLIMATE_PRESET: WorkspacePreset = {
    ...DEMO_PRESET,
    load: loadViews(CLIMATE_VIEWS),
}
