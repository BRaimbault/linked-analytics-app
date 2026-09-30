# Period types of data items

- **Status**: proposal for `@dhis2/analytics`, for its maintainers to agree names and placement before the PR. Findings from 2.43.1 and 2.44-SNAPSHOT (September 2026), and the dhis2-core `master` source. Work in progress on the `feat/data-item-period-types` branch of `dhis2/analytics`.
- **Related**: [interactions.md §2](interactions.md#period-pe) (period links), the test tool in `dhis2/maps-tools` (`test-data-period-types/`, with its `VERSION-FINDINGS.md` once it has run on every version).

When Linked Analytics links a period across views, a view can be asked for periods its data can't fill. It then comes back empty, or with a total that is too low. This proposes helpers in `@dhis2/analytics`, so any app can tell before it asks, and explain an empty result after.

## 1. The problem

What analytics does with periods, from tests on 2.43.1 and 2.44-SNAPSHOT and the dhis2-core source (`QueryPlannerUtils.isDisaggregation`, `AnalyticsAggregationType.fromAggregationType`):

- **Nothing finer than collected.** Analytics never splits a value into shorter periods. Monthly `SUM` data asked by week returns no rows.
- **Except averages, which repeat.** When the period aggregation is `AVERAGE` (the aggregation types `AVERAGE` and `AVERAGE_SUM_ORG_UNIT`), the value is repeated into every shorter period: a yearly population of 120 is 120 for each quarter and each month.
- **"Shorter" means a lower `frequencyOrder`, or the same one with another type.** A Wednesday week is not a Monday week: an element collected in Wednesday weeks gives nothing by Monday week. The same holds for `Yearly` and the financial years.
- **Each aggregation type aggregates over time its own way** (for 1, 2, 3 by month, Q1 is 6 for `SUM`, 2 for `AVERAGE`, 3 for `LAST`). This changes the value, not whether there is one.
- **`NONE` can't be queried**: analytics refuses it.
- **An element can have several period types.** They come from its data sets (`dataSetElements[dataSet[periodType]]`); a data element has no `periodType` of its own. Real cases:
    - in a Monday and a Wednesday weekly data set: by Monday week, only the Monday half comes back;
    - weekly at one place and monthly at another: the weekly total is too low, with no sign of it;
    - monthly in 2024 and weekly in 2025, with only the weekly data set left: the metadata says weekly, and 2024 by week is empty;
    - in no data set at all: the metadata says nothing.
- **Weeks that straddle a boundary** aren't placed by start date: Monday week 1 of 2025 starts on 30 December 2024, yet counts in January.
- **A date range counts only whole data periods.** `analytics?startDate=2025-01-06&endDate=2025-01-12` on monthly data is empty; `2025-01-01` to `2025-01-31` gives January.
- **`analytics/rawData`** returns each value with its own period and dates. It has no paging, only `startDate`, `endDate` and a row limit.

So the metadata gives the setup as it is today, not the history of the data. The helpers use it first, and check the data only when asked.

## 2. Four capabilities

1. **An item's finest period type**, from its metadata, with mixed types listed.
2. **Whether a selection of periods** (fixed, relative, or period types) **suits the item.**
3. **After an empty result, whether the periods are the cause**, with one extra request.
4. **The period types actually present** in a date range, from `rawData`, on demand.

## 3. API

Period types use the **server's names** (`Monthly`, `WeeklyWednesday`, `FinancialApril`, `TwoYearly`), as the metadata and `/api/periodTypes` return them. `SERVER_PT_TO_MULTI_CALENDAR_PT` maps them to the `PeriodDimension` ids where needed.

### Pure functions (`src/modules/dataPeriodTypes/`)

```js
getDataItemPeriodInfo(item, metadata)
// item: { id, dimensionItemType }, as in a visualization's dx items
// metadata: the normalized lookups returned by fetchDataItemsMetadata
// → {
//     periodTypes: ['Weekly', 'Monthly'], // every collection type found, shortest first
//     finest: 'Monthly',        // the shortest query type that gets all the data; null if nothing limits it
//     mixed: true,              // the limiting elements have more than one type
//     repeatsIntoShorter: false,// an averaged element repeats into shorter periods
//     unknown: false,           // some metadata is missing: never guessed
//     reasons: [],              // why it's unknown, e.g. { code: 'NO_DATA_SET', id }
//     sources: [ { id, periodTypes, aggregationType, repeats } ], // the data elements and data sets behind it
//   }

getPeriodCompatibility(info, periods, options)
// periods: fixed ids ('2025W2'), relative ids ('LAST_12_MONTHS') or period types ('Monthly')
// options: { weeklyPeriodType, financialYearPeriodType, calendar }, for relative periods and dates
// → { status, periods: [{ id, periodTypes, status, nests }] }
```

- **Status**, per period and overall (the most severe wins):
    - `compatible`: every value lands in the period;
    - `repeated`: averaged data, repeated into a shorter period;
    - `partial`: some of the data can't land (mixed types);
    - `finer`: none of it can (the period is shorter than the data, or another type of the same length);
    - `unknown`: the metadata is missing, or a relative period's type depends on a setting that wasn't given.
- **How the finest type is found**: the longest collection type among the elements that don't repeat. Averaged elements don't limit it, but set `repeatsIntoShorter`. Event and tracker items (`D{}`, `A{}`, `I{}`, program indicators) don't limit it. A reporting rate takes its data set's type. Constants, `OUG{}` and `[days]` don't limit it.
- **Expressions**: indicators (numerator and denominator), nested indicators `N{}`, and expression dimension items are read operand by operand: `#{de}`, `#{de.coc}`, `#{de.coc.aoc}`, `#{de.*}`, `R{ds.METRIC}`, `N{}`, `I{}`, `D{}`, `A{}`, `C{}`, `OUG{}`, `[days]`, and the `.periodOffset(n)` and `.aggregationType(TYPE)` functions. An unknown operand makes the item `unknown`.
- **`nests`**: for a fixed period, whether it starts and ends on the edges of the data's periods (a month on weekly data doesn't). Computed from dates with `@dhis2/multi-calendar-dates`, so it works in every calendar. `null` for relative periods.
- **Annualized indicators** don't change the status (a monthly count over a yearly population is `compatible` by month). They only make the values comparable.

Also exported, from `periodTypeRelations.js`: `aggregatesInto(dataPeriodType, queryPeriodType)` (the server's rule) and `getPeriodRelation(a, b)` (`same`, `within`, `contains`, `overlaps` or `disjoint`, from start and end dates).

### Requests (`src/api/dataPeriodTypes.js`)

- `fetchDataItemsMetadata(dataEngine, items)`: data elements with `aggregationType` and `dataSetElements[dataSet[id,periodType]]`, indicators with `numerator` and `denominator`, then their operands, then nested indicators, and data sets and expression dimension items. It returns normalized lookups, and accepts the shape differences between versions (a gist response, a period type as a string or an object).
- `getCoarserProbeParams({ dx, ou, periods, periodType })`: the analytics params for the empty-result check (§4).
- `getRawDataParams({ dx, ou, startDate, endDate })` and `getCollectedPeriodTypes(response)`: the `rawData` request, and the period types found in it, per item.

### Hooks (`src/components/DataPeriodTypes/`, exported from `src/index.js`)

```js
const { loading, error, info, getCompatibility } = useDataItemPeriodInfo(items)
// capabilities 1 and 2. info is keyed by item id; getCompatibility(id, periods) runs the pure check

const { loading, error, called, check, causes } = useEmptyResultCheck({
    dx,
    ou,
    periods,
})
// capability 3. check() sends one coarser request; causes[id] is 'PERIODS', 'NO_DATA' or 'UNKNOWN'

const { loading, error, called, fetch, periodTypes } = useCollectedPeriodTypes({
    dx,
    ou,
    startDate,
    endDate,
})
// capability 4, on demand. periodTypes[id] lists the types present, with a row count each
```

## 4. The empty-result check

Asking the containing year is not enough: a year with data in other months would blame the periods for a month that is truly empty. So the probe asks **the same range, widened to whole periods of the data's own type**, with `startDate` and `endDate`:

- the periods' dates come from their ids; the widening uses the item's `periodTypes` (so a request for its metadata comes first, shared with capability 1);
- probe has values → `PERIODS`: the data is there, at a coarser type;
- probe empty → `NO_DATA`: even whole data periods have nothing;
- no known type, or a relative period → the probe widens to whole years, and values there give `UNKNOWN`, not `PERIODS`.

Relative periods have no dates on the client. The empty response already lists the fixed periods it used (`metaData.dimensions.pe`): pass those.

## 5. Scope of the first PR

- In: the pure modules, the requests and the three hooks, with tests. The tests are table-driven from the test tool's fixtures (§6).
- Not in: `PeriodDimension` marking the types finer than the data, the empty-state message in DV and Maps, and the org unit version of the same question (which levels an item is collected at). These come in later PRs, once the names are agreed.

## 6. Evidence

- **The test tool** (`dhis2/maps-tools`, `test-data-period-types/`) creates its own metadata and data on the play instances (2.40 to 2.44), runs analytics, and checks every rule: the 21 aggregation types × every collection type × every query type, periods that don't nest, mixed collection, indicators and expressions, reporting rates. It exports fixtures (`fixtures/period-types/<group>.json`) and a `metadata-shapes.json` per version.
- **The library's tests** read those fixtures. Each fixture `status` maps to a library status: `VALUE` → `compatible`, `REPEATED` → `repeated`, `EMPTY` → `finer`, `PARTIAL` → `partial`. `ERROR` (as for `NONE`) → `unknown`, since the periods aren't the cause.
- **Until the tool's first export**, the library ships provisional fixtures in the same format (`"provisional": true`), written from §1. Any disagreement with the real ones is explained here.

## 7. Open questions

- **Names**: `finer` covers both "shorter than the data" and "same length, other type". `incompatible` may read better.
- **Placement**: the hooks sit next to `useDataOutputPeriodTypes` (`src/components/`), or in a new `src/hooks/`.
- **Period type names**: the server's (proposed), or the library's `PeriodDimension` ids.
- **Which of an element's data sets analytics uses**: the one with the highest collection frequency (`DataElement.getPeriodType`), for the "repeat" decision. The tool checks whether a mixed averaged element repeats by that type or by each value's own type.
- **Weeks and financial years in relative periods**: their type depends on server settings (`analyticsWeeklyStart` and `analyticsFinancialYearStart` in 2.43, the enabled period types from 2.44). The hooks read them as `useDataOutputPeriodTypes` does; without them the status is `unknown` where it matters.

## Sources

- dhis2-core `master`: `QueryPlannerUtils.java` (`isDisaggregation`, `getAggregationType`), `AnalyticsAggregationType.java` (`fromAggregationType`), `DataElement.java` (`getPeriodType`, `getPeriodTypes`).
- Dev server (2.44-SNAPSHOT): `/api/periodTypes` (24 types, with `frequencyOrder`; `TwoYearly` has no ISO format), `analytics` with `pe` and with `startDate`/`endDate`, `analytics/rawData`.
- `@dhis2/analytics`: `PERIOD_TYPE_REGEX`, `SERVER_PT_TO_MULTI_CALENDAR_PT`, `RP_CATEGORY_TO_FP_DEPENDENCIES`, `getRelativePeriodsDetails`, `useDataOutputPeriodTypes`.
- `@dhis2/multi-calendar-dates` 1.3.2: `createFixedPeriodFromPeriodId` (it doesn't parse the November quarter and six-month ids), `getFixedPeriodByDate`.
