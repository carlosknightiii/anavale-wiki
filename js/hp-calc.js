// ══════════════════════════════════════════════════════════════════
// ANAVALE — shared HP calculation (sheet/index.html + dm.html)
// AC has no equivalent here — it's fully live-computed in
// sheet/index.html's renderEquippedAC() and needs no stored/cached state.
// ══════════════════════════════════════════════════════════════════

// hpBase: level 1 is hit die max + CON mod; each later level adds the fixed
// average (die/2 + 1) + CON mod; Tough adds 2 per level. Rolled HP isn't
// supported: the table uses the fixed value.
function computeHpBase(character, classRow) {
  var scores = (typeof character.ability_scores === 'object' && character.ability_scores) ? character.ability_scores : {};
  var conMod = Math.floor(((parseInt(scores.con) || 10) - 10) / 2);
  var hitDieMax = (classRow && classRow.hit_die) ? parseInt(String(classRow.hit_die).replace('d', '')) : 8;
  var level = character.level || 1;
  var toughBonus = (Array.isArray(character.feats) && character.feats.indexOf('Tough') >= 0) ? 2 * level : 0;
  // Levels past 1 use the 2024 PHB fixed hit point value (half the die + 1)
  // plus CON mod per level. The table takes this "standard" increase rather
  // than rolling, so it stays derivable instead of needing a stored roll.
  var perLevel = Math.max(1, Math.floor(hitDieMax / 2) + 1 + conMod);
  var higher = Math.max(0, level - 1) * perLevel;
  return { hpBase: hitDieMax + conMod + higher + toughBonus, conMod: conMod };
}

// Recomputes hp_max from the character's current CON/feats/level every time
// a sheet is loaded, and — per the 5e rule — carries any CON-mod delta since
// the last reconciliation over to hp_current too (not a full heal, not a no-op).
// Returns null when nothing needs to change, so callers can skip the write.
function reconcileHp(sheetRow, character, classRow) {
  var computed = computeHpBase(character, classRow);
  var cached = sheetRow.hp_con_mod_cached;

  if (cached === null || cached === undefined) {
    if (computed.hpBase === sheetRow.hp_max && computed.conMod === cached) return null;
    return { hp_max: computed.hpBase, hp_current: sheetRow.hp_current, hp_con_mod_cached: computed.conMod };
  }
  if (computed.conMod === cached) {
    if (computed.hpBase === sheetRow.hp_max) return null;
    return { hp_max: computed.hpBase, hp_current: sheetRow.hp_current, hp_con_mod_cached: cached };
  }

  var delta = computed.conMod - cached;
  var maxEffective = computed.hpBase + (parseInt(sheetRow.hp_max_modifier) || 0);
  var newCurrent = Math.max(0, Math.min(maxEffective, (parseInt(sheetRow.hp_current) || 0) + delta));
  return { hp_max: computed.hpBase, hp_current: newCurrent, hp_con_mod_cached: computed.conMod };
}
