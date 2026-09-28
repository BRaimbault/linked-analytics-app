import { clickTile, mountWorkspace, toolTab } from './grid-helpers'

describe('the Workspace tab', () => {
    it('lines up the Workspace settings: controls, names, and each name on its control', () => {
        mountWorkspace()
        clickTile('map')
        toolTab('Workspace').click()

        cy.get('[data-test="workspace-panel"]').should(([panel]) => {
            const button = (
                panel.querySelector(
                    '[data-test="even-out-sizes"]'
                ) as HTMLElement
            ).getBoundingClientRect()
            const checkbox = panel.querySelector(
                '[data-test="view-headers-on-hover"]'
            ) as HTMLElement
            const box = (
                checkbox.querySelector('.icon') as HTMLElement
            ).getBoundingClientRect()
            const name = (
                panel.querySelector('[aria-hidden="true"]') as HTMLElement
            ).getBoundingClientRect()
            const label = checkbox.ownerDocument.createRange()
            label.selectNodeContents(checkbox.lastChild as Node)

            expect(button.left + button.width / 2).to.be.closeTo(
                box.left + box.width / 2,
                0.5
            )
            expect(name.left).to.be.closeTo(
                label.getBoundingClientRect().left,
                0.5
            )
            /* Each name centred on its control */
            const middle = (rect: DOMRect) => rect.top + rect.height / 2
            expect(middle(name)).to.be.closeTo(middle(button), 0.5)
            expect(middle(label.getBoundingClientRect())).to.be.closeTo(
                middle(box),
                0.5
            )
        })
    })

    it('gives the Workspace checkbox a 2px focus ring', () => {
        mountWorkspace()
        toolTab('Workspace').click()

        cy.get('[data-test="view-headers-on-hover"] input').focus()

        cy.get('[data-test="view-headers-on-hover"] .icon')
            .should('have.css', 'outline-width', '2px')
            .and('have.css', 'outline-offset', '-3px')
    })
})
