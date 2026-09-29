import {
    clickFeature,
    expectChartCategories,
    mapFeature,
    openSavedItem,
} from './demo-helpers'
import { clickTile, inViewHeader, mountWorkspace, SMOKE } from './grid-helpers'

/* A map of malaria by district beside a chart of the same, and, when
 * asked, an org unit selector in the bar above them */
const setUpLinkedViews = ({ selector = false } = {}) => {
    mountWorkspace({ demo: true })
    clickTile('map')
    clickTile('visualization')
    if (selector) {
        clickTile('org-unit-selector')
    }
    openSavedItem('Map 1', 'Malaria cases by district')
    openSavedItem(
        'Visualization 1',
        'Malaria cases by district, last 12 months'
    )
    expectChartCategories(['North', 'West', 'East', 'South'])
}

/* An option of a DHIS2 select in the tools strip, found by its field's
 * test id. The strip at the top is short: it scrolls to the field, as a
 * user would (the least scroll, so the 800px mount stays put). */
const pickOption = (testId: string, option: string) => {
    cy.get(`[data-test="${testId}"] [data-test="dhis2-uicore-select-input"]`)
        .filter(':visible')
        .then((input) => {
            input[0].scrollIntoView({ block: 'nearest' })
            return input
        })
        .click({ scrollBehavior: false })
    cy.get('[data-test="dhis2-uicore-singleselectoption"]')
        .contains(option)
        .click()
}

const pickSelectorValue = (index: number, option: string) => {
    cy.get('[data-test="selector-view"]')
        .eq(index)
        .find('[data-test="dhis2-uicore-select-input"]')
        .click({ scrollBehavior: false })
    cy.get('[data-test="dhis2-uicore-singleselectoption"]')
        .contains(option)
        .click()
}

const expectDimmed = (name: string, dimmed: boolean) =>
    mapFeature(name)
        .invoke('attr', 'class')
        .should(dimmed ? 'match' : 'not.match', /dimmed/)

describe('linked views', () => {
    it('makes the chart follow a district clicked on the map', SMOKE, () => {
        setUpLinkedViews()

        clickFeature('North')

        expectChartCategories(['Amber Hills', 'Birch Valley', 'Cedar Coast'])
        /* The map highlights its click, and isn't filtered by it */
        cy.get('[data-test="fake-feature"]').should('have.length', 4)
        expectDimmed('West', true)
        expectDimmed('North', false)

        clickFeature('North')

        expectChartCategories(['North', 'West', 'East', 'South'])
        expectDimmed('West', false)
    })

    it('makes the map follow a district clicked on the chart', () => {
        setUpLinkedViews()

        /* The West bar */
        cy.get('[data-test="fake-point"]')
            .eq(1)
            .click({ scrollBehavior: false })

        cy.get('[data-test="fake-feature"]').should('have.length', 4)
        mapFeature('Kestrel').should('exist')
        cy.get('[data-test="fake-point"]')
            .eq(0)
            .invoke('attr', 'class')
            .should('match', /dimmed/)
        cy.get('[data-test="fake-point"]')
            .eq(1)
            .invoke('attr', 'class')
            .should('not.match', /dimmed/)
    })

    it('shows the channel in each view’s header, without cutting its title', () => {
        setUpLinkedViews()
        clickFeature('North')

        for (const title of ['Map 1', 'Visualization 1']) {
            inViewHeader(title, '[data-test="channel-badge-A"]')
                .should('have.text', 'A→←')
                .and('be.visible')
            inViewHeader(title, '.dv-default-tab-content').should((name) => {
                const element = name[0]
                expect(element.scrollWidth).to.be.at.most(element.clientWidth)
            })
        }
    })

    it('compares two districts, a selector for each view', () => {
        mountWorkspace({ demo: true })
        clickTile('map')
        clickTile('visualization')
        clickTile('org-unit-selector')
        clickTile('org-unit-selector')
        openSavedItem('Map 1', 'Malaria cases by district')
        openSavedItem(
            'Visualization 1',
            'Malaria cases by district, last 12 months'
        )

        /* Visualization 1's settings are open: its Links section */
        pickOption('links-ou-channel', 'B · Nothing selected')
        pickSelectorValue(0, 'West')
        pickSelectorValue(1, 'East')

        mapFeature('Kestrel').should('exist')
        expectChartCategories([
            'Dawn Plains',
            'Elm Ridge',
            'Fern Lake',
            'Granite Bay',
        ])
        inViewHeader('Visualization 1', '[data-test="channel-badge-B"]').should(
            'be.visible'
        )
        inViewHeader('Map 1', '[data-test="channel-badge-B"]').should(
            'not.exist'
        )
    })

    it('lets the selector set the value for both views', () => {
        setUpLinkedViews({ selector: true })
        cy.get('[data-test="selector-view"]')
            .should('contain.text', 'Org unit A')
            .find('[data-test="dhis2-uicore-select-input"]')
            .click({ scrollBehavior: false })
        cy.get('[data-test="dhis2-uicore-singleselectoption"]')
            .contains('West')
            .click()

        const westChiefdoms = [
            'Kestrel',
            'Lark Meadow',
            'Maple Point',
            'Nettle Hill',
        ]
        expectChartCategories(westChiefdoms)
        cy.get('[data-test="fake-feature"]').should('have.length', 4)
        mapFeature('Kestrel').should('exist')

        /* A click on the map shows in the selector */
        clickFeature('Kestrel')
        cy.get('[data-test="selector-view"]').should('contain.text', 'Kestrel')
    })

    it('opens the drill menu at the pointer on a right-click, and drills both ways', () => {
        setUpLinkedViews()

        /* At the pointer, not at the plugin's corner */
        clickFeature('East', 'rightclick').then(({ x, y }) => {
            cy.get('[data-test="drill-menu"]').should((menu) => {
                const box = menu[0].getBoundingClientRect()
                expect(box.left).to.be.closeTo(x, 4)
                expect(box.top).to.be.closeTo(y, 4)
            })
        })
        cy.get('[data-test="drill-menu"] [role="menuitem"]')
            .contains('Drill down into East')
            .click()

        cy.get('[data-test="fake-feature"]').should('have.length', 4)
        mapFeature('Dawn Plains').should('exist')
        /* A drill counts as a click: the chart follows East */
        expectChartCategories([
            'Dawn Plains',
            'Elm Ridge',
            'Fern Lake',
            'Granite Bay',
        ])

        /* Up to East's level: the districts, East still the value */
        clickFeature('Elm Ridge', 'rightclick')
        cy.get('[data-test="drill-menu"] [role="menuitem"]')
            .contains('Drill up to East')
            .click()
        mapFeature('North').should('exist')
        cy.get('[data-test="fake-feature"]').should('have.length', 4)
        expectChartCategories([
            'Dawn Plains',
            'Elm Ridge',
            'Fern Lake',
            'Granite Bay',
        ])

        clickFeature('North', 'rightclick')
        cy.get('[data-test="drill-menu"] [role="menuitem"]')
            .contains('Back to the saved item')
            .click()
        expectChartCategories(['North', 'West', 'East', 'South'])
    })
})
