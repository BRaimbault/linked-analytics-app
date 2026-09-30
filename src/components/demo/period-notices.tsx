import i18n from '@dhis2/d2-i18n'
import type { PeriodNotice } from '@modules/demo/period-check'
import type { PeriodType } from '@modules/demo/periods'
import type { FC } from 'react'
import classes from './styles/period-notices.module.css'

const TYPE_NAMES: Record<PeriodType, () => string> = {
    WEEKLY: () => i18n.t('weekly'),
    MONTHLY: () => i18n.t('monthly'),
    QUARTERLY: () => i18n.t('quarterly'),
    YEARLY: () => i18n.t('yearly'),
}

export const describeNotice = ({
    dataItem,
    collectedIn,
    askedIn,
    places,
}: PeriodNotice): string => {
    const values = {
        item: dataItem,
        collected: TYPE_NAMES[collectedIn](),
        asked: TYPE_NAMES[askedIn](),
        places: places.join(', '),
        interpolation: { escapeValue: false },
    }
    return places.length
        ? i18n.t(
              '{{item}} is collected {{collected}} in {{places}}, which have no {{asked}} values.',
              values
          )
        : i18n.t(
              'No {{asked}} values for {{item}}, which is collected {{collected}}.',
              values
          )
}

/* Why a fake plugin shows fewer values than asked, as the proposed
 * @dhis2/analytics feature would let DV and Maps say it */
export const PeriodNotices: FC<{
    notices: PeriodNotice[]
    className?: string
}> = ({ notices, className }) =>
    notices.length ? (
        <div
            role="note"
            className={`${classes.notices} ${className ?? ''}`}
            data-test="period-notices"
        >
            {notices.map((notice) => {
                const text = describeNotice(notice)
                return (
                    <p key={text} className={classes.notice} title={text}>
                        {text}
                    </p>
                )
            })}
        </div>
    ) : null
