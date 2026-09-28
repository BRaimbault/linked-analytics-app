import { asPanel } from '@components/workspace/__tests__/fake-dockview'
import { addViewSettingsPanel } from '@components/workspace/controller/settings'
import {
    swapViews,
    swapViewsById,
} from '@components/workspace/controller/swap-views'
import { SwapSpacer } from '@components/workspace/panels/swap-spacer'
import { describe, expect, it } from 'vitest'
import { setup, twoColumns } from './controller-fixtures'

describe('swapping', () => {
    it('moves the two views through temporary spacers and selects the dragged one', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const mapCell = map.group
        const visCell = vis.group

        addViewSettingsPanel(fake.asApi, asPanel(map))

        const selected = swapViews(fake.asApi, asPanel(map), asPanel(vis))

        expect(map.group).toBe(visCell)
        expect(vis.group).toBe(mapCell)
        expect(fake.api.removePanel).toHaveBeenCalledTimes(2)
        expect(map.api.setActive).toHaveBeenCalled()
        /* Its settings came forward, so it's the one to select */
        expect(selected).toBe('map-a')
    })

    it('has no view to select when the dragged one has no settings tab', () => {
        const fake = setup()
        /* Laid out without events, so without settings tabs */
        const [map, vis] = twoColumns(fake)

        expect(swapViews(fake.asApi, asPanel(map), asPanel(vis))).toBeNull()
    })

    it('leaves every size as it was, even while a cell holds its spacer', () => {
        const fake = setup()
        const first = fake.addLaidOutView(
            'ou-a',
            { left: 0, top: 0, width: 500, height: 120 },
            { type: 'org-unit-selector' }
        )
        const second = fake.addLaidOutView(
            'pe-a',
            { left: 500, top: 0, width: 500, height: 120 },
            { type: 'period-selector' }
        )
        const map = fake.addLaidOutView('map-a', {
            left: 0,
            top: 120,
            width: 1000,
            height: 580,
        })
        /* A selector bar, 120px high, above a map */
        fake.setLayout({
            orientation: 'VERTICAL',
            width: 1000,
            height: 700,
            root: {
                type: 'branch',
                size: 1000,
                children: [
                    {
                        type: 'branch',
                        size: 120,
                        children: [
                            { type: 'leaf', id: first.group.id, size: 500 },
                            { type: 'leaf', id: second.group.id, size: 500 },
                        ],
                    },
                    { type: 'leaf', id: map.group.id, size: 580 },
                ],
            },
        })

        swapViews(fake.asApi, asPanel(first), asPanel(second))

        for (const group of fake.groups) {
            expect(group.api.setSize).not.toHaveBeenCalled()
        }
    })

    it('renders nothing for a spacer, which is gone before it paints', () => {
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
