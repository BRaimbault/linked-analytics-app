import {
    keepCloseFromSelecting,
    openSettings,
    showSettingsForTarget,
} from '@components/workspace/controller/settings'
import { describe, expect, it, vi } from 'vitest'
import { addMapPanel, setup, twoColumns } from './controller-fixtures'

describe('openSettings', () => {
    it('opens the settings of a view, expanding the strip', () => {
        const fake = setup()
        addMapPanel(fake, 'map-a')
        fake.toolGroup.api.collapse()

        openSettings(fake.asApi, 'map-a')
        openSettings(fake.asApi, 'gone')

        expect(fake.toolGroup.api.isCollapsed()).toBe(false)
        expect(
            fake.api.getPanel('settings-map-a')?.api.setActive
        ).toHaveBeenCalled()
    })
})

describe('keepCloseFromSelecting', () => {
    it('marks presses on a tab’s close button as handled, and only those', () => {
        const close = document.createElement('button')
        close.className = 'dv-default-tab-action'
        const icon = document.createElement('svg')
        close.appendChild(icon)
        const pressOn = (target: EventTarget | null) => ({
            target,
            preventDefault: vi.fn(),
        })
        const onIcon = pressOn(icon)
        const onTab = pressOn(document.createElement('div'))
        const onNothing = pressOn(null)

        expect(keepCloseFromSelecting(onIcon)).toBe(true)
        expect(keepCloseFromSelecting(onTab)).toBe(false)
        expect(keepCloseFromSelecting(onNothing)).toBe(false)
        expect(onIcon.preventDefault).toHaveBeenCalled()
        expect(onTab.preventDefault).not.toHaveBeenCalled()
    })
})

describe('showSettingsForTarget', () => {
    it('finds the view from its body or its tab', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.api.addPanel({
            id: 'settings-map-a',
            component: 'view-settings',
            position: { referenceGroup: fake.toolGroup },
            inactive: true,
        })
        fake.api.addPanel({
            id: 'settings-vis-a',
            component: 'view-settings',
            position: { referenceGroup: fake.toolGroup },
            inactive: true,
        })
        const body = document.createElement('div')
        body.setAttribute('data-view-id', map.id)
        const inner = document.createElement('span')
        body.appendChild(inner)
        const tab = document.createElement('div')
        vis.group.element.contains = (node) => node === tab

        showSettingsForTarget(fake.asApi, inner)
        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel('settings-map-a'),
            { skipSetGroupActive: true }
        )

        showSettingsForTarget(fake.asApi, tab)
        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel('settings-vis-a'),
            { skipSetGroupActive: true }
        )
    })

    it('ignores targets outside views and non-elements', () => {
        const fake = setup()
        twoColumns(fake)

        showSettingsForTarget(fake.asApi, document.createElement('div'))
        showSettingsForTarget(fake.asApi, null)
        showSettingsForTarget(fake.asApi, document.createTextNode('text'))

        expect(fake.toolGroup.model.openPanel).not.toHaveBeenCalled()
    })
})
