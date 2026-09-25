import { describe, expect, it } from 'vitest'
import {
    findLeafLocation,
    fromSerializedGrid,
    getLeafRects,
    getLineCount,
    getMaxLength,
    getMinLength,
    getPreferredLength,
    getViewMaxSizes,
    PLUGIN_SIZES,
    withEffectiveMaxSizes,
    withViewSizes,
} from '../grid-tree'
import { getViewTypeSizes } from '../view-types'
import { buildTree, column, row, view, selector } from './grid-tree-builders'

/* a | (b over c) */
const layout = buildTree(
    1200,
    800,
    row(1, view('a', 1), column(2, view('b'), view('c', 3)))
)

describe('fromSerializedGrid', () => {
    it('reads the layout dockview serializes', () => {
        expect(
            fromSerializedGrid({
                orientation: 'HORIZONTAL',
                width: 1200,
                height: 800,
                root: {
                    type: 'branch',
                    size: 800,
                    data: [
                        { type: 'leaf', data: { id: 'a' }, size: 400 },
                        {
                            type: 'branch',
                            size: 800,
                            data: [
                                { type: 'leaf', data: { id: 'b' }, size: 200 },
                                { type: 'leaf', data: { id: 'c' } },
                            ],
                        },
                    ],
                },
            })
        ).toEqual({
            orientation: 'HORIZONTAL',
            width: 1200,
            height: 800,
            root: {
                type: 'branch',
                size: 800,
                children: [
                    { type: 'leaf', id: 'a', size: 400 },
                    {
                        type: 'branch',
                        size: 800,
                        children: [
                            { type: 'leaf', id: 'b', size: 200 },
                            { type: 'leaf', id: 'c', size: 0 },
                        ],
                    },
                ],
            },
        })
    })

    it('wraps a lone view in a branch', () => {
        const tree = fromSerializedGrid({
            orientation: 'VERTICAL',
            width: 1200,
            height: 800,
            root: { type: 'leaf', data: { id: 'a' } },
        })
        const empty = fromSerializedGrid({
            orientation: 'HORIZONTAL',
            width: 0,
            height: 0,
            root: { type: 'branch', data: [] },
        })

        expect(tree.root).toEqual({
            type: 'branch',
            size: 0,
            children: [{ type: 'leaf', id: 'a', size: 0 }],
        })
        expect(empty.root).toEqual({ type: 'branch', size: 0, children: [] })
    })
})

describe('getLeafRects', () => {
    it('places each view from the top-left corner of the grid', () => {
        expect(Object.fromEntries(getLeafRects(layout))).toEqual({
            a: { left: 0, top: 0, width: 400, height: 800 },
            b: { left: 400, top: 0, width: 800, height: 200 },
            c: { left: 400, top: 200, width: 800, height: 600 },
        })
    })
})

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

describe('findLeafLocation', () => {
    it('finds a view with its branch and place in it', () => {
        const location = findLeafLocation(layout, 'c')

        expect(location?.orientation).toBe('VERTICAL')
        expect(location?.index).toBe(1)
        expect(findLeafLocation(layout, 'gone')).toBeNull()
    })
})

describe('sizes of mixed views', () => {
    const selectorSizes = getViewTypeSizes('org-unit-selector')
    const selectorMin = selectorSizes.min
    const selectorMax = selectorSizes.max as { width: number; height: number }
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

    it('bounds a node by its selectors only when every line across is a selector', () => {
        const selectorsOnly = buildTree(
            1200,
            800,
            column(1, row(1, selector('w'), selector('v')), selector('x'))
        )

        expect(getMaxLength(selectorsOnly.root, 'VERTICAL', vertical)).toBe(
            selectorMax.height * 2
        )
        /* A plugin in the top row lets the whole column grow */
        expect(getMaxLength(root, orientation, vertical)).toBe(Infinity)
        expect(getMaxLength(top, 'HORIZONTAL', horizontal)).toBe(Infinity)
        expect(
            getMaxLength(top, 'HORIZONTAL', { ...vertical, excludeId: 'w' })
        ).toBe(Infinity)
        expect(
            getMaxLength(
                { type: 'branch', size: 0, children: [] },
                'VERTICAL',
                vertical
            )
        ).toBe(Infinity)
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

    it('attaches each view\u2019s sizes by cell', () => {
        const sized = withViewSizes(
            buildTree(1200, 800, row(1, view('a'), view('w'))),
            (id) => (id === 'w' ? selectorSizes : PLUGIN_SIZES)
        )

        expect(
            sized.root.children.map(
                (node) => node.type === 'leaf' && node.sizes
            )
        ).toEqual([PLUGIN_SIZES, selectorSizes])
    })

    it('caps a selector only where it shares its length with selectors alone', () => {
        const maxSizes = getViewMaxSizes(mixed)

        /* w shares its row's height with plugin a, but not its width */
        expect(maxSizes.get('w')).toEqual({
            width: selectorMax.width,
            height: undefined,
        })
        /* x and y are stacked: their own height, and the grid's width,
         * which the plugin in the top row shares */
        expect(maxSizes.get('x')).toEqual({
            width: undefined,
            height: selectorMax.height,
        })
        expect(maxSizes.has('a')).toBe(false)
    })

    it('caps no selector when no plugin is around to take the rest', () => {
        const selectorsOnly = buildTree(
            1200,
            800,
            row(1, selector('w'), column(1, selector('x'), selector('y')))
        )

        expect(getViewMaxSizes(selectorsOnly).get('w')).toEqual({
            width: undefined,
            height: undefined,
        })
    })

    it('lets stacked selectors fill their column rather than leave a gap', () => {
        /* map | (w over v): the column is only selectors */
        const stacked = buildTree(
            1200,
            800,
            row(1, view('map'), column(1, selector('w'), selector('v')))
        )

        expect(getViewMaxSizes(stacked).get('w')).toEqual({
            width: selectorMax.width,
            height: undefined,
        })
        const capped = withEffectiveMaxSizes(stacked)
        const [, stack] = capped.root.children
        expect(getMaxLength(stack, 'VERTICAL', vertical)).toBe(Infinity)
        expect(getMaxLength(stack, 'VERTICAL', horizontal)).toBe(
            selectorMax.width
        )
    })
})
