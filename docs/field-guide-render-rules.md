# Field Guide Renderer — Structural Reference

*What the Field Guide document renderer (`dm.html`, Live Session → Field Guide) actually understands, structurally, when it reads a `field_guide_sessions.blocks` array. Written for a content-author working directly in Supabase (or Claude Chat writing on their behalf), not a Code session — but every claim below is cited to a function name + line number in `dm.html` so a future Code session can re-verify or update it, rather than trusting this doc blindly as it ages.*

**Basis:** `dm.html` on `main` @ `5ffb6ba` (2026-09-12, includes the `anavale-wiki-jump-rail-fix` merge). Line numbers will drift as the file changes — if something here looks wrong, grep for the cited function name first; don't assume the doc is right just because it's newer than your memory.

---

## How to use this document

1. **§1–2** are the vocabulary: every block `type` and every box `category` the renderer recognizes, and exactly what each looks like.
2. **§3** is the important one — things the UI infers from the *shape* of the document (position, nesting, counts, "nearest preceding X") rather than from any one block's own content. This is where a block that looks completely fine in isolation can still break a feature.
3. **§4** is `scenario_cards` in full — the one genuinely nested, non-trivial block shape.
4. **§5** is a flat gotcha checklist — read this before writing new content, even if you skip everything else.
5. **§6** is where "state" (completion, logged decisions, beat progress) actually lives — spoiler: never in `blocks`.

---

## 1. Every block `type`

Dispatched by a single `switch (b.type)` in `sccFgRenderBlock(b, idx, ctx)` (line 17922).

| `type` | Renders |
|---|---|
| `title`, `subtitle`, `tagline`, `meta` | **Nothing.** `''`. Data is preserved in the row but never displayed — these were the old static document header, since replaced by fixed panel markup. |
| `h1` | Section heading. Plain, or a clickable quest badge + live beat-count subtitle if `b.quest_id` resolves. Also flips "quest section" gold-banding on/off — see §3.2. |
| `h2` | Sub-heading. Either literal `b.text`, or an auto-numbered "Beat N — Title (suffix)" if `b.sequence` is set. Can carry `b.featured` portraits. See §3.3. |
| `italic` | `<p class="scc-fg-doc-italic">` + linkified `b.html`. |
| `p` | Plain `<p>` + linkified `b.html` — **unless** `b.category === 'staging'`, in which case it renders as a 📍-prefixed staging cue instead (`sccFgRenderStagingCue`, line 17173). `staging` is the one category that applies to `p` blocks, not `box` blocks. |
| `list` | `<{b.tag||'ul'}>` + `b.html` + closing tag. **You must author the `<li>` markup yourself inside `b.html`** — the renderer does not build list items from an array. |
| `table` | `sccFgRenderTableBlock(b)` (line 17138) — see below. |
| `footer` | Rendered — but always moved to the physical end of the document regardless of where it sits in the array. See §3.4. |
| `box` | The full category system — see §2. |
| anything else, or a typo | **Renders nothing, no warning.** `default: return '';` (line 18060). |

There is no `h3`, `image`, `hr`, `quote`, or `columns` type. If you need something that looks like a divider or an image standalone, use a `box` with an appropriate category, or a `featured` array on an `h2`/`box`/`spoken_dialogue` block.

**Table blocks** (`sccFgRenderTableBlock`, line 17138): `{ type:'table', variant?, headerRow?: string[], rows: string[][] }`. `headerRow` is optional (omit it and you get no `<thead>`). Every cell — header and body — is run through the same `[[type:id|Label]]` linkifier as everything else, so inline links work inside tables.

**h1 detail:**
- Plain: `<div class="scc-fg-doc-h1">` + escaped `b.text`.
- `b.quest_id` set and it resolves in `QUESTS` → a clickable "🔔 Quest" badge + title + a **live-computed** "Quest · N Beats" subtitle (reads `q.beats.length` fresh every render — never stored text, so it can't go stale).
- `b.quest_id` set but it does **not** resolve → silently degrades to the plain h1. No error, no badge.
- A quest-tied h1 turns on "quest section" gold-banding for every block that follows, until the next h1 (§3.2).

**h2 detail — `sequence` and plain text are mutually exclusive in practice:**
- If `b.sequence` (`'step'` or `'beat'`) is set, the displayed text is fully computed: count every earlier `h2` block in the document sharing the same `sequence` value, then render `"{Ucfirst(sequence)} {n} — {b.title}{b.suffix ? ' ('+b.suffix+')' : ''}"`. **`b.text` is ignored entirely when `sequence` is set** — you must use `b.title`/`b.suffix` instead.
- If `b.sequence` is absent, the heading text is `b.text` — falling back to `b.title` only if `b.text` is `null`/absent (added 2026-09-12 after 7 real h2 blocks across Sessions 1–2 turned out to store their heading under `b.title` with no `b.text` at all, rendering blank both in the rail and in the live document body). `b.text` always wins when both are present; don't rely on the fallback for new content — author `b.text` directly for a non-sequence heading, and reserve `b.title`/`b.suffix` for `sequence` headings.
- `b.featured` (an array of `{type,id}`) adds portrait(s) above the heading — see §3.3. No category/chip system applies to h2 at all.

---

## 2. Every box category

A `box` block dispatches on `b.category`, **in this fixed order** (`sccFgRenderBlock`'s `case 'box'`, lines 17961–17972) — first match wins, so a block can never accidentally hit two of these:

```
guide_meta                        → renders nothing at all
spoken_dialogue                   → dedicated renderer
comedy, with b.inline === true    → dedicated inline renderer (not a box)
quest_beats                       → dedicated live widget
combat_outcomes                   → dedicated branching-outcome widget
scenario_cards                    → dedicated nested-card module (§4)
everything else                   → the generic category-box path
```

**The single source of truth for a category's color/badge is `js/fg-category-schema.json`.** `dm.html` fetches it once at boot into `SCC_FG_CATEGORY_STYLE` and never hardcodes a second copy — if this file and the actual rendered colors ever disagree, this JSON is right and the CSS/JS is the bug. **If the fetch fails for any reason** (missing file, bad JSON), `SCC_FG_CATEGORY_STYLE` stays `{}` and *every* box silently falls back to plain grey with no badge and no corner icon — it logs a `console.error` but the page looks fine at a glance, so this failure mode is easy to miss if you're not checking the console.

### Generic box path — exact assembly order

```
<div class="scc-fg-box scc-fg-box--{colorClass} scc-fg-text--{category}[ scc-fg-box--completed]">
  corner icon        (top-right, small — sccFgBoxCornerIconHtml)
  featured portraits (floats left, if b.featured is a non-empty array)
  category badge     (top-left chip: icon + name, only if the category has one)
  Mark Completed     (top-right toggle, hidden entirely in history/audit view)
  label header       (b.label, with a loot-subtype icon prefixed if colorClass is gold)
  body (b.html, linkified)
  combat button      (if b.combat_encounter_id is set — "⚔ Roll Initiative")
  nested table        (if b.table is set)
  quick-attach panel (if b.quick_attach is set)
</div>
```

- `colorClass`: schema's `colorClass` for the category → else the legacy `b.color` field mapped through a small fixed table (`grey/green/magenta/gold/yellow` only) → else `grey`.
- The **body text size/color/weight** (`scc-fg-text--{category}`, e.g. `scc-fg-text--read-aloud`) is driven **directly by `b.category`**, independent of `colorClass` — this is the only thing that visually separates same-color categories from each other (see the magenta note below).
- A **misspelled or unrecognized category** silently falls back to a bare grey box: no badge, no corner icon, and `scc-fg-text--{typo}` matches no real CSS rule, so body text falls back to plain default styling. No error anywhere. **Category strings are exact, lowercase, snake_case, and must match a key in `js/fg-category-schema.json`.**

### Per-category rendering

| Category | Color | Badge chip | Corner icon | Mark Completed | Notes |
|---|---|---|---|---|---|
| `read_aloud` | green | 📖 Read Aloud | 📖 | yes | Body text italic, 18px. |
| `spoken_dialogue` | blue | 💬 Spoken Dialogue | 💬 | yes | **Dedicated renderer**, not the generic path — see below. |
| `dm_only` | magenta | ⚠ DM Only | ⚠ | yes | |
| `background` | magenta | 📜 Background | ⚠ (borrowed) | yes | |
| `why_this_works` | magenta | 💡 Why This Works | ⚠ (borrowed) | yes | |
| `if_they_ask` | magenta | ❓ If They Ask | ⚠ (borrowed) | yes | |
| `dont_blow_this` | red | ⛔ Don't Blow This | ⛔ | yes | Body text bold (600 weight), the only category with that. |
| `comedy` (full box) | yellow | 🃏 Comedy | 🃏 (larger, 1.75rem) | yes | |
| `comedy` (`inline:true`) | — | — | — | **no** | Not a box at all — see below. |
| `loot_shop` | gold | *none* | subtype icon or 🪙 | yes | Label itself gets the subtype icon prefixed (drink/food/general/weapons/armor/magic). |
| `guide_meta` | — | — | — | — | **Never rendered, full stop** ("How to Use This Guide," data kept but display-suppressed). |
| `player_decision` | gold | 🔀 Player Decision | 🔀 | yes | As a *generic* box (i.e. authored directly rather than via `combat_outcomes`/`scenario_cards`) it also gets the gold coin-icon label prefix, same as `loot_shop`, since it shares `colorClass: gold`. |
| `gigglegloom_effect` | teal | 🌈 Gigglegloom Effect | 🌈 | yes | Badge label and body text render with a gradient-clip treatment. |
| `staging` | — | — | — | — | Only valid on **`type: 'p'`** blocks, not `box` — inline 📍-prefixed cue, no box shell at all. |
| unrecognized / typo | grey (fallback) | none | none | yes | See "misspelled category" above. |

**⚠ The four magenta categories (`dm_only`, `background`, `why_this_works`, `if_they_ask`) are nearly visually identical.** Same background, same border, same body-text color, and — deliberately — the **same ⚠ corner icon** (the corner icon is hardcoded to always show `dm_only`'s icon for the entire magenta family, regardless of which of the four it actually is; this is intentional, not a bug — the corner icon's job is "handle with care, don't read aloud" as a family-wide flag, and per-subcategory identity is the chip's job alone). **The only thing that tells them apart is the top-left badge chip.** If a box's category is one of these four and its badge is somehow suppressed or miscategorized, there is no other visual cue distinguishing it from the others.

### `spoken_dialogue` — dedicated renderer (`sccFgRenderSpokenDialogue`, line 17257)

Shape: `{ type:'box', category:'spoken_dialogue', speaker: {type, id}, tone_note?, label?, featured?, html }`.

- `speaker.type` defaults to `'character'` if omitted.
- If `speaker` resolves to a real entity: shows a small portrait, the entity's name, and pronouns (if set), all clickable through to the lookup drawer. Also unlocks a **"👁 Visualize" toggle** that expands the entity's NPC Visualization fields — `world_characters.vis_physical_appearance / vis_clothes / vis_demeanor / vis_voice_mannerisms / vis_distinguishing_features / vis_weapons / vis_age / vis_species / vis_height / vis_summary` — but **only if the entity actually has at least one of those fields populated**; otherwise the toggle doesn't appear at all. These are NPC-record fields on `world_characters`, not anything stored on the block itself — populate them on the NPC's own record, not in the Field Guide content.
- If `speaker` does **not** resolve (bad id, deleted NPC, wrong `type`, or the entity list just hasn't loaded yet): the box still renders — still blue, still 18px, still shows its label/badge/body — it just has no portrait/name/Visualize toggle. Fails quietly, not visibly broken.
- `tone_note` (a plain string field, separate from `html`) renders as its own "🎭 Tone: …" line. **This field only does anything on `spoken_dialogue` blocks** — setting `tone_note` on any other category is a no-op, silently ignored by the renderer. If a box needs a tone line and isn't `spoken_dialogue`, you have to hand-write it into `html` (and if you do, use the `<p class="scc-fg-stage-direction">` treatment from §5, not bare text, since a tone note is DM guidance, not narration).
- Label and speaker headers are fully independent — a box can show both, either, or neither, they don't suppress each other.

### `comedy` inline mode (`sccFgRenderComedyInline`, line 17148)

Only reachable when `category: 'comedy'` **and** `inline: true` are both set on the block. Renders as a plain paragraph — `★` icon, optional bold label, then the html — with **no box shell, no chip, no corner icon, no Mark Completed toggle at all**. It reads as part of the surrounding narration rather than a set-apart callout. Note it does **not** strip a pre-existing `<p>` wrapper from `b.html` the way the `staging` cue does (§1) — if your `html` already contains its own `<p>…</p>`, it will visually break out of the inline paragraph.

### `quest_beats` (`sccFgRenderQuestBeatsBlock`, line 17365)

**This block carries no real data of its own beyond an optional intro line.** It ignores `b.color`/`b.label`/category styling entirely, renders `b.html` (if present) as plain intro text, then renders **one live widget per quest currently assigned to the session** (`SCC_SELECTED.quest` — the same source the Setup tab's own quest assignment reads), regardless of what's actually on the block. Every beat's status/order/XP is pulled live from the `quests` table and `quest_progress`, not from anything stored here.

- If no quests are assigned to the session: renders "No quests assigned to this session yet — assign one in Setup."
- **Multiple `quest_beats` blocks in one document all render the identical set of quests.** There's no way to scope one `quest_beats` block to a specific quest — if you want beat status to appear at two different points in the document, both blocks show the same full quest list.

### `combat_outcomes` (`sccFgRenderCombatOutcomesBlock` → `sccFgOneCombatOutcomesHtml`, line 17451)

Shape: `{ type:'box', category:'combat_outcomes', label, html?, outcomes: [{ label, description?, blocks? }] }`.

- `label` is the widget's identity — it's used to build the DOM id (`slug(label)`) and as part of the logged-decision title, so **give every `combat_outcomes` block on a page a distinct `label`** (two sharing a label collide — see §5).
- `html` (optional) renders as an intro line above the outcome rows.
- Each entry in `outcomes[]` is a clickable row. Its content is either `blocks` (a full nested block array, rendered through the real `sccFgRenderDoc` — so an outcome can contain its own Read Aloud/DM Only boxes, not just plain text) or, as a simpler fallback, a plain `description` string. Whichever is present, `description` is also what gets written into the session log entry's own summary — so even when you use rich `blocks`, still fill in a short plain-text `description` too, or the logged entry (visible in the Notes tab) will have an empty summary.
- Clicking a row logs it (or un-logs it — a second click removes the log entry, real undo) — see §6 for where that state actually lives.
- Uses the same shared "Player Decision" 🔀 header chip as `scenario_cards`' decision rows (`sccFgPlayerDecisionHeaderHtml`) — visually, a combat-outcomes widget's header reads as a Player Decision box even though its category name is different.

---

## 3. Structural assumptions based on document shape

This is the section that matters most for avoiding "looks fine in Supabase, renders wrong (or breaks a feature) live." Everything here depends on *where* a block sits, *what wraps it*, or *how many* of something exist — not on the block's own content in isolation.

### 3.1 The jump rail (right-edge scroll indicator)

There is no dropdown table-of-contents anymore (it was removed). The only navigation aid is the fixed right-edge dot rail. **It does not read `blocks` directly — it walks the already-rendered DOM**, over the direct children of the document container, via `sccFgCollectScrollEntries()` (line 18279).

**Current behavior (fixed 2026-09-12 — see git history for the earlier, more limited version if you're reconciling this against an old memory of the rail):**
1. Every `h1` becomes a rail entry (including the opening section's "Session Recap" h1, and the synthetic "Other Scenarios" h1).
2. An `h2` becomes a rail entry in any of three shapes: a **plain** top-level `h2` (the child itself carries `.scc-fg-doc-h2`, not quest-tied at all), an `h2` wrapped in `.scc-fg-h2-featured-wrap` (has a `featured` portrait, still not quest-tied), or an `h2` wrapped in `.scc-fg-quest-section-block` (falls after a quest-tied `h1`, before the next `h1` — see §3.2). Before this fix, only the third case counted, which meant most sessions' real scenario headings (the ones not nested under a quest beat) never showed up in the rail at all — confirmed live at the time as "2 dots instead of a real 6–7" for one real session.
3. Boxes, tables, footers, and scenario-card content are never rail entries **directly** — but see the caveat below, they can still leak in.

**A real, still-present caveat, not fully closed by the fix above:** for the two wrapper-based cases (`.scc-fg-quest-section-block` / `.scc-fg-h2-featured-wrap`), the lookup is `child.querySelector('.scc-fg-doc-h2')` — a full descendant search, not a direct-child check. `.scc-fg-h2-featured-wrap` only ever contains its own single h2, so that case is safe. But `.scc-fg-quest-section-block` can wrap a top-level `scenario_cards` (or `combat_outcomes`) block instead of a plain heading, and that block's own nested/active card content is rendered inside the same wrapper via a recursive `sccFgRenderDoc()` call. **If that nested content contains its own `h2`, the querySelector will find it and add a phantom rail entry for something that isn't a real top-level section heading.** This is a narrow, quest-section-specific case — avoid authoring an `h2` inside `scenario_cards`/`combat_outcomes` nested content if you don't want it showing up in the rail.

**Author-facing takeaway:** if you want something to show up in the jump rail, make it a real `h1` or `h2` — that's now sufficient on its own, you don't need to nest it under a quest beat the way you used to. Rail labels are auto-derived from the heading's own text (split at the first em-dash, else first parenthesis, else first 3 words, then hard-truncated to 20 characters) — the full text survives as a hover tooltip, so don't worry about writing a "short version," just write a real heading and expect it to get truncated in the rail itself.

### 3.2 Quest-section gold banding

`sccFgRenderDoc(blocks, ctx)` (line 18109) tracks one boolean, `inQuestSection`, as it walks the array in order:

- **Turns on** the moment it renders an `h1` whose `quest_id` is set (regardless of whether that id resolves to a real quest).
- **Turns off** only at the *next* `h1` that has no `quest_id`. Nothing else turns it off — not an `h2`, not a box, not a footer, not a table.
- While on, **every single block** (including the triggering h1 itself) gets individually wrapped in its own `.scc-fg-quest-section-block` div (a gold left-border), one wrapper per block, not one wrapper around the whole run.
- This state is **local to each `sccFgRenderDoc` call** — it does not carry across into nested calls. A `scenario_cards` card's own content, or a `combat_outcomes` outcome's own content, always starts with `inQuestSection = false`, even if the module itself sits inside a quest section. So an `h1` authored inside card/outcome content will never gold-band, and (per §3.1) an `h2` inside such nested content also won't get a rail entry via the quest-section path.
- **This wrapper is also one of the three shapes the jump rail's h2 detection looks for** — there's no separate "am I in a quest section" tracking for the rail; it just checks for the same wrapper class in the DOM alongside its other two cases (§3.1).

**Practical rule:** if you want a run of content — narration, DM notes, comedy, whatever — visually associated with "this is part of quest X," put it after a quest-tied `h1` and before the next `h1`. If you *don't* want gold banding (e.g. this h1 starts a non-quest interlude), make sure the h1 genuinely has no `quest_id`, not just an empty string that happens to be falsy — either way works, but be deliberate about it.

### 3.3 Featured thumbnails

Triggered by a non-empty `b.featured` array of `{type, id}` entries. Only three block shapes read it: **`box`** blocks (any category, generic path), **`h2`** blocks, and **`spoken_dialogue`**. Not `h1`, `p`, `table`, `footer`, `list`, or the other special-cased categories (`quest_beats`/`combat_outcomes`/`scenario_cards` don't read `b.featured` on the block itself — though `scenario_cards` cards have their own separate `entity` field for a portrait, see §4).

- Valid `type` values: the 7 real entity types (`character`, `creature`, `city`, `item`, `quest`, `organization`, `concept`) plus `pc` (player character — resolves against the players roster, not any of those tables), plus the aliases `npc`→`character`, `poi`/`nation`→`city`.
- **An entry that doesn't resolve — bad type, bad id, entity has no name — is silently dropped, no placeholder, no error.** This has actually happened at scale before (roughly half of one real batch of 31 featured entries silently failed because the type strings used didn't match what the resolver recognized at the time).
- **Layout is driven by the authored array length, not by how many entries actually resolved.** Three or more entries switches to a full-width row layout even if two of the three fail to resolve and only one image actually shows.
- Faces (a `character`/`pc`, or a `creature` whose `tier` is exactly `"humanoid"`) get a zoomed circular crop; everything else (items, locations, non-humanoid creatures) renders unwrapped/uncropped. A humanoid NPC mistakenly entered as a `creature` type without `tier: "humanoid"` set will render uncropped.
- Click-to-fullscreen only works on a real resolved image, never on the letter-avatar fallback.

### 3.4 Footer hoisting and the index-drift trap

When the document is drawn, the blocks array is split into `footerBlocks` (every `type: 'footer'` block) and `mainBlocks` (everything else), and rendered as **two separate `sccFgRenderDoc` calls**, with a synthesized "Other Scenarios" section injected between them:

```
mainBlocks (via sccFgRenderDoc)  →  "Other Scenarios" section  →  footerBlocks (via sccFgRenderDoc)
```

**Consequences:**
- **A `footer` block always ends up at the physical end of the rendered document, no matter where you place it in the stored array.** You can author it anywhere; visually it always lands last.
- Because it's rendered via a fresh `sccFgRenderDoc` call, `inQuestSection` resets — a footer block can never be gold-banded, even if it's stored immediately after a quest-tied h1.
- **Real index-drift risk:** a couple of renderer features (auto-numbering of `sequence` h2s, and locating an unlabeled `scenario_cards` block by array position) index against the *original, unfiltered* stored array, while the actual render pass indexes against the *filtered* `mainBlocks` array. These only agree if you keep every `footer` block positioned **after** all your `h2 sequence` and unlabeled `scenario_cards` blocks in storage — i.e., **author your footers last in the array**, not just expect them to render last. If a footer sits earlier in storage than a sequence-numbered heading, the numbering can silently drift.

### 3.5 Auto-numbering by position

An `h2` with `b.sequence` set (`'step'` or `'beat'`) has its displayed number computed by counting every earlier `h2` sharing that same `sequence` value, purely by array position. This means **inserting a new `beat` h2 anywhere in the middle renumbers every beat after it.** There's no stored "beat number" field to accidentally get out of sync — the number is always freshly computed — but it does mean any hardcoded reference to "Beat 3" elsewhere in your content (a footer note, a cross-reference in another session's document) can go stale the moment you insert a new beat before it.

### 3.6 "Homed" scenario groups can silently delete a live section

`sccFgHomedScenarioGroupNames()` (line 18147) scans the document for `h2` blocks where **`b.text` (not `b.title`) is set and `b.featured` is a non-empty array**, and treats each matching text as a "homed" scenario-group name. If **every** live `session_scenarios` group name matches a homed heading, the entire "Other Scenarios" section (heading, filter, Add button) is suppressed — which also removes its jump-rail entry.

**This means: if you give a plain (non-sequence) `h2` a `text` value that exactly matches (case-sensitive) the name of a scenario group in `session_scenarios`, and also give that h2 a `featured` array, you will silently remove that scenario group's live card from the "Other Scenarios" section** — the assumption being you've already manually built a proper section for it elsewhere in the document. If that's not your intent, either don't add `featured` to that heading, or make sure its text doesn't collide with a real scenario-group name.

### 3.7 Inline-link thumbnails only appear once per document draw

`SCC_FG_LINK_SEEN` is reset once per full document draw (not per block). The **first** `[[type:id]]` mention of a given entity anywhere in the document — including inside the opening/recap section and inside nested scenario-card content — gets a small inline thumbnail; every subsequent mention of the same entity does not. **Reordering blocks changes which mention gets the thumbnail.** This is cosmetic (no rendering breaks), but worth knowing if you're wondering why a particular `[[character:x]]` reference has no portrait — it's not the first mention.

### 3.8 The guide-opening section is not part of `blocks` at all

The "Session Recap" block at the top of every document (Location / Read Aloud / DM Notes / player-context rows) is **not stored in `field_guide_sessions.blocks`**. It's built fresh on every draw from three separate sources: `session_notes.opening_location_ref` / `.opening_recap_read_aloud` / `.opening_recap_dm_notes`, plus `session_opening_player_context` rows. If you're looking for this content in the blocks array, it isn't there — edit it through its own dedicated fields, not by trying to author a matching box in `blocks`.

Two things worth knowing if you're comparing it against real authored content:
- Its "Read Aloud" and "DM Only" boxes are **hand-built HTML that only visually resembles a real `read_aloud`/`dm_only` category box** — same background colors, but no corner icon, no completion toggle, no category badge markup, and they don't go through the shared `scc-fg-text--*` treatment. Don't expect pixel-identical styling between this section and an authored box of the matching category further down the document.
- These three text fields are rendered as **plain text, not HTML** — line breaks become `<br>`, but any literal `<b>`/`<em>` you type shows up as literal text, not formatting. `[[type:id]]` links still work here, but they never get an inline thumbnail (this path doesn't touch `SCC_FG_LINK_SEEN` at all).

---

## 4. `scenario_cards` in full

The one genuinely nested, non-trivial block shape. Replaces two older, now-fully-retired concepts (`scenario_tabs`, `approach_tracker`) — don't author either of those, they no longer do anything.

### Shape

```jsonc
{
  "type": "box",
  "category": "scenario_cards",
  "label": "…",              // optional — shown in the module header as " — label"
  "beat_label": "…",         // optional — takes priority over `label` for the DOM id and for
                              // namespacing this module's logged decisions/statuses
  "cards": [
    {
      "id": "…",              // optional; only used as a last-resort fallback in the status-log title
      "title": "…",           // the tile's own label, and the fallback label for its decision
      "entity": { "type": "…", "id": "…" },   // optional — omit entirely for no portrait
      "blocks": [ /* a full, ordinary field_guide_sessions block array */ ],
      "decision": { "label": "…", "affects_quest_id": "…" }   // optional — omit for no decision row
    }
  ]
}
```

- **Give the module a `beat_label` (or at minimum a `label`) whenever there's more than one `scenario_cards`/`combat_outcomes` module in the document.** The DOM id and every logged status/decision title are derived from this string (slugified) — two modules sharing the same `label`/`beat_label` (or both left unlabeled at the same position) collide, and only the first one found responds to clicks; the second silently does nothing.
- `entity` uses the exact same type vocabulary and alias map as `h2`/box `featured` (§3.3) — same silent-drop-on-failure behavior for a bad type/id.
- **Card 0 is always the initially-open card on every redraw.** Which card the DM last had open is not persisted — reopening the document (or triggering any redraw of the module) always resets to the first card.

### Nested content

A card's `blocks` array is rendered through the **exact same `sccFgRenderDoc`** every other Field Guide content goes through — meaning a card can contain its own Read Aloud boxes, DM Only boxes, a nested `combat_outcomes` widget, or even another `scenario_cards` module. This nesting is real and intentional, not a coincidence of shared code.

**Nesting depth**: a `scenario_cards` module nested inside another `scenario_cards` module's card content is fully supported and interactive — the lookup logic that finds a module by its DOM id recurses through `cards[].blocks` with no depth limit.

**One nesting path is NOT supported, and fails silently**: that recursive lookup only descends through `scenario_cards` blocks' own `cards[].blocks`. A `scenario_cards` module nested inside a **`combat_outcomes` outcome's `blocks`** instead (i.e., a combat-outcomes → outcome → scenario_cards chain, rather than scenario_cards → card → scenario_cards) renders correctly on screen but is **unreachable by the click-handling lookup** — every tile click, status-cycle click, and decision click on it silently does nothing. If you need a decision point nested inside a combat outcome, prefer nesting a plain `combat_outcomes` widget again rather than a `scenario_cards` module, or keep it as flat content without interactive widgets.

### Status pills and decisions

- Each tile shows a status pill (Not Started / Started / Completed), click-to-cycle, independent of the card's `decision`. This state lives in `session_note_entries`, keyed by a title built from `beat_label`/`label` + the card's `title`/`id` — see §6 for the general rule about what that means for renaming things.
- A card's `decision` (if present) renders as a clickable row inside the open card, using the same shared "🔀 Player Decision" chip as `combat_outcomes`. `affects_quest_id`, if set, shows an "Affects: {quest name}" line — but if the id doesn't resolve to a real quest, that whole line just silently disappears rather than showing a broken reference.
- Clicking the decision row logs it as "what actually happened" (or un-logs it — the exact same click undoes it). Same underlying mechanism as `combat_outcomes` outcome rows — see §6.

---

## 5. Content-author checklist — read this before writing new content

**Things that render as literally nothing, with no error anywhere:**
- An unrecognized `type` string.
- `category: 'guide_meta'` on any box.
- `type: 'title' | 'subtitle' | 'tagline' | 'meta'`.
- A misspelled/unrecognized `category` on a box — falls back to a bare grey box instead of vanishing, but loses all of its intended styling.
- A `featured` or scenario-card `entity` entry with a bad type or an id that doesn't resolve.
- A `quick_attach` block missing either a resolvable `character_id` or `creature_id`.
- A `decision.affects_quest_id` that doesn't resolve — just the "Affects:" line disappears.
- An `h1.quest_id` that doesn't resolve — degrades to a plain heading, no badge.

**One thing that's an outright hard failure, not a silent no-op:** a `null` or otherwise non-object entry anywhere in the `blocks` array throws and **kills the entire document render** — nothing after it (and arguably the whole page section) shows up. Double-check for stray `null`s after any bulk edit or migration script, especially one that deletes/filters blocks in place.

**Category and type names are case-sensitive, exact, snake_case strings.** They are not validated at write time — Supabase will happily store `"Comedy"` or `"read-aloud"` and the renderer will just quietly not recognize them. Copy category names from `js/fg-category-schema.json` directly rather than retyping from memory.

**Inline links `[[type:id|Label]]`:**
- `type` must be lowercase letters/underscores only; `id` may contain word characters, dots, and hyphens — anything else in either position and the whole thing fails to match, rendering as literal bracketed text instead of a link.
- Omitting `|Label` shows the raw id as the link text — always supply a label unless the id itself is meant to be human-readable.
- **A well-formed link with an id that doesn't actually exist still renders as a live, clickable link** — it just opens the lookup drawer to nothing. This is a real trap: a typo'd id looks exactly like a working link until someone clicks it.
- `html` fields are trusted raw HTML (inserted via `innerHTML`) — only the link label itself gets escaped. Don't put untrusted or unescaped `<`/`>` characters in free text you didn't intend as markup.

**The skill-check auto-styling is fragile by design.** It only fires on an exact, unwrapped pattern: `<p>` with no attributes, a 🎲, optional `<em>title</em>`, then `<strong>Ability DC N</strong>`, then the rest of the text. Any attribute on that `<p>`, a non-numeric DC, or a missing `<strong>` and the whole transform just doesn't happen — you get an unstyled paragraph with no error.

**Two author-usable inline CSS classes exist for exactly this kind of thing** — use them instead of hand-typing a label:
- `<p class="scc-fg-stage-direction">…</p>` — auto-prefixes "(Read Aloud)"; use for narration text that needs to visually attach to a DM-only aside.
- `<p class="scc-fg-aside">…</p>` — auto-prefixes "(DM-Only)".
Do not hand-type "(DM-Only)"/"(Read Aloud)" into your text — it's injected via CSS `::before`, and a hand-typed one will just duplicate it or drift when the class is later reused elsewhere. This mirrors the standing rule in CLAUDE.md §9 about Field Guide inline treatments always being a named class, never a one-off inline style.

**A `<p>` with an inline `style="color:…"` opts out of its box's category text color entirely** — the category color rules only apply to `<p>` elements with no `style` attribute at all.

**`tone_note` only does anything on `spoken_dialogue` blocks.** Setting it on any other category is silently ignored — there's nowhere else in the renderer that reads it.

---

## 6. Where "state" actually lives (never in `blocks`)

**Nothing a player or DM can click ever gets written back into `field_guide_sessions.blocks`.** `blocks` is pure DM-authored content — every piece of interactive state lives elsewhere, matched to its block by a **generated title string**, not by any stored id:

| Interactive thing | Lives in | Matched by |
|---|---|---|
| Quest beat status | `quest_progress` | The quest's own real id/beat order — not title-matched, this one's solid. |
| Box "Mark Completed" | `session_note_entries` (category `quest`) | A hash of `category + '|' + label + '|'` + the first 120 characters of `html`. |
| `combat_outcomes` logged outcome | `session_note_entries` (category `quest`) | `"Combat Outcome — {label}: {outcome.label}"` |
| `scenario_cards` logged decision | `session_note_entries` (category `quest`) | `"Scenario Decision — {beat_label||label}: {decision.label||card.title}"` |
| `scenario_cards` tile status | `session_note_entries` (category `quest`) | `"Scenario Card Status — {beat_label||label}: {card.title||card.id}"` |

**The practical consequence: editing certain fields on an already-"completed"/logged block orphans its state.**
- Editing a box's `category`, `label`, or the first 120 characters of its `html` resets its Mark Completed toggle back to unchecked — silently, not destructively (the old log row just sits there unmatched, still visible in the Notes tab's Quest-Related list).
- Renaming a `combat_outcomes`/`scenario_cards` block's `label`/`beat_label`, or a card's `title`, orphans any decisions/statuses already logged against the old name the same way.
- These generated titles (e.g. `"Box Completed — 1839472"`, `"Scenario Card Status — Beat 3: Talked"`) show up verbatim to the DM in the Notes tab — keep `label`/`beat_label`/card `title` values human-readable, since they're not just internal keys.

**History/audit mode (`SCC_VIEWING_HISTORY`) disables every one of these click targets** — beat status, outcome rows, the completion toggle, scenario decisions, status pills, quick-attach, and the opening-section fields are all read-only when viewing a past, locked session.

---

## Appendix — where to look in `dm.html`

For a future Code session verifying or updating this doc:

- `sccFgRenderBlock(b, idx, ctx)` — line 17922 — the block-type switch (§1).
- `sccFgRenderDoc(blocks, ctx)` — line 18109 — the array walker + quest-section tracking (§3.2).
- `sccFgDrawDocument` — line 18435 — the footer split, opening-section injection, and full draw pipeline (§3.4, §3.8).
- `sccFgCollectScrollEntries` — line 18279 — the jump rail (§3.1).
- `sccFgHomedScenarioGroupNames` — line 18147 — the homed-scenario-group check (§3.6).
- `sccFgRenderFeatured` / `sccFgResolveFeaturedEntity` — lines 17039 / 16943 — featured thumbnails (§3.3).
- `sccFgRenderSpokenDialogue` — line 17257 (§2).
- `sccFgOneQuestBeatsHtml` / `sccFgRenderQuestBeatsBlock` — lines 17343 / 17365 (§2).
- `sccFgOneCombatOutcomesHtml` — line 17451 (§2).
- `sccFgRenderScenarioCardsBlock` / `sccFgOneScenarioCardsHtml` / `sccFgScenarioCardBodyHtml` / `sccFgFindScenarioCardsBlockInArray` — lines 17771–17863, `sccFgRenderScenarioCardsBlock` at 17841 (§4).
- `sccFgBoxIsCompleted` / `sccFgBoxCompletionKey` / `sccFgToggleLoggedEntry` — lines 17581 / 17572 / 17528 (§6).
- `sccFgLinkify` / `sccFgStyleSkillChecks` — lines 17108 / 17077 (§5).
- `js/fg-category-schema.json` — the category → color/badge source of truth (§2).

*This document is reference material, not a decision log entry — update it in place when the renderer changes, rather than appending a dated note. If a change is large enough to need its own narrative (why something changed, what broke), that belongs in `docs/decision-log-field-guide.md`; a one-line pointer back to this doc from that entry is fine.*
