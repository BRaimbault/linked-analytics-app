import {
    getPlayStartIndex,
    getStepIndex,
    getTimelineIndex,
} from '@modules/selectors/timeline'
import { describe, expect, it } from 'vitest'

const months = ['202601', '202602', '202603'].map((id) => ({ id }))

describe('timeline', () => {
    it('marks the one period its channel holds, when it is on the track', () => {
        expect(getTimelineIndex(months, [{ id: '202602' }])).toBe(1)
        expect(getTimelineIndex(months, [])).toBeNull()
        expect(
            getTimelineIndex(months, [{ id: '202601' }, { id: '202602' }])
        ).toBeNull()
        /* A quarter clicked on a chart */
        expect(getTimelineIndex(months, [{ id: '2026Q1' }])).toBeNull()
    })

    it('steps one period within the track, and onto it from off it', () => {
        expect(getStepIndex(1, 1, 3)).toBe(2)
        expect(getStepIndex(2, 1, 3)).toBe(2)
        expect(getStepIndex(0, -1, 3)).toBe(0)
        expect(getStepIndex(null, 1, 3)).toBe(0)
        expect(getStepIndex(null, -1, 3)).toBe(2)
    })

    it('plays on from the marker, or from the first period', () => {
        expect(getPlayStartIndex(0, 3)).toBe(1)
        expect(getPlayStartIndex(2, 3)).toBe(0)
        expect(getPlayStartIndex(null, 3)).toBe(0)
    })
})
