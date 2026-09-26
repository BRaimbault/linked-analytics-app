import { describe, expect, it } from 'vitest'
import { getSelectorPlacement } from '../selector-placement'
import { getViewTypeSizes } from '../view-types'
import { buildTree, column, row, selector, view } from './grid-tree-builders'

describe('getSelectorPlacement', () => {
    const selectorSizes = getViewTypeSizes('period-selector')

    it('starts a bar of selectors across the top', () => {
        const views = buildTree(1200, 800, row(1, view('a'), view('b')))

        expect(getSelectorPlacement(views, selectorSizes)).toEqual({
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

        expect(getSelectorPlacement(oneInBar, selectorSizes)).toEqual({
            referenceId: 's1',
        })
        expect(getSelectorPlacement(twoInBar, selectorSizes)).toEqual({
            referenceId: 's2',
        })
    })

    it('treats a grid of selectors side by side as the bar', () => {
        const onlySelectors = buildTree(
            1200,
            800,
            row(1, selector('s1'), selector('s2'))
        )

        expect(getSelectorPlacement(onlySelectors, selectorSizes)).toEqual({
            referenceId: 's2',
        })
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

        expect(getSelectorPlacement(mixedTop, selectorSizes)).toEqual({
            edge: 'top',
        })
        expect(getSelectorPlacement(viewOnTop, selectorSizes)).toEqual({
            edge: 'top',
        })
    })

    it('starts another row across the top once the bar is full', () => {
        const fullBar = buildTree(
            700,
            800,
            column(1, row(1, selector('s1'), selector('s2')), view('a', 5))
        )

        expect(getSelectorPlacement(fullBar, selectorSizes)).toEqual({
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

        expect(getSelectorPlacement(fullAndShort, selectorSizes)).toBeNull()
        expect(getSelectorPlacement(short, selectorSizes)).toBeNull()
        expect(
            getSelectorPlacement(buildTree(1200, 800, row(1)), selectorSizes)
        ).toBeNull()
    })
})
