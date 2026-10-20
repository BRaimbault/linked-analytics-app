import { getViewPanels } from '@components/workspace/controller/panels'
import {
    loadPreset,
    resetToPreset,
} from '@components/workspace/controller/preset'
import { describe, expect, it, vi } from 'vitest'
import { setup, twoColumns } from './controller-fixtures'

describe('presets', () => {
    it('load into an empty grid only, as setup runs twice under StrictMode', () => {
        const fake = setup()
        const load = vi.fn()

        loadPreset(fake.asApi, load)
        expect(load).toHaveBeenCalledWith(fake.asApi)

        twoColumns(fake)
        loadPreset(fake.asApi, load)
        expect(load).toHaveBeenCalledTimes(1)
    })

    it('reset by closing every view, leaving maximize first', () => {
        const fake = setup()
        twoColumns(fake)
        fake.setMaximized(true)
        const load = vi.fn(() =>
            expect(getViewPanels(fake.asApi)).toHaveLength(0)
        )

        resetToPreset(fake.asApi, load)

        expect(fake.api.exitMaximizedGroup).toHaveBeenCalled()
        expect(load).toHaveBeenCalledTimes(1)
    })

    it('reset without leaving maximize when no view is maximized', () => {
        const fake = setup()

        resetToPreset(fake.asApi, vi.fn())

        expect(fake.api.exitMaximizedGroup).not.toHaveBeenCalled()
    })
})
