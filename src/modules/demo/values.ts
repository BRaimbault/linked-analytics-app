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

/* Districts differ, and in a pattern common in malaria endemic countries:
 * malaria weighs most where services reach fewest people. The south and
 * east carry 3 to 4 times the north's malaria, and fall short of the 80%
 * vaccination target that the north and west reach. */
const DISTRICT_FACTORS: Record<string, Record<string, number>> = {
    DemoNorth01: { anc: 1.1, penta: 1.12, malaria: 0.5, stockDip: 0.6 },
    DemoWest001: { anc: 1, penta: 1.0, malaria: 0.9, stockDip: 0.6 },
    DemoEast001: { anc: 0.9, penta: 0.86, malaria: 1.4, stockDip: 0.6 },
    DemoSouth01: { anc: 0.85, penta: 0.72, malaria: 1.8, stockDip: 2.2 },
}

/* Confirmed cases a month for 1,000 people at a district factor of 1: 300
 * a year, about the national rate where malaria is endemic all year */
const MALARIA_PER_1000_A_MONTH = 25

/* Children under one make about 3.5% of a young population */
const UNDER_1_SHARE = 0.035

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

/* The season's effect at a period, 1 on average over the year, highest in
 * the peak month */
const season = (period: DemoPeriod, strength: number, peakMonth: number) => {
    const { month } = dateOf(middleOf(period))
    return 1 + strength * Math.cos(((month - peakMonth) / 12) * 2 * Math.PI)
}

/* Malaria rises with the rains from May and peaks in June, about a fifth
 * above its yearly average, as where it's transmitted all year */
const malariaSeason = (period: DemoPeriod) => season(period, 0.2, 6)

/* A slow rise over the demo's two years, by this much a month */
const trend = (period: DemoPeriod, perMonth: number) =>
    1 + ((middleOf(period) - DATA_SPAN.start) / DAYS_PER_MONTH) * perMonth

/* How much of a month's count a period holds */
const monthsIn = (period: DemoPeriod) => lengthOf(period) / DAYS_PER_MONTH

const noise = (...parts: string[]) => 0.85 + seededRandom(parts.join(':')) * 0.3

/* Counted once a year, growing a little */
const population = (chiefdomId: string, period: DemoPeriod) => {
    const { year } = dateOf(middleOf(period))
    return Math.round(
        (1200 / UNDER_1_SHARE) * sizeOf(chiefdomId) * (1 + 0.03 * (year - 2024))
    )
}

const populationUnder1 = (chiefdomId: string, period: DemoPeriod) =>
    Math.round(population(chiefdomId, period) * UNDER_1_SHARE)

/* Third doses a month at routine visits: how far the visits reach */
const routineDoses = (chiefdomId: string, period: DemoPeriod) =>
    (populationUnder1(chiefdomId, period) / 12) *
    0.8 *
    districtFactor(chiefdomId, 'penta') *
    trend(period, 0.003) *
    monthsIn(period)

/* The malaria vaccine's third dose, at the same visits, reaches fewer:
 * its schedule is newer and later in the first year */
const MALARIA_VACCINE_SHARE = 0.88

/* Cases a month, on average over the year */
const usualMalariaCases = (chiefdomId: string, period: DemoPeriod) =>
    (population(chiefdomId, period) / 1000) *
    MALARIA_PER_1000_A_MONTH *
    districtFactor(chiefdomId, 'malaria')

/* Stock is kept at about 3 months of cases, and runs down after the peak
 * as treatments go out faster than supplies come in: in July, to about
 * 2.4 months in most districts, and below one month in the south */
const monthsOfStock = (chiefdomId: string, period: DemoPeriod) => {
    const { month } = dateOf(middleOf(period))
    const afterPeak = Math.max(0, Math.cos(((month - 7) / 12) * 2 * Math.PI))
    return 3 - districtFactor(chiefdomId, 'stockDip') * afterPeak ** 2
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
        season(period, 0.1, 8) *
        trend(period, 0.008) *
        monthsIn(period)
    switch (dataElementId) {
        case DATA_ITEM_IDS.anc1:
            return Math.round(anc1 * random)
        case DATA_ITEM_IDS.anc4:
            /* About half the women come back for a 4th visit */
            return Math.round(anc1 * 0.55 * random)
        case DATA_ITEM_IDS.malaria:
            return Math.round(
                usualMalariaCases(chiefdomId, period) *
                    malariaSeason(period) *
                    monthsIn(period) *
                    random
            )
        case DATA_ITEM_IDS.penta3Doses:
            return Math.round(routineDoses(chiefdomId, period) * random)
        /* The children Penta reaches, so Penta's noise, and a little of
         * its own */
        case DATA_ITEM_IDS.malariaVaccine3Doses:
            return Math.round(
                routineDoses(chiefdomId, period) *
                    MALARIA_VACCINE_SHARE *
                    noise(DATA_ITEM_IDS.penta3Doses, chiefdomId, period.id) *
                    (0.96 +
                        seededRandom(
                            `${dataElementId}:${chiefdomId}:${period.id}`
                        ) *
                            0.04)
            )
        case DATA_ITEM_IDS.populationUnder1:
            return populationUnder1(chiefdomId, period)
        case DATA_ITEM_IDS.population:
            return population(chiefdomId, period)
        default:
            /* ACT stock at the end of a month, in treatment courses */
            return Math.round(
                usualMalariaCases(chiefdomId, period) *
                    monthsOfStock(chiefdomId, period) *
                    random
            )
    }
}
