import { buildDemoRasterLayer } from '@modules/demo/raster-layer'
import type { MapView } from '@modules/visualization/analytical-object'
import { useMemo, useState } from 'react'

/* A raster layer as a map shows it. A linked period with no image of its
 * own, such as a quarter on a monthly layer, keeps the month it showed. */
export const useRasterLayer = (view: MapView | undefined) => {
    const [shownMonthId, setShownMonthId] = useState<string>()
    const layer = useMemo(
        () => (view ? buildDemoRasterLayer(view, shownMonthId) : null),
        [view, shownMonthId]
    )
    if (layer?.monthId && layer.monthId !== shownMonthId) {
        setShownMonthId(layer.monthId)
    }
    return layer
}
