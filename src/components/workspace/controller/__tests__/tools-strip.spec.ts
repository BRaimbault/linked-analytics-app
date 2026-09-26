import {
    asGroup,
    type FakeGroup,
} from '@components/workspace/__tests__/fake-dockview'
import {
    ADD_VIEWS_PANEL_ID,
    getEdgePosition,
} from '@components/workspace/controller/panels'
import { moveTools } from '@components/workspace/controller/tools-strip'
import { describe, expect, it, vi } from 'vitest'
import { setup } from './controller-fixtures'

describe('moveTools', () => {
    it('moves every tool to the new edge, keeping the open tab', () => {
        const fake = setup()
        const addViews = fake.api.getPanel(ADD_VIEWS_PANEL_ID)
        addViews?.api.setActive()
        addViews?.api.setActive.mockClear()

        moveTools(fake.asApi, 'top', 'left')

        const left = fake.edgeGroups.get('left') as FakeGroup
        expect(left.panels.map(({ id }) => id)).toEqual([ADD_VIEWS_PANEL_ID])
        expect(fake.api.removeEdgeGroup).toHaveBeenCalledWith('top')
        expect(addViews?.api.setActive).toHaveBeenCalledTimes(1)
        expect(left.api.collapse).not.toHaveBeenCalled()
        expect(getEdgePosition(asGroup(left))).toBe('left')
    })

    it('keeps a collapsed strip collapsed', () => {
        const fake = setup()
        fake.toolGroup.api.collapse()

        moveTools(fake.asApi, 'top', 'bottom')

        expect(
            (fake.edgeGroups.get('bottom') as FakeGroup).api.collapse
        ).toHaveBeenCalled()
    })

    it('does nothing without a strip to move, a new edge or a target', () => {
        const fake = setup()

        moveTools(fake.asApi, 'left', 'top')
        moveTools(fake.asApi, 'top', 'top')
        const getGroup = vi
            .spyOn(fake.api, 'getGroup')
            .mockImplementation((id) =>
                id === fake.toolGroup.id ? fake.toolGroup : undefined
            )
        moveTools(fake.asApi, 'top', 'right')
        getGroup.mockRestore()

        expect(fake.api.removeEdgeGroup).not.toHaveBeenCalled()
    })
})
