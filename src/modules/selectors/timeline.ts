import type { LinkItem } from '@modules/interactions/apply-links'

/* Where a timeline's marker sits: the one period its channel holds, when
 * that period is on the track; null otherwise (nothing, several, or
 * another period type, such as a quarter set by a click) */
export const getTimelineIndex = (
    periods: LinkItem[],
    value: LinkItem[]
): number | null => {
    if (value.length !== 1) {
        return null
    }
    const index = periods.findIndex(({ id }) => id === value[0].id)
    return index === -1 ? null : index
}

/* One period back or on, within the track. Off the track, a step goes to
 * its last period back, or its first on. */
export const getStepIndex = (
    index: number | null,
    step: -1 | 1,
    count: number
): number => {
    if (index === null) {
        return step === 1 ? 0 : count - 1
    }
    return Math.min(Math.max(index + step, 0), count - 1)
}

/* Where play goes first: on from the marker, or from the first period
 * when there is none or it stopped at the last */
export const getPlayStartIndex = (
    index: number | null,
    count: number
): number => (index === null || index >= count - 1 ? 0 : index + 1)
