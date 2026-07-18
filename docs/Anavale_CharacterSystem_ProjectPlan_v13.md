# Anavale Character Creation System — Project Plan
*Version 13.3 — July 4 2026*
*Paste this entire document into a new Claude chat to resume exactly where you left off.*

---

## Critical Rules for Claude

**Before writing any Cowork prompt:**
1. Search project knowledge for the relevant file and exact code block
2. `character.html`, `character.css`, `character.js`, and `dm.html` are always potentially stale — ask Cowork to read current file state before writing any anchor strings
3. Write one Cowork prompt per file, confirm before moving to next
4. Never guess anchor strings

**Cowork prompt format:**
All Cowork prompts must be enclosed in a single fenced code block (triple backticks) so the DM can one-click copy. Never write a Cowork prompt as inline prose.

Standard instruction pattern inside the block:
Open [relative file path] in VS Code. Read [anchor or function name] before making any changes. Find [anchor] and replace it with the following. Do not modify any other entries. Save the file. Read back the edited section to confirm.

---

## Debugging & Iteration Rules (Enforced — May 31 2026)

These rules exist because iterating on symptoms wastes the DM's tokens and time.

**Rule D1 — 2-attempt hard limit — non-negotiable.**
If a fix fails twice, STOP. Do not write a third variation of the same approach. Something is wrong with the diagnosis, not the fix.
After 2 failed attempts Claude must write: "I have reached the 2-attempt limit. I will not write another fix until I have read the exact current state of the broken code from Cowork and identified the specific line that is wrong." No exceptions.

**Rule D2 — Diagnose before touching anything.**
Before writing any fix, read the actual broken code. Identify the exact line that is wrong and state precisely why it produces the observed behaviour. If the cause cannot be stated with certainty, say so — do not guess.

**Rule D3 — Fix in one shot.**
Once the root cause is identified, write one targeted fix that addresses it directly. Do not patch symptoms.

**Rule D4 — When the DM writes "Stop. Think. One fix."**
Halt all iteration. Re-read the relevant code from scratch. State the root cause in plain English. Write one fix. Do not explain previous attempts.

**Rule D5 — When the DM writes "Rewrite from first principles."**
Discard all accumulated edits. Write a clean version from scratch with no legacy of previous patch attempts.

**Rule D6 — Never answer without evidence.**
Before answering any question about stage contents, file structure, feature behavior,
or project state — search the relevant file or project knowledge first. Never invent
a plausible answer. If uncertain, say so and search before responding.

**Rule D7 — When the DM corrects a factual claim:**
Stop immediately. Do not defend the previous answer. Update the project plan entry for that feature before writing any code. Only proceed after the plan reflects the correct state.

**What happened to cause these rules (May 31 2026):**
A canvas gradient was yellow because its position window was sliding off the text. The fix was 10 lines (pin gradient to text width, rotate color stops). It took 8 attempts across 30 minutes because the symptom (wrong color) was patched repeatedly instead of the geometry being reasoned about first.

---

## Supabase Migration — Decided June 28 2026

### Architecture Decision
All data moves to Supabase. The `data/*.js` files remain in the repo as legacy seeds only and must not be treated as the source of truth for anything after this migration.

### Supabase Project
- **Project name:** anavale
- **URL:** https://ebppsgaftzyvftemfeom.supabase.co
- **Anon key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicHBzZ2FmdHp5dmZ0ZW1mZW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MTA3ODIsImV4cCI6MjA5ODE4Njc4Mn0.C0q7wPpNjXrFPWzCzXcPuR_4n8txumOxxSvzWZkVAFg
- **Region:** East US (North Virginia) — us-east-1
- **Free tier** — auto-pause prevented by GitHub Actions keep-alive ping every 5 days ✅ Done June 30 2026
- **Supabase MCP** connected to Claude — Claude can query the database directly in any chat session

### Supabase Tables — Current Schema (July 1 2026)
**read_aloud column (added July 1 2026):** Five tables gained a `read_aloud` text column: `world_characters`, `cities`, `pois`, `creatures`, `items`. This field holds prose read aloud to players at the table. All 11 Session 1 entries have read_aloud text populated in Supabase. The SCC and DM Tools surface this field — see "What Comes Next" for details.

| Table | Status | Written by | Read by |
|---|---|---|---|
| `regions` | ✅ Live | DM Tools | Wiki, DM Tools |
| `nations` | ✅ Live | DM Tools | Wiki, DM Tools |
| `cities` | ✅ Live | DM Tools | Wiki, DM Tools |
| `creatures` | ✅ Live | DM Tools | Wiki, DM Tools |
| `organizations` | ✅ Live | DM Tools | Wiki, DM Tools |
| `world_characters` | ✅ Live | DM Tools | Wiki, DM Tools |
| `pois` | ✅ Live | DM Tools | Wiki, DM Tools |
| `religions` | ✅ Live | DM Tools | Wiki, DM Tools |
| `items` | ✅ Live | DM Tools | Wiki, DM Tools |
| `spells` | ✅ Live | DM Tools | Wiki |
| `quests` | ✅ Live | DM Tools | DM Tools |
| `player_characters` | ✅ Live | Character Creator | DM Tools, Sheet |
| `character_sheet` | ✅ Live | Sheet | Sheet, DM Tools |
| `inventory` | ✅ Live | Sheet | Sheet, DM Tools |
| `character_notes` | ✅ Live | Sheet | Sheet, DM Tools |
| `character_photo` | ✅ Live | Sheet | Sheet, DM Tools |
| `session_notes` | ✅ Live | SCC (DM Tools) | DM Tools |
| `quest_progress` | ✅ Live | SCC (DM Tools) | DM Tools |
| `species` | ✅ Live | Supabase direct | DM Tools city form |

### Supabase Storage Buckets

| Bucket | Visibility | Used by | Purpose |
|---|---|---|---|
| `world-images` | Public | DM Tools | World entry images — uploaded via ⬆ Upload Image button in New Entry forms |
| `character-photos` | Private | Character Sheet | Player portrait photos |

Image URL pattern: `https://ebppsgaftzyvftemfeom.supabase.co/storage/v1/object/public/world-images/{folder}/{entryId}.webp`

### What Each App Does After Migration
- **Character Creator** — writes new character directly to Supabase `player_characters` table on submit. **Corrected June 30 2026:** `writeToGitHub()` is confirmed NOT called anywhere in `submitCharacter()` as of this date — the GitHub Actions dispatch path (`add-character.yml`) is dead code, not an active secondary write. The function and workflow file still exist in the repo but nothing triggers them. Formspree remains the only secondary record (email).
- **Wiki** — reads all world data live from Supabase on page load. Static `data/*.js` files are instant fallback. Sidebar and search index rebuild after Supabase sync completes.
- **DM Tools** — all Content Manager reads and writes go to Supabase. New entries auto-save on Generate. Visibility changes auto-save on click. Images upload to Supabase Storage. No file picker, no git push for content. Cowork is for code changes only.
- **Character Sheet** (`sheet/index.html`) — reads character from Supabase `player_characters` by token, reads/writes live play data (HP, gold, inventory, notes, photo) to Supabase. ✅ Built and tested June 30 2026.

### Character Sheet — Feature Spec (Updated June 30 2026)
- **URL:** `sheet/?token=TOKEN` — single file at `sheet/index.html`, token read from query string
- **Player cannot edit:** name, class, species, background, alignment, ability scores, level, Gigglegloom type
- **DM can edit:** everything, from DM Tools
- **Design:** hero aesthetic — region landscape background, animated type-colored orbs, portrait with hover-to-replace photo upload button
- **Data storage:** all live play data in Supabase, never localStorage
- **Modals:** injected into `#cs-modal-root`, a dedicated container outside the animated `.cs-wrap` page wrapper (see Cowork Known Bug Patterns for why this matters)

**HP — ✅ Done (Phase 1, June 30 2026):**
- Current HP: +/− buttons, ± delta input with Apply, clamped between 0 and effective max
- Max HP: base value plus an editable `hp_max_modifier` (status-effect bonus/penalty), displayed as e.g. "13 (+2)" or "13 (−2)" with green/red badge
- Temp HP: editable, no clamp, persists to `character_sheet.hp_temp`
- Schema: `character_sheet.hp_max_modifier` (integer, default 0) added June 30 2026

**Inventory — ✅ Done (Phase 2, June 30 2026):**
- Catalog-first search: debounced predictive dropdown queries `items` table live (never cached across session), filtered by category (`accessory | armor | consumable | shield | tool | weapon` — matches actual catalog vocabulary)
- Selecting a catalog result adds an `inventory` row with `item_id` set — display stats (name, cost, weight, description) always read live from `items`, never copied, so DM edits to a catalog item propagate to every player holding it
- Custom item fallback ("+ Can't find it? Add a custom item" button, opens a centered modal titled "Create New Item"): name, type (`accessory | armor | consumable | food | other | resource | shield | spell | tool | treasure | weapon`, alphabetized, defaults to "Select"), description, qty, cost (gp/sp/cp), weight, Magical/Consumable checkboxes
- Fuzzy-match duplicate gate: before saving a custom item, queries the full catalog (up to 200 `player_facing` items) and computes Levenshtein similarity against the typed name; ≥70% match blocks submission and offers "Use [Catalog Name] instead" which adds that catalog item directly
- Favorites: independent sort order from regular items, always render above the "Items" section, toggled via star button
- Drag-and-drop: HTML5 native drag API, reorder within Favorites or within Items only (cannot drag across the boundary), `sort_order` renumbered and persisted to Supabase on drop
- Weight total: "Carrying: X lb" — sum of `quantity × weight_lb` across all items, catalog weights hydrated from `items` on page load (not just live search) to avoid the "Unknown item" bug
- Edit: pencil icon on custom items only (catalog items are never directly editable — edit the catalog in DM Tools instead) reopens the modal pre-filled
- Delete: requires confirmation via a styled modal, not instant
- Description accordion: click item name to expand/collapse a description panel with a gold top border
- Schema: `inventory` gained `cost_sp`, `cost_cp`, `item_type`, `is_favorite`, `sort_order`, `is_magical`, `is_consumable`, `dmg_dice`, `dmg_type`, `ac_bonus` (added June 30 2026)

**Notes — ✅ Done (Phase 3, June 30 2026):**
- Contenteditable rich-text body (not a plain textarea) — required for inline wiki links
- Title + body per note; multiple notes per tab (UNIQUE constraint dropped, table was empty)
- Five tabs: General 📝 / Places 🗺 / Names 👤 / Things 🎒 / Misc ✦ — proper connected tab bar (not pills)
- Pin/unpin notes to Pinned section (★ button); drag-to-reorder within sections; `sort_order` and `is_favorite` persisted to Supabase on change
- Global search across all five tabs with excerpt preview and jump-to-note
- Wiki-entry autocomplete: typing 2+ chars triggers substring match against all `player_facing = true` or `'teaser'` world entries; selecting inserts a clickable `<a class="cs-wiki-link">` anchor; body saved as `innerHTML` so links survive page reload
- Autocomplete filters by `player_facing` only — spoiler prevention enforced at query level
- Wiki route lookup table: `world_characters` → `#character/{id}`, `organizations` → `#org/{id}`, `items` → `#item/{id}`; others match table name directly
- Done button collapses open card; ✎ edit button opens and focuses body; 🗑 delete requires confirmation modal
- ＋ New note button styled to match inventory; new card auto-opens and focuses body by note ID (not `:last-child`)
- Schema: `character_notes` gained `title` (text), `sort_order` (integer), `is_favorite` (boolean) — all June 30 2026
- Key bug fixed: autocomplete regex changed from multi-word to single-word match (`/([A-Za-z'][A-Za-z']*)$/`) — multi-word pattern grabbed previous words mid-sentence, producing zero hits
- Key bug fixed: re-capture `getSelection()` inside `.then()` after async cache load — stale range caused zero-rect dropdown positioning

### Build Status — June 29 2026

| Step | Status | Completed |
|---|---|---|
| 1. Create Supabase schema (all tables + RLS policies) | ✅ Done | June 28 2026 |
| 2. Migrate world data from `data/*.js` to Supabase | ✅ Done | June 28 2026 |
| 3. Character Creator writes to Supabase | ✅ Done + tested | June 28 2026 |
| 4. Wiki reads from Supabase | ✅ Done + tested | June 28 2026 |
| 5. DM Tools reads + writes from Supabase | ✅ Done + tested | June 28–29 2026 |
| 6. DM Tools image upload → Supabase Storage | ✅ Done + tested | June 29 2026 |
| 7. DM Tools cleanup (removed file-based save UI) | ✅ Done | June 29 2026 |
| 8a. Character sheet — HP (current/max/temp, status-effect modifier) | ✅ Done + tested | June 30 2026 |
| 8b. Character sheet — Inventory (catalog search, fuzzy-match gate, custom items, favorites, drag-reorder, weight total) | ✅ Done + tested | June 30 2026 |
| 8c. Character sheet — Notes (contenteditable, multi-note-per-tab, wiki-entry autocomplete linking) | ✅ Done + tested | June 30 2026 |
| 9. GitHub Actions keep-alive workflow (pings Supabase every 5 days, prevents free-tier auto-pause) | ✅ Done + tested | June 30 2026 |
| 10. DM Tools — Players tab (character registry with sheet links, copy-token, class/species/region/level at a glance) | ✅ Done + tested | June 30 2026 |
| 11. SCC read_aloud surfacing — `.scc-ra-block` CSS, NPC cards, Location cards, lookup panel (character/city/creature), Add/Edit forms (character/city/POI/creature), `cmPopulateForm` wiring | ✅ Done | July 1 2026 |
| 12. Design token system — `css/tokens.css` created as single source of truth; all `:root` blocks removed from wiki.css, character.css, spells.css, dm.html, sheet/index.html, welcome.html, hub.html; Google Fonts updated to Cinzel Decorative 700 + Roboto 300/400/700 only (Charm and EB Garamond retired); one gold (#f0b429) across all pages; alias layer preserves all existing variable names | ✅ Done + tested | July 2 2026 |
| 13. SCC NPCs tab — Figma redesign: full-width accordion cards, circular portrait, relationship badge, Role/Location lines, Quick Look button, chevron toggle, search/filter/sort controls, expanded sections (Visualization quote block, Personality, Summary, DM Only with Secret/Notes/Linked Quests) | ✅ Done + tested | July 2 2026 |
| 14. SCC Quick Look panel — NPC redesign: portrait, relationship badge, player-facing status badge, name, role/location, category/pronouns/status/affiliation field rows, Motivation/Contradiction/Appearance/Gigglegloom Relationship prose sections, World Associations and Tags pill lists; panel widened to 500px | ✅ Done + tested | July 2 2026 |
| 15. SCC Locations tab — rebuilt to match NPC accordion pattern: full-width accordion cards, circular portrait, health badge (VIVID/MUTED/FADED/DIMMED/UNKNOWN with correct colors), Vareth SVG prism icon badge, Type/Region/Nation inline layout, Quick Look button, chevron toggle, search/filter/sort controls, expanded sections (Visualization quote block, Summary, Description, Landmarks with portrait avatars and linked entry support, DM Only with Vareth Presence/Notes); Quick Look panel rebuilt to NPC style with portrait header, fields table, Strategic Importance/Tone/Culture/Gigglegloom sections, tags; linked landmarks: DM Tools form has entry search, accordion pulls live entry data with chain link badge; Supabase data populated for all Session 1 locations; strategic_importance/tone columns added to pois table | ✅ Done + tested | July 3 2026 |
| 16. SCC Live Session tab — 7th SCC tab: quest beats with Details panel, party HP with direct input, condition chips with D&D colors + tooltips, die roller with crypto.getRandomValues(), Timer above DM Safety Net, NPC chips, scenario accordions, quick note capture | ✅ Done + tested | July 3–4 2026 |
| 17. Location enrichment — wiki renderCity() gains population breakdown + structures; DM Tools city form rebuilt with Supabase species dropdown, sliders with auto-rebalance, pie chart, structures accordions + filter bar; form-section-header → Cinzel Decorative | ✅ Done + tested | July 3–4 2026 |
| 18. Landmarks retired — addLandmark() and all landmark JS functions removed from dm.html (141 lines); structures with landmark: true boolean replaces landmarks system | ✅ Done | July 4 2026 |
| 19. species Supabase table — 12 Anavale species seeded from ANAVALE_SPECIES in character.js; used by DM Tools city form population dropdown; character creator migration to Supabase species table is a post-Session 1 task | ✅ Done | July 4 2026 |
| 20. Documentation audit — v17→v18 Project Instructions, v10→v11 Cowork Instructions; duplicate rules removed, stale bug patterns corrected, Google Fonts Charm reference fixed, Node v24 syntax check workaround documented | ✅ Done | July 4 2026 |

### DM Tools — Current State (June 29 2026)

**What was removed:**
- Setup tab (GitHub token entry) — removed entirely
- Save to Data File button and JSON output panel
- Copy JSON button
- Recently Added panel
- Content Manager right output panel (Save to File + Copy buttons)
- All file-based save functions (`saveToFile`, `copyJson`, `replaceEntryInContent`, `cmWriteArrayToFile`) — stubbed or deleted
- Save Image to Disk button on all 6 entry forms

**What was added:**
- Supabase live sync on page load — all 11 tables fetched into memory (10 world tables + quests)
- `sbUpsertEntry(entry, type)` — auto-saves any generated entry to Supabase
- `sbUpdateVisibility(entry, type)` — auto-saves visibility changes to Supabase
- `uploadImageToSupabase(prefix, folder)` — uploads compressed WebP to `world-images` bucket; auto-triggers on Save Entry click
- `removeEntryImage(prefix)` — deletes image from Storage and clears the field
- `cmRefreshFromSupabase()` — Refresh button re-fetches all data live from Supabase
- `showDMToast(msg, type)` — bottom-right toast confirmation on every save
- Last sync timestamp in Content Manager header
- New entries appear in Content Manager immediately after saving
- Identity fields appear before image block in all entry forms
- Clear Form button hidden in edit mode
- Remove Image button shown in edit mode when entry has an existing image
- All thumbnails set to `object-fit: contain`
- `✦ Generate Entry` renamed to `✦ Save Entry`
- Enter key in search now filters (not reloads)
- Stale filter on load fixed
- Modified column sort fixed (nulls sort to bottom)

---

## Session Changelog — June 28–29 2026 (Supabase Migration Session)

| Area | What Changed |
|---|---|
| Architecture | All world data migrated from `data/*.js` files to Supabase. Static files remain as legacy seeds only. |
| Character Creator | `submitCharacter()` now POSTs directly to Supabase `player_characters`. All missing columns added via SQL. RLS insert policy added. Tested with live submission. |
| Wiki (`index.html`) | Supabase sync script added — fetches all 11 tables on load, updates global JS arrays, rebuilds sidebar + search index + current page. `backgrounds.js` 404 removed. |
| Wiki (`js/wiki.js`) | Spellbook fixed to use `spell_desc \|\| desc` fallback. `console.log` statements removed from `renderGods`. |
| DM Tools (`dm.html`) | Full Supabase integration — reads on load, writes on Save Entry, visibility changes auto-save, images upload to Storage. Setup tab removed. All file-based save UI removed. 15+ dead DOM reference functions stubbed or deleted. Image upload replaced with single Supabase Storage button across all 6 forms. New entries appear in Content Manager immediately. Refresh button re-fetches from Supabase. Toast confirmations added. Last sync timestamp shown. |
| Supabase Storage | `world-images` bucket created (public). `character-photos` bucket created (private). RLS policies added for anon insert + select. |
| RLS Policies | Anon insert + update policies added for all world tables and `player_characters`. |
| Node.js scripts | Used for large cleanup operations (dm_tools_cleanup.js, dm_image_supabase.js) as efficient alternative to multiple Cowork prompts. |
| Project docs | Plan updated to v9, Instructions updated to v10, Cowork file updated to v7. |

---

## Recent Cowork Edits — May 31 2026 (project knowledge may be stale for these)

| File | What Changed |
|---|---|
| `assets/images/regions/` | `img-caparia-landscape.png`, `img-jugabi-landscape.png`, `img-sohot-landscape.png` converted to WebP (−97% size each) |
| `css/character.css` | `body.char-page` and `.char-confirmation` background references updated to `.webp` |
| `character.html` | All region card `background-image` references updated to `.webp` |
| `welcome.html` | All region row `background-image` references updated to `.webp` |
| `js/wiki.js` | All region `heroImg` and `image` references updated to `.webp` |
| `js/character.js` | `renderGigglogloomAffinity()` — video `preload="auto"` changed to `preload="none"`; `IntersectionObserver` added to defer video load until grid scrolls into view |
| `js/character.js` | `initStage1()` — `renderGigglogloomAffinity()` call removed; affinity cards now render lazily when Your Magic accordion opens |
| `welcome.html` | All four `<video class="type-card-video">` tags changed to `preload="none"` |
| `character.html` | `#char-past-progress` div (lines 329–331) removed |
| `js/character.js` | `selectPastCard()` progress tracker update lines removed (label + fill references) |
| `character.html` | `data-img` attribute added to all 34 past option cards pointing to `assets/images/past/[name].webp` |
| `character.html` | `<div class="char-past-q-img" id="img-[key]">` added before each of the 7 `char-past-effect-preview` divs |
| `character.html` | `selectPastCard()` inline function — image display logic added after answered mark |
| `css/character.css` | `.char-past-q-img` and `.char-past-q-img.visible` rules added; `aspect-ratio: 4/3` |
| `assets/images/past/` | 34 WebP illustrations added (one per past question option) |
| `character.html` | Splash screen `#char-splash` div + inline script added after `<body class="char-page">`; `pointer-events:none`; wrapped in `DOMContentLoaded` |
| `character.html` | `#char-type-grid-s2` line removed from `#char-stage-2`; `style="display:none"` removed from `#char-class-section` |
| `js/character.js` | `resumeDraft()` — `armSplashForResume()` call added; `initStage2()` rewritten — affinity rendering removed, class cards show immediately; `renderGigglogloomAffinity()` updated to accept `targetId` parameter |
| `css/character.css` | `.char-type-card` — `min-height:200px`, `display:flex`, `flex-direction:column` added; `.char-type-video-wrap` — `min-height:200px` added; `.char-type-content` — `flex:1` added |

---

## Current Build State

### The Five Stages — What Is Live Now

| Stage | Name | Contents | Status |
|---|---|---|---|
| 1 | Your Story | 6-panel accordion: 🧑 Who Are You (name, gender icon buttons, personality, three last things) · ✨ Your Magic (Gigglegloom affinity cards with video backgrounds) · 📖 Your Background (16 background cards with thumbnails; gender icon buttons gating 12 species cards with gender-responsive portraits; 4 region landscape cards; 6 language cards with glyphs) · 🌿 Your Past (7 imagined past questions with progress tracker and badges) · 🎭 Your Appearance (face/hair/body selects, skin tone picker) · ⚖️ Your Compass (5 alignment cards, compass illustration, no trait sub-selection). No gates — always continuable. | ✅ Live — May 30 2026 |
| 2 | Your Class | Full 12-class grid with PHB data, trait tooltips, skill selection. Class cards show immediately. | ✅ Live — May 31 2026 |
| 3 | Your Strengths | Ability score drag-and-drop only (standard array, chip system, reset button). Stats panel lives in Stage 5. | ✅ Live — May 30 2026 |
| 4 | Your Gear | Starting gear panel (auto from class), weapon hand slots, armor/clothing filtered by class, accessories, gold tracking. | ✅ Live — May 30 2026 |
| 5 | Your Character | Auto-generated narrative summary + full stats panel (`char-stage3-panel`: class, background, ability scores, saves, skills, AC, HP, money, attacks) + submit. | ✅ Live — May 30 2026 |

### Infrastructure

| Feature | Status |
|---|---|
| Progress bar (18px, colorful gradient, label below bar, flips outside/white when pct < 40) | ✅ Live |
| Sidebar (5 stages, connector line, gradient active circle, green completed state) | ✅ Live |
| LocalStorage auto-save draft | ✅ Live |
| Save My Progress button (`generateResumeLink()`) | ✅ Live |
| Return banner if draft detected in localStorage | ✅ Live |
| Draft restore — all fields including option cards, region, language, past questions | ✅ Live |
| Duplicate detection via localStorage flag | ✅ Live |
| Formspree POST (endpoint: https://formspree.io/f/xzdwaveg) | ✅ Live |
| GitHub API write + duplicate email check | ✅ Live |
| Confirmation screen | ✅ Live |
| Animated splash screen (`#char-splash`) — fires on fresh visit and Resume only, skips on stage navigation | ✅ Live — May 31 2026 |

---

## Character Submission Pipeline — Legacy (pre-Supabase, June 26 2026)
### Architecture

> ⚠️ This pipeline is superseded as of June 28 2026. Character submissions now go directly to Supabase `player_characters` table via the character creator. The GitHub Actions dispatch remains in `character.js` as a best-effort secondary write but is no longer the primary record. Formspree remains as the email backup.
Player submits character creator → browser fires GitHub `repository_dispatch` →
GitHub Actions workflow (`add-character.yml`) runs → Node script parses payload →
appends entry to `data/characters.js` → commits and pushes → GitHub Pages rebuilds
(~60s) → character appears in wiki and DM Tools automatically.
### Files involved
- `js/character.js` — `writeToGitHub()` fires the dispatch; `submitCharacter()` calls
  Formspree first (always succeeds), then dispatch (best-effort)
- `.github/workflows/add-character.yml` — listens for `repository_dispatch` with
  `event_type: add-character`; runs Node script; commits using `CHARACTER_WRITE_TOKEN` secret
- `.github/scripts/add-character.js` — parses `client_payload.data` (JSON string),
  appends entry to `data/characters.js`, deduplicates by token
### Key technical details
- `client_payload` is wrapped as `{ data: JSON.stringify(payload) }` — GitHub limits
  `client_payload` to 10 properties; wrapping keeps it at 1
- Dispatch token is split/base64-encoded in `CHAR_CONFIG.github_token` (IIFE using `atob`)
  to prevent GitHub secret scanning from revoking it on push
- `CHARACTER_WRITE_TOKEN` Actions secret holds the Contents: write PAT for the workflow commit
- Formspree endpoint: `https://formspree.io/f/xzdwaveg` — DM receives email for every submission
- If dispatch fails (network, token expiry), Formspree is the fallback record
### Bug fixes also completed June 26 2026
- Gold deduction: `calcGoldSpent()` now checks `CLOTHING_TIERS` / `LOWER_TIERS` for
  `app-top` and `app-lower` costs (these are string values, not ITEMS ids)
- Presubmit modal: alignment and region now show capitalized display names with PHB terms
- Modal close: `closePreSubmitConfirm()` called at top of `submitCharacter()`
- Stage 5 summary card: replaced one-sentence `char-auto-summary` with full
  `renderSummaryCard()` — portrait, Gigglegloom badge, stat rows, ability score chips,
  story paragraph
- `initStage5()` now calls `renderSummaryCard()` after `generateSummary()`
### DM workflow for new characters
1. GitHub Actions commits character to `data/characters.js` automatically (~30s after submit)
2. GitHub Pages rebuilds (~60s) — character visible in wiki and DM Tools
3. Formspree email arrives as backup record
4. No manual steps required under normal operation
5. If workflow fails: check Actions tab, re-run failed job, or manually add from Formspree email
### Token maintenance
- Dispatch token encoded in `character.js` — if it stops working, regenerate
  `anavale-wiki-character-write` PAT, re-encode with `btoa()`, split across 3 vars (a+b+c),
  update `CHAR_CONFIG.github_token` IIFE in `character.js`
- Also update `CHARACTER_WRITE_TOKEN` Actions secret with the new PAT value

---

## Character Creator Bug Fixes & Polish — June 27 2026
### Stage 5 Summary Card — Full Redesign (COMPLETE)
Replaced the single-sentence summary card and separate stats panel with a unified
visual card. All styling is inline JS (no new CSS classes required).
**Card zones top to bottom:**
1. **Hero** — region landscape image (full bleed, Ken Burns zoom), species portrait
   (right side, fades at bottom), character name in Cinzel Decorative, class · species · gender
   subtitle, Gigglegloom type badge with real SVG icon + glowing dot animation
2. **Identity strip** — 5 columns: Region 🗺, Alignment ⚖️, Background 📖,
   Language 💬, Species 🧬 — each with icon, label, value, PHB name in muted text,
   hover tooltip
3. **Combat row** — enlarged class block (88px icon, class name + Anavale flavor name,
   primary ability, saves, background) + vertical stat pills (AC grey, HP red, Gold gold)
4. **Ability scores** — 6 chips, highest highlighted white, below-average red, +N
   background bonus tag top-right
5. **Skills + Weapons** — two-column, skill tags + +1 modifier tags, weapon damage
6. **Story** — italic auto-generated sentence with ornament divider + flicker animation
**Animations:** Three slow drifting type-colored orbs behind card, sparkle canvas
(JS-drawn particles), hero shimmer sweep, badge pulse (type-correct color via
CSS custom property --sc-type-glow), dot pulse, ornament flicker, Ken Burns on region.
**Old `#char-stage3-summary` panel** is hidden via JS in renderSummaryCard().
**Old stats section header** hidden via `display:none` on `#char-stage5-stats-header`
in character.html.
**Known issue fixed:** Badge glow was hardcoded Flamerage red — now uses
`--sc-type-glow` CSS custom property set dynamically per type.
### Gold Calculation Fixes (COMPLETE)
- `calcGoldSpent()` now checks `CLOTHING_TIERS` / `LOWER_TIERS` for app-top/app-lower
  costs after ITEMS lookup fails (these slots use string values, not item IDs)
- Starting armor (from `CLASS_STARTING_GEAR[cls].armor`) is excluded from gold cost
  in both `calcGoldSpent()` and the `app-top` dropdown label (shows `(free)`)
- `filterClothingByClass()` now detects starting armor and labels it `(free)`
- `renderSummaryCard()` uses `getStartingGold()` (not bgObj.starting_gold) for accurate
  total, shows overspent state in red with `−N gp` label and red pill styling
### Stage Navigation Fix (COMPLETE)
- `jumpToStage()` now blocks navigation to Stage 5 when gold is negative
  (sidebar pill click path — Continue button was already blocked)
- `validateStage(4)` was already correct; the devmode randomizer bypasses it by design
### HP Calculation Fix (COMPLETE)
- `renderSummaryCard()` was concatenating `clsObj.hit_die` (string `"d8"`) + conMod
  producing `"d82"` — fixed with `parseInt(hit_die.replace('d',''))`
### Presubmit Modal Fixes (COMPLETE)
- Alignment and region now show capitalized display names with PHB equivalents
- `closePreSubmitConfirm()` called at top of `submitCharacter()` so modal closes
  immediately when player confirms
### Confirmation Screen (PENDING)
Three tweaks still needed:
1. Increase color contrast on `.char-confirmation-type`
2. Remove `.char-confirmation-subtitle` text
3. Change yellow text to white on `.char-confirmation-warning`
### Missing Character Fields (PENDING)
Fields the DM character form captures that the character creator doesn't yet populate:
**Tier 1 — Auto-generate in `buildCharacterEntry()` (no new player questions):**
- `role` → `"{GigglgloomType} {ClassName}, {HomeRegion}"` e.g. "Flamerage Sorcerer, Caparia"
- `pronouns` → map from gender: male→"he/him", female→"she/her", non-binary→"they/them"
- `status` → always `"active"` for new PCs
- `affiliation` → use `organization_joined` if present
- `gigglegloom_relationship` → pull class flavor text from `GIGGLEGLOOM_TYPES[type].classes`
- `personality` → concatenate three personality fields into one prose paragraph
**Tier 2 — Add one field to Stage 5:**
- `color` → short text input: "What color do you associate with your character?"
  Maps to the `color` field in the DM character entry
**Tier 3 — DM fills after Session One (not player's job):**
- `contradiction`, `secret`, `dm_notes`, `player_knowledge`, `image`
### Token Maintenance Reminder
The dispatch token in `CHAR_CONFIG.github_token` is the `anavale-wiki-character-write`
PAT encoded as split base64 (a+b+c → atob). If it stops working, regenerate the PAT,
re-encode with `btoa()`, split across 3 vars, update the IIFE in character.js, and
also update the `CHARACTER_WRITE_TOKEN` Actions secret.

---

### What Comes Next (In Order)

| Priority | Task | Notes |
|---|---|---|
| **🔴 Immediate — Pre-Session One** | Session One DM opening narration | Word-for-word read-aloud script. File exists locally (`Anavale_Opening_Narration.md`) — unknown if written. |
| **🔴 Immediate — Pre-Session One** | Session One visibility list in DM Tools | Set `player_facing` on all entries players should see at Session One. Done manually in DM Tools — no code. |
| **🔴 Immediate — Pre-Session One** | Player character submissions | Adrian, Meeta, and Hema each complete character creator and submit. DM action, no code. |
| **🔴 Immediate — Pre-Session One** | SCC remaining tabs — Locations, Quests, Combat, Notes | Test all four tabs before Sunday. NPCs tab ✅ done July 2 2026. |
| **🟡 Next build** | Character sheet — Phase 4+ spec | Decide what else goes on the sheet for play (spell slots, skills, saving throws, quest log). Spec first, then build. |
| **🟡 Next build** | Wiki species pages | 12 playable species need wiki pages. Species data already exists in character creator — needs wiki renderer + `data/species.js`. Spec to be written. |
| **🟡 Next build** | Session 2 prep — tokens migration Session 2 | Replace all old variable names (--dm-gold, --font-sans, --char-*, etc.) with new token names across all CSS files and inline styles. Remove alias layer from tokens.css. |
| **🟢 Post-Session One** | Player welcome handout | In-world letter for players. File exists locally (`Anavale_Player_Handout.md`) — unknown if written. |
| **🟢 Post-Session One** | Inkarnate map completion | Five rivers, city markers, world wonder markers, dark zone markers. Manual Inkarnate work. |
| **🗑 Removed** | `welcome.html` closing CTA → `character.html` | No longer needed. |
| **🗑 Removed** | Species portraits → WebP | Not a priority. |
| **🗑 Removed** | Reactive SVG character figures | Post-campaign idea at earliest. |
| **🗑 Removed** | DM Tools `weapon_type` field | Not needed for current campaign. |

---

## Locked Design Decisions

### Identity & Access
- **Method:** Magic link — unique 32-character token generated at submission
- **Player sheet URL:** `sheet/[token].html` — unguessable, bookmarkable, permanent
- **DM access:** DM Tools shows all three character sheets with links

### Data
- **Locked (DM edits only):** class, species, background, ability scores, proficiencies, features, spells, saving throws, skills, languages, alignment, level
- **Mutable (player edits):** inventory, equipment slots, quest notes, world notes, current HP
- **Item visibility:** `player_facing: false` = invisible to players entirely

### Duplicate Prevention
- Email is required identity field. Before GitHub write: checks `characters.js` for matching email.
- If found: shows "your character already exists, here's your link"
- After submit: `anavale_character_created: [token]` written to localStorage
- DM can clear the flag via DM Tools to re-enable creation

### Starting Level
- All player characters start at **Level 1**

### Languages
- All characters automatically receive **Common**
- Player selects **one additional language** during Stage 1 (Your Background accordion panel)

### Stage 1 Background Accordion Structure
- All selection fields use card-style option pickers — no `<select>` dropdowns
- Five named sections: Part 1 Background · Part 2 Gender (gates species) · Part 3 Species · Part 4 Region & Language
- Gender uses three icon buttons (♂ Male / ♀ Female / ⚧ Non-binary) via `selectGender()`
- Species grid hidden until gender selected — `selectGender()` reveals it and loads gender-correct portraits
- Species portraits: `assets/images/species/sp-[id]-[m/f/nb].png` — 36 files total
- Background thumbnails: `assets/images/backgrounds/bg-[id].png` — 16 files total
- Region uses `.char-region-card` with landscape background images via `selectOptionCard()`
- Language uses `.char-lang-card` with Unicode glyphs and region colors via `selectOptionCard()`
- All 7 Imagined Past questions use `char-option-cards` with `selectPastCard()`
- Effect previews shown below each past question on card selection
- Progress tracker at top of Your Past panel — updates live as questions answered

### Draft Keys (Stage 1)
- `character_name`, `gender`, `personality_immediate/wrong/laugh`, `cares_about`, `deepest_fear`, `seeking` — Who Are You
- `gigglegloom_type` — Your Magic
- `background_id`, `species_id`, `home_region`, `language` — Your Background
- `past_raised`, `past_friend`, `past_pet`, `past_love`, `past_org`, `past_left-behind`, `past_why-left` — Your Past
- `appearance_data`, `appearance_prompt` — Your Appearance
- `alignment` — Your Compass (alignment_trait removed — player selects alignment card only)

### Draft Keys (Stages 2–4)
- Stage 2: `class_id`, `skills_[classId]`
- Stage 3: `ability_scores` — `{ str, dex, con, int, wis, cha }`
- Stage 4: `appearance_data`, `appearance_prompt` (clothing/weapon slots)

### The Five Anavale Alignments
Presented in Stage 1 Your Compass panel. Player selects one card only. Trait statements below are DM-reference lore — removed from player UI in Pass 13. Compass illustration (`assets/images/img-alignment.webp`) appears above alignment grid.

**Brightward (Lawful Good)** — You believe the world is worth protecting and that the best way to protect it is to be someone others can count on.

**Colorful (Chaotic Good)** — You want to do right by people but you've never been very good at following someone else's idea of how.

**Greywarden (True Neutral)** — You see all sides. You weigh things carefully. You don't think the world is simple enough to be neatly divided into light and dark.

**Steelbound (Lawful Neutral)** — Order is not a cage. Order is how things work. You respect hierarchies, honor agreements, follow through on commitments.

**Ashwalker (Chaotic Neutral)** — You do what works for you, and you try to be honest about that. You're not cruel but you don't pretend to have obligations you don't feel.

---

## Reference Tables

### The Twelve Anavale Species

| Anavale Name | PHB Name | Region | Gigglegloom Affinity |
|---|---|---|---|
| Solmeri | Human | Everywhere | Adaptable |
| Verdathi | Elf | Dingu/Opu/Dodooti Forests | Featherflow, Bubbleseed |
| Stonemarked | Dwarf | Jani Mountains, Tanaki peaks | Steelfist |
| Glimmerkin | Gnome | Bumbleton, Prismhold, Zippydoda Hills | Bubbleseed + Steelfist |
| Hearthbound | Halfling | Pebbleshire, Mirrenport, Caparia | Bubbleseed |
| Duskborn | Tiefling | Veilhaven, Reveltown, scattered | Flamerage, shadow-adjacent |
| Brightblood | Aasimar | Brightcreed temples, Solenveil | Bubbleseed, Oro resonance |
| Scalegrace | Dragonborn | Sohot volcanic, Caparia trade cities | Flamerage |
| Tallwalker | Goliath | Doopu Peaks, Tanaki, Jani Mountains | Steelfist + Flamerage |
| Rootwalker | Orc | Jugabi, outer Dingu Forest | Bubbleseed + Flamerage |
| Veilstepped | Changeling | Everywhere, documented nowhere | Featherflow, Solvara-adjacent |
| Gloomtouched | Warforged | Prismhold, Conclave sites | Steelfist |

### Gigglegloom Type → Class Mapping

| Type | Classes | Flavor |
|---|---|---|
| Bubbleseed | Druid, Cleric, Paladin | Healers, wardens, the faithful |
| Featherflow | Ranger, Rogue, Bard | Wanderers, tricksters, singers |
| Steelfist | Fighter, Monk, Wizard | Soldiers, scholars, disciplined practitioners |
| Flamerage | Sorcerer, Warlock, Barbarian | The volatile, the pact-bound, the furious |

**The player's explicit affinity choice sets `gigglegloom_type` — not the class selection. The two are independent.**

### The 16 Anavale Backgrounds

| # | Anavale Name | PHB Name | Ability Bonuses | Proficiencies | Feat |
|---|---|---|---|---|---|
| 1 | Faithful | Acolyte | +2 Int, +1 Wis | Insight, Religion | Magic Initiate |
| 2 | Streetwise | Criminal | +2 Dex, +1 Int | Deception, Stealth | Alert |
| 3 | Learned | Sage | +2 Int, +1 Wis | Arcana, History | Keen Mind |
| 4 | Tested | Soldier | +2 Str, +1 Con | Athletics, Intimidation | Savage Attacker |
| 5 | Wellborn | Noble | +2 Cha, +1 Int | History, Persuasion | Skilled |
| 6 | Rootborn | Folk Hero | +2 Con, +1 Cha | Animal Handling, Survival | Tough |
| 7 | Masquerader | Charlatan | +2 Cha, +1 Dex | Deception, Sleight of Hand | Skilled |
| 8 | Reveler | Entertainer | +2 Cha, +1 Dex | Acrobatics, Performance | Inspiring Leader |
| 9 | Craftborn | Guild Artisan | +2 Int, +1 Cha | Insight, Persuasion | Skilled |
| 10 | Stillsought | Hermit | +2 Wis, +1 Con | Medicine, Religion | Magic Initiate |
| 11 | Wildborn | Outlander | +2 Str, +1 Wis | Athletics, Survival | Tough |
| 12 | Tidemarked | Sailor | +2 Str, +1 Dex | Athletics, Perception | Tavern Brawler |
| 13 | Cobblewise | Urchin | +2 Dex, +1 Wis | Sleight of Hand, Stealth | Lucky |
| 14 | Greywitnessed | Haunted One | +2 Wis, +1 Str | Arcana, Survival | Alert |
| 15 | Threadpuller | Investigator | +2 Int, +1 Wis | Insight, Investigation | Keen Mind |
| 16 | Ringscarred | Gladiator | +2 Str, +1 Cha | Athletics, Performance | Savage Attacker |

---

## Technical Rules

### CSS Authoring Rules (Enforced)

1. **Variables before components.** Define tokens in `:root` before building any card or pattern.
2. **No inline `style=` attributes.** All styles go in character.css.
3. **No raw `rgba()` or hex values in rules.** Every color must reference a CSS variable. Exceptions: `:root` definitions, canvas JS strings, Gigglegloom badge colors (mirror spells.css by design).
4. **Semantic variable naming only.** `--char-card-bg` not `--char-dark-blue`.
5. **Recurring elements use shared classes.** No one-off cosmetic classes.
6. **No duplicate CSS rules.** Edit the existing rule — never add a second copy.
7. **Minimize variables.** Only add a new variable when no existing one fits and the value appears in more than one rule.

### CSS Variable Reference

**Card surfaces:**
```
--char-card-bg:           rgba(18, 24, 42, 0.95)
--char-card-bg-hover:     rgba(22, 30, 54, 0.98)
--char-card-bg-selected:  rgba(40, 30, 10, 0.95)
--char-card-bg-subtle:    rgba(255, 255, 255, 0.03)
```
**Accent tints and borders:**
```
--char-accent-tint:       rgba(255, 255, 255, 0.08)
--char-accent-border:     rgba(255, 255, 255, 0.3)
--char-accent-border-mid: rgba(255, 255, 255, 0.4)
--char-section-bg:        rgba(10, 14, 24, 0.75)
```
**Text:**
```
--char-text-muted:        rgba(255, 255, 255, 0.8)
--char-text-faint:        rgba(245, 234, 212, 0.65)
```
**Highlight (gold-tinted):**
```
--char-highlight-tint:    rgba(200, 148, 10, 0.1)
--char-highlight-border:  rgba(200, 148, 10, 0.3)
```
**Base:**
```
--char-bg:          #0a0e18
--char-panel:       rgba(10, 14, 24, 0.85)
--char-border:      var(--ink-faint)
--char-border-gold: var(--gold)
--char-radius:      12px
--char-progress-h:  18px
--char-sidebar-w:   240px
```
**Fonts:**
```
--font-headers:  'Charm', serif
--font-serif:    'Cinzel Decorative', Georgia, serif
--font-sans:     'Roboto', system-ui, sans-serif
--font-mono:     'Courier New', Courier, monospace
```

### Tooltip System Rules

The tooltip system lives in an inline `<script>` block in character.html, immediately after `<script src="js/character.js">`. `initTooltips()` in character.js is an **empty stub — it does nothing**. Always use `wireTooltip(el)` directly.

**Three rules:**
1. **Always use `data-tip`, never `title`.** The `title` attribute triggers the native browser tooltip.
2. **Measure after append.** Tooltip boxes must be appended to `<body>` with `visibility:hidden` before reading `offsetHeight`.
3. **Dynamic content needs re-wiring.** After rendering new `[data-tip]` elements, call `wireTooltip(el)` per element. Example: `document.querySelectorAll('#acc-background-body [data-tip]').forEach(wireTooltip)`.

**Finding the inline script:** Search character.html for `tip.dataset.tip`.

**Canonical tooltip HTML pattern — never deviate:**
```javascript
'<span class="char-field-tooltip" data-tip="your tip text here">'
+ '<span class="char-trait-tip-icon">?</span>'
+ '</span>'
```
`data-tip` always on the outer `.char-field-tooltip` wrapper. `char-trait-tip-icon` is the inner visual circle only. Never combine both classes on one span.

### Scroll Offset Rule

Always use `scrollToField(el)` for any programmatic scroll in character.html. It measures fixed element heights at runtime. Never use `scrollIntoView()` or raw `window.scrollTo()` with hardcoded values. Auto-scroll on card clicks was removed in Pass 12 — no auto-scroll remains active.

### Lazy Accordion Render Architecture (Critical — learned June 5 2026)

Stage 1 uses lazy accordion rendering. Cards only exist in the DOM after their accordion opens:
- `acc-magic` — affinity cards rendered on first open
- `acc-background` — background and species cards rendered on first open
- All other accordions — static HTML, always in DOM

**Correct restore pattern:** Set draft → save → let `toggleAccordion` on-open hooks handle visual sync. Never sync lazy-rendered card DOM from outside the accordion open handler.

### Select Option Values — Canonical Reference (learned June 5 2026)

Always verify option values before writing any code that sets selects from draft data:
- Language cards: Anavale IDs (`caparian-deep`, `nombi-frost`) — not PHB names
- Region cards: capitalised (`Caparia`) — compare case-insensitively
- Face/eye/hair selects: display labels (`Dark brown`, `Almond`) — not slugs
- Past question cards: slug IDs (`loyal-animal`, `ended-well`) — not readable strings
- `facial_hair` empty value is `''` not `'none'`
- Age: `young`, `adult`, `middle-aged`, `older`
- Height: `very short`, `short`, `average height`, `tall`, `very tall`
- Build: `slight`, `lean`, `average build`, `athletic`, `stocky`, `heavyset`

### Canvas Text Rule

The Partition animation text in welcome.html is drawn on canvas via `drawText(p)` — never via HTML/CSS. Never add HTML elements inside `#partition-sticky`. If text positioning needs adjustment, change `bottomY` and `lineH` in the `drawText(p)` function.

### Sticky Element Rules (Enforced)

**Always use CSS `position: sticky`. Never use JS scroll listeners to simulate stickiness.**

Why this matters in this codebase:
- `body.char-page` has `overflow-x: hidden` — this creates a new scroll context in Chrome/Safari, making `window.scrollY` and `getBoundingClientRect()` unreliable for scroll detection
- `.char-stage` elements use a `stageIn` CSS animation on mount — any JS that reads element position immediately after stage entry gets the pre-animation value
- CSS `position: sticky` is immune to both problems

**Rules:**
1. Sticky elements use `position: sticky` + `top: Npx` only. No `position: fixed` toggling via JS.
2. Any sticky element must have a fully opaque `background` (e.g. `rgba(8,10,22,0.98)`) — content scrolls behind it.
3. Always include `display: flex` and `align-items` explicitly in sticky container rules — never rely on inherited values.
4. Return banner offset: add `body.banner-visible .element { top: 60px; }` alongside the base rule — do not hardcode banner height into the element's base `top` value.

**z-index ladder:**
| Element | z-index |
|---|---|
| Tooltips | 99999 |
| Confirmation overlay | 200 |
| Return banner | 100 |
| Sticky HUD (Stage 4) | 90 |
| Sticky Stage 3 panel | 50 |

**Stage 4 HUD (`#char-stage4-hud`):**
- `position: sticky; top: 8px; z-index: 90; display: flex; align-items: stretch`
- Background: `rgba(8, 10, 22, 0.98)` — fully opaque
- Compact mode class: `char-hud--stuck` (visual only, not position)
- When return banner visible: `body.banner-visible #char-stage4-hud { top: 60px; }`

---

## `player_characters` — Supabase Column Reference

The actual Supabase `player_characters` table uses these column names. The `character.js` draft keys map as shown:

| Draft key in character.js | Supabase column |
|---|---|
| `who_raised_you` | `who_raised_you` |
| `dearest_friend` | `dearest_friend` |
| `had_pet` | `had_pet` |
| `fallen_in_love` | `fallen_in_love` |
| `organization_joined` | `organization_joined` |
| `left_behind` | `left_behind` |
| `why_you_left` | `why_you_left` |
| `cares_about` | `cares_about` |
| `deepest_fear` | `deepest_fear` |
| `seeking` | `seeking` |
| `contradiction` | `contradiction` |
| `color` | `color` |

```javascript
{
  pc: true,
  player_name: "Adrian",
  player_email: "...",
  token: "abc123...",
  level: 1,
  class_id: "ranger",
  class_gigglegloom: "featherflow",  // player's chosen affinity (NOT auto-assigned from class)
  species: "verdathi",
  background_id: "...",
  ability_scores: { str:10, dex:14, con:13, int:8, wis:12, cha:15 },
  alignment: "brightward",
  hit_points: 10,
  hit_dice: "d10",
  armor_class: 14,
  proficiencies: [...],
  saving_throws: [...],
  skills: [...],          // chosen at Stage 2 + background proficiencies (background is Stage 1)
  languages: ["common", "..."],
  features: [...],
  spells: { cantrips:[], prepared:[], slots:{} },
  attacks: [...],
  starting_equipment: [...],
  appearance_prompt: "Fantasy portrait of...",
  appearance_data: { height, build, age, skin_tone, face_shape, eye_color,
                     eye_shape, glasses, facial_hair, facial_markings,
                     hair_color, hair_style, cloak, top, lower, shoes,
                     hat, accessory, jewelry },
  past_raised: "...",
  past_friend: "...",
  past_pet: "...",
  past_love: "...",
  past_org: "...",
  "past_left-behind": "...",
  "past_why-left": "...",
  creature_bond_tag: "loyal",
  trust_tag: "guarded",
  left_behind_tag: "person",
  personal_quest_seed: "Find them, or find out what happened",
  cares_most_about: "...",
  deepest_fear: "...",
  seeking: "..."
}
```

---

## Credentials (Keep Private)

- **Formspree endpoint:** https://formspree.io/f/xzdwaveg (email backup for character submissions)
- **GitHub token in character.js:** Hardcoded Actions-only dispatch PAT — safe to expose. Token name: `anavale-wiki-character-write`. Scope: Contents Read+Write, repo: carlosknightiii/anavale-wiki only.
- **Supabase anon key:** See project instructions — used in all browser-side Supabase calls
- **DM Tools password:** `anavale-dm` (sessionStorage only, never committed)
- **Setup tab:** Removed June 29 2026 — no longer needed

---

## Live URLs

| URL | Purpose |
|---|---|
| `https://carlosknightiii.github.io/anavale-wiki/character` | Character creator |
| `https://carlosknightiii.github.io/anavale-wiki` | Player wiki |
| `https://carlosknightiii.github.io/anavale-wiki/dm` | DM Tools (password: `anavale-dm`) |

**Local repo:** `Documents/DND/Anavale/Players/anavale-wiki/`

---

*Anavale Character System Project Plan v13.0 — July 2 2026*
*Source of truth for world data: Supabase — https://ebppsgaftzyvftemfeom.supabase.co*
*Source of truth for lore narrative: Anavale_World_Lore.md (local)*
*Source of truth for character creator state: Anavale_CharacterSystem_ProjectPlan_v13.md (local)*
