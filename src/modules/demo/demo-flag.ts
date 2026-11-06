/* Demo mode is on while the page's address has ?demo, with or without a
 * value; there is no menu entry for it */
export const isDemoMode = (search: string): boolean =>
    new URLSearchParams(search).has('demo')
