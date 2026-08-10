# Inventory Tab — Build Spec

Companion to `docs/character-sheet-tabs-build-spec.md` (Your Story / Ability
Scores / Class). Covers the Inventory tab, now Figma-complete.

**Figma:** file `P0tcVgf02XeI13Tz0TtRaX`
- Desktop: node `51:2260` ("D-Character Sheet / Inventory")
- Mobile: node `51:2265` ("M-Character Sheet / Inventory")
- Both pulled fresh via `get_design_context` + `get_variable_defs` on
  2026-08-09 — do not build from memory of the old currency-only version
  of this frame, it's been fully redesigned.

**Confirmed decisions (DM, 2026-08-09):**
1. Build out the full 10-slot equipped-gear system (not just re-skin the
   existing 4 slots).
2. "+Add Item" = new entry point for catalog search-and-add (replaces the
   old inline search-to-add). The Search+Category+Search-button row
   filters the player's **own** inventory table, not the catalog.
3. Description column = item flavor text always. Specs column = mechanical
   stats (AC/DMG/Properties/Mastery/etc). The sample data in the Figma
   mockup has these swapped for the Shortsword row — that's a mockup
   data-entry error, don't replicate it.

**Defaults I'm setting without further sign-off (flag if any are wrong,
otherwise proceed):**
- Filled equip slot shows the item's catalog thumbnail (`items.image`,
  same source as the inventory table thumbnail) plus its name under the
  slot, matching the empty state's icon+label layout. Click a filled slot
  to open the equip-search modal for that slot (change item); a small ×
  unequips. This directly extends the existing `renderEquippedSlot()`
  pattern rather than inventing new interaction.
- Mobile equipped-gear doll: the Figma mobile frame reuses the desktop
  frame's absolute pixel positions (slots up to `left: 971px`) inside a
  410px-wide frame — confirmed via screenshot, the doll renders empty/off-
  screen in the mockup itself. Building this literally would ship a
  broken mobile layout. Deviating: mobile renders the same 10 slot
  squares as a responsive wrapping grid (no silhouette positioning),
  same visual slot style as desktop. Flag to the DM as a Figma-side gap
  if a real mobile doll layout gets designed later.
- "Select" checkbox column: no bulk action is shown in the mockup.
  Building it as multi-select → a "Delete selected" bulk action (bar
  appears above the table when ≥1 row is checked), since that's the
  standard reason a table gets row checkboxes and it's the lowest-risk
  guess. Easy to repurpose later if the DM meant something else.
- Favorites (`is_favorite`) / drag-reorder (`sort_order`,
  `wireInventoryDragDrop`): no equivalent exists in the new table
  mockup. Dropping the star grouping and drag handles from this view —
  data columns stay in Supabase untouched, just unused by this UI. Not
  deleting the columns or the drag logic file-wide, only not rendering
  them here.
- Currency: three separate inputs (Gold/Silver/Copper), matching the
  mockup. There's still only one real column (`gold_cp`) — editing any
  of the three fields recomputes the full `gold_cp` from all three
  current values (gp×100 + sp×10 + cp), same pattern as the existing
  HP-max-modifier trick. Not adding new columns.

---

## 1. Equipped Gear — 10-slot data model

**New `items.equip_slot` values needed:** `head`, `neck`, `earrings`,
`arms`, `back`, `legs`, `feet` (7 new). Existing values (`armor`,
`offhand`, `weapon`) are untouched — **do not rename `armor` to
`chest`**; that risks breaking `computeAC()`, which reads
`EQUIPPED.armor` in multiple places. Instead, the doll's "Chest"
position visually maps to the existing `armor` slot key. Full mapping:

| Doll position | Internal slot key | Existing or new |
|---|---|---|
| Chest | `armor` | existing |
| Right Hand | `hand_right` | existing |
| Left Hand | `hand_left` **or** `shield` (mutually exclusive — see below) | existing |
| Head | `head` | **new** |
| Neck | `neck` | **new** |
| Earrings | `earrings` | **new** |
| Arms | `arms` | **new** |
| Back | `back` | **new** |
| Legs | `legs` | **new** |
| Feet | `feet` | **new** |

**Left Hand / Shield interaction:** currently `shield` is tracked as a
fully separate slot from `hand_left`, meaning a character could equip a
shield *and* an off-hand weapon simultaneously — not a real 5e rule.
Since the doll only has one "Left Hand" position, extend the existing
two-handed-weapon lock pattern (`autoUnequipOffHandForTwoHanded()`) so
equipping a shield auto-clears `hand_left` and vice versa. Both still
save to their own `SHEET.equipped` keys (`shield`, `hand_left`) — only
the UI enforces mutual exclusion at that one doll position, and
`computeAC()`'s existing shield-bonus logic is untouched.

**No migration needed for existing items** — none of the 3 characters'
current inventory uses the 7 new slot values, so there's nothing to
convert. The 7 new slots start empty for everyone and populate as the
DM adds items via DM Tools.

**DM Tools item-builder update required:** `dm.html`'s "ACCESSORY
FIELDS" → Equip Slot dropdown currently offers `none, neck, finger,
wrist, head, waist, feet` — `finger` and `waist` have no doll position
(no Ring or Waist slot exists) and `earrings`, `arms`, `back` are
missing. Replace the dropdown options with exactly: `none, head, neck,
earrings, arms, back, legs, feet` so the DM can never create an item
whose slot the sheet can't render. Check whether `entry.equip_slot` is
actually being written from this dropdown's value at save time (the
snippet reviewed only showed the dropdown UI, not the save handler) —
if the top-level `equipSlotMap` in the save function is overriding it
back to `null` for `category === 'accessory'`, fix that too.

## 2. Header (MainInfo)

The Figma instance in this frame is the same `51:1385` component
already built and fixed in the Your Story/Ability Scores/Class pass —
conditions pills, circular Inspiration badge, AC/HP/Temp-HP compact
row, Species/Appearance/Speaks 3-column row. **No changes expected
here.** One thing to verify, not rebuild: this Inventory frame's Temp
HP row shows a bar with a `/8` denominator, but the currently-shipped
header intentionally has no Temp HP bar (documented decision: no real
"max temp HP" concept exists in the data). Screenshot the current live
header next to this Figma frame — if they already match (i.e. the "/8"
in Figma is just mockup filler data, not a real design change), leave
it alone and note that in your report. If Figma has genuinely added a
bar here, stop and flag it back to the DM rather than guessing at what
"max" would even mean — don't build a Temp HP max field that isn't
backed by a real decision.

## 3. Currency

Three pill boxes (Gold `--currency-gold-coin` `#daa318`, Silver
`--currency-silver` `#babcc5`, Copper `--currency-copper` `#9c5b18`),
each with a white input box underneath. Relocate/restyle
`renderGold()`: derive gp/sp/cp for display same as now, but render
as three separate number inputs instead of the current single
"Set Gold" flow. On blur of any of the three, recompute
`gold_cp = gp*100 + sp*10 + cp` from the current values of all three
fields and save. Font: `--font-body` Black weight, `18px`
(`Page/Fonts/PM`), dark text `--blue-800` on the colored chips.

## 4. Carrying / weight bar

New pill-shaped bar (currently just `cs-inv-weight-total` plain text).
Capacity = `STR score × 15` (already documented in a `computeCarriedWeight()`
comment as the intended model, never got a UI) — confirmed against
Kael's real STR (13 → 195 lb), close to the mockup's placeholder "190
LBS", so the formula is right. Current = `computeCarriedWeight()`
(unchanged — equipped + carried items). Track background
`--blue-700`, fill `--blue-300`/`--blue-200` border, weight icon +
"`current` / `max LBS`" label centered on the bar, `999px` border-radius.

## 5. "+Add Item" → catalog search modal

Relocate the *existing* inline catalog-search logic
(`onInventorySearchInput`, `cs-inv-search-results` dropdown,
`openCustomItemModal()`) behind the new gold "+Add Item" pill button
(top-right of the Inventory header) instead of an always-visible inline
search bar. Clicking it opens a modal (reuse the existing equip-modal
CSS pattern already used for `openEquipModal()`) containing the same
category-filtered catalog search + "can't find it? add custom item"
flow, unchanged logic, just relocated behind a trigger button.

## 6. Search / Category filter (own inventory)

This is new: filters the `INVENTORY` array already rendered in the
table below (client-side, on the existing loaded inventory data — no
new Supabase query). Category dropdown options match the real
`items.category` values: Accessory, Armor, Consumable, Misc, Shield,
Tool, Weapon (alphabetical, matching Figma's "Select" dropdown
pattern). "Search" button applies the filter (click-to-search per DM's
confirmed answer, not live-as-you-type — different from the catalog
search in the Add Item modal, which can stay live-filter since that's
unchanged old behavior).

## 7. Item table

Replace `renderInvRow()`'s card-row layout with a real table:
`Select | thumbnail | Name | Category | Price (G,S,C) | Weight (lbs) |
Specs | Description`. Column widths/fonts per the Figma dump above.
Alternating row shading `--blue-600` (odd) / `--blue-500` (even) —
same `nth-child` pattern as the Class tab's Key Features table.
Header row `--blue-700` bg, white bold text, centered.

- **Thumbnail:** `catalogItem.image` if present, existing
  `TYPE_ICONS[type]` emoji fallback otherwise (unchanged).
- **Price (G,S,C):** format as `"{gp},{sp},{cp}"` — the column header
  itself specifies this format, matches existing `costGp/costSp/costCp`
  fields already computed in `renderInvRow()`.
- **Specs:** category-dependent one-line mechanical summary —
  Armor → `"AC " + base_ac`; Shield → `"AC +" + ac_bonus`; Weapon →
  `damage_dice + " (" + damage_type + ")"`; everything else → `—`.
  Reuses fields already read in `computeAC()`/`buildWeaponDamageHtml()`,
  no new columns needed.
- **Description:** `catalogItem.summary` / `item.custom_desc` — same
  field `renderInvRow()` already reads as `desc`, just always shown in
  full now instead of truncated/hidden.
- **Select checkbox → bulk delete:** see default above.

## Design tokens (verified via `get_variable_defs` on node `51:2260`)

| Figma variable | Value | Repo token |
|---|---|---|
| Brand/Gold | `#f0b429` | `--gold` |
| Currency/Gold | `#daa318` | `--currency-gold-coin` (not `--currency-gold`) |
| Currency/Silver | `#babcc5` | `--currency-silver` |
| Currency/Copper | `#9c5b18` | `--currency-copper` |
| Blue/50 – Blue/800 | `#dde1ec` → `#0a0a0f` | `--blue-50` … `--blue-800` (all exist) |
| Status/Red-Strong | `#d62b2b` | `--red-strong` |
| Text/Primary | `#e8e8f0` | `--text` |
| Radius/SM | `6px` | `--radius-sm` |
| Page/Spacing/2XS, XS, S, M | `8, 18, 26, 32` | `--char-ov-gap-2xs/xs/s/m` (all exist) |
| Page/Spacing/L | `42` (desktop) / `24` (mobile) | **no existing token** — use raw value, matching how one-off Figma sizes are already handled elsewhere in this file |
| Page/Fonts/H2, PL | `48, 24` | no existing token — use raw px, consistent with existing `.cs-sheet-title-text`/`.cs-tab-btn` pattern of literal px for Figma-matched one-offs |

Don't invent new CSS variable names for values that already have a
token above — search `css/tokens.css` yourself before adding anything
new, and only add a new token if genuinely nothing close exists.

## Verification checklist (same standard as the last three tabs)

1. Re-pull `get_design_context` on `51:2260` and `51:2265` yourself
   before writing any code — don't build from this doc's prose alone.
2. Confirm JS syntax parses (repo's existing pre-push check).
3. Screenshot Kael's Inventory tab (has real equipped armor + longbow,
   real gold) before/after, both desktop and the new mobile grid
   fallback.
4. Confirm the two other characters (empty `equipped: {}`) render the
   empty-slot state correctly across all 10 slots.
5. Report back before moving on to any other tab — this is a big pass
   (new slot data model + DM Tools dropdown change + full table
   rebuild), don't bundle it silently with anything else.
