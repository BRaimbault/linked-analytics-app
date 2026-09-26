import { asGroup } from '@components/workspace/__tests__/fake-dockview'
import { getEdgePosition } from '@components/workspace/controller/panels'
import { setupWorkspace } from '@components/workspace/controller/setup-workspace'
import { describe, expect, it, vi } from 'vitest'
import { setup, titles, twoColumns } from './controller-fixtures'

describe('setupWorkspace', () => {
    it('adds the tools once and removes every listener on cleanup', () => {
        const fake = setup()
        const addCalls = fake.api.addPanel.mock.calls.length

        const second = setupWorkspace(fake.asApi, vi.fn(), titles)
        second()
        fake.cleanup()

        expect(fake.api.addPanel).toHaveBeenCalledTimes(addCalls)
        expect(fake.listenerCount()).toBe(0)
    })

    it('reads the grid edge of a group', () => {
        const fake = setup()
        const [map] = twoColumns(fake)

        expect(getEdgePosition(asGroup(map.group))).toBeNull()
        expect(getEdgePosition(asGroup(fake.toolGroup))).toBe('top')
    })
})
