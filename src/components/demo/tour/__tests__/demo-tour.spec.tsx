import { DemoWorkspace } from '@components/demo/demo-workspace'
import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import {
    mockContainerSize,
    toolsStrip,
} from '@components/workspace/__tests__/render-workspace'
import { getDemoStory } from '@modules/demo/story'
import { selectorValueChanged } from '@store/interactions-slice'
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
const story = getDemoStory()

/* Each tour's length, and the steps that ask for a click on the district
 * and for a drill down into it */
const STORY = { count: 10, clickStep: 3, drillStep: 5 }
const HOW_IT_WORKS = { count: 13, clickStep: 6 }

/* Read through a function: the tests reset `fake.config` to null, which
 * TypeScript would otherwise keep as its type after the reset */
const config = () => fake.config as Config
const steps = () => config().steps as DriveStep[]
const hookOpts = (index: number) => ({ index }) as HookOpts
const descriptions = () =>
    steps().map(({ popover }) => popover?.description ?? '')

const next = async (index: number) => {
    config().onNextClick?.(undefined, steps()[index], hookOpts(index))
    await waitFor(() => expect(fake.moveTo).toHaveBeenLastCalledWith(index + 1))
}

const back = async (index: number) => {
    config().onPrevClick?.(undefined, steps()[index], hookOpts(index))
    await waitFor(() => expect(fake.moveTo).toHaveBeenLastCalledWith(index - 1))
}

const nextUpTo = async (step: number) => {
    for (let index = 0; index < step; index++) {
        await next(index)
    }
}

/* The tree's value, as text: the tree itself names every unit */
const orgUnitSelector = () =>
    within(screen.getByTestId('org-unit-tree')).getByTestId('selector-value')

const expectDistrict = (name: string) =>
    waitFor(() => expect(orgUnitSelector()).toHaveTextContent(name))

const expectNoDistrict = () => expectDistrict('Each view shows its own')

const feature = (name: string) =>
    screen
        .getAllByTestId('fake-feature')
        .find(({ textContent }) =>
            textContent?.startsWith(`${name}:`)
        ) as Element

/* A first visit: the story tour starts by itself */
const startStory = async () => {
    fake.config = null
    const view = renderWithStore(<DemoWorkspace />)
    await waitFor(() => expect(fake.config).not.toBeNull())
    return view
}

const startHowItWorks = async () => {
    fake.config = null
    localStorage.setItem(SEEN_KEY, 'true')
    renderWithStore(<DemoWorkspace />)
    await screen.findAllByTestId('selector-view')
    await userEvent.click(screen.getByTestId('take-tour-how-it-works'))
    await waitFor(() => expect(fake.config).not.toBeNull())
}

/* Every step's element is on the page when its step comes */
const walkTo = async (last: number) => {
    for (let index = 0; index < last; index++) {
        await next(index)
        const element = steps()[index + 1].element as
            (() => Element) | undefined
        if (element) {
            expect(element()).toBeInstanceOf(Element)
        }
    }
}

describe('the demo tours', () => {
    it('starts the story by itself on a first visit, and is remembered once started', async () => {
        await startStory()

        expect(steps()).toHaveLength(STORY.count)
        expect(localStorage.getItem(SEEN_KEY)).toBe('true')
    })

    it('starts either tour from the banner once seen, a new one replacing the last', async () => {
        await startHowItWorks()
        expect(steps()).toHaveLength(HOW_IT_WORKS.count)
        const first = fake.config

        await userEvent.click(screen.getByTestId('take-tour-story'))

        await waitFor(() => expect(fake.config).not.toBe(first))
        expect(steps()).toHaveLength(STORY.count)
        expect(fake.destroy).toHaveBeenCalled()
    })

    it('asks before replacing a workspace the user changed, and keeps it on Cancel', async () => {
        fake.config = null
        localStorage.setItem(SEEN_KEY, 'true')
        const { store } = renderWithStore(<DemoWorkspace />)
        await screen.findAllByTestId('selector-view')
        const tree = store
            .getState()
            .workspace.views.find(({ type }) => type === 'org-unit-selector')
        act(() => {
            store.dispatch(
                selectorValueChanged({
                    viewId: tree?.id as string,
                    value: [
                        {
                            id: 'DemoEast001',
                            name: 'East',
                            path: '/DemoLand001/DemoEast001',
                        },
                    ],
                })
            )
        })

        await userEvent.click(screen.getByTestId('take-tour-story'))
        await userEvent.click(
            await screen.findByRole('button', { name: 'Cancel' })
        )
        expect(screen.queryByTestId('tour-reset-confirm')).toBeNull()
        expect(fake.config).toBeNull()
        await expectDistrict('East')

        await userEvent.click(screen.getByTestId('take-tour-story'))
        await userEvent.click(
            await screen.findByRole('button', { name: 'Start the tour' })
        )
        await waitFor(() => expect(fake.config).not.toBeNull())
        await expectNoDistrict()
    })

    it('starts the story on every visit when the browser keeps nothing', async () => {
        const blocked = () => {
            throw new Error('blocked')
        }
        const getItem = vi
            .spyOn(Storage.prototype, 'getItem')
            .mockImplementation(blocked)
        const setItem = vi
            .spyOn(Storage.prototype, 'setItem')
            .mockImplementation(blocked)
        await startStory()

        expect(steps()).toHaveLength(STORY.count)
        getItem.mockRestore()
        setItem.mockRestore()
    })

    it('tells the story from the data, clicks the district where it shows it, and leaves the demo as it was', async () => {
        await startStory()

        expect(descriptions()[1]).toContain(
            `${story.highest.name} has ${Math.round(story.highest.incidence)}`
        )
        expect(descriptions()[STORY.drillStep + 1]).toContain(
            `${story.highest.name}'s ${story.highestChiefdoms.count} chiefdoms`
        )
        expect(descriptions()[STORY.drillStep + 2]).toContain(
            `stays above ${Math.round(story.country.incidence)}, the country's rate`
        )
        expect(descriptions()[STORY.drillStep + 3]).toContain(
            `In ${story.coverageQuarter}, none of its ${story.highestChiefdoms.count}`
        )
        await walkTo(STORY.clickStep + 1)
        /* Where the tour clicks shows before the click lands */
        expect(
            document.querySelector('[data-test="tour-click-ring"]')
        ).not.toBeNull()
        await expectDistrict(story.highest.name)
        await walkTo(STORY.count - 1)
        await expectNoDistrict()

        const last = STORY.count - 1
        config().onNextClick?.(undefined, steps()[last], hookOpts(last))

        expect(fake.destroy).toHaveBeenCalled()
        expect(
            toolsStrip().getByRole('tab', { name: 'Add views' })
        ).toHaveAttribute('aria-selected', 'true')
        expect(
            document.querySelector('.dv-edge-group.dv-edge-collapsed')
        ).not.toBeNull()

        /* Its click on the map left nothing that would ask before the next */
        const storyConfig = fake.config
        await userEvent.click(screen.getByTestId('take-tour-how-it-works'))
        await waitFor(() => expect(fake.config).not.toBe(storyConfig))
        expect(screen.queryByTestId('tour-reset-confirm')).toBeNull()
    })

    it('shows how the workspace is set up, following the org unit channel and naming the period one', async () => {
        await startHowItWorks()

        expect(descriptions()[3]).toContain('channel B')
        expect(descriptions()[9]).toContain('Channel A')
        await walkTo(HOW_IT_WORKS.clickStep + 1)
        await expectDistrict(story.highest.name)
        await walkTo(HOW_IT_WORKS.count - 2)
        await expectNoDistrict()
        await walkTo(HOW_IT_WORKS.count - 1)
    })

    it('shows the view headers early in How it works, and hides them again when it ends', async () => {
        await startHowItWorks()
        const workspace = screen.getByTestId('workspace')
        const expectHeaders = (mode: string) =>
            waitFor(() =>
                expect(workspace).toHaveAttribute('data-view-headers', mode)
            )
        /* The demo starts without them */
        await expectHeaders('hidden')

        /* The tour unticks the box, where it shows it */
        await next(0)
        expect(
            document.querySelector('[data-test="tour-click-ring"]')
        ).not.toBeNull()
        await expectHeaders('always')

        /* Back at the start, they're hidden again, at once */
        await back(1)
        await expectHeaders('hidden')

        /* Moving on before the untick lands lands it at once */
        await next(0)
        await next(1)
        expect(workspace).toHaveAttribute('data-view-headers', 'always')

        act(() => {
            config().onDestroyStarted?.(undefined, {}, {} as HookOpts)
        })
        await expectHeaders('hidden')
    })

    it("moves on with the user's own click on the district, not another's", async () => {
        await startStory()
        await nextUpTo(STORY.clickStep)
        const moves = fake.moveTo.mock.calls.length

        fireEvent.click(feature('East'))
        await expectDistrict('East')
        expect(fake.moveTo.mock.calls.length).toBe(moves)

        fireEvent.click(feature(story.highest.name))
        await waitFor(() =>
            expect(fake.moveTo).toHaveBeenLastCalledWith(STORY.clickStep + 1)
        )
        expect(orgUnitSelector()).toHaveTextContent(story.highest.name)
    })

    it('replaces a district the user picked with its own when moving on', async () => {
        await startStory()
        await nextUpTo(STORY.clickStep)
        fireEvent.click(feature('East'))
        await expectDistrict('East')

        await next(STORY.clickStep)

        await expectDistrict(story.highest.name)
    })

    it('undoes the click on Back, and when closed on the way', async () => {
        await startStory()
        await nextUpTo(STORY.clickStep + 1)
        await expectDistrict(story.highest.name)

        await back(STORY.clickStep + 1)
        await expectNoDistrict()
        await next(STORY.clickStep)
        await expectDistrict(story.highest.name)
        act(() => {
            config().onDestroyStarted?.(undefined, {}, {} as HookOpts)
        })

        await expectNoDistrict()
        expect(fake.destroy).toHaveBeenCalled()
    })

    describe('the drill down', () => {
        /* The map shows the district's chiefdoms once drilled down */
        const expectMapDrilled = (drilled: boolean) =>
            waitFor(() =>
                expect(
                    screen
                        .getAllByTestId('fake-feature')
                        .some(({ textContent }) =>
                            textContent?.startsWith(`${story.highest.name} / `)
                        )
                ).toBe(drilled)
            )

        it('drills the map down into the district where it shows it, and undoes it on Back and when closed', async () => {
            await startStory()
            await nextUpTo(STORY.drillStep)
            await expectDistrict(story.highest.name)

            await next(STORY.drillStep)
            expect(
                document.querySelector('[data-test="tour-click-ring"]')
            ).not.toBeNull()
            await expectMapDrilled(true)
            /* The drill counts as the map's click: the district stays */
            expect(orgUnitSelector()).toHaveTextContent(story.highest.name)

            await back(STORY.drillStep + 1)
            await expectMapDrilled(false)
            await expectDistrict(story.highest.name)

            await next(STORY.drillStep)
            await expectMapDrilled(true)
            act(() => {
                config().onDestroyStarted?.(undefined, {}, {} as HookOpts)
            })
            await expectMapDrilled(false)
            await expectNoDistrict()
        })

        it("moves on with the user's own drill from the map's menu", async () => {
            await startStory()
            await nextUpTo(STORY.drillStep)
            await expectDistrict(story.highest.name)

            fireEvent.contextMenu(feature(story.highest.name), {
                clientX: 10,
                clientY: 10,
            })
            await userEvent.click(
                within(await screen.findByTestId('drill-menu')).getByText(
                    `Drill down into ${story.highest.name}`
                )
            )

            await waitFor(() =>
                expect(fake.moveTo).toHaveBeenLastCalledWith(
                    STORY.drillStep + 1
                )
            )
            await expectMapDrilled(true)
        })

        it('drills down at once when moving on before the district click lands', async () => {
            await startStory()
            await nextUpTo(STORY.clickStep + 1)
            await next(STORY.clickStep + 1)

            await next(STORY.drillStep)

            await expectMapDrilled(true)
            await expectDistrict(story.highest.name)
        })
    })

    it('drops its click when going back before the click lands', async () => {
        await startStory()
        await nextUpTo(STORY.clickStep + 1)

        await back(STORY.clickStep + 1)
        await new Promise((resolve) => setTimeout(resolve, 900))

        expect(orgUnitSelector()).toHaveTextContent('Each view shows its own')
    })

    it('clicks the district as the map shows it when the click lands, and not when it is gone', async () => {
        const { store } = await startStory()
        await nextUpTo(STORY.clickStep)
        await next(STORY.clickStep)

        /* Before the tour's click lands, the tree picks East: the map draws
         * East's chiefdoms, and the district is no longer there to click */
        const tree = store
            .getState()
            .workspace.views.find(({ type }) => type === 'org-unit-selector')
        act(() => {
            store.dispatch(
                selectorValueChanged({
                    viewId: tree?.id as string,
                    value: [
                        {
                            id: 'DemoEast001',
                            name: 'East',
                            path: '/DemoLand001/DemoEast001',
                        },
                    ],
                })
            )
        })
        await new Promise((resolve) => setTimeout(resolve, 900))

        expect(orgUnitSelector()).toHaveTextContent('East')
    })

    it('keeps the workspace scrolled where it was when a step brings its view into view', async () => {
        await startStory()
        /* jsdom keeps no scroll: the workspace gets one */
        let scrollTop = 0
        Object.defineProperty(screen.getByTestId('workspace'), 'scrollTop', {
            configurable: true,
            get: () => scrollTop,
            set: (value: number) => {
                scrollTop = value
            },
        })
        /* As driver.js scrolls a step's element into view */
        fake.moveTo.mockImplementationOnce(() => {
            scrollTop = 240
        })

        await next(1)

        expect(scrollTop).toBe(0)
    })

    it('stays closed when closed while a step was growing the tools strip', async () => {
        await startHowItWorks()
        fake.moveTo.mockClear()
        const frame = () =>
            new Promise((resolve) => requestAnimationFrame(resolve))

        /* The step with the Add views tab: the tab is shown, then the
         * strip grows, then the tour moves */
        act(() => {
            config().onNextClick?.(undefined, steps()[0], hookOpts(0))
        })
        await frame()
        await frame()
        act(() => {
            config().onDestroyStarted?.(undefined, {}, {} as HookOpts)
        })
        await frame()
        await frame()
        await frame()

        expect(fake.moveTo).not.toHaveBeenCalled()
    })

    it('stays closed when closed before a step had moved', async () => {
        await startStory()
        fake.moveTo.mockClear()

        act(() => {
            config().onNextClick?.(undefined, steps()[0], hookOpts(0))
            config().onDestroyStarted?.(undefined, {}, {} as HookOpts)
        })
        await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
        await new Promise((resolve) => requestAnimationFrame(resolve))

        expect(fake.moveTo).not.toHaveBeenCalled()
    })
})
