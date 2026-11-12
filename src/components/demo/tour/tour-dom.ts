import i18n from '@dhis2/d2-i18n'

/* What the tours find and click on the page, as a user would */

/* Dockview places view bodies and tools on the next frame */
export const afterLayout = (run: () => void) =>
    requestAnimationFrame(() => requestAnimationFrame(run))

/* driver.js scrolls a step's element into view when it isn't wholly on
 * screen. The workspace is a scroll area of its own, and scrolling it
 * hides the selectors and view headers above: every scroll around the
 * element stays where it was, and the user can still scroll by hand. */
export const keepingScroll = (
    element: Element | undefined,
    run: () => void
) => {
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

/* A place's shape on a map */
export const findDistrict = (mapId: string, name: string): Element =>
    [
        ...document.querySelectorAll(
            `[data-view-id="${mapId}"] [data-test="fake-feature"]`
        ),
    ].find((path) => path.textContent?.startsWith(`${name}:`)) as Element

/* A place's name in an org unit tree: the innermost of the spans holding
 * it, which takes the click */
export const findTreeLabel = (selectorId: string, name: string): Element =>
    [
        ...document.querySelectorAll(
            `[data-view-id="${selectorId}"] [data-test$="-node-label"] span`
        ),
    ].findLast((label) => label.textContent === name) as Element

const DRILL_MENU = '[data-test="drill-menu"] [data-test="dhis2-uicore-menu"]'

/* The drill menu's popover places itself a render after it opens */
export const MENU_DELAY = 100

/* A DHIS2 menu item takes clicks on its link, not its list item */
export const findDrillDownItem = (): HTMLElement | null =>
    document.querySelector(
        `${DRILL_MENU} [data-test="drill-down"] [role="menuitem"]`
    )

/* Escape sent to the menu itself: bubbling up, it would close the tour */
export const closeDrillMenu = () =>
    document
        .querySelector(DRILL_MENU)
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

/* A drop-down's input within a part of the page (a CSS selector), which
 * opens its options on a click */
export const findSelectInput = (scope: string): Element =>
    document.querySelector(
        `${scope} [data-test="dhis2-uicore-select-input"]`
    ) as Element

const SELECT_OPTION = '[data-test="dhis2-uicore-singleselectoption"]'

/* An open drop-down's option, by its label */
export const findSelectOption = (label: string): Element | undefined =>
    [...document.querySelectorAll(SELECT_OPTION)].find(
        (option) => option.textContent === label
    )

/* A click on its layer's backdrop closes an open drop-down, as a click
 * outside does */
export const closeSelectMenu = () =>
    click(
        document
            .querySelector(SELECT_OPTION)
            ?.closest('[data-test="dhis2-uicore-layer"]')
            ?.querySelector(':scope > .backdrop') ?? undefined
    )

/* A timeline's play button, which reads Pause while it plays */
export const findPlayButton = (selectorId: string): Element =>
    document.querySelector(
        `[data-view-id="${selectorId}"] [data-test="timeline-play"]`
    ) as Element

export const isPlaying = (button: Element | null) =>
    button?.getAttribute('aria-label') === i18n.t('Pause')

export const click = (element: Element | undefined) =>
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

/* A right-click at the shape's centre, where the map opens its menu */
export const rightClick = (element: Element) => {
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
