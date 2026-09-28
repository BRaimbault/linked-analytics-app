export const sum = (values: number[]): number =>
    values.reduce((total, value) => total + value, 0)

/* Lengths below their minimum are raised to it, and the others share what
 * is left in proportion, until all fit. When even the minimums don't fit,
 * the lengths are left for the grid to clamp. */
export const fitToMinimums = (
    lengths: number[],
    minimums: number[],
    total: number
): number[] => {
    if (sum(minimums) > total) {
        return lengths
    }
    const clamp = (length: number, index: number) =>
        Math.max(length, minimums[index])
    const fixed = new Map<number, number>()
    let fitted = [...lengths]
    const outOfLimits = () =>
        fitted.flatMap((length, index) =>
            !fixed.has(index) && clamp(length, index) !== length ? [index] : []
        )
    let clamped = outOfLimits()
    while (clamped.length) {
        clamped.forEach((index) =>
            fixed.set(index, clamp(fitted[index], index))
        )
        const free = lengths.flatMap((_, index) =>
            fixed.has(index) ? [] : [index]
        )
        const freeTotal = total - sum([...fixed.values()])
        const freeWeight = sum(free.map((index) => lengths[index]))
        fitted = lengths.map((length, index) => {
            const fixedLength = fixed.get(index)
            if (fixedLength !== undefined) {
                return fixedLength
            }
            return freeWeight > 0
                ? (freeTotal * length) / freeWeight
                : freeTotal / free.length
        })
        clamped = outOfLimits()
    }
    return fitted
}

/* Whole pixels that still add up to the total */
export const roundToTotal = (lengths: number[], total: number): number[] => {
    let end = 0
    let previousEnd = 0
    return lengths.map((length, index) => {
        end += length
        const roundedEnd =
            index === lengths.length - 1 ? Math.round(total) : Math.round(end)
        const rounded = roundedEnd - previousEnd
        previousEnd = roundedEnd
        return rounded
    })
}
