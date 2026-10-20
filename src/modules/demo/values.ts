import { dateOf } from './calendar'
import { DATA_ITEM_IDS } from './data-items'
import { ORG_UNITS } from './org-units'
import { DATA_SPAN, lengthOf, type DemoPeriod } from './periods'

/* The demo's data values: a seeded formula for each data element,
 * chiefdom and period it's collected in, as data entry would store them.
 * Adding them up over places and time is aggregation.ts's job. */

/* A number in [0, 1) that is always the same for the same text, the
 * formula's only source of noise: FNV-1a, then murmur3's finalizer, so
 * texts that differ only at the end (2025W1, 2025W2) differ everywhere */
export const seededRandom = (text: string): number => {
    let hash = 0x811c9dc5
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index)
        hash = Math.imul(hash, 0x01000193)
    }
    hash ^= hash >>> 16
    hash = Math.imul(hash, 0x85ebca6b)
    hash ^= hash >>> 13
    hash = Math.imul(hash, 0xc2b2ae35)
    hash ^= hash >>> 16
    return (hash >>> 0) / 0x100000000
}

/* Districts differ: malaria weighs most in the south and east, antenatal
 * care and vaccination go best in the north */
const DISTRICT_FACTORS: Record<string, Record<string, number>> = {
    DemoNorth01: { anc: 1.15, penta: 1.1, malaria: 0.6 },
    DemoWest001: { anc: 1, penta: 0.95, malaria: 0.9 },
    DemoEast001: { anc: 0.9, penta: 0.8, malaria: 1.3 },
    DemoSouth01: { anc: 0.85, penta: 0.7, malaria: 1.5 },
}

const DAYS_PER_MONTH = 365.25 / 12

/* Every leaf is a chiefdom, in a district */
export const districtOf = new Map(
    ORG_UNITS.filter(({ level }) => level === 3).map(({ id, parentId }) => [
        id,
        parentId as string,
    ])
)

/* How many people a chiefdom holds, relative to the others */
const sizeOf = (chiefdomId: string) => 0.6 + seededRandom(chiefdomId) * 0.8

const districtFactor = (chiefdomId: string, topic: string) =>
    DISTRICT_FACTORS[districtOf.get(chiefdomId) as string][topic]

const middleOf = ({ start, end }: DemoPeriod) => Math.floor((start + end) / 2)

/* The season's effect at a period, 1 on average over the year: malaria
 * peaks with the rains in August, antenatal care varies a little */
const season = (period: DemoPeriod, strength: number) => {
    const { month } = dateOf(middleOf(period))
    return 1 + strength * Math.cos(((month - 8) / 12) * 2 * Math.PI)
}

/* A slow rise over the demo's two years */
const trend = (period: DemoPeriod) =>
    1 + ((middleOf(period) - DATA_SPAN.start) / DAYS_PER_MONTH) * 0.008

/* How much of a month's count a period holds */
const monthsIn = (period: DemoPeriod) => lengthOf(period) / DAYS_PER_MONTH

const noise = (...parts: string[]) => 0.85 + seededRandom(parts.join(':')) * 0.3

/* Children under one, counted once a year, growing a little */
const populationUnder1 = (chiefdomId: string, period: DemoPeriod) => {
    const { year } = dateOf(middleOf(period))
    return Math.round(1200 * sizeOf(chiefdomId) * (1 + 0.03 * (year - 2024)))
}

/* One data element's value for one chiefdom and one of the periods it's
 * collected in */
export const getLeafValue = (
    dataElementId: string,
    chiefdomId: string,
    period: DemoPeriod
): number => {
    const size = sizeOf(chiefdomId)
    const random = noise(dataElementId, chiefdomId, period.id)
    const anc1 =
        120 *
        size *
        districtFactor(chiefdomId, 'anc') *
        season(period, 0.1) *
        trend(period) *
        monthsIn(period)
    switch (dataElementId) {
        case DATA_ITEM_IDS.anc1:
            return Math.round(anc1 * random)
        case DATA_ITEM_IDS.anc4:
            /* Fewer women come back for a 4th visit */
            return Math.round(anc1 * 0.55 * random)
        case DATA_ITEM_IDS.malaria:
            return Math.round(
                300 *
                    size *
                    districtFactor(chiefdomId, 'malaria') *
                    season(period, 0.6) *
                    monthsIn(period) *
                    random
            )
        case DATA_ITEM_IDS.penta3Doses:
            return Math.round(
                (populationUnder1(chiefdomId, period) / 12) *
                    0.7 *
                    districtFactor(chiefdomId, 'penta') *
                    trend(period) *
                    monthsIn(period) *
                    random
            )
        case DATA_ITEM_IDS.populationUnder1:
            return populationUnder1(chiefdomId, period)
        default:
            /* ACT stock at the end of a month: lowest after the rains'
             * peak, when most cases are treated */
            return Math.round(600 * size * (2 - season(period, 0.6)) * random)
    }
}
