import type { DemoTable } from '@modules/demo/analytics'
import {
    getDimensionItemIds,
    type VisualizationObject,
} from '@modules/visualization/analytical-object'
import { useState } from 'react'
import { fitAxis } from './value-axis'

type AxisLock = {
    /* The saved chart and data items whose axis is kept */
    key: string
    max: number
    isLocked: boolean
}

/* A chart's value axis. It follows the data by default, as DV draws it;
 * fixed, it keeps its top through links, drills and periods, so values
 * compare from one place to the next, and "Refit" fits it once to the
 * data shown. Another saved chart or data item starts on its own axis,
 * as the old one means nothing for it, and keeps the lock as it was. */
export const useAxisLock = (
    table: DemoTable,
    visualization: VisualizationObject
) => {
    const fitted = fitAxis(table)
    const key = JSON.stringify([
        visualization.id,
        getDimensionItemIds(visualization, 'dx'),
    ])
    const [lock, setLock] = useState<AxisLock>({
        key,
        max: fitted,
        isLocked: false,
    })
    if (lock.key !== key) {
        setLock({ key, max: fitted, isLocked: lock.isLocked })
    }

    return {
        axisMax: lock.isLocked ? lock.max : undefined,
        isLocked: lock.isLocked,
        /* Locking keeps the axis shown, which fits the data then */
        toggleLock: () =>
            setLock((current) => ({
                ...current,
                max: fitted,
                isLocked: !current.isLocked,
            })),
        refit: () => setLock((current) => ({ ...current, max: fitted })),
    }
}
