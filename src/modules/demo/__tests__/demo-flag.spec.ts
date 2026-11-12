import { isDemoMode } from '@modules/demo/demo-flag'
import { describe, expect, it } from 'vitest'

describe('isDemoMode', () => {
    it('is on with ?demo, with or without a value, among other parameters', () => {
        expect(isDemoMode('?demo')).toBe(true)
        expect(isDemoMode('?demo=1')).toBe(true)
        expect(isDemoMode('?lang=fr&demo')).toBe(true)
    })

    it('is off otherwise', () => {
        expect(isDemoMode('')).toBe(false)
        expect(isDemoMode('?demos')).toBe(false)
    })
})
