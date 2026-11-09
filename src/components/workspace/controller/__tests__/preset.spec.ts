import { getViewPanels } from '@components/workspace/controller/panels'
import {
    hasChangedSincePreset,
    loadPreset,
    markPresetLoaded,
    resetToPreset,
} from '@components/workspace/controller/preset'
import { createStore } from '@store/store'
import { viewHeadersHiddenChanged } from '@store/workspace-settings-slice'
import type { DataEngine } from '@types'
import { describe, expect, it, vi } from 'vitest'
import { setup, twoColumns } from './controller-fixtures'

describe('presets', () => {
    it('load into an empty grid only, as setup runs twice under StrictMode', () => {
        const fake = setup()
        const load = vi.fn()

        loadPreset(fake.asApi, load, fake.dispatch)
        expect(load).toHaveBeenCalledWith(fake.asApi, fake.dispatch)

        twoColumns(fake)
        loadPreset(fake.asApi, load, fake.dispatch)
        expect(load).toHaveBeenCalledTimes(1)
    })

    it('reset by closing every view, leaving maximize first', () => {
        const fake = setup()
        twoColumns(fake)
        fake.setMaximized(true)
        const load = vi.fn(() =>
            expect(getViewPanels(fake.asApi)).toHaveLength(0)
        )

        resetToPreset(fake.asApi, load, fake.dispatch)

        expect(fake.api.exitMaximizedGroup).toHaveBeenCalled()
        expect(load).toHaveBeenCalledTimes(1)
    })

    it('tell whether the user changed what a reset would replace, once loaded', () => {
        const fake = setup()
        twoColumns(fake)
        const store = createStore({} as DataEngine)
        const changed = () =>
            hasChangedSincePreset(fake.asApi, store.getState())
        expect(changed()).toBe(false)

        markPresetLoaded(fake.asApi, store.getState())
        expect(changed()).toBe(false)

        store.dispatch(viewHeadersHiddenChanged(true))
        expect(changed()).toBe(true)
        markPresetLoaded(fake.asApi, store.getState())

        const map = fake.asApi.getPanel('map-a') as { params: object }
        map.params = { ...map.params, text: 'Notes' }
        expect(changed()).toBe(true)
    })

    it('reset without leaving maximize when no view is maximized', () => {
        const fake = setup()

        resetToPreset(fake.asApi, vi.fn(), fake.dispatch)

        expect(fake.api.exitMaximizedGroup).not.toHaveBeenCalled()
    })
})
