import { asPanel } from '@components/workspace/__tests__/fake-dockview'
import {
    getEdgePlacements,
    moveViewToEdge,
} from '@components/workspace/controller/move-to-edge'
import {
    buildTree,
    column,
    row,
    view,
} from '@modules/workspace/__tests__/grid-tree-builders'
import { describe, expect, it } from 'vitest'
import { setup, twoColumns } from './controller-fixtures'

/* Map | Visualization, 1000px wide and as high as given */
const sideBySide = (height: number) => {
    const fake = setup()
    const [map, vis] = twoColumns(fake)
    fake.setLayout(
        buildTree(1000, height, row(1, view(map.group.id), view(vis.group.id)))
    )
    return { fake, map, vis }
}

describe('moving a view to the grid’s edge', () => {
    it('offers every edge but the one the view already runs along', () => {
        const { fake, map, vis } = sideBySide(800)

        expect(getEdgePlacements(fake.asApi, asPanel(map))).toEqual([
            'top',
            'bottom',
            'right',
        ])
        expect(getEdgePlacements(fake.asApi, asPanel(vis))).toEqual([
            'top',
            'bottom',
            'left',
        ])
    })

    it('offers no edge without room for a new line there', () => {
        /* A new row would leave each view under its 160px */
        const { fake, map } = sideBySide(300)

        expect(getEdgePlacements(fake.asApi, asPanel(map))).toEqual(['right'])
    })

    it('offers nothing while a view is maximized', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(
                1000,
                800,
                column(1, view(map.group.id), view(vis.group.id))
            )
        )
        fake.setMaximized(true)

        expect(getEdgePlacements(fake.asApi, asPanel(map))).toEqual([])
    })

    it('moves the view’s cell to the edge', () => {
        const { fake, map } = sideBySide(800)

        moveViewToEdge(fake.asApi, asPanel(map), 'bottom')

        expect(map.group.api.moveTo).toHaveBeenCalledWith({
            position: 'bottom',
        })
    })
})
