import { toolTab } from './grid-helpers'

/* Opens a view's settings and picks one of the demo's saved items. A
 * click on the tools tab already open would collapse the strip. */
export const openSavedItem = (viewTitle: string, itemName: string) => {
    toolTab(viewTitle)
        .closest('.dv-tab')
        .then((tab) => {
            if (!tab.hasClass('dv-active-tab')) {
                cy.wrap(tab).click()
            }
        })
    cy.get(
        '[data-test="saved-item-picker"] [data-test="dhis2-uicore-select-input"]'
    )
        .filter(':visible')
        .click()
    cy.get('[data-test="dhis2-uicore-singleselectoption"]')
        .contains(itemName)
        .click()
}

/* A map feature, by the org unit name its tooltip starts with */
export const mapFeature = (name: string) =>
    cy
        .get('[data-test="fake-feature"]')
        .filter((_, feature) => !!feature.textContent?.startsWith(`${name}:`))

/* The chart's category labels, without the value axis's numbers */
export const expectChartCategories = (names: string[]) =>
    cy
        .get('[data-test="fake-chart"] text')
        .should((texts) =>
            expect(
                [...texts]
                    .map(({ textContent }) => textContent)
                    .filter((text) => !/^[\d,]+$/.test(text as string))
            ).to.deep.equal(names)
        )
