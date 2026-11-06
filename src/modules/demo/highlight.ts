import { getOrgUnit, ORG_UNITS } from '@modules/demo/org-units'
import { getPeriod, PERIODS } from '@modules/demo/periods'
import type { Highlight } from '@modules/plugins/contract'

/* The fakes' reading of an org unit highlight (docs/interactions.md §2,
 * "Highlight rules"): a highlighted unit that a view doesn't draw shows
 * through the units drawn instead, the one containing it (a chiefdom on a
 * map by district) or the ones it contains (a district on a map by
 * chiefdom). So the highlight takes in the demo's ancestors and
 * descendants of each unit. */
export const withRelatedOrgUnits = (
    highlight: Highlight | undefined
): Highlight | undefined => {
    if (!highlight?.ou?.length) {
        return highlight
    }
    const ids = new Set(highlight.ou)
    for (const id of highlight.ou) {
        for (const ancestor of getOrgUnit(id)?.path.split('/') ?? []) {
            ids.add(ancestor)
        }
        for (const unit of ORG_UNITS) {
            if (unit.path.split('/').includes(id)) {
                ids.add(unit.id)
            }
        }
    }
    ids.delete('')
    return { ...highlight, ou: [...ids] }
}

/* The same for periods: a highlighted month shows through the quarter
 * drawn instead (a table by quarter), and a year through its months */
export const withRelatedPeriods = (
    highlight: Highlight | undefined
): Highlight | undefined => {
    if (!highlight?.pe?.length) {
        return highlight
    }
    const ids = new Set(highlight.pe)
    for (const id of highlight.pe) {
        const period = getPeriod(id)
        if (!period) {
            continue
        }
        for (const other of PERIODS) {
            const contains =
                other.start <= period.start && other.end >= period.end
            const isWithin =
                other.start >= period.start && other.end <= period.end
            if (contains || isWithin) {
                ids.add(other.id)
            }
        }
    }
    return { ...highlight, pe: [...ids] }
}

/* Whether a drawn item marks the highlight: it is highlighted, or holds
 * one that is (the quarter of a highlighted month, the district of a
 * chiefdom), but not one of its parts (a week of the month) */
export const isMarkedBy = (
    highlight: Highlight | undefined,
    { dimension, id }: { dimension: 'ou' | 'pe' | 'dx'; id: string }
): boolean => {
    const ids = highlight?.[dimension] ?? []
    if (ids.includes(id)) {
        return true
    }
    if (dimension === 'ou') {
        return ids.some((highlighted) =>
            getOrgUnit(highlighted)?.path.split('/').includes(id)
        )
    }
    const period = dimension === 'pe' ? getPeriod(id) : undefined
    return Boolean(
        period &&
        ids.some((highlighted) => {
            const inside = getPeriod(highlighted)
            return (
                inside &&
                period.start <= inside.start &&
                period.end >= inside.end
            )
        })
    )
}

export const withRelatedItems = (
    highlight: Highlight | undefined
): Highlight | undefined => withRelatedPeriods(withRelatedOrgUnits(highlight))
