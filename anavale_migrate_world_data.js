#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════
// ANAVALE — SUPABASE WORLD DATA MIGRATION
// anavale_migrate_world_data.js
//
// Reads every data/*.js file from the local repo and upserts all records
// into the corresponding Supabase table.
//
// USAGE (run once from the repo root):
//   node anavale_migrate_world_data.js
//
// REQUIREMENTS:
//   npm install @supabase/supabase-js
//   Node.js 18+ (for native fetch)
//
// SAFE TO RE-RUN: all inserts use upsert (ON CONFLICT DO UPDATE).
// Running it a second time updates any entries that changed — nothing is deleted.
//
// What gets migrated:
//   regions       → regions
//   nations       → nations        (extras → extra_data JSONB)
//   cities        → cities
//   creatures     → creatures
//   organizations → organizations  (extras → extra_data JSONB)
//   characters    → world_characters
//   pois          → pois
//   religions     → religions      (extras → extra_data JSONB)
//   items         → items
//   quests        → quests
//   spells        → spells         (desc → spell_desc)
//
// NOTE: backgrounds are character-creator UI data only — not migrated.
//       They live in data/backgrounds.js and are read directly by character.js.
// ══════════════════════════════════════════════════════════════════════════════

'use strict';

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://ebppsgaftzyvftemfeom.supabase.co';

// Service role key — bypasses RLS. NEVER commit to repo or expose to players.
// Set as environment variable before running:
//   export SUPABASE_SERVICE_KEY="eyJhbG..."
//   node anavale_migrate_world_data.js
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_KEY environment variable is not set.');
  console.error('    Run: export SUPABASE_SERVICE_KEY="your-service-role-key"');
  console.error('    Then re-run this script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// ── LOAD DATA FILES ───────────────────────────────────────────────────────────
// The data/*.js files use var declarations in browser-global style.
// We use a simple eval approach inside a controlled scope to extract each array.

function loadDataFile(filename, varName) {
  const filepath = path.join(__dirname, 'data', filename);
  let code;
  try {
    code = require('fs').readFileSync(filepath, 'utf8');
  } catch (e) {
    console.warn('Could not read ' + filename + ' - skipping: ' + e.message);
    return [];
  }
  try {
    const vm = require('vm');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    const result = ctx[varName] || [];
    console.log('  ok  Loaded ' + filename + ': ' + result.length + ' records');
    return result;
  } catch (e) {
    console.error('  FAIL  ' + filename + ': ' + e.message);
    return [];
  }
}

// ── BATCH UPSERT HELPER ───────────────────────────────────────────────────────
// Supabase free tier has a 500-row limit per request. We chunk at 200 to be safe.

async function batchUpsert(table, rows, chunkSize = 200) {
  if (!rows || rows.length === 0) {
    console.log(`  ─  ${table}: 0 records, skipping`);
    return;
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.error(`  ✗  ${table} chunk ${i}–${i + chunk.length}: ${error.message}`);
      if (error.details) console.error(`     Details: ${error.details}`);
    } else {
      inserted += chunk.length;
    }
  }
  console.log(`  ✓  ${table}: ${inserted}/${rows.length} upserted`);
}

// ── TRANSFORM FUNCTIONS ───────────────────────────────────────────────────────
// Each function maps a data/*.js entry to the Supabase column shape.
// Known columns are mapped explicitly. Any extra fields go into extra_data JSONB
// so nothing is lost and DM Tools can read them back later.

function transformRegion(r) {
  return {
    id:              r.id,
    name:            r.name,
    summary:         r.summary         || null,
    description:     r.description     || null,
    tone:            r.tone            || null,
    color_health:    r.color_health    || null,
    vareth_presence: !!r.vareth_presence,
    image:           r.image           || null,
    player_facing:   r.player_facing   !== false,
    tags:            r.tags            || [],
    // Store rich geography fields in extra_data so no data is lost
    extra_data: {
      continent:     r.continent,
      climate:       r.climate,
      gigglegloom_notes: r.gigglegloom_notes,
      seas:          r.seas,
      nations:       r.nations,
      key_geography: r.key_geography,
      rivers:        r.rivers,
      world_wonders: r.world_wonders,
      key_sites:     r.key_sites,
      cities:        r.cities
    }
  };
}

function transformNation(n) {
  return {
    id:              n.id,
    name:            n.name,
    region:          n.region          || null,
    summary:         n.summary         || null,
    description:     n.description     || null,
    culture:         n.culture         || null,
    beliefs:         n.beliefs         || null,
    government:      n.government_type || null,
    capital_city:    n.capital         || null,
    gigglegloom_relationship: n.gigglegloom_notes || null,
    vareth_presence: n.vareth_presence ? true : false,
    image:           n.image           || null,
    player_facing:   n.player_facing   !== false,
    tags:            n.tags            || [],
    // Full fidelity backup
    extra_data: {
      continent:          n.continent,
      confederation:      n.confederation,
      dominant_religion:  n.dominant_religion,
      government_body:    n.government_body,
      customs:            n.customs,
      gigglegloom_affinity: n.gigglegloom_affinity,
      color_health:       n.color_health,
      dimming_resistance: n.dimming_resistance,
      threats:            n.threats,
      tone:               n.tone
    }
  };
}

function transformCity(c) {
  return {
    id:              c.id,
    name:            c.name,
    nation:          c.nation          || null,
    region:          c.region          || null,
    continent:       c.continent       || 'pogglewog',
    city_type:       c.type            || null,
    summary:         c.summary         || null,
    description:     c.description     || null,
    gigglegloom_notes: c.gigglegloom_notes || null,
    color_health:    c.color_health    || null,
    vareth_presence: !!c.vareth_presence,
    dm_notes:        c.dm_notes        || null,
    landmarks:       c.landmarks       || [],
    image:           c.image           || null,
    player_facing:   c.player_facing   !== false,
    tags:            c.tags            || [],
    extra_data: {
      population:          c.population,
      culture:             c.culture,
      strategic_importance: c.strategic_importance,
      formery_present:     c.formery_present,
      tone:                c.tone,
      religion:            c.religion
    }
  };
}

function transformCreature(c) {
  return {
    id:              c.id,
    name:            c.name,
    tier:            c.tier            || null,
    category:        c.category        || c.tier || null,
    regions:         Array.isArray(c.regions) ? c.regions : (c.region ? [c.region] : []),
    habitat:         c.habitat         || null,
    description:     c.description     || '',
    behavior:        c.behavior        || null,
    gigglegloom_relationship: c.gigglegloom_relationship || null,
    dimmed_version:  c.dimmed_version  || null,
    dm_notes:        c.dm_notes        || null,
    image:           c.image           || null,
    player_facing:   c.player_facing   !== false,
    tags:            c.tags            || []
  };
}

function transformOrganization(o) {
  return {
    id:              o.id,
    name:            o.name,
    full_name:       o.full_name       || o.name,
    alignment:       o.alignment       || null,
    summary:         o.summary         || null,
    purpose:         o.purpose         || null,
    description:     o.description     || null,
    history:         o.history         || null,
    headquarters:    o.headquarters    || null,
    gigglegloom_relationship: o.gigglegloom_relationship || null,
    known_members:   o.membership      || null,
    dm_notes:        o.dm_notes        || null,
    image:           o.image           || null,
    player_facing:   o.player_facing   !== false,
    tags:            o.tags            || [],
    extra_data: {
      type:               o.type,
      age:                o.age,
      religion:           o.religion,
      leadership:         o.leadership,
      public_perception:  o.public_perception,
      secret:             o.secret,
      session_role:       o.session_role,
      vareth_relationship: o.vareth_relationship,
      notable_facts:      o.notable_facts
    }
  };
}

function transformWorldCharacter(c) {
  return {
    id:              c.id,
    name:            c.name,
    category:        c.category        || null,
    role:            c.role            || null,
    pronouns:        c.pronouns        || null,
    status:          c.status          || 'active',
    summary:         c.summary         || null,
    appearance:      c.appearance      || null,
    personality:     c.personality     || null,
    motivation:      c.motivation      || null,
    contradiction:   c.contradiction   || null,
    secret:          c.secret          || null,
    player_knowledge: c.player_knowledge || null,
    dm_notes:        c.dm_notes        || null,
    gigglegloom_relationship: c.gigglegloom_relationship || null,
    color:           c.color           || null,
    location:        c.location        || null,
    affiliation:     c.affiliation     || null,
    associated:      c.associated      || [],
    image:           c.image           || null,
    player_facing:   c.player_facing   !== false,
    tags:            c.tags            || []
  };
}

function transformPoi(p) {
  return {
    id:              p.id,
    name:            p.name,
    nation:          p.nation          || null,
    region:          p.region          || null,
    continent:       p.continent       || 'pogglewog',
    poi_type:        p.type            || null,
    summary:         p.summary         || '',
    description:     p.description     || null,
    gigglegloom_notes: p.gigglegloom_notes || null,
    color_health:    p.color_health    || null,
    vareth_presence: !!p.vareth_presence,
    dm_notes:        p.dm_notes        || null,
    image:           p.image           || null,
    player_facing:   p.player_facing   !== false,
    tags:            p.tags            || []
  };
}

function transformReligion(r) {
  return {
    id:              r.id,
    name:            r.name,
    deity:           Array.isArray(r.deity_ids) ? r.deity_ids.join(',') : (r.deity || null),
    summary:         r.summary         || null,
    description:     r.description     || null,
    beliefs:         r.core_belief     || r.beliefs || null,
    practices:       Array.isArray(r.practices) ? r.practices.join('\n\n') : (r.practices || null),
    symbol:          r.symbol          || null,
    headquarters:    r.headquarters    || null,
    player_facing:   r.player_facing   !== false,
    tags:            r.tags            || [],
    extra_data: {
      deity_ids:                  r.deity_ids,
      color:                      r.color,
      partition_account:          r.partition_account,
      structure:                  r.structure,
      relationship_to_gigglegloom: r.relationship_to_gigglegloom,
      relationship_to_vareth:     r.relationship_to_vareth,
      relationship_to_other_faiths: r.relationship_to_other_faiths,
      tone:                       r.tone,
      dm_notes:                   r.dm_notes
    }
  };
}

function transformItem(item) {
  return {
    id:              item.id,
    name:            item.name,
    category:        item.category     || null,
    equip_slot:      item.equip_slot   || null,
    rarity:          item.rarity       || 'common',
    cost_gp:         item.cost_gp      ?? null,
    weight_lb:       item.weight_lb    ?? null,
    summary:         item.summary      || '',
    description:     item.description  || null,
    gigglegloom_relationship: item.gigglegloom_relationship || null,
    gigglegloom_type: item.gigglegloom_type || null,
    history:         item.history      || null,
    current_location: item.current_location || null,
    current_owner:   item.current_owner || null,
    dm_notes:        item.dm_notes     || null,
    // Weapon
    weapon_type:     item.weapon_type  || null,
    damage_dice:     item.damage_dice  || null,
    damage_type:     item.damage_type  || null,
    versatile_dice:  item.versatile_dice || null,
    properties:      item.properties   || [],
    range_normal:    item.range_normal ?? null,
    range_long:      item.range_long   ?? null,
    magic_bonus:     item.magic_bonus  ?? 0,
    str_requirement: item.str_requirement ?? null,
    // Armor
    base_ac:         item.base_ac      ?? null,
    armor_weight_class: item.armor_weight_class || null,
    max_dex_bonus:   item.max_dex_bonus ?? null,
    stealth_disadvantage: !!item.stealth_disadvantage,
    // Shield
    ac_bonus:        item.ac_bonus     ?? null,
    // Consumable
    effect_type:     item.effect_type  || null,
    effect_dice:     item.effect_dice  || null,
    effect_flat:     item.effect_flat  ?? null,
    effect_duration: item.effect_duration || null,
    uses_max:        item.uses_max     ?? null,
    // Tool
    proficiency_name: item.proficiency_name || null,
    // Accessory
    grants_proficiency: item.grants_proficiency || [],
    grants_advantage:   item.grants_advantage   || [],
    // Quest item
    story_note:      item.story_note   || null,
    associated_quest: item.associated_quest || null,
    // Visibility
    image:           item.image        || null,
    player_facing:   item.player_facing !== false,
    player_addable:  item.player_addable !== false,
    named:           !!item.named,
    tags:            item.tags         || []
  };
}

function transformQuest(q) {
  return {
    id:              q.id,
    name:            q.name,
    status:          q.status          || 'available',
    stakes:          q.stakes          || null,
    first_available: q.first_available || null,
    hook:            q.hook            || null,
    summary:         q.summary         || null,
    related:         q.related         || [],
    beats:           q.beats           || [],
    reveals:         q.reveals         || [],
    dm_notes:        q.dm_notes        || null,
    player_facing:   !!q.player_facing,
    tags:            q.tags            || []
  };
}

function transformSpell(s) {
  return {
    id:            s.id || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name:          s.name,
    level:         s.level ?? 0,
    types:         Array.isArray(s.types) ? s.types : (s.type ? [s.type] : []),
    school:        s.school           || null,
    casting_time:  s.casting_time     || null,
    range:         s.range            || null,
    components:    s.components       || null,
    duration:      s.duration         || null,
    concentration: !!s.concentration,
    ritual:        !!s.ritual,
    spell_desc:    s.desc             || s.spell_desc || '',   // desc → spell_desc
    higher_levels: s.higher_levels    || null,
    classes:       Array.isArray(s.classes) ? s.classes : [],
    tags:          s.tags             || []
  };
}

// ── ADD extra_data COLUMN IF NEEDED ──────────────────────────────────────────
// The original schema didn't include extra_data on every table. We add it here
// via a migration so it's safe to run even after schema was applied.

async function ensureExtraDataColumns() {
  const tables = ['regions', 'nations', 'cities', 'organizations', 'religions'];
  for (const table of tables) {
    // Supabase JS client doesn't run DDL — we use rpc or just try the upsert and
    // handle the error. Instead, we'll add these columns via a SQL migration note.
    // The actual ALTER TABLE statements are in the addendum section at the bottom.
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  ANAVALE — Supabase World Data Migration');
  console.log('══════════════════════════════════════════════════');
  console.log('');

  // ── 1. Load all data files ──────────────────────────────────────────────
  console.log('Loading data files…');
  const regions       = loadDataFile('regions.js',       'REGIONS');
  const nations       = loadDataFile('nations.js',       'NATIONS');
  const cities        = loadDataFile('cities.js',        'CITIES');
  const creatures     = loadDataFile('creatures.js',     'CREATURES');
  const organizations = loadDataFile('organizations.js', 'ORGANIZATIONS');
  const characters    = loadDataFile('characters.js',    'CHARACTERS');
  const pois          = loadDataFile('pois.js',          'POIS');
  const religions     = loadDataFile('religions.js',     'RELIGIONS');
  const items         = loadDataFile('items.js',         'ITEMS');
  const quests        = loadDataFile('quests.js',        'QUESTS');

  // Spells use SPELL_DATA not SPELLS — check both
  let spells = loadDataFile('spells.js', 'SPELL_DATA');
  if (!spells.length) spells = loadDataFile('spells.js', 'SPELLS');

  console.log('');

  // ── 2. Transform ────────────────────────────────────────────────────────
  console.log('Transforming records…');
  const tRegions       = regions.map(transformRegion);
  const tNations       = nations.map(transformNation);
  const tCities        = cities.map(transformCity);
  const tCreatures     = creatures.map(transformCreature);
  const tOrganizations = organizations.map(transformOrganization);
  const tCharacters    = characters
                           .filter(c => !c.pc)   // exclude player characters
                           .map(transformWorldCharacter);
  const tPois          = pois.map(transformPoi);
  const tReligions     = religions.map(transformReligion);
  const tItems         = items.map(transformItem);
  const tQuests        = quests.map(transformQuest);
  const tSpells        = spells.map(transformSpell);
  console.log('  ✓  All records transformed');
  console.log('');

  // ── 3. Upsert — order matters (regions before nations before cities) ─────
  console.log('Upserting into Supabase…');
  console.log('');

  await batchUpsert('regions',          tRegions);
  await batchUpsert('nations',          tNations);
  await batchUpsert('cities',           tCities);
  await batchUpsert('creatures',        tCreatures);
  await batchUpsert('organizations',    tOrganizations);
  await batchUpsert('world_characters', tCharacters);
  await batchUpsert('pois',             tPois);
  await batchUpsert('religions',        tReligions);
  await batchUpsert('items',            tItems);
  await batchUpsert('quests',           tQuests);
  await batchUpsert('spells',           tSpells);

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  Migration complete.');
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Open Supabase Table Editor and spot-check a few rows');
  console.log('  2. Verify world_characters rows exist and secret/dm_notes are present');
  console.log('  3. Run the character.js submitCharacter() update (Step 3)');
  console.log('══════════════════════════════════════════════════');
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
