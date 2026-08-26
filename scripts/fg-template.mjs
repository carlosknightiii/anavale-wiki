#!/usr/bin/env node
/**
 * Field Guide block-schema tooling for the Anavale wiki.
 *
 * Two independent subcommands, mirroring scripts/bulk-image-upload.mjs's
 * scan/upload shape:
 *
 *   node scripts/fg-template.mjs check <session_number>
 *   node scripts/fg-template.mjs build <spec-file.json>
 *
 * `check` reads a session's real `field_guide_sessions.blocks` from
 * Supabase (anon key, read-only -- never writes anything) and validates
 * every block against the same category schema dm.html itself loads at
 * runtime (js/fg-category-schema.json). Prints a pass/fail report per
 * block index and exits 1 if any block has a real error.
 *
 * `build` takes a simplified per-beat authoring spec (see SPEC FORMAT
 * below, or run with no args / --help to print it) and emits the full,
 * convention-compliant `blocks` array to stdout -- ready to paste into a
 * Supabase `field_guide_sessions.blocks` update. Pure output: never
 * touches Supabase, never reads or writes the target session's existing
 * blocks. Every block `build` emits is run back through the exact same
 * validator `check` uses before being printed, so it can't silently ship
 * something `check` would immediately flag.
 *
 * Both subcommands import their category/link-type knowledge from
 * js/fg-category-schema.json -- the same file dm.html fetches into
 * SCC_FG_CATEGORY_STYLE at runtime -- so there is exactly one place that
 * knows the real category list, not three copies free to drift apart.
 *
 * ── SPEC FORMAT (for `build`) ─────────────────────────────────────────
 * {
 *   "session_number": 1,               // optional, informational only --
 *                                       // build never touches Supabase,
 *                                       // this is just echoed to stderr
 *                                       // so the output is traceable
 *   "steps": [
 *     {
 *       "beat": 2,                     // required -- drives the h2 section
 *       "title": "Under the Bridge",   // required -- drives the h2 section
 *       "xp": 75,                      // optional -- see note below
 *       "quest_id": "something-is-wrong-with-gerald",  // optional
 *
 *       "read_aloud": "You duck under the low stone arch...",
 *       // or an array of paragraphs: ["First para.", "Second para."]
 *
 *       "dialogue": [
 *         {
 *           "speaker": { "type": "character", "id": "gobblewump-gerald" },
 *           "tone": "nervous, evasive",       // optional -> tone_note
 *           "text": "<em>\"I don't know what you're talking about.\"</em>",
 *           "label": "",                      // optional box label
 *           "featured": [{ "type": "creature", "id": "bumble-frogs" }] // optional
 *         }
 *       ],
 *
 *       "skill_checks": [
 *         {
 *           "ability": "Perception",
 *           "dc": 12,
 *           "pass": "You spot a fresh boot print in the mud.",
 *           "fail": "Nothing stands out.",    // optional
 *           "category": "background",         // optional, defaults to "background"
 *           "label": ""                        // optional box label
 *         }
 *       ],
 *
 *       "comedy": "A [[creature:bounce-beetle|Bounce Beetle]] headbutts Kael's shin.",
 *
 *       "outcomes": [                          // optional -- see note below
 *         { "key": "fled", "label": "Fled at low HP", "description": "..." }
 *       ]
 *     }
 *   ]
 * }
 *
 * Notes on fields that don't map 1:1 onto a block:
 * - `xp` is deliberately NOT baked into the beat's h2 header. CLAUDE.md's
 *   own Field Guide Request Tracker logs "Remove redundant static Beat XP
 *   headers | Approved and Pushed" -- a static per-beat header repeating
 *   the XP number was a real, deliberately-removed pattern, because the
 *   live quest_beats widget (sccFgOneQuestBeatsHtml) already shows each
 *   assigned quest's real beat/XP data pulled from the `quests` table
 *   itself, not from field_guide_sessions.blocks at all. Reintroducing it
 *   here would recreate exactly what was removed. `xp` is kept on the step
 *   only so it can be folded into a `combat_outcomes` block's label (the
 *   one place the real Session 1 data still does this: "Beat 3 — Confront
 *   the Extractors (200 XP)") when the step defines `outcomes`.
 * - `beat`/`title` DO produce a plain h2 section header ("Beat {beat} —
 *   {title}", no XP) -- a document outline marker, not a duplicate of the
 *   widget's own per-beat badge, which lives in a different part of the
 *   page (wherever a quest_beats block is placed) and covers every
 *   assigned quest's beats at once, not this one beat specifically.
 * - text fields (read_aloud / dialogue[].text / comedy) are treated as
 *   HTML fragments, not markdown or plain text that gets auto-escaped --
 *   same as every real block in Supabase today. A string is wrapped in
 *   <p>...</p> only if it doesn't already start with a block-level tag;
 *   `\n\n` inside one string splits it into multiple <p> paragraphs; an
 *   array of strings does the same, one <p> per element. If you want the
 *   italicized-quote convention every real spoken_dialogue box uses
 *   ("<em>...</em>"), write it yourself in the text -- the tool does not
 *   assume every dialogue line should be italicized (real data mixes
 *   quoted dialogue and plain narrative in the same box).
 * - `dialogue[].speaker.type` and any `featured[].type` must be one of the
 *   types js/fg-category-schema.json's $recognizedLinkTypes lists
 *   (character/creature/city/item/quest/organization) plus "pc" for
 *   featured entries specifically (sccFgFeaturedEntryHtml's one real
 *   addition beyond SCC_FG_LINK_TYPES) -- build fails fast on anything
 *   else rather than emit a speaker/featured reference that won't resolve.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Supabase config (matches dm.html exactly) ────────────────────────────
const SB_URL = 'https://ebppsgaftzyvftemfeom.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicHBzZ2FmdHp5dmZ0ZW1mZW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MTA3ODIsImV4cCI6MjA5ODE4Njc4Mn0.C0q7wPpNjXrFPWzCzXcPuR_4n8txumOxxSvzWZkVAFg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, '..', 'js', 'fg-category-schema.json');

// Recognized top-level block types -- sccFgRenderBlock()'s own switch
// statement. Anything else falls through to `default: return '';` in
// dm.html -- silently invisible, not a crash, which is exactly why `check`
// needs to catch it: nothing else will.
const KNOWN_BLOCK_TYPES = new Set([
  'title', 'subtitle', 'tagline', 'meta', // real data, deliberately never rendered
  'h1', 'h2', 'italic', 'p', 'list', 'table', 'footer', 'box',
]);

// Box categories that are NOT in fg-category-schema.json's `categories`
// table by design -- sccFgRenderBlock() dispatches them to their own
// dedicated render function before the generic colorClass/badge box case
// ever runs. See js/fg-category-schema.json's own $specialCasedCategories
// block for the full reasoning per category.
// scenario_cards (2026-08-26) -- Scenario Cards module, replaces the
// earlier scenario_tabs/approach_tracker categories entirely.
const SPECIAL_CASED_BOX_CATEGORIES = new Set(['quest_beats', 'combat_outcomes', 'scenario_cards']);

// The die-emoji skill-check paragraph shape sccFgStyleSkillChecks() looks
// for inside a box's html, reproduced here only to *validate* -- check
// never rewrites content, it just confirms a paragraph that opens with the
// die glyph also has the "<strong>Ability DC N</strong>" shape immediately
// after it, since a near-miss (wrong emoji, missing DC, etc.) renders as a
// plain, un-styled paragraph in dm.html with no error of any kind.
const SKILL_CHECK_RE = /<p>\s*\u{1F3B2}\s*<strong>([^<]+?)\s+DC\s+(\d+)<\/strong>([\s\S]*?)<\/p>/gu;
// A bare die-glyph paragraph that does NOT match the shape above -- used to
// flag "this looks like it was meant to be a skill check but doesn't parse
// as one" without falsely flagging ordinary paragraphs that just happen to
// mention dice.
const SKILL_CHECK_DIE_PARA_RE = /<p>\s*\u{1F3B2}[\s\S]*?<\/p>/gu;

// Canonical [[type:id|Label]] shape -- identical to sccFgLinkify()'s own
// regex in dm.html. `check` uses this twice: first to find every
// bracket-looking span at all (a looser scan), then to confirm each one
// actually matches this exact shape.
const LINK_RE = /^\[\[([a-z_]+):([\w.-]+)(?:\|([^\]]*))?\]\]$/;
const BRACKET_SCAN_RE = /\[\[.*?\]\]/g;

// ── Shared schema loading ─────────────────────────────────────────────────

async function loadSchema() {
  let raw;
  try {
    raw = await readFile(SCHEMA_PATH, 'utf8');
  } catch (err) {
    throw new Error(`Could not read ${SCHEMA_PATH}: ${err.message}`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${SCHEMA_PATH} is not valid JSON: ${err.message}`);
  }
  const categories = data.categories;
  if (!categories || typeof categories !== 'object') {
    throw new Error(`${SCHEMA_PATH} has no top-level "categories" object.`);
  }
  const linkTypes = (data.$recognizedLinkTypes && data.$recognizedLinkTypes.types) || [];
  if (!Array.isArray(linkTypes) || !linkTypes.length) {
    throw new Error(`${SCHEMA_PATH} has no $recognizedLinkTypes.types array.`);
  }
  return {
    categories,
    categoryNames: new Set(Object.keys(categories)),
    linkTypes: new Set(linkTypes),
    // Featured entries additionally accept "pc" (SCC_FG_FEATURED_TYPE_ALIASES'
    // own real addition beyond SCC_FG_LINK_TYPES, see dm.html) plus the
    // aliases it resolves through (npc/poi/nation) -- inline [[...]] links do
    // NOT get alias resolution (sccFgLinkify has none), so featuredTypes is
    // deliberately a superset of linkTypes, not the same set.
    featuredTypes: new Set([...linkTypes, 'pc', 'npc', 'poi', 'nation']),
  };
}

// ── Validation (shared by `check` on real data and `build` on its own output) ──

// Every string field on a block that sccFgLinkify() (or a table's own
// per-cell linkify pass) actually processes -- anything else in a block is
// either structural (speaker/category/outcomes/etc.) or never linkified.
function collectLinkifiedStrings(block) {
  const out = [];
  if (typeof block.html === 'string') out.push({ field: 'html', text: block.html });
  if (typeof block.label === 'string') out.push({ field: 'label', text: block.label });
  if (typeof block.text === 'string') out.push({ field: 'text', text: block.text }); // h1/h2
  if (Array.isArray(block.headerRow)) {
    block.headerRow.forEach((cell, i) => {
      if (typeof cell === 'string') out.push({ field: `headerRow[${i}]`, text: cell });
    });
  }
  if (Array.isArray(block.rows)) {
    block.rows.forEach((row, r) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, c) => {
        if (typeof cell === 'string') out.push({ field: `rows[${r}][${c}]`, text: cell });
      });
    });
  }
  return out;
}

function checkLinkSyntax(block, schema, issues) {
  for (const { field, text } of collectLinkifiedStrings(block)) {
    const brackets = text.match(BRACKET_SCAN_RE) || [];
    for (const frag of brackets) {
      const m = frag.match(LINK_RE);
      if (!m) {
        issues.push({ level: 'error', message: `malformed [[type:id|Label]] link in ${field}: ${frag}` });
        continue;
      }
      const type = m[1];
      if (!schema.linkTypes.has(type)) {
        issues.push({
          level: 'error',
          message: `link type "${type}" in ${field} (${frag}) isn't resolvable by inline [[..]] syntax — recognized: ${[...schema.linkTypes].join(', ')}`,
        });
      }
    }
  }
}

function checkFeatured(block, schema, issues, where) {
  if (block.featured == null) return;
  if (!Array.isArray(block.featured)) {
    issues.push({ level: 'error', message: `${where}featured must be an array of {type,id}` });
    return;
  }
  block.featured.forEach((f, i) => {
    if (!f || typeof f !== 'object') {
      issues.push({ level: 'error', message: `${where}featured[${i}] must be an object {type,id}` });
      return;
    }
    if (!f.type || !schema.featuredTypes.has(f.type)) {
      issues.push({
        level: 'error',
        message: `${where}featured[${i}].type "${f.type}" not recognized — expected one of: ${[...schema.featuredTypes].join(', ')}`,
      });
    }
    if (!f.id) issues.push({ level: 'error', message: `${where}featured[${i}] is missing id` });
  });
}

// Skill-check paragraphs embedded in a box's own `html` -- not a distinct
// block type, so this only ever fires from validateBlock()'s box case.
function checkSkillCheckParas(html, issues) {
  if (typeof html !== 'string' || !html.includes('\u{1F3B2}')) return;
  const wellFormed = new Set((html.match(SKILL_CHECK_RE) || []));
  const dieParas = html.match(SKILL_CHECK_DIE_PARA_RE) || [];
  for (const para of dieParas) {
    if (!wellFormed.has(para)) {
      issues.push({
        level: 'error',
        message: `die-emoji paragraph doesn't match the skill-check shape sccFgStyleSkillChecks() looks for ` +
          `(<p>\u{1F3B2} <strong>Ability DC N</strong>...</p>) — renders as a plain unstyled paragraph: ${para.slice(0, 120)}${para.length > 120 ? '…' : ''}`,
      });
    }
  }
}

// Validates one block, independent of the others. Returns an array of
// {level:'error'|'warning', message} — empty means a clean pass.
function validateBlock(block, schema) {
  const issues = [];
  if (!block || typeof block !== 'object') {
    return [{ level: 'error', message: 'block is not an object' }];
  }
  if (!KNOWN_BLOCK_TYPES.has(block.type)) {
    issues.push({ level: 'error', message: `unknown block type "${block.type}" — falls through to sccFgRenderBlock()'s default case and renders nothing` });
    return issues; // nothing else about this block is worth checking if the type itself is unrecognized
  }

  checkLinkSyntax(block, schema, issues);

  if (block.type !== 'box') return issues;

  const cat = block.category;
  if (cat == null || cat === '') {
    issues.push({ level: 'warning', message: 'box has no category set — falls back to the legacy `color` field, then grey (SCC_FG_BOX_COLOR_CLASS)' });
    return issues;
  }

  if (SPECIAL_CASED_BOX_CATEGORIES.has(cat)) {
    if (cat === 'quest_beats') {
      if (!block.quest_id) {
        issues.push({ level: 'error', message: 'quest_beats box is missing quest_id' });
      }
    } else if (cat === 'combat_outcomes') {
      if (!block.label) {
        issues.push({ level: 'error', message: 'combat_outcomes box is missing label (used both as the widget header and as the persisted log-entry title prefix)' });
      }
      if (!Array.isArray(block.outcomes) || !block.outcomes.length) {
        issues.push({ level: 'error', message: 'combat_outcomes box has no outcomes (or outcomes is not a non-empty array)' });
      } else {
        block.outcomes.forEach((o, i) => {
          if (!o || typeof o !== 'object' || !o.label) {
            issues.push({ level: 'error', message: `combat_outcomes box outcomes[${i}] is missing label` });
          }
          if (!o || typeof o !== 'object' || !o.description) {
            issues.push({ level: 'warning', message: `combat_outcomes box outcomes[${i}] has no description` });
          }
        });
      }
    }
    return issues;
  }

  if (!schema.categoryNames.has(cat)) {
    issues.push({ level: 'error', message: `unknown category "${cat}" — not in js/fg-category-schema.json and not one of the special-cased categories (${[...SPECIAL_CASED_BOX_CATEGORIES].join(', ')})` });
    return issues;
  }

  const style = schema.categories[cat];
  // A category with no badge (today: only loot_shop) has nothing else
  // identifying the box at a glance besides its free-text label — every
  // badge-carrying category (including guide_meta, which is never even
  // rendered) is exempt from this specific check.
  if (style && style.badge === null && cat !== 'guide_meta' && !block.label) {
    issues.push({ level: 'warning', message: `category "${cat}" has no badge (SCC_FG_CATEGORY_STYLE.${cat}.badge is null) and this box has no label either — nothing identifies it at a glance` });
  }

  if (cat === 'spoken_dialogue') {
    if (!block.speaker || typeof block.speaker !== 'object' || !block.speaker.id || !block.speaker.type) {
      issues.push({ level: 'error', message: 'spoken_dialogue box is missing speaker.{type,id}' });
    } else if (!schema.linkTypes.has(block.speaker.type)) {
      issues.push({ level: 'error', message: `spoken_dialogue box speaker.type "${block.speaker.type}" not recognized — expected one of: ${[...schema.linkTypes].join(', ')}` });
    }
  }

  checkFeatured(block, schema, issues, '');
  checkSkillCheckParas(block.html, issues);

  return issues;
}

function validateBlocks(blocks, schema) {
  return blocks.map((b, i) => ({ index: i, block: b, issues: validateBlock(b, schema) }));
}

function printReport(results, { label }) {
  let errorCount = 0;
  let warningCount = 0;
  for (const { index, block, issues } of results) {
    const errors = issues.filter((x) => x.level === 'error');
    const warnings = issues.filter((x) => x.level === 'warning');
    errorCount += errors.length;
    warningCount += warnings.length;
    if (!issues.length) continue; // clean blocks aren't printed individually — see summary
    const tag = block && block.type === 'box' ? `box/${block.category ?? '(none)'}` : (block ? block.type : '?');
    console.log(`[${index}] ${tag}`);
    for (const e of errors) console.log(`  ERROR   ${e.message}`);
    for (const w of warnings) console.log(`  WARNING ${w.message}`);
  }
  console.log('');
  console.log('── Summary ' + '─'.repeat(50));
  const cleanCount = results.length - results.filter((r) => r.issues.length).length;
  console.log(`${label}: ${results.length} block(s) — ${cleanCount} clean, ${errorCount} error(s), ${warningCount} warning(s)`);
  return errorCount;
}

// ── check ──────────────────────────────────────────────────────────────

async function fetchSessionBlocks(sessionNumber) {
  const url = `${SB_URL}/rest/v1/field_guide_sessions?session_number=eq.${encodeURIComponent(sessionNumber)}&select=id,session_number,blocks`;
  const res = await fetch(url, { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } });
  if (!res.ok) {
    throw new Error(`Supabase fetch failed (HTTP ${res.status})`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error(`No field_guide_sessions row found for session_number=${sessionNumber}`);
  }
  const row = rows[0];
  if (!Array.isArray(row.blocks)) {
    throw new Error(`session_number=${sessionNumber}'s blocks column is not an array (got ${typeof row.blocks})`);
  }
  return row.blocks;
}

async function cmdCheck(sessionNumber) {
  const schema = await loadSchema();
  const blocks = await fetchSessionBlocks(sessionNumber);
  console.log(`Session ${sessionNumber}: ${blocks.length} block(s) fetched from field_guide_sessions.`);
  console.log('');
  const results = validateBlocks(blocks, schema);
  const errorCount = printReport(results, { label: `Session ${sessionNumber}` });
  if (errorCount > 0) process.exitCode = 1;
}

// ── build ──────────────────────────────────────────────────────────────

// Wraps a text field into <p>...</p> block(s). Leaves a string alone if it
// already opens with a block-level tag (the author has already formatted
// it as HTML themselves) -- otherwise splits on blank lines into separate
// paragraphs. An array of strings is treated the same way per element, one
// <p> per element, no further splitting.
function wrapParagraphs(value) {
  if (value == null) return '';
  const alreadyBlock = (s) => /^\s*<(p|div|table|ul|ol)[\s>]/i.test(s);
  if (Array.isArray(value)) {
    return value.map((s) => (alreadyBlock(s) ? s : `<p>${s}</p>`)).join('');
  }
  if (alreadyBlock(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para}</p>`)
    .join('');
}

function buildSkillCheckHtml(entry) {
  const parts = [];
  if (entry.pass) parts.push(`Pass: ${String(entry.pass).trim()}`);
  if (entry.fail) parts.push(`Fail: ${String(entry.fail).trim()}`);
  const rest = parts.length ? ` — ${parts.join(' ')}` : '';
  return `<p>\u{1F3B2} <strong>${entry.ability} DC ${entry.dc}</strong>${rest}</p>`;
}

function beatLabel(step) {
  return `Beat ${step.beat} — ${step.title}`;
}

// Validated up front, with a specific step/field pointed at, rather than
// left to surface later as a generic "Internal error" from the build
// self-check (validateBlocks() would still catch it either way — this is
// purely a better error message for the single most likely bad-input
// mistake: a speaker or featured entry using a type that isn't resolvable).
function checkRefType(type, schema, allowed, where) {
  if (!type || !allowed.has(type)) {
    throw new Error(`${where}: type "${type}" not recognized — expected one of: ${[...allowed].join(', ')}`);
  }
}

function buildStepBlocks(step, stepIndex, schema) {
  const blocks = [];
  const where = `step[${stepIndex}] (beat ${step.beat ?? '?'})`;

  if (step.beat == null || !step.title) {
    throw new Error(`${where}: "beat" and "title" are both required`);
  }

  blocks.push({ type: 'h2', text: beatLabel(step) });

  if (step.read_aloud) {
    blocks.push({
      type: 'box',
      category: 'read_aloud',
      label: '',
      html: wrapParagraphs(step.read_aloud),
    });
  }

  (step.dialogue || []).forEach((entry, i) => {
    if (!entry || !entry.speaker || !entry.speaker.type || !entry.speaker.id) {
      throw new Error(`${where} dialogue[${i}]: speaker.{type,id} is required`);
    }
    checkRefType(entry.speaker.type, schema, schema.linkTypes, `${where} dialogue[${i}].speaker`);
    if (!entry.text) {
      throw new Error(`${where} dialogue[${i}]: text is required`);
    }
    if (entry.featured) {
      entry.featured.forEach((f, fi) => {
        checkRefType(f && f.type, schema, schema.featuredTypes, `${where} dialogue[${i}].featured[${fi}]`);
        if (!f.id) throw new Error(`${where} dialogue[${i}].featured[${fi}]: id is required`);
      });
    }
    const block = {
      type: 'box',
      category: 'spoken_dialogue',
      label: entry.label || '',
      speaker: { type: entry.speaker.type, id: entry.speaker.id },
      html: wrapParagraphs(entry.text),
    };
    if (entry.tone) block.tone_note = entry.tone;
    if (entry.featured) block.featured = entry.featured;
    blocks.push(block);
  });

  (step.skill_checks || []).forEach((entry, i) => {
    if (!entry || !entry.ability || entry.dc == null) {
      throw new Error(`${where} skill_checks[${i}]: ability and dc are both required`);
    }
    blocks.push({
      type: 'box',
      category: entry.category || 'background',
      label: entry.label || '',
      html: buildSkillCheckHtml(entry),
    });
  });

  if (step.comedy) {
    // Comedy, inline mode: sccFgRenderComedyInline() wraps this in ONE <p>
    // of its own (icon + optional bold "label:" + this html) — the block's
    // own html must NOT contain another <p>, unlike every other box case,
    // or the result is invalid nested <p> markup. wrapParagraphs() is
    // deliberately not used here for that reason.
    blocks.push({
      type: 'box',
      category: 'comedy',
      inline: true,
      label: step.comedyLabel || 'Comedic Element',
      html: step.comedy,
    });
  }

  if (step.outcomes) {
    if (!Array.isArray(step.outcomes) || !step.outcomes.length) {
      throw new Error(`${where}: outcomes must be a non-empty array`);
    }
    const label = step.xp ? `${beatLabel(step)} (${step.xp} XP)` : beatLabel(step);
    blocks.push({
      type: 'box',
      category: 'combat_outcomes',
      label,
      html: step.outcomesIntro || '',
      outcomes: step.outcomes.map((o) => ({ key: o.key || '', label: o.label, description: o.description || '' })),
    });
  }

  return blocks;
}

async function cmdBuild(specPath) {
  const schema = await loadSchema();
  let raw;
  try {
    raw = await readFile(specPath, 'utf8');
  } catch (err) {
    throw new Error(`Could not read ${specPath}: ${err.message}`);
  }
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${specPath} is not valid JSON: ${err.message}`);
  }
  if (!spec || !Array.isArray(spec.steps) || !spec.steps.length) {
    throw new Error(`${specPath} must have a non-empty top-level "steps" array — see the SPEC FORMAT comment at the top of this script.`);
  }

  if (spec.session_number != null) {
    console.error(`(building for session_number=${spec.session_number} — informational only, this command never touches Supabase)`);
  }

  const blocks = [];
  spec.steps.forEach((step, i) => {
    blocks.push(...buildStepBlocks(step, i, schema));
  });

  // Self-check: every block this command just built should be exactly as
  // clean as `check` would report if it were already live in Supabase. A
  // failure here is a bug in buildStepBlocks()/the schema, not bad input
  // (bad input already threw above, with a specific step/field pointed
  // at) — surfaced loudly rather than silently shipped.
  const results = validateBlocks(blocks, schema);
  const errorCount = results.reduce((n, r) => n + r.issues.filter((x) => x.level === 'error').length, 0);
  if (errorCount > 0) {
    console.error('Internal error: fg-template.mjs built blocks that fail its own validator. Not printing output.');
    printReport(results, { label: 'build self-check' });
    process.exitCode = 1;
    return;
  }
  const warningCount = results.reduce((n, r) => n + r.issues.filter((x) => x.level === 'warning').length, 0);
  if (warningCount > 0) {
    console.error(`(${warningCount} warning(s) from the self-check — see stderr detail below; still printing output to stdout)`);
    printReport(results, { label: 'build self-check' });
  }

  console.log(JSON.stringify(blocks, null, 2));
}

// ── CLI entry point ────────────────────────────────────────────────────

function printUsage() {
  console.log('Usage:');
  console.log('  node scripts/fg-template.mjs check <session_number>');
  console.log('  node scripts/fg-template.mjs build <spec-file.json>');
  console.log('');
  console.log('Read the SPEC FORMAT comment at the top of scripts/fg-template.mjs for the');
  console.log('JSON shape `build` expects.');
}

async function main() {
  const [command, arg] = process.argv.slice(2);

  if (command === '--help' || command === '-h') {
    printUsage();
    return;
  }
  if (!command || !['check', 'build'].includes(command)) {
    printUsage();
    process.exitCode = 1;
    return;
  }
  if (!arg) {
    console.error(`Error: ${command === 'check' ? '<session_number>' : '<spec-file.json>'} is required.`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  try {
    if (command === 'check') {
      const sessionNumber = Number(arg);
      if (!Number.isInteger(sessionNumber) || sessionNumber < 1) {
        throw new Error(`"${arg}" is not a valid session number.`);
      }
      await cmdCheck(sessionNumber);
    } else {
      await cmdBuild(path.resolve(arg));
    }
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();
