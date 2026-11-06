import {
    ADD_VIEWS_PANEL_ID,
    getSettingsPanelId,
    WORKSPACE_PANEL_ID,
} from '@components/workspace/controller/panels'
import i18n from '@dhis2/d2-i18n'
import {
    inPanel,
    panelCell,
    toolContent,
    viewBody,
    type StepContext,
    type TourStep,
} from './tour-steps'

/* How this workspace is set up: its views, then one channel followed in
 * detail (the org unit's), then another in passing (the period's) */
export const getHowItWorksSteps = ({
    api,
    views,
    story,
    channels,
}: StepContext): TourStep[] => {
    const { highest } = story
    const orgUnit = channels.orgUnit
    return [
        {
            district: false,
            showsViewHeaders: false,
            popover: {
                title: i18n.t('How this workspace works'),
                description: i18n.t(
                    'Six views. A map, a chart and a table show data, and three selectors set what they show. They are linked through channels. This tour follows one channel from start to end.'
                ),
            },
        },
        {
            element: () =>
                inPanel('workspace-panel', '[data-test="view-headers-hidden"]'),
            district: false,
            toolPanelId: WORKSPACE_PANEL_ID,
            showsViewHeaders: true,
            popover: {
                title: i18n.t('View headers'),
                description: i18n.t(
                    'Every view has a header, with its name, its channels, and buttons to maximize or close it. The demo starts without them, for a first look. The Workspace tab shows them again.'
                ),
            },
        },
        {
            element: () => toolContent(api, ADD_VIEWS_PANEL_ID),
            district: false,
            toolPanelId: ADD_VIEWS_PANEL_ID,
            popover: {
                title: i18n.t('Views come from here'),
                description: i18n.t(
                    'Up to 4 charts, maps or tables, and selectors and notes. Click a tile, or drag it where you want it. Every view also gets a settings tab here.'
                ),
            },
        },
        {
            element: () => panelCell(api, views.orgUnitSelector),
            district: false,
            popover: {
                title: i18n.t('A channel'),
                description: i18n.t(
                    'A channel carries one value of one dimension to every view in it. This selector sets the org unit of channel {{channel}}, named by its letter and color.',
                    { channel: orgUnit }
                ),
            },
        },
        {
            element: () =>
                panelCell(api, views.map).querySelector(
                    '[data-test="channel-badges"]'
                ) as Element,
            district: false,
            popover: {
                title: i18n.t("Who's in it"),
                description: i18n.t(
                    "Each view's badges name its channels. The map's {{channel}} badge has an arrow out, it sets the value when clicked, and an arrow in, it follows the value. The chart and the table have the same badge.",
                    { channel: orgUnit }
                ),
            },
        },
        {
            element: () =>
                inPanel(
                    `settings-panel-${views.map}`,
                    '[data-test="links-section"]'
                ),
            district: false,
            toolPanelId: getSettingsPanelId(views.map),
            popover: {
                title: i18n.t('Where that is set'),
                description: i18n.t(
                    "A view's settings tab has a Links section. For each dimension, it picks the view's channel, whether the view sets the value by clicking, and whether it follows it."
                ),
            },
        },
        {
            element: () => viewBody(views.map),
            district: false,
            advancesOnDistrictClick: true,
            popover: {
                title: i18n.t('Set the value'),
                description: i18n.t(
                    'Click {{highest}} on the map, and the map sets the value of channel {{channel}}. Or press Next, and the demo clicks it for you.',
                    { highest: highest.name, channel: orgUnit }
                ),
            },
        },
        {
            element: () => viewBody(views.orgUnitSelector),
            district: true,
            popover: {
                /* Beside the tree, clear of its nodes */
                side: 'right',
                title: i18n.t('The value travels'),
                description: i18n.t(
                    'The tree shows {{highest}}, as it is in channel {{channel}} too, and opens its branch. Pick another org unit in it, and the map follows it in turn.',
                    { highest: highest.name, channel: orgUnit }
                ),
            },
        },
        {
            element: () => panelCell(api, views.chart),
            district: true,
            popover: {
                title: i18n.t('Followers rewrite their own item'),
                description: i18n.t(
                    "The chart follows channel {{channel}}. Its districts become {{highest}}'s chiefdoms, as its saved item asks for the units below the one it shows. The table narrows to them too. The map, which set the value, highlights it rather than redrawing.",
                    { highest: highest.name, channel: orgUnit }
                ),
            },
        },
        {
            element: () => viewBody(views.chart),
            district: true,
            popover: {
                title: i18n.t('Another channel'),
                description: i18n.t(
                    'Channel {{channel}} carries a period the same way. Click a month on the chart, and the map shows that month, while the table marks the quarter holding it.',
                    { channel: channels.period }
                ),
            },
        },
        {
            element: () => viewBody(views.periodSelector),
            district: true,
            popover: {
                title: i18n.t('Play'),
                description: i18n.t(
                    'The timeline sets channel {{channel}} one month at a time. Press play, and the map steps through the months, each step waiting until it has drawn. The chart and the table follow with Highlight only, set in their Links. They keep their own periods, and mark each month.',
                    { channel: channels.period }
                ),
            },
        },
        {
            element: () =>
                inPanel('workspace-panel', '[data-test="reset-to-preset"]'),
            district: false,
            toolPanelId: WORKSPACE_PANEL_ID,
            blocksClicks: true,
            popover: {
                title: i18n.t('Start again'),
                description: i18n.t(
                    'Reset the demo brings this layout back at any time.'
                ),
            },
        },
        {
            district: false,
            popover: {
                title: i18n.t('Over to you'),
                description: i18n.t(
                    'Add a view, link it in its settings, and click. The other tour, The story, shows what the links reveal in this data.'
                ),
            },
        },
    ]
}
