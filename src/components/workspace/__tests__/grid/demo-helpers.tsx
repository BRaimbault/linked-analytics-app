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

/* A point on a feature that a pointer would reach, from its box's top left
 * corner: shapes aren't convex, so the box's centre can fall on a
 * neighbour */
const pointOn = (feature: SVGPathElement): [number, number] => {
    const box = feature.getBoundingClientRect()
    const toShape = (feature.getScreenCTM() as DOMMatrix).inverse()
    const steps = 12
    for (let row = 1; row < steps; row++) {
        for (let column = 1; column < steps; column++) {
            const [x, y] = [
                box.left + (box.width * column) / steps,
                box.top + (box.height * row) / steps,
            ]
            if (
                feature.isPointInFill(
                    new DOMPoint(x, y).matrixTransform(toShape)
                ) &&
                document.elementFromPoint(x, y) === feature
            ) {
                return [x - box.left, y - box.top]
            }
        }
    }
    throw new Error('No point on the feature is in reach')
}

/* Clicks a feature where a pointer would reach it, and yields that point
 * in the page */
export const clickFeature = (
    name: string,
    action: 'click' | 'rightclick' = 'click'
) =>
    mapFeature(name).then((feature) => {
        const [x, y] = pointOn(feature[0] as unknown as SVGPathElement)
        const { left, top } = feature[0].getBoundingClientRect()
        /* Where it is: scrolling it into view would scroll the 800px
         * mount */
        cy.wrap(feature)[action](x, y, { scrollBehavior: false })
        return cy.wrap({ x: left + x, y: top + y })
    })

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
