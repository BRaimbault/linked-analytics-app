/* The period arithmetic links need, for monthly, quarterly and yearly
 * periods in the ISO calendar: what type a period or an axis is, and the
 * periods of one type that make up, or contain, a period of another.
 * Other types and calendars are out of scope: a link then treats the
 * axis as it would a filter. */

export type LinkPeriodType = 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

/* The months a period covers, as months since year 0 */
type Span = { type: LinkPeriodType; first: number; last: number }

const MONTHS_IN: Record<LinkPeriodType, number> = {
    MONTHLY: 1,
    QUARTERLY: 3,
    YEARLY: 12,
}

const PATTERNS: [LinkPeriodType, RegExp][] = [
    ['MONTHLY', /^(\d{4})(\d{2})$/],
    ['QUARTERLY', /^(\d{4})Q([1-4])$/],
    ['YEARLY', /^(\d{4})$/],
]

export const parsePeriod = (id: string): Span | null => {
    for (const [type, pattern] of PATTERNS) {
        const match = pattern.exec(id)
        if (match) {
            const year = Number(match[1])
            const index = type === 'YEARLY' ? 1 : Number(match[2])
            const first = year * 12 + (index - 1) * MONTHS_IN[type]
            return { type, first, last: first + MONTHS_IN[type] - 1 }
        }
    }
    return null
}

const idOf = (type: LinkPeriodType, month: number) => {
    const year = Math.floor(month / 12)
    const inYear = month % 12
    switch (type) {
        case 'MONTHLY':
            return `${year}${String(inYear + 1).padStart(2, '0')}`
        case 'QUARTERLY':
            return `${year}Q${Math.floor(inYear / 3) + 1}`
        default:
            return String(year)
    }
}

const isoDate = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/* A fixed period's first and last days, as ISO dates, e.g. for a raster
 * layer to find its image; null for a type links can't convert */
export const toDateRange = (
    id: string
): { startDate: string; endDate: string } | null => {
    const span = parsePeriod(id)
    if (!span) {
        return null
    }
    const startYear = Math.floor(span.first / 12)
    const endYear = Math.floor(span.last / 12)
    const endMonth = (span.last % 12) + 1
    /* Day 0 of the next month is this month's last */
    const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate()
    return {
        startDate: isoDate(startYear, (span.first % 12) + 1, 1),
        endDate: isoDate(endYear, endMonth, lastDay),
    }
}

/* The type of a period item, fixed or relative (LAST_12_MONTHS is
 * monthly); null for a type links can't convert */
export const getPeriodType = (id: string): LinkPeriodType | null => {
    const fixed = parsePeriod(id)
    if (fixed) {
        return fixed.type
    }
    if (/MONTH/.test(id)) {
        return 'MONTHLY'
    }
    if (/QUARTER/.test(id)) {
        return 'QUARTERLY'
    }
    return /YEAR/.test(id) ? 'YEARLY' : null
}

/* The periods of a type that a selected period stands for on an axis of
 * that type: those within it (a year on a monthly axis: its 12 months),
 * or the one containing it (a month on a yearly axis: its year) */
export const toPeriodType = (
    selectedId: string,
    type: LinkPeriodType
): string[] => {
    const span = parsePeriod(selectedId)
    if (!span) {
        return [selectedId]
    }
    if (MONTHS_IN[type] > MONTHS_IN[span.type]) {
        return [idOf(type, span.first)]
    }
    const ids: string[] = []
    for (let month = span.first; month <= span.last; month += MONTHS_IN[type]) {
        ids.push(idOf(type, month))
    }
    return ids
}
