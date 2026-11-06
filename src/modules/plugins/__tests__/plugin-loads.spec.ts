import { createPluginLoads } from '@modules/plugins/plugin-loads'
import { describe, expect, it, vi } from 'vitest'

describe('plugin loads', () => {
    it('settles once every view given has drawn after the call', async () => {
        const loads = createPluginLoads()
        const settled = vi.fn()
        loads.reportLoaded('map')
        void loads.waitForLoads(['map', 'chart'], 10_000).then(settled)

        loads.reportLoaded('map')
        await Promise.resolve()
        expect(settled).not.toHaveBeenCalled()

        loads.reportLoaded('chart')
        await vi.waitFor(() => expect(settled).toHaveBeenCalled())
    })

    it('settles after the timeout for a view that never says, and at once with none to wait for', async () => {
        vi.useFakeTimers()
        const loads = createPluginLoads()
        const settled = vi.fn()
        void loads.waitForLoads(['table'], 4000).then(settled)

        await vi.advanceTimersByTimeAsync(3999)
        expect(settled).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(settled).toHaveBeenCalled()
        vi.useRealTimers()

        await expect(loads.waitForLoads([], 4000)).resolves.toBeUndefined()
    })
})
