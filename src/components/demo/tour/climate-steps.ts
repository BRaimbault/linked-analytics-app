import {
    ADD_VIEWS_PANEL_ID,
    getSettingsPanelId,
} from '@components/workspace/controller/panels'
import i18n from '@dhis2/d2-i18n'
import { getClimateStory } from '@modules/demo/climate-story'
import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import {
    areaOf,
    format,
    inPanel,
    lineOf,
    panelCell,
    toolContent,
    viewBody,
    type StepContext,
    type TourStep,
} from './tour-steps'

/* The climate app's Explore section, in linked views: a place picked in
 * the tree, then precipitation and temperature, as Explore's tabs show
 * them; then what Explore can't show, the whole country on raster maps,
 * two variables at once, and the months played through */
export const getClimateSteps = ({
    api,
    views,
    story,
}: StepContext): TourStep[] => {
    const climate = getClimateStory()
    const district = story.highest.name
    return [
        {
            district: false,
            dataPick: null,
            popover: {
                title: i18n.t('Climate data, explored'),
                description: i18n.t(
                    "The climate app's <strong>Explore</strong> section charts the weather and climate of one place at a time. Here the same data, <strong>imported into DHIS2</strong> by the climate app, shows in a map, a chart and a table that follow each other. Precipitation and temperature serve as examples."
                ),
            },
        },
        {
            element: () => viewBody(views.orgUnitSelector),
            district: false,
            advancesOnDistrictClick: true,
            popover: {
                /* Beside the tree, clear of its nodes */
                side: 'right',
                title: i18n.t('Pick a place'),
                description: i18n.t(
                    "<strong>Click {{district}} in the org unit tree</strong>, as in Explore's left panel. Or press <strong>Next</strong>, and the demo clicks it for you.",
                    { district }
                ),
            },
        },
        {
            element: () => panelCell(api, views.chart),
            district: true,
            popover: {
                /* Clear of the table under the chart, which it names too */
                side: 'left',
                title: i18n.t('Precipitation'),
                description: i18n.t(
                    "As in Explore's <strong>Precipitation</strong> tab, the chart shows {{district}}'s monthly precipitation. The rainy season runs from May to October, and <strong>{{month}} is the wettest month</strong>, with {{value}} mm. The table gives the same months for each of its chiefdoms.",
                    {
                        district,
                        month: climate.peak.name,
                        value: format(climate.peak.value),
                    }
                ),
            },
        },
        {
            element: () => panelCell(api, views.map),
            district: true,
            popover: {
                title: i18n.t('Across the country'),
                description: i18n.t(
                    'The map shows the same data as a <strong>raster layer</strong>, as Maps draws it, under the district boundaries, which Explore shows one at a time. It marks {{district}}, the <strong>wettest district</strong>, with {{value}} mm over the last 12 months.',
                    { district, value: format(climate.wettest.yearly) }
                ),
            },
        },
        {
            element: () => viewBody(views.dataSelector),
            district: true,
            dataPick: null,
            advancesOnDataPick: DATA_ITEM_IDS.temperature,
            popover: {
                side: 'right',
                title: i18n.t('Pick a variable'),
                description: i18n.t(
                    "The data selector, at the top, works as Explore's tabs. <strong>Pick Air temperature</strong> in it, or press <strong>Next</strong>, and the demo picks it for you."
                ),
            },
        },
        {
            element: () =>
                areaOf([panelCell(api, views.map), lineOf(api, views.chart)]),
            district: true,
            dataPick: DATA_ITEM_IDS.temperature,
            popover: {
                /* Over the selectors, clear of the views that change */
                side: 'left',
                align: 'end',
                title: i18n.t('Every view switches'),
                description: i18n.t(
                    "The map, the chart and the table now all show <strong>temperature</strong>, as Explore's Temperature tab does for one chart. <strong>The rainy months are the coolest</strong>, and the end of the dry season the hottest."
                ),
            },
        },
        {
            element: () =>
                toolContent(api, ADD_VIEWS_PANEL_ID).querySelector(
                    '[data-test="add-view-map"]'
                ) as Element,
            district: true,
            dataPick: null,
            temperatureMap: true,
            toolPanelId: ADD_VIEWS_PANEL_ID,
            blocksClicks: true,
            popover: {
                title: i18n.t('Two maps at once'),
                description: i18n.t(
                    'Explore shows one variable at a time. Here a <strong>second map</strong> comes from Add views, and the demo adds one for temperature. It is set not to follow the data selector, so it <strong>keeps temperature</strong> while the first map goes back to precipitation.'
                ),
            },
        },
        {
            element: () =>
                inPanel(
                    `settings-panel-${views.table}`,
                    '[data-test="saved-item-picker"]'
                ),
            district: true,
            temperatureMap: true,
            temperatureChart: true,
            toolPanelId: getSettingsPanelId(views.table),
            blocksClicks: true,
            popover: {
                title: i18n.t('A table becomes a chart'),
                description: i18n.t(
                    "A view shows any saved item. In the table's <strong>settings tab</strong>, the demo picks <strong>Temperature by month</strong>, which turns the table into a chart of the lowest, mean and highest temperatures, as Explore's Temperature tab shows them."
                ),
            },
        },
        {
            element: () =>
                areaOf([lineOf(api, views.map), lineOf(api, views.chart)]),
            district: true,
            temperatureMap: true,
            temperatureChart: true,
            playsTimeline: true,
            popover: {
                /* Over the selectors, clear of the maps and the charts */
                side: 'left',
                align: 'end',
                title: i18n.t('Play through the year'),
                description: i18n.t(
                    'The demo presses <strong>Play</strong> on the timeline, and <strong>both maps step through the months</strong> together, while the charts mark each one. The rains come and go, and the land cools while they last. Press Next once the year is over.'
                ),
            },
        },
        /* It ends on the views as they are, for the user to go on from */
        {
            district: true,
            temperatureMap: true,
            temperatureChart: true,
            popover: {
                title: i18n.t('Climate and health, side by side'),
                description: i18n.t(
                    'One workspace can hold climate and health data together, linked the same way. In the <strong>Malaria story</strong>, malaria weighs most in {{district}}, which also gets <strong>the most rain</strong>.',
                    { district }
                ),
            },
        },
    ]
}
