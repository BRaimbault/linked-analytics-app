import type { CSSProperties } from 'react'

/* Dark enough for a white letter on top; the letter tells channels apart,
 * so a repeated color is never the only difference. Red comes last, as it
 * reads as an error. */
const CHANNEL_COLORS = [
    'var(--colors-blue700)',
    'var(--colors-teal800)',
    'var(--colors-yellow900)',
    'var(--colors-green800)',
    'var(--colors-grey800)',
    'var(--colors-red800)',
]

export const getChannelColor = (label: string): string =>
    CHANNEL_COLORS[
        (label.charCodeAt(0) - 'A'.charCodeAt(0)) % CHANNEL_COLORS.length
    ]

/* Sets --channel-color, which the badge and selector styles read */
export const channelColorStyle = (label: string) =>
    ({ '--channel-color': getChannelColor(label) }) as CSSProperties
