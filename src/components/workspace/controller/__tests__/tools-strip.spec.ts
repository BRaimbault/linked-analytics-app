import {
    asGroup,
    type FakeGroup,
} from '@components/workspace/__tests__/fake-dockview'
import {
    ADD_VIEWS_PANEL_ID,
    getEdgePosition,
    WORKSPACE_PANEL_ID,
} from '@components/workspace/controller/panels'
import { moveTools } from '@components/workspace/controller/tools-strip'
import {
    buildTree,
    row,
    view,
} from '@modules/workspace/__tests__/grid-tree-builders'
import { describe, expect, it, vi } from 'vitest'
import { setup, twoColumns } from './controller-fixtures'

describe('moveTools', () => {
    it('keeps the proportions the user gave the views', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(
                1200,
                800,
                row(1, view(map.group.id, 70), view(vis.group.id, 30))
            )
        )
        /* The strip now takes width at the left, and dockview spreads the
         * views evenly across what is left */
        fake.changeLayoutTo(() =>
            buildTree(1040, 835, row(1, view(map.group.id), view(vis.group.id)))
        )

        moveTools(fake.asApi, 'top', 'left')

        expect(map.group.api.setSize).toHaveBeenCalledWith({ width: 728 })
    })

    it('moves every tool to the new edge, keeping the open tab', () => {
        const fake = setup()
        const addViews = fake.api.getPanel(ADD_VIEWS_PANEL_ID)
        addViews?.api.setActive()
        addViews?.api.setActive.mockClear()

        moveTools(fake.asApi, 'top', 'left')

        const left = fake.edgeGroups.get('left') as FakeGroup
        expect(left.panels.map(({ id }) => id)).toEqual([
            WORKSPACE_PANEL_ID,
            ADD_VIEWS_PANEL_ID,
        ])
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

    it('does nothing without a strip at that edge', () => {
        const fake = setup()

        moveTools(fake.asApi, 'left', 'top')

        expect(fake.api.removeEdgeGroup).not.toHaveBeenCalled()
    })

    it('does nothing when the strip is already at that edge', () => {
        const fake = setup()

        moveTools(fake.asApi, 'top', 'top')

        expect(fake.api.removeEdgeGroup).not.toHaveBeenCalled()
    })

    it('does nothing when the new edge group can’t be found', () => {
        const fake = setup()
        vi.spyOn(fake.api, 'getGroup').mockImplementation((id) =>
            id === fake.toolGroup.id ? fake.toolGroup : undefined
        )

        moveTools(fake.asApi, 'top', 'right')

        expect(fake.api.removeEdgeGroup).not.toHaveBeenCalled()
    })
})
