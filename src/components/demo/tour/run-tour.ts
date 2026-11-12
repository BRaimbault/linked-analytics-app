import {
    collapseTools,
    openToolPanel,
} from '@components/workspace/controller/settings'
import i18n from '@dhis2/d2-i18n'
import { getDataItem } from '@modules/demo/data-items'
import { getDemoStory } from '@modules/demo/story'
import type { DockviewApi } from 'dockview-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { CLICK_DELAY, showClickAt } from './click-ring'
import classes from './styles/demo-tour.module.css'
import {
    afterLayout,
    click,
    closeDrillMenu,
    closeSelectMenu,
    findDistrict,
    findDrillDownItem,
    findPlayButton,
    findSelectInput,
    findSelectOption,
    findTreeLabel,
    isPlaying,
    keepingScroll,
    MENU_DELAY,
    rightClick,
} from './tour-dom'
import {
    removeArea,
    type StepContext,
    type TourKind,
    type TourStep,
    type TourViews,
} from './tour-steps'
import { TOURS } from './tours'

export type DemoTourHandle = { close: () => void; closeQuietly: () => void }

/* What the tour clicks for the user: the district, its drill (the
 * right-click, then the menu item), a data item or a saved item (the
 * drop-down, then its option), the map it adds, play, or "Hide view
 * headers" */
type PendingKind =
    'district' | 'drill' | 'data' | 'map' | 'chart' | 'play' | 'headers'

/* Drop-downs a pending click leaves open, closed if it's dropped */
const OPENS_MENU = new Set<PendingKind>(['data', 'chart'])

/* An optional piece of the workspace a step shows or not */
type Shown = { isShown: () => boolean; show: () => void; hide: () => void }

/* What a step needs done on the map: a drill sets the district too */
const getMapClick = (step: TourStep): PendingKind | null => {
    if (step.mapDrilled) {
        return 'drill'
    }
    return step.district ? 'district' : null
}

/* Whether a click the tour has yet to make still serves the step */
const stillNeeded = (step: TourStep, kind: PendingKind) => {
    switch (kind) {
        case 'data':
            return Boolean(step.dataPick)
        case 'map':
            return Boolean(step.temperatureMap)
        case 'chart':
            return Boolean(step.temperatureChart)
        case 'play':
            return Boolean(step.playsTimeline)
        default:
            return kind === getMapClick(step)
    }
}

type TourContext = {
    kind: TourKind
    api: DockviewApi
    views: TourViews
    channels: StepContext['channels']
    /* The org units the org unit channel holds, and a way to hear when
     * they change, e.g. by the user's own click */
    getSelectedOrgUnitIds: () => string[]
    subscribe: (listener: () => void) => () => void
    clearDistrict: () => void
    /* Every selector's value and every drill, as the demo starts */
    clearSelections: () => void
    /* The map's drill: the org unit it is drilled down into, if any */
    mapDrill: {
        getDrilledId: () => string | null
        drillInto: (orgUnitId: string) => void
        reset: () => void
    }
    /* The data item the data selector holds */
    dataPick: {
        get: () => string | null
        set: (dataItemId: string | null) => void
    }
    /* The temperature map the tour adds, and the chart it puts in the
     * table's place; the table's saved item names the chart */
    temperatureViews: { map: Shown; chart: Shown & { name: string } }
    /* Called when the tour ends on its last step, the workspace kept */
    onFinish: () => void
    /* The "Hide view headers" setting */
    viewHeaders: {
        isHidden: () => boolean
        setHidden: (hidden: boolean) => void
    }
}

export const startDemoTour = ({
    kind,
    api,
    views,
    channels,
    getSelectedOrgUnitIds,
    subscribe,
    clearDistrict,
    clearSelections,
    mapDrill,
    dataPick,
    temperatureViews,
    onFinish,
    viewHeaders,
}: TourContext): DemoTourHandle => {
    const story = getDemoStory()
    const { getSteps, picksDistrictIn } = TOURS[kind]
    const steps = getSteps({ api, views, story, channels })
    const headersHiddenAtStart = viewHeaders.isHidden()
    let activeIndex = 0
    let isOpen = true
    /* The tour's own click, shown before it lands */
    let pending: {
        kind: PendingKind
        timer: ReturnType<typeof setTimeout>
        click: () => void
    } | null = null
    /* Whether a step opened the tools strip */
    let toolsShown = false

    /* Folds the strip again, as the demo starts */
    const foldTools = () => {
        if (toolsShown) {
            toolsShown = false
            collapseTools(api)
        }
    }

    const isDistrictSelected = () => {
        const ids = getSelectedOrgUnitIds()
        return ids.length === 1 && ids[0] === story.highest.id
    }

    const isMapDrilled = () => mapDrill.getDrilledId() === story.highest.id

    const cancelPending = () => {
        if (pending !== null) {
            clearTimeout(pending.timer)
            if (pending.kind === 'drill') {
                closeDrillMenu()
            }
            if (OPENS_MENU.has(pending.kind)) {
                closeSelectMenu()
            }
            pending = null
        }
    }

    /* Once a click lands, the step's next one, if it needs another */
    const runLater = (
        kind: PendingKind,
        delay: number,
        landing: () => void
    ) => {
        pending = {
            kind,
            click: landing,
            timer: setTimeout(() => {
                pending = null
                landing()
                afterLayout(nextClick)
            }, delay),
        }
    }

    /* Shows where the tour clicks, then clicks */
    const clickLater = (
        kind: PendingKind,
        element: Element,
        landing: () => void
    ) => {
        showClickAt(element)
        runLater(kind, CLICK_DELAY, landing)
    }

    /* Found again when the click lands: the map may have drawn new shapes
     * meanwhile (another period), and the old one takes no clicks */
    const findDistrictToClick = () =>
        picksDistrictIn === 'tree'
            ? findTreeLabel(views.orgUnitSelector, story.highest.name)
            : findDistrict(views.map, story.highest.name)

    /* Not while another place is drawn without it: the steps after clear
     * that place, and the district is clicked once it's back */
    const clickDistrict = () => {
        const target = findDistrictToClick()
        if (target) {
            clickLater('district', target, () => click(findDistrictToClick()))
        }
    }

    /* As the user would: a right-click on the district opens the map's
     * drill menu, then "Drill down into". The map shows the district, as a
     * drill elsewhere is undone first (prepare); found again when the
     * click lands, the map may have redrawn meanwhile. */
    const drillMap = () => {
        const district = () => findDistrict(views.map, story.highest.name)
        clickLater('drill', district(), () => {
            const shape = district()
            if (shape) {
                rightClick(shape)
            }
            runLater('drill', MENU_DELAY, () => {
                const item = findDrillDownItem()
                if (item) {
                    clickLater('drill', item, () => item.click())
                } else {
                    /* The map drew new shapes meanwhile, and opened no menu */
                    mapDrill.drillInto(story.highest.id)
                }
            })
        })
    }

    /* As the user would: the drop-down opens, then its option, brought
     * into view in a long list. Without the option, `fallback` sets it. */
    const pickOption = (
        kind: PendingKind,
        input: Element,
        { label, fallback }: { label: string; fallback: () => void }
    ) =>
        clickLater(kind, input, () => {
            click(input)
            runLater(kind, MENU_DELAY, () => {
                const option = findSelectOption(label)
                if (option) {
                    option.scrollIntoView?.({ block: 'nearest' })
                    clickLater(kind, option, () => click(option))
                } else {
                    fallback()
                }
            })
        })

    const pickData = (dataItemId: string) =>
        pickOption(
            'data',
            findSelectInput(`[data-view-id="${views.dataSelector}"]`),
            {
                label: getDataItem(dataItemId)?.name as string,
                fallback: () => dataPick.set(dataItemId),
            }
        )

    /* In the table's settings tab, its saved item */
    const pickChart = () =>
        pickOption(
            'chart',
            findSelectInput(
                `[data-test="settings-panel-${views.table}"] [data-test="saved-item-picker"]`
            ),
            {
                label: temperatureViews.chart.name,
                fallback: temperatureViews.chart.show,
            }
        )

    /* From the Map tile, as a click on it adds a map. Once per visit to
     * the steps that show it: a full workspace refuses it. */
    let mapTried = false
    const addMap = () => {
        mapTried = true
        clickLater(
            'map',
            document.querySelector('[data-test="add-view-map"]') as Element,
            temperatureViews.map.show
        )
    }

    /* Play, from the start; once per visit, so the year plays through.
     * Found again when the click lands: the timeline may have drawn anew. */
    let played = false
    const play = () => {
        played = true
        clickLater('play', findPlayButton(views.periodSelector), () =>
            click(findPlayButton(views.periodSelector))
        )
    }
    const pause = () => {
        const button = findPlayButton(views.periodSelector)
        if (isPlaying(button)) {
            click(button)
        }
    }

    /* The next click the active step needs, one at a time */
    const nextClick = () => {
        const step = steps[activeIndex]
        if (!isOpen || pending) {
            return
        }
        if (step.mapDrilled && !isMapDrilled()) {
            drillMap()
        } else if (step.district && !isDistrictSelected()) {
            clickDistrict()
        } else if (step.dataPick && dataPick.get() !== step.dataPick) {
            pickData(step.dataPick)
        } else if (
            step.temperatureMap &&
            !temperatureViews.map.isShown() &&
            !mapTried
        ) {
            addMap()
        } else if (step.temperatureChart && !temperatureViews.chart.isShown()) {
            pickChart()
        } else if (step.playsTimeline && !played) {
            play()
        }
    }

    /* A step that shows its tools tab ticks or unticks "Hide view headers"
     * in front of the user; elsewhere, as when going back, it just sets it */
    const showHeaders = (step: TourStep, shown: boolean) => {
        if (viewHeaders.isHidden() !== shown) {
            return
        }
        if (step.toolPanelId) {
            clickLater(
                'headers',
                document.querySelector(
                    '[data-test="view-headers-hidden"]'
                ) as Element,
                () => viewHeaders.setHidden(!shown)
            )
        } else {
            viewHeaders.setHidden(!shown)
        }
    }

    /* What a step shows that the tour sets at once, going back included:
     * no data item, no temperature views, and the timeline at rest */
    const undo = (step: TourStep) => {
        if (step.dataPick === null && dataPick.get() !== null) {
            dataPick.set(null)
        }
        if (!step.temperatureMap) {
            mapTried = false
            temperatureViews.map.hide()
        }
        if (!step.temperatureChart) {
            temperatureViews.chart.hide()
        }
        if (!step.playsTimeline) {
            played = false
            pause()
        }
    }

    /* Each step says what it needs shown; moving to it shows that, from
     * what is shown now, which the user may have clicked meanwhile */
    const prepare = (step: TourStep) => {
        /* Moving on before the untick lands lands it at once: the next
         * steps need the headers. A district click left behind is dropped
         * below, as those steps clear it anyway. */
        if (pending?.kind === 'headers') {
            const { click: landing } = pending
            cancelPending()
            landing()
        }
        /* A click still waiting that this step doesn't need is dropped */
        if (pending && !stillNeeded(step, pending.kind)) {
            cancelPending()
        }
        /* Undrilling the map clears the district it set, which a district
         * step clicks again. A drill into another place is undone too, so
         * the district shows to drill into. */
        const keepsDrill = step.mapDrilled && isMapDrilled()
        if (!keepsDrill && mapDrill.getDrilledId() !== null) {
            mapDrill.reset()
        }
        /* Another org unit the user picked has redrawn the map without the
         * district: clear it, and the district is clicked once the map is
         * whole again */
        const keepsSelection = step.district && isDistrictSelected()
        if (!keepsSelection && getSelectedOrgUnitIds().length) {
            clearDistrict()
        }
        undo(step)
        if (step.toolPanelId) {
            openToolPanel(api, step.toolPanelId)
            toolsShown = true
        } else {
            foldTools()
        }
    }

    const unsubscribe = subscribe(() => {
        const step = steps[activeIndex]
        if (
            (step.advancesOnDistrictClick && isDistrictSelected()) ||
            (step.advancesOnMapDrill && isMapDrilled()) ||
            (step.advancesOnDataPick &&
                dataPick.get() === step.advancesOnDataPick)
        ) {
            moveTo(activeIndex + 1)
        }
    })

    const tour = driver({
        steps: steps.map(({ element, popover, blocksClicks }) => ({
            element,
            popover,
            disableActiveInteraction: blocksClicks,
        })),
        showProgress: true,
        /* driver.js fills in the numbers */
        progressText: i18n.t('{{current}} of {{total}}', {
            current: '{{current}}',
            total: '{{total}}',
        }),
        nextBtnText: i18n.t('Next'),
        prevBtnText: i18n.t('Back'),
        doneBtnText: i18n.t('Done'),
        popoverClass: classes.popover,
        stagePadding: 4,
        onNextClick: (_element, _step, { index }) =>
            moveTo((index as number) + 1),
        onPrevClick: (_element, _step, { index }) =>
            moveTo((index as number) - 1),
        /* The close button, Escape or a click on the overlay */
        onDestroyStarted: () => close(true),
    })

    /* Closed on the way, leaves the demo as the tour found it, unless the
     * workspace is going away or the tour has ended. Not in driver.js's
     * onDestroyed: it runs only once a step's animation has ended, which a
     * quick close skips. */
    const close = (restore: boolean) => {
        if (!isOpen) {
            return
        }
        isOpen = false
        cancelPending()
        unsubscribe()
        tour.destroy()
        removeArea()
        if (restore) {
            /* The tour's clicks, and any the user made along the way; the
             * timeline first, or it plays on */
            pause()
            clearSelections()
            temperatureViews.map.hide()
            temperatureViews.chart.hide()
            viewHeaders.setHidden(headersHiddenAtStart)
            foldTools()
            collapseTools(api)
        }
    }

    /* At the end, the workspace stays as the last step shows it, for the
     * user to go on from there. Done before the tour's clicks have landed
     * sets what the last steps show at once. */
    const finish = () => {
        const step = steps[activeIndex]
        cancelPending()
        if (step.mapDrilled && !isMapDrilled()) {
            mapDrill.drillInto(story.highest.id)
        } else if (step.district && !isDistrictSelected()) {
            click(findDistrictToClick())
        }
        if (step.temperatureMap && !temperatureViews.map.isShown()) {
            temperatureViews.map.show()
        }
        if (step.temperatureChart && !temperatureViews.chart.isShown()) {
            temperatureViews.chart.show()
        }
        close(false)
        onFinish()
    }

    const moveTo = (index: number) => {
        if (index === steps.length) {
            finish()
            return
        }
        activeIndex = index
        const step = steps[index]
        prepare(step)
        afterLayout(() => {
            if (!isOpen) {
                return
            }
            nextClick()
            if (step.showsViewHeaders !== undefined) {
                showHeaders(step, step.showsViewHeaders)
            }
            afterLayout(() => {
                if (isOpen) {
                    keepingScroll(step.element?.(), () => tour.moveTo(index))
                }
            })
        })
    }

    tour.drive()
    return {
        close: () => close(true),
        closeQuietly: () => close(false),
    }
}
