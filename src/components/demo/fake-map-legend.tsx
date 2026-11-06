import i18n from '@dhis2/d2-i18n'
import { IconLock16, IconLockOpen16, IconSync16 } from '@dhis2/ui'
import type { LegendEntry } from '@modules/demo/map-layer'
import type { FC } from 'react'
import classes from './styles/fake-map-legend.module.css'

/* The legend, and, for automatic classes, their lock in a row below:
 * fixed, the classes stay as they are through links, drills and periods,
 * and "Refit" fits them once to the data shown; unlocked, they follow the
 * data. The lock's label says the state it's in. */
export const FakeMapLegend: FC<{
    entries: LegendEntry[]
    canLock: boolean
    isLocked: boolean
    toggleLock: () => void
    refit: () => void
}> = ({ entries, canLock, isLocked, toggleLock, refit }) => {
    const lockTooltip = isLocked
        ? i18n.t(
              'The classes stay as they are. Click to let them follow the data'
          )
        : i18n.t('The classes follow the data. Click to keep them as they are')
    const refitTooltip = i18n.t('Fit the classes to the data shown')

    return (
        <div className={classes.legend} data-test="fake-map-legend">
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
                <div className={classes.tools}>
                    <button
                        type="button"
                        className={classes.button}
                        aria-pressed={isLocked}
                        title={lockTooltip}
                        data-test="fake-map-lock"
                        onClick={toggleLock}
                    >
                        {isLocked ? <IconLock16 /> : <IconLockOpen16 />}
                        {isLocked ? i18n.t('Fixed') : i18n.t('Follows data')}
                    </button>
                    {isLocked && (
                        <button
                            type="button"
                            className={classes.button}
                            title={refitTooltip}
                            data-test="fake-map-refit"
                            onClick={refit}
                        >
                            <IconSync16 />
                            {i18n.t('Refit')}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
