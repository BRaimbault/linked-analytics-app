import {
    fitToolsToOpenPanel,
    keepCloseFromSelecting,
    openSettings,
    showSettingsForTarget,
} from '@components/workspace/controller/settings'
import type { DockviewApi } from 'dockview-react'
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

/* A tools tab in a strip at `position`, with a 35px tab row and content of
 * `contentHeight` inside the panel's 8px paddings */
const toolsTab = ({
    position = 'top',
    collapsed = false,
    active = true,
    contentHeight = 200,
}: {
    position?: string
    collapsed?: boolean
    active?: boolean
    contentHeight?: number
} = {}) => {
    const groupElement = document.createElement('div')
    const tabs = groupElement.appendChild(document.createElement('div'))
    tabs.className = 'dv-tabs-and-actions-container'
    Object.defineProperty(tabs, 'offsetHeight', { value: 35 })
    const panelElement = document.createElement('div')
    const tool = panelElement.appendChild(document.createElement('div'))
    tool.setAttribute('data-tool-panel', '')
    tool.style.paddingTop = '8px'
    tool.style.paddingBottom = '8px'
    const content = tool.appendChild(document.createElement('div'))
    Object.defineProperty(content, 'offsetHeight', { value: contentHeight })

    const setSize = vi.fn()
    const panel = {
        view: { content: { element: panelElement } },
        group: {
            element: groupElement,
            activePanel: null as unknown,
            api: {
                location: { type: 'edge', position },
                isCollapsed: () => collapsed,
                height: 132,
                setSize,
            },
        },
    }
    panel.group.activePanel = active ? panel : {}
    const api = {
        /* The grid's height alone: with the strip, the workspace is 800 */
        height: 668,
        getPanel: (id: string) => (id === 'tab' ? panel : undefined),
    } as unknown as DockviewApi
    return { api, setSize }
}

describe('fitToolsToOpenPanel', () => {
    it('fits the strip to the tab in front, its tab row and paddings included', () => {
        const { api, setSize } = toolsTab({ contentHeight: 200 })

        fitToolsToOpenPanel(api, 'tab')

        expect(setSize).toHaveBeenCalledWith({ height: 35 + 8 + 200 + 8 })
    })

    it('leaves the views most of the workspace for a long tab', () => {
        const { api, setSize } = toolsTab({ contentHeight: 900 })

        fitToolsToOpenPanel(api, 'tab')

        expect(setSize).toHaveBeenCalledWith({ height: 800 * 0.6 })
    })

    it.each([
        ['a tab behind another', { active: false }],
        ['a collapsed strip', { collapsed: true }],
        ['a strip at a side', { position: 'left' }],
    ])('leaves the strip as it is for %s', (_case, options) => {
        const { api, setSize } = toolsTab(options)

        fitToolsToOpenPanel(api, 'tab')
        fitToolsToOpenPanel(api, 'gone')

        expect(setSize).not.toHaveBeenCalled()
    })
})
