# Design docs

Design and research documents for the Linked Analytics app, for the team and for DHIS2 maintainers reviewing the upstream plugin changes, plus the repo's history. Setup and scripts are in the [project README](../README.md); code conventions and the plan are in [CLAUDE.md](../CLAUDE.md).

## Index

| Doc                                          | What it covers                                                                               | Status                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------- |
| [workspace-grid.md](workspace-grid.md)       | The grid: placing, sizing, drops, touch, iframes                                             | Decided, implemented               |
| [history.md](history.md)                     | How the repo got here: a timeline, and the report of each milestone (the tooling port first) | Record                             |
| [interactions.md](interactions.md)           | Channels, selectors, link mode, and the upstream plugin PRs                                  | Research, decided design, proposal |
| [plugins.md](plugins.md)                     | What the real DV, Maps, LL and EV plugins accept                                             | Research (September 2026)          |
| [view-settings.md](view-settings.md)         | Picking, creating and editing a view's item                                                  | Research, proposal                 |
| [selector-controls.md](selector-controls.md) | The controls a selector can show, and their sizes                                            | Research; no maximum size decided  |
| [map-layers.md](map-layers.md)               | Options to limit layers per map in the first version                                         | Proposal, under discussion         |
| [demo-mode.md](demo-mode.md)                 | Fake plugins on synthetic data                                                               | Proposal, decided where noted      |

**Single sources**: plugin behavior lives in [plugins.md](plugins.md), and the grid's rules in [workspace-grid.md](workspace-grid.md). Other docs link to them rather than repeat them.

## Terms

- **View**: an item in the grid: a plugin or a selector. **Cell** is used only for layout.
- **Plugin**: a map or visualization view, rendered by the DHIS2 app's plugin in an iframe. DV is Data Visualizer, LL Line Listing, EV Event Visualizer.
- **Selector**: a small view that shows and sets one value (a period, an org unit, a data item), e.g. a drop-down or a tree.
- **Selector bar**: the row of selectors across the top of the grid. **Selector column**: a stack of selectors along one side, proposed for tall controls.
- **Tools strip**: the edge group holding "Add views" (the palette) and one settings tab per view.
- **Channel**: one dimension (`ou`, `pe`, `dx` or a dynamic dimension) with one shared value, and the views linked to it.
- **Sender** / **receiver**: a view whose clicks set a channel's value / a view rewritten with it. A **member** is either or both.
- **Link mode**: a grid mode for rewiring channels.
- **`applyLinks`**: the pure function that rewrites a view's object with the values it receives.
- **DV PR** / **Maps PR**: the proposed upstream changes to the DV and Maps plugins ([interactions.md §6](interactions.md#6-upstream-prs)).
- **Plugin adapter**: our component that mounts a view's plugin with typed props (the re-typed `Plugin` from app-runtime). In demo mode it mounts a fake instead.
- **Capability profile**: which plugin behavior a fake copies: `released` (the real plugins' limits) or `proposed` (the upstream contract).
- **Remount**: giving a plugin a new `key`, so a new iframe; about a second, and state such as a map's zoom is lost.

## Conventions

- **Header**: every doc opens with two bullets, **Status** (research, proposal, decided, implemented, or record for the history; research carries its date) and **Related**, then one or two lines on what it covers.
- **Sections**: numbered `##`, unnumbered `###`. Decisions and open questions go in their own section near the end, then Sources.
- **Links**: `[file.md §N](file.md#anchor)`, never "section 6". Keep `##` titles short so anchors stay stable.
- **Time**: no "today", "now" or "for now". Anchor facts to a date and versions, or to a condition ("until the Maps PR"). [history.md](history.md) is the exception: its entries keep the wording of their date.
- **Style**: plain words, short sentences, bullets for facts. US spelling, as in the code (`color`). Digits for counts, `240×96px` for sizes, `0.8 s` and `300 ms` for times, backticks for code, paths and props.
