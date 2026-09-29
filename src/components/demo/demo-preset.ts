import { addView } from '@components/workspace/controller/add-view'
import { setViewObject } from '@components/workspace/controller/views'
import type { WorkspacePreset } from '@components/workspace/workspace-preset'
import i18n from '@dhis2/d2-i18n'
import { DEMO_MAPS, DEMO_VISUALIZATIONS } from '@modules/demo/saved-items'
import type { PluginObject } from '@modules/plugins/contract'
import type { ViewType } from '@modules/workspace/view-types'
import type { DockviewApi } from 'dockview-react'

const [ancVisits, , pentaByChiefdom] = DEMO_VISUALIZATIONS
const [, malariaByDistrict] = DEMO_MAPS

/* Added as clicks would add them: a chart, then a map beside it, then a
 * pivot table under the chart (a click halves the first largest cell),
 * and the selectors in a bar across the top. Every view joins the
 * selectors' channels. A district clicked on the map filters the chart
 * and the table; a month clicked on the chart sets the map's period, and
 * the table's quarter. */
const DEMO_VIEWS: { type: ViewType; object?: PluginObject }[] = [
    { type: 'visualization', object: ancVisits },
    { type: 'map', object: malariaByDistrict },
    { type: 'visualization', object: pentaByChiefdom },
    { type: 'period-selector' },
    { type: 'org-unit-selector' },
]

const loadDemoViews = (api: DockviewApi): void => {
    for (const { type, object } of DEMO_VIEWS) {
        const result = addView(api, type)
        if (result.status === 'added' && object) {
            setViewObject(api, result.viewId, object)
        }
    }
}

export const DEMO_PRESET: WorkspacePreset = {
    load: loadDemoViews,
    name: () => i18n.t('Demo'),
    resetLabel: () => i18n.t('Reset the demo'),
}
