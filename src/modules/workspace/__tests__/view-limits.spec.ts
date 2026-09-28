import {
    canAddView,
    getNextViewNumber,
    getViewLimitMessage,
    MAX_PLUGIN_VIEWS,
    MAX_SELECTORS_PER_TYPE,
} from '@modules/workspace/view-limits'
import { describe, expect, it } from 'vitest'

describe('canAddView', () => {
    const maps = (count: number) =>
        Array.from({ length: count }, () => ({ type: 'map' as const }))
    const selectors = (count: number) =>
        Array.from({ length: count }, () => ({
            type: 'org-unit-selector' as const,
        }))

    it('allows plugin views up to the maximum', () => {
        expect(canAddView('map', [])).toBe(true)
        expect(canAddView('visualization', maps(MAX_PLUGIN_VIEWS - 1))).toBe(
            true
        )
        expect(canAddView('map', maps(MAX_PLUGIN_VIEWS))).toBe(false)
    })

    it('does not count selectors toward the plugin limit', () => {
        expect(
            canAddView('map', [...maps(MAX_PLUGIN_VIEWS - 1), ...selectors(3)])
        ).toBe(true)
    })

    it('allows at most one more selector of a type than there are plugins', () => {
        expect(canAddView('org-unit-selector', [])).toBe(true)
        expect(canAddView('org-unit-selector', selectors(1))).toBe(false)
        expect(
            canAddView('org-unit-selector', [...maps(2), ...selectors(2)])
        ).toBe(true)
        expect(
            canAddView('org-unit-selector', [...maps(2), ...selectors(3)])
        ).toBe(false)
    })

    it('never allows more than the maximum of a selector type', () => {
        const allPlugins = maps(MAX_PLUGIN_VIEWS)

        expect(
            canAddView('org-unit-selector', [
                ...allPlugins,
                ...selectors(MAX_SELECTORS_PER_TYPE - 1),
            ])
        ).toBe(true)
        expect(
            canAddView('org-unit-selector', [
                ...allPlugins,
                ...selectors(MAX_SELECTORS_PER_TYPE),
            ])
        ).toBe(false)
        expect(
            canAddView('period-selector', [
                ...allPlugins,
                ...selectors(MAX_SELECTORS_PER_TYPE),
            ])
        ).toBe(true)
    })

    it('has no cap for text views: the room in the grid limits them', () => {
        const texts = Array.from({ length: 12 }, () => ({
            type: 'text' as const,
        }))

        expect(canAddView('text', [...maps(MAX_PLUGIN_VIEWS), ...texts])).toBe(
            true
        )
    })

    it('explains each limit', () => {
        expect(getViewLimitMessage('map', maps(MAX_PLUGIN_VIEWS))).toBe(
            'A workspace holds up to 4 maps and visualizations'
        )
    })

    /* Whole sentences per type, so they translate */
    it.each([
        ['period-selector', 'period'],
        ['org-unit-selector', 'org unit'],
        ['data-selector', 'data'],
    ] as const)(
        'explains each limit of a %s in its own sentence',
        (type, noun) => {
            const ofType = (count: number) =>
                Array.from({ length: count }, () => ({ type }))

            expect(getViewLimitMessage(type, [...maps(1), ...ofType(2)])).toBe(
                `A workspace holds at most one more ${noun} selector than it has maps and visualizations`
            )
            expect(
                getViewLimitMessage(type, [
                    ...maps(MAX_PLUGIN_VIEWS),
                    ...ofType(MAX_SELECTORS_PER_TYPE),
                ])
            ).toBe(`A workspace holds up to 4 ${noun} selectors`)
        }
    )
})

describe('getNextViewNumber', () => {
    it('starts at 1 for each type', () => {
        expect(getNextViewNumber('map', [])).toBe(1)
        expect(
            getNextViewNumber('visualization', [{ type: 'map', number: 1 }])
        ).toBe(1)
    })

    it('reuses the lowest free number', () => {
        const views = [
            { type: 'map' as const, number: 1 },
            { type: 'map' as const, number: 3 },
        ]
        expect(getNextViewNumber('map', views)).toBe(2)
    })
})
