# Org units of data items

- **Status**: proposal, a follow-up to [data-period-types.md](data-period-types.md), for `@dhis2/analytics`. Research on 2.44-SNAPSHOT (30 September 2026): the metadata fields and the counts in §2 are checked on the server; every rule in §1 marked _to test_ is not, and needs a case in the test tool before the library relies on it.
- **Related**: [data-period-types.md](data-period-types.md) (the same question for periods), [interactions.md §2](interactions.md#org-unit-ou) (org unit links), the test tool in `dhis2/maps-tools` (`test-data-period-types/`).

When Linked Analytics links an org unit across views, a view can be asked for places its data doesn't cover. Like a period that's too short, it then comes back empty, or with a total that looks complete but isn't. This proposes to answer, for places, the four questions [data-period-types.md](data-period-types.md) answers for periods, from one shared model of where and how often an item is collected.

## 1. The problem

Each rule for periods has a counterpart for places. None of these is tested yet.

| Periods (tested)                                                | Org units (_to test_)                                                                                                                                             |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data is collected at a period type, from its data sets          | Data is entered at the org units its data sets are assigned to, usually facilities                                                                                |
| Nothing finer than collected: monthly data by week is empty     | Nothing below where it's entered: data entered at districts, asked by facility, is empty                                                                          |
| Averaged items repeat into shorter periods                      | No known counterpart: analytics isn't known to split a value down to lower levels                                                                                 |
| Mixed: several types, by data set or place                      | Partial coverage: a data set assigned to some districts only (a program in endemic areas). A higher total looks complete but isn't                                |
| History: a period type changed, and the metadata keeps no trace | History: assignments changed; units moved, opened or closed. Analytics uses the hierarchy of its last run, so a moved unit's old data counts under its new parent |

Problems with no period counterpart:

- **Uneven depth.** Some branches have fewer levels, so "sub-x2-units" of a district in a shallow branch gives nothing, and `LEVEL-n` below a branch's deepest level is empty there.
- **Aggregation levels.** A data element's `aggregationLevels` limit the levels its values aggregate to (_to test_: the exact behavior, above and below those levels).
- **Category options assigned to org units**, and with start and end dates: a disaggregation, or an attribute option such as an implementing partner, exists only in some places and years.
- **The user's data view scope.** A shared workspace can hold a linked unit outside another user's scope, and relative items (`USER_ORGUNIT`) differ per user.
- **Maps: no geometry.** A unit with values but no geometry can't be drawn, so a map looks empty where analytics has data.

## 2. What the server shows

Checked on 2.44-SNAPSHOT (`dev.im.dhis2.org/analytics-dev`, Sierra Leone database), GET only:

- **The fields exist**: `DataSet.organisationUnits`, `DataElement.aggregationLevels`, `CategoryOption.organisationUnits`, `startDate` and `endDate`, and `OrganisationUnit.openingDate`, `closedDate`, `geometry`, `level`, `path` and `dataSets`.
- **Coverage can be counted cheaply.** `organisationUnits?filter=dataSets.id:eq:<ds>&filter=level:eq:<n>&filter=path:like:<ou>&fields=id&pageSize=1` returns the count in `pager.total`, with no list. The monthly data set behind ANC 1st visit covers 125 of Bo's 125 facilities, and is also assigned to the country and to one district.
- **Assignment says where data can be entered, not where it was.** Both IDSR data sets (Monday and Wednesday weeks) are assigned to all 1,166 facilities, yet each facility's values are in one kind of week or the other ([data-period-types.md §1](data-period-types.md#1-the-problem)).
- **Data covers less than the assignment.** The yearly population data set is assigned to every facility, but "Expected pregnancies" by Bo's facilities returns 106 rows for 125 facilities. The total is the same at every level (23,012 for 2025), so the missing 19 have no value, rather than one hidden elsewhere.

So, as for periods, metadata gives the possible, and only the data gives the actual. Both are needed.

## 3. One model: the collection profile

An item's **collection profile**: its data sets, each with a period type and the org units it's assigned to, plus its elements' aggregation type and aggregation levels. The period helpers read the period side, and the org unit helpers the place side.

- **The "by place" case is handled once.** Weekly in some districts and monthly in others is a property of the profile, which both checks read.
- **The period PR stays small.** It only needs to name its metadata result so that it can grow: the profile's period side first, with the org unit side added in this follow-up.

## 4. Four capabilities

1. **Where an item is collected**, from metadata: the levels its data sets are assigned at, and how much of a selected unit they cover ("12 of 16 districts"). Mixed when data sets differ.
2. **Whether a selection suits the item**: a unit, level or depth below where it's entered is empty; above it, partial coverage is short; restricted category options narrow it; no geometry means a map can't draw it.
3. **After an empty result, whether the org units are the cause**: the same request for the unit's parent. Values there and none at the unit mean the unit is too fine or not covered; none at the parent either means no data.
4. **Where values actually exist**: analytics by level under the unit, and counted against the assignment (106 of 125). Reporting rates (actual against expected reports) measure coverage directly when the data set tracks completeness.

## 5. API sketch

Named as the period helpers are, and exported beside them:

```js
getDataItemOrgUnitInfo(item, metadata)
// → {
//     levels: [4],            // where its data sets are assigned, deepest first
//     coverage: { assigned: 125, total: 125 }, // under the unit asked, from counts
//     aggregationLevels: [],  // from its data elements, when set
//     mixed: false,           // its data sets are assigned differently
//     unknown: false, reasons: [],
//   }

getOrgUnitCompatibility(info, orgUnits, options)
// orgUnits: ids, LEVEL-n, OU_GROUP-x, USER_ORGUNIT…, with the view's depth
// → { status: 'compatible' | 'finer' | 'partial' | 'noGeometry' | 'unknown', orgUnits: [...] }
```

- **Requests**: the data sets' assignment counts by level and path (§2), the elements' `aggregationLevels`, the category options' assignments and dates, and the units' `geometry` for maps.
- **Hooks**: `useDataItemOrgUnitInfo(items)` (capabilities 1 and 2); `useEmptyResultCheck` gains the cause `ORG_UNITS` (capability 3); `useDataCoverage({ dx, ou, pe })` (capability 4, on demand).

## 6. Test cases for the tool

A new case group per rule, on the tool's own org units (a region, with places at two levels and one shallow branch), from 2.40 to 2.44:

- data entered at district level only, queried at facility and district;
- a data set assigned to some places only, queried at the level above;
- a unit moved to another parent after data entry, then analytics rebuilt;
- a unit closed (`closedDate`) with data before and after;
- `aggregationLevels` set on an element, queried above and below them;
- a category option assigned to some places, and dated;
- uneven depth, with `LEVEL-n` and sub-x2-units;
- a unit with no geometry, on a map;
- a user whose data view scope leaves out part of the region.

The fixtures keep the format of the period groups; their `query.orgUnit` names the tool's units.

## 7. Order of work

1. The period PR ships first, unchanged in scope, with its metadata result named as the profile's period side (§3).
2. The test tool gains the org unit case groups (§6) once its period groups run on every version.
3. This proposal is revised from the findings, and shared with the maintainers.
4. A second PR adds the org unit side of the profile, its checks and hooks.

## 8. Open questions

- **Counts at scale**: assignment counts are cheap per data set and level, but an item behind several data sets under many units asked at once needs several requests. A server endpoint may be better.
- **Moved units**: whether analytics re-parents a moved unit's old values at the next full run, or keeps them under the old path (_to test_).
- **Aggregation levels**: whether a value is hidden above those levels, or below them (_to test_).
- **Scope**: whether the library should know the user's data view scope, or leave it to the app.

## Sources

- Dev server (2.44-SNAPSHOT), GET only: the schemas of `/api/dataSets`, `/api/dataElements`, `/api/categoryOptions` and `/api/organisationUnits` (`/api/openapi.json?path=…`); assignment counts with `pageSize=1`; `analytics` for "Expected pregnancies" (`h0xKKjijTdI`) by Bo (`O6uvpzGd5pu`) at levels 2 to 4.
- [data-period-types.md](data-period-types.md), for the model and the API this extends.
