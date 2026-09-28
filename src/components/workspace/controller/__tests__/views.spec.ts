import {
    closeView,
    getTargetViewId,
    markHoveredView,
} from '@components/workspace/controller/views'
import { describe, expect, it } from 'vitest'
import { setup, twoColumns } from './controller-fixtures'

describe('closeView', () => {
    it('closes a view, and does nothing for one that is gone', () => {
        const fake = setup()
        const [map] = twoColumns(fake)

        closeView(fake.asApi, 'gone')
        closeView(fake.asApi, map.id)

        expect(fake.api.removePanel).toHaveBeenCalledTimes(1)
        expect(fake.api.getPanel(map.id)).toBeUndefined()
    })
})

describe('markHoveredView', () => {
    it('marks the cell of the view under the pointer, and no other', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const body = document.createElement('div')
        body.setAttribute('data-view-id', map.id)

        markHoveredView(fake.asApi, body)

        expect(map.group.element.toggleAttribute).toHaveBeenLastCalledWith(
            'data-hovered',
            true
        )
        expect(vis.group.element.toggleAttribute).toHaveBeenLastCalledWith(
            'data-hovered',
            false
        )

        markHoveredView(fake.asApi, null)
        expect(map.group.element.toggleAttribute).toHaveBeenLastCalledWith(
            'data-hovered',
            false
        )

        /* Before the workspace is ready */
        expect(() => markHoveredView(null, body)).not.toThrow()
    })
})

describe('getTargetViewId', () => {
    it('finds the view from its body or its tab, and none elsewhere', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const body = document.createElement('div')
        body.setAttribute('data-view-id', map.id)
        const inner = document.createElement('span')
        body.appendChild(inner)
        const tab = document.createElement('div')
        vis.group.element.contains = (node) => node === tab

        expect(getTargetViewId(fake.asApi, inner)).toBe(map.id)
        expect(getTargetViewId(fake.asApi, tab)).toBe(vis.id)
        expect(
            getTargetViewId(fake.asApi, document.createElement('p'))
        ).toBeNull()
        expect(getTargetViewId(fake.asApi, null)).toBeNull()
    })
})
