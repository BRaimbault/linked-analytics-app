import { answerOrgUnitRequest } from '@modules/demo/org-unit-requests'
import { describe, expect, it } from 'vitest'

/* The three requests @dhis2/ui's OrganisationUnitTree makes */
describe('demo org unit requests', () => {
    it('answers a root, the number of a unit’s children, and its children', () => {
        expect(
            answerOrgUnitRequest('DemoLand001', ['displayName', 'path', 'id'])
        ).toEqual({
            id: 'DemoLand001',
            path: '/DemoLand001',
            displayName: 'Demoland',
        })
        expect(
            answerOrgUnitRequest('DemoSouth01', ['path', 'children::size'])
        ).toEqual({ path: '/DemoLand001/DemoSouth01', children: 3 })
        expect(
            answerOrgUnitRequest('DemoLand001', 'children[id,path,displayName]')
        ).toEqual({
            children: expect.arrayContaining([
                {
                    id: 'DemoSouth01',
                    path: '/DemoLand001/DemoSouth01',
                    displayName: 'South',
                },
            ]),
        })
    })

    it('fails for a unit the demo lacks, as a server would', () => {
        expect(() => answerOrgUnitRequest('nope', ['path'])).toThrow(
            'No demo org unit nope'
        )
        expect(() => answerOrgUnitRequest(undefined, ['path'])).toThrow()
    })
})
