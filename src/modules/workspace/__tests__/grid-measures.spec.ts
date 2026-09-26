import { describe, expect, it } from 'vitest'
import {
    getLineCount,
    getMinLength,
    getPreferredLength,
} from '../grid-measures'
import { PLUGIN_SIZES } from '../grid-tree'
import { getViewTypeSizes } from '../view-types'
import { buildTree, column, row, selector, view } from './grid-tree-builders'

/* a | (b over c) */
const layout = buildTree(
    1200,
    800,
    row(1, view('a', 1), column(2, view('b'), view('c', 3)))
)

describe('getLineCount and getMinLength', () => {
    it('adds up views side by side and takes the most stacked ones', () => {
        const { root, orientation } = layout

        expect(getLineCount(root, orientation, { axis: 'horizontal' })).toBe(2)
        expect(getLineCount(root, orientation, { axis: 'vertical' })).toBe(2)
        expect(getMinLength(root, orientation, { axis: 'vertical' })).toBe(
            PLUGIN_SIZES.min.height * 2
        )
    })

    it('leaves out a view about to move away', () => {
        const { root, orientation } = layout

        expect(
            getLineCount(root, orientation, {
                axis: 'vertical',
                excludeId: 'b',
            })
        ).toBe(1)
        expect(
            getMinLength(root, orientation, {
                axis: 'horizontal',
                excludeId: 'a',
            })
        ).toBe(PLUGIN_SIZES.min.width)
    })
})

describe('sizes of mixed views', () => {
    const selectorSizes = getViewTypeSizes('org-unit-selector')
    const selectorMin = selectorSizes.min
    const selectorPreferred = selectorSizes.preferred as {
        width: number
        height: number
    }
    /* (w | a) over x over y, all selectors but a */
    const mixed = buildTree(
        1200,
        800,
        column(
            1,
            row(1, selector('w'), view('a')),
            selector('x'),
            selector('y')
        )
    )
    const { root, orientation } = mixed
    const [top] = root.children
    const vertical = { axis: 'vertical' as const }
    const horizontal = { axis: 'horizontal' as const }

    it('adds up the minimums side by side and takes the largest across', () => {
        expect(getMinLength(root, orientation, vertical)).toBe(
            PLUGIN_SIZES.min.height + selectorMin.height * 2
        )
        expect(getMinLength(root, orientation, horizontal)).toBe(
            selectorMin.width + PLUGIN_SIZES.min.width
        )
    })

    it('asks for a preferred length only for selectors alone', () => {
        const selectorsOnly = buildTree(
            1200,
            800,
            column(1, selector('x'), selector('y'))
        )

        expect(
            getPreferredLength(selectorsOnly.root, 'VERTICAL', vertical)
        ).toBe(selectorPreferred.height * 2)
        expect(getPreferredLength(top, 'HORIZONTAL', vertical)).toBeNull()
        expect(
            getPreferredLength(top, 'HORIZONTAL', {
                ...vertical,
                excludeId: 'a',
            })
        ).toBe(selectorPreferred.height)
        expect(
            getPreferredLength(
                { type: 'branch', size: 0, children: [] },
                'VERTICAL',
                vertical
            )
        ).toBeNull()
    })

    it('leaves out a view about to move away', () => {
        expect(
            getMinLength({ type: 'leaf', id: 'a', size: 0 }, 'VERTICAL', {
                axis: 'vertical',
                excludeId: 'a',
            })
        ).toBe(0)
    })
})
