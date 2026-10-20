import { DATA_ITEMS } from '@modules/demo/data-items'
import {
    getChildren,
    getOrgUnit,
    ROOT_ORG_UNIT_ID,
} from '@modules/demo/org-units'
import { PERIODS } from '@modules/demo/periods'
import type { LinkItem } from '@modules/interactions/apply-links'
import type { LinkDimension } from '@modules/interactions/channels'

/* The short fixed lists the demo's selectors offer: the country and its
 * districts; the years and quarters from 2025, latest first (the data
 * starts in September 2024, so 2024's periods would be partial); every
 * data item */
const orgUnitItem = (id: string): LinkItem => {
    const { name, path } = getOrgUnit(id) as { name: string; path: string }
    return { id, name, path }
}

const FIRST_FULL_YEAR = '2025'

const periodItems = PERIODS.filter(
    ({ id, periodType }) => periodType !== 'MONTHLY' && id >= FIRST_FULL_YEAR
)
    .map(({ id, name }) => ({ id, name }))
    .reverse()

export const DEMO_SELECTOR_ITEMS: Record<LinkDimension, LinkItem[]> = {
    ou: [
        orgUnitItem(ROOT_ORG_UNIT_ID),
        ...getChildren(ROOT_ORG_UNIT_ID).map(({ id }) => orgUnitItem(id)),
    ],
    pe: periodItems,
    dx: DATA_ITEMS.map(({ id, name }) => ({ id, name })),
}
