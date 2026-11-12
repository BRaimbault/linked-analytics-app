import i18n from '@dhis2/d2-i18n'
import type { LegendEntry } from '@modules/demo/map-layer'
import type { FC } from 'react'
import { FakeScaleLock } from './fake-scale-lock'
import classes from './styles/fake-map-legend.module.css'

/* The legend, and, for automatic classes, their lock in a row below */
export const FakeMapLegend: FC<{
    entries: LegendEntry[]
    /* A raster layer's unit, above its classes as in Maps */
    unit?: string
    canLock: boolean
    isLocked: boolean
    toggleLock: () => void
    refit: () => void
}> = ({ entries, unit, canLock, isLocked, toggleLock, refit }) => {
    return (
        <div className={classes.legend} data-test="fake-map-legend">
            {unit && <div className={classes.unit}>{unit}</div>}
            <ul className={classes.entries}>
                {entries.map(({ color, label }) => (
                    <li key={label}>
                        <span
                            className={classes.swatch}
                            style={{ background: color }}
                        />
                        {label}
                    </li>
                ))}
            </ul>
            {canLock && (
                <FakeScaleLock
                    isLocked={isLocked}
                    toggleLock={toggleLock}
                    refit={refit}
                    tooltips={{
                        locked: i18n.t(
                            'The classes stay as they are. Click to let them follow the data'
                        ),
                        unlocked: i18n.t(
                            'The classes follow the data. Click to keep them as they are'
                        ),
                        refit: i18n.t('Fit the classes to the data shown'),
                    }}
                    dataTest="fake-map"
                    className={classes.lock}
                />
            )}
        </div>
    )
}
