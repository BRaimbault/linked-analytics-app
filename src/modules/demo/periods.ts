import {
    dayOf,
    daysInMonth,
    isoDateOf,
    isoWeekOf,
    mondayOf,
    type Day,
} from './calendar'

/* The demo's periods: the 24 months up to a fixed demo date, the ISO weeks
 * in them, and the quarters and years they fall in, each a range of days.
 * Relative periods resolve against that date, not today's, so a demo shows
 * the same numbers whenever it runs. */

export type PeriodType = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export type DemoPeriod = {
    /* As DHIS2 writes them: 2026W3, 202608, 2026Q3, 2026 */
    id: string
    name: string
    periodType: PeriodType
    /* Its first and last day, both included */
    start: Day
    end: Day
}

export const DEMO_DATE = '2026-08-31'
const MONTH_COUNT = 24

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
]

type Month = { year: number; month: number }

const [DEMO_YEAR, DEMO_MONTH] = DEMO_DATE.split('-').map(Number)

/* The month a number of months before the demo's month */
const monthsBefore = (count: number): Month => {
    const index = DEMO_YEAR * 12 + (DEMO_MONTH - 1) - count
    return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

const MONTHS: Month[] = Array.from({ length: MONTH_COUNT }, (_, index) =>
    monthsBefore(MONTH_COUNT - 1 - index)
)

const monthPeriods: DemoPeriod[] = MONTHS.map(({ year, month }) => {
    const start = dayOf(year, month, 1)
    return {
        id: `${year}${String(month).padStart(2, '0')}`,
        name: `${MONTH_NAMES[month - 1]} ${year}`,
        periodType: 'MONTHLY',
        start,
        end: start + daysInMonth(year, month) - 1,
    }
})

/* The days the demo's data covers: its 24 months */
export const DATA_SPAN = {
    start: monthPeriods[0].start,
    end: monthPeriods[monthPeriods.length - 1].end,
}

/* Whole quarters and years, for those the months fall in */
const unique = (periods: DemoPeriod[]) => [
    ...new Map(periods.map((period) => [period.id, period])).values(),
]

const quarterPeriods = unique(
    MONTHS.map(({ year, month }) => {
        const quarter = Math.ceil(month / 3)
        const first = (quarter - 1) * 3 + 1
        const start = dayOf(year, first, 1)
        const next =
            quarter === 4 ? dayOf(year + 1, 1, 1) : dayOf(year, first + 3, 1)
        return {
            id: `${year}Q${quarter}`,
            name: `${MONTH_NAMES[first - 1]} - ${MONTH_NAMES[first + 1]} ${year}`,
            periodType: 'QUARTERLY' as const,
            start,
            end: next - 1,
        }
    })
)

const yearPeriods = unique(
    MONTHS.map(({ year }) => ({
        id: String(year),
        name: String(year),
        periodType: 'YEARLY' as const,
        start: dayOf(year, 1, 1),
        end: dayOf(year + 1, 1, 1) - 1,
    }))
)

/* The weeks whose Thursday falls in the demo's months: a week counts in
 * the month that holds most of its days */
const weekPeriods: DemoPeriod[] = []
for (
    let monday = mondayOf(DATA_SPAN.start);
    monday <= DATA_SPAN.end;
    monday += 7
) {
    const thursday = monday + 3
    if (thursday >= DATA_SPAN.start && thursday <= DATA_SPAN.end) {
        const { year, week } = isoWeekOf(monday)
        weekPeriods.push({
            id: `${year}W${week}`,
            name: `Week ${week} - ${isoDateOf(monday)} - ${isoDateOf(monday + 6)}`,
            periodType: 'WEEKLY',
            start: monday,
            end: monday + 6,
        })
    }
}

export const PERIODS_BY_TYPE: Record<PeriodType, DemoPeriod[]> = {
    WEEKLY: weekPeriods,
    MONTHLY: monthPeriods,
    QUARTERLY: quarterPeriods,
    YEARLY: yearPeriods,
}

export const PERIODS: DemoPeriod[] = [
    ...weekPeriods,
    ...monthPeriods,
    ...quarterPeriods,
    ...yearPeriods,
]

const byId = new Map(PERIODS.map((period) => [period.id, period]))

export const getPeriod = (id: string): DemoPeriod | undefined => byId.get(id)

export const lengthOf = ({ start, end }: DemoPeriod): number => end - start + 1

const lastOf = <T>(items: T[], count: number) => items.slice(-count)

const thisYear = String(DEMO_YEAR)

/* The relative periods the demo knows, each as fixed periods in order. A
 * period the demo's data doesn't reach is left out: the week holding the
 * demo date ends after it, so the last week is the one before. */
const RELATIVE_PERIODS: Record<string, () => DemoPeriod[]> = {
    LAST_WEEK: () => lastOf(weekPeriods, 1),
    LAST_4_WEEKS: () => lastOf(weekPeriods, 4),
    LAST_12_WEEKS: () => lastOf(weekPeriods, 12),
    LAST_52_WEEKS: () => lastOf(weekPeriods, 52),
    WEEKS_THIS_YEAR: () =>
        weekPeriods.filter(({ id }) => id.startsWith(`${thisYear}W`)),
    THIS_MONTH: () => lastOf(monthPeriods, 1),
    LAST_MONTH: () => lastOf(monthPeriods, 2).slice(0, 1),
    LAST_3_MONTHS: () => lastOf(monthPeriods, 4).slice(0, 3),
    LAST_6_MONTHS: () => lastOf(monthPeriods, 7).slice(0, 6),
    LAST_12_MONTHS: () => lastOf(monthPeriods, 13).slice(0, 12),
    MONTHS_THIS_YEAR: () =>
        monthPeriods.filter(({ id }) => id.startsWith(thisYear)),
    THIS_QUARTER: () => lastOf(quarterPeriods, 1),
    LAST_QUARTER: () => lastOf(quarterPeriods, 2).slice(0, 1),
    LAST_4_QUARTERS: () => lastOf(quarterPeriods, 5).slice(0, 4),
    QUARTERS_THIS_YEAR: () =>
        quarterPeriods.filter(({ id }) => id.startsWith(thisYear)),
    THIS_YEAR: () => lastOf(yearPeriods, 1),
    LAST_YEAR: () => lastOf(yearPeriods, 2).slice(0, 1),
}

export const RELATIVE_PERIOD_IDS = Object.keys(RELATIVE_PERIODS)

const RELATIVE_PERIOD_NAMES: Record<string, string> = {
    LAST_WEEK: 'Last week',
    LAST_4_WEEKS: 'Last 4 weeks',
    LAST_12_WEEKS: 'Last 12 weeks',
    LAST_52_WEEKS: 'Last 52 weeks',
    WEEKS_THIS_YEAR: 'Weeks this year',
    THIS_MONTH: 'This month',
    LAST_MONTH: 'Last month',
    LAST_3_MONTHS: 'Last 3 months',
    LAST_6_MONTHS: 'Last 6 months',
    LAST_12_MONTHS: 'Last 12 months',
    MONTHS_THIS_YEAR: 'Months this year',
    THIS_QUARTER: 'This quarter',
    LAST_QUARTER: 'Last quarter',
    LAST_4_QUARTERS: 'Last 4 quarters',
    QUARTERS_THIS_YEAR: 'Quarters this year',
    THIS_YEAR: 'This year',
    LAST_YEAR: 'Last year',
}

/* How DHIS2 names a period item: a relative one by its own name, not by
 * the periods it stands for */
export const getPeriodItemName = (item: string): string | undefined =>
    RELATIVE_PERIOD_NAMES[item] ?? byId.get(item)?.name

/* The fixed periods an analytics request's pe items stand for, in order,
 * without repeats. Unknown ids are dropped. */
export const resolvePeriods = (items: string[]): DemoPeriod[] =>
    unique(
        items.flatMap((item) => {
            const fixed = byId.get(item)
            return RELATIVE_PERIODS[item]?.() ?? (fixed ? [fixed] : [])
        })
    )
