import { ADD_VIEWS_PANEL_ID } from '@components/workspace/controller/panels'
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
            ADD_VIEWS_PANEL_ID,
            'settings-map-a',
            'settings-map-b',
        ])
        expect(fake.api.getPanel('settings-map-a')?.title).toBe(
            'map-a settings'
        )
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

    it('titles a settings tab even for an untitled view', () => {
        const fake = setup()

        fake.api.addPanel({
            id: 'untitled',
            component: 'view',
            params: { type: 'map', number: 1 },
        })

        expect(fake.api.getPanel('settings-untitled')?.title).toBe(' settings')
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

    it('ignores tools and empty selections', () => {
        const fake = setup()
        fake.dispatch.mockClear()

        fake.emit('onDidActivePanelChange', {
            panel: undefined,
            origin: 'user',
        })
        fake.emit('onDidActivePanelChange', {
            panel: fake.api.getPanel(ADD_VIEWS_PANEL_ID),
            origin: 'user',
        })

        expect(fake.dispatch).not.toHaveBeenCalled()
    })

    it('selects a neighbour when the selected view closes', () => {
        const fake = setup()
        const map = addMapPanel(fake, 'map-a')
        const vis = addMapPanel(fake, 'vis-a')
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })

        fake.api.removePanel(map)

        expect(vis.api.setActive).toHaveBeenCalled()
        expect(fake.api.getPanel('settings-map-a')).toBeUndefined()
        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel('settings-vis-a'),
            { skipSetGroupActive: true }
        )
    })

    it('goes back to the palette when the last selected view closes', () => {
        const fake = setup()
        const map = addMapPanel(fake, 'map-a')
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })

        fake.api.removePanel(map)

        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel(ADD_VIEWS_PANEL_ID),
            { skipSetGroupActive: true }
        )
    })

    it('shows the selected view again when another view shown in the strip closes', () => {
        const fake = setup()
        const map = addMapPanel(fake, 'map-a')
        const vis = addMapPanel(fake, 'vis-a')
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })
        fake.toolGroup.activePanel = fake.api.getPanel('settings-vis-a')

        fake.api.removePanel(vis)

        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel('settings-map-a'),
            { skipSetGroupActive: true }
        )
    })

    it('leaves the strip alone when an unselected view closes', () => {
        const fake = setup()
        const map = addMapPanel(fake, 'map-a')
        const vis = addMapPanel(fake, 'vis-a')
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })
        fake.toolGroup.model.openPanel.mockClear()
        fake.api.removePanel(existing(fake, 'settings-vis-a'))

        fake.api.removePanel(vis)

        expect(fake.toolGroup.model.openPanel).not.toHaveBeenCalled()
    })

    it('ignores tools being removed', () => {
        const fake = setup()
        fake.dispatch.mockClear()

        fake.api.removePanel(existing(fake, ADD_VIEWS_PANEL_ID))

        expect(fake.dispatch).not.toHaveBeenCalled()
    })
})
