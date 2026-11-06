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
import type { LinkDimension } from '@modules/interactions/channels'
import type { PluginObject } from '@modules/plugins/contract'
import type { SelectorControl } from '@modules/selectors/controls'
import type { ViewType } from '@modules/workspace/view-types'
import { highlightOnlyChanged } from '@store/interactions-slice'
import type { AppDispatch } from '@store/store'
import type { DockviewApi, IDockviewPanel } from 'dockview-react'

const savedItem = <T extends PluginObject>(items: T[], id: string) =>
    items.find((item) => item.id === id) as T

const incidenceByDistrict = savedItem(DEMO_VISUALIZATIONS, 'DemoVisInc1')
const malariaVaccineByChiefdom = savedItem(DEMO_VISUALIZATIONS, 'DemoVisCov1')
const incidenceMap = savedItem(DEMO_MAPS, 'DemoMapInc1')

type PresetView = {
    type: ViewType
    object?: PluginObject
    control?: SelectorControl
    /* Dimensions it follows with "Highlight only", keeping its own */
    highlightsOnly?: LinkDimension[]
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

/* The tools strip starts folded, so the views have the room: the tour
 * opens it where it shows the tools. The views are placed first, then
 * sized again in the room the folded strip leaves. */
const loadDemoViews = (api: DockviewApi, dispatch: AppDispatch): void => {
    const viewIds: string[] = []
    for (const { type, object, control, beside } of DEMO_VIEWS) {
        const result = addView(
            api,
            type,
            beside && {
                placement: {
                    referenceGroup: (
                        api.getPanel(viewIds[beside.index]) as IDockviewPanel
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
    /* Once every view has joined the selectors' channels */
    DEMO_VIEWS.forEach(({ highlightsOnly = [] }, index) => {
        for (const dimension of highlightsOnly) {
            dispatch(
                highlightOnlyChanged({
                    viewId: viewIds[index],
                    dimension,
                    highlightOnly: true,
                })
            )
        }
    })
    collapseTools(api)
    evenOutSizes(api)
}

export const DEMO_PRESET: WorkspacePreset = {
    load: loadDemoViews,
    name: () => i18n.t('Demo'),
    resetLabel: () => i18n.t('Reset the demo'),
    /* Less on screen for a first look; "How it works" shows them */
    viewHeadersHidden: true,
}
