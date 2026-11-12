import i18n from '@dhis2/d2-i18n'
import { COVERAGE_TARGET } from '@modules/demo/story'
import {
    format,
    panelCell,
    viewBody,
    type StepContext,
    type TourStep,
} from './tour-steps'

/* The steps on the map stay in one place, low beside it: clear of the
 * district and its drill menu, and below the chart and the table that
 * change with it */
const BESIDE_MAP = { side: 'right', align: 'end' } as const

/* The story the data hides, told as a question and its answer: where
 * malaria weighs most, when, and why there. One click takes the views from
 * where to why, which is what the app is for, and a drill down shows the
 * whole district is affected. */
export const getStorySteps = ({
    api,
    views,
    story,
}: StepContext): TourStep[] => {
    const { highest, lowest } = story
    const ratio = (
        Math.round((highest.incidence / lowest.incidence) * 10) / 10
    ).toLocaleString(i18n.language)
    return [
        {
            district: false,
            popover: {
                title: i18n.t('Malaria in Demoland'),
                description: i18n.t(
                    'Malaria is endemic in Demoland, and its burden varies widely between districts. <strong>Where is it highest, when, and why there?</strong> Three <strong>linked views</strong>, a map, a chart and a table, answer it in a few steps. A click in one updates the others. The data is synthetic, but follows a pattern typical of endemic settings.'
                ),
            },
        },
        {
            element: () => panelCell(api, views.map),
            district: false,
            popover: {
                title: i18n.t('Where'),
                description: i18n.t(
                    'Malaria incidence, confirmed cases per 1,000 population per year. <strong>{{highest}}</strong> has {{highestValue}}, <strong>{{ratio}} times</strong> {{lowest}} ({{lowestValue}}). Incidence compares districts of different population sizes, where case counts would mostly reflect population.',
                    {
                        highest: highest.name,
                        highestValue: format(highest.incidence),
                        ratio,
                        lowest: lowest.name,
                        lowestValue: format(lowest.incidence),
                    }
                ),
            },
        },
        {
            element: () => panelCell(api, views.chart),
            district: false,
            popover: {
                title: i18n.t('When'),
                description: i18n.t(
                    'The same incidence by month, one line per district. Incidence rises with the rainy season from May, but <strong>{{highest}} has the highest rate every month</strong>. Seasonality alone does not explain its burden.',
                    { highest: highest.name }
                ),
            },
        },
        {
            element: () => viewBody(views.map),
            district: false,
            advancesOnDistrictClick: true,
            popover: {
                ...BESIDE_MAP,
                title: i18n.t('Select a district'),
                description: i18n.t(
                    '<strong>Click {{highest}} on the map</strong>, and the other views update to {{highest}}. Or press <strong>Next</strong>, and the demo clicks it for you.',
                    { highest: highest.name }
                ),
            },
        },
        {
            element: () => panelCell(api, views.map),
            district: true,
            popover: {
                ...BESIDE_MAP,
                title: i18n.t('One click'),
                description: i18n.t(
                    "The map keeps every district in view and highlights {{highest}}. <strong>The chart and the table now show {{highest}}'s chiefdoms</strong>, and the org unit tree selects {{highest}}, without setting a filter in each view.",
                    { highest: highest.name }
                ),
            },
        },
        {
            element: () => viewBody(views.map),
            district: true,
            advancesOnMapDrill: true,
            popover: {
                ...BESIDE_MAP,
                title: i18n.t('Drill down'),
                description: i18n.t(
                    '<strong>Right-click {{highest}}</strong> on the map, then choose <strong>Drill down into {{highest}}</strong>. Or press <strong>Next</strong>, and the demo drills down for you.',
                    { highest: highest.name }
                ),
            },
        },
        {
            element: () => panelCell(api, views.map),
            district: true,
            mapDrilled: true,
            popover: {
                ...BESIDE_MAP,
                title: i18n.t('District-wide'),
                description: i18n.t(
                    "The map now shows {{highest}}'s <strong>{{count}} chiefdoms</strong>, with the legend classes used for the districts. <strong>All of them fall in the highest class</strong>, as {{highest}} does.",
                    {
                        highest: highest.name,
                        count: story.highestChiefdoms.count,
                    }
                ),
            },
        },
        {
            element: () => panelCell(api, views.chart),
            district: true,
            mapDrilled: true,
            popover: {
                title: i18n.t('Not a single hotspot'),
                description: i18n.t(
                    "The chart has shown {{highest}}'s chiefdoms since the click. <strong>Each stays above {{rate}} every month</strong>, the national rate for the year. This points to a district-wide driver rather than a localized outbreak.",
                    {
                        highest: highest.name,
                        rate: format(story.country.incidence),
                    }
                ),
            },
        },
        {
            element: () => panelCell(api, views.table),
            district: true,
            mapDrilled: true,
            popover: {
                title: i18n.t('Why'),
                description: i18n.t(
                    "The table has narrowed to {{highest}}'s chiefdoms too. In {{quarter}}, none of its {{count}} reaches the {{target}}% coverage target for the third dose of the malaria vaccine. <strong>Where the malaria burden is highest, vaccine coverage is lowest.</strong>",
                    {
                        highest: highest.name,
                        quarter: story.coverageQuarter,
                        count: story.highestChiefdoms.count,
                        target: COVERAGE_TARGET,
                    }
                ),
            },
        },
        /* It ends on the views as they are, for the user to go on from */
        {
            district: true,
            mapDrilled: true,
            popover: {
                title: i18n.t('From where to why, in two clicks'),
                description: i18n.t(
                    "A dashboard filter changes every item the same way. Here the views follow the analyst's questions. <strong>One click moved every view to {{highest}}</strong>, and each kept its role, from context to trend to coverage. With channels, <strong>two districts or two periods can be compared side by side</strong>, which one dashboard filter cannot do. <strong>How it works</strong> explains the links, and the <strong>Climate story</strong> shows them on climate data.",
                    { highest: highest.name }
                ),
            },
        },
    ]
}
