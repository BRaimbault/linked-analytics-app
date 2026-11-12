/* Demo mode is on while the page's address has ?demo, with or without a
 * value; there is no menu entry for it */
export const isDemoMode = (search: string): boolean =>
    new URLSearchParams(search).has('demo')

/* The value of ?demo, such as a tour to start (?demo=climate), or null */
export const getDemoValue = (search: string): string | null =>
    new URLSearchParams(search).get('demo') || null
