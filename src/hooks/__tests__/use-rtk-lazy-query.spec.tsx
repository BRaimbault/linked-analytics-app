import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRtkLazyQuery } from '../use-rtk-lazy-query'
import { createStoreWrapper } from './create-store-wrapper'

describe('useRtkLazyQuery', () => {
    it('does not fetch until triggered', () => {
        const { result } = renderHook(() => useRtkLazyQuery(), {
            wrapper: createStoreWrapper({ me: { name: 'John Traore' } }),
        })

        const [, state] = result.current
        expect(state.isUninitialized).toBe(true)
        expect(state.data).toBeUndefined()
    })

    it('returns the data once triggered', async () => {
        const { result } = renderHook(
            () => useRtkLazyQuery<{ name: string }>(),
            { wrapper: createStoreWrapper({ me: { name: 'John Traore' } }) }
        )

        act(() => {
            const [trigger] = result.current
            trigger({ resource: 'me' })
        })

        await waitFor(() => expect(result.current[1].isSuccess).toBe(true))
        expect(result.current[1].data).toEqual({ name: 'John Traore' })
    })

    it('returns a parsed error when the request fails', async () => {
        const { result } = renderHook(() => useRtkLazyQuery(), {
            wrapper: createStoreWrapper({
                me: () => {
                    throw new Error('Server unreachable')
                },
            }),
        })

        act(() => {
            const [trigger] = result.current
            trigger({ resource: 'me' })
        })

        await waitFor(() => expect(result.current[1].isError).toBe(true))
        expect(result.current[1].error).toEqual({
            type: 'runtime',
            message: 'Server unreachable',
        })
    })
})
