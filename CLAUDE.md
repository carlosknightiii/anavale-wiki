# CLAUDE.md — Anavale Wiki Project
*Auto-loaded by Claude Code at session start. Last updated: July 23 2026.*

**Tool roles:**
- **Claude Code** — all file edits, git operations, debugging
- **Claude Chat** — planning, strategy, review
- **DM Tools → Supabase** — all world/content/session data changes

**What lives where (never duplicate here):**
- World lore, nations, creatures, session notes → search `anavale-dm-docs` in project knowledge
- Character system spec, SCC state, stage structure → search `docs/` in project knowledge
- Code state → read the actual file before every edit

---

## 1. Every Session

**Start:**
1. Run `git log --oneline -5` and report HEAD before doing anything else.
2. Search project knowledge for any file or function before touching it.
3. If what you find in the file conflicts with project knowledge, stop and say so.
4. Never answer from memory or assumption — read the file first.

**End (standing requirement — do not wait to be asked):**
1. Append an entry to the Decision Log (date, what changed, why).
2. Update "Current Focus" below to reflect what comes next.
3. If any rule turned out to be wrong or incomplete, correct it here and commit.
4. If a new bug pattern was discovered, add it to the Decision Log.

---

## 2. Current Focus

*Session July 23 2026 — Infrastructure & cleanup.*
- Supabase keep-alive updated to 3-day schedule, confirmed working.
- Local folder restructured: `anavale-wiki/` moved to `Anavale/` root, `anavale-assets/` created.
- `anavale-dm-docs` connected to Claude Chat project context.
- `CLAUDE.md` rewritten and updated.

**Next priorities (post-Session 1):**
- `sheet/index.html` improvements: combat tab, ability panel, condition tooltips, XP display
- Character creator migration to Supabase `species` table
- Interactive Caparia map
- Session recap page (player-facing, post-Session 2)

---

## 3. Repo & Deployment

**Local path:** `Documents/DND/Anavale/anavale-wiki/`

    Documents/DND/Anavale/
    ├── anavale-wiki/          ← this repo (public git)
    ├── anavale-dm-docs/       ← private git repo (DM spoiler files)
    └── anavale-assets/        ← non-git large files (mockups, world art, etc.)

**GitHub repo:** `github.com/carlosknightiii/anavale-wiki`

**Live URLs:**
| URL | Purpose |
|---|---|
| `https://carlosknightiii.github.io/anavale-wiki` | Player-facing wiki |
| `https://carlosknightiii.github.io/anavale-wiki/dm` | DM Tools (`anavale-dm`) |
| `https://carlosknightiii.github.io/anavale-wiki/character` | Character creator |

**Git push sequence:**

    cd Documents/DND/Anavale/anavale-wiki
    git add -A
    git commit -m "..."
    git push

**Pre-push syntax check (Node v24 — `node --check` does not work on .html files):**

    node -e "require('fs').readFileSync('dm.html','utf8')" 2>&1

Returns nothing = safe. Throws = fix before pushing.

**CDN propagation delay:** GitHub Pages can take 5–15 minutes after a successful push. Before concluding a fix didn't land:

    curl -s "https://carlosknightiii.github.io/anavale-wiki/dm.html" | grep -c "FUNCTION_OR_STRING"

Count 0 when it should be 1+ = CDN hasn't propagated. Wait 5 minutes, re-run. Never write a new fix based on browser behavior without confirming via curl first.

**Site crash recovery:**

    git log --oneline -10
    git reset --hard <last-known-good-hash> && git push origin main --force

Use `git reset --hard`, not chained `git revert`. Chained reverts create indeterminate state.

**Git lock error:** `rm -f .git/index.lock` before retrying. Never force-push to resolve a lock.

---

## 4. Architecture

**Code changes → git push.** HTML, CSS, JS files only.
**Content changes → Supabase only. Never git push for content.** The `data/*.js` files are legacy seeds — not the source of truth. Never read from them in new code.

**Key files:**
| File | Notes |
|---|---|
| `dm.html` | DM Tools + SCC. Most complex file. Always stale — Rule C1 applies. |
| `character.html` | Character creator shell. Potentially stale every session. |
| `css/character.css` | Character creator styles. Potentially stale. |
| `js/character.js` | Character creator logic. Potentially stale. |
| `sheet/index.html` | Player character sheet. Potentially stale. |
| `js/wiki.js` | Wiki render logic. |
| `js/router.js` | Client-side routing. |
| `css/tokens.css` | Single source of truth for all design tokens. No `:root` blocks anywhere else. |
| `index.html` | Player-facing wiki shell. |

**The five always-stale files:** `dm.html`, `character.html`, `css/character.css`, `js/character.js`, `sheet/index.html` — read the current file state before every edit. Never assume. Never use project knowledge as a substitute for reading these files.

---

## 5. Supabase

**URL:** `https://ebppsgaftzyvftemfeom.supabase.co`
**Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicHBzZ2FmdHp5dmZ0ZW1mZW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MTA3ODIsImV4cCI6MjA5ODE4Njc4Mn0.C0q7wPpNjXrFPWzCzXcPuR_4n8txumOxxSvzWZkVAFg`
**Region:** us-east-1 · Free tier — kept alive by GitHub Actions every 3 days (targets `species` table, exits 1 on non-200).
**Supabase MCP** is connected to Claude Chat — query the DB directly without the DM pasting anything.

**Tables (world):** `regions` · `nations` · `cities` · `creatures` · `organizations` · `world_characters` · `pois` · `religions` · `items` · `spells` · `species` · `quests`
**Tables (player):** `player_characters` · `character_sheet` · `inventory` · `character_notes` · `character_photo`
**Tables (session):** `session_notes` · `quest_progress`
**Storage:** `world-images` (public) · `character-photos` (private)

**RLS:** All world tables have anon SELECT enabled. Wiki filters `player_facing` at render time.
**`read_aloud` column:** Present on `world_characters`, `cities`, `pois`, `creatures`, `items`.
**`session_scenarios` jsonb:** On `session_notes` — read by SCC Live Session tab accordion.

---

## 6. Debugging Rules (D1–D7)

**D1 — 2-attempt hard limit (non-negotiable).** If a fix fails twice, STOP. Do not write a third variation. Something is wrong with the diagnosis, not the fix. Say: *"I have reached the 2-attempt limit. I will not write another fix until I have read the exact current state of the broken code and identified the specific line that is wrong."*

**D2 — Diagnose before touching anything.** Read the actual broken code. Identify the exact line that is wrong and state precisely why it produces the observed behaviour. If uncertain, say so.

**D3 — Fix in one shot.** Once the root cause is identified, write one targeted fix. Do not patch symptoms.

**D4 — "Stop. Think. One fix."** When the DM writes this: halt all iteration. Re-read relevant code from scratch. State the root cause in plain English. Write one fix. Do not explain previous attempts.

**D5 — "Rewrite from first principles."** When the DM writes this: discard all accumulated edits. Write a clean version from scratch.

**D6 — Never answer without evidence.** Before answering any question about the project — code, UI, file structure, feature behavior — read the file or search project knowledge first. If the answer cannot be confirmed, say "I don't know — let me check."

**D7 — When the DM corrects a factual claim:** Stop immediately. Do not defend the previous answer. Correct the record in the Decision Log before writing any code.

---

## 7. Site Integrity Rules (C1–C5)

**C1 — Read dm.html before every edit. No exceptions.** Read the current state of the target function with line numbers before writing any replacement. Project knowledge is never sufficient.

**C2 — No literal emoji in JS strings.** All emoji and special characters inside JS string literals in HTML files must use `&#decimal;` entities or `\uXXXX` escapes. A single literal emoji produces `Uncaught SyntaxError: Invalid or unexpected token at dm:1:1` — crashing the entire page with no useful error message.
- Safe: `&#128203;` · `—`
- Unsafe: literal 📋 or — inside a quoted JS string

**C3 — Pre-push confirmation for dm.html.** Before any dm.html push, show the diff and confirm: no literal emoji in JS strings, no unmatched quotes.

**C4 — Site crash recovery: `git reset --hard`, not `git revert` chains.** See Section 3.

**C5 — Rejected diagnosis is confirmed wrong. Stop completely.** If the DM says a diagnosis is wrong, stop all iteration. Read the actual current code state. State the new diagnosis with the specific line and reason. Write one fix only after the new diagnosis is confirmed.

---

## 8. Code Authoring Rules

**Claude Code prompts containing code blocks:**
Always use a bash heredoc when writing file contents that include backtick code blocks. Never wrap such a prompt in a fenced code block — inner backticks will break the outer fence and content will be silently dropped.

    cat > filename.md << 'ENDOFFILE'
    ...content with any backticks, code blocks, special characters...
    ENDOFFILE

**JS strings (all files):**
- Never use literal emoji in JS strings — use `&#decimal;` or `\uXXXX` (mirrors C2)
- When running sed or regex replacements, always show the diff before committing

**CSS (`character.css`, `tokens.css`):**
- Define `:root` tokens before any component rules
- No inline `style=` attributes — all styles go in character.css
- No raw `rgba()` or hex in rules — every color references a CSS variable (exceptions: `:root` definitions and canvas JS strings)
- Semantic variable naming: `--char-card-bg` ✓ · `--char-dark-blue` ✗
- Shared elements use shared classes — no one-off cosmetic classes
- No duplicate rules — edit the existing rule, never add a second copy
- Only add a new variable when the value appears in more than one rule

**Tooltips (`character.js`, `character.html`):**
- Always `data-tip`, never `title` — `title` triggers native browser tooltip
- `initTooltips()` is an empty stub — use `wireTooltip(el)` directly
- Static HTML wires automatically on DOMContentLoaded
- Dynamic content must call `wireTooltip(el)` per element after rendering

**Positioning (`character.html`):**
- Always `position: sticky` — never JS scroll listeners for sticky behaviour
- `body.char-page` has `overflow-x: hidden` which breaks `window.scrollY` in Chrome/Safari
- Before adding any `position:fixed` or `position:absolute;inset:0` element: confirm z-index, confirm `pointer-events:none` unless interaction required, confirm it will be removed from DOM after use

**z-index ladder:**
| Element | z-index |
|---|---|
| Tooltips | 99999 |
| Confirmation overlay | 200 |
| Return banner | 100 |
| Sticky HUD (Stage 4) | 90 |
| Sticky Stage 3 panel | 50 |

**Modals (`sheet/index.html`):**
- All modals must be injected into `#cs-modal-root` — a direct sibling of `<main id="cs-main">` inside `<body>`
- Never build modals as part of `renderCharacter()`'s HTML string
- Reason: `.cs-wrap` has a `cs-fadein` animation with `forwards` fill-mode — any `animation`, `transform`, `filter`, or `perspective` on an ancestor creates a new containing block for `position:fixed` descendants, breaking them silently. Symptom: modal appears at the top of the page regardless of scroll position.

**Canvas (`welcome.html`):**
- Partition animation text is drawn via `drawText(p)` — never via HTML/CSS
- Never add HTML elements inside `#partition-sticky`

---

## 9. Design Tokens

All tokens live in `css/tokens.css` — single source of truth. No `:root` blocks anywhere else.

**Fonts (two only):**
- `--font-display: 'Cinzel Decorative', Georgia, serif` — all headings, Bold 700 only
- `--font-body: 'Roboto', system-ui, sans-serif` — all body text, labels, UI (300/400/700)
- `--font-mono: 'Courier New', Courier, monospace` — Formery stamps, code

**Aliases:** `--font-headers` → `var(--font-display)` · `--font-serif` → `var(--font-display)` · `--font-sans` → `var(--font-body)`

**Gold:** `#f0b429` everywhere. Old `#c8940a` retired. Do not re-add Charm or EB Garamond.

**Google Fonts load:** `Cinzel+Decorative:wght@700 + Roboto:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700`

---

## 10. Decision Log

*Append-only. Most recent entry at top. Entries older than 60 days are summarised to one line.*

---

**2026-07-23 — Infrastructure session. CLAUDE.md rewritten.**
Supabase restored from inactive state. Keep-alive updated from 5-day to 3-day schedule, confirmed working (HTTP 200). Local folder restructured: `anavale-wiki/` moved to `Anavale/` root, `anavale-assets/` created for non-git files, `DM/` deleted (files already in `anavale-dm-docs`). `anavale-dm-docs` connected to Claude Chat project context — DM reference files now auto-sync, no manual uploads needed. CLAUDE.md rewritten: removed stale HEAD hash, added Current Focus section, consolidated always-stale files, trimmed Decision Log, reorganised Code Authoring rules by area. Heredoc rule added to Code Authoring.

**2026-07-18 — Migrated from Cowork to Claude Code. CLAUDE.md created.**
Claude Code is now standard for all file edits and git operations. Cowork retired. `CLAUDE.md` created and pushed. Project plan moved into `docs/`. `anavale-dm-docs` private repo created.

**2026-07-05 — Session Zero complete. All 7 SCC tabs QA'd.** Character creation session run. HEAD at session end: `ced8db3`. session_scenarios populated (8 groups, 44+ rows). Player handout created. Session 1 not yet run.

**2026-07-04 — Landmarks retired. species table seeded.** `structures` replaces landmarks. 141 lines removed from dm.html. Supabase `species` table seeded with 12 canonical IDs.

**2026-07-03 — Location enrichment + SCC Live Session tab.** Population breakdown and structures in wiki. City form rebuilt. Live Session tab (7th SCC tab) built. `read_aloud` column added to 5 tables.

**2026-07-02 — Design token system. SCC NPCs + Quick Look rebuilt.** `css/tokens.css` created. Cinzel Decorative + Roboto only. One gold (#f0b429).

**2026-06-30 — Character sheet built. Keep-alive workflow created.** HP, Inventory, Notes in `sheet/index.html`. Keep-alive pings Supabase every 3 days.

**2026-06-28 — Supabase migration complete.** All world data in Supabase. `data/*.js` files are legacy seeds only.
