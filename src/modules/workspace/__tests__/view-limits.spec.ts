import { describe, expect, it } from 'vitest'
import {
    canAddView,
    getNextViewNumber,
    getViewLimitMessage,
    MAX_PLUGIN_VIEWS,
} from '../view-limits'

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

    it('explains each limit', () => {
        expect(getViewLimitMessage('map')).toBe(
            'A workspace holds up to 4 maps and visualizations'
        )
        expect(getViewLimitMessage('org-unit-selector')).toBe(
            'A workspace holds at most one more org unit selector than it has maps and visualizations'
        )
    })
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
