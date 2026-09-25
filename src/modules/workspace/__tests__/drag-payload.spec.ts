import { describe, expect, it } from 'vitest'
import { decodeViewDrag, encodeViewDrag } from '../drag-payload'

describe('view drag payload', () => {
    it('round-trips each view type', () => {
        expect(decodeViewDrag(encodeViewDrag('map'))).toBe('map')
        expect(decodeViewDrag(encodeViewDrag('visualization'))).toBe(
            'visualization'
        )
    })

    it('ignores missing, malformed or foreign payloads', () => {
        expect(decodeViewDrag(undefined)).toBeNull()
        expect(decodeViewDrag('')).toBeNull()
        expect(decodeViewDrag('not json')).toBeNull()
        expect(decodeViewDrag('null')).toBeNull()
        expect(decodeViewDrag(JSON.stringify({ type: 'table' }))).toBeNull()
        expect(decodeViewDrag(JSON.stringify(['map']))).toBeNull()
    })
})
