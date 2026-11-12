import { useAppDispatch, useAppSelector } from '@hooks'
import type {
    IncomingLinks,
    OrgUnitDepth,
} from '@modules/interactions/apply-links'
import { getViewLinks } from '@modules/interactions/drills'
import type { DataClick, Highlight } from '@modules/plugins/contract'
import { dataClicked, selectLinksState } from '@store/interactions-slice'
import { useCallback, useMemo } from 'react'

/* A plugin view's side of its channels and drills: the values it is
 * rewritten with, what it highlights, and where its clicks go. They are
 * read as text, so they keep their identity until they change: a plugin
 * gets a new object, and refetches, only when what rewrites it changes,
 * not when only the highlight does. */
export const useViewLinks = (viewId: string) => {
    const dispatch = useAppDispatch()
    const rewriteText = useAppSelector((state) => {
        const { incoming, orgUnitDepth } = getViewLinks(
            selectLinksState(state),
            viewId
        )
        return JSON.stringify({ incoming, orgUnitDepth })
    })
    const highlightText = useAppSelector((state) =>
        JSON.stringify(
            getViewLinks(selectLinksState(state), viewId).highlight ?? null
        )
    )

    const { incoming, orgUnitDepth } = useMemo(
        () =>
            JSON.parse(rewriteText) as {
                incoming: IncomingLinks
                orgUnitDepth: OrgUnitDepth
            },
        [rewriteText]
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

    return { incoming, orgUnitDepth, highlight, onDataClick }
}
