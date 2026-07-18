# CLAUDE.md — Anavale Wiki Project
*Auto-loaded by Claude Code at session start. Last updated: July 18 2026.*
*For world lore, character system spec, and full SCC state, search project knowledge — do not duplicate here.*

---

## Mandatory First Step — Every Session

1. Run `git log --oneline -5` and confirm HEAD. Report the hash before doing anything else.
2. Search project knowledge for any file or function before touching it.
3. If what you find in the file conflicts with project knowledge, **stop and say so** before writing any edit.
4. Never answer from memory or assumption. If uncertain, read the file first.

---

## Repo & Deployment

**Local path:** `Documents/DND/Anavale/Players/anavale-wiki/`
**GitHub repo:** `github.com/carlosknightiii/anavale-wiki`
**Last known good HEAD:** `ced8db3` (July 5 2026 — "Combat: remove Split to All Players button from mid-combat loot panel")

**Live URLs:**
| URL | Purpose |
|---|---|
| `https://carlosknightiii.github.io/anavale-wiki` | Player-facing wiki |
| `https://carlosknightiii.github.io/anavale-wiki/dm` | DM Tools (password: `anavale-dm`) |
| `https://carlosknightiii.github.io/anavale-wiki/character` | Character creator |

**Git push sequence:**
```bash
cd Documents/DND/Anavale/Players/anavale-wiki
git add -A
git commit -m "..."
git push
```

**Pre-push syntax check (Node v24 — `node --check` does not work on .html files):**
```bash
node -e "require('fs').readFileSync('dm.html','utf8')" 2>&1
```
If the command returns nothing, the file is safe to push. If it throws, fix before pushing.

**Before instructing a push to dm.html:** Show the diff and call out any JS string containing a literal emoji or special character. Push only after the diff is confirmed clean.

**CDN propagation delay:** After `git push`, GitHub Pages can take 5–15 minutes to serve the updated file — even in a fresh incognito window and even after Actions shows "Success". Before concluding a fix didn't land, run:
```bash
curl -s "https://carlosknightiii.github.io/anavale-wiki/dm.html" | grep -c "FUNCTION_OR_STRING"
```
If count is 0 when it should be 1+, wait 5 minutes and re-run. Never write a new fix based on browser behavior without first confirming via curl.

**Site crash recovery (use this, not chained `git revert`):**
```bash
git log --oneline -10
git reset --hard <last-known-good-hash> && git push origin main --force
```

**Git lock file error:** Run `rm -f .git/index.lock` before retrying. Never force-push to resolve a lock.

---

## Architecture: What Lives Where

**Code changes → git push**
All HTML, CSS, and JS files. GitHub Pages serves them.

**Content changes → Supabase only. Never git push for content.**
World data, character data, session data. The `data/*.js` files are legacy seeds — not the source of truth.

**Key files:**
| File | Notes |
|---|---|
| `dm.html` | DM Tools + Session Command Center. Most complex file. Always stale — read before every edit (Rule C1). |
| `character.html` | Character creator shell. Potentially stale every session. |
| `css/character.css` | Character creator styles. Potentially stale. |
| `js/character.js` | Character creator logic. Potentially stale. |
| `sheet/index.html` | Player character sheet. Potentially stale. |
| `js/wiki.js` | Wiki render logic. |
| `js/router.js` | Client-side routing. |
| `css/tokens.css` | Single source of truth for all design tokens. No `:root` blocks anywhere else. |
| `index.html` | Player-facing wiki shell. |

**The five always-stale files** (`dm.html`, `character.html`, `character.css`, `character.js`, `sheet/index.html`) receive frequent edits. For any edit to these files: read the current file state first, confirm the exact anchor, then write the edit. Never assume.

---

## Supabase

**URL:** `https://ebppsgaftzyvftemfeom.supabase.co`
**Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicHBzZ2FmdHp5dmZ0ZW1mZW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MTA3ODIsImV4cCI6MjA5ODE4Njc4Mn0.C0q7wPpNjXrFPWzCzXcPuR_4n8txumOxxSvzWZkVAFg`
**Region:** us-east-1 · **Free tier** — kept alive by GitHub Actions ping every 5 days
**Supabase MCP** is connected to Claude in chat sessions — query the DB directly without the DM pasting anything.

**Tables (world):** `regions` · `nations` · `cities` · `creatures` · `organizations` · `world_characters` · `pois` · `religions` · `items` · `spells` · `species` · `quests`
**Tables (player):** `player_characters` · `character_sheet` · `inventory` · `character_notes` · `character_photo`
**Tables (session):** `session_notes` · `quest_progress`
**Storage:** `world-images` (public) · `character-photos` (private)

**RLS:** All world tables have anon SELECT enabled. Wiki filters `player_facing` at render time.
**`read_aloud` column:** Present on `world_characters`, `cities`, `pois`, `creatures`, `items`.
**`session_scenarios` jsonb:** On `session_notes` — read by SCC Live Session tab accordion.

Before writing any code that reads or writes data, check this list. If it belongs in Supabase, use the Supabase JS client. Never read from `data/*.js` in new code.

---

## Enforced Rules — Debugging (D Rules)

These exist because iterating on symptoms wastes time. Violating them is the most common source of wasted tokens on this project.

**D1 — 2-attempt hard limit (non-negotiable).** If a fix fails twice, STOP. Do not write a third variation. Something is wrong with the diagnosis, not the fix. After 2 failed attempts, say: *"I have reached the 2-attempt limit. I will not write another fix until I have read the exact current state of the broken code and identified the specific line that is wrong."*

**D2 — Diagnose before touching anything.** Read the actual broken code. Identify the exact line that is wrong and state precisely why it produces the observed behaviour. If uncertain, say so.

**D3 — Fix in one shot.** Once the root cause is identified, write one targeted fix. Do not patch symptoms.

**D4 — "Stop. Think. One fix."** When the DM writes this: halt all iteration. Re-read relevant code from scratch. State the root cause in plain English. Write one fix. Do not explain previous attempts.

**D5 — "Rewrite from first principles."** When the DM writes this: discard all accumulated edits. Write a clean version from scratch.

**D6 — Never answer without evidence.** Before answering any question about the project — code, UI, file structure, feature behavior — read the file or search project knowledge first. Never fill a gap with a plausible-sounding answer. If the answer cannot be confirmed, say "I don't know — let me check" and search before responding.

**D7 — When the DM corrects a factual claim:** Stop immediately. Do not defend the previous answer. Correct the record in the Decision Log before writing any code.

---

## Enforced Rules — Site Integrity (C Rules)

These exist because a single bad character in a JS string caused a full-site crash that took hours to recover from.

**C1 — Read dm.html before every edit. No exceptions.** For any edit to dm.html, read the current state of the target function with line numbers before writing the replacement. Project knowledge is never sufficient — the file changes every session.

**C2 — No literal emoji in JS strings.** All emoji and special characters inside JS string literals in HTML files must use `&#decimal;` entities or `\uXXXX` escapes. A single literal emoji produces `Uncaught SyntaxError: Invalid or unexpected token at dm:1:1` — crashing the entire page with no useful error message.
- Safe: `&#128203;` or `\u2014`
- Unsafe: literal 📋 or — inside a quoted JS string

**C3 — Pre-push confirmation for dm.html.** Before any dm.html push, show the diff and confirm: no literal emoji in JS strings, no unmatched quotes. Push only after confirmed clean.

**C4 — Site crash recovery: `git reset --hard`, not `git revert` chains.** See recovery command above.

**C5 — Rejected diagnosis is confirmed wrong. Stop completely.** If Claude has stated a diagnosis and the DM says it is wrong, stop all iteration immediately. Read the actual current code state. State the new diagnosis with the specific line and reason. Write one fix after the new diagnosis is confirmed.

---

## Enforced Rules — Code Authoring

**Emoji/entity rule (mirrors C2):** Never introduce literal emoji in JS strings when editing any file. Use HTML entities or Unicode escapes.

**sed scope rule:** When running sed or regex replacements, always show the diff before committing. Blind sweeps can corrupt historical/logged text if the regex isn't scoped correctly.

**CSS authoring rules:**
1. Variables before components. Define tokens in `:root` before building any card or pattern.
2. No inline `style=` attributes. All styles go in character.css.
3. No raw `rgba()` or hex values in rules — every color references a CSS variable. Exceptions: `:root` definitions and canvas JS strings.
4. Semantic variable naming: `--char-card-bg` ✓ · `--char-dark-blue` ✗
5. Recurring elements use shared classes. No one-off cosmetic classes.
6. No duplicate CSS rules. Edit the existing rule.
7. Minimize variables — only add a new variable when the value appears in more than one rule.

**Tooltip rule:** Always use `data-tip`, never `title`. `initTooltips()` in character.js is an empty stub — use `wireTooltip(el)` directly. Dynamic content must call `wireTooltip(el)` per element after rendering.

**Sticky rule:** Always use CSS `position: sticky`. Never JS scroll listeners for sticky behaviour. `body.char-page` has `overflow-x: hidden` which breaks `window.scrollY` in Chrome/Safari.

**Fixed overlay rule:** Before adding any `position:fixed` or `position:absolute;inset:0` element to character.html, confirm: (1) the z-index it will use, (2) `pointer-events:none` is set unless interaction is required, (3) it will be removed from the DOM after use.

**Canvas text rule:** Text in the Partition animation is drawn on canvas via `drawText(p)` — never via HTML/CSS. Never add HTML elements inside `#partition-sticky`.

---

## Design Tokens (Locked — July 2 2026)

All design tokens live in `css/tokens.css` — the single source of truth. No `:root` blocks anywhere else.

**Two fonts only:**
- `--font-display: 'Cinzel Decorative', Georgia, serif` — all headings (Bold 700 only)
- `--font-body: 'Roboto', system-ui, sans-serif` — all body text, labels, UI (Light 300 / Regular 400 / Bold 700)
- `--font-mono: 'Courier New', Courier, monospace` — Formery stamps, code blocks

**Aliases (backward compat):** `--font-headers` → `var(--font-display)` · `--font-serif` → `var(--font-display)` · `--font-sans` → `var(--font-body)`

**One gold:** `#f0b429` everywhere. Old `#c8940a` retired. Charm and EB Garamond retired — do not re-add.

**Google Fonts load:** `Cinzel+Decorative:wght@700 + Roboto:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700`

---

## Session End Requirements

At the end of any session where features were built, fixed, or substantially changed:
1. Append an entry to the Decision Log below (date, what changed, why).
2. If any rule above turned out to be wrong or incomplete, correct it in this file and commit.
3. If a new bug pattern was discovered, add it to the Decision Log.
4. Do not wait to be asked — this is a standing requirement.

---

## Decision Log

*Append-only. Most recent entry at top.*

---

**2026-07-18 — Migrated from Cowork to Claude Code workflow**
Anthropic merged Claude Chat and Cowork into one unified system (July 7 2026). Cowork sessions were hard to find afterward and could silently disappear or get stuck on git lock conflicts. Claude Code (Code tab in Claude Desktop) is now the standard for all file edits and git operations — it has direct real-time filesystem and git access, and auto-loads this CLAUDE.md at session start. Claude Chat (browser/app) remains the tool for planning, strategy, and review. The Cowork instructions file (`Anavale_Project_Instructions_Cowork_v11.md`) is retired — its load-bearing rules are now in this file.

**2026-07-05 — Session 1 complete. All 7 SCC tabs QA'd.**
HEAD: `ced8db3`. SCC: Setup ✅ · NPCs ✅ · Locations ✅ · Quests ✅ · Combat ✅ · Notes ✅ · Live Session ✅. session_scenarios populated (8 groups, 44+ rows). Player handout created. 30+ commits this session across two chats.

**2026-07-04 — Landmarks retired. species table seeded. Docs audited.**
`structures` with `landmark: true` replaces the landmarks system. 141 lines of landmark JS removed from dm.html. Supabase `species` table created and seeded with all 12 canonical IDs. Project Instructions bumped to v18, Cowork Instructions to v11. Google Fonts Charm reference corrected. Node v24 syntax check workaround documented.

**2026-07-03 — Location enrichment + SCC Live Session tab built.**
Wiki `renderCity()` now renders population breakdown and structures. DM Tools city form fully rebuilt with Supabase species dropdown, percentage sliders with auto-rebalance, live pie chart, structures accordions. SCC Live Session tab (7th tab): quest beats, party HP, conditions, die roller, Timer, NPC chips, scenario accordions, quick note capture. `read_aloud` column added to 5 Supabase tables. Gobblewump Crossing fully populated in Supabase.

**2026-07-02 — Design token system. SCC NPCs + Quick Look rebuilt.**
`css/tokens.css` created as single source of truth. All `:root` blocks removed from all HTML/CSS files. Cinzel Decorative + Roboto only. One gold (#f0b429). SCC NPCs tab: full-width accordion cards, circular portrait, relationship badge. Quick Look panel: widened to 500px, NPC-style redesign.

**2026-06-30 — Character sheet built (HP, Inventory, Notes). GitHub Actions keep-alive.**
`sheet/index.html`: HP with max modifier, Inventory with catalog search + fuzzy-match gate + drag-reorder + weight total, Notes with contenteditable + wiki-entry autocomplete linking. Keep-alive workflow pings Supabase every 5 days to prevent free-tier auto-pause. DM Tools Players tab added.

**2026-06-28 — Supabase migration complete.**
All world data migrated from `data/*.js` to Supabase. Character creator writes directly to `player_characters`. Wiki reads live from Supabase. DM Tools fully Supabase-integrated (reads, writes, image uploads to Storage). File-based save UI removed. `data/*.js` files are legacy seeds only.