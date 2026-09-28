import {
    cellSize,
    clickTile,
    dragTo,
    dragDivider,
    expectLayout,
    getCell,
    getCells,
    hiddenUntilHoverOpacity,
    mountWorkspace,
    outerEdge,
    SMOKE,
} from './grid-helpers'

describe('text views', () => {
    it('puts text at the very top, above the selector bar', SMOKE, () => {
        mountWorkspace()
        clickTile('map')
        clickTile('period-selector')
        clickTile('text')

        cellSize('Text 1').its('height').should('be.closeTo', 120, 2)
        cellSize('Period 1').its('height').should('be.closeTo', 120, 2)
        expectLayout({
            'Text 1': { y: 0, w: 100 },
            'Period 1': { w: 100 },
            'Map 1': { w: 100 },
        })
        cy.document().should((doc) => {
            const top = (title: string) =>
                [...doc.querySelectorAll('.dv-grid-view .dv-tab')]
                    .find((tab) => tab.textContent?.trim() === title)
                    ?.getBoundingClientRect().top as number
            expect(top('Text 1')).to.be.lessThan(top('Period 1'))
            expect(top('Period 1')).to.be.lessThan(top('Map 1'))
        })
    })

    it('starts the selector bar right below a text row', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('text')
        clickTile('period-selector')

        cy.document().should((doc) => {
            const tops = ['Text 1', 'Period 1', 'Map 1'].map(
                (title) =>
                    [...doc.querySelectorAll('.dv-grid-view .dv-tab')]
                        .find((tab) => tab.textContent?.trim() === title)
                        ?.getBoundingClientRect().top as number
            )
            expect(tops).to.deep.equal([...tops].sort((a, b) => a - b))
        })
    })

    it(
        'is written in place, with DHIS2 formatting, and has no settings tab',
        SMOKE,
        () => {
            mountWorkspace()
            clickTile('map')
            clickTile('text')

            /* Workspace, Add views and the map's settings */
            cy.get('.dv-edge-group .dv-tab').should('have.length', 3)
            /* Hidden until the view is hovered or holds the focus */
            cy.document().then((doc) =>
                cy
                    .get('[data-test="text-view-edit"]')
                    .parent()
                    .should('have.css', 'opacity', hiddenUntilHoverOpacity(doc))
            )
            cy.get('[data-test="text-view-edit"]').focus()
            cy.get('[data-test="text-view-edit"]')
                .parent()
                .should('have.css', 'opacity', '1')
            cy.get('[data-test="text-view-edit"]').focus().click()
            /* The editor gets the whole grid while writing */
            cy.document().should((doc) =>
                expect(getCells(doc)).to.have.length(1)
            )
            /* Bold, italic, link and emoji, but no user mentions */
            cy.get(
                '[data-test="text-view"] .mainActions button:visible'
            ).should('have.length', 4)
            cy.get('[data-test="text-view"] .mainActions').then(([actions]) =>
                expect(actions.querySelectorAll('button').length).to.equal(5)
            )
            cy.get('[data-test="text-view"] textarea').type('Malaria *cases*')
            cy.get('[data-test="text-view-done"]').click()
            cy.document().should((doc) =>
                expect(getCells(doc)).to.have.length(2)
            )

            cy.get('[data-test="text-view"] strong').should(
                'have.text',
                'cases'
            )
            cy.get('[data-test="text-view"] textarea').should('not.exist')

            /* With room for the editor, it is written in place */
            dragDivider('Text 1', 'bottom', 0.5)
            cy.get('[data-test="text-view-edit"]').focus().click()
            cy.get('[data-test="text-view"] textarea').should('be.visible')
            cy.document().should((doc) =>
                expect(getCells(doc)).to.have.length(2)
            )
            cy.get('[data-test="text-view-cancel"]').click()
        }
    )

    it('shrinks to one line of text, with its edit button in full', () => {
        mountWorkspace()
        clickTile('map')
        clickTile('text')
        cy.get('[data-test="text-view-edit"]').focus().click()
        cy.get('[data-test="text-view"] textarea').type('Malaria cases')
        cy.get('[data-test="text-view-done"]').click()

        dragDivider('Text 1', 'bottom', 0)

        cellSize('Text 1').its('height').should('be.closeTo', 71, 2)
        cy.document().should((doc) => {
            const cell = getCell(doc, 'Text 1').getBoundingClientRect()
            const view = doc.querySelector(
                '[data-test="text-view"]'
            ) as HTMLElement
            for (const part of [
                view.querySelector('p') as HTMLElement,
                view.querySelector(
                    '[data-test="text-view-edit"]'
                ) as HTMLElement,
            ]) {
                expect(part.getBoundingClientRect().bottom).to.be.at.most(
                    cell.bottom
                )
            }
        })
    })

    it('breaks lines at the same words when writing and reading', () => {
        /* Where the text runs: inside the border and padding */
        const textBox = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            const inset = (side: 'Left' | 'Right') =>
                parseFloat(style[`border${side}Width`]) +
                parseFloat(style[`padding${side}`])
            return {
                left: rect.left + inset('Left'),
                right: rect.right - inset('Right'),
                font: `${style.fontFamily} ${style.fontSize} ${style.lineHeight}`,
            }
        }
        const sentence =
            'Malaria cases per district, compared with last year, from https://dhis2.org/averyverylonglinkwithnohyphensthatcannotfitonalineofthisnarrowcolumn'
        let writing: ReturnType<typeof textBox>
        let writtenLines = 0

        /* A narrow column of text beside a map */
        mountWorkspace()
        clickTile('map')
        dragTo({ tile: 'text' }, (doc) => outerEdge(doc, 'left'))
        cy.get('[data-test="text-view-edit"]').focus().click()
        cy.get('[data-test="text-view"] textarea')
            .type(sentence)
            .then(([textarea]) => {
                writing = textBox(textarea)
                /* The text area fills the view: at no height, its scroll
                 * height is the text's */
                const style = getComputedStyle(textarea)
                const height = textarea.style.height
                textarea.style.height = '0px'
                writtenLines = Math.round(
                    (textarea.scrollHeight -
                        parseFloat(style.paddingTop) -
                        parseFloat(style.paddingBottom)) /
                        parseFloat(style.lineHeight)
                )
                textarea.style.height = height
            })
        /* Focus only colours the border: the text doesn't move */
        cy.get('[data-test="text-view"] textarea')
            .should('have.css', 'box-shadow', 'none')
            .blur()
            .should(([textarea]) => {
                const blurred = textBox(textarea)
                expect(blurred.left).to.equal(writing.left)
                expect(blurred.right).to.equal(writing.right)
            })

        /* The editor's preview reads the same way */
        cy.get('[data-test="text-view"] .sideActions button').click()
        cy.get('[data-test="text-view"] .preview p').should(([preview]) => {
            const previewing = textBox(preview)
            expect(previewing.font).to.equal(writing.font)
            expect(previewing.left).to.be.closeTo(writing.left, 0.5)
            expect(previewing.right).to.be.closeTo(writing.right, 0.5)
            expect(
                Math.round(
                    preview.getBoundingClientRect().height /
                        parseFloat(getComputedStyle(preview).lineHeight)
                )
            ).to.equal(writtenLines)
        })
        /* "Back to write mode" is as compact as "Preview" */
        cy.get('[data-test="text-view"] .previewWrapper button')
            .should('have.css', 'font-size', '13px')
            .and('have.css', 'padding-left', '6px')
            .click()
        cy.get('[data-test="text-view-done"]').click()

        cy.get('[data-test="text-view"] p').should(([paragraph]) => {
            const reading = textBox(paragraph)
            expect(reading.font).to.equal(writing.font)
            expect(reading.left).to.be.closeTo(writing.left, 0.5)
            expect(reading.right).to.be.closeTo(writing.right, 0.5)
            const readLines = Math.round(
                paragraph.getBoundingClientRect().height /
                    parseFloat(getComputedStyle(paragraph).lineHeight)
            )
            expect(writtenLines).to.be.greaterThan(2)
            expect(readLines).to.equal(writtenLines)
        })
    })

    it('is written in place in the narrowest column, its toolbar on one row', () => {
        mountWorkspace()
        clickTile('map')
        dragTo({ tile: 'text' }, (doc) => outerEdge(doc, 'left'))
        dragDivider('Text 1', 'right', 0)
        cellSize('Text 1').its('width').should('be.closeTo', 240, 2)

        cy.get('[data-test="text-view-edit"]').focus().click()

        cy.document().should((doc) => expect(getCells(doc)).to.have.length(2))
        cy.get('[data-test="text-view"] .toolbar button:visible').should(
            (buttons) => {
                const tops = [...buttons].map(
                    (button) => button.getBoundingClientRect().top
                )
                expect(tops).to.have.length(5)
                expect(new Set(tops).size).to.equal(1)
            }
        )
    })
})
