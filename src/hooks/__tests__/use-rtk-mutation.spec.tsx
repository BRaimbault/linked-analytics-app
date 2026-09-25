import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRtkMutation } from '..'
import { createStoreWrapper } from './create-store-wrapper'

describe('useRtkMutation', () => {
    it('sends the mutation and returns the response', async () => {
        const createDashboard = vi.fn().mockReturnValue({ uid: 'abc123' })
        const { result } = renderHook(() => useRtkMutation(), {
            wrapper: createStoreWrapper({ dashboards: createDashboard }),
        })

        act(() => {
            const [mutate] = result.current
            mutate({
                type: 'create',
                resource: 'dashboards',
                data: { name: 'Malaria' },
            })
        })

        await waitFor(() => expect(result.current[1].isSuccess).toBe(true))
        expect(result.current[1].data).toEqual({ uid: 'abc123' })
        expect(createDashboard).toHaveBeenCalledWith(
            'create',
            expect.objectContaining({ data: { name: 'Malaria' } }),
            expect.anything()
        )
    })
})
