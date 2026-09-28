import { createFakeDockview } from '@components/workspace/__tests__/fake-dockview'
import { getWorkspaceMinimumSize } from '@components/workspace/controller/minimum-size'
import { describe, expect, it } from 'vitest'

describe('getWorkspaceMinimumSize', () => {
    it('is the grid’s minimum when there is no tools strip', () => {
        const fake = createFakeDockview()
        fake.api.minimumWidth = 480
        fake.api.minimumHeight = 160

        expect(getWorkspaceMinimumSize(fake.asApi)).toEqual({
            width: 480,
            height: 160,
        })
    })

    it.each([
        ['top', { width: 480, height: 292 }],
        ['bottom', { width: 480, height: 292 }],
        ['left', { width: 760, height: 160 }],
        ['right', { width: 760, height: 160 }],
    ] as const)(
        'adds the tools strip at the %s along its axis',
        (position, expected) => {
            const fake = createFakeDockview()
            fake.api.minimumWidth = 480
            fake.api.minimumHeight = 160
            fake.api.addEdgeGroup(position, { id: `tools-${position}` })
            const strip = fake.edgeGroups.get(position)
            Object.assign(strip?.api ?? {}, { width: 280, height: 132 })

            expect(getWorkspaceMinimumSize(fake.asApi)).toEqual(expected)
        }
    )
})
