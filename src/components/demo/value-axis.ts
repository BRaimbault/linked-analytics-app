import type { DemoTable } from '@modules/demo/analytics'

/* The round values the value axis may top out at, times a power of ten */
const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

/* A round top for the value axis, just above the largest value */
export const niceMax = (value: number): number => {
    if (value <= 0) {
        return 1
    }
    const power = 10 ** Math.floor(Math.log10(value))
    const step = NICE_STEPS.find((factor) => factor * power >= value)
    return (step as number) * power
}

/* The top of a value axis that fits a chart's values */
export const fitAxis = ({ series, categories, valueOf }: DemoTable): number =>
    niceMax(
        Math.max(
            0,
            ...series.flatMap((item) =>
                categories.map((category) => valueOf(item, category) ?? 0)
            )
        )
    )
