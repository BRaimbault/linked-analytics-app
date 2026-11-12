import i18n from '@dhis2/d2-i18n'
import { IconLock16, IconLockOpen16, IconSync16 } from '@dhis2/ui'
import type { FC } from 'react'
import classes from './styles/fake-scale-lock.module.css'

/* A scale's lock, for a map's classes or a chart's value axis: fixed, the
 * scale stays as it is through links, drills and periods, and "Refit"
 * fits it once to the data shown; unlocked, it follows the data. The
 * lock's label says the state it's in. */
export const FakeScaleLock: FC<{
    isLocked: boolean
    toggleLock: () => void
    refit: () => void
    tooltips: { locked: string; unlocked: string; refit: string }
    /* Its buttons are `${dataTest}-lock` and `${dataTest}-refit` */
    dataTest: string
    /* Where it sits: the legend's foot, or the chart's header */
    className: string
}> = ({ isLocked, toggleLock, refit, tooltips, dataTest, className }) => (
    <div className={`${classes.tools} ${className}`}>
        <button
            type="button"
            className={classes.button}
            aria-pressed={isLocked}
            title={isLocked ? tooltips.locked : tooltips.unlocked}
            data-test={`${dataTest}-lock`}
            onClick={toggleLock}
        >
            {isLocked ? <IconLock16 /> : <IconLockOpen16 />}
            {isLocked ? i18n.t('Fixed') : i18n.t('Follows data')}
        </button>
        {isLocked && (
            <button
                type="button"
                className={classes.button}
                title={tooltips.refit}
                data-test={`${dataTest}-refit`}
                onClick={refit}
            >
                <IconSync16 />
                {i18n.t('Refit')}
            </button>
        )}
    </div>
)
