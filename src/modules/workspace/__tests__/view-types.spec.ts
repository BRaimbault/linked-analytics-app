import { PLUGIN_SIZES } from '@modules/workspace/grid-tree'
import {
    getViewKind,
    getViewTitle,
    getViewTypeLabel,
    getViewTypeSizes,
    isViewType,
    PLUGIN_VIEW_TYPES,
    VIEW_TYPES,
} from '@modules/workspace/view-types'
import { describe, expect, it } from 'vitest'

describe('view types', () => {
    it('knows each type, and nothing else', () => {
        expect(VIEW_TYPES).toEqual([
            'map',
            'visualization',
            'period-selector',
            'org-unit-selector',
            'data-selector',
            'text',
        ])
        expect(isViewType('org-unit-selector')).toBe(true)
        expect(isViewType('table')).toBe(false)
        expect(isViewType('toString')).toBe(false)
        expect(isViewType(1)).toBe(false)
    })

    it('labels and numbers each type', () => {
        expect(VIEW_TYPES.map(getViewTypeLabel)).toEqual([
            'Map',
            'Visualization',
            'Period',
            'Org unit',
            'Data',
            'Text',
        ])
        expect(VIEW_TYPES.map((type) => getViewTitle(type, 2))).toEqual([
            'Map 2',
            'Visualization 2',
            'Period 2',
            'Org unit 2',
            'Data 2',
            'Text 2',
        ])
    })

    it('tells plugins, selectors and text apart', () => {
        expect(VIEW_TYPES.map(getViewKind)).toEqual([
            'plugin',
            'plugin',
            'selector',
            'selector',
            'selector',
            'text',
        ])
        expect(
            VIEW_TYPES.filter((type) => getViewKind(type) === 'plugin')
        ).toEqual([...PLUGIN_VIEW_TYPES])
    })

    it('gives plugins a share of the grid and selectors a size of their own', () => {
        expect(getViewTypeSizes('map')).toBe(PLUGIN_SIZES)
        const selector = getViewTypeSizes('org-unit-selector')

        expect(selector.min.height).toBeLessThan(PLUGIN_SIZES.min.height)
        expect(selector.preferred?.height).toBeGreaterThan(selector.min.height)
    })
})
