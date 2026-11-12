import { DemoWorkspace } from '@components/demo/demo-workspace'
import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import {
    mockContainerSize,
    toolsStrip,
} from '@components/workspace/__tests__/render-workspace'
import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import { getDemoStory } from '@modules/demo/story'
import { selectorValueChanged } from '@store/interactions-slice'
import type { AppStore } from '@store/store'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Config, DriveStep, HookOpts } from 'driver.js'
import { describe, expect, it, vi } from 'vitest'

mockContainerSize()

/* jsdom lays nothing out, so a view's body has no size to give its plugin */
vi.mock('@components/plugins/use-element-size', () => ({
    useElementSize: () => ({ width: 600, height: 400 }),
}))

/* driver.js draws on a laid-out page, which jsdom isn't: a stand-in keeps
 * the tour's configuration and plays its hooks as driver.js would */
const fake = vi.hoisted(() => ({
    config: null as Config | null,
    moveTo: vi.fn(),
    destroy: vi.fn(),
}))
vi.mock('driver.js', () => ({
    driver: (config: Config) => {
        fake.config = config
        return { drive: () => {}, moveTo: fake.moveTo, destroy: fake.destroy }
    },
}))

const SEEN_KEY = 'linked-analytics.demo-tour-seen'
const { highest } = getDemoStory()

/* The steps that ask for the place, ask for the data item, show it, add
 * the second map, pick the temperature chart, and play the year */
const CLIMATE = { count: 10, placeStep: 1, pickStep: 4, temperatureStep: 5 }
const MAP_STEP = 6
const CHART_STEP = 7
const PLAY_STEP = 8
/* Every click the tour makes up to the last step, one after another */
const CLICKS_WAIT = { timeout: 8000 }

const config = () => fake.config as Config
const steps = () => config().steps as DriveStep[]
const hookOpts = (index: number) => ({ index }) as HookOpts
/* A click shows where it lands first, which takes longer than a waitFor */
const CLICK_WAIT = { timeout: 3000 }

const next = async (index: number) => {
    config().onNextClick?.(undefined, steps()[index], hookOpts(index))
    await waitFor(() => expect(fake.moveTo).toHaveBeenLastCalledWith(index + 1))
}

const back = async (index: number) => {
    config().onPrevClick?.(undefined, steps()[index], hookOpts(index))
    await waitFor(() => expect(fake.moveTo).toHaveBeenLastCalledWith(index - 1))
}

/* From one step on to another */
const walk = async (from: number, to: number) => {
    for (let index = from; index < to; index++) {
        await next(index)
    }
}

const nextUpTo = (step: number) => walk(0, step)

/* What each map shows, as its subtitle names it */
const PRECIPITATION_MAP = 'Precipitation monthly ERA5 · July 2026'
const TEMPERATURE_MAP = 'Temperature monthly · July 2026'

const selectorValue = (testId: string) =>
    within(screen.getByTestId(testId)).getByTestId('selector-value')

const maps = () => screen.queryAllByTestId('fake-map')

const TABLE = 'Climate by area and month, last 12 months'
const TEMPERATURE_CHART = 'Temperature by month, last 12 months'

const playButton = () => screen.getByTestId('timeline-play')

/* Whether a visualization shows a saved item, by its name in its header:
 * the name shows in its settings tab too */
const showsItem = (name: string) =>
    screen
        .queryAllByTestId('fake-visualization')
        .some(({ textContent }) => textContent?.startsWith(name))

const startClimate = async () => {
    fake.config = null
    localStorage.setItem(SEEN_KEY, 'true')
    const view = renderWithStore(<DemoWorkspace />)
    await screen.findAllByTestId('selector-view')
    await userEvent.click(screen.getByTestId('take-tour-climate'))
    await waitFor(() => expect(fake.config).not.toBeNull())
    return view
}

const dataSelectorOf = (store: AppStore) =>
    store
        .getState()
        .workspace.views.find(({ type }) => type === 'data-selector')
        ?.id as string

describe('the climate tour', () => {
    it('starts from the banner on its own layout, which Reset then brings back', async () => {
        await startClimate()

        expect(steps()).toHaveLength(CLIMATE.count)
        expect(await screen.findByText(PRECIPITATION_MAP)).toBeInTheDocument()

        act(() => {
            config().onDestroyStarted?.(undefined, {}, {} as HookOpts)
        })
        await userEvent.click(
            toolsStrip().getByRole('tab', { name: 'Workspace' })
        )
        await userEvent.click(screen.getByTestId('reset-to-preset'))

        expect(await screen.findByText(PRECIPITATION_MAP)).toBeInTheDocument()
        expect(screen.queryByText(/^Malaria incidence per 1,000/)).toBeNull()
    })

    it('picks the place in the tree, then temperature, then adds a map that keeps it', async () => {
        await startClimate()

        await walk(0, CLIMATE.placeStep + 1)
        await waitFor(
            () =>
                expect(selectorValue('org-unit-tree')).toHaveTextContent(
                    highest.name
                ),
            CLICK_WAIT
        )

        await walk(CLIMATE.placeStep + 1, CLIMATE.temperatureStep)
        expect(
            await screen.findByText(TEMPERATURE_MAP, undefined, CLICK_WAIT)
        ).toBeInTheDocument()

        await next(CLIMATE.temperatureStep)
        await waitFor(() => expect(maps()).toHaveLength(2), CLICK_WAIT)
        /* The first map is back on precipitation, the new one on
         * temperature */
        expect(screen.getByText(PRECIPITATION_MAP)).toBeInTheDocument()
        expect(screen.getByText(TEMPERATURE_MAP)).toBeInTheDocument()
    })

    it('removes the map it added on Back and when closed', async () => {
        await startClimate()
        await nextUpTo(MAP_STEP)
        await waitFor(() => expect(maps()).toHaveLength(2), CLICK_WAIT)

        await back(MAP_STEP)
        await waitFor(() => expect(maps()).toHaveLength(1))

        await next(MAP_STEP - 1)
        await waitFor(() => expect(maps()).toHaveLength(2), CLICK_WAIT)
        act(() => {
            config().onDestroyStarted?.(undefined, {}, {} as HookOpts)
        })
        await waitFor(() => expect(maps()).toHaveLength(1))
        expect(selectorValue('org-unit-tree')).toHaveTextContent(
            'Each view shows its own'
        )
    })

    it('picks the temperature chart for the table in its settings, and brings the table back on Back', async () => {
        await startClimate()
        await waitFor(() => expect(showsItem(TABLE)).toBe(true))

        await nextUpTo(CHART_STEP)
        await waitFor(
            () => expect(showsItem(TEMPERATURE_CHART)).toBe(true),
            CLICKS_WAIT
        )
        expect(showsItem(TABLE)).toBe(false)

        await back(CHART_STEP)
        await waitFor(() => expect(showsItem(TABLE)).toBe(true))
    })

    it('sets the data item and the chart itself when their drop-downs open no menu', async () => {
        const { store } = await startClimate()
        const dispatch = EventTarget.prototype.dispatchEvent
        const clicks = vi
            .spyOn(EventTarget.prototype, 'dispatchEvent')
            .mockImplementation(function (this: EventTarget, event: Event) {
                const isSelectInput =
                    event.type === 'click' &&
                    this instanceof Element &&
                    this.matches('[data-test="dhis2-uicore-select-input"]')
                return isSelectInput || dispatch.call(this, event)
            })

        await nextUpTo(CLIMATE.temperatureStep)
        await waitFor(
            () =>
                expect(
                    store
                        .getState()
                        .interactions.channels.find(
                            ({ dimension }) => dimension === 'dx'
                        )?.value
                ).toEqual([
                    expect.objectContaining({ id: DATA_ITEM_IDS.temperature }),
                ]),
            CLICKS_WAIT
        )
        await walk(CLIMATE.temperatureStep, CHART_STEP)
        await waitFor(
            () => expect(showsItem(TEMPERATURE_CHART)).toBe(true),
            CLICKS_WAIT
        )
        clicks.mockRestore()
    })

    it('picks the chart on the next step too when moving on before it lands, and drops play when leaving before it starts', async () => {
        /* Once a click lands, the next is on its way a frame or two later */
        const nextOnItsWay = () =>
            new Promise((resolve) => setTimeout(resolve, 100))
        await startClimate()
        await nextUpTo(CHART_STEP)
        await waitFor(() => expect(maps()).toHaveLength(2), CLICKS_WAIT)
        await nextOnItsWay()

        await next(CHART_STEP)
        await waitFor(
            () => expect(showsItem(TEMPERATURE_CHART)).toBe(true),
            CLICKS_WAIT
        )
        await nextOnItsWay()
        await next(PLAY_STEP)
        await new Promise((resolve) => setTimeout(resolve, 1500))

        expect(playButton()).toHaveAttribute('aria-label', 'Play')
    })

    it('plays the year on its step, and stops when moving away', async () => {
        await startClimate()

        await nextUpTo(PLAY_STEP)
        await waitFor(
            () => expect(playButton()).toHaveAttribute('aria-label', 'Pause'),
            CLICKS_WAIT
        )

        await back(PLAY_STEP)
        await waitFor(() =>
            expect(playButton()).toHaveAttribute('aria-label', 'Play')
        )
    })

    it('keeps the workspace as it ends, and the next tour replaces it without asking', async () => {
        await startClimate()
        await nextUpTo(CLIMATE.count - 1)
        await waitFor(
            () => expect(showsItem(TEMPERATURE_CHART)).toBe(true),
            CLICKS_WAIT
        )

        const last = CLIMATE.count - 1
        act(() => {
            config().onNextClick?.(undefined, steps()[last], hookOpts(last))
        })

        expect(fake.destroy).toHaveBeenCalled()
        expect(maps()).toHaveLength(2)
        expect(selectorValue('org-unit-tree')).toHaveTextContent(highest.name)
        const climate = fake.config
        await userEvent.click(screen.getByTestId('take-tour-malaria'))
        await waitFor(() => expect(fake.config).not.toBe(climate))
        expect(screen.queryByTestId('tour-reset-confirm')).toBeNull()
    })

    it('sets what its last step shows at once when Done comes before its clicks land', async () => {
        const { store } = await startClimate()
        await nextUpTo(CLIMATE.count - 1)
        /* The user clears the place the tour clicked */
        const tree = store
            .getState()
            .workspace.views.find(({ type }) => type === 'org-unit-selector')
        act(() => {
            store.dispatch(
                selectorValueChanged({ viewId: tree?.id as string, value: [] })
            )
        })

        const last = CLIMATE.count - 1
        act(() => {
            config().onNextClick?.(undefined, steps()[last], hookOpts(last))
        })

        expect(fake.destroy).toHaveBeenCalled()
        expect(maps()).toHaveLength(2)
        expect(showsItem(TEMPERATURE_CHART)).toBe(true)
        await waitFor(() =>
            expect(selectorValue('org-unit-tree')).toHaveTextContent(
                highest.name
            )
        )
    })

    it('starts from an address that names it, on every visit', async () => {
        fake.config = null
        localStorage.setItem(SEEN_KEY, 'true')
        window.history.replaceState(null, '', '/?demo=climate')

        renderWithStore(<DemoWorkspace />)

        await waitFor(() => expect(fake.config).not.toBeNull())
        expect(steps()).toHaveLength(CLIMATE.count)
        expect(await screen.findByText(PRECIPITATION_MAP)).toBeInTheDocument()
        window.history.replaceState(null, '', '/')
    })

    it("moves on with the user's own pick of the data item", async () => {
        const { store } = await startClimate()
        await nextUpTo(CLIMATE.pickStep)

        act(() => {
            store.dispatch(
                selectorValueChanged({
                    viewId: dataSelectorOf(store),
                    value: [{ id: DATA_ITEM_IDS.temperature }],
                })
            )
        })

        await waitFor(() =>
            expect(fake.moveTo).toHaveBeenLastCalledWith(CLIMATE.pickStep + 1)
        )
    })

    it('adds the map on the next step too, when moving on before it lands', async () => {
        await startClimate()
        await nextUpTo(MAP_STEP)
        /* The place first, then the map is on its way */
        await waitFor(
            () =>
                expect(selectorValue('org-unit-tree')).toHaveTextContent(
                    highest.name
                ),
            CLICK_WAIT
        )
        await new Promise((resolve) => setTimeout(resolve, 100))
        expect(maps()).toHaveLength(1)

        await next(MAP_STEP)

        await waitFor(() => expect(maps()).toHaveLength(2), CLICK_WAIT)
    })

    it('tries once to add its map to a workspace that is full', async () => {
        const { store } = await startClimate()
        await nextUpTo(MAP_STEP - 1)
        /* The user adds a fourth plugin view, the most a workspace holds */
        fireEvent.click(toolsStrip().getByRole('tab', { name: 'Add views' }))
        fireEvent.click(screen.getByTestId('add-view-visualization'))
        await waitFor(() =>
            expect(
                store
                    .getState()
                    .workspace.views.filter(
                        ({ type }) => type === 'visualization'
                    )
            ).toHaveLength(3)
        )

        await next(MAP_STEP - 1)
        await new Promise((resolve) => setTimeout(resolve, 2500))

        expect(maps()).toHaveLength(1)
        /* No click on its way: it doesn't try again and again */
        expect(
            document.querySelector('[data-test="tour-click-ring"]')
        ).toBeNull()
    })

    it('closes the drop-down it opened when going back before its pick lands', async () => {
        await startClimate()
        await nextUpTo(CLIMATE.temperatureStep)
        await screen.findAllByTestId(
            'dhis2-uicore-singleselectoption',
            undefined,
            CLICK_WAIT
        )

        await back(CLIMATE.temperatureStep)

        await waitFor(() =>
            expect(
                screen.queryAllByTestId('dhis2-uicore-singleselectoption')
            ).toHaveLength(0)
        )
    })

    it('drops the pick it was about to make when moving on to a step without it', async () => {
        const { store } = await startClimate()
        await nextUpTo(CLIMATE.temperatureStep)

        /* Before the pick lands, on to the step that adds the map */
        await next(CLIMATE.temperatureStep)

        await waitFor(() => expect(maps()).toHaveLength(2), CLICK_WAIT)
        const dataChannel = store
            .getState()
            .interactions.channels.find(({ dimension }) => dimension === 'dx')
        expect(dataChannel?.value).toEqual([])
    })
})
