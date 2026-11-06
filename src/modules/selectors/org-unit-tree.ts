/* The paths above a unit's, the branches to open to show it: '/A/B/C'
 * gives '/A' and '/A/B' */
export const getAncestorPaths = (path: string | undefined): string[] => {
    const ids = path?.split('/').filter(Boolean) ?? []
    return ids
        .slice(0, -1)
        .map((_id, index) => `/${ids.slice(0, index + 1).join('/')}`)
}
