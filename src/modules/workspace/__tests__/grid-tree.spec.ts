import { describe, expect, it } from 'vitest'
import {
    findLeafLocation,
    fromSerializedGrid,
    getLeafRects,
    getLineCount,
    getMinLength,
    VIEW_MIN_SIZE,
} from '../grid-tree'
import { buildTree, column, row, view } from './grid-tree-builders'

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
            VIEW_MIN_SIZE.height * 2
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
        ).toBe(VIEW_MIN_SIZE.width)
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
