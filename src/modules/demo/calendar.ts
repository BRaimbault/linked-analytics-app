/* Dates as whole days since 1 January 1970 (UTC), which makes a period a
 * plain range of days, and ISO weeks: a week starts on Monday, and week 1
 * of a year is the one holding the year's first Thursday. */

export type Day = number

const MS_PER_DAY = 86_400_000

export const dayOf = (year: number, month: number, date: number): Day =>
    Date.UTC(year, month - 1, date) / MS_PER_DAY

export type CalendarDate = { year: number; month: number; date: number }

export const dateOf = (day: Day): CalendarDate => {
    const value = new Date(day * MS_PER_DAY)
    return {
        year: value.getUTCFullYear(),
        month: value.getUTCMonth() + 1,
        date: value.getUTCDate(),
    }
}

/* As DHIS2 writes a date: 2026-01-12 */
export const isoDateOf = (day: Day): string =>
    new Date(day * MS_PER_DAY).toISOString().slice(0, 10)

/* Monday is 0; 1 January 1970 was a Thursday */
const weekdayOf = (day: Day) => (((day + 3) % 7) + 7) % 7

export const mondayOf = (day: Day): Day => day - weekdayOf(day)

/* The ISO week a day falls in: its Thursday decides the year */
export const isoWeekOf = (day: Day): { year: number; week: number } => {
    const thursday = mondayOf(day) + 3
    const { year } = dateOf(thursday)
    return { year, week: Math.floor((thursday - dayOf(year, 1, 1)) / 7) + 1 }
}

export const daysInMonth = (year: number, month: number): number =>
    dayOf(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1) -
    dayOf(year, month, 1)
