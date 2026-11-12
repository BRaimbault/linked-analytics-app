import { DemoWorkspace } from '@components/demo/demo-workspace'
import { CustomDataProvider } from '@dhis2/app-runtime'
import { CssReset, CssVariables } from '@dhis2/ui'
import { createStore } from '@store/store'
import type { DataEngine } from '@types'
import { Provider } from 'react-redux'

/* The tours in a real browser: driver.js measures the page, which jsdom
 * can't. Cypress clears the browser's storage between tests, so each one
 * is a first visit and the story tour starts by itself. */

/* Each tour's length, its steps without a target, and the steps that ask
 * for a click on the district and a drill down into it (counted from 1, as
 * the tour shows them) */
const STORY = { count: 10, targetless: [1, 10], clickStep: 4, drillStep: 6 }
const HOW_IT_WORKS = {
    count: 13,
    targetless: [1, 13],
    linksStep: 6,
    /* "Pick another org unit in it", "Click a month on the chart" and
     * "Press play" */
    pickStep: 8,
    monthStep: 10,
    playStep: 11,
}

const CLIMATE = {
    count: 10,
    targetless: [1, 10],
    /* "Click South in the org unit tree", "Pick Air temperature", the step
     * that turns the table into a chart, and "Play through the year" */
    placeStep: 2,
    pickStep: 5,
    chartStep: 8,
    playStep: 9,
}

const mountDemo = () => {
    cy.mount(
        <CustomDataProvider data={{}}>
            <Provider store={createStore({} as DataEngine)}>
                <CssReset />
                <CssVariables colors spacers elevations theme />
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '800px',
                    }}
                >
                    <DemoWorkspace />
                </div>
            </Provider>
        </CustomDataProvider>
    )
}

const popover = () => cy.get('.driver-popover')

const expectStep = (step: number, count: number) =>
    cy
        .get('.driver-popover-progress-text')
        .should('have.text', `${step} of ${count}`)

/* A step's popover sits by its highlighted element, within its arrow's
 * reach on one side */
const expectPopoverByTarget = () =>
    cy.get('.driver-active-element').should((target) => {
        const box = target[0].getBoundingClientRect()
        const tip = (
            document.querySelector('.driver-popover') as Element
        ).getBoundingClientRect()
        const gapX = Math.max(box.left - tip.right, tip.left - box.right, 0)
        const gapY = Math.max(box.top - tip.bottom, tip.top - box.bottom, 0)
        expect(box.width * box.height).to.be.greaterThan(0)
        expect(Math.min(gapX, gapY)).to.be.lessThan(40)
    })

/* The selectors' values, as text: the tree itself names every unit */
const periodSelector = () =>
    cy.get('[data-test="period-timeline"] [data-test="selector-value"]')
const orgUnitSelector = () =>
    cy.get('[data-test="org-unit-tree"] [data-test="selector-value"]')

const south = () =>
    cy
        .get('[data-test="fake-feature"]')
        .filter((_index, path) =>
            Boolean(path.textContent?.startsWith('South:'))
        )

const clickSouth = () => south().click()

const next = () => cy.get('.driver-popover-next-btn').click()

describe('the demo tours', () => {
    it('tells the story, takes the user’s click, and ends on the views as they are', () => {
        mountDemo()

        for (let step = 1; step <= STORY.count; step++) {
            expectStep(step, STORY.count)
            popover().should('be.visible')
            if (!STORY.targetless.includes(step)) {
                expectPopoverByTarget()
            }
            if (step === STORY.clickStep) {
                /* The user's own click reaches the map, and moves on */
                clickSouth()
                continue
            }
            if (step === STORY.clickStep + 1) {
                orgUnitSelector().should('contain.text', 'South')
            }
            if (step === STORY.drillStep) {
                /* The map's menu takes the user's clicks, and the drill
                 * moves on */
                south().rightclick()
                cy.contains(
                    '[data-test="drill-menu"] [role="menuitem"]',
                    'Drill down into South'
                ).click()
                expectStep(step + 1, STORY.count)
                cy.get('[data-test="fake-feature"]')
                    .first()
                    .should('contain.text', 'South / ')
                continue
            }
            next()
        }

        popover().should('not.exist')
        /* The workspace stays as the tour left it, to go on from */
        orgUnitSelector().should('contain.text', 'South')
        cy.get('[data-test="fake-feature"]')
            .first()
            .should('contain.text', 'South / ')
    })

    it('shows how it works, with each tools tab whole, then folds the tools again', () => {
        mountDemo()
        cy.get('.driver-popover-close-btn').click()
        cy.get('[data-test="take-tour-how-it-works"]').click()

        for (let step = 1; step <= HOW_IT_WORKS.count; step++) {
            expectStep(step, HOW_IT_WORKS.count)
            if (!HOW_IT_WORKS.targetless.includes(step)) {
                expectPopoverByTarget()
            }
            if (step === HOW_IT_WORKS.linksStep) {
                /* The strip grew: the Links section ends inside it */
                cy.get('.driver-active-element').should((links) => {
                    const strip = (
                        document.querySelector('.dv-edge-group') as Element
                    ).getBoundingClientRect()
                    const box = links[0].getBoundingClientRect()
                    expect(box.bottom).to.be.at.most(strip.bottom + 1)
                })
            }
            if (step === HOW_IT_WORKS.pickStep) {
                /* "Select another org unit in it": the tree takes the user's
                 * clicks */
                cy.contains(
                    '.driver-active-element [data-test$="-node-label"] span',
                    /^East$/
                ).click()
                orgUnitSelector().should('have.text', 'East')
            }
            if (step === HOW_IT_WORKS.playStep) {
                /* "Press play": the timeline takes it, and moves on */
                cy.get('.driver-active-element [data-test="timeline-play"]')
                    .click()
                    .should('have.attr', 'aria-label', 'Pause')
                periodSelector().should(
                    'not.have.text',
                    'Each view shows its own'
                )
            }
            if (step === HOW_IT_WORKS.monthStep) {
                /* "Click a month's name under the chart": it sets the
                 * period alone, the district stays */
                cy.get('.driver-active-element [data-test="fake-label"]')
                    .first()
                    .click()
                periodSelector().should(
                    'not.contain.text',
                    'Each view shows its own'
                )
                orgUnitSelector().should('have.text', 'South')
            }
            next()
        }

        popover().should('not.exist')
        cy.get('.dv-edge-group.dv-edge-collapsed').should('exist')
        /* The last steps clear the org unit; the month played stays */
        periodSelector().should('not.contain.text', 'Each view shows its own')
        orgUnitSelector().should('contain.text', 'Each view shows its own')
    })

    it('explores the climate on its own layout, takes the user’s picks, and shows two maps', () => {
        mountDemo()
        cy.get('.driver-popover-close-btn').click()
        cy.get('[data-test="take-tour-climate"]').click()

        for (let step = 1; step <= CLIMATE.count; step++) {
            expectStep(step, CLIMATE.count)
            popover().should('be.visible')
            if (!CLIMATE.targetless.includes(step)) {
                expectPopoverByTarget()
            }
            if (step === CLIMATE.placeStep) {
                /* The tree takes the user's click, and moves on */
                cy.contains(
                    '.driver-active-element [data-test$="-node-label"] span',
                    /^South$/
                ).click()
                orgUnitSelector().should('have.text', 'South')
                continue
            }
            if (step === CLIMATE.pickStep) {
                /* The data selector takes the user's pick, and moves on */
                cy.get(
                    '.driver-active-element [data-test="dhis2-uicore-select-input"]'
                ).click()
                cy.contains(
                    '[data-test="dhis2-uicore-singleselectoption"]',
                    'Air temperature (ERA5-Land)'
                ).click()
                continue
            }
            if (step === CLIMATE.chartStep) {
                cy.contains(
                    '[data-test="fake-visualization"]',
                    'Temperature by month, last 12 months'
                ).should('exist')
            }
            if (step === CLIMATE.playStep) {
                cy.get('[data-test="fake-map"]').should('have.length', 2)
                cy.get('[data-test="fake-raster"]').each((raster) => {
                    expect(raster.find('rect').length).to.be.greaterThan(0)
                })
                /* It plays by itself, with the charts in view */
                cy.get('[data-test="timeline-play"]').should(
                    'have.attr',
                    'aria-label',
                    'Pause'
                )
            }
            next()
        }

        popover().should('not.exist')
        /* The workspace stays as the tour left it, to go on from */
        cy.get('[data-test="fake-map"]').should('have.length', 2)
        orgUnitSelector().should('contain.text', 'South')
    })

    it('shows where it clicks, clears it when closed, and starts again from the banner', () => {
        mountDemo()
        for (let step = 1; step < STORY.clickStep; step++) {
            expectStep(step, STORY.count)
            next()
        }
        expectStep(STORY.clickStep, STORY.count)
        next()

        cy.get('[data-test="tour-click-ring"]').should('exist')
        expectStep(STORY.clickStep + 1, STORY.count)
        orgUnitSelector().should('contain.text', 'South')
        cy.get('.driver-popover-close-btn').click()

        popover().should('not.exist')
        orgUnitSelector().should('contain.text', 'Each view shows its own')
        cy.get('[data-test="take-tour-malaria"]').click()
        expectStep(1, STORY.count)
    })
})
