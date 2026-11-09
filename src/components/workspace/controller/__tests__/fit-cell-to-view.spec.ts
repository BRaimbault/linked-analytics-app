import { fitCellToView } from '@components/workspace/controller/grid-layout'
import {
    buildTree,
    column,
    view,
} from '@modules/workspace/__tests__/grid-tree-builders'
import { describe, expect, it } from 'vitest'
import { setup } from './controller-fixtures'

/* An org unit selector 400px tall over a map, in an 800px grid */
const selectorOverMap = () => {
    const fake = setup()
    const selector = fake.addLaidOutView(
        'ou',
        { left: 0, top: 0, width: 1200, height: 400 },
        { type: 'org-unit-selector' }
    )
    const map = fake.addLaidOutView('map', {
        left: 0,
        top: 400,
        width: 1200,
        height: 400,
    })
    fake.setLayout(
        buildTree(
            1200,
            800,
            column(1, view(selector.group.id, 400), view(map.group.id, 400))
        )
    )
    return { fake, selector }
}

describe('fitCellToView', () => {
    it('gives a selector that became a drop-down its height back, its header included', () => {
        const { fake, selector } = selectorOverMap()
        selector.params = {
            ...(selector.params as object),
            control: 'drop-down',
        }

        fitCellToView(fake.asApi, 'ou')

        expect(selector.group.api.setSize).toHaveBeenLastCalledWith({
            height: 61 + 35,
        })
    })

    it('leaves the grid alone for a view that is gone', () => {
        const { fake, selector } = selectorOverMap()

        fitCellToView(fake.asApi, 'gone')

        expect(selector.group.api.setSize).not.toHaveBeenCalled()
    })
})
