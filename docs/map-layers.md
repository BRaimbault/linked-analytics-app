# Map layers: options to simplify the first version

- **Status**: proposal, under discussion; not part of the plan until one option is chosen.
- **Related**: [view-settings.md §5](view-settings.md#5-the-map-editor) (the map editor), [interactions.md](interactions.md) (links), [plugins.md](plugins.md#maps) (the Maps plugin's limits), [demo-mode.md](demo-mode.md).

Two options to limit how many layers a map view can have, or what they may differ in, so the map editor, links and demo mode stay simpler in the first version.

In both options, **saved maps that don't fit still open and render**. The plugin draws them, and links still apply to their thematic layers. They just aren't editable in the app: their settings tab shows the layers read-only, with "Edit in Maps".

## 1. What the dev server holds

93 saved maps, September 2026 (GET `/api/maps`, each multi-layer map then read by id). The app can edit 3 layer types: thematic, org unit (boundary) and facility. Earth Engine, event and external layers are edited in Maps ([view-settings.md §5](view-settings.md#5-the-map-editor)).

- **75 maps have one layer**: 53 thematic, 12 event, 5 facility, 3 org unit and 2 Earth Engine. So 61 are single-layer maps of a type the app can edit.
- **18 have 2 or 3 layers.** The most common are 2 thematic layers (7 maps) and thematic with boundaries (2); the rest mix facility, Earth Engine, event and external layers. 12 of them use only types the app can edit.
- **In all 18, the layers share one period.**
- **In 17 of the 18, the layers with org units share one area but not one level.** Every layer starts from the same root (Sierra Leone), and each shows its own level: districts in one layer, facilities in another. Only one map (SL fac and measles) uses a different root for one of its layers.
- Earth Engine layers use org units only to aggregate their values; external layers have none.

## 2. Option A: one layer per map

A map view holds exactly one editable layer: thematic first, then org unit or facility.

**What it simplifies**

- **The Maps plugin's worst bug is avoided.** The plugin crashes when a map gains a layer ([plugins.md](plugins.md#maps)); if the editor never changes the layer count, that never happens, even before the Maps PR.
- **Links have one target.** One thematic layer has one data item, org unit and period: `ou` in `rows`, `pe` in `filters`, `dx` in `columns`. There's no "which layer does this link change" question, for selectors, clicks or highlight.
- **The click payload is obvious**: the clicked feature's `ou`, and the layer's `dx`.
- **A much smaller editor**: one layer form (data, period, org units, style). No layer list, ordering, visibility toggles, or adding and removing layers.
- **The demo's fake map is one thematic layer** ([demo-mode.md §4](demo-mode.md#4-the-fake-plugins)).
- **Settings tab room**: one row of chips instead of a row per layer.

**What it costs**

- **61 of 93 saved maps (66%) are editable in the app**; every multi-layer map is read-only, including every "coverage by district with facilities" style map.
- **No boundaries over a thematic layer**, a common way to add context; a thematic layer's own outlines have to do.
- Adding layers later means the layer list comes back, together with the Maps remount workarounds.

## 3. Option B: several layers sharing one period and one org unit area

A map view can hold several layers, but they share:

- **one period** (a single `pe` for the whole map);
- **one org unit area**: the roots, i.e. the selected org units and the user org unit options.

Each layer keeps its own **level** (or group), which is how 17 of the 18 multi-layer maps already work: the same area, seen as districts in one layer and facilities in another. Each layer also keeps its own data item and style.

**What it simplifies**

- **Links stay map-wide.** A period link sets the map's one period. An org unit link sets the map's one area, and each layer keeps its level, so a click on Bo shows Bo's chiefdoms in one layer and Bo's facilities in the other. That fits the [drill rule](interactions.md#org-unit-ou): `ou` on an axis shows the children of the selection.
- **The editor has one period and one org unit picker for the whole map**, at map level; a layer only chooses its type, data item, level and style.
- **`applyLinks` rewrites every layer the same way**, with no per-layer wiring and no "this layer is linked, that one isn't".
- **Selectors and badges show one value per map**, not one per layer.
- **72 of 93 saved maps (77%) are editable**: the 61 single-layer ones, and 11 of the 12 multi-layer maps that use only editable types.

**What it costs**

- **The layer list stays**: adding, removing, ordering and hiding layers.
- **Adding or removing a layer still needs a remount** until the Maps PR, since the plugin crashes when a map gains a layer ([plugins.md §4](plugins.md#4-what-this-means-for-the-app)). A remount takes about a second and loses the zoom.
- **Maps that compare periods** (e.g. this year next to last year, as two layers) can't be built in the app. None of the dev server's maps do this.
- **The one map with a different root** stays read-only.
- **Two thematic layers mean two data items**: the click payload has to say which layer was clicked, and the data selector needs a rule for which layer's `dx` it replaces.

## 4. Comparison

|                                    | A: one layer             | B: shared period and area                 |
| ---------------------------------- | ------------------------ | ----------------------------------------- |
| Saved maps editable in the app     | 61 of 93 (66%)           | 72 of 93 (77%)                            |
| Layer list in the editor           | no                       | yes                                       |
| Remounts for a changed layer count | never                    | on add or remove                          |
| Period and org unit pickers        | one, in the layer        | one, at map level                         |
| What a `pe` or `ou` link rewrites  | the layer                | every layer, each keeping its level       |
| What a `dx` link rewrites          | the layer                | to decide (e.g. the first thematic layer) |
| Click payload                      | feature `ou`, layer `dx` | the same, plus which layer                |
| Fake map in demo mode              | one thematic layer       | thematic plus boundaries or facilities    |

In both options, the other 21 saved maps (Earth Engine, event and external layers, and the one map with a different root) stay read-only; that part only changes with editors for those layer types.

## 5. Recommendation

A, then B. A keeps the first map editor, links and demo mode small. B then adds the layer list, and remounts on add and remove, without changing any link rule: a period or area link means the same thing for one layer as for several.

## 6. Open questions

- Whether boundaries over a thematic layer are needed in the first version. If so, B, or A with a "show boundaries" option on the thematic layer.
- For B, which layer a `dx` link or the data selector changes when there are two thematic layers.
- Whether level is also shared, for a stricter B, which would fit only 1 of the 18 saved multi-layer maps.
