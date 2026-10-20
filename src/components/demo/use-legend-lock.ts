import { buildDemoMapLayer, type ClassRange } from '@modules/demo/map-layer'
import {
    getDimensionItemIds,
    type MapView,
} from '@modules/visualization/analytical-object'
import { useMemo, useState } from 'react'

type LegendLock = {
    /* The saved map and data item whose classes are kept */
    key: string
    range: ClassRange | null
    isLocked: boolean
}

/* A thematic layer's automatic classes, locked by default on those of the
 * map as first drawn (the saved map, unless it came in linked), so links,
 * drills and periods don't change what a color means. Refit fits them to
 * the data shown, and keeps them there; unlocked, they follow the data
 * after every rewrite. A legend set is fixed already: nothing to lock. */
export const useLegendLock = (
    thematic: MapView | undefined,
    mapId: string | undefined
) => {
    const fitted = useMemo(
        () => (thematic ? buildDemoMapLayer(thematic) : null),
        [thematic]
    )
    const fittedRange = fitted?.dataRange ?? null
    const key = JSON.stringify([
        mapId,
        thematic && getDimensionItemIds(thematic, 'dx')[0],
    ])
    const [lock, setLock] = useState<LegendLock>({
        key,
        range: fittedRange,
        isLocked: true,
    })
    /* Another saved map, or another data item, starts locked on its own
     * classes: the old ones mean nothing for it */
    if (lock.key !== key) {
        setLock({ key, range: fittedRange, isLocked: true })
    }

    const lockedRange = lock.isLocked ? lock.range : null
    const layer = useMemo(
        () =>
            thematic && lockedRange
                ? buildDemoMapLayer(thematic, lockedRange)
                : fitted,
        [thematic, lockedRange, fitted]
    )

    return {
        layer,
        canLock: fittedRange !== null,
        isLocked: lock.isLocked,
        /* Locking keeps the classes shown, which fit the data then */
        toggleLock: () =>
            setLock((current) => ({
                ...current,
                range: fittedRange,
                isLocked: !current.isLocked,
            })),
        refit: () => setLock((current) => ({ ...current, range: fittedRange })),
    }
}
