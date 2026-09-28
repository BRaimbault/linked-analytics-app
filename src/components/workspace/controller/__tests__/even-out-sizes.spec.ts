import { createFakeDockview } from '@components/workspace/__tests__/fake-dockview'
import { evenOutSizes } from '@components/workspace/controller/grid-layout'
import {
    buildTree,
    row,
    view,
} from '@modules/workspace/__tests__/grid-tree-builders'
import { describe, expect, it } from 'vitest'

/* Map 1 | Visualization 1, split 70/30 by the user */
const seventyThirty = () => {
    const fake = createFakeDockview()
    const map = fake.addLaidOutView('map-a', {
        left: 0,
        top: 0,
        width: 840,
        height: 800,
    })
    const vis = fake.addLaidOutView('vis-a', {
        left: 840,
        top: 0,
        width: 360,
        height: 800,
    })
    fake.setLayout(
        buildTree(
            1200,
            800,
            row(1, view(map.group.id, 70), view(vis.group.id, 30))
        )
    )
    return { fake, map }
}

describe('evenOutSizes', () => {
    it('gives the views even sizes', () => {
        const { fake, map } = seventyThirty()

        evenOutSizes(fake.asApi)

        expect(map.group.api.setSize).toHaveBeenCalledWith({ width: 600 })
    })

    it('leaves maximize first, as the grid is hidden then', () => {
        const { fake, map } = seventyThirty()
        fake.setMaximized(true)

        evenOutSizes(fake.asApi)

        expect(fake.api.exitMaximizedGroup).toHaveBeenCalled()
        expect(map.group.api.setSize).toHaveBeenLastCalledWith({ width: 600 })
    })

    it('does nothing while the grid is unmeasured', () => {
        const fake = createFakeDockview()
        const map = fake.addLaidOutView('map-a', {
            left: 0,
            top: 0,
            width: 840,
            height: 800,
        })

        evenOutSizes(fake.asApi)

        expect(map.group.api.setSize).not.toHaveBeenCalled()
    })
})
