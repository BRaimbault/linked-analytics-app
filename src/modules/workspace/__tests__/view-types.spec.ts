import { describe, expect, it } from 'vitest'
import { PLUGIN_SIZES } from '../grid-tree'
import {
    getViewKind,
    getViewTitle,
    getViewTypeLabel,
    getViewTypeSizes,
    isViewType,
    PLUGIN_VIEW_TYPES,
    VIEW_TYPES,
} from '../view-types'

describe('view types', () => {
    it('knows each type, and nothing else', () => {
        expect(VIEW_TYPES).toEqual([
            'map',
            'visualization',
            'period-selector',
            'org-unit-selector',
            'data-selector',
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
        ])
        expect(VIEW_TYPES.map((type) => getViewTitle(type, 2))).toEqual([
            'Map 2',
            'Visualization 2',
            'Period selector 2',
            'Org unit selector 2',
            'Data selector 2',
        ])
    })

    it('tells plugins from selectors', () => {
        expect(VIEW_TYPES.map(getViewKind)).toEqual([
            'plugin',
            'plugin',
            'selector',
            'selector',
            'selector',
        ])
        expect(
            VIEW_TYPES.filter((type) => getViewKind(type) === 'plugin')
        ).toEqual([...PLUGIN_VIEW_TYPES])
    })

    it('gives plugins a share of the grid and selectors a size of their own', () => {
        expect(getViewTypeSizes('map')).toBe(PLUGIN_SIZES)
        const selector = getViewTypeSizes('org-unit-selector')

        expect(selector.min.height).toBeLessThan(PLUGIN_SIZES.min.height)
        expect(selector.max).toEqual({
            width: (selector.preferred?.width ?? 0) * 2,
            height: (selector.preferred?.height ?? 0) * 2,
        })
    })
})
