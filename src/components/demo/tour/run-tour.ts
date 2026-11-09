import {
    collapseTools,
    openToolPanel,
} from '@components/workspace/controller/settings'
import i18n from '@dhis2/d2-i18n'
import { getDemoStory } from '@modules/demo/story'
import type { DockviewApi } from 'dockview-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { CLICK_DELAY, showClickAt } from './click-ring'
import { getHowItWorksSteps } from './how-it-works-steps'
import { getStorySteps } from './story-steps'
import classes from './styles/demo-tour.module.css'
import type { StepContext, TourKind, TourStep, TourViews } from './tour-steps'

export type DemoTourHandle = { close: () => void; closeQuietly: () => void }

/* What the tour clicks for the user: the district, its drill (the
 * right-click, then the menu item), or "Hide view headers" */
type PendingKind = 'district' | 'drill' | 'headers'

/* What a step needs done on the map: a drill sets the district too */
const getMapClick = (step: TourStep): PendingKind | null => {
    if (step.mapDrilled) {
        return 'drill'
    }
    return step.district ? 'district' : null
}

const STEPS: Record<TourKind, (context: StepContext) => TourStep[]> = {
    story: getStorySteps,
    'how-it-works': getHowItWorksSteps,
}

/* Dockview places view bodies and tools on the next frame */
export const afterLayout = (run: () => void) =>
    requestAnimationFrame(() => requestAnimationFrame(run))

/* driver.js scrolls a step's element into view when it isn't wholly on
 * screen. The workspace is a scroll area of its own, and scrolling it
 * hides the selectors and view headers above: every scroll around the
 * element stays where it was, and the user can still scroll by hand. */
const keepingScroll = (element: Element | undefined, run: () => void) => {
    const ancestors: Element[] = []
    for (let node = element?.parentElement; node; node = node.parentElement) {
        ancestors.push(node)
    }
    const positions = ancestors.map(({ scrollTop, scrollLeft }) => ({
        scrollTop,
        scrollLeft,
    }))
    run()
    ancestors.forEach((node, index) => {
        node.scrollTop = positions[index].scrollTop
        node.scrollLeft = positions[index].scrollLeft
    })
}

/* The district's shape on the map, as a user would click it */
const findDistrict = (mapId: string, name: string): Element =>
    [
        ...document.querySelectorAll(
            `[data-view-id="${mapId}"] [data-test="fake-feature"]`
        ),
    ].find((path) => path.textContent?.startsWith(`${name}:`)) as Element

const DRILL_MENU = '[data-test="drill-menu"] [data-test="dhis2-uicore-menu"]'

/* The drill menu's popover places itself a render after it opens */
const MENU_DELAY = 100

/* A DHIS2 menu item takes clicks on its link, not its list item */
const findDrillDownItem = (): HTMLElement | null =>
    document.querySelector(
        `${DRILL_MENU} [data-test="drill-down"] [role="menuitem"]`
    )

/* Escape sent to the menu itself: bubbling up, it would close the tour */
const closeDrillMenu = () =>
    document
        .querySelector(DRILL_MENU)
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

/* A right-click at the shape's centre, where the map opens its menu */
const rightClick = (element: Element) => {
    const { left, top, width, height } = element.getBoundingClientRect()
    element.dispatchEvent(
        new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: left + width / 2,
            clientY: top + height / 2,
        })
    )
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
    viewHeaders,
}: TourContext): DemoTourHandle => {
    const story = getDemoStory()
    const steps = STEPS[kind]({ api, views, story, channels })
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
            pending = null
        }
    }

    const runLater = (kind: PendingKind, delay: number, click: () => void) => {
        pending = {
            kind,
            click,
            timer: setTimeout(() => {
                pending = null
                click()
            }, delay),
        }
    }

    /* Shows where the tour clicks, then clicks */
    const clickLater = (
        kind: PendingKind,
        element: Element,
        click: () => void
    ) => {
        showClickAt(element)
        runLater(kind, CLICK_DELAY, click)
    }

    /* Found again when the click lands: the map may have drawn new shapes
     * meanwhile (another period), and the old one takes no clicks */
    const clickDistrict = () =>
        clickLater(
            'district',
            findDistrict(views.map, story.highest.name),
            () =>
                findDistrict(views.map, story.highest.name)?.dispatchEvent(
                    new MouseEvent('click', { bubbles: true })
                )
        )

    /* As the user would: a right-click on the district opens the map's
     * drill menu, then "Drill down into" */
    const drillMap = () =>
        clickLater('drill', findDistrict(views.map, story.highest.name), () => {
            rightClick(findDistrict(views.map, story.highest.name))
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

    /* Each step says what it needs shown; moving to it shows that, from
     * what is shown now, which the user may have clicked meanwhile */
    const prepare = (step: TourStep) => {
        /* Moving on before the untick lands lands it at once: the next
         * steps need the headers. A district click left behind is dropped
         * below, as those steps clear it anyway. */
        if (pending?.kind === 'headers') {
            const { click } = pending
            cancelPending()
            click()
        }
        /* A click still waiting that this step doesn't need is dropped */
        if (pending && pending.kind !== getMapClick(step)) {
            cancelPending()
        }
        /* Undrilling the map clears the district it set, which a district
         * step clicks again */
        if (!step.mapDrilled && mapDrill.getDrilledId() !== null) {
            mapDrill.reset()
        }
        /* Another org unit the user picked has redrawn the map without the
         * district: clear it, and the district is clicked once the map is
         * whole again */
        const keepsSelection = step.district && isDistrictSelected()
        if (!keepsSelection && getSelectedOrgUnitIds().length) {
            clearDistrict()
        }
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
            (step.advancesOnMapDrill && isMapDrilled())
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

    /* Leaves the demo as the tour found it, unless the workspace is going
     * away. Not in driver.js's onDestroyed: it runs only once a step's
     * animation has ended, which a quick close skips. */
    const close = (restore: boolean) => {
        if (!isOpen) {
            return
        }
        isOpen = false
        cancelPending()
        unsubscribe()
        tour.destroy()
        if (restore) {
            /* The tour's click, and any the user made along the way */
            clearSelections()
            viewHeaders.setHidden(headersHiddenAtStart)
            foldTools()
            collapseTools(api)
        }
    }

    const moveTo = (index: number) => {
        if (index === steps.length) {
            close(true)
            return
        }
        activeIndex = index
        const step = steps[index]
        prepare(step)
        afterLayout(() => {
            if (!isOpen) {
                return
            }
            if (!pending && step.mapDrilled && !isMapDrilled()) {
                drillMap()
            } else if (!pending && step.district && !isDistrictSelected()) {
                clickDistrict()
            }
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
