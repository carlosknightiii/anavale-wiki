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

*Session Aug 8 2026 — fixed "Your Past" data-loss bug, built imagined-past mechanical effects (ability/skill/gold/feat/DM-item), fixed a second starting-gold bug, fully backfilled the 3 existing characters (all Your Past answers, all mechanical effects, correct gold) including their display on the live sheet. See Decision Log for full detail.*
- All code committed and pushed, all Supabase changes live. `character.html`, `dm.html`, `js/character.js`, `sheet/index.html` all touched this session.
- `sheet/index.html` displays `skill_bonuses` ("Bonus skills" row in Your Past), `feats` (chips with rules text in Ability Scores), `dm_pending_items` ("Pending From Your DM" section). Verified against all 3 real characters' real data.
- Hana, Kael, Visenya now have all 7 "Your Past" answers (DM re-collected the 6 lost to the original bug), all mechanical effects from those answers applied, and correct starting gold (background gold − real Stage 4 shopping spend + any org gold bonus — see Decision Log for the `BG_GOLD`-was-disconnected-from-real-values bug this uncovered).
- Still not built (not requested): background feats' non-HP effects (e.g. Alert's +5 initiative, can't-be-surprised) aren't wired to anything mechanical — only the feat name + rules text display, and Tough's HP interaction, exist. No initiative field exists on `character_sheet` to wire Alert to yet. Also not built: inventory purchases don't auto-deduct `gold_cp` anywhere (confirmed absent, not a regression — flagged as a possible future feature, not built).
- Fourth data-loss bug found same day: `player_characters.skills` (class skill proficiencies) was never written by `buildCharacterEntry()` — fixed for future characters. All 3 existing characters have `skills: []` and it's unrecoverable (the draft that held it is deleted from localStorage on submit, nothing server-side ever captured it) — DM re-collection is the only path, same as "Your Past". Not yet re-collected. See Decision Log.

*Prior session — Aug 7 2026 — character sheet redesign (docs/character-sheet-redesign-handoff.md), Overview + Ability Scores pass.*
- Redesigned `sheet/index.html` Overview + Ability Scores sections per Figma `P0tcVgf02XeI13Tz0TtRaX` (desktop 36:310 / mobile 36:435). Replaced `cs-hero` / `cs-type-banner` / the Class-Species-Background-Alignment-Region-Level-Pronouns-Language rows of `cs-identity-grid` with the new design — decision confirmed with DM (replace, not duplicate-alongside). Pronouns dropped from display (derived from gender, no independent field). New wide `.cs-ov-breakout` container (max-width 1560px) used only for these two sections, breaking out of `.cs-wrap`'s 820px cap — rest of the page unchanged. Photo upload (`cs-hero-portrait-img` / `cs-photo-input` ids preserved) kept working on the new portrait card per DM confirmation.
- New tokens in `css/tokens.css`: `--currency-copper/silver/gold-coin`, `--blue-200/700`, `--ability-{str,dex,con,int,wis,cha}-glow/gradient`, `--char-ov-h3/h4`, `--char-ov-gap-2xs/xs/s/m` — reused existing tokens (`--radius-sm/lg`, `--text`, `--gold`, `--steelfist` etc.) everywhere they matched a Figma-bound value exactly.
- Currency: new cp/sp/gp inputs in the portrait card (`renderOverviewMoney()` / `onOverviewMoneyChange()`) combine/split through the same `gold_cp` field and `saveSheet()` path as the existing Gold section's `setGold()`/`renderGold()` — both stay in sync, called from `renderLivePlay()`.
- Weight bar: capacity = STR × 15, current = `computeCarriedWeight()` (factored out of `renderInventory()`, same full-inventory sum as `cs-inv-weight-total` — confirmed equipped items stay as `inventory` rows with `equipped_slot` set, so this total already included them).
- Class card in Overview reads a new `classes` table (`fetchClassData()`, `CLASS_ROW` global) — table doesn't exist yet, so it renders "—" placeholders until the migration below runs; errors are swallowed, no crash.
- Overview blurb + card subtitles reuse only real existing data (`ANAVALE_SPECIES`/`ANAVALE_BACKGROUNDS`/`ALIGNMENT_PHB`/`GIGGLEGLOOM_TYPES` mirrored into `sheet/index.html`'s own lookup tables, since sheet doesn't load `character.js`) — no invented lore. One gap found and left unbuilt: the Figma mockup's alignment-card "(Gladiator)"-style archetype subtitle has no canon source for backgrounds — only the background's own PHB-equivalent exists, which is what's shown.
- **Pending DM review, not yet run:** `classes` table migration (schema in handoff §6) — all 12 rows map directly from `CLASS_DATA` in `js/character.js`; `tools`/`casting_summary` (new fields, not in `CLASS_DATA`) were drafted and are awaiting DM sign-off before the migration executes.
- `generateSummary()` in `js/character.js` rewritten per handoff §8: six paragraphs (Who Are You / Your Magic / Your Background / Your Past / Your Appearance / Your Compass, same labels as the Stage 1 accordion), gendered pronouns (not generic "they"), organic length via per-field template functions, empty fields omitted entirely. Storage format: plain text, `LABEL\n\nparagraph`, sections joined by `\n\n\n`. Live preview element `char-auto-summary` changed from `<p>` to `<div>` (character.html) so multi-paragraph `innerHTML` can render; new `.char-summary-heading` CSS added to `character.css`.
- **Bugs found but NOT fixed (out of scope for this pass, flagging for a follow-up session):**
  - `sheet/index.html` portrait fallback (`assets/images/species/{species}-{suffix}.webp`) 404s for every character without an uploaded photo — real files are named `sp-{species}-{suffix}.png`. Pre-existing, untouched by this session.
  - `css/character.css` has two separate `.char-summary-body` rule blocks (~2623 and ~3186) — pre-existing duplicate, violates the "no duplicate rules" convention in §8 of this file.
  - `sheet/index.html`'s own (untouched) "Your Past" section still uses a different/stale set of `WHY_LEFT_LABELS`/`RAISED_LABELS` option values than the real character-creator form options — predates this session, not touched since that section is out of scope.
- Added `.claude/launch.json` (static file server on :8791) for local UI verification going forward — not previously present.

**Next priorities:**
- Run the `classes` table migration once DM confirms the tools/casting_summary drafts.
- Fix the species-portrait 404 (real fix: correct the filename pattern to `sp-{species}-{suffix}.png`).
- `sheet/index.html`: combat tab, condition tooltips, XP display
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

**2026-08-08 — Backfilled `skills` for the 3 characters; added its display to the live sheet.**
DM provided each player's final chosen class skills directly (no re-collection needed, unlike the other backfills — these were simply given). Casing verified against `CLASS_DATA[cls].skills_list` (same Title Case convention `skill_bonuses` already uses) before writing, not guessed. Backfilled: Hana (Druid) Nature, Insight; Kael (Ranger) Perception, Survival, Animal Handling; Visenya (Warlock) Arcana, Deception.
Display: `sheet/index.html` had no UI for `skills` at all (confirmed dead column in the entry above) — added a "Proficient skills" row in the Your Past story block, right next to the existing "Bonus skills" row, same `.cs-story-row` pattern, no new CSS. Verified against all 3 real characters' real data.

**2026-08-08 — Full character-creator field audit: no further data-loss bugs found; 3 dead fields identified.**
After four data-loss bugs found one at a time this session (six `past_*` fields, then class skills), did a systematic pass instead of waiting for the next one to surface by accident. Enumerated every `<input>`/`<select>`/`<textarea>`/checkbox in `character.html` (grep-verified complete), traced each into `CHAR_STATE.draft`, confirmed every key `buildCharacterEntry()` reads matches a real `player_characters` column in both directions (no orphaned keys either way), then ran a live test — one fully-populated draft covering every field, through the real `buildCharacterEntry()`, 32 assertions, all passed. Result: the class-skills fix was the last one: every other field across all 5 stages is confirmed correctly reaching Supabase.
Found 3 unrelated dead fields — different failure mode, not data loss, since no UI ever collected them so there's nothing to have lost: `player_email` (no email input exists anywhere in the creator), `alignment_trait` (`selectAlignmentTrait()` and `.char-alignment-trait` exist in `js/character.js` but nothing in `character.html` ever calls/renders them — looks like a per-alignment-card sub-choice that was designed but never wired up), `appearance_data.glasses` (collected by `collectAppearanceData()`, but no `app-glasses` element exists). All three are always empty/null for every character, past and future, until someone builds the missing UI — not a bug fix candidate, a product decision if ever wanted.

**2026-08-08 — Fourth data-loss bug: class skill proficiencies never persisted.**
DM noticed Kael Evander's `skills` array was empty in Supabase despite ranger requiring 3 skill picks. Confirmed `validateStage(2)` in `js/character.js` blocks progression until `skills_count` skills are chosen, so this wasn't skipped — same failure class as the three `past_*` bugs (data collected correctly in the draft, never reaches the DB), but a different specific mechanism: `CHAR_STATE.draft['skills_' + classId]` (e.g. `skills_ranger`) is correctly read by the live preview, Stage 3 panel, and Stage 2 validation, but `buildCharacterEntry()` never read it at all — not a wrong-key typo, a missing field entirely. Confirmed systemic: Hana and Visenya also have `skills: []`. Also confirmed `player_characters.skills` is a fully dead column — not read anywhere in `sheet/index.html` or `dm.html` either, so this had zero visible symptom on the live sheet.
Fix: `buildCharacterEntry()` now writes `skills: d.class_id ? (d['skills_' + d.class_id] || []) : []`. Applies to all future characters.
Recoverability (checked, not guessed): none. Unlike "Your Past," the specific skill checkboxes chosen live only in the browser's `localStorage` draft, which `submitCharacter()` deletes on success — no server-side snapshot exists at any point, in the DB, the GitHub-dispatch payload, or anywhere else. This happened at Session Zero (2026-07-06); nothing to query now. Only path to recovery is asking each player directly what they picked (same remediation as "Your Past") — DM has not yet decided whether to re-collect. Per-character options if they do: Kael (Ranger, choose 3): Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, Survival. Hana (Druid, choose 2): Arcana, Animal Handling, Insight, Medicine, Nature, Perception, Religion, Survival. Visenya (Warlock, choose 2): Arcana, Deception, History, Intimidation, Investigation, Nature, Religion.

**2026-08-08 — UI clarity fix; "Your Past" fully backfilled from DM-recollected answers; second starting-gold bug found and fixed.**
UI: `dm.html`'s pending-items "Mark Added" button read as if it might auto-grant the item. Renamed to "I Added This" with a `title` tooltip spelling out that it's a manual checklist clear, not a grant — matches dm.html's existing pattern of pairing action buttons with `title=` hints.
Your Past backfill: the DM re-collected all six previously-lost answers directly from Hana, Kael, and Visenya. Matched each to its exact `data-value` from `character.html`'s option cards (not guessed), cross-checked against each character's already-correct `organization_joined` as a sanity check. Applied the resulting mechanical effects via the existing `PAST_EFFECTS`/`computeSkillBonuses`/`computeFinalAbilityScores` system from the entry above — each character's already-applied organization bonus was left untouched, only the newly-unlocked `raised`/`friend` effects were added on top. Verified every number via the real live functions in a local browser (fed each character's actual stored data through `computeSkillBonuses()`, not hand-derived) before writing to Supabase, then re-verified the live sheet rendered the final values correctly for all three.
Gold bug #2 (found during the required pre-fix audit, not previously known): `sheet/index.html`'s `BG_GOLD` table — used to seed `character_sheet.gold_cp` on first sheet load — was a flat 50gp/75gp placeholder completely disconnected from `ANAVALE_BACKGROUNDS[bg].starting_gold` in `js/character.js` (the real 5–25gp PHB-style values shown to players during creation). Combined with the already-known "Stage 4 shopping spend never subtracted" bug, every character's seeded gold was significantly higher than intended, regardless of shopping. Audited all 5 creation stages (class, species, ability scores, gear, review) confirmed no other stage affects starting gold — only background `starting_gold` and Stage 4 shopping do, plus the imagined-past `merchant-guild` org bonus (already correctly isolated). Also confirmed: adding an inventory item on the live sheet never auto-deducts `gold_cp` anywhere in the codebase — this path doesn't exist yet, so there's nothing to reconcile there today.
Fix: renamed `BG_GOLD` → `BG_STARTING_GOLD` with the real per-background values (mirrored from `character.js`, same pattern as `FEAT_TIPS`). New `player_characters.starting_gold_spent_cp` column, written by `buildCharacterEntry()` as `calcGoldSpent()` at submission (that function only exists in `character.js`'s live DOM-driven form — the persisted value lets `sheet/index.html` use it without duplicating the shopping-cost logic). Seed formula is now `(real background gold) − starting_gold_spent_cp + starting_gold_bonus_cp`, applies to all future characters.
Backfill: DM confirmed none of the three characters have real play history on their gold yet (Kael's low balance was a manual DM test value, not session spending) — so all three got a clean direct set to their true correct amount, verified via the same live-function replay used for the original gold audit: Hana 900cp (9gp), Kael 880cp (8.8gp), Visenya 5400cp (54gp, preserving her already-correct +50gp merchant-guild bonus).

**2026-08-08 — Fixed "Your Past" data-loss bug; built imagined-past mechanical effects; backfilled 3 existing characters.**
Bug: `collectStage1Data()` in `js/character.js` stores the seven "Your Past" answers as `past_raised`/`past_friend`/`past_pet`/`past_love`/`past_org`/`past_left-behind`/`past_why-left`, but `buildCharacterEntry()` read them from `who_raised_you`/`dearest_friend`/etc., which were never set — every submitted character silently lost six of seven answers (confirmed via Supabase: all 3 real PCs had identical null pattern). Same wrong-key bug also found and fixed in two preview-only functions (`renderSummaryCard()`, `renderStage3Panel()`) that had never shown their "+1 skill from imagined past" chips as a result.
Feature: the "Your Past" cards' effect text (e.g. "+1 Wisdom, +1 History proficiency", "+50gp starting gold") was preview-only — nothing applied it. Built `PAST_EFFECTS` (single source of truth in `js/character.js`, replacing the old `PAST_SKILL_LOOKUP`/`PAST_SKILL_GRANTS` dicts, which disagreed with each other and with the card copy — `kind-parents` now correctly grants Insight) plus shared helpers `computeFinalAbilityScores()`, `computeSkillBonuses()`, `computeStartingGoldBonus()`, `computeDmPendingItems()`, `computeFeats()`, used by both the live creator preview and `buildCharacterEntry()` so they can't drift. New `player_characters` columns: `skill_bonuses` (flat +1s, explicitly not full proficiency — matches existing tooltip copy), `starting_gold_bonus_cp`, `dm_pending_items`, `feats`. `ability_scores` now stores the *final* value (raw + background bonus + imagined-past bonus) at submission — previously background bonuses were computed live in two duplicate places and never persisted or reached `sheet/index.html` at all; this also fixes that for all future characters. `sheet/index.html`'s `fetchOrCreateSheet()` now folds `starting_gold_bonus_cp` into the initial `gold_cp` seed and adds the Tough feat's +2 HP/level to the initial `hp_max` calc. New "mentor" friend-answer skill choice (History/Medicine) built as a picker modeled directly on the existing kept-to-myself org picker (`friend-mentor-skill-picker` in `character.html`, `selectMentorSkill()` in `character.js`). Minimal DM-facing "pending items" list added to `dm.html`'s SCC player bar (`sccMarkPendingItemAdded()`) for DM-add items like "Wanderkeep Field Kit" — nothing auto-grants these.
Backfill (DM-approved, one-time): Hana Sable, Kael Evander, Visenya Oryn each got their background ability bonus + feat applied (all 3 are the entire `player_characters` table) and their surviving `organization_joined` answer's skill bonus/feat/DM-item applied — the other six lost past-answers were NOT guessed and remain unset until each player re-picks. Visenya's merchant-guild "+50gp" was added on top of her current `character_sheet.gold_cp` (mid-campaign, not a reset). Hana's `hp_max`/`hp_current` recomputed +2 for Tough. All values verified end-to-end in a local browser session (no test data written to production) before the real Supabase writes.
Sheet display (same session, requested as a follow-up before this was considered done): `sheet/index.html` now shows all three new fields, since storing them correctly isn't enough if a player can't see them. `skill_bonuses` → new "Bonus skills" row in the existing Your Past story block (`.cs-story-row`, no new CSS). `feats` → new chip list (`.cs-feat-chip`, new CSS) in the Ability Scores accordion, each with its rules text from a new `FEAT_TIPS` lookup mirrored from `character.js` (sheet doesn't load that file — same mirroring pattern as `ANAVALE_BACKGROUNDS`/`ALIGNMENT_PHB`/etc.). `dm_pending_items` → new "Pending From Your DM" section reusing the existing `.cs-gear-item`/`.cs-gear-grid` styling, positioned right after Starting Gear, only rendered when non-empty. Verified against all 3 real characters' actual post-backfill data (Hana: Tough chip + HP tooltip text, +1 Athletics, "Common weapon of choice"; Kael: Alert chip, +1 Survival, "Wanderkeep Field Kit"; Visenya: Alert chip, +1 Persuasion, no pending section, 100gp).

**2026-08-07 — Character sheet redesign: Overview + Ability Scores (docs/character-sheet-redesign-handoff.md).**
Implemented per Figma `P0tcVgf02XeI13Tz0TtRaX` (36:310 desktop / 36:435 mobile). Replaced `cs-hero`/`cs-type-banner`/most of `cs-identity-grid` in `sheet/index.html` with the new Overview (portrait+money+weight card, name/pills/blurb, alignment/background/gigglegloom cards, class card) and Ability Scores accordions — DM confirmed replace-not-duplicate, wide breakout container scoped to just these two sections, photo upload kept. New tokens added to `css/tokens.css` only where no existing token matched. Currency (cp/sp/gp inputs) and the weight bar both wired to existing `gold_cp`/inventory-sum logic, verified live against real Supabase data (token test against "Kael Evander"). Class card reads a new `classes` table that doesn't exist yet — renders placeholders until the migration (drafted, schema in handoff §6, tools/casting_summary content awaiting DM sign-off) is approved and run. `generateSummary()` in `js/character.js` rewritten to the six-paragraph narrative spec in handoff §8 (gendered pronouns, organic length, empty fields omitted) — required changing `#char-auto-summary` from `<p>` to `<div>` in `character.html` to hold multiple paragraphs. Found but did not fix (pre-existing, out of scope): species-portrait 404 (`sheet/index.html` portraitSrc uses the wrong filename pattern — real files are `sp-{species}-{suffix}.png` not `{species}-{suffix}.webp`), a duplicate `.char-summary-body` CSS rule in `character.css`, and stale `WHY_LEFT_LABELS`/`RAISED_LABELS` option values in `sheet/index.html`'s untouched "Your Past" section. Added `.claude/launch.json` for local static-server preview (new, wasn't there before).

**2026-07-23 — Equipped section added to sheet/index.html.**
New Equipped section (armor/shield/main hand/off hand) rendered between Gold and Inventory in `renderCharacter()`, populated live via `renderEquipped()` (called from `renderLivePlay()` alongside `renderHP()`). Reads/writes `character_sheet.equipped` jsonb; item stats fetched live from `items` by id into `EQUIPPED_ITEMS`. AC computed dynamically in `renderEquippedAC()`: base 10, armor `base_ac` + dex-by-weight-class (heavy = none, medium = capped at `max_dex_bonus` ?? 2, light/none = full dex), shield `ac_bonus` (default 2), plus `magic_bonus` from armor/shield. New equip-search modal injected into `#cs-modal-root` (never inside `.cs-wrap`, per the modal rule), filtered by category per slot. All new symbols use HTML entities (`&#8230;`, `&#10005;`), not literal emoji — existing literal emoji elsewhere in the file (📝, 🗺, etc.) predate this and were left alone. HEAD after push: `be4ecec`.

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
