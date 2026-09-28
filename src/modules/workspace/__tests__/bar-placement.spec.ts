import { getBarPlacement } from '@modules/workspace/bar-placement'
import { getViewTypeSizes } from '@modules/workspace/view-types'
import { describe, expect, it } from 'vitest'
import {
    buildTree,
    column,
    row,
    selector,
    text,
    view,
} from './grid-tree-builders'

const selectorSizes = getViewTypeSizes('period-selector')
const textSizes = getViewTypeSizes('text')

describe('getBarPlacement for selectors', () => {
    it('starts a bar of selectors across the top', () => {
        const views = buildTree(1200, 800, row(1, view('a'), view('b')))

        expect(getBarPlacement(views, 'selector', selectorSizes)).toEqual({
            edge: 'top',
        })
    })

    it('adds a selector next to the last one in the bar', () => {
        const oneInBar = buildTree(
            1200,
            800,
            column(1, selector('s1', 1), row(5, view('a'), view('b')))
        )
        const twoInBar = buildTree(
            1200,
            800,
            column(1, row(1, selector('s1'), selector('s2')), view('a', 5))
        )

        expect(getBarPlacement(oneInBar, 'selector', selectorSizes)).toEqual({
            referenceId: 's1',
            direction: 'right',
        })
        expect(getBarPlacement(twoInBar, 'selector', selectorSizes)).toEqual({
            referenceId: 's2',
            direction: 'right',
        })
    })

    it('treats a grid of selectors side by side as the bar', () => {
        const onlySelectors = buildTree(
            1200,
            800,
            row(1, selector('s1'), selector('s2'))
        )

        expect(
            getBarPlacement(onlySelectors, 'selector', selectorSizes)
        ).toEqual({ referenceId: 's2', direction: 'right' })
    })

    it('starts a bar when the top row holds a view', () => {
        const mixedTop = buildTree(
            1200,
            800,
            column(1, row(1, selector('s1'), view('a')), view('b'))
        )
        const viewOnTop = buildTree(
            1200,
            800,
            column(1, view('a'), selector('s1'))
        )

        expect(getBarPlacement(mixedTop, 'selector', selectorSizes)).toEqual({
            edge: 'top',
        })
        expect(getBarPlacement(viewOnTop, 'selector', selectorSizes)).toEqual({
            edge: 'top',
        })
    })

    it('starts another row across the top once the bar is full', () => {
        const fullBar = buildTree(
            700,
            800,
            column(1, row(1, selector('s1'), selector('s2')), view('a', 5))
        )

        expect(getBarPlacement(fullBar, 'selector', selectorSizes)).toEqual({
            edge: 'top',
        })
    })

    it('has no place without room, or before any view', () => {
        const fullAndShort = buildTree(
            700,
            300,
            column(1, row(1, selector('s1'), selector('s2')), view('a', 2))
        )
        const short = buildTree(1200, 250, row(1, view('a')))

        expect(
            getBarPlacement(fullAndShort, 'selector', selectorSizes)
        ).toBeNull()
        expect(getBarPlacement(short, 'selector', selectorSizes)).toBeNull()
        expect(
            getBarPlacement(
                buildTree(1200, 800, row(1)),
                'selector',
                selectorSizes
            )
        ).toBeNull()
    })
})

describe('getBarPlacement below the text bar', () => {
    it('starts the selector bar right below a single text view', () => {
        const titled = buildTree(
            1200,
            800,
            column(1, text('t1', 1), row(5, view('a'), view('b')))
        )

        expect(getBarPlacement(titled, 'selector', selectorSizes)).toEqual({
            referenceId: 't1',
            direction: 'below',
        })
    })

    it('finds the selector bar below the text bar', () => {
        const titled = buildTree(
            1200,
            800,
            column(1, text('t1', 1), selector('s1', 1), view('a', 5))
        )

        expect(getBarPlacement(titled, 'selector', selectorSizes)).toEqual({
            referenceId: 's1',
            direction: 'right',
        })
    })

    it('starts the selector bar at the top when the text bar holds several views', () => {
        const twoTexts = buildTree(
            1200,
            800,
            column(1, row(1, text('t1'), text('t2')), view('a', 5))
        )

        expect(getBarPlacement(twoTexts, 'selector', selectorSizes)).toEqual({
            edge: 'top',
        })
    })
})

describe('getBarPlacement with only text', () => {
    it('starts the selector bar at the top of a grid of text views', () => {
        const onlyText = buildTree(1200, 800, row(1, text('t1'), text('t2')))

        expect(getBarPlacement(onlyText, 'selector', selectorSizes)).toEqual({
            edge: 'top',
        })
    })
})

describe('getBarPlacement for text', () => {
    it('starts a text bar at the very top, above the selectors', () => {
        const withSelectors = buildTree(
            1200,
            800,
            column(1, selector('s1', 1), view('a', 5))
        )

        expect(getBarPlacement(withSelectors, 'text', textSizes)).toEqual({
            edge: 'top',
        })
    })

    it('adds a text view next to the last one in the text bar', () => {
        const titled = buildTree(
            1200,
            800,
            column(1, text('t1', 1), selector('s1', 1), view('a', 5))
        )

        expect(getBarPlacement(titled, 'text', textSizes)).toEqual({
            referenceId: 't1',
            direction: 'right',
        })
    })

    it('never takes the selector bar for a text bar', () => {
        const withSelectors = buildTree(
            1200,
            800,
            column(1, row(1, selector('s1'), selector('s2')), view('a', 5))
        )

        expect(getBarPlacement(withSelectors, 'text', textSizes)).toEqual({
            edge: 'top',
        })
    })
})
