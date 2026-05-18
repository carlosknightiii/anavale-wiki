# Anavale Wiki

Player-facing wiki for the **Anavale** D&D campaign (Pogglewog continent). Built as a single-page application with no build step — open `index.html` directly in a browser or serve via GitHub Pages.

---

## File Structure

```
anavale-wiki/
├── index.html              # Main wiki shell (HTML only — no inline CSS or JS)
├── welcome.html            # Animated world introduction for new players
│
├── css/
│   ├── wiki.css            # Core styles: layout, sidebar, parchment theme, typography
│   └── spells.css          # Spellbook section styles (tabs, cards, modal)
│
├── js/
│   └── wiki.js             # Navigation, search, wiki-linking, spellbook UI
│
├── data/
│   ├── spells.js           # SPELL_DATA (spell list) + SPELL_STATS (full spell details)
│   ├── regions.js          # REGION_DATA — 4 regions: caparia, nombi, sohot, jugabi
│   ├── nations.js          # NATION_DATA — 15 nations across all regions
│   ├── cities.js           # CITY_DATA — 24 settlements across all regions
│   ├── creatures.js        # CREATURE_DATA — 50 creatures across all tiers and categories
│   ├── organizations.js    # ORGANIZATION_DATA — 15 organizations (light, neutral, dark)
│   ├── characters.js       # CHARACTER_DATA — 12 key characters (villains, allies, gods)
│   └── index.js            # WORLD_DATA unified index + worldSearch() + filter helpers
│
├── assets/
│   ├── icons/              # SVG icons for the four Gigglegloom types
│   │   ├── icon-bubbleseed.svg
│   │   ├── icon-featherflow.svg
│   │   ├── icon-steelfist.svg
│   │   └── icon-flamerage.svg
│   ├── images/
│   │   ├── regions/        # Region header images (caparia.jpg, nombi.jpg, etc.)
│   │   └── creatures/      # Creature images
│
└── pages/                  # Reserved for future page partials / expansion content
```

---

## Script Load Order

`index.html` loads files in this order:

```html
<link rel="stylesheet" href="css/wiki.css">
<link rel="stylesheet" href="css/spells.css">
...
<script src="data/spells.js"></script>
<script src="data/regions.js"></script>
<script src="data/nations.js"></script>
<script src="data/cities.js"></script>
<script src="data/creatures.js"></script>
<script src="data/organizations.js"></script>
<script src="data/characters.js"></script>
<script src="data/index.js"></script>
<script src="js/wiki.js"></script>
```

All `data/*.js` files must load before `js/wiki.js`. Each file declares a `var` array. `data/index.js` loads last among the data files and assembles `WORLD_DATA` from all arrays, plus exports `worldSearch()` and filter helpers (`getByRegion`, `getByTag`, `getByAlignment`, `getById`).

---

## CSS Custom Properties

All design tokens live in the `:root` block at the top of `css/wiki.css`. Key categories:

| Group | Variables |
|---|---|
| Color palette | `--parchment`, `--ink`, `--gold`, `--amber`, `--teal`, `--violet` |
| Type colors | `--bubbleseed`, `--featherflow`, `--steelfist`, `--flamerage` |
| Layout | `--sidebar-w`, `--content-pad`, `--section-gap`, `--card-radius` |
| Typography | `--font-serif`, `--text-base` through `--text-3xl`, `--line-height` |
| Decoration | `--shadow-sm/md/lg`, `--border-color` |

---

## Key JS Functions (js/wiki.js)

| Function | Purpose |
|---|---|
| `show(id)` | Navigate to a page by ID (toggles `.active` class) |
| `addWikiLinks()` | Auto-links recognized lore terms to their wiki pages |
| `renderSpells()` | Renders the filtered/paginated spell list |
| `openSpellModal(name)` | Opens the full spell detail modal |

---

## Deployment

The wiki deploys via **GitHub Pages** from the `main` branch root. Push to `main` → live at your Pages URL within ~60 seconds.

---

## DM Tools

A private content management system lives at `dm.html` (same directory as `index.html`). It is **not linked** from any player-facing page.

**Access:** Open `dm.html` directly in a browser and enter the password when prompted. Authentication persists for the session (uses `sessionStorage`).

**What it does:** Provides six form-based generators — City, Creature, Point of Interest, Character, Organization, and Item. Each form collects all fields matching the appropriate data file schema, then generates a ready-to-paste JS object literal. The output panel shows:

- The target data file (e.g. `📁 Add this entry to: data/cities.js`)
- The formatted JS object literal
- A **Copy JSON** button
- A **Save to Data File** button (uses the File System Access API in Chrome/Edge; falls back to clipboard in other browsers)

A **Recently Added** panel tracks the last 10 generated entries via `localStorage` so entries can be recovered if the tab is closed.

**Image folders** (created alongside `dm.html`):

```
assets/images/characters/      # Character portrait images
assets/images/organizations/   # Organization seals and sigils
assets/images/items/           # Item images
```

Existing folders: `assets/images/regions/` and `assets/images/creatures/`.

---

## Campaign Notes

- **Ruleset:** 2024 D&D 5e Player's Handbook
- **Setting:** Anavale, continent of Pogglewog
- **Magic system:** The Gigglegloom (four types: Bubbleseed, Featherflow, Steelfist, Flamerage)
- **Tone:** Disney-inspired high fantasy with a dark undercurrent (the Vareth, the Dimming)
