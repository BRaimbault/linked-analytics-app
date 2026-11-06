import i18n from '@dhis2/d2-i18n'
import { COVERAGE_TARGET } from '@modules/demo/story'
import {
    format,
    panelCell,
    viewBody,
    type StepContext,
    type TourStep,
} from './tour-steps'

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
                title: i18n.t('A question for Demoland'),
                description: i18n.t(
                    'Malaria is endemic in Demoland, and it weighs far more in some places than in others. Where, when, and why there? Three linked views answer it in a few steps. The data is made up, but follows a pattern seen where malaria is endemic.'
                ),
            },
        },
        {
            element: () => panelCell(api, views.map),
            district: false,
            popover: {
                title: i18n.t('Where'),
                description: i18n.t(
                    'Confirmed malaria cases per 1,000 people a year. {{highest}} has {{highestValue}}, {{ratio}} times {{lowest}} ({{lowestValue}}). A rate compares places of different sizes, where case counts would mostly show where people live.',
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
                    'The same rate, month by month, a line per district. Malaria rises with the rains from May, but {{highest}} has the highest rate every month. Its problem is not the season.',
                    { highest: highest.name }
                ),
            },
        },
        {
            element: () => viewBody(views.map),
            district: false,
            advancesOnDistrictClick: true,
            popover: {
                title: i18n.t('Ask the map'),
                description: i18n.t(
                    'Click {{highest}} on the map, and every view answers for {{highest}}. Or press Next, and the demo clicks it for you.',
                    { highest: highest.name }
                ),
            },
        },
        {
            element: () => panelCell(api, views.map),
            district: true,
            popover: {
                title: i18n.t('One click'),
                description: i18n.t(
                    'The map keeps every district and highlights {{highest}}, the value it set. Every other view now shows {{highest}}, with no filter to set in each.',
                    { highest: highest.name }
                ),
            },
        },
        {
            element: () => viewBody(views.map),
            district: true,
            advancesOnMapDrill: true,
            popover: {
                /* Beside the map: the drill menu opens at the pointer */
                side: 'right',
                title: i18n.t('Look closer'),
                description: i18n.t(
                    'Right-click {{highest}} on the map, then Drill down into {{highest}}. Or press Next, and the demo drills down for you.',
                    { highest: highest.name }
                ),
            },
        },
        {
            element: () => panelCell(api, views.map),
            district: true,
            mapDrilled: true,
            popover: {
                title: i18n.t('The whole district'),
                description: i18n.t(
                    "The map now shows {{highest}}'s {{count}} chiefdoms, on the classes it had for the districts. Every one is in the top class, as {{highest}} is.",
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
                title: i18n.t('Not one hotspot'),
                description: i18n.t(
                    "The chart now shows {{highest}}'s chiefdoms, month by month. Every one of them is above the country's rate, so the cause is shared across the district.",
                    { highest: highest.name }
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
                    "The table narrows to {{highest}}'s chiefdoms. In {{quarter}}, none of its {{count}} reaches the {{target}}% target for the malaria vaccine, nor for Penta 3, given at the same routine visits. Where malaria weighs most, prevention reaches the fewest children. Pick Penta 3 in the data selector after the tour, and the table shows it.",
                    {
                        highest: highest.name,
                        quarter: story.coverageQuarter,
                        count: story.highestChiefdoms.count,
                        target: COVERAGE_TARGET,
                    }
                ),
            },
        },
        {
            district: false,
            popover: {
                title: i18n.t('From where to why, in one click'),
                description: i18n.t(
                    'Without linked views, this takes three dashboards, the same filter set in each, and care that they all show the same place and period. Here every view stays on the same question. The other tour, How it works, shows how the views are linked.'
                ),
            },
        },
    ]
}
