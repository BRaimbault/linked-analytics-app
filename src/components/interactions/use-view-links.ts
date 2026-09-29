import { useAppDispatch, useAppSelector } from '@hooks'
import type { IncomingLinks } from '@modules/interactions/apply-links'
import { getHighlight, getIncomingLinks } from '@modules/interactions/channels'
import type { DataClick, Highlight } from '@modules/plugins/contract'
import { dataClicked, selectChannels } from '@store/interactions-slice'
import { useCallback, useMemo } from 'react'

/* A plugin view's side of its channels: the values it is rewritten with,
 * what it highlights, and where its clicks go. The values are read as
 * text, so they keep their identity until they change: a plugin gets new
 * props, and refetches, only then. */
export const useViewLinks = (viewId: string) => {
    const dispatch = useAppDispatch()
    const incomingText = useAppSelector((state) =>
        JSON.stringify(getIncomingLinks(selectChannels(state), viewId))
    )
    const highlightText = useAppSelector((state) =>
        JSON.stringify(getHighlight(selectChannels(state), viewId) ?? null)
    )

    const incoming = useMemo(
        () => JSON.parse(incomingText) as IncomingLinks,
        [incomingText]
    )
    const highlight = useMemo(
        () => (JSON.parse(highlightText) as Highlight | null) ?? undefined,
        [highlightText]
    )
    const onDataClick = useCallback(
        (click: DataClick, { additive }: { additive: boolean }) => {
            dispatch(dataClicked({ viewId, click, additive }))
        },
        [dispatch, viewId]
    )

    return { incoming, highlight, onDataClick }
}
