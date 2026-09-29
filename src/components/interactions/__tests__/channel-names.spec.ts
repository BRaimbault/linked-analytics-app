import { getChannelColor } from '@components/interactions/channel-colors'
import {
    getChannelName,
    getChannelValueText,
} from '@components/interactions/channel-names'
import type { Channel } from '@modules/interactions/channels'
import { describe, expect, it } from 'vitest'

const channel = (overrides: Partial<Channel>): Channel => ({
    label: 'B',
    dimension: 'pe',
    value: [],
    setBy: null,
    before: [],
    selectorViewId: null,
    members: {},
    ...overrides,
})

describe('channel names', () => {
    it('names a channel by its dimension and letter', () => {
        expect(getChannelName(channel({}))).toBe('Period B')
        expect(getChannelName(channel({ dimension: 'ou' }))).toBe('Org unit B')
    })

    it('lists the value’s items, by id when they have no name', () => {
        expect(getChannelValueText(channel({}))).toBe('Nothing selected')
        expect(
            getChannelValueText(
                channel({
                    value: [{ id: '2025', name: '2025' }, { id: '202601' }],
                })
            )
        ).toBe('2025, 202601')
    })

    it('cycles through the colors, so a seventh channel shares the first one’s', () => {
        expect(getChannelColor('G')).toBe(getChannelColor('A'))
        expect(getChannelColor('B')).not.toBe(getChannelColor('A'))
    })
})
