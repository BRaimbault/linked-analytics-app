import {
    findDimension,
    getDimensionItemIds,
} from '@modules/visualization/analytical-object'
import { describe, expect, it } from 'vitest'

const object = {
    columns: [{ dimension: 'dx', items: [{ id: 'a' }, { id: 'b' }] }],
    rows: [{ dimension: 'pe', items: [{ id: 'LAST_MONTH' }] }],
    filters: [{ dimension: 'ou', items: [{ id: 'USER_ORGUNIT' }] }],
}

describe('analytical objects', () => {
    it('finds a dimension wherever it sits: columns, rows or filters', () => {
        expect(findDimension(object, 'pe')).toBe(object.rows[0])
        expect(getDimensionItemIds(object, 'dx')).toEqual(['a', 'b'])
        expect(getDimensionItemIds(object, 'ou')).toEqual(['USER_ORGUNIT'])
    })

    it('has no items for a dimension the object doesn’t use', () => {
        expect(findDimension(object, 'Xyz')).toBeUndefined()
        expect(getDimensionItemIds(object, 'Xyz')).toEqual([])
    })
})
