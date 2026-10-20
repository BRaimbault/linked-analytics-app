import {
    clickTile,
    closeView,
    expectLayout,
    expectToolTabs,
    expectViewTitles,
    inViewHeader,
    mountWorkspace,
    SMOKE,
    toolTab,
    viewTab,
} from './grid-helpers'

describe('settings tabs and the selected view', () => {
    it(
        'brings a view’s settings forward when the user selects it',
        SMOKE,
        () => {
            mountWorkspace()
            clickTile('map')
            clickTile('visualization')

            inViewHeader('Map 1', '.dv-tab').click()
            cy.get('[data-test="selected-view-tab"]').should(
                'have.text',
                'Map 1'
            )
            cy.get('.dv-edge-group .dv-active-tab').should('have.text', 'Map 1')

            cy.get('[data-test="view-placeholder"]').last().click()
            cy.get('.dv-edge-group .dv-active-tab').should(
                'have.text',
                'Visualization 1'
            )
        }
    )

    it('opens the settings from a view’s placeholder button', () => {
        mountWorkspace()
        clickTile('map')

        cy.get('[data-test="edit-view-settings"]').click()

        cy.get('.dv-edge-group .dv-active-tab').should('have.text', 'Map 1')
        cy.contains(/Choosing a saved map/).should('be.visible')
        cy.get('[data-test="links-section"]').should('exist')
    })

    it('closes a view from its settings tab', SMOKE, () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')

        toolTab('Map 1')
            .closest('.dv-tab')
            .find('.dv-default-tab-action')
            /* shown on hover, like any tab that isn't the open one */
            .click({ force: true })

        expectViewTitles(['Visualization 1'])
        expectToolTabs(['Workspace', 'Add views', 'Visualization 1'])
        expectLayout({ 'Visualization 1': { w: 100 } })
        cy.get('.dv-edge-group .dv-active-tab').should('have.text', 'Add views')
    })

    it(
        'goes back to the palette, with no view selected, when a view closes',
        SMOKE,
        () => {
            mountWorkspace()
            clickTile('map')
            clickTile('visualization')
            viewTab('Map 1').click()
            cy.get('[data-test="selected-view-tab"]').should(
                'have.text',
                'Map 1'
            )

            closeView('Visualization 1')
            cy.get('.dv-edge-group .dv-active-tab').should(
                'have.text',
                'Add views'
            )
            cy.get('[data-test="selected-view-tab"]').should('not.exist')

            viewTab('Map 1').click()
            closeView('Map 1')
            cy.get('[data-test="workspace-watermark"]').should('be.visible')
            cy.get('.dv-edge-group .dv-active-tab').should(
                'have.text',
                'Add views'
            )
        }
    )

    it('selects the view whose settings tab is opened, and none on the other tools', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('visualization')

        toolTab('Map 1').click()
        cy.get('[data-test="selected-view-tab"]').should('have.text', 'Map 1')

        toolTab('Add views').click()
        cy.get('[data-test="selected-view-tab"]').should('not.exist')

        toolTab('Map 1').click()
        toolTab('Workspace').click()
        cy.get('[data-test="selected-view-tab"]').should('not.exist')
    })
})
