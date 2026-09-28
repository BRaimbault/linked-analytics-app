import {
    ADD_VIEWS_PANEL_ID,
    WORKSPACE_PANEL_ID,
} from '@components/workspace/controller/panels'
import { describe, expect, it, vi } from 'vitest'
import {
    addMapPanel,
    dropEvent,
    elementFromPoint,
    existing,
    overlayEvent,
    setup,
    twoColumns,
} from './controller-fixtures'

describe('drags of the tools strip’s tabs', () => {
    it('keeps tools out of the grid and views out of the tools strip', () => {
        const fake = setup()
        const [map] = twoColumns(fake)
        const tool = overlayEvent({
            group: map.group,
            getData: () => ({ panelId: ADD_VIEWS_PANEL_ID }),
        })
        const settings = overlayEvent({
            group: map.group,
            getData: () => ({ panelId: 'settings-map-a' }),
        })
        const viewIntoTools = overlayEvent({ group: fake.toolGroup })

        for (const event of [tool, settings, viewIntoTools]) {
            fake.emit('onWillShowOverlay', event)
            expect(event.preventDefault).toHaveBeenCalled()
        }
    })

    it('reorders settings tabs in the tab row, after Workspace and Add views', () => {
        const fake = setup()
        addMapPanel(fake, 'map-a')
        addMapPanel(fake, 'map-b')
        /* The tabs under the pointer, one per x position */
        const tabs = [WORKSPACE_PANEL_ID, ADD_VIEWS_PANEL_ID, 'settings-map-a']
        elementFromPoint.mockImplementation((x) => {
            const tab = document.createElement('div')
            tab.className = 'dv-tab'
            tab.dataset.tabPanelId = tabs[x]
            return tab
        })
        const settingsTab = (over: string, overrides = {}) =>
            overlayEvent({
                group: fake.toolGroup,
                kind: 'tab',
                position: 'right',
                nativeEvent: { clientX: tabs.indexOf(over), clientY: 0 },
                getData: () => ({ panelId: 'settings-map-b' }),
                ...overrides,
            })
        const allowed = [
            settingsTab('settings-map-a'),
            settingsTab('settings-map-a', { position: 'left' }),
            settingsTab(ADD_VIEWS_PANEL_ID),
            settingsTab(ADD_VIEWS_PANEL_ID, { kind: 'header_space' }),
        ]
        const refused = [
            settingsTab(WORKSPACE_PANEL_ID),
            settingsTab(ADD_VIEWS_PANEL_ID, { position: 'left' }),
            /* In a strip on the left or right edge */
            settingsTab(ADD_VIEWS_PANEL_ID, { position: 'top' }),
            /* The strip's body */
            settingsTab('settings-map-a', {
                kind: 'content',
                position: 'center',
            }),
            /* Add views itself, dragged anyway */
            settingsTab('settings-map-a', {
                getData: () => ({ panelId: ADD_VIEWS_PANEL_ID }),
            }),
        ]

        for (const event of [...allowed, ...refused]) {
            fake.emit('onWillShowOverlay', event)
        }

        for (const event of allowed) {
            expect(event.preventDefault).not.toHaveBeenCalled()
        }
        for (const event of refused) {
            expect(event.preventDefault).toHaveBeenCalled()
        }
        elementFromPoint.mockImplementation(() => null)
    })

    it('moves a view dragged by its settings tab, instead of the tab', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const bySettings = (overrides: Record<string, unknown>) =>
            dropEvent({
                getData: () => ({ panelId: 'settings-map-a' }),
                nativeEvent: {},
                ...overrides,
            })
        fake.api.addPanel({
            id: 'settings-map-a',
            component: 'view-settings',
            params: { viewId: 'map-a' },
            position: { referenceGroup: fake.toolGroup },
            inactive: true,
        })

        const split = bySettings({ group: vis.group, position: 'bottom' })
        fake.emit('onWillDrop', split)
        expect(split.preventDefault).toHaveBeenCalled()
        expect(map.api.moveTo).toHaveBeenCalledWith({
            group: vis.group,
            position: 'bottom',
        })

        const toEdge = bySettings({ kind: 'edge', position: 'left' })
        fake.emit('onWillDrop', toEdge)
        expect(map.group.api.moveTo).toHaveBeenCalledWith({
            group: undefined,
            position: 'left',
        })
    })

    it('keeps a settings tab out of the grid once its view is gone', () => {
        const fake = setup()
        const [map] = twoColumns(fake)
        fake.api.addPanel({
            id: 'settings-gone',
            component: 'view-settings',
            params: { viewId: 'gone' },
            position: { referenceGroup: fake.toolGroup },
            inactive: true,
        })
        const event = overlayEvent({
            group: map.group,
            getData: () => ({ panelId: 'settings-gone' }),
        })

        fake.emit('onWillShowOverlay', event)

        expect(event.preventDefault).toHaveBeenCalled()
    })

    it('reads no target tab outside a tab row', () => {
        const fake = setup()
        addMapPanel(fake, 'map-a')
        const event = overlayEvent({
            group: fake.toolGroup,
            kind: 'tab',
            nativeEvent: { clientX: 0, clientY: 0 },
            getData: () => ({ panelId: 'settings-map-a' }),
        })

        fake.emit('onWillShowOverlay', event)

        expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('keeps Workspace and Add views from being dragged, but not settings tabs', () => {
        const fake = setup()
        addMapPanel(fake, 'map-a')
        const drag = (panelId: string) => {
            const nativeEvent = { preventDefault: vi.fn() }
            fake.emit('onWillDragPanel', {
                panel: existing(fake, panelId),
                nativeEvent,
            })
            return nativeEvent.preventDefault
        }

        expect(drag(WORKSPACE_PANEL_ID)).toHaveBeenCalled()
        expect(drag(ADD_VIEWS_PANEL_ID)).toHaveBeenCalled()
        expect(drag('settings-map-a')).not.toHaveBeenCalled()
    })
})
