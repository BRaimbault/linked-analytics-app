import { getOrgUnit, ORG_UNITS } from '@modules/demo/org-units'
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
