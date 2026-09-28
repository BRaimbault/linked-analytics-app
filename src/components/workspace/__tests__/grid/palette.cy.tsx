import { clickTile, mountWorkspace } from './grid-helpers'

describe('the palette', () => {
    it('lays each group of tiles on one row in a wide window, inside the strip', () => {
        mountWorkspace()

        cy.get('[data-test^="add-views-"]').should((groups) => {
            expect(groups).to.have.length(3)
            for (const group of groups) {
                const tops = [
                    ...group.querySelectorAll('[data-test^="add-view-"]'),
                ].map((tile) => tile.getBoundingClientRect().top)
                expect(new Set(tops).size, group.dataset.test).to.equal(1)
                /* The palette lives in an overlay, outside the strip's
                 * element */
                const strip = (
                    group.ownerDocument.querySelector(
                        '.dv-edge-group'
                    ) as HTMLElement
                ).getBoundingClientRect()
                expect(group.getBoundingClientRect().bottom).to.be.at.most(
                    strip.bottom
                )
            }
        })
    })

    /* Firefox starts no drag on a button itself, only on what it holds */
    it('makes the whole face of a tile its content, so a drag starts anywhere on it', () => {
        mountWorkspace()

        cy.get('[data-test^="add-view-"]').should((tiles) => {
            for (const tile of tiles) {
                const box = tile.getBoundingClientRect()
                for (const [x, y] of [
                    [box.left + 2, box.top + 2],
                    [box.right - 2, box.bottom - 2],
                    [box.right - 10, box.top + box.height / 2],
                ]) {
                    const hit = tile.ownerDocument.elementFromPoint(x, y)
                    expect(tile.contains(hit), tile.dataset.test).to.equal(true)
                    expect(hit, tile.dataset.test).not.to.equal(tile)
                }
            }
        })
    })

    it('keeps the palette tiles the same size when some run out', () => {
        mountWorkspace()
        clickTile('period-selector')

        cy.get('[data-test="add-view-period-selector"]')
            .should('have.attr', 'aria-disabled', 'true')
            .invoke('outerWidth')
            .should('equal', 160)
        cy.get('[data-test="add-view-map"]')
            .invoke('outerWidth')
            .should('equal', 160)
    })
})
