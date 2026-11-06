import { getAncestorPaths } from '@modules/selectors/org-unit-tree'
import { describe, expect, it } from 'vitest'

describe('org unit tree', () => {
    it('opens the branches above a unit, and none for a root or nothing', () => {
        expect(getAncestorPaths('/A/B/C')).toEqual(['/A', '/A/B'])
        expect(getAncestorPaths('/A')).toEqual([])
        expect(getAncestorPaths(undefined)).toEqual([])
    })
})
