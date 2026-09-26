import { asPanel } from '@components/workspace/__tests__/fake-dockview'
import {
    SwapSpacer,
    swapViews,
    swapViewsById,
} from '@components/workspace/controller/swap-views'
import { describe, expect, it } from 'vitest'
import { setup, twoColumns } from './controller-fixtures'

describe('swapping', () => {
    it('moves the two views through temporary spacers and selects the dragged one', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const mapCell = map.group
        const visCell = vis.group

        swapViews(fake.asApi, asPanel(map), asPanel(vis))

        expect(map.group).toBe(visCell)
        expect(vis.group).toBe(mapCell)
        expect(fake.api.removePanel).toHaveBeenCalledTimes(2)
        expect(map.api.setActive).toHaveBeenCalled()
        expect(SwapSpacer()).toBeNull()
    })

    it('does nothing for views in the same cell or views that are gone', () => {
        const fake = setup()
        const [map] = twoColumns(fake)

        swapViews(fake.asApi, asPanel(map), asPanel(map))
        swapViewsById(fake.asApi, 'map-a', 'gone')

        expect(map.api.moveTo).not.toHaveBeenCalled()
    })

    it('swaps by id', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const visCell = vis.group

        swapViewsById(fake.asApi, 'map-a', 'vis-a')

        expect(map.group).toBe(visCell)
    })
})
