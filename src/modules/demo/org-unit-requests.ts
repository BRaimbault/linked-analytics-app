import { getChildren, getOrgUnit } from './org-units'

type OrgUnitAnswer =
    | { id: string; path: string; displayName: string }
    | { path: string; children: number }
    | { children: { id: string; path: string; displayName: string }[] }

/* What DHIS2's org unit tree asks for, `organisationUnits/{id}` with one
 * of three field lists, answered from the demo's org units: the unit, the
 * number of its children, or its children */
export const answerOrgUnitRequest = (
    id: string | undefined,
    fields: unknown
): OrgUnitAnswer => {
    const orgUnit = getOrgUnit(id ?? '')
    if (!orgUnit) {
        throw new Error(`No demo org unit ${id}`)
    }
    const asked = [fields].flat().join(',')
    const children = getChildren(orgUnit.id)
    if (asked.includes('children[')) {
        return {
            children: children.map(({ id: childId, path, name }) => ({
                id: childId,
                path,
                displayName: name,
            })),
        }
    }
    if (asked.includes('children::size')) {
        return { path: orgUnit.path, children: children.length }
    }
    return { id: orgUnit.id, path: orgUnit.path, displayName: orgUnit.name }
}
