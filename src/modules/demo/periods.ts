/* The demo's periods: the 24 months up to a fixed demo date, and the
 * quarters and years they fall in. Relative periods resolve against that
 * date, not today's, so a demo shows the same numbers whenever it runs. */

export type PeriodType = 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export type DemoPeriod = {
    /* As DHIS2 writes them: 202608, 2026Q3, 2026 */
    id: string
    name: string
    periodType: PeriodType
    /* The months it covers within the demo's data */
    monthIds: string[]
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

const monthId = ({ year, month }: Month) =>
    `${year}${String(month).padStart(2, '0')}`

const quarterOf = ({ month }: Month) => Math.ceil(month / 3)

const MONTHS: Month[] = Array.from({ length: MONTH_COUNT }, (_, index) =>
    monthsBefore(MONTH_COUNT - 1 - index)
)

const monthPeriods: DemoPeriod[] = MONTHS.map((month) => ({
    id: monthId(month),
    name: `${MONTH_NAMES[month.month - 1]} ${month.year}`,
    periodType: 'MONTHLY',
    monthIds: [monthId(month)],
}))

const groupedPeriods = (
    periodType: PeriodType,
    keyOf: (month: Month) => string,
    nameOf: (month: Month) => string
): DemoPeriod[] => {
    const groups = new Map<string, DemoPeriod>()
    for (const month of MONTHS) {
        const id = keyOf(month)
        const group = groups.get(id) ?? {
            id,
            name: nameOf(month),
            periodType,
            monthIds: [],
        }
        group.monthIds.push(monthId(month))
        groups.set(id, group)
    }
    return [...groups.values()]
}

const quarterPeriods = groupedPeriods(
    'QUARTERLY',
    (month) => `${month.year}Q${quarterOf(month)}`,
    (month) => {
        const first = (quarterOf(month) - 1) * 3
        return `${MONTH_NAMES[first]} - ${MONTH_NAMES[first + 2]} ${month.year}`
    }
)

const yearPeriods = groupedPeriods(
    'YEARLY',
    ({ year }) => String(year),
    ({ year }) => String(year)
)

export const PERIODS: DemoPeriod[] = [
    ...monthPeriods,
    ...quarterPeriods,
    ...yearPeriods,
]

export const MONTH_IDS = MONTHS.map(monthId)

const byId = new Map(PERIODS.map((period) => [period.id, period]))

export const getPeriod = (id: string): DemoPeriod | undefined => byId.get(id)

const lastOf = <T>(items: T[], count: number) => items.slice(-count)

const thisYear = String(DEMO_YEAR)

/* The relative periods the demo knows, each as fixed periods in order. A
 * period the demo's data doesn't reach is left out. */
const RELATIVE_PERIODS: Record<string, () => DemoPeriod[]> = {
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
export const resolvePeriods = (items: string[]): DemoPeriod[] => {
    const periods = items.flatMap((item) => {
        const fixed = byId.get(item)
        return RELATIVE_PERIODS[item]?.() ?? (fixed ? [fixed] : [])
    })
    return [...new Map(periods.map((period) => [period.id, period])).values()]
}
