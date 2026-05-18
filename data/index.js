// ─── WORLD_DATA ───────────────────────────────────────────────────────────────
// Unified index of all Anavale world data.
// Each collection references the var arrays defined in the individual data files.
// Load order in index.html: regions.js → nations.js → cities.js → creatures.js
//   → organizations.js → characters.js → index.js
// ─────────────────────────────────────────────────────────────────────────────

var WORLD_DATA = {
  regions:       typeof REGIONS           !== "undefined" ? REGIONS           : [],
  nations:       typeof NATIONS           !== "undefined" ? NATIONS           : [],
  cities:        typeof CITIES            !== "undefined" ? CITIES            : [],
  creatures:     typeof CREATURE_DATA     !== "undefined" ? CREATURE_DATA     : [],
  organizations: typeof ORGANIZATION_DATA !== "undefined" ? ORGANIZATION_DATA : [],
  characters:    typeof CHARACTER_DATA    !== "undefined" ? CHARACTER_DATA    : [],
  spells:        typeof SPELL_DATA        !== "undefined" ? SPELL_DATA        : []
};

// ─── SEARCH ──────────────────────────────────────────────────────────────────
// worldSearch(query) → flat array of result objects:
//   { collection, id, name, summary, tags, score }
// Searches across all collections. Case-insensitive substring match on:
//   name, summary (or description), tags.
// ─────────────────────────────────────────────────────────────────────────────

function worldSearch(query) {
  if (!query || query.trim() === "") return [];
  var q = query.trim().toLowerCase();
  var results = [];

  Object.keys(WORLD_DATA).forEach(function (collection) {
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
