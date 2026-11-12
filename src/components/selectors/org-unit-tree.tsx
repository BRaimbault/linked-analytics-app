import { OrganisationUnitTree } from '@dhis2/ui'
import type { LinkItem } from '@modules/interactions/apply-links'
import { getAncestorPaths } from '@modules/selectors/org-unit-tree'
import { useRef, useState, type FC, type MouseEvent } from 'react'
import { SelectorHeader } from './selector-header'
import classes from './styles/org-unit-tree.module.css'
import { useTreeAutoExpand } from './use-tree-auto-expand'

const pathsOf = (value: LinkItem[]) =>
    value.flatMap(({ path }) => (path ? [path] : []))

/* A unit clicked with Ctrl or Cmd joins the selection, or leaves it, as on
 * the map; a plain click selects it alone, or clears it when it was */
const getClickedValue = (
    value: LinkItem[],
    unit: LinkItem,
    isAdditive: boolean
): LinkItem[] => {
    const isSelected = value.some(({ id }) => id === unit.id)
    if (isAdditive) {
        return isSelected
            ? value.filter(({ id }) => id !== unit.id)
            : [...value, unit]
    }
    return isSelected && value.length === 1 ? [] : [unit]
}

type TreeChange = { id: string; path: string; displayName: string }

/* An org unit selector as DHIS2's org unit tree, opened as far as its box
 * allows. Units set elsewhere (clicks on the map, several with Ctrl) are
 * selected in the tree, and their branches opened. */
export const OrgUnitTree: FC<{
    label: string
    valueText: string
    /* The units at the top of the tree, with their paths */
    roots: LinkItem[]
    deepestLevel: number
    value: LinkItem[]
    onChange: (value: LinkItem[]) => void
}> = ({ label, valueText, roots, deepestLevel, value, onChange }) => {
    const [expanded, setExpanded] = useState(() => pathsOf(roots))
    const boxRef = useRef<HTMLDivElement>(null)
    const autoExpand = useTreeAutoExpand({
        boxRef,
        expanded,
        setExpanded,
        deepestLevel,
    })

    /* A new selection opens its branches once; the user may close them */
    const selectedPaths = pathsOf(value)
    const selectionKey = selectedPaths.join()
    const [shownKey, setShownKey] = useState(selectionKey)
    if (selectionKey !== shownKey) {
        setShownKey(selectionKey)
        setExpanded([
            ...new Set([
                ...expanded,
                ...selectedPaths.flatMap(getAncestorPaths),
            ]),
        ])
    }

    return (
        <div className={classes.tree} data-test="org-unit-tree">
            <SelectorHeader label={label} valueText={valueText} />
            <div
                ref={boxRef}
                className={classes.nodes}
                data-settling={autoExpand.isSettling || undefined}
            >
                <OrganisationUnitTree
                    roots={roots.map(({ id }) => id)}
                    singleSelection
                    selected={selectedPaths}
                    /* Paths, as its prop types say; its TypeScript types
                     * say boolean */
                    expanded={expanded as unknown as boolean}
                    handleExpand={({ path }: { path: string }) => {
                        autoExpand.stop()
                        setExpanded([...expanded, path])
                    }}
                    handleCollapse={({ path }: { path: string }) => {
                        autoExpand.onUserClose()
                        setExpanded(expanded.filter((open) => open !== path))
                    }}
                    onChildrenLoaded={autoExpand.onChildrenLoaded}
                    onChange={(
                        { id, path, displayName }: TreeChange,
                        event: MouseEvent
                    ) => {
                        autoExpand.stop()
                        onChange(
                            getClickedValue(
                                value,
                                { id, path, name: displayName },
                                event.ctrlKey || event.metaKey
                            )
                        )
                    }}
                />
            </div>
        </div>
    )
}
