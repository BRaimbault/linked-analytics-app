import {
    ADD_VIEWS_PANEL_ID,
    WORKSPACE_PANEL_ID,
} from '@components/workspace/controller/panels'
import { describe, expect, it } from 'vitest'
import { addMapPanel, existing, setup } from './controller-fixtures'

describe('view events', () => {
    it('mirrors views in the store and gives each a settings tab after Add views', () => {
        const fake = setup()

        addMapPanel(fake, 'map-a')
        addMapPanel(fake, 'map-b')

        expect(fake.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'workspace/viewAdded' })
        )
        expect(fake.toolGroup.panels.map(({ id }) => id)).toEqual([
            WORKSPACE_PANEL_ID,
            ADD_VIEWS_PANEL_ID,
            'settings-map-a',
            'settings-map-b',
        ])
        expect(fake.api.getPanel('settings-map-a')?.title).toBe('map-a')
    })

    it('adds a settings tab once, and none once the tools are gone', () => {
        const fake = setup()
        const view = addMapPanel(fake, 'map-a')
        fake.emit('onDidAddPanel', view)
        expect(
            fake.toolGroup.panels.filter(({ id }) => id === 'settings-map-a')
        ).toHaveLength(1)

        fake.api.removePanel(existing(fake, ADD_VIEWS_PANEL_ID))
        addMapPanel(fake, 'map-b')
        expect(fake.api.getPanel('settings-map-b')).toBeUndefined()
    })

    it('gives a text view no settings tab: it is edited in place', () => {
        const fake = setup()

        fake.api.addPanel({
            id: 'text-a',
            component: 'view',
            title: 'Text 1',
            params: { type: 'text', number: 1 },
        })

        expect(fake.api.getPanel('text-a')).toBeDefined()
        expect(fake.api.getPanel('settings-text-a')).toBeUndefined()
    })

    it('titles a settings tab even for an untitled view', () => {
        const fake = setup()

        fake.api.addPanel({
            id: 'untitled',
            component: 'view',
            params: { type: 'map', number: 1 },
        })

        expect(fake.api.getPanel('settings-untitled')?.title).toBe('')
    })

    it('ignores tools being added', () => {
        const fake = setup()
        fake.dispatch.mockClear()

        fake.emit('onDidAddPanel', fake.api.getPanel(ADD_VIEWS_PANEL_ID))

        expect(fake.dispatch).not.toHaveBeenCalled()
    })

    it('shows the settings of a view the user selects, not of one just added', () => {
        const fake = setup()
        const map = addMapPanel(fake, 'map-a')
        const settings = fake.api.getPanel('settings-map-a')

        fake.emit('onDidActivePanelChange', { panel: map, origin: 'api' })
        expect(fake.toolGroup.model.openPanel).not.toHaveBeenCalled()

        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })
        expect(fake.toolGroup.model.openPanel).toHaveBeenCalledWith(settings, {
            skipSetGroupActive: true,
        })
    })

    const lastSelection = (fake: ReturnType<typeof setup>) =>
        fake.dispatch.mock.calls
            .map(([action]) => action)
            .filter(({ type }) => type === 'workspace/activeViewChanged')
            .at(-1)?.payload

    it('selects no view on the Workspace or Add views tab, and ignores empty selections', () => {
        const fake = setup()
        const map = addMapPanel(fake, 'map-a')
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })
        expect(lastSelection(fake)).toBe('map-a')

        fake.emit('onDidActivePanelChange', {
            panel: existing(fake, WORKSPACE_PANEL_ID),
            origin: 'user',
        })
        expect(lastSelection(fake)).toBeNull()

        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })
        fake.emit('onDidActivePanelChange', {
            panel: existing(fake, ADD_VIEWS_PANEL_ID),
            origin: 'user',
        })
        expect(lastSelection(fake)).toBeNull()

        fake.dispatch.mockClear()
        fake.emit('onDidActivePanelChange', {
            panel: undefined,
            origin: 'user',
        })
        expect(fake.dispatch).not.toHaveBeenCalled()
    })

    it('selects nothing for a view with no settings tab, or one just added', () => {
        const fake = setup()
        const map = addMapPanel(fake, 'map-a')
        const text = fake.api.addPanel({
            id: 'text-a',
            component: 'view',
            title: 'Text 1',
            params: { type: 'text', number: 1 },
        })
        fake.dispatch.mockClear()

        fake.emit('onDidActivePanelChange', { panel: map, origin: 'api' })
        fake.emit('onDidActivePanelChange', { panel: text, origin: 'user' })

        expect(lastSelection(fake)).toBeUndefined()
    })

    it('goes back to the palette, with no view selected, when a view closes', () => {
        const fake = setup()
        const map = addMapPanel(fake, 'map-a')
        addMapPanel(fake, 'vis-a')
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })

        fake.api.removePanel(map)

        expect(fake.api.getPanel('settings-map-a')).toBeUndefined()
        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel(ADD_VIEWS_PANEL_ID),
            { skipSetGroupActive: true }
        )
        expect(lastSelection(fake)).toBeNull()
    })

    it('gives the focus to the palette tab when the closed tab had it', () => {
        const fake = setup()
        const map = addMapPanel(fake, 'map-a')
        const paletteTab = document.createElement('button')
        document.body.appendChild(paletteTab)
        fake.toolGroup.element.querySelector = (selector) =>
            selector === '[data-tab-panel-id="add-views"]' ? paletteTab : null

        fake.api.removePanel(map)
        expect(paletteTab).toHaveFocus()

        const elsewhere = document.createElement('input')
        document.body.appendChild(elsewhere)
        elsewhere.focus()
        fake.api.removePanel(addMapPanel(fake, 'vis-a'))
        expect(elsewhere).toHaveFocus()

        paletteTab.remove()
        elsewhere.remove()
    })

    it('selects the view whose settings tab is opened', () => {
        const fake = setup()
        addMapPanel(fake, 'map-a')
        addMapPanel(fake, 'vis-a')

        fake.emit('onDidActivePanelChange', {
            panel: existing(fake, 'settings-vis-a'),
            origin: 'user',
        })

        expect(lastSelection(fake)).toBe('vis-a')
    })

    it('ignores tools being removed', () => {
        const fake = setup()
        fake.dispatch.mockClear()

        fake.api.removePanel(existing(fake, ADD_VIEWS_PANEL_ID))

        expect(fake.dispatch).not.toHaveBeenCalled()
    })
})
