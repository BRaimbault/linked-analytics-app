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
                    'This workspace holds six <strong>views</strong>, arranged in a grid. A map, a chart and a table show data, and three <strong>selectors</strong> set the period, org unit and data item they show. Views are linked through <strong>channels</strong>. This tour follows one channel from start to end.'
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
                /* Beside it: the setting below comes back with the headers */
                side: 'right',
                title: i18n.t('View headers'),
                description: i18n.t(
                    'Each view has a header with its name, its <strong>channel badges</strong>, and buttons to maximize or close it. The demo starts with headers hidden, for a cleaner first look. The <strong>Hide view headers</strong> option in the <strong>Workspace</strong> tab turns them off again.'
                ),
            },
        },
        {
            element: () => toolContent(api, ADD_VIEWS_PANEL_ID),
            district: false,
            toolPanelId: ADD_VIEWS_PANEL_ID,
            popover: {
                title: i18n.t('Adding views'),
                description: i18n.t(
                    'The <strong>Add views</strong> tab offers up to 4 maps and visualizations, as well as selectors and text. Click a tile, or drag it to where you want it. Each view also gets its own <strong>settings tab</strong> in this strip.'
                ),
            },
        },
        {
            element: () => panelCell(api, views.orgUnitSelector),
            district: false,
            popover: {
                title: i18n.t('Channels'),
                description: i18n.t(
                    'A <strong>channel</strong> shares one value, here an org unit, between the views linked to it. When one view sets it, the others follow. Each channel has a letter and a color. This selector sets channel {{channel}}, shown as <strong>Org unit {{channel}}</strong> above the tree.',
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
                title: i18n.t('Channel badges'),
                description: i18n.t(
                    "A view's <strong>badges</strong> show the channels it belongs to. The map's <strong>{{channel}}→←</strong> badge means it <strong>sets</strong> the value when clicked (→) and <strong>follows</strong> it (←). The chart and the table carry the same badge. Hover over a badge to see its value, or click it to clear the value or leave the channel.",
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
                title: i18n.t('Link settings'),
                description: i18n.t(
                    "Each view's settings tab has a <strong>Links</strong> section, with one row per dimension. <strong>Channel</strong> selects the view's channel. <strong>Set the value by clicking</strong> and <strong>Follow the value</strong> define its role in it. <strong>When it follows</strong> defines what it shows, for example Sub-units, or <strong>Highlight only</strong>, which keeps the view's own periods or org units and marks the value."
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
                    '<strong>Click {{highest}} on the map</strong>, and the map sets the value of channel {{channel}}. Or press <strong>Next</strong>, and the demo clicks it for you.',
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
                    'The org unit tree is linked to channel {{channel}} too, so it <strong>selects {{highest}}</strong>. Select another org unit in it, and the map follows in turn.',
                    { highest: highest.name, channel: orgUnit }
                ),
            },
        },
        {
            element: () => panelCell(api, views.chart),
            district: true,
            popover: {
                title: i18n.t('Each view follows in its own way'),
                description: i18n.t(
                    "The chart follows channel {{channel}} with <strong>Sub-units</strong>, set under When it follows. Its districts become <strong>{{highest}}'s chiefdoms</strong>. The table narrows to them too. The map, which set the value, <strong>highlights</strong> it rather than redrawing.",
                    { highest: highest.name, channel: orgUnit }
                ),
            },
        },
        {
            element: () => viewBody(views.chart),
            district: true,
            popover: {
                title: i18n.t('A second channel'),
                description: i18n.t(
                    "Channel {{channel}} carries a period in the same way. <strong>Click a month's name</strong> under the chart. The map shows that month, and the table marks the quarter that contains it. Clicking a data point sets <strong>both its month and its org unit</strong>.",
                    { channel: channels.period }
                ),
            },
        },
        {
            element: () => viewBody(views.periodSelector),
            district: true,
            popover: {
                title: i18n.t('Play through time'),
                description: i18n.t(
                    'The <strong>timeline</strong> sets channel {{channel}} one month at a time. Press <strong>Play</strong>, and the map steps through the months, each step waiting until the map has loaded. The chart and the table follow with <strong>Highlight only</strong>. They keep their own periods, and mark the current month, or the quarter that contains it.',
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
                    '<strong>Reset the demo</strong> restores this layout at any time.'
                ),
            },
        },
        {
            district: false,
            popover: {
                title: i18n.t('Over to you'),
                description: i18n.t(
                    'Add a view, link it in its settings tab, and click to explore. The <strong>Malaria story</strong> and the <strong>Climate story</strong> show what these links reveal in the data.'
                ),
            },
        },
    ]
}
