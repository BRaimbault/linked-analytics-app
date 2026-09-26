# Selector controls and their sizes

- **Status**: research, September 2026. Decided: selectors have no maximum size.
- **Related**: [interactions.md §5.5](interactions.md#55-selectors-live-in-grid-cells) (what selectors do), [workspace-grid.md](workspace-grid.md#2-view-kinds-and-limits) (the grid's size rules), [view-settings.md](view-settings.md#selectors) (their settings).

The controls a selector can show, how much room each needs, and what that means for a selector's size in the grid. It's about **presentation only**; how a selector is configured, and which channel it drives, is in [interactions.md](interactions.md#55-selectors-live-in-grid-cells).

Every selector type has a minimum of 240×96px and a preferred size of 320×120px (`view-types.ts`), chosen for a one-line summary. **There is no maximum**: a selector can be as big as the user makes it, like any view. So each control must fill, wrap, scroll or collapse to fit its cell.

## 1. The controls

| Control                               | Dimensions                          | DHIS2 UI                                                     | Notes                                                          |
| ------------------------------------- | ----------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| Drop-down                             | `pe`, `ou`, `dx`, dynamic           | `SingleSelect`                                               | input 40px (32px dense)                                        |
| Drop-down with checkboxes             | `pe`, `ou`, `dx`, dynamic           | `MultiSelect` (its options have checkboxes)                  | the input grows a line when its chips wrap                     |
| Radio group, wrapping into columns    | `pe`, `ou`, `dx`, dynamic           | `Radio`                                                      | rows about 24px                                                |
| Checkbox group, wrapping into columns | `pe`, `ou`, `dx`, dynamic           | `Checkbox`                                                   | rows about 24px                                                |
| Slider (single, range, with play)     | `pe`                                | **none**: to build ([§2](#2-the-slider))                     | —                                                              |
| Tree                                  | `pe` (year › quarter › month), `ou` | `OrganisationUnitTree` for `ou`; the generic `Node` for `pe` | rows 24px; the org unit tree asks for at least 200px of height |
| Period type switch                    | `pe`, when not a tree               | `SegmentedControl`                                           | 2 to 5 segments, at least 72px each                            |
| Org unit level switch                 | `ou`, when not a tree               | `SegmentedControl`                                           | same                                                           |

The switches sit above the main control; they're never shown alone.

**How other tools choose between them** (option counts, [NN/g](https://www.nngroup.com/articles/listbox-dropdown/), [CMS design system](https://design.cms.gov/components/dropdown)):

- 5 options or fewer: a radio or checkbox group.
- About 5 to 15: a drop-down when space is tight, a list otherwise.
- More than 15: a drop-down with search, or a tree.
- Segmented controls: 2 to 5 segments ([Material 3](https://m3.material.io/components/segmented-buttons/guidelines)), which fits period types and org unit levels.

These make good **defaults** when a selector is added; the author can still pick another control in its settings.

## 2. The slider

- `@dhis2/ui` has none. A native `<input type="range">` gives the keyboard and screen reader support for a single value; a range needs two thumbs, with `aria-valuetext` set to the period names.
- Sliders suit approximate values, and are hard on touch ([NN/g](https://www.nngroup.com/articles/gui-slider-controls/)). Power BI and Tableau pair their date sliders with inputs or a calendar. Ours has the play mode's ◀ ▶ step buttons, and should show the selected period as text.
- Periods come from `@dhis2/multi-calendar-dates`, as in `PeriodDimension`, so non-Gregorian calendars work.

## 3. How the controls take space

Measured from `@dhis2/ui` and estimated for a cell with the 35px tab header and 8px padding (about 51px of chrome):

| Control                   | Height                                  | Width                                                  | Example                                                          |
| ------------------------- | --------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Drop-down                 | **fixed**: about 91px                   | at least about 200px; more adds nothing                | —                                                                |
| Drop-down with checkboxes | fixed, plus a line when chips wrap      | as above                                               | —                                                                |
| Switch + drop-down        | fixed: about 135px                      | the switch needs its segments: about 220–300px for 3–4 | —                                                                |
| Slider with play          | **fixed**: about 115px                  | at least 320px; wider gives finer steps                | 24 months at 640px: 26px a step                                  |
| Radio or checkbox group   | **grows with options divided by width** | any; more width, fewer rows                            | 12 months: 6 rows (195px) at 320px wide, 3 rows (123px) at 640px |
| Tree                      | **grows as nodes open**, then scrolls   | at least about 240px                                   | 10 open rows: about 290px                                        |

So there are three families:

1. **Fixed height** (drop-downs, slider, switch): the height is known; only the width is free.
2. **Height from width** (wrapping groups): the height follows the number of options and the width. With less height than that, they scroll like trees.
3. **Scrolling** (trees): no natural size; they need height, and scroll within it.

## 4. What other tools do

- **No tool caps a filter's size.** Power BI says responsive slicers can be "as small or as large as you want" ([Power BI](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-slicer-filter-responsive)). Tableau's size range applies to the whole dashboard ([Tableau](https://help.tableau.com/current/pro/desktop/en-us/dashboards_organize_floatingandtiled.htm)). Kibana's pinned controls come in small, medium and large widths, but expand to fit by default ([Kibana](https://www.elastic.co/docs/explore-analyze/visualize/dashboard-control-settings)).
- **Compact controls have a fixed height** and grow only in width: Power BI's dropdown slicer ([slicers](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-slicer-visual)), Tableau's dropdown modes ([filters](https://help.tableau.com/current/pro/desktop/en-us/filtering.htm)), Looker Studio's drop-down list ([controls](https://docs.cloud.google.com/looker/docs/studio/drop-down-list-and-fixed-size-list-control)), Grafana's variables ([Grafana](https://grafana.com/docs/grafana/latest/dashboards/variables/add-template-variables/)), Metabase's filter buttons ([Metabase](https://www.metabase.com/docs/latest/dashboards/filters)), and Kibana's one-line controls.
- **Expanded controls fill their box, then wrap or scroll**: Power BI's list, tile and button slicers (vertical, horizontal or grid, scrolling when too small, [button slicer](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-button-slicer)), Tableau's list modes, and Looker Studio's fixed-size list.
- **Responsive collapse**: Power BI's responsive slicers rearrange their values as the box changes, and collapse to a filter icon when too small ([responsive](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-slicer-filter-responsive)). Superset's horizontal filter bar moves what doesn't fit into "More filters" ([PR 22169](https://github.com/apache/superset/pull/22169)).

## 5. Fitting the cell

**A minimum, with a compact form for every control.** Each expanded control collapses to a compact form when its cell is below the expanded control's minimum:

- a radio group becomes a drop-down, and a checkbox group a drop-down with checkboxes, but only when even scrolling doesn't work (below);
- a tree becomes a drop-down that opens the tree in a popover;
- a slider becomes a drop-down of its periods, keeping the play buttons;
- a switch folds into a small menu next to the drop-down.

So the hard minimum of every selector is the compact form's size: 240×96px, the same as the placeholder selectors'.

**Radio and checkbox groups have three states**, from the most room to the least:

1. **All options shown**, wrapped into as many columns as the width allows.
2. **Scrolling**: when the cell is shorter than the options need, the group keeps its columns and scrolls vertically. A fade at the bottom edge shows there's more. It's never scrolled horizontally.
3. **Collapsed to a drop-down**, only when fewer than about 3 rows fit. A group scrolled to one or two rows is worse than a drop-down.

So the step to a drop-down happens late, and the options stay visible in most cells. Arrow keys still move through a radio group and scroll the checked option into view, so the keyboard is unaffected.

**No maximum** (decided). A maximum on one axis per control was considered, but a cap stops users from giving a selector more room, and makes selectors fit less naturally among plugins. So each control uses the room it gets:

- **fixed-height controls** (drop-downs, slider, switch) sit at the top of a taller cell, and the slider uses extra width for finer steps;
- **wrapping groups** use the width for more columns, show every option when there's room, and scroll when there isn't;
- **trees** use all the height they get, and scroll.

## 6. Where selectors go

- **The selector bar** across the top suits fixed-height controls: drop-downs, sliders and switches share one row, as in every tool above. `@dhis2/ui`'s `SelectorBar` (the compact filter bar of the Capture and Data Entry apps) may suit it.
- **Tall controls** (trees, long groups) don't belong in a bar: a tree in a 120px row shows two nodes. A clicked selector with a tall control should start or join a **selector column** instead: a stack of selectors along one side of the grid, the vertical counterpart of the bar, where it gets height.
- Dragged, any selector still goes anywhere; the collapse keeps it usable in any cell.

## 7. What this means for the code

The grid already handles this ([workspace-grid.md](workspace-grid.md)); what changes when the real controls are built is where a selector's minimum and preferred sizes come from.

- **Sizes per control, not per view type.** `withViewSizes` looks sizes up by view, so the lookup can read the view's control (from its settings in the store) instead of its type. The `*-selector` types keep one default control each.
- **Placement**: `getSelectorPlacement` checks the control's family: fixed height goes to the bar, tall controls to a selector column.
- **Preferred sizes**, used when a selector is placed, follow the controls: the natural height of fixed controls, the content height at the preferred width for groups, and about 300px for trees.

## 8. Open questions

- Whether the selector column is a real layout rule, like the bar, or just the default for a clicked tall selector.
- The exact widths at which each expanded control collapses, to settle when the controls are built.
- Whether the period tree is worth building, next to the slider and the switch.
