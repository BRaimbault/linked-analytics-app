import { getClimateStory } from '@modules/demo/climate-story'
import { getDemoStory } from '@modules/demo/story'
import { describe, expect, it } from 'vitest'

/* The climate tour states these facts in words; if the data changes, they
 * must still hold */
describe('demo climate story', () => {
    const climate = getClimateStory()

    it('has the most rain fall where malaria weighs most, peaking in August', () => {
        expect(climate.wettest.id).toBe(getDemoStory().highest.id)
        expect(climate.peak.name).toBe('August 2025')
        expect(climate.peak.value).toBeGreaterThan(500)
        /* About the yearly rain on the West African coast */
        expect(climate.wettest.yearly).toBeGreaterThan(2500)
        expect(climate.wettest.yearly).toBeLessThan(4000)
    })

    it('has the rainy season bring most of the rain, and the rains cool the land', () => {
        expect(climate.rainySeasonShare).toBeGreaterThan(0.8)
        expect(climate.coolestInRains).toBe(true)
        expect(climate.hottestBeforeRains).toBe(true)
    })
})
