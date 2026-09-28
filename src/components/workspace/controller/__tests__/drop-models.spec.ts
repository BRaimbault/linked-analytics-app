import {
    getDropOverlayModel,
    getOuterEdgeDropModel,
} from '@components/workspace/controller/drop-models'
import { describe, expect, it, vi } from 'vitest'

describe('getOuterEdgeDropModel', () => {
    const pointer = (primary: 'coarse' | 'fine') =>
        vi.stubGlobal('matchMedia', (query: string) => ({
            matches: query === `(pointer: ${primary})`,
        }))

    it('keeps dockview’s outer edges on a touch screen, where drags use pointer events', () => {
        pointer('coarse')

        expect(getOuterEdgeDropModel()).toEqual(
            expect.objectContaining({ activationSize: expect.any(Object) })
        )
    })

    it('leaves the outer edges to the insert zones for a mouse, or without media queries', () => {
        pointer('fine')
        expect(getOuterEdgeDropModel()).toBe(false)

        vi.stubGlobal('matchMedia', undefined)
        expect(getOuterEdgeDropModel()).toBe(false)
    })
})

describe('getDropOverlayModel', () => {
    it('widens the drop zones inside a cell, and leaves the others to dockview', () => {
        expect(getDropOverlayModel({ location: 'content' } as never)).toEqual({
            activationSize: { type: 'percentage', value: 33 },
        })
        expect(
            getDropOverlayModel({ location: 'tab' } as never)
        ).toBeUndefined()
    })
})
