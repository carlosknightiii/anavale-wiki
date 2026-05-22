// ─── WORLD_DATA ───────────────────────────────────────────────────────────────
// Unified index of all Anavale world data.
// Each collection references the var arrays defined in the individual data files.
// Load order in index.html: regions.js → nations.js → cities.js → creatures.js
//   → organizations.js → characters.js → pois.js → items.js → religions.js → index.js
// ─────────────────────────────────────────────────────────────────────────────

var WORLD_DATA = {
  regions:       typeof REGIONS       !== "undefined" ? REGIONS       : [],
  nations:       typeof NATIONS       !== "undefined" ? NATIONS       : [],
  cities:        typeof CITIES        !== "undefined" ? CITIES        : [],
  creatures:     typeof CREATURES     !== "undefined" ? CREATURES     : [],
  organizations: typeof ORGANIZATIONS !== "undefined" ? ORGANIZATIONS : [],
  characters:    typeof CHARACTERS    !== "undefined" ? CHARACTERS    : [],
  pois:          typeof POIS          !== "undefined" ? POIS          : [],
  religions:     typeof RELIGIONS     !== "undefined" ? RELIGIONS     : [],
  spells:        typeof SPELL_DATA    !== "undefined" ? SPELL_DATA    : []
};

// ─── SEARCH ──────────────────────────────────────────────────────────────────
// worldSearch(query) → flat array of result objects:
//   { collection, id, name, summary, tags, score }
// Searches across all collections. Case-insensitive substring match on:
//   name, summary (or description), tags.
// Spells are excluded — they have their own dedicated search in the spellbook.
// ─────────────────────────────────────────────────────────────────────────────

function worldSearch(query) {
  if (!query || query.trim() === "") return [];
  var q = query.trim().toLowerCase();
  var results = [];

  Object.keys(WORLD_DATA).forEach(function (collection) {
    if (collection === "spells") return; // spells have their own search
    WORLD_DATA[collection].forEach(function (entry) {
      var score = 0;
      var name    = (entry.name    || "").toLowerCase();
      var summary = (entry.summary || entry.description || "").toLowerCase();
      var tags    = (entry.tags    || []).join(" ").toLowerCase();

      if (name === q)                 score += 100;
      else if (name.indexOf(q) === 0) score += 60;
      else if (name.indexOf(q) >= 0)  score += 30;
      if (summary.indexOf(q) >= 0)    score += 10;
      if (tags.indexOf(q) >= 0)       score += 5;

      if (score > 0) {
        results.push({
          collection: collection,
          id:         entry.id,
          name:       entry.name,
          summary:    entry.summary || entry.description || "",
          tags:       entry.tags || [],
          score:      score
        });
      }
    });
  });

  results.sort(function (a, b) { return b.score - a.score; });
  return results;
}

// ─── FILTER HELPERS ──────────────────────────────────────────────────────────

function getByRegion(regionId) {
  var out = {};
  ["nations", "cities", "creatures"].forEach(function (col) {
    out[col] = WORLD_DATA[col].filter(function (e) {
      return Array.isArray(e.regions)
        ? e.regions.indexOf(regionId) >= 0
        : e.region === regionId;
    });
  });
  return out;
}

function getByTag(tag) {
  var out = {};
  Object.keys(WORLD_DATA).forEach(function (col) {
    if (col === "spells") return;
    out[col] = WORLD_DATA[col].filter(function (e) {
      return (e.tags || []).indexOf(tag) >= 0;
    });
  });
  return out;
}

function getByAlignment(alignment) {
  return WORLD_DATA.organizations.filter(function (o) {
    return o.alignment === alignment;
  });
}

function getById(collection, id) {
  return (WORLD_DATA[collection] || []).find(function (e) {
    return e.id === id;
  }) || null;
}

// ─── RELIGION QUERY HELPERS ──────────────────────────────────────────────────
// These are the core of Option C — each function gathers all entries across
// all collections that relate to a given religion id.
// Used by renderReligion() in wiki.js to assemble pages dynamically.
// ─────────────────────────────────────────────────────────────────────────────

// getReligionData(religionId) → object with related entries from every collection
// Only returns player-visible entries (hidden entries excluded).
function getReligionData(religionId) {
  var rid = religionId.toLowerCase();

  function hasReligion(entry) {
    // Check the religion array field
    if (Array.isArray(entry.religion)) {
      return entry.religion.indexOf(rid) >= 0;
    }
    // Fallback: check tags (for entries not yet migrated to religion field)
    return (entry.tags || []).indexOf(rid) >= 0;
  }

  function isVisible(entry) {
    return entry.player_facing === true || entry.player_facing === "teaser";
  }

  return {
    religion:      getById("religions", rid),
    gods:          WORLD_DATA.characters.filter(function(e)    { return hasReligion(e) && isVisible(e) && (e.category === "god" || (e.tags||[]).indexOf("god") >= 0); }),
    organizations: WORLD_DATA.organizations.filter(function(e) { return hasReligion(e) && isVisible(e); }),
    holy_sites:    WORLD_DATA.pois.filter(function(e)          { return hasReligion(e) && isVisible(e); }),
    cities:        WORLD_DATA.cities.filter(function(e)        { return hasReligion(e) && isVisible(e); }),
    nations:       WORLD_DATA.nations.filter(function(e)       { return hasReligion(e) && isVisible(e); }),
    creatures:     WORLD_DATA.creatures.filter(function(e)     { return hasReligion(e) && isVisible(e); })
  };
}

// getAllReligions() → array of religion entries, player-visible only, sorted by name
function getAllReligions() {
  return WORLD_DATA.religions
    .filter(function(r) { return r.player_facing === true || r.player_facing === "teaser"; })
    .sort(function(a, b) { return a.name.localeCompare(b.name); });
}
