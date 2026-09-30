import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import { ROOT_ORG_UNIT_ID } from '@modules/demo/org-units'
import { checkPeriods } from '@modules/demo/period-check'
import { describe, expect, it } from 'vitest'

const { anc1, malaria, penta3, populationUnder1, actStock } = DATA_ITEM_IDS
const COUNTRY = ROOT_ORG_UNIT_ID

describe('checkPeriods', () => {
    it('says when an item is collected in longer periods than asked, everywhere', () => {
        expect(checkPeriods([anc1, actStock], [COUNTRY], ['2025W5'])).toEqual([
            {
                dataItem: 'ANC 1st visit',
                collectedIn: 'MONTHLY',
                askedIn: 'WEEKLY',
                places: [],
            },
            {
                dataItem: 'Antimalarial (ACT) stock on hand',
                collectedIn: 'MONTHLY',
                askedIn: 'WEEKLY',
                places: [],
            },
        ])
    })

    it('names the districts left out when only some collect in longer periods', () => {
        expect(checkPeriods([malaria], [COUNTRY], ['2025W5'])).toEqual([
            {
                dataItem: 'Malaria cases confirmed',
                collectedIn: 'MONTHLY',
                askedIn: 'WEEKLY',
                places: ['East', 'South'],
            },
        ])
        /* Asked in the east alone, it's missing everywhere asked */
        expect(
            checkPeriods([malaria], ['DemoEast001'], ['2025W5'])[0].places
        ).toEqual([])
        expect(checkPeriods([malaria], ['DemoNorth01'], ['2025W5'])).toEqual([])
    })

    it('goes by the shortest period asked', () => {
        expect(
            checkPeriods([anc1], [COUNTRY], ['2025', '2025W5'])[0].askedIn
        ).toBe('WEEKLY')
        expect(checkPeriods([anc1], [COUNTRY], ['2025', '202501'])).toEqual([])
    })

    it('checks an indicator by its parts, and lets averaged ones repeat', () => {
        expect(checkPeriods([penta3], [COUNTRY], ['2025W5'])).toEqual([
            expect.objectContaining({
                dataItem: 'Penta 3 coverage <1y',
                collectedIn: 'MONTHLY',
            }),
        ])
        expect(checkPeriods([populationUnder1], [COUNTRY], ['202501'])).toEqual(
            []
        )
    })

    it('has nothing to say without known items, org units or periods', () => {
        expect(
            checkPeriods(['nope', anc1, anc1], [COUNTRY], ['202501'])
        ).toEqual([])
        expect(checkPeriods([anc1], ['nope'], ['2025W5'])).toEqual([])
        expect(checkPeriods([anc1], [COUNTRY], ['nope'])).toEqual([])
    })
})
