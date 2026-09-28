import { asPanel } from '@components/workspace/__tests__/fake-dockview'
import { addViewSettingsPanel } from '@components/workspace/controller/settings'
import { activeViewChanged } from '@store/workspace-slice'
import { describe, expect, it, vi } from 'vitest'
import {
    dropEvent,
    overlayEvent,
    payload,
    setup,
    twoColumns,
} from './controller-fixtures'

describe('palette drags', () => {
    const dragOver = (nativeEvent: unknown) => ({
        nativeEvent,
        accept: vi.fn(),
    })

    it('accepts a view dragged from the palette while there is space', () => {
        const fake = setup()
        const event = dragOver(payload('map'))

        fake.emit('onUnhandledDragOver', event)

        expect(event.accept).toHaveBeenCalled()
    })

    it('ignores other drags, touch drags and drags into a full workspace', () => {
        const fake = setup()
        const other = dragOver({ dataTransfer: { types: ['text/plain'] } })
        const touch = dragOver({})
        fake.emit('onUnhandledDragOver', other)
        fake.emit('onUnhandledDragOver', touch)
        for (const id of ['a', 'b', 'c', 'd']) {
            fake.addLaidOutView(id, {
                left: 0,
                top: 0,
                width: 999,
                height: 999,
            })
        }
        const full = dragOver(payload('map'))
        fake.emit('onUnhandledDragOver', full)

        expect(other.accept).not.toHaveBeenCalled()
        expect(touch.accept).not.toHaveBeenCalled()
        expect(full.accept).not.toHaveBeenCalled()
    })
})

describe('drops', () => {
    it('adds a view where a palette drag is dropped', () => {
        const fake = setup()
        const [map] = twoColumns(fake)
        const event = dropEvent({ group: map.group, position: 'bottom' })

        fake.emit('onWillDrop', event)
        fake.emit('onDidDrop', event)

        expect(event.preventDefault).not.toHaveBeenCalled()
        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                position: { referenceGroup: map.group, direction: 'below' },
            })
        )
    })

    it('fills an empty grid with a centre drop', () => {
        const fake = setup()

        fake.emit('onDidDrop', dropEvent({ kind: 'edge', position: 'center' }))

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                position: { direction: 'right' },
            })
        )
    })

    it('treats a drop on the tools strip as a drop on the grid edge', () => {
        const fake = setup()

        fake.emit(
            'onDidDrop',
            dropEvent({ group: fake.toolGroup, position: 'left' })
        )

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                position: { direction: 'left' },
            })
        )
    })

    it('does nothing for drops without a valid view payload', () => {
        const fake = setup()
        const addCalls = fake.api.addPanel.mock.calls.length

        fake.emit('onDidDrop', dropEvent({ nativeEvent: {} }))
        fake.emit(
            'onDidDrop',
            dropEvent({
                nativeEvent: {
                    dataTransfer: {
                        getData: () => JSON.stringify({ type: 'x' }),
                    },
                },
            })
        )

        expect(fake.api.addPanel).toHaveBeenCalledTimes(addCalls)
    })

    it('swaps views dropped onto each other, and selects the dropped one', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        addViewSettingsPanel(fake.asApi, asPanel(vis))
        const mapCell = map.group
        const visCell = vis.group
        const event = dropEvent({
            group: mapCell,
            position: 'center',
            getData: () => ({ panelId: vis.id }),
        })

        fake.emit('onWillDrop', event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(map.group).toBe(visCell)
        expect(vis.group).toBe(mapCell)
        /* Its settings came forward, so it is selected */
        expect(fake.dispatch).toHaveBeenCalledWith(activeViewChanged('vis-a'))
    })

    it('offers no drop on the tab of another view', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const onTab = overlayEvent({
            kind: 'tab',
            group: map.group,
            position: 'center',
            getData: () => ({ panelId: vis.id }),
        })

        fake.emit('onWillShowOverlay', onTab)

        expect(onTab.preventDefault).toHaveBeenCalled()
    })

    it('ignores a swap whose dragged or target view is gone', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)

        fake.emit(
            'onWillDrop',
            dropEvent({
                group: map.group,
                position: 'center',
                getData: () => ({ panelId: 'gone' }),
            })
        )
        fake.emit(
            'onWillDrop',
            dropEvent({
                group: { ...map.group, activePanel: undefined },
                position: 'center',
                getData: () => ({ panelId: vis.id }),
            })
        )

        expect(map.api.moveTo).not.toHaveBeenCalled()
        expect(vis.api.moveTo).not.toHaveBeenCalled()
    })
})
