import type { VisualizationObject } from '@modules/visualization/analytical-object'

/* DV's default and dark color sets (`colorSets` in @dhis2/analytics),
 * copied: that module imports Highcharts, which the demo doesn't need */
export const COLOR_SETS: Record<
    NonNullable<VisualizationObject['colorSet']>,
    string[]
> = {
    DEFAULT: [
        '#a8bf24',
        '#518cc3',
        '#d74554',
        '#ff9e21',
        '#968f8f',
        '#ba3ba1',
        '#ffda54',
        '#45beae',
        '#b98037',
        '#676767',
        '#6b2dd4',
        '#47792c',
        '#fcbdbd',
        '#830000',
        '#a5ffc0',
        '#000078',
        '#817c00',
        '#bdf023',
        '#fffac4',
    ],
    DARK: [
        '#115688',
        '#207718',
        '#b51208',
        '#803d00',
        '#5e338a',
        '#078a7f',
        '#56a2cd',
        '#73b62f',
        '#db0606',
        '#e68a00',
        '#9e6fb3',
        '#aaad00',
    ],
}

/* A series' color, by its place among the series */
export const seriesColor = (
    colorSet: VisualizationObject['colorSet'],
    index: number
): string => {
    const colors = COLOR_SETS[colorSet ?? 'DEFAULT']
    return colors[index % colors.length]
}
