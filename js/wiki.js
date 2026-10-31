// ══ WIKI.JS — Anavale Wiki ═══════════════════════════════════════════════════
// Navigation, sidebar, renderers, search, wiki-links, spellbook.
// Requires: data/regions.js, nations.js, cities.js, creatures.js,
//           organizations.js, characters.js, pois.js, items.js, religions.js, index.js
//           js/router.js (loaded before this file)
// ═════════════════════════════════════════════════════════════════════════════

// ══ HELPERS ══════════════════════════════════════════════════════════════════

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function titleCase(str) {
  return (str || '').replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Alias used in search
function escapeRe(str) { return escapeRegex(str); }

function creatureSubtitle(c) {
  if (!c) return '';
  return (c.tier ? c.tier.charAt(0).toUpperCase() + c.tier.slice(1) : '')
       + (c.habitat ? ' · ' + c.habitat : '');
}

// Build a breadcrumb HTML string from segments [{label, hash}]
function breadcrumb(segments) {
  var parts = segments.map(function(s, i) {
    if (i === segments.length - 1) {
      return '<span>' + esc(s.label) + '</span>';
    }
    return '<span data-nav="' + esc(s.hash) + '" onclick="navigate(\'' + esc(s.hash) + '\')">' + esc(s.label) + '</span>';
  });
  return '<nav class="wiki-breadcrumb">' + parts.join('<span class="sep">›</span>') + '</nav>';
}

// Standard page header HTML
function pageHeader(category, title, subtitle) {
  return '<div class="page-header">'
    + '<div class="page-category">' + esc(category) + '</div>'
    + '<h1 class="page-title">' + esc(title) + '</h1>'
    + (subtitle ? '<p class="page-subtitle">' + esc(subtitle) + '</p>' : '')
    + '</div>';
}

// Render a "not found" state
function renderNotFound(el, hash) {
  el.innerHTML = pageHeader('The Compendium Stirs…', 'This Page Has Not Been Discovered', null)
    + '<div class="wiki-body">'
    + '<p>The entry <em>' + esc(hash) + '</em> exists in no archive the Compendium can reach — either it has not yet been found, or its story has not yet been written.</p>'
    + '<p>Perhaps the Formery has misfiled it. Perhaps it is hidden. Perhaps it is waiting.</p>'
    + '<p>Use the navigation on the left to find what you are looking for.</p>'
    + '</div>';
}

// Render an optional entry image as a full-width hero below the page header.
// Pass an optional extraClass (e.g. 'entry-hero-image--creature') to apply
// page-type-specific sizing without one-off inline styles.
function entryImage(src, alt, extraClass) {
  if (!src) return '';
  var cls = 'entry-hero-image' + (extraClass ? ' ' + extraClass : '');
  return '<img class="' + cls + '" src="' + esc(src)
    + '" alt="' + esc(alt || '') + '">';
}

// Visibility badge (player_facing)
function visibilityBadge(entry) {
  if (entry && entry.player_facing === false) {
    return '<span class="entry-tag" style="color:#aa3a1a;">DM Only</span>';
  }
  return '';
}

// ── VISIBILITY SYSTEM ─────────────────────────────────────────────────────────
// Three states: 'hidden' (default), 'teaser' (name/summary only), 'visible' (full)

// Supabase player_facing is a boolean, so the teaser tier is a tag:
// player_facing true + tags containing 'wiki-teaser' = name and summary only.
// Rule (DM, Oct 2026): hidden = never heard of; teaser = heard of it only;
// visible = common knowledge, not quest-integral, seen/heard/visited.
function getVisibility(entry) {
  if (!entry) return 'hidden';
  if (entry.player_facing === true && Array.isArray(entry.tags) && entry.tags.indexOf('wiki-teaser') >= 0) return 'teaser';
  if (entry.player_facing === true)      return 'visible';
  if (entry.player_facing === 'teaser')  return 'teaser';
  return 'hidden';
}

function isPlayerFacing(entry) {
  return entry && (entry.player_facing === true || entry.player_facing === 'teaser');
}

// Returns visible characters associated with a given collection + id pair.
// Respects player_facing — hidden characters are excluded for players.
function getAssociatedCharacters(collection, id) {
  var chars = typeof CHARACTERS !== 'undefined' ? CHARACTERS : [];
  return chars.filter(function(c) {
    if (!c.associated || !c.associated.length) return false;
    if (getVisibility(c) === 'hidden') return false;
    return c.associated.some(function(a) {
      return a.collection === collection && a.id === id;
    });
  }).sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
}

// Renders a "Characters" section given a list of character entries.
function renderAssociatedCharacters(chars) {
  if (!chars || !chars.length) return '';
  var html = '<div class="section-heading">Characters</div><div class="entry-grid">';
  chars.forEach(function(c) {
    var cVis = getVisibility(c);
    html += '<div class="entry-card" data-nav="character/' + c.id + '" onclick="navigate(\'character/' + c.id + '\')">'
      + '<div class="entry-name"><span class="wiki-link">' + esc(c.name) + '</span></div>'
      + '<div class="entry-tag">' + esc(c.role || c.category || '') + '</div>'
      + '<div class="entry-body">' + esc(c.summary || '') + '</div>'
      + (cVis === 'teaser' ? '<div class="entry-teaser-hint">✦ Not yet fully discovered</div>' : '')
      + '</div>';
  });
  html += '</div>';
  return html;
}

// Content-type word for the universal teaser footer
function teaserFooter(type) {
  return '<div class="teaser-footer">✦ The full story of this ' + type + ' has not yet been discovered.</div>';
}

// ══ SIDEBAR ══════════════════════════════════════════════════════════════════

// Accordion toggle — called from inline onclick
function toggleAccordion(btn) {
  var body = btn.nextElementSibling;
  if (!body || !body.classList.contains('nav-accordion-body')) return;
  var isOpen = body.classList.contains('open');

  // Persist state
  var key = btn.getAttribute('data-key');
  if (key) {
    try { sessionStorage.setItem('acc-' + key, isOpen ? '0' : '1'); } catch(e) {}
  }

  body.classList.toggle('open', !isOpen);
  btn.classList.toggle('open', !isOpen);
  btn.setAttribute('aria-expanded', String(!isOpen));
}

function getAccState(key) {
  try { return sessionStorage.getItem('acc-' + key); } catch(e) { return null; }
}

// Line icons for the sidebar sections (stroke uses currentColor)
var NAV_ICONS = {
  intro:     '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  world:     '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  regions:   '<path d="M3 20l6-11 4 7 3-4 5 8z"/><circle cx="17" cy="6" r="2"/>',
  creatures: '<circle cx="6" cy="10" r="2"/><circle cx="10" cy="5.5" r="2"/><circle cx="14" cy="5.5" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 11c-3 0-5.5 3.5-5.5 6 0 2 1.5 3 3 3 1 0 1.6-.6 2.5-.6s1.5.6 2.5.6c1.5 0 3-1 3-3 0-2.5-2.5-6-5.5-6z"/>',
  society:   '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c2.9-.4 5.5 1.8 5.5 5.8"/>',
  faiths:    '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'
};
function navIcon(key) {
  return '<span class="nav-sec-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (NAV_ICONS[key] || '') + '</svg></span>';
}
var NAV_CHEVRON = '<svg class="nav-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

function makeAccordion(key, label, childrenHtml, defaultOpen, count) {
  var stored = getAccState(key);
  var open   = stored !== null ? stored === '1' : !!defaultOpen;
  var openCls = open ? ' open' : '';
  return '<button class="nav-accordion-header' + openCls + '" data-key="' + esc(key) + '" aria-expanded="' + open + '" onclick="toggleAccordion(this)">'
    + NAV_CHEVRON
    + '<span class="nav-acc-label">' + label + '</span>'
    + (count ? '<span class="nav-count">' + count + '</span>' : '')
    + '</button>'
    + '<div class="nav-accordion-body' + openCls + '"><div class="nav-acc-inner">'
    + childrenHtml
    + '</div></div>';
}

// Top-level section: icon tile, title, chevron
function makeSectionAccordion(key, icon, label, childrenHtml, defaultOpen) {
  var stored = getAccState(key);
  var open   = stored !== null ? stored === '1' : !!defaultOpen;
  var openCls = (open ? ' open' : '') + (defaultOpen ? ' has-active' : '');
  return '<button class="nav-section-accordion-header' + openCls + '" data-key="' + esc(key) + '" aria-expanded="' + open + '" onclick="toggleAccordion(this)">'
    + navIcon(icon)
    + '<span class="nav-sec-label">' + esc(label) + '</span>'
    + NAV_CHEVRON
    + '</button>'
    + '<div class="nav-accordion-body nav-sec-body' + (open ? ' open' : '') + '"><div class="nav-acc-inner">'
    + childrenHtml
    + '</div></div>';
}

// Teaser entries get a small "rumoured" marker instead of an emoji
function navLabel(name, vis) {
  return (vis === 'teaser' ? '<span class="nav-rumour" title="Only rumours so far" aria-label="Only rumours so far"></span>' : '') + esc(name);
}

function navLink(label, hash, activeHash, isHtml) {
  var isActive = (hash === activeHash) ? ' active' : '';
  return '<button class="nav-link' + isActive + '" data-hash="' + esc(hash) + '" onclick="navigate(\'' + esc(hash) + '\')">'
    + (isHtml ? label : esc(label)) + '</button>';
}

function buildSidebar() {
  var currentHash = getHash();
  var nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  var regions   = typeof REGIONS        !== 'undefined' ? REGIONS        : [];
  var nations   = typeof NATIONS        !== 'undefined' ? NATIONS        : [];
  var cities    = typeof CITIES         !== 'undefined' ? CITIES         : [];
  var creatures = typeof CREATURES  !== 'undefined' ? CREATURES  : [];
  var orgs      = typeof ORGANIZATIONS !== 'undefined' ? ORGANIZATIONS : [];
  var items     = typeof ITEMS          !== 'undefined' ? ITEMS          : [];
  var pois      = typeof POIS           !== 'undefined' ? POIS           : [];

  var html = '';

  // ── Introduction ──────────────────────────────────
  var introActive = (currentHash === 'home');
  html += '<div class="nav-section">'
    + makeSectionAccordion('intro', 'intro', 'Introduction',
        navLink('Welcome to Anavale', 'home', currentHash), introActive)
    + '</div>';

  // ── The World ──────────────────────────────────────
  var worldActive = ['gigglegloom','spells','color','gods','calendar','weather'].indexOf(currentHash) >= 0;
  html += '<div class="nav-section">'
    + makeSectionAccordion('world', 'world', 'The World',
        navLink('The Gigglegloom', 'gigglegloom', currentHash)
        + navLink('Spellbook', 'spells', currentHash)
        + navLink('Color & The Dimming', 'color', currentHash)
        + navLink('The Gods', 'gods', currentHash)
        + navLink('The Calendar', 'calendar', currentHash)
        + navLink('Weather', 'weather', currentHash), worldActive)
    + '</div>';

  // ── Regions (only show if at least one visible/teaser entry beneath) ──
  var regionOrder = ['caparia', 'nombi', 'sohot', 'jugabi'];
  var regionAccordions = '';
  regionOrder.forEach(function(rId) {
    var region = null;
    for (var i = 0; i < regions.length; i++) {
      if (regions[i].id === rId) { region = regions[i]; break; }
    }
    var rLabel = region ? region.name : titleCase(rId);

    // Only include nations that are visible or teaser
    var rNations = nations.filter(function(n) {
      return n.region === rId && getVisibility(n) !== 'hidden';
    }).sort(function(a,b) { return a.name.localeCompare(b.name); });

    // Check if there are any visible/teaser cities directly in this region too
    var rCitiesDirect = cities.filter(function(c) {
      return c.region === rId && getVisibility(c) !== 'hidden';
    });

    // Skip region entirely if nothing visible beneath it
    if (rNations.length === 0 && rCitiesDirect.length === 0) return;

    var innerHtml = '<div class="nav-level-2">'
      + navLink('Overview', 'region/' + rId, currentHash);

    rNations.forEach(function(n) {
      var nVis   = getVisibility(n);
      var nLabel = navLabel(n.name, nVis);

      var nCities = cities.filter(function(c) {
        return c.nation === n.id && getVisibility(c) !== 'hidden';
      }).sort(function(a,b) { return a.name.localeCompare(b.name); });

      if (nCities.length > 0) {
        var cityLinks = '';
        nCities.forEach(function(c) {
          var cVis   = getVisibility(c);
          var cLabel = navLabel(c.name, cVis);
          cityLinks += '<div class="nav-level-4">'
            + navLink(cLabel, 'city/' + c.id, currentHash, true)
            + '</div>';
        });
        innerHtml += '<div class="nav-level-3">'
          + makeAccordion('nation-' + n.id, nLabel,
            navLink('Overview', 'nation/' + n.id, currentHash) + cityLinks)
          + '</div>';
      } else {
        innerHtml += '<div class="nav-level-3">'
          + navLink(nLabel, 'nation/' + n.id, currentHash, true)
          + '</div>';
      }
    });

    innerHtml += '</div>';
    regionAccordions += makeAccordion('region-' + rId, esc(rLabel), innerHtml);
  });

  if (regionAccordions) {
    var regActive = currentHash.indexOf('region/') === 0 || currentHash.indexOf('nation/') === 0 || currentHash.indexOf('city/') === 0;
    html += '<div class="nav-section">'
      + makeSectionAccordion('regions-section', 'regions', 'Regions', regionAccordions, regActive)
      + '</div>';
  }

  // ── Creatures (accordion by tier group, visibility-filtered) ────────────
  var TIER_GROUPS = [
    { key: 'merry',      label: 'The Merry',       tiers: ['merry'] },
    { key: 'common',     label: 'Common',           tiers: ['common'] },
    { key: 'rare',       label: 'Rare',             tiers: ['rare'] },
    { key: 'sparked',    label: 'The Sparked',      tiers: ['sparked'] },
    { key: 'dimmed',     label: 'The Dimmed',       tiers: ['dimmed'] },
    { key: 'corrupted',  label: 'Corrupted',        tiers: ['corrupted'] },
    { key: 'ancient',    label: 'Ancient & Mythic', tiers: ['ancient', 'unseen', 'unknown'] },
    { key: 'regional',   label: 'Region-Exclusive', tiers: ['region-exclusive'] }
  ];

  var creatureInner = '';
  var hasCreatures = false;
  TIER_GROUPS.forEach(function(grp) {
    var grpCreatures = creatures.filter(function(c) {
      return grp.tiers.indexOf(c.tier) >= 0 && getVisibility(c) !== 'hidden';
    }).sort(function(a,b) { return a.name.localeCompare(b.name); });
    if (!grpCreatures.length) return;
    hasCreatures = true;
    var links = grpCreatures.map(function(c) {
      var cVis   = getVisibility(c);
      var cLabel = navLabel(c.name, cVis);
      return '<div class="nav-level-3">' + navLink(cLabel, 'creature/' + c.id, currentHash, true) + '</div>';
    }).join('');
    creatureInner += '<div class="nav-level-2">'
      + makeAccordion('tier-' + grp.key, esc(grp.label), links, false, grpCreatures.length)
      + '</div>';
  });
  if (hasCreatures) {
    var creatActive = currentHash.indexOf('creature/') === 0;
    html += '<div class="nav-section">'
      + makeSectionAccordion('creatures-section', 'creatures', 'Creatures', creatureInner, creatActive)
      + '</div>';
  }

  // ── Society (orgs, items, pois, rumors) ──────────
  var societyContent = '';

  // Organizations — filtered by visibility
  var ORG_CATS = [
    { key: 'light',   label: 'Forces of Light' },
    { key: 'neutral', label: 'Neutral Powers'  },
    { key: 'dark',    label: 'Shadow Forces'   }
  ];
  var orgInner = '';
  ORG_CATS.forEach(function(cat) {
    var catOrgs = orgs.filter(function(o) {
      return o.alignment === cat.key && getVisibility(o) !== 'hidden';
    }).sort(function(a,b) { return a.name.localeCompare(b.name); });
    if (!catOrgs.length) return;
    var links = catOrgs.map(function(o) {
      var oVis   = getVisibility(o);
      var oLabel = navLabel(o.name, oVis);
      return '<div class="nav-level-3">' + navLink(oLabel, 'org/' + o.id, currentHash, true) + '</div>';
    }).join('');
    orgInner += '<div class="nav-level-2">'
      + makeAccordion('org-' + cat.key, esc(cat.label), links, false, catOrgs.length)
      + '</div>';
  });
  if (orgInner) {
    societyContent += makeAccordion('organizations', 'Organizations', orgInner);
  }

  // Items — filtered by visibility
  var visItems = items.filter(function(it) { return getVisibility(it) !== 'hidden'; })
    .sort(function(a,b) { return a.name.localeCompare(b.name); });
  if (visItems.length) {
    var itemLinks = visItems.map(function(it) {
      var itVis   = getVisibility(it);
      var itLabel = navLabel(it.name, itVis);
      return '<div class="nav-level-2">' + navLink(itLabel, 'item/' + it.id, currentHash, true) + '</div>';
    }).join('');
    societyContent += makeAccordion('items', 'Notable Items', itemLinks, false, visItems.length);
  }

  // Characters — filtered by visibility, sorted by name
  var chars = typeof CHARACTERS !== 'undefined' ? CHARACTERS : [];
  var visChars = chars.filter(function(c) { return getVisibility(c) !== 'hidden'; })
    .sort(function(a,b) { return a.name.localeCompare(b.name); });
  if (visChars.length) {
    var charLinks = visChars.map(function(c) {
      var cVis   = getVisibility(c);
      var cLabel = navLabel(c.name, cVis);
      return '<div class="nav-level-2">' + navLink(cLabel, 'character/' + c.id, currentHash, true) + '</div>';
    }).join('');
    societyContent += makeAccordion('characters', 'Characters', charLinks, false, visChars.length);
  }

  // POIs — filtered by visibility
  var visPois = pois.filter(function(p) { return getVisibility(p) !== 'hidden'; })
    .sort(function(a,b) { return a.name.localeCompare(b.name); });
  if (visPois.length) {
    var poiLinks = visPois.map(function(p) {
      var pVis   = getVisibility(p);
      var pLabel = navLabel(p.name, pVis);
      return '<div class="nav-level-2">' + navLink(pLabel, 'poi/' + p.id, currentHash, true) + '</div>';
    }).join('');
    societyContent += makeAccordion('pois', 'Points of Interest', poiLinks, false, visPois.length);
  }

  // Rumors — direct link (no extra accordion wrapper needed)
  societyContent += navLink('Rumours & Hearsay', 'rumors', currentHash);

  var societyActive = currentHash.indexOf('org/') === 0 || currentHash.indexOf('item/') === 0 || currentHash.indexOf('character/') === 0
    || currentHash.indexOf('poi/') === 0 || currentHash === 'rumors';
  html += '<div class="nav-section">'
    + makeSectionAccordion('society-section', 'society', 'Society', societyContent, societyActive)
    + '</div>';

  // ── Faiths (religions, visibility-filtered) ──────────────────────
  var religions = typeof RELIGIONS !== 'undefined' ? RELIGIONS : [];
  var visReligions = religions.filter(function(r) { return getVisibility(r) !== 'hidden'; })
    .sort(function(a,b) { return a.name.localeCompare(b.name); });
  if (visReligions.length) {
    var faithContent = '';
    visReligions.forEach(function(r) {
      var rVis   = getVisibility(r);
      var rLabel = navLabel(r.name, rVis);
      faithContent += navLink(rLabel, 'religion/' + r.id, currentHash, true);
    });
    var faithActive = currentHash.indexOf('religion/') === 0;
    html += '<div class="nav-section">'
      + makeSectionAccordion('faiths-section', 'faiths', 'Faiths', faithContent, faithActive)
      + '</div>';
  }

  nav.innerHTML = html;
}

// ══ SEARCH ═══════════════════════════════════════════════════════════════════

var _searchIndex  = null;
var _searchResults = [];

function buildSearchIndex() {
  _searchIndex = {};
  var allData = [];

  var regions   = typeof REGIONS        !== 'undefined' ? REGIONS        : [];
  var nations   = typeof NATIONS        !== 'undefined' ? NATIONS        : [];
  var cities    = typeof CITIES         !== 'undefined' ? CITIES         : [];
  var creatures = typeof CREATURES  !== 'undefined' ? CREATURES  : [];
  var orgs      = typeof ORGANIZATIONS !== 'undefined' ? ORGANIZATIONS : [];
  var chars     = typeof CHARACTERS !== 'undefined' ? CHARACTERS : [];
  var items     = typeof ITEMS          !== 'undefined' ? ITEMS          : [];
  var pois      = typeof POIS           !== 'undefined' ? POIS           : [];

  // SECURITY: Only index player-facing entries. Hidden entries (player_facing === false
  // or absent) must never appear in search results. Teaser entries are indexed with
  // name+summary only — never description, behavior, dm_notes, or other DM content.
  regions.forEach(function(r) {
    var vis = getVisibility(r);
    if (vis === 'hidden') return;
    var text = r.name + ' ' + (r.summary||'');
    if (vis === 'visible') text += ' ' + (r.tone||'');
    allData.push({ hash: 'region/' + r.id, title: r.name, text: text, player_facing: r.player_facing });
  });
  nations.forEach(function(n) {
    var vis = getVisibility(n);
    if (vis === 'hidden') return;
    var text = n.name + ' ' + (n.summary||'');
    if (vis === 'visible') text += ' ' + (n.culture||'') + ' ' + (n.beliefs||'');
    allData.push({ hash: 'nation/' + n.id, title: n.name, text: text, player_facing: n.player_facing });
  });
  cities.forEach(function(c) {
    var vis = getVisibility(c);
    if (vis === 'hidden') return;
    var text = c.name + ' ' + (c.summary||'');
    if (vis === 'visible') text += ' ' + (c.description||'');
    allData.push({ hash: 'city/' + c.id, title: c.name, text: text, player_facing: c.player_facing });
  });
  creatures.forEach(function(c) {
    var vis = getVisibility(c);
    if (vis === 'hidden') return;
    var text = c.name + ' ' + (c.summary||'');
    if (vis === 'visible') text += ' ' + (c.description||'') + ' ' + (c.behavior||'') + ' ' + (c.tags||[]).join(' ');
    allData.push({ hash: 'creature/' + c.id, title: c.name, text: text, player_facing: c.player_facing });
  });
  orgs.forEach(function(o) {
    var vis = getVisibility(o);
    if (vis === 'hidden') return;
    var text = o.name + ' ' + (o.summary||'');
    if (vis === 'visible') text += ' ' + (o.purpose||'') + ' ' + (o.tags||[]).join(' ');
    allData.push({ hash: 'org/' + o.id, title: o.name, text: text, player_facing: o.player_facing });
  });
  chars.forEach(function(c) {
    var vis = getVisibility(c);
    if (vis === 'hidden') return;
    var text = c.name + ' ' + (c.summary||'');
    if (vis === 'visible') text += ' ' + (c.player_knowledge||'');
    allData.push({ hash: 'gods', title: c.name, text: text, player_facing: c.player_facing });
  });
  items.forEach(function(it) {
    var vis = getVisibility(it);
    if (vis === 'hidden') return;
    var text = it.name + ' ' + (it.summary||'');
    if (vis === 'visible') text += ' ' + (it.description||'');
    allData.push({ hash: 'item/' + it.id, title: it.name, text: text, player_facing: it.player_facing });
  });
  pois.forEach(function(p) {
    var vis = getVisibility(p);
    if (vis === 'hidden') return;
    var text = p.name + ' ' + (p.summary||'');
    if (vis === 'visible') text += ' ' + (p.description||'');
    allData.push({ hash: 'poi/' + p.id, title: p.name, text: text, player_facing: p.player_facing });
  });

  (typeof CONCEPTS !== 'undefined' ? CONCEPTS : []).forEach(function(c) {
    var vis = getVisibility(c);
    if (vis === 'hidden') return;
    allData.push({ hash: 'lore/' + c.id, title: c.name, text: c.name + ' ' + (c.summary || '') + (vis === 'visible' ? ' ' + (c.description || '') : ''), player_facing: true });
  });
  (typeof SPECIES !== 'undefined' ? SPECIES : []).forEach(function(sp) {
    if (sp.player_facing === false) return;
    allData.push({ hash: 'species/' + sp.id, title: sp.name, text: sp.name + ' ' + (sp.phb_equivalent || '') + ' ' + (sp.description || ''), player_facing: true });
  });

  // Static pages — always player-facing
  [
    { hash: 'home',        title: 'Welcome, To Anavale', text: 'welcome home introduction anavale pogglewog',                                  player_facing: true },
    { hash: 'gigglegloom', title: 'The Gigglegloom',    text: 'gigglegloom magic bubbleseed featherflow steelfist flamerage prior conclave',   player_facing: true },
    { hash: 'color',       title: 'Color & The Dimming',text: 'color dimming fading stage grey quietude',                              player_facing: true },
    { hash: 'gods',        title: 'The Gods',           text: 'gods oro nara thyun solvara grak partition brightcreed stillkeep veilborn',     player_facing: true },
    { hash: 'religion/brightcreed', title: 'The Brightcreed', text: 'The Brightcreed brightcreed oro nara faith color festivals joy practices lumenites wardens',  player_facing: true },
    { hash: 'religion/stillkeep',   title: 'The Stillkeep',   text: 'The Stillkeep stillkeep thyun memory records archive monastic patience partition history',   player_facing: true },
    { hash: 'religion/veilborn',    title: 'The Veilborn',     text: 'The Veilborn veilborn solvara secrets shadow partition truth veilmoot hidden faith',        player_facing: true },
    { hash: 'rumors',      title: 'Rumours & Hearsay',  text: 'rumors hearsay rumours',                                                       player_facing: true },
    { hash: 'spells',      title: 'Spellbook',          text: 'spells spellbook gigglegloom cast',                                            player_facing: true },
    { hash: 'calendar',    title: 'The Calendar',       text: 'calendar months weekdays holidays year accord signing timeline',              player_facing: true },
    { hash: 'weather',     title: 'Weather',            text: 'weather seasons temperature climate snow rain heat caparia nombi sohot jugabi', player_facing: true }
  ].forEach(function(p) { allData.push(p); });

  allData.forEach(function(entry) {
    _searchIndex[entry.hash] = entry;
  });
}

function doSearch(query) {
  if (!_searchIndex) buildSearchIndex();
  var q = query.trim();
  if (!q) { closeSearch(); return; }
  var ql = q.toLowerCase();
  _searchResults = [];

  Object.values(_searchIndex).forEach(function(entry) {
    var lower = entry.text.toLowerCase();
    var pos   = lower.indexOf(ql);
    if (pos !== -1) {
      var start   = Math.max(0, pos - 60);
      var end     = Math.min(entry.text.length, pos + ql.length + 60);
      var excerpt = entry.text.slice(start, end).replace(/\s+/g, ' ').trim();
      if (start > 0) excerpt = '…' + excerpt;
      if (end < entry.text.length) excerpt += '…';
      var re      = new RegExp('(' + escapeRegex(q) + ')', 'gi');
      excerpt     = excerpt.replace(re, '<mark>$1</mark>');
      _searchResults.push({ hash: entry.hash, title: entry.title, excerpt: excerpt, player_facing: entry.player_facing });
    }
  });

  // SECURITY: Secondary filter — remove any hidden entry that somehow reached results.
  // This is a defence-in-depth check; buildSearchIndex() should never add hidden entries,
  // but this ensures they can never surface even if the index is stale or patched incorrectly.
  _searchResults = _searchResults.filter(function(r) {
    return r.player_facing === true || r.player_facing === 'teaser';
  });

  // Sort: exact title match first, then alphabetical
  _searchResults.sort(function(a, b) {
    var aExact = a.title.toLowerCase() === ql ? -1 : 0;
    var bExact = b.title.toLowerCase() === ql ? -1 : 0;
    return aExact - bExact || a.title.localeCompare(b.title);
  });

  renderSearchResults();
}

function renderSearchResults() {
  var container = document.getElementById('search-results');
  if (!container) return;
  if (!_searchResults.length) {
    container.innerHTML = '<div class="search-no-results">No entries found.</div>';
  } else {
    container.innerHTML = _searchResults.map(function(r, i) {
      return '<button class="search-result" onclick="navigateToResult(' + i + ')">'
           + '<div class="search-result-title">' + esc(r.title) + '</div>'
           + '<div class="search-result-excerpt">' + r.excerpt + '</div>'
           + '</button>';
    }).join('');
  }
  container.style.display = 'block';
}

function navigateToResult(idx) {
  var r = _searchResults[idx];
  if (!r) return;
  navigate(r.hash);
  closeSearch();
}

function closeSearch() {
  var container = document.getElementById('search-results');
  var input     = document.getElementById('wiki-search');
  if (container) container.style.display = 'none';
  if (input)     input.value = '';
  _searchResults = [];
}

document.addEventListener('click', function(e) {
  var container = document.getElementById('search-results');
  var input     = document.getElementById('wiki-search');
  if (container && !container.contains(e.target) && e.target !== input) {
    container.style.display = 'none';
  }
});

// ══ WIKI LINKS ════════════════════════════════════════════════════════════════

var _wikiLinkMap = null;

function buildWikiLinkMap() {
  _wikiLinkMap = [];

  var nations   = typeof NATIONS        !== 'undefined' ? NATIONS        : [];
  var cities    = typeof CITIES         !== 'undefined' ? CITIES         : [];
  var creatures = typeof CREATURES  !== 'undefined' ? CREATURES  : [];
  var orgs      = typeof ORGANIZATIONS !== 'undefined' ? ORGANIZATIONS : [];
  var items     = typeof ITEMS          !== 'undefined' ? ITEMS          : [];

  nations.filter(function(n) { return getVisibility(n) !== 'hidden'; }).forEach(function(n) {
    _wikiLinkMap.push({ term: n.name, hash: 'nation/' + n.id });
    if (n.full_name && n.full_name !== n.name) {
      _wikiLinkMap.push({ term: n.full_name, hash: 'nation/' + n.id });
    }
  });

  cities.filter(function(c) { return getVisibility(c) !== 'hidden'; }).forEach(function(c) {
    _wikiLinkMap.push({ term: c.name, hash: 'city/' + c.id });
  });

  creatures.filter(function(c) { return getVisibility(c) !== 'hidden'; }).forEach(function(c) {
    _wikiLinkMap.push({ term: c.name, hash: 'creature/' + c.id });
    // Singular form too: "a Fluffet", "one Bumble Frog"
    if (/[^s]s$/.test(c.name) && c.name.length >= 6) _wikiLinkMap.push({ term: c.name.slice(0, -1), hash: 'creature/' + c.id });
  });

  orgs.filter(function(o) { return getVisibility(o) !== 'hidden'; }).forEach(function(o) {
    _wikiLinkMap.push({ term: o.name, hash: 'org/' + o.id });
    if (o.full_name && o.full_name !== o.name) {
      _wikiLinkMap.push({ term: o.full_name, hash: 'org/' + o.id });
    }
  });

  items.filter(function(it) { return getVisibility(it) !== 'hidden'; }).forEach(function(it) {
    _wikiLinkMap.push({ term: it.name, hash: 'item/' + it.id });
  });

  var pois  = typeof POIS       !== 'undefined' ? POIS       : [];
  var chars = typeof CHARACTERS !== 'undefined' ? CHARACTERS : [];
  var rels  = typeof RELIGIONS  !== 'undefined' ? RELIGIONS  : [];
  pois.filter(function(p) { return getVisibility(p) !== 'hidden'; }).forEach(function(p) {
    _wikiLinkMap.push({ term: p.name, hash: 'poi/' + p.id });
  });
  chars.filter(function(c) { return getVisibility(c) !== 'hidden' && c.category !== 'god'; }).forEach(function(c) {
    _wikiLinkMap.push({ term: c.name, hash: 'character/' + c.id });
  });
  rels.filter(function(r) { return getVisibility(r) !== 'hidden'; }).forEach(function(r) {
    _wikiLinkMap.push({ term: r.name, hash: 'religion/' + r.id });
  });

  var concepts = typeof CONCEPTS !== 'undefined' ? CONCEPTS : [];
  concepts.filter(function(c) { return getVisibility(c) !== 'hidden'; }).forEach(function(c) {
    _wikiLinkMap.push({ term: c.name, hash: 'lore/' + c.id });
    // "The Wayhouses" also links "Wayhouse"
    if (/[^s]s$/.test(c.name) && c.name.length >= 8) _wikiLinkMap.push({ term: c.name.slice(0, -1).replace(/^the\s+/i, ''), hash: 'lore/' + c.id });
  });
  var species = typeof SPECIES !== 'undefined' ? SPECIES : [];
  species.filter(function(sp) { return sp.player_facing !== false; }).forEach(function(sp) {
    _wikiLinkMap.push({ term: sp.name, hash: 'species/' + sp.id });
    _wikiLinkMap.push({ term: sp.name + 's', hash: 'species/' + sp.id });
  });

  // Static terms
  var statics = [
    { term: 'The Gigglegloom',  hash: 'gigglegloom' },
    { term: 'Gigglegloom',      hash: 'gigglegloom' },
    { term: 'Bubbleseed',       hash: 'gigglegloom' },
    { term: 'Featherflow',      hash: 'gigglegloom' },
    { term: 'Steelfist',        hash: 'gigglegloom' },
    { term: 'Flamerage',        hash: 'gigglegloom' },
    { term: 'the Dimming',      hash: 'color' },
    { term: 'the Fading',       hash: 'color' },
    { term: 'The Dimming',      hash: 'color' },
    { term: 'The Fading',       hash: 'color' },
    { term: 'Dimming',          hash: 'color' },
    { term: 'Fading',           hash: 'color' },
    { term: 'the Partition',    hash: 'gods' },
    { term: 'The Partition',    hash: 'gods' },
    { term: 'Partition',        hash: 'gods' },
    { term: 'Brightcreed',      hash: 'religion/brightcreed' },
    { term: 'Stillkeep',        hash: 'religion/stillkeep' },
    { term: 'Veilborn',         hash: 'religion/veilborn' },
    { term: 'Oro',              hash: 'gods' },
    { term: 'Nara',             hash: 'gods' },
    { term: 'Thyun',            hash: 'gods' },
    { term: 'Solvara',          hash: 'gods' },
    { term: 'Grak',             hash: 'gods' },
    { term: 'Caparia',          hash: 'region/caparia' },
    { term: 'Nombi',            hash: 'region/nombi' },
    { term: 'Sohot',            hash: 'region/sohot' },
    { term: 'Jugabi',           hash: 'region/jugabi' },
    { term: 'Voidblush',        hash: 'org/prism-exchange' },
    { term: 'Prior Stone',      hash: 'city/prismhold' },
    { term: 'Chroma Bureau',    hash: 'city/prismhold' },
    { term: 'Tamsk',            hash: 'character/where-does-it-end-tamsk' },
    { term: 'Pogglewog',        hash: 'home' },
    // Short names and aliases for pages that exist (audit, Oct 2026)
    { term: 'Anavale',          hash: 'home' },
    { term: 'Dimmed',           hash: 'color' },
    { term: 'Faded',            hash: 'color' },
    { term: 'the Scar',         hash: 'poi/partition-scar' },
    { term: 'the Signing',      hash: 'org/pogglewog-confederation' },
    { term: 'Signing Table',    hash: 'org/pogglewog-confederation' },
    { term: 'Confederation Council', hash: 'org/pogglewog-confederation' },
    { term: 'Confederation',    hash: 'org/pogglewog-confederation' },
    { term: 'Conclave',         hash: 'org/gigglegloom-conclave' },
    { term: 'Sorvathi',         hash: 'nation/sorvathi-conclave' },
    { term: 'Telvari',          hash: 'nation/telvari-exchange' },
    { term: 'Accord Day',       hash: 'calendar' },
    { term: 'Gerald',           hash: 'character/gobblewump-gerald' }
  ];
  statics.forEach(function(s) { _wikiLinkMap.push(s); });

  // Names stored as "The X" also link when the text says just "X"
  // ("the Tekhari of Nombi", "Partition Scar"). Skip very short leftovers.
  _wikiLinkMap.slice().forEach(function(e) {
    var m = /^the\s+(.+)$/i.exec(e.term);
    if (m && m[1].length >= 5) _wikiLinkMap.push({ term: m[1], hash: e.hash });
  });

  // Sort longest first to prevent partial matches
  _wikiLinkMap.sort(function(a, b) { return b.term.length - a.term.length; });
}

function addWikiLinks() {
  if (!_wikiLinkMap) buildWikiLinkMap();
  var currentHash = getHash();

  var el = document.getElementById('wiki-content');
  if (!el) return;

  // Build term → hash map, excluding links to current page
  var termMap = {};
  _wikiLinkMap.forEach(function(entry) {
    if (entry.hash === currentHash) return;
    var key = entry.term.toLowerCase();
    if (!termMap[key]) termMap[key] = entry;
  });

  var sorted = Object.values(termMap).sort(function(a, b) { return b.term.length - a.term.length; });
  if (!sorted.length) return;

  var pattern = sorted.map(function(e) { return escapeRegex(e.term); }).join('|');
  var re      = new RegExp('(' + pattern + ')', 'g');

  // linked tracks which terms have been linked (link-once). Magazine pages
  // link once per section (lede, each section, infobox), the way Wikipedia
  // relinks a term in each part of an article; other pages link once per page.
  var SEL = '.wiki-body p, .creature-body, .entry-body, .rumor-text, .warning-body, .creature-note, .pull-quote, .nation-body p, .nation-body li, .nation-body dd, .nx-infobox dd, .nx-pull p, .acc-body p, .acc-body li, .teaser-footer';
  var scopes = el.querySelectorAll('.nx-lede, .nx-sec, .nx-infobox');
  if (scopes.length) {
    scopes.forEach(function(scope) {
      var linked = {};
      scope.querySelectorAll(SEL).forEach(function(container) { walkTextNodes(container, termMap, re, linked); });
    });
  } else {
    var linked = {};
    el.querySelectorAll(SEL).forEach(function(container) { walkTextNodes(container, termMap, re, linked); });
  }
}

function walkTextNodes(container, termMap, re, linked) {
  var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  var nodes  = [];
  var n;
  while ((n = walker.nextNode())) nodes.push(n);

  nodes.forEach(function(textNode) {
    // Skip text inside existing <a> or .wiki-link elements
    var parent = textNode.parentNode;
    if (parent && (parent.nodeName === 'A' || (parent.classList && parent.classList.contains('wiki-link')))) return;
    // Never auto-link labels inside the color health scale
    if (parent && parent.closest && parent.closest('.ch-gauge')) return;

    re.lastIndex = 0;
    if (!re.test(textNode.textContent)) return;
    re.lastIndex = 0;

    var text = textNode.textContent;
    var frag = document.createDocumentFragment();
    var last = 0;
    var match;

    while ((match = re.exec(text)) !== null) {
      if (match.index > last) frag.appendChild(document.createTextNode(text.slice(last, match.index)));
      var matched  = match[0];
      var termKey  = matched.toLowerCase();
      var entry    = termMap[termKey];
      if (entry && !linked[termKey]) {
        linked[termKey] = true;
        var span       = document.createElement('span');
        span.className = 'wiki-link';
        span.textContent = matched;
        span.title = 'Go to: ' + matched;
        (function(h) { span.addEventListener('click', function() { navigate(h); }); })(entry.hash);
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(matched));
      }
      last = match.index + matched.length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    if (frag.childNodes.length) textNode.parentNode.replaceChild(frag, textNode);
  });
}

// ══ STATIC PAGE RENDERERS ════════════════════════════════════════════════════

var GIGGLEGLOOM_TYPES = [
  { id: 'bubbleseed', name: 'Bubbleseed', color: '#1a5a28',
    icon: 'assets/icons/icon-bubbleseed.svg',
    tag: 'Earth · Growth · Happiness',
    body: 'Warm golden magic. Generous to a fault. Smells like fresh soil after rain. Tends to overshoot. Ask for a flower, receive twelve. Common among healers, farmers, and optimistic people generally.' },
  { id: 'featherflow', name: 'Featherflow', color: '#1a4f8f',
    icon: 'assets/icons/icon-featherflow.svg',
    tag: 'Wind · Water · Freewill',
    body: 'Sky blues and shifting teals. Never goes straight. Values freedom and will subtly resist instructions that feel like cages. Common among navigators, scouts, and people who are very difficult to pin down.' },
  { id: 'steelfist', name: 'Steelfist', color: '#6a3aaa',
    icon: 'assets/icons/icon-steelfist.svg',
    tag: 'Metal · Resolve · Order',
    body: 'Cold violets and indigos. Does exactly what it is told. The most reliable and the most terrifying depending on the caster. Common among soldiers, historians, and oracles.' },
  { id: 'flamerage', name: 'Flamerage', color: '#aa3a1a',
    icon: 'assets/icons/icon-flamerage.svg',
    tag: 'Fire · Destruction · Courage',
    body: 'Deep reds and burning orange. Responds to emotion before intent. Spectacular, excessive, deeply bad at subtlety. Common among warriors, performers, and those described as overconfident.' }
];

var GODS_META = {
  oro:     { color: '#e8c84a', domain: 'God of Color · Joy · Laughter',
             faith: 'The Brightcreed',
             note: 'His presence is felt as attention, not intervention — a Sparkling landing at the right moment, a Gilded Tortoise somewhere it should not be.' },
  nara:    { color: '#6ac88a', domain: 'Goddess of Wild Magic · Living Things',
             faith: 'The Brightcreed',
             note: 'Appears differently to every observer. Children usually report bright green. She does not intervene. She persists.' },
  thyun:   { color: '#8ab8f8', domain: 'God of Memory · Deep Time · Patience',
             faith: 'The Stillkeep',
             note: 'The Stillkeep has been trying to transcribe one of his thoughts for eight hundred years. They are close. Probably.' },
  solvara: { color: '#c098f8', domain: 'Goddess of Secrets · Shadow · Hidden Truth',
             faith: 'The Veilborn',
             note: 'Knows what actually happened at the Partition and has told no one. The Veilborn consider this correct.' },
  grak:    { color: '#888888', domain: 'The Fallen — Once: Order. Now: Silence.',
             faith: null,
             note: 'Once The Prior white — the color of all Gigglegloom before differentiation. Now flat grey. The grey that does not shine.' }
};

var REGION_CONFIG = {
  caparia: {
    subtitle: 'The central heartlands of Pogglewog',
    quote: '"In Caparia, color maintenance is not pride. It is law. The fine for a faded storefront is modest. The social consequences are not."',
    quoteAttrib: '— A Bunari merchant, describing Solenveil',
    heroImg: 'assets/images/regions/img-caparia-landscape.webp'
  },
  nombi: {
    subtitle: 'The frozen north of Pogglewog',
    quote: '"The aurora does not rise in Nombi. It arrives. There is a difference, and the difference is the Gigglegloom."',
    quoteAttrib: '— Solvanu color journal, transcribed before burning',
    heroImg: 'assets/images/regions/img-nombi-landscape.webp'
  },
  sohot: {
    subtitle: 'The blazing south of Pogglewog',
    quote: '"The desert keeps everything. Memory, color, grief. The heat does not destroy — it preserves. This is why Sohot has not forgotten anything."',
    quoteAttrib: '— Auvari Remnance oral history',
    heroImg: 'assets/images/regions/img-sohot-landscape.webp'
  },
  jugabi: {
    subtitle: 'The ancient jungle southwest of Pogglewog',
    quote: '"The canopy is not above you. You are inside the forest. The forest has been here longer than anyone and is aware of you specifically."',
    quoteAttrib: '— Verdathi elder, speaking to a Kalori Republic delegation',
    heroImg: 'assets/images/regions/img-jugabi-landscape.webp'
  }
};

// ══ HOME PAGE HELPERS ════════════════════════════════════════════════════════

var _homeParallaxHandler = null;
var _darkWhisperHandler  = null;

// Generate floating color particles inside a container element.
// direction: 'up' → float upward (hero); 'down' → sink downward (dark section).
function createParticles(container, count, colors, direction) {
  var cls = direction === 'down' ? 'home-particle-dark' : 'home-particle';
  for (var i = 0; i < count; i++) {
    var p   = document.createElement('div');
    var sz  = Math.random() * 6 + 4;           // 4–10px
    var col = colors[Math.floor(Math.random() * colors.length)];
    p.className = cls;
    p.style.cssText = [
      'left:'               + (Math.random() * 100)              + '%',
      'width:'              + sz                                  + 'px',
      'height:'             + sz                                  + 'px',
      'background:'         + col,
      'box-shadow:0 0 '     + Math.round(sz * 1.6)               + 'px ' + col,
      'animation-duration:' + (Math.random() * 8 + 8)            + 's',
      'animation-delay:'    + (Math.random() * 8)                + 's',
      'border-radius:50%',
      'opacity:'            + (Math.random() * 0.4 + 0.5).toFixed(2)  // 0.50–0.90
    ].join(';');
    container.appendChild(p);
  }
}

// Parallax scroll handler for the hero map image.
// Replaces any previous handler to avoid accumulation on re-render.
function initParallax() {
  var heroImg = document.getElementById('home-map-image');
  if (!heroImg) return;
  if (_homeParallaxHandler) {
    window.removeEventListener('scroll', _homeParallaxHandler);
  }
  _homeParallaxHandler = function() {
    var img = document.getElementById('home-map-image');
    if (!img) {
      window.removeEventListener('scroll', _homeParallaxHandler);
      _homeParallaxHandler = null;
      return;
    }
    img.style.transform = 'translateY(' + (window.pageYOffset * 0.3) + 'px)';
  };
  window.addEventListener('scroll', _homeParallaxHandler, { passive: true });
}

// IntersectionObserver reveal — adds .revealed to any .reveal element
// that enters the viewport with ≥15% visibility. Called after DOM renders.
function initScrollAnimations() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(function(el) {
    observer.observe(el);
  });
}

// Dark Whisper — per-line color drain via IntersectionObserver.
// Each line starts colored (from data-color), then dims to grey on scroll into view.
function initDarkWhisperEffect() {
  var section = document.getElementById('home-dark-whisper');
  if (!section) return;

  var lines = section.querySelectorAll('.dark-line');
  lines.forEach(function(line) {
    var color = line.getAttribute('data-color');
    if (color) line.style.color = color;
  });

  var lineObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var line = entry.target;
        var delay = parseInt(line.getAttribute('data-delay') || '0');
        setTimeout(function() {
          line.classList.add('dimmed');
        }, delay);
        lineObserver.unobserve(line);
      }
    });
  }, { threshold: 0.5, rootMargin: '0px 0px -10% 0px' });

  lines.forEach(function(line, i) {
    line.setAttribute('data-delay', i * 200);
    lineObserver.observe(line);
  });

  var content = document.getElementById('wiki-content');
  if (content) content.style.filter = '';
}

// ══ HOME PAGE RENDERER ═══════════════════════════════════════════════════════

function renderHome(el) {
  var typeCards = [
    { id:'bubbleseed', name:'Bubbleseed', element:'Earth · Growth · Joy',
      desc:'Warm and generous. Overshoots. Smells like fresh soil. Gets emotionally attached to what it nurtures.',
      color:'#2a7a3a', video:'assets/videos/anim-bubbleseed.mp4', icon:'assets/icons/icon-bubbleseed.svg' },
    { id:'featherflow', name:'Featherflow', element:'Wind · Water · Freedom',
      desc:'Never goes straight. Values freedom above all. Subtly resists anything that cages it.',
      color:'#2266b8', video:'assets/videos/anim-featherflow.mp4', icon:'assets/icons/icon-featherflow.svg' },
    { id:'steelfist', name:'Steelfist', element:'Metal · Resolve · Order',
      desc:'Does exactly what it is told. Rewards discipline. Punishes sloppiness. Geometric in the way that only metal remembers how to be.',
      color:'#6a3aaa', video:'assets/videos/anim-steelfist.mp4', icon:'assets/icons/icon-steelfist.svg' },
    { id:'flamerage', name:'Flamerage', element:'Fire · Destruction · Fury',
      desc:'Responds to emotion before intent. Spectacular. The only type that can temporarily overpower early-stage Fading.',
      color:'#aa3a1a', video:'assets/videos/anim-flamerage.mp4', icon:'assets/icons/icon-flamerage.svg' }
  ];
  var typeCardsHtml = typeCards.map(function(t, idx) {
    return '<div class="type-card reveal reveal-delay-' + (idx + 1) + '"'
      + ' style="--type-color:' + t.color + '" onclick="navigate(\'gigglegloom\')">'
      + '<div class="type-card-video-wrap">'
        + '<video class="type-card-video" src="' + t.video + '" autoplay muted loop playsinline preload="auto"></video>'
        + '<div class="type-card-video-overlay"></div>'
      + '</div>'
      + '<div class="type-card-content">'
        + '<img class="type-card-icon" src="' + t.icon + '" alt="' + t.name + '">'
        + '<div class="type-card-name">' + t.name + '</div>'
        + '<div class="type-card-element">' + t.element + '</div>'
        + '<div class="type-card-desc">' + t.desc + '</div>'
      + '</div>'
      + '</div>';
  }).join('');

  el.innerHTML = '<div class="home-page-wrap">'

  // ── Section 1: Hero ──────────────────────────────────────────────────────
  + '<section class="home-hero" id="home-hero">'
    + '<div class="home-hero-map-wrap">'
      + '<img id="home-map-image" class="home-hero-map"'
      + ' src="assets/images/pogglewog-map.webp"'
      + ' alt="The continent of Pogglewog">'
    + '</div>'
    + '<div class="home-hero-overlay"></div>'
    + '<div class="home-particles-container" id="home-particles-container"></div>'
    + '<div class="home-hero-content">'
      + '<div class="home-hero-eyebrow">✦ THE TRAVELLER\'S COMPENDIUM ✦</div>'
      + '<h1 class="home-hero-title home-tagline-line" style="animation-delay:0.3s">Welcome To Anavale</h1>'
      + '<div class="home-hero-taglines">'
        + '<p class="home-tagline-line" style="animation-delay:0.6s">A world of color, wild magic, and the ancient struggle between joy and silence.</p>'
      + '</div>'
      + '<button class="home-explore-btn"'
        + ' onclick="document.getElementById(\'home-section-2\').scrollIntoView({behavior:\'smooth\'})">'
        + '✦ · BEGIN EXPLORING · ✦'
      + '</button>'
    + '</div>'
    + '<div class="home-hero-bottom-fade"></div>'
  + '</section>'

  // ── Section 2: World at a Glance ─────────────────────────────────────────
  + '<section class="home-section home-glance-section" id="home-section-2">'
    + '<div class="home-section-inner">'
      + '<h2 class="home-section-heading home-section-heading-light reveal">Core Concepts</h2>'
      + '<div class="glance-grid">'

        + '<div class="glance-card reveal reveal-delay-1"'
          + ' onclick="navigate(\'gigglegloom\')">'
          + '<div class="glance-card-subhead">Magic System</div>'
          + '<div class="glance-card-title">The Gigglegloom</div>'
          + '<div class="glance-card-body">Magic is alive. It has opinions. It chose Anavale.</div>'
          + '<div class="glance-card-link">→ Learn More</div>'
        + '</div>'

        + '<div class="glance-card reveal reveal-delay-2"'
          + ' onclick="navigate(\'color\')">'
          + '<div class="glance-card-subhead">Color\'s Role</div>'
          + '<div class="glance-card-title">Color &amp; The Dimming</div>'
          + '<div class="glance-card-body">Color is not decoration. It is life. It is power. When it fades, so do you.</div>'
          + '<div class="glance-card-link">→ Learn More</div>'
        + '</div>'

        + '<div class="glance-card reveal reveal-delay-3">'
          + '<div class="glance-card-subhead">The Threat</div>'
          + '<div class="glance-card-title">The Grey Silence</div>'
          + '<div class="glance-card-body">A grey silence spreading from the edges of the world. It does not conquer. It waits.</div>'
          + '<div class="glance-card-link" style="opacity:0.45;font-style:italic;">✦ Discover in play</div>'
        + '</div>'

        + '<div class="glance-card reveal reveal-delay-4"'
          + ' onclick="navigate(\'region/caparia\')">'
          + '<div class="glance-card-subhead">The Setting</div>'
          + '<div class="glance-card-title">The Continent</div>'
          + '<div class="glance-card-body">Four regions. Fifteen nations. One world worth fighting for.</div>'
          + '<div class="glance-card-link">→ Learn More</div>'
        + '</div>'

      + '</div>'
    + '</div>'
  + '</section>'

  // ── Section 3: Four Regions ───────────────────────────────────────────────
  + (function() {
      var regionData = [
        { id: 'caparia', name: 'Caparia', label: 'Region',
          climate: 'The colorful heartlands',
          blurb: 'Lush meadows, sparkling rivers, and the most colorful cities in Anavale. The Confederation was built here. Color maintenance is not a tradition — it is law.',
          image: 'assets/images/regions/img-caparia-landscape.webp' },
        { id: 'nombi', name: 'Nombi', label: 'Region',
          climate: 'The frozen, aurora-lit north',
          blurb: 'Dense forests, icy mountains, and skies painted by the aurora. The north is stoic and beautiful and dangerous in equal measure. Honor is currency here.',
          image: 'assets/images/regions/img-nombi-landscape.webp' },
        { id: 'sohot', name: 'Sohot', label: 'Region',
          climate: 'The ancient, blazing south',
          blurb: 'Desert dunes, ancient ceremony, and the weight of a kingdom that has never forgotten a single thing. The south\'s colors have always been vivid. They have been looking slightly less so, lately.',
          image: 'assets/images/regions/img-sohot-landscape.webp' },
        { id: 'jugabi', name: 'Jugabi', label: 'Region',
          climate: 'The living jungle southwest',
          blurb: 'The Dodooti Rainforest produces more ambient Gigglegloom than any other terrain type on the continent. The jungle has opinions. The jungle is always right.',
          image: 'assets/images/regions/img-jugabi-landscape.webp' }
      ];
      var rowsHtml = regionData.map(function(r, i) {
        return '<div class="home-region-row reveal reveal-delay-' + (i + 1) + '"'
          + ' onclick="navigate(\'region/' + r.id + '\')">'
          + '<div class="home-region-row-bg" style="background-image:url(\'' + r.image + '\')"></div>'
          + '<div class="home-region-row-overlay"></div>'
          + '<div class="home-region-row-content">'
            + '<div class="home-region-row-label">' + r.label + '</div>'
            + '<div class="home-region-row-name">' + r.name + '</div>'
            + '<div class="home-region-row-climate">' + r.climate + '</div>'
            + '<div class="home-region-row-blurb">' + r.blurb + '</div>'
          + '</div>'
        + '</div>';
      }).join('');
      return '<section class="home-section home-regions-section">'
        + '<div class="home-section-inner">'
          + '<h2 class="home-section-heading home-section-heading-light reveal">Explore the Regions</h2>'
          + '<p class="home-section-blurb home-section-blurb-light reveal">'
            + 'Pogglewog is a continent of four great regions — each shaped by its climate, '
            + 'its magic, and the nations that call it home. Every region tells a different '
            + 'story. Every story is still being written.'
          + '</p>'
          + '<div class="home-regions-list">' + rowsHtml + '</div>'
        + '</div>'
      + '</section>';
    })()

  // ── Section 4: Gigglegloom Types ─────────────────────────────────────────
  + '<section class="home-section home-types-section">'
    + '<div class="home-section-inner">'
      + '<h2 class="home-section-heading home-section-heading-light reveal">The Gigglegloom</h2>'
      + '<p class="home-section-blurb home-section-blurb-light reveal">'
        + 'The Gigglegloom is a living magical force woven through all things. '
        + 'It is alive, opinionated, and mischievous. It responds to emotion and intent. '
        + 'It occasionally does whatever it wants instead.'
      + '</p>'
      + '<div class="home-types-list">'
        + typeCardsHtml
      + '</div>'
    + '</div>'
  + '</section>'

  // ── Section 5: Dark Whisper ───────────────────────────────────────────────
  + '<section class="home-dark-section" id="home-dark-whisper">'
    + '<div class="home-dark-inner">'
      + '<div class="dark-line dark-ornament" data-color="#c8940a">· · · ·</div>'
      + '<p class="dark-line dark-large" data-color="#e8b830">Something is changing...</p>'
      + '<p class="dark-line dark-body" data-color="#c8d4f0">In the far reaches of every region, travellers report the same thing.</p>'
      + '<p class="dark-line dark-body" data-color="#a8d4b8">Colors that seem thinner than they used to be.</p>'
      + '<p class="dark-line dark-body" data-color="#d4b8e8">Laughter that arrives a moment late.</p>'
      + '<p class="dark-line dark-body" data-color="#f0c8a0">Creatures that sit very still and watch.</p>'
      + '<div class="dark-line dark-ornament" data-color="#888888">· · ·</div>'
      + '<p class="dark-line dark-formery" data-color="#a0a0a0">The Wanderkeep\'s reports sit in a stack on the Confederation\'s third floor.</p>'
      + '<p class="dark-line dark-formery" data-color="#909090">The Formery has filed Form 44-C: Notification of Possible Ambient Saturation Decline.</p>'
      + '<p class="dark-line dark-formery" data-color="#808080">The form has been received. It is being processed. Processing takes time.</p>'
      + '<div class="dark-line dark-ornament" data-color="#666666">· · ·</div>'
      + '<p class="dark-line dark-large" data-color="#707070">The forms are in order.</p>'
      + '<p class="dark-line dark-large dark-final" data-color="#505050">The world is not.</p>'
      + '<div class="dark-line dark-ornament" data-color="#404040">· · · ·</div>'
    + '</div>'
  + '</section>'

  + '</div>';   // end .home-page-wrap

  // Initialize after DOM has rendered
  setTimeout(function() {
    initScrollAnimations();
    initParallax();
    initDarkWhisperEffect();
    var heroParticles = document.getElementById('home-particles-container');
    if (heroParticles) {
      createParticles(heroParticles, 40,
        ['#2a7a3a', '#2266b8', '#6a3aaa', '#aa3a1a'],
        'up');
    }
  }, 50);
}

function renderGigglegloom(el) {
  // Extra, player-facing detail per type (same wording players see in the character creator)
  var GG_MORE = {
    bubbleseed:  { mood: 'Warm and generous', suits: [['The Verdant', 'Druid'], ['The Faithful', 'Cleric'], ['The Warden', 'Paladin']], sense: 'Smells like rain on warm earth.' },
    featherflow: { mood: 'Free and restless', suits: [['The Wanderer', 'Ranger'], ['The Nimble', 'Rogue'], ['The Reveler', 'Bard']], sense: 'Sounds like wind through tall grass.', fading: 'Can counteract early Fading.' },
    steelfist:   { mood: 'Precise and obedient', suits: [['The Tested', 'Fighter'], ['The Still', 'Monk'], ['The Learned', 'Wizard']], sense: 'Smells faintly of old books and cold metal.' },
    flamerage:   { mood: 'Loud and emotional', suits: [['The Sparked', 'Sorcerer'], ['The Bound', 'Warlock'], ['The Furious', 'Barbarian']], sense: 'Smells like something about to catch fire.', fading: 'The only type that can briefly overpower early Fading.' }
  };

  function ggIcon(t) {
    return '<span class="gg-icon gg-icon--' + esc(t.id) + '" aria-hidden="true"></span>';
  }

  var rules = '<div class="gg-rules">'
    + [
        ['It is alive', 'Not a tool or a fuel. A living force woven through roots, rivers, sunlight and every creature.'],
        ['It listens', 'It responds to emotion and to intent. How you feel when you cast matters.'],
        ['It has opinions', 'It may not do exactly what you ask. Asking nicely seems to help.']
      ].map(function(r, i) {
        return '<div class="gg-rule"><span class="gg-rule-n">' + (i + 1) + '</span><div><div class="gg-rule-t">' + r[0] + '</div><p>' + r[1] + '</p></div></div>';
      }).join('')
    + '</div>'
    + '<blockquote class="nx-pull"><p>Asking the Gigglegloom nicely does not guarantee results. But it does seem to improve them.</p><cite>Wanderkeep Field Notes, Vol. 44</cite></blockquote>';

  var types = '<p>Every caster draws on one of four types. Each has its own color, its own temper, and its own idea of what it is for.</p>'
    + '<div class="gg-types">' + GIGGLEGLOOM_TYPES.map(function(t) {
      var m = GG_MORE[t.id] || {};
      var tags = String(t.tag || '').split(/\s*·\s*/).map(function(k) { return '<span class="gg-chip">' + esc(k) + '</span>'; }).join('');
      return '<article class="gg-type gg-c-' + t.id + '">'
        + '<header class="gg-type-head">' + ggIcon(t)
          + '<div><div class="gg-type-name">' + esc(t.name) + '</div><div class="gg-type-mood">' + esc(m.mood || '') + '</div></div></header>'
        + '<div class="gg-chips">' + tags + '</div>'
        + '<p class="gg-type-body">' + esc(t.body) + '</p>'
        + (m.sense ? '<p class="gg-type-sense">' + esc(m.sense) + '</p>' : '')
        + (m.suits ? '<div class="gg-suits"><div class="gg-suits-h">Who channels it</div>'
            + m.suits.map(function(x) { return '<span class="gg-suit"><b>' + esc(x[0]) + '</b> ' + esc(x[1]) + '</span>'; }).join('') + '</div>' : '')
        + (m.fading ? '<div class="gg-fading">Against the Fading: ' + esc(m.fading) + '</div>' : '')
        + '</article>';
    }).join('') + '</div>';

  var compare = '<div class="gg-compare" role="table" aria-label="The four types compared">'
    + '<div class="gg-cmp-row gg-cmp-head" role="row"><span role="columnheader">Type</span><span role="columnheader">Temper</span><span role="columnheader">Best at</span><span role="columnheader">Watch out for</span></div>'
    + [
        ['bubbleseed', 'Generous', 'Growing and healing', 'Overshooting. Ask for a flower, get twelve.'],
        ['featherflow', 'Free', 'Moving, scouting, slipping away', 'Resists anything that feels like a cage.'],
        ['steelfist', 'Obedient', 'Doing exactly what it is told', 'Punishes sloppiness.'],
        ['flamerage', 'Emotional', 'Spectacle and raw force', 'Acts on feeling before intent. Bad at subtle.']
      ].map(function(r) {
        var t = GIGGLEGLOOM_TYPES.filter(function(x) { return x.id === r[0]; })[0] || { name: r[0], icon: '' };
        return '<div class="gg-cmp-row gg-c-' + r[0] + '" role="row"><span role="cell" class="gg-cmp-type">' + ggIcon(t) + esc(t.name) + '</span>'
          + '<span role="cell">' + r[1] + '</span><span role="cell">' + r[2] + '</span><span role="cell">' + r[3] + '</span></div>';
      }).join('')
    + '</div>';

  var paperwork = '<div class="gg-form">'
    + '<div class="gg-form-stamp">Pending</div>'
    + '<div class="gg-form-head">Gigglegloom Conclave &middot; Licensing Office</div>'
    + '<div class="gg-form-title">Form 7-A: Application to Use the Gigglegloom</div>'
    + '<dl class="gg-form-rows"><dt>Required for</dt><dd>All use of the Gigglegloom within governed territories</dd>'
    + '<dt>Supporting documents</dt><dd>Form 7-B</dd>'
    + '<dt>Form 7-B requires</dt><dd>Form 7-A</dd>'
    + '<dt>Status</dt><dd>This has been noted. It has not been resolved.</dd></dl>'
    + '</div>';

  var spellSrc = (typeof SPELL_DATA !== 'undefined' && SPELL_DATA.length) ? SPELL_DATA : ((typeof WORLD_DATA !== 'undefined' && WORLD_DATA && WORLD_DATA.spells) || []);
  var spellbook = '<div class="gg-book" role="link" tabindex="0" onclick="navigate(\'spells\')" onkeydown="if(event.key===\'Enter\')navigate(\'spells\')">'
    + '<div class="gg-book-text"><div class="gg-book-title">Open the Spellbook</div>'
    + '<p>' + (spellSrc.length ? spellSrc.length + ' spells' : 'Every spell') + ' known to practitioners across Anavale. Filter by type or level, or search by name.</p></div>'
    + '<div class="gg-book-counts">' + GIGGLEGLOOM_TYPES.map(function(t) {
        var n = spellSrc.filter(function(sp) { return (sp.types || []).indexOf(t.name) >= 0; }).length;
        return '<span class="gg-book-count gg-c-' + t.id + '">' + ggIcon(t) + '<b>' + n + '</b>' + esc(t.name) + '</span>';
      }).join('') + '</div>'
    + '<span class="gg-book-go" aria-hidden="true">&rarr;</span>'
    + '</div>';

  var typeDots = GIGGLEGLOOM_TYPES.map(function(t) { return '<span class="gg-ib-type gg-c-' + t.id + '">' + ggIcon(t) + esc(t.name) + '</span>'; }).join('');

  renderMagazine(el, {
    crumbs: [{ label: 'Home', hash: 'home' }, { label: 'The Gigglegloom' }],
    accent: 'mz-accent-gold',
    hero: { art: '<div class="gg-hero-art" aria-hidden="true">' + GIGGLEGLOOM_TYPES.map(function(t) { return ggIcon(t); }).join('') + '</div>' },
    eyebrow: 'Magic',
    title: 'The Gigglegloom',
    epithet: 'The living magical force woven through all things',
    lede: '<p>The <em>Gigglegloom</em> is what most people mean when they say "magic" in Anavale. Scholars, and the Gigglegloom Conclave\'s licensing department, would like it noted that this is an oversimplification they find professionally upsetting.</p>',
    sections: [
      ['How It Works', rules],
      ['The Four Types', types],
      ['The Types at a Glance', compare],
      ['The Paperwork', paperwork],
      ['The Spellbook', spellbook]
    ],
    infobox: {
      name: 'The Gigglegloom',
      sub: 'The living magic of Anavale',
      rows: [
        ['What it is', 'A living force in all things'],
        ['Responds to', 'Emotion and intent'],
        ['Seen as', mzLink('color', 'Color') + '. Every colored thing holds a piece of it.'],
        ['Types', '<div class="gg-ib-types">' + typeDots + '</div>'],
        ['Licensed by', 'The Gigglegloom Conclave']
      ]
    }
  });
}

function renderColor(el) {
  // The four stages, healthiest first. Text comes from this page's existing lore.
  var STAGES = [
    { key: 'vivid',  label: 'Vivid',  phase: 'Healthy',
      see: 'Full, bright color.',
      feel: 'Joy comes easily. Laughter arrives on time.' },
    { key: 'muted',  label: 'Muted',  phase: 'Early Fading',
      see: 'Colors look a little dull.',
      feel: 'Most people live here without realizing anything is wrong.' },
    { key: 'faded',  label: 'Faded',  phase: 'The Fading',
      see: 'Color is visibly washing out.',
      feel: 'Joy is harder to reach. Laughter arrives a moment late.' },
    { key: 'dimmed', label: 'Dimmed', phase: 'The Dimming',
      see: 'Full greyscale.',
      feel: 'Joy is not felt, only remembered. The light has gone out behind people\'s eyes.' }
  ];

  var stageCards = '<div class="clr-stages">' + STAGES.map(function(st, i) {
    return '<div class="clr-stage clr-stage--' + st.key + '">'
      + '<div class="clr-swatch" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>'
      + '<div class="clr-stage-body">'
        + '<div class="clr-stage-num">Stage ' + (i + 1) + ' of 4 &middot; ' + esc(st.phase) + '</div>'
        + '<div class="clr-stage-name">' + esc(st.label) + '</div>'
        + '<dl class="clr-stage-dl"><dt>You see</dt><dd>' + esc(st.see) + '</dd><dt>You feel</dt><dd>' + esc(st.feel) + '</dd></dl>'
      + '</div></div>';
  }).join('') + '</div>'
    + '<p class="clr-note">On every region, nation and town page you will find a <strong>Color health</strong> bar using this same scale. The outlined step is where that place is today.</p>';

  var whatIs = '<p>Every colored thing holds a fragment of the world\'s magic. This is not a metaphor. A red apple is alive with red in a way that a grey stone is not. When color drains out of a place, the magic and the joy drain with it.</p>'
    + '<blockquote class="nx-pull"><p>When the paint starts fading faster than it should, call the Wanderkeep. Don\'t wait until you can\'t remember why you painted it in the first place.</p><cite>Brightcreed practical wisdom, Caparia</cite></blockquote>';

  var SIGNS = [
    'Colors appear slightly muted.',
    'Food loses a quality you cannot quite name.',
    'Bumble Frogs go quiet.',
    'Hollowmoths appear in daylight.',
    'Animals go very still for no clear reason.',
    'A small, perfect black prism is carved somewhere it was not yesterday.'
  ];
  var TIERS = [['early', 'Early warning'], ['early', 'Early warning'], ['worry', 'Worrying'], ['worry', 'Worrying'], ['serious', 'Serious'], ['serious', 'Serious']];
  var signs = '<p>Listed from least to most worrying. The later the sign, the further the Dimming has already spread.</p><ol class="clr-signs">' + SIGNS.map(function(t, i) {
    return '<li><span class="clr-sign-n">' + (i + 1) + '</span><span class="clr-sign-t">' + esc(t) + '</span>'
      + '<span class="clr-sign-tag clr-sign-tag--' + TIERS[i][0] + '">' + TIERS[i][1] + '</span></li>';
  }).join('') + '</ol>';

  var noThird = '<p>There is no fifth step. The Dimmed do not become something else. They simply remain, in a world they can no longer feel. Grey Fluffets still try to bring acorn gifts. The acorns are also grey.</p>'
    + '<p>This is the goal of those who cause the Dimming. Not conquest. Not cruelty for its own sake. Simply <em>quietude.</em></p>';

  renderMagazine(el, {
    crumbs: [{ label: 'Home', hash: 'home' }, { label: 'Color & The Dimming' }],
    accent: 'mz-accent-gold',
    hero: { art: '<div class="clr-hero-art" aria-hidden="true"></div>' },
    eyebrow: 'Magic',
    title: 'Color & The Dimming',
    epithet: 'What color means in Anavale, and what its absence means',
    lede: '<p>In Anavale, color is not decoration. It is the <span class="wiki-link" data-nav="gigglegloom" onclick="navigate(\'gigglegloom\')">Gigglegloom</span> made visible. Every place has a <strong>color health</strong>, from Vivid down to Dimmed, and it tells you how much joy and magic is left there.</p>',
    sections: [
      ['The Four Stages', stageCards],
      ['Why Color Matters', whatIs],
      ['Signs of the Dimming', signs],
      ['After the Dimming', noThird]
    ],
    infobox: {
      name: 'Color Health',
      sub: 'At a glance',
      rows: [
        ['Source', 'The ' + mzLink('gigglegloom', 'Gigglegloom')],
        ['Stages', 'Vivid, Muted, Faded, Dimmed'],
        ['The Fading', 'Muted and Faded. Gradual, easy to miss.'],
        ['The Dimming', 'Dimmed. Full grey.'],
        ['First sign', 'Colors look slightly dull'],
        ['Worst sign', 'A small black prism, newly carved']
      ]
    }
  });
}

function renderGods(el) {
  var chars    = typeof CHARACTERS !== 'undefined' ? CHARACTERS : [];
  var godOrder = ['oro', 'nara', 'thyun', 'solvara', 'grak'];

    var GOD_CFG = {
    oro:     { accent: 'var(--gold)', faith: 'The Brightcreed', faithHash: 'religion/brightcreed' },
    nara:    { accent: 'var(--green)', faith: 'The Brightcreed', faithHash: 'religion/brightcreed' },
    thyun:   { accent: 'var(--blue)', faith: 'The Stillkeep',   faithHash: 'religion/stillkeep'   },
    solvara: { accent: 'var(--purple)', faith: 'The Veilborn',    faithHash: 'religion/veilborn'    },
    grak:    { accent: 'var(--text-muted)', faith: null,               faithHash: null                   },
  };

  var cardsHtml = '';
  godOrder.forEach(function(godId) {
    var c = null;
    for (var i = 0; i < chars.length; i++) { if (chars[i].id === godId) { c = chars[i]; break; } }
    if (!c) return;
    var cfg    = GOD_CFG[godId] || {};
    var accent = cfg.accent || 'var(--gold)';
    var m      = (typeof GODS_META !== 'undefined' && GODS_META[godId]) ? GODS_META[godId] : {};
    var isGrak = godId === 'grak';

    var imgHtml = c.image
      ? '<div style="width:100%;border-radius:8px 8px 0 0;overflow:hidden;margin-bottom:1.25rem;">'
        + '<img src="' + esc(c.image) + '" alt="' + esc(c.name) + '" '
        + 'style="width:100%;aspect-ratio:4/3;object-fit:cover;object-position:center top;display:block;" '
        + 'onerror="this.parentElement.style.display=\'none\'">'
        + '</div>'
      : '';

    var faithHtml = cfg.faith
      ? '<div onclick="navigate(\'' + esc(cfg.faithHash) + '\')" style="margin-top:1rem;padding-top:0.85rem;border-top:1px solid var(--border-mid);font-size:0.75rem;letter-spacing:0.15em;text-transform:uppercase;font-weight:700;color:var(--gold);text-decoration:underline;text-underline-offset:3px;cursor:pointer;">' + esc(cfg.faith) + '</div>'
      : '<div style="margin-top:1rem;padding-top:0.85rem;border-top:1px solid var(--border-mid);font-size:0.72rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--ink-faint);font-style:italic;">No worshippers</div>';

    var appearanceHtml = c.appearance
      ? '<div style="margin-top:0.85rem;"><div style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:' + accent + ';font-weight:700;margin-bottom:0.3rem;">Appearance</div>'
        + '<p style="font-size:0.88rem;line-height:1.7;color:var(--text);margin:0;">' + esc(c.appearance) + '</p></div>'
      : '';

    var gigHtml = c.gigglegloom_relationship
      ? '<div style="margin-top:0.85rem;"><div style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:' + accent + ';font-weight:700;margin-bottom:0.3rem;">Gigglegloom</div>'
        + '<p style="font-size:0.88rem;line-height:1.7;color:var(--text);margin:0;">' + esc(c.gigglegloom_relationship) + '</p></div>'
      : '';

    var cardStyle = 'background:var(--parchment-light);border-radius:var(--card-radius);border:1px solid var(--border-mid);border-left:4px solid ' + accent + ';overflow:hidden;display:flex;flex-direction:column;';
    if (isGrak) cardStyle = 'background:var(--surface-3);border-radius:var(--card-radius);border:1px solid var(--border);border-left:3px solid var(--text-faint);overflow:hidden;display:flex;flex-direction:column;';

    cardsHtml += '<div style="' + cardStyle + '">'
      + imgHtml
      + '<div style="padding:' + (c.image ? '0 1.5rem 1.5rem' : '1.5rem') + ';flex:1;">'
      + '<div style="font-family:var(--font-serif);font-size:1.4rem;font-weight:400;color:var(--ink);margin-bottom:0.2rem;' + (c.image ? 'margin-top:1.25rem;' : '') + '">' + esc(c.name) + '</div>'
      + '<div style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;font-weight:700;color:' + accent + ';margin-bottom:0.75rem;">' + esc(m.domain || '') + '</div>'
      + '<p style="font-size:0.94rem;line-height:1.78;color:var(--text);margin:0;">' + esc(c.player_knowledge || c.summary || '') + '</p>'
      + appearanceHtml + gigHtml + faithHtml
      + '</div></div>';
  });

  var partitionHtml = '<div class="pull-quote">'
    + '"Before the world had color, there were three gods. Then came the Partition — and there were five. One of them is what the trouble is."'
    + '<cite>— The Stillkeep, opening meditation</cite></div>'
    + '<p>The <strong>Partition</strong> is the central divine event of Anavale. Oro, Nara, and Grak were balanced — until Grak developed grief over impermanence and confronted Nara. Their collision fractured everything: Thyun and Solvara were sheared from Nara as fully independent gods. Nara survived, smaller. Grak was emptied of everything except hunger for control. What remained of Grak is not spoken of.</p>'
    + '<p>Three faiths have built their entire understanding of the world around this event — and reached very different conclusions about what it means.</p>';

  var religionCardsHtml = '<div class="entry-grid" style="margin-top:1rem;">'
    + '<div class="entry-card" onclick="navigate(\'religion/brightcreed\')" style="cursor:pointer;border-left:4px solid var(--gold);"><div class="entry-name">The Brightcreed</div><div class="entry-tag">Oro · Nara · The Light of the World</div><div class="entry-body">Joy is an act of defiance. Color is proof the world is still alive. Grak\'s jealousy was always its weakness — the Partition was inevitable.</div></div>'
    + '<div class="entry-card" onclick="navigate(\'religion/stillkeep\')" style="cursor:pointer;border-left:4px solid var(--blue);"><div class="entry-name">The Stillkeep</div><div class="entry-tag">Thyun · Memory · The Long View</div><div class="entry-body">The Partition was preventable. Grak\'s grief was legitimate. The world that exists now is the result of a failure to listen — and we must remember that.</div></div>'
    + '<div class="entry-card" onclick="navigate(\'religion/veilborn\')" style="cursor:pointer;border-left:4px solid var(--purple);"><div class="entry-name">The Veilborn</div><div class="entry-tag">Solvara · Shadow · Hidden Truth</div><div class="entry-body">Solvara knows what actually happened at the Partition and has told no one. The Veilborn consider this correct.</div></div>'
    + '</div>';

  el.innerHTML = pageHeader('Theology', 'The Gods of Anavale', 'Five gods shaped this world. Four of them are still trying to save it.')
    + '<div class="wiki-body">' + partitionHtml + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;padding:1.5rem 2rem 2.5rem;">' + cardsHtml + '</div>'
    + '<div class="wiki-body"><div class="section-heading">Three Ways of Understanding</div><p>The gods are real. The disagreement is about what that means.</p>' + religionCardsHtml + '</div>';
}

function renderRumors(el) {
  var rumors = [
    { source: 'Aurentum City — merchant quarter, overheard',
      text: '"The Queen\'s gowns have been looking different lately. The court says it\'s the dye lots. Three seamstresses have been dismissed this month. I\'ve been buying from that dyer for twelve years. The dye is fine."' },
    { source: 'Eastern Caparia road — traveller\'s account',
      text: '"Someone left a black prism carved into the doorframe of the old mill on the east road, just past Bumbleton. Nobody saw who did it. The miller moved out the next morning. Didn\'t take anything with him. The mill has been empty for three weeks."' },
    { source: 'Jani Forest, Caparia — Brightcreed ranger report',
      text: '"The Bumble Frogs in the southern Jani Forest have gone quiet. All of them. Over a stretch of about two miles. The frogs north of the line are fine. The frogs south of the line are silent. The line didn\'t exist a month ago."' },
    { source: 'Prismhold — Formery clerk, unofficial communication',
      text: '"We received a form this week in a script none of our senior staff could read. We sent it to the Stillkeep. They sent it back with a note saying the script predates the current calendar system by a significant margin. The interesting part: the form was a renewal. Someone is renewing something."' },
    { source: 'Reveltown, northwest Caparia — festival attendee',
      text: '"A Hollowmoth appeared in the middle of the Dawnburst celebration last week. In the festival district. In full afternoon light. It landed on a child\'s shoulder and stayed there for almost an hour. The child said it felt sad. Not scared — sad."' },
    { source: 'Sunharbor docks, Sohot — dockworker, unnamed',
      text: '"Three Kindpact inspectors came through the lower docks last week and they weren\'t inspecting the usual things. They were asking about water color. Whether we\'d noticed Ashcreek looking different. I told them no. They wrote it down and looked like that wasn\'t the answer they were hoping for."' },
    { source: 'Nombi — Tumblesnow town notice board',
      text: '"The Aurora Moths didn\'t fly last night. The aurora was visible. Bright, actually. The moths were present — they were on the branches, wings closed, watching. They just didn\'t fly. Old Morra says she\'s never seen that in seventy years of moth-watching."' }
  ];

  var rumorHtml = rumors.map(function(r) {
    return '<div class="rumor-entry">'
      + '<div class="rumor-source">Source: ' + esc(r.source) + '</div>'
      + '<div class="rumor-text">' + esc(r.text) + '</div>'
      + '</div>';
  }).join('');

  el.innerHTML = pageHeader('Hearsay', 'Rumours & Hearsay', 'Unverified. Potentially significant. Definitely interesting.')
    + '<div class="wiki-body">'
    + '<p>The following accounts have been gathered from various sources across Pogglewog. The editorial committee takes no responsibility for their accuracy. The editorial committee does note, however, that several rumors from the previous edition that were considered implausible have since been confirmed.</p>'
    + rumorHtml
    + '</div>';
}

function renderSpellsPage(el) {
  el.innerHTML = pageHeader('Magic', 'The Gigglegloom Spellbook', 'Known spells of Anavale\'s practitioners')
    + '<div class="wiki-body">'
    + '<div class="spell-filters" id="sb-type-filters">'
    + '<button class="spell-type-btn all active" data-type="all">All Types</button>'
    + '<button class="spell-type-btn Bubbleseed" data-type="Bubbleseed">Bubbleseed</button>'
    + '<button class="spell-type-btn Featherflow" data-type="Featherflow">Featherflow</button>'
    + '<button class="spell-type-btn Steelfist" data-type="Steelfist">Steelfist</button>'
    + '<button class="spell-type-btn Flamerage" data-type="Flamerage">Flamerage</button>'
    + '<button class="spell-type-btn Freeweave" data-type="Freeweave">Freeweave</button>'
    + '</div>'
    + '<div class="spell-filters" id="sb-lvl-filters">'
    + '<button class="spell-lvl-btn all active" data-lvl="all">All Levels</button>'
    + '<button class="spell-lvl-btn" data-lvl="0">Cantrip</button>'
    + ['1','2','3','4','5','6','7','8','9'].map(function(n){ return '<button class="spell-lvl-btn" data-lvl="' + n + '">Level ' + n + '</button>'; }).join('')
    + '</div>'
    + '<input class="spell-search-bar" id="sb-search" type="text" placeholder="Search spells..." oninput="renderSpells()">'
    + '<div class="spell-count" id="sb-count"></div>'
    + '<div class="spell-list-box" id="sb-list"></div>'
    + '<div class="sb-pagination" id="sb-pagination"></div>'
    + '</div>';

  initSpellbook();
}

// ══ DATA-DRIVEN PAGE RENDERERS ═══════════════════════════════════════════════

// Settlement card — image left, text right. Used by renderRegion() settlements section.
function cityCard(city) {
  var vis = getVisibility(city);
  if (vis === 'hidden') return '';

  var imgHtml = city.image
    ? '<img class="settlement-card-img" src="' + esc(city.image)
      + '" alt="' + esc(city.name) + '">'
    : '<div class="settlement-card-img settlement-card-img-placeholder"></div>';

  var textHtml = '<div class="settlement-card-text">'
    + '<div class="entry-name">' + esc(city.name) + '</div>'
    + '<div class="entry-tag">' + esc(city.type) + '</div>'
    + '<div class="entry-body">' + esc(city.summary) + '</div>'
    + (vis === 'teaser'
        ? '<div class="entry-teaser-hint">✦ Not yet fully discovered</div>'
        : '')
    + '</div>';

  return '<div class="settlement-card entry-card" onclick="navigate(\'city/'
    + city.id + '\')" style="cursor:pointer">'
    + imgHtml + textHtml
    + '</div>';
}

function renderRegion(id, el) {
  var regions   = typeof REGIONS        !== 'undefined' ? REGIONS        : [];
  var nations   = typeof NATIONS        !== 'undefined' ? NATIONS        : [];
  var cities    = typeof CITIES         !== 'undefined' ? CITIES         : [];
  var creatures = typeof CREATURES      !== 'undefined' ? CREATURES      : [];

  var region = mzFind(regions, id);
  if (!region) { renderNotFound(el, 'region/' + id); return; }
  var cfg = REGION_CONFIG[id] || {};

  // Only show visible/teaser nations, cities, creatures
  var rNations = nations.filter(function(n) { return n.region === id && getVisibility(n) !== 'hidden'; });
  var rCities = cities.filter(function(c) { return c.region === id && getVisibility(c) !== 'hidden'; });
  var rCreatures = creatures.filter(function(c) {
    return getVisibility(c) !== 'hidden' && Array.isArray(c.regions) && c.regions.indexOf(id) >= 0;
  });

  var sections = [];
  var gg = region.gigglegloom_notes || (region.extra_data && region.extra_data.gigglegloom_notes) || '';
  var land = '';
  if (cfg.quote) land += '<blockquote class="nx-pull"><p>' + esc(String(cfg.quote).replace(/^"|"$/g, '')) + '</p><cite>' + esc(String(cfg.quoteAttrib || '').replace(/^[—–-]\s*/, '')) + '</cite></blockquote>';
  if (gg) land += '<p>' + esc(gg) + '</p>';
  if (region.tone) land += '<p>' + esc(region.tone) + '</p>';
  sections.push(['The Land and Its Magic', land]);

  if (rNations.length) {
    var nHtml = '<div class="entry-grid">';
    rNations.forEach(function(n) {
      var nVis = getVisibility(n);
      var nx = n.extra_data || {};
      var nSig = window.NationExtra ? NationExtra.sigilUrl(n.id) : null;
      nHtml += '<div class="entry-card nation-card nx-k-' + esc(n.id) + '" data-nav="nation/' + n.id + '" onclick="navigate(\'nation/' + n.id + '\')">'
        + '<div class="nation-card-head">'
          + (nSig ? '<img class="nation-card-sigil" src="' + esc(nSig) + '" alt="Sigil of ' + esc(n.name) + '" onerror="this.style.display=\'none\'">' : '')
          + '<div class="nation-card-titles">'
            + '<div class="entry-name"><span class="wiki-link">' + esc(n.name) + '</span></div>'
            + (nx.epithet ? '<div class="nation-card-epithet">' + esc(nx.epithet) + '</div>' : '')
          + '</div>'
        + '</div>'
        + (nx.motto ? '<div class="nation-card-motto">&ldquo;' + esc(nx.motto) + '&rdquo;</div>' : '')
        + '<div class="entry-body">' + esc(n.summary) + '</div>'
        + (nVis === 'teaser' ? '<div class="entry-teaser-hint">✦ Not yet fully discovered</div>' : '')
        + '</div>';
    });
    sections.push(['Nations', nHtml + '</div>']);
  }

  var sites = region.key_sites || [];
  if (sites.length) {
    sections.push(['Key Sites', '<ul class="nx-customs">' + sites.map(function(s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>']);
  }

  if (rCities.length) sections.push(['Settlements', rCities.map(cityCard).join('')]);

  if (rCreatures.length) {
    sections.push(['Creatures Found Here', '<div class="nx-creatures nx-creatures--grid">' + rCreatures.map(function(c) {
      var img = c.image ? '<img src="' + esc(c.image) + '" alt="' + esc(c.name) + '" loading="lazy">' : '<div class="nx-creature-ph">' + esc(String(c.name || '').charAt(0)) + '</div>';
      return '<figure class="nx-creature" data-nav="creature/' + c.id + '" onclick="navigate(\'creature/' + c.id + '\')">' + img
        + '<figcaption>' + esc(c.name) + (getVisibility(c) === 'teaser' ? ' <small>(not yet discovered)</small>' : '') + '</figcaption></figure>';
    }).join('') + '</div>']);
  }

  renderMagazine(el, {
    crumbs: [{ label: 'Regions', hash: 'region/' + id }, { label: region.name, hash: 'region/' + id }],
    accent: MZ_REGION_ACCENT[id] || 'mz-accent-gold',
    hero: { img: cfg.heroImg || region.image, caption: region.name },
    eyebrow: 'Region of Pogglewog',
    title: region.name,
    epithet: cfg.subtitle || '',
    lede: mzText(region.summary),
    sections: sections,
    after: renderAssociatedCharacters(getAssociatedCharacters('regions', id)),
    infobox: {
      name: region.name, sub: cfg.subtitle || '',
      rows: [
        ['Continent', 'Pogglewog'],
        ['Nations', rNations.map(function(n) { return mzLink('nation/' + n.id, n.name); }).join(', ')],
        ['Settlements', rCities.length ? rCities.map(function(c) { return mzLink('city/' + c.id, c.name); }).join(', ') : ''],
        ['Creatures', rCreatures.length ? String(rCreatures.length) + ' known' : ''],
        ['Color health', colorHealthGauge(region.color_health, true)]
      ]
    }
  });
}

function renderNation(id, el) {
  var nations = typeof NATIONS !== 'undefined' ? NATIONS : [];
  var cities  = typeof CITIES  !== 'undefined' ? CITIES  : [];
  var nation  = null;
  for (var i = 0; i < nations.length; i++) { if (nations[i].id === id) { nation = nations[i]; break; } }
  if (!nation) { renderNotFound(el, 'nation/' + id); return; }

  var vis = getVisibility(nation);
  if (vis === 'hidden') { renderNotFound(el, 'nation/' + id); return; }

  if (vis === 'teaser') {
    el.innerHTML = breadcrumb([
        { label: titleCase(nation.region), hash: 'region/' + nation.region },
        { label: nation.name, hash: 'nation/' + id }
      ])
      + pageHeader(titleCase(nation.region) + ' · Nation', nation.name, nation.summary)
      + '<div class="wiki-body">'
      + entryImage(nation.image, nation.name)
      + '<p>' + esc(nation.summary) + '</p>'
      + teaserFooter('nation')
      + '</div>';
    return;
  }

  renderNationMagazine(nation, el);
}

// ══ MAGAZINE PAGE (shared by every wiki entry page) ═══════════════════════════
// One layout for region, nation, city, POI, creature, organization, faith,
// character and item pages: hero, drop-cap lede, contents, section headers,
// pull quotes, a Wikipedia-style infobox. The homepage does not use it.
//
// o = {
//   crumbs: [{label, hash}], accent: 'nx-k-opuri' | 'mz-accent-gold' ...,
//   hero: { img, caption, portrait: bool, emblem: url },
//   eyebrow, title, epithet, motto,
//   lede: html, sections: [[title, html]], after: html,
//   infobox: { name, sub, figure: {img, caption, round}, motto, rows: [[label, html]], extra: html }
// }
function renderMagazine(el, o) {
  var acc = o.accent || 'mz-accent-gold';
  var h = o.hero || {};
  var sections = (o.sections || []).filter(function(s) { return s && s[1]; });

  var hero = '<header class="nx-hero ' + acc + (h.img ? (h.portrait ? ' is-portrait' : ' has-img') : '') + '">'
    + (h.img && !h.portrait ? '<img class="nx-hero-img" src="' + esc(h.img) + '" alt="' + esc(h.caption || o.title) + '">' : '')
    + (h.img && h.portrait ? '<img class="nx-hero-portrait" src="' + esc(h.img) + '" alt="' + esc(o.title) + '" onerror="this.style.display=\'none\'">' : '')
    + (!h.img && h.emblem ? '<img class="nx-hero-sigil" src="' + esc(h.emblem) + '" alt="" aria-hidden="true">' : '')
    + (h.art ? h.art : '')
    + (!h.img && !h.emblem && !h.art ? '<div class="nx-hero-glyph" aria-hidden="true">' + esc(String(o.title || '').replace(/^the\s+/i, '').charAt(0)) + '</div>' : '')
    + '<div class="nx-hero-scrim"></div>'
    + '<div class="nx-hero-text">'
      + (o.eyebrow ? '<div class="nx-hero-eyebrow">' + esc(o.eyebrow) + '</div>' : '')
      + '<h1 class="nx-hero-title">' + esc(o.title) + '</h1>'
      + (o.epithet ? '<div class="nx-hero-epithet">' + esc(o.epithet) + '</div>' : '')
      + (o.motto ? '<div class="nx-hero-motto">&ldquo;' + esc(o.motto) + '&rdquo;</div>' : '')
    + '</div>'
    + (h.img && !h.portrait && h.caption ? '<div class="nx-hero-caption">' + esc(h.caption) + '</div>' : '')
    + '</header>';

  var pageId = nxSlug(o.title);
  var toc = sections.length > 2 ? '<nav class="nx-toc"><div class="nx-toc-title">Contents</div><ol>'
    + sections.map(function(s) {
        return '<li><a onclick="var t=document.getElementById(\'mz-' + nxSlug(s[0]) + '\');if(t)t.scrollIntoView({behavior:\'smooth\'});return false;" href="#' + esc(getHash()) + '">' + esc(s[0]) + '</a></li>';
      }).join('') + '</ol></nav>' : '';

  var ib = o.infobox || null;
  var ibHtml = '';
  if (ib) {
    var rows = (ib.rows || []).filter(function(r) { return r && r[1]; });
    var fig = ib.figure && ib.figure.img
      ? '<figure class="nx-ib-sigil' + (ib.figure.round ? ' is-photo' : '') + '"><img src="' + esc(ib.figure.img) + '" alt="' + esc(ib.name || o.title) + '" onerror="this.parentNode.style.display=\'none\'">'
        + (ib.figure.caption ? '<figcaption>' + esc(ib.figure.caption) + '</figcaption>' : '') + '</figure>'
      : '';
    ibHtml = '<aside class="nx-infobox ' + acc + '">'
      + '<div class="nx-ib-head"><div class="nx-ib-name">' + esc(ib.name || o.title) + '</div>'
        + (ib.sub ? '<div class="nx-ib-epithet">' + esc(ib.sub) + '</div>' : '') + '</div>'
      + fig
      + (ib.motto ? '<div class="nx-ib-motto"><span>' + esc(ib.mottoLabel || 'Motto') + '</span>&ldquo;' + esc(ib.motto) + '&rdquo;</div>' : '')
      + (rows.length ? '<dl class="nx-ib-rows">' + rows.map(function(r) { var w = r[1].indexOf('ch-gauge') >= 0 ? ' class="nx-ib-wide"' : ''; return '<dt' + w + '>' + esc(r[0]) + '</dt><dd' + w + '>' + r[1] + '</dd>'; }).join('') + '</dl>' : '')
      + (ib.extra || '')
      + '</aside>';
  }

  el.innerHTML = (o.crumbs && o.crumbs.length ? breadcrumb(o.crumbs) : '')
    + '<div class="nx-page ' + acc + '" id="mz-page-' + esc(pageId) + '">'
    + hero
    + '<div class="nx-layout' + (ibHtml ? '' : ' no-infobox') + '">'
      + '<article class="nx-article nation-body">'
        + (o.lede ? '<div class="nx-lede">' + o.lede + '</div>' : '')
        + toc
        + sections.map(function(s) {
            return '<section class="nx-sec" id="mz-' + nxSlug(s[0]) + '"><h2 class="nx-sec-h">' + esc(s[0]) + '</h2><div class="nx-body">' + s[1] + '</div></section>';
          }).join('')
        + (o.after || '')
      + '</article>'
      + ibHtml
    + '</div>'
    + '</div>';
}

// Text helpers for magazine pages. mzText renders plain/markdown text as
// paragraphs; mzSplit pulls the first paragraph out as the lede.
function mzText(t) { return t ? nxMdParas(nxParas(t)) : ''; }
function mzSplit(t) {
  var p = nxParas(t);
  return { lede: p.length ? nxMdParas([p[0]]) : '', rest: nxMdParas(p.slice(1)) };
}
function mzLink(hash, label) {
  return '<span class="wiki-link" data-nav="' + esc(hash) + '" onclick="navigate(\'' + esc(hash) + '\')">' + esc(label) + '</span>';
}
function mzFind(list, id) {
  list = list || [];
  for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
  return null;
}
function mzPulls(row) {
  var x = (row && row.extra_data) || {};
  return Array.isArray(x.pull_quotes) ? x.pull_quotes : [];
}
function mzTagsRow(tags) {
  tags = (tags || []).filter(function(t) { return t !== 'wiki-teaser'; });
  return tags.length ? '<div class="entry-tags-row">' + tags.map(function(t) {
    return '<span class="entry-wiki-tag entry-wiki-tag--link" onclick="navigate(\'search?q=' + esc(encodeURIComponent(t)) + '\')" title="Search for: ' + esc(t) + '">' + esc(t) + '</span>';
  }).join('') + '</div>' : '';
}

// Accent per region, per nation (kingdom colors), per Gigglegloom type.
var MZ_REGION_ACCENT = { caparia: 'mz-accent-gold', nombi: 'mz-accent-blue', sohot: 'mz-accent-red', jugabi: 'mz-accent-green' };
var MZ_KINGDOMS = ['solenmere', 'zippan', 'bunari', 'dingurei', 'janiveth', 'opuri'];
function mzPlaceAccent(nationId, regionId) {
  if (MZ_KINGDOMS.indexOf(nationId) >= 0) return 'nx-k-' + nationId;
  return MZ_REGION_ACCENT[regionId] || 'mz-accent-gold';
}
var MZ_GG_ACCENT = { bubbleseed: 'mz-accent-green', featherflow: 'mz-accent-blue', steelfist: 'mz-accent-purple', flamerage: 'mz-accent-red' };
function mzGgAccent(t) { return MZ_GG_ACCENT[String(t || '').toLowerCase().split(/[\s,/]+/)[0]] || 'mz-accent-gold'; }

// ══ NATION PAGES (magazine layout) ════════════════════════════════════════════
// Hero, lede, section headers, pull quotes, images, a schematic locator and a
// Wikipedia-style infobox. Content comes from nations.description and
// nations.extra_data (rendered through js/nation-extra.js's markdown helpers).
// Never rendered on the player wiki: extra_data.threats, dimming_resistance,
// dm_only (stripped at load), rivalry tone.

// Static hero art per nation. (A map locator waits on the canon Inkarnate map.)
var NATION_CONFIG = {
  solenmere: { hero: 'assets/images/nations/solenmere-solenveil.webp', heroCaption: 'Solenveil, the sun ford, capital of the Solenmere' },
  zippan:    { hero: 'assets/images/nations/zippan-goober-bounce.webp', heroCaption: 'The Goober Bounce Meadows of western Caparia' },
  dingurei:  { hero: 'assets/images/nations/dingurei-doopu-peaks.webp', heroCaption: 'The Doopu Peaks and the Brightwall, on the Dingurei frontier' },
  janiveth:  { hero: 'assets/images/nations/janiveth-sillywiggles.webp', heroCaption: 'The Sillywiggles Meadows below the Jani Mountains' }
};

var COLOR_HEALTH_LEVELS = [
  { key: 'dimmed', label: 'Dimmed', words: ['dimmed', 'dire', 'severe', 'grey', 'gray'] },
  { key: 'faded',  label: 'Faded',  words: ['faded', 'fading', 'deteriorating', 'poor', 'stage-1'] },
  { key: 'muted',  label: 'Muted',  words: ['muted', 'moderate', 'variable', 'fair', 'mixed'] },
  { key: 'vivid',  label: 'Vivid',  words: ['vivid', 'excellent', 'good', 'strong', 'high'] }
];

// Reads only the leading word of color_health. The rest of that free text is
// never rendered: it can name secret threats.
function colorHealthLevel(raw) {
  var first = String(raw || '').trim().toLowerCase().split(/[\s,;:(—–-]+/)[0];
  for (var i = 0; i < COLOR_HEALTH_LEVELS.length; i++) {
    if (COLOR_HEALTH_LEVELS[i].words.indexOf(first) >= 0) return i;
  }
  return -1;
}

// Plain-language meaning of each level, matching the Color & The Dimming page.
var COLOR_HEALTH_TEXT = {
  vivid:  'Full, bright color. The land and its people are healthy.',
  muted:  'Color is a little dull. Most people would not notice anything is wrong.',
  faded:  'The Fading has set in. Color and joy are visibly slipping away.',
  dimmed: 'Grey. Joy here is remembered, not felt.'
};

// The labeled four-step scale alone. lvl -1 marks no step.
function chScaleHtml(lvl) {
  var L = COLOR_HEALTH_LEVELS[lvl];
  var steps = COLOR_HEALTH_LEVELS.map(function(l, i) {
    return '<span class="ch-step ch-step--' + l.key + (i === lvl ? ' is-current' : '') + '">'
      + '<i aria-hidden="true"></i><b>' + l.label + '</b></span>';
  }).join('');
  return '<div class="ch-scale" role="img" aria-label="' + (L ? 'Color health: ' + L.label + ' (scale from Dimmed to Vivid)' : 'Color health scale from Dimmed to Vivid') + '">' + steps + '</div>';
}

// A labeled four-step scale from Dimmed to Vivid with the current level
// marked, then one sentence saying what that level means.
function colorHealthGauge(raw, compact) {
  var lvl = colorHealthLevel(raw);
  if (lvl < 0) return '';
  var L = COLOR_HEALTH_LEVELS[lvl];
  return '<div class="ch-gauge ch-gauge--' + L.key + (compact ? ' ch-gauge--compact' : '') + '">'
    + chScaleHtml(lvl)
    + '<p class="ch-text"><strong>' + L.label + ':</strong> ' + COLOR_HEALTH_TEXT[L.key] + ' '
    + '<span class="wiki-link" data-nav="color" onclick="navigate(\'color\')">What is color health?</span></p>'
    + '</div>';
}

function nxSlug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function nxFirstSentence(s) {
  var t = String(s || '').trim();
  var m = t.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : t).replace(/\.$/, '');
}
function nxParas(text) {
  return String(text || '').split(/\n{2,}/).map(function(p) { return p.trim(); }).filter(Boolean);
}
function nxMdParas(paras) {
  var NX = window.NationExtra;
  return paras.map(function(p) { return NX ? NX.md(p) : '<p>' + esc(p) + '</p>'; }).join('');
}
function nxPull(text, nation) {
  if (!text) return '';
  return '<blockquote class="nx-pull"><p>' + esc(text) + '</p><cite>' + esc(nation.name) + '</cite></blockquote>';
}

function nationInfoboxHtml(nation) {
  var x = nation.extra_data || {};
  var g = x.at_a_glance || {};
  var NX = window.NationExtra;
  var inl = function(t) { return NX ? NX.mdInline(t) : esc(t); };
  var religions = typeof RELIGIONS !== 'undefined' ? RELIGIONS : [];
  var faith = '';
  if (x.dominant_religion) {
    var rel = null;
    for (var i = 0; i < religions.length; i++) { if (religions[i].id === x.dominant_religion) { rel = religions[i]; break; } }
    faith = rel && getVisibility(rel) !== 'hidden'
      ? '<span class="wiki-link" data-nav="religion/' + rel.id + '" onclick="navigate(\'religion/' + rel.id + '\')">' + esc(rel.name) + '</span>'
      : esc(titleCase(x.dominant_religion));
  }
  var leader = x.leader && x.leader.name
    ? esc(x.leader.name) + (x.leader.title ? '<small>' + esc(x.leader.title) + '</small>' : '') : '';
  var rows = [
    ['Region', '<span class="wiki-link" data-nav="region/' + esc(nation.region) + '" onclick="navigate(\'region/' + esc(nation.region) + '\')">' + esc(titleCase(nation.region)) + '</span>'],
    ['Capital', g.Capital ? esc(/^none\b/i.test(g.Capital) ? g.Capital.replace(/\.$/, '') : nxFirstSentence(g.Capital)) : (nation.capital_city ? esc(nation.capital_city) : '')],
    ['Government', (function() {
      var gov = nation.government || '', body = x.government_body ? String(x.government_body).split(/\s+[—–-]\s+/)[0] : '';
      return esc(gov) + (body && body.toLowerCase() !== gov.toLowerCase() ? '<small>' + esc(body) + '</small>' : '');
    })()],
    ['Leader', leader],
    ['Peoples', g.Peoples ? inl(g.Peoples) : ''],
    ['Faith', faith],
    ['Magic', g.Magic ? inl(g.Magic) : esc(x.gigglegloom_affinity || '')],
    ['Confederation', x.founding_member ? esc(x.founding_member) : '']
  ].filter(function(r) { return r[1]; });

  var url = NX ? NX.sigilUrl(nation.id) : null;
  var sig = x.sigil || {};
  return '<aside class="nx-infobox nx-k-' + esc(nation.id) + '">'
    + '<div class="nx-ib-head">'
      + '<div class="nx-ib-name">' + esc(nation.name) + '</div>'
      + (x.epithet ? '<div class="nx-ib-epithet">' + esc(x.epithet) + '</div>' : '')
    + '</div>'
    + (url ? '<figure class="nx-ib-sigil"><img src="' + esc(url) + '" alt="Sigil of ' + esc(nation.name) + '" onerror="this.parentNode.style.display=\'none\'">'
        + (sig.design ? '<figcaption>' + esc(sig.design) + '</figcaption>' : '') + '</figure>' : '')
    + (x.motto ? '<div class="nx-ib-motto"><span>Motto</span>&ldquo;' + esc(x.motto) + '&rdquo;</div>' : '')
    + '<dl class="nx-ib-rows">'
    + rows.map(function(r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>'; }).join('')
    + (colorHealthGauge(x.color_health) ? '<dt class="nx-ib-wide">Color health</dt><dd class="nx-ib-wide">' + colorHealthGauge(x.color_health, true) + '</dd>' : '')
    + '</dl>'
    + '</aside>';
}

function renderNationMagazine(nation, el) {
  var id = nation.id;
  var NX = window.NationExtra;
  var x = nation.extra_data || {};
  var cfg = NATION_CONFIG[id] || {};
  var quotes = Array.isArray(x.pull_quotes) ? x.pull_quotes : [];
  var cities = typeof CITIES !== 'undefined' ? CITIES : [];
  var pois = typeof POIS !== 'undefined' ? POIS : [];
  var creatures = typeof CREATURES !== 'undefined' ? CREATURES : [];
  var sections = []; // [title, html]

  // Lede + "Who They Are"
  var paras = nxParas(nation.description || nation.summary || '');
  var lede = paras.shift() || '';
  var who = '';
  paras.forEach(function(p, i) {
    who += nxMdParas([p]);
    if (i === 1 && quotes[0]) who += nxPull(quotes[0], nation);
  });
  if (paras.length < 2 && quotes[0]) who += nxPull(quotes[0], nation);
  if (who) sections.push(['Who They Are', who]);

  // Origin legend
  if (x.origin_legend) {
    var ol = nxParas(x.origin_legend), olHtml = '';
    ol.forEach(function(p, i) {
      olHtml += nxMdParas([p]);
      if (i === ol.length - 2 && quotes[1]) olHtml += nxPull(quotes[1], nation);
    });
    if (ol.length < 2 && quotes[1]) olHtml += nxPull(quotes[1], nation);
    sections.push(['How They Began' + (x.origin_title ? ': ' + x.origin_title : ''), olHtml]);
  }

  // Color and creatures, with portraits of known creatures it mentions
  if (x.color_and_creatures) {
    var cc = x.color_and_creatures, lc = cc.toLowerCase();
    var seen = {};
    var mentioned = creatures.filter(function(c) {
      if (!c.image || getVisibility(c) === 'hidden' || seen[c.id]) return false;
      var n = String(c.name || '').toLowerCase();
      if (!n) return false;
      var stem = n.replace(/s$/, '');
      var hit = lc.indexOf(n) >= 0 || (stem.length > 4 && lc.indexOf(stem) >= 0);
      if (hit) seen[c.id] = 1;
      return hit;
    }).slice(0, 6);
    var strip = mentioned.length ? '<div class="nx-creatures">' + mentioned.map(function(c) {
      return '<figure class="nx-creature" data-nav="creature/' + c.id + '" onclick="navigate(\'creature/' + c.id + '\')">'
        + '<img src="' + esc(c.image) + '" alt="' + esc(c.name) + '" loading="lazy">'
        + '<figcaption>' + esc(c.name) + '</figcaption></figure>';
    }).join('') + '</div>' : '';
    sections.push(['Color and Creatures', nxMdParas(nxParas(cc)) + strip]);
  }

  // Customs and beliefs
  var cb = '';
  if (nation.culture) cb += '<p>' + esc(nation.culture) + '</p>';
  if (nation.beliefs) cb += '<p>' + esc(nation.beliefs) + '</p>';
  if (Array.isArray(x.customs) && x.customs.length) {
    cb += '<ul class="nx-customs">' + x.customs.map(function(c) {
      var parts = String(c).split(/\s+[—–]\s+/);
      return '<li>' + (parts.length > 1 ? '<b>' + esc(parts[0]) + '.</b> ' + esc(parts.slice(1).join(', ')) : esc(c)) + '</li>';
    }).join('') + '</ul>';
  }
  if (cb) sections.push(['Customs and Beliefs', cb]);

  // At a glance (keys the infobox does not already carry)
  var g = x.at_a_glance || {};
  var skip = { Capital: 1, Government: 1, Peoples: 1, Faith: 1, Magic: 1 };
  var gk = Object.keys(g).filter(function(k) { return !skip[k]; });
  if (gk.length) {
    sections.push(['At a Glance', '<dl class="nx-glance">' + gk.map(function(k) {
      return '<dt>' + esc(k) + '</dt><dd>' + (NX ? NX.mdInline(g[k]) : esc(g[k])) + '</dd>';
    }).join('') + '</dl>']);
  }

  // Rivalries
  if (Array.isArray(x.rivalries) && x.rivalries.length) {
    sections.push(['Rivalries', '<div class="nx-rivals">' + x.rivalries.map(function(r) {
      return '<div class="nx-rival"><b>' + esc(r.with) + '</b><p>' + (NX ? NX.mdInline(r.text) : esc(r.text)) + '</p></div>';
    }).join('') + '</div>']);
  }

  // Leader
  if (x.leader && x.leader.name) {
    sections.push(['Leadership', '<div class="nx-leader"><small>' + esc(x.leader.title || '') + '</small><b>' + esc(x.leader.name) + '</b>'
      + (x.leader.note ? '<p>' + (NX ? NX.mdInline(x.leader.note) : esc(x.leader.note)) + '</p>' : '') + '</div>'
      + (g.Government ? '<p>' + (NX ? NX.mdInline(g.Government) : esc(g.Government)) + '</p>' : '')]);
  }

  // At the Signing
  if (x.accord_contribution) sections.push(['At the Signing', nxMdParas(nxParas(x.accord_contribution))]);

  // Places: visible settlements and sites
  var places = cities.filter(function(c) { return c.nation === id && getVisibility(c) !== 'hidden'; })
    .map(function(c) { return { kind: 'city', row: c }; })
    .concat(pois.filter(function(p) { return p.nation === id && getVisibility(p) !== 'hidden'; })
    .map(function(p) { return { kind: 'poi', row: p }; }));
  places.sort(function(a, b) { return (b.row.image ? 1 : 0) - (a.row.image ? 1 : 0) || a.row.name.localeCompare(b.row.name); });
  if (places.length) {
    sections.push(['Places', '<div class="nx-places">' + places.map(function(pl) {
      var r = pl.row, hash = pl.kind + '/' + r.id;
      return '<figure class="nx-place' + (r.image ? '' : ' nx-place--noimg') + '" data-nav="' + hash + '" onclick="navigate(\'' + hash + '\')">'
        + (r.image ? '<img src="' + esc(r.image) + '" alt="' + esc(r.name) + '" loading="lazy">' : '')
        + '<figcaption><b>' + esc(r.name) + '</b><span>' + esc(r.summary || '') + '</span></figcaption></figure>';
    }).join('') + '</div>']);
  }

  // Contents
  var toc = sections.length > 2 ? '<nav class="nx-toc"><div class="nx-toc-title">Contents</div><ol>'
    + sections.map(function(s) {
        return '<li><a onclick="var t=document.getElementById(\'nx-' + nxSlug(s[0]) + '\');if(t)t.scrollIntoView({behavior:\'smooth\'});return false;" href="#nation/' + esc(id) + '">' + esc(s[0]) + '</a></li>';
      }).join('') + '</ol></nav>' : '';

  var hero = '<header class="nx-hero nx-k-' + esc(id) + (cfg.hero ? ' has-img' : '') + '">'
    + (cfg.hero ? '<img class="nx-hero-img" src="' + esc(cfg.hero) + '" alt="' + esc(cfg.heroCaption || nation.name) + '">' : '')
    + (!cfg.hero && NX && NX.sigilUrl(id) ? '<img class="nx-hero-sigil" src="' + esc(NX.sigilUrl(id)) + '" alt="" aria-hidden="true">' : '')
    + '<div class="nx-hero-scrim"></div>'
    + '<div class="nx-hero-text">'
      + '<div class="nx-hero-eyebrow">' + esc(titleCase(nation.region)) + ' &middot; Nation</div>'
      + '<h1 class="nx-hero-title">' + esc(nation.name) + '</h1>'
      + (x.epithet ? '<div class="nx-hero-epithet">' + esc(x.epithet) + '</div>' : '')
      + (x.motto ? '<div class="nx-hero-motto">&ldquo;' + esc(x.motto) + '&rdquo;</div>' : '')
    + '</div>'
    + (cfg.hero && cfg.heroCaption ? '<div class="nx-hero-caption">' + esc(cfg.heroCaption) + '</div>' : '')
    + '</header>';

  el.innerHTML = breadcrumb([
      { label: 'Regions', hash: 'region/' + nation.region },
      { label: titleCase(nation.region), hash: 'region/' + nation.region },
      { label: nation.name, hash: 'nation/' + id }
    ])
    + '<div class="nx-page nx-k-' + esc(id) + '">'
    + hero
    + '<div class="nx-layout">'
      + '<article class="nx-article nation-body">'
        + (lede ? '<div class="nx-lede">' + nxMdParas([lede]) + '</div>' : '')
        + toc
        + sections.map(function(s) {
            return '<section class="nx-sec" id="nx-' + nxSlug(s[0]) + '"><h2 class="nx-sec-h">' + esc(s[0]) + '</h2><div class="nx-body">' + s[1] + '</div></section>';
          }).join('')
        + renderAssociatedCharacters(getAssociatedCharacters('nations', id))
      + '</article>'
      + nationInfoboxHtml(nation)
    + '</div>'
    + '</div>';
}

function renderCity(id, el) {
  var cities  = typeof CITIES  !== 'undefined' ? CITIES  : [];
  var nations = typeof NATIONS !== 'undefined' ? NATIONS : [];
  var city = mzFind(cities, id);
  if (!city) { renderNotFound(el, 'city/' + id); return; }
  var vis = getVisibility(city);
  if (vis === 'hidden') { renderNotFound(el, 'city/' + id); return; }
  var nation = mzFind(nations, city.nation);
  var nationVisible = nation && getVisibility(nation) !== 'hidden';
  var crumbs = [
    { label: titleCase(city.region), hash: 'region/' + city.region },
    { label: nation ? nation.name : titleCase(city.nation), hash: 'nation/' + city.nation },
    { label: city.name, hash: 'city/' + id }
  ];
  var base = {
    crumbs: crumbs,
    accent: mzPlaceAccent(city.nation, city.region),
    hero: { img: city.image, caption: city.name },
    eyebrow: titleCase(city.region) + ' · ' + titleCase(city.type || 'Settlement'),
    title: city.name,
    epithet: nation ? 'A ' + String(city.type || 'settlement').toLowerCase() + ' of ' + nation.name : ''
  };

  if (vis === 'teaser') {
    base.lede = mzText(city.summary);
    base.after = teaserFooter('settlement');
    renderMagazine(el, base);
    return;
  }

  var split = mzSplit(city.description || city.summary || '');
  var sections = [];
  sections.push(['About', split.rest + mzPullsHtml(city, 0)]);
  if (city.strategic_importance) sections.push(['Strategic Importance', mzText(city.strategic_importance)]);

  if (city.population_data) {
    var pd = city.population_data, popHtml = '';
    if (city.population) popHtml += '<p>' + esc(city.population) + '</p>';
    if (pd.breakdown && pd.breakdown.length) {
      popHtml += '<div class="city-pop-breakdown">';
      pd.breakdown.forEach(function(b) {
        var barW = Math.min(b.percent || 0, 100);
        popHtml += '<div class="city-pop-row">'
          + '<div class="city-pop-species">' + esc(b.species_id || '') + '</div>'
          + '<div class="city-pop-bar-wrap"><div class="city-pop-bar" style="width:' + barW + '%"></div></div>'
          + '<div class="city-pop-pct">' + (b.percent || 0) + '%'
            + (b.count_est ? ' <span class="city-pop-est">(~' + b.count_est + ')</span>' : '')
          + '</div>'
          + (b.notes ? '<div class="city-pop-note">' + esc(b.notes) + '</div>' : '')
        + '</div>';
      });
      popHtml += '</div>';
    }
    sections.push(['Population', popHtml]);
  }

  if (city.structures && city.structures.length) {
    var sHtml = '';
    city.structures.forEach(function(cat) {
      sHtml += '<div class="city-struct-cat"><div class="city-struct-cat-title">' + esc(cat.category) + '</div><div class="city-struct-entries">';
      (cat.entries || []).forEach(function(e) {
        sHtml += '<div class="city-struct-entry"><div class="city-struct-entry-name">' + esc(e.name)
          + (e.entry_id ? ' <span class="city-struct-linked">&#128279;</span>' : '') + '</div>'
          + (e.description ? '<div class="city-struct-entry-desc">' + esc(e.description) + '</div>' : '') + '</div>';
      });
      sHtml += '</div></div>';
    });
    sections.push(['Structures', sHtml]);
  }

  if (city.landmarks && city.landmarks.length) {
    sections.push(['Landmarks', '<ul class="nx-customs">' + city.landmarks.map(function(lm) {
      return '<li><b>' + esc(lm.name) + '.</b> ' + esc(lm.description || '') + '</li>';
    }).join('') + '</ul>']);
  }

  // Visible sites in the same nation that name this town
  var pois = typeof POIS !== 'undefined' ? POIS : [];
  var places = pois.filter(function(p) {
    return getVisibility(p) !== 'hidden' && p.nation === city.nation
      && String((p.description || '') + ' ' + (p.summary || '') + ' ' + p.name).indexOf(city.name) >= 0;
  });
  if (places.length) sections.push(['Places in ' + city.name, mzPlacesHtml(places, 'poi')]);

  base.lede = split.lede;
  base.sections = sections;
  base.after = renderAssociatedCharacters(getAssociatedCharacters('cities', id));
  base.infobox = {
    name: city.name, sub: titleCase(city.type || ''),
    rows: [
      ['Type', esc(titleCase(city.type || ''))],
      ['Nation', nation ? (nationVisible ? mzLink('nation/' + nation.id, nation.name) : esc(nation.name)) : esc(titleCase(city.nation || ''))],
      ['Region', mzLink('region/' + city.region, titleCase(city.region))],
      ['Population', esc(city.population || '')],
      ['Color health', colorHealthGauge(city.color_health, true)],
      ['Formery', city.formery_present ? 'Office present' : '']
    ],
    extra: id === 'gobblewump-crossing'
      ? '<a class="nx-ib-action" href="maps/gobblewump-crossing.html" target="_blank" rel="noopener">&#128506; View Town Map</a>' : ''
  };
  renderMagazine(el, base);
}

function renderPOI(id, el) {
  var pois = typeof POIS !== 'undefined' ? POIS : [];
  var nations = typeof NATIONS !== 'undefined' ? NATIONS : [];
  var poi = mzFind(pois, id);
  if (!poi) { renderNotFound(el, 'poi/' + id); return; }
  var vis = getVisibility(poi);
  if (vis === 'hidden') { renderNotFound(el, 'poi/' + id); return; }
  var nation = mzFind(nations, poi.nation);
  var nationVisible = nation && getVisibility(nation) !== 'hidden';
  var typeLabel = titleCase(poi.type || poi.poi_type || 'Site');
  var crumbs = [{ label: titleCase(poi.region || ''), hash: 'region/' + poi.region }];
  if (nationVisible) crumbs.push({ label: nation.name, hash: 'nation/' + nation.id });
  crumbs.push({ label: poi.name, hash: 'poi/' + id });
  var base = {
    crumbs: crumbs,
    accent: mzPlaceAccent(poi.nation, poi.region),
    hero: { img: poi.image, caption: poi.name },
    eyebrow: titleCase(poi.region || '') + ' · Point of Interest',
    title: poi.name,
    epithet: typeLabel + (nation ? ' in the lands of ' + nation.name : '')
  };
  if (vis === 'teaser') {
    base.lede = mzText(poi.summary);
    base.after = teaserFooter('location');
    renderMagazine(el, base);
    return;
  }
  var split = mzSplit(poi.description || poi.summary || '');
  base.lede = split.lede;
  base.sections = [
    ['About', split.rest + mzPullsHtml(poi, 0)],
    ['The Gigglegloom Here', mzText(poi.gigglegloom_notes)]
  ];
  base.after = renderAssociatedCharacters(getAssociatedCharacters('pois', id));
  base.infobox = {
    name: poi.name, sub: typeLabel,
    rows: [
      ['Type', esc(typeLabel)],
      ['Nation', nation ? (nationVisible ? mzLink('nation/' + nation.id, nation.name) : esc(nation.name)) : ''],
      ['Region', poi.region ? mzLink('region/' + poi.region, titleCase(poi.region)) : ''],
      ['Color health', colorHealthGauge(poi.color_health, true)]
    ]
  };
  renderMagazine(el, base);
}

function renderCharacter(id, el) {
  var chars = typeof CHARACTERS !== 'undefined' ? CHARACTERS : [];
  var character = mzFind(chars, id);
  if (!character) { renderNotFound(el, 'character/' + id); return; }
  var vis = getVisibility(character);
  if (vis === 'hidden') { renderNotFound(el, 'character/' + id); return; }
  var categoryLabel = titleCase(character.category || 'Character');
  var base = {
    crumbs: [{ label: 'Characters', hash: 'character/' + id }, { label: character.name, hash: 'character/' + id }],
    accent: character.category === 'god' ? 'mz-accent-purple' : 'mz-accent-gold',
    hero: { img: character.image, portrait: true },
    eyebrow: categoryLabel,
    title: character.name,
    epithet: character.role || ''
  };
  if (vis === 'teaser') {
    base.lede = mzText(character.summary);
    base.after = teaserFooter('character');
    renderMagazine(el, base);
    return;
  }
  var split = mzSplit(character.summary || '');
  base.lede = split.lede;
  base.sections = [
    ['Who They Are', split.rest + mzPullsHtml(character, 0)],
    ['Appearance', mzText(character.appearance)],
    ['Personality', mzText(character.personality)],
    ['Motivation', mzText(character.motivation)],
    ['The Gigglegloom', mzText(character.gigglegloom_relationship)],
    ['What You Know', mzText(character.player_knowledge)]
  ];
  base.after = mzTagsRow(character.tags);
  base.infobox = {
    name: character.name, sub: character.role || categoryLabel,
    rows: [
      ['Role', esc(character.role || '')],
      ['Pronouns', esc(character.pronouns || '')],
      ['Status', esc(titleCase(character.status || ''))],
      ['Location', esc(character.location || '')],
      ['Affiliation', esc(character.affiliation || '')],
      ['Color', esc(character.color || '')]
    ]
  };
  renderMagazine(el, base);
}

function renderCreature(id, el) {
  var creatures = typeof CREATURES !== 'undefined' ? CREATURES : [];
  var creature = mzFind(creatures, id);
  if (!creature) { renderNotFound(el, 'creature/' + id); return; }
  var vis = getVisibility(creature);
  if (vis === 'hidden') { renderNotFound(el, 'creature/' + id); return; }
  var tierLabel = titleCase(creature.tier || '');
  var regionIds = creature.regions || [];
  var base = {
    crumbs: [{ label: 'Creatures', hash: 'creature/' + id }, { label: tierLabel || 'Bestiary', hash: 'creature/' + id }, { label: creature.name, hash: 'creature/' + id }],
    accent: MZ_REGION_ACCENT[regionIds[0]] || 'mz-accent-green',
    hero: { img: creature.image, portrait: true },
    eyebrow: 'Bestiary' + (tierLabel ? ' · ' + tierLabel : ''),
    title: creature.name,
    epithet: creature.habitat || ''
  };
  if (vis === 'teaser') {
    base.epithet = '';
    var desc = creature.description || '';
    var dot = desc.search(/[.!?]/);
    base.lede = '<p>' + esc(dot >= 0 ? desc.slice(0, dot + 1) : desc) + '</p>';
    base.after = teaserFooter('creature');
    renderMagazine(el, base);
    return;
  }
  var dimmed = creature.dimmed_version ? mzFind(creatures, creature.dimmed_version) : null;
  if (dimmed && getVisibility(dimmed) === 'hidden') dimmed = null;
  var split = mzSplit(creature.description || '');
  base.lede = split.lede;
  base.sections = [
    ['About', split.rest + mzPullsHtml(creature, 0)],
    ['Behavior', mzText(creature.behavior)],
    ['The Gigglegloom', mzText(creature.gigglegloom_relationship)]
  ];
  base.after = mzTagsRow(creature.tags);
  base.infobox = {
    name: creature.name, sub: tierLabel,
    rows: [
      ['Tier', esc(tierLabel)],
      ['Kind', esc(titleCase(creature.category || ''))],
      ['Habitat', esc(creature.habitat || '')],
      ['Found in', regionIds.map(function(r) { return mzLink('region/' + r, titleCase(r)); }).join(', ')],
      ['Dimmed form', dimmed ? mzLink('creature/' + dimmed.id, dimmed.name) : '']
    ]
  };
  renderMagazine(el, base);
}

function renderReligion(id, el) {
  var data = getReligionData(id);
  var religion = data.religion;
  if (!religion) { renderNotFound(el, 'religion/' + id); return; }
  var vis = getVisibility(religion);
  if (vis === 'hidden') { renderNotFound(el, 'religion/' + id); return; }
  var base = {
    crumbs: [{ label: 'Faiths', hash: 'religion/' + id }, { label: religion.name, hash: 'religion/' + id }],
    accent: 'mz-accent-purple',
    hero: { img: religion.image },
    eyebrow: 'Faith',
    title: religion.name,
    epithet: religion.symbol ? 'Symbol: ' + religion.symbol : ''
  };
  if (vis === 'teaser') {
    base.lede = mzText(religion.summary);
    base.after = teaserFooter('faith');
    renderMagazine(el, base);
    return;
  }
  function cards(list, hashFn, tagFn, bodyFn) {
    if (!list || !list.length) return '';
    return '<div class="entry-grid">' + list.map(function(r) {
      return '<div class="entry-card" data-nav="' + esc(hashFn(r)) + '" onclick="navigate(\'' + esc(hashFn(r)) + '\')">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(r.name) + '</span></div>'
        + (tagFn ? '<div class="entry-tag">' + esc(tagFn(r)) + '</div>' : '')
        + '<div class="entry-body">' + esc(bodyFn(r)) + '</div></div>';
    }).join('') + '</div>';
  }
  var practicesList = Array.isArray(religion.practices) ? religion.practices
    : String(religion.practices || '').split(/\n\s*\n|\n/).map(function(x) { return x.trim(); }).filter(Boolean);
  base.lede = mzText(religion.summary);
  base.sections = [
    ['Core Belief', mzText(religion.core_belief || religion.beliefs) + mzPullsHtml(religion, 0)],
    ['The Partition: Their Account', mzText(religion.partition_account)],
    ['Practices', practicesList.length ? '<ul class="nx-customs">' + practicesList.map(function(p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' : ''],
    ['Structure', mzText(religion.structure)],
    ['Relationship to the Gigglegloom', mzText(religion.relationship_to_gigglegloom)],
    ['Other Faiths', mzText(religion.relationship_to_other_faiths)],
    ['Gods', cards(data.gods, function() { return 'gods'; }, null, function(g) { return g.player_knowledge || g.summary || ''; })],
    ['Holy Sites', data.holy_sites && data.holy_sites.length ? mzPlacesHtml(data.holy_sites, 'poi') : ''],
    ['Associated Organizations', cards(data.organizations, function(o) { return 'org/' + o.id; }, function(o) { return titleCase(o.type || ''); }, function(o) { return o.summary || ''; })],
    ['Nations of the Faith', cards(data.nations, function(n) { return 'nation/' + n.id; }, function(n) { return titleCase(n.region || ''); }, function(n) { return n.summary || ''; })],
    ['Sacred and Associated Creatures', data.creatures && data.creatures.length ? '<div class="nx-creatures nx-creatures--grid">' + data.creatures.map(function(c) {
      return '<figure class="nx-creature" data-nav="creature/' + c.id + '" onclick="navigate(\'creature/' + c.id + '\')">'
        + (c.image ? '<img src="' + esc(c.image) + '" alt="' + esc(c.name) + '" loading="lazy">' : '<div class="nx-creature-ph">' + esc(String(c.name).charAt(0)) + '</div>')
        + '<figcaption>' + esc(c.name) + '</figcaption></figure>';
    }).join('') + '</div>' : '']
  ];
  base.infobox = {
    name: religion.name, sub: 'Faith',
    rows: [
      ['Symbol', esc(religion.symbol || '')],
      ['Deity', (data.gods || []).map(function(g) { return mzLink('gods', g.name); }).join(', ')],
      ['Spread', (data.nations && data.nations.length) ? (data.nations.map(function(n) { return mzLink('nation/' + n.id, n.name); }).join(', ')) : '']
    ]
  };
  renderMagazine(el, base);
}

function renderOrg(id, el) {
  var orgs = typeof ORGANIZATIONS !== 'undefined' ? ORGANIZATIONS : [];
  var org = mzFind(orgs, id);
  if (!org) { renderNotFound(el, 'org/' + id); return; }
  var vis = getVisibility(org);
  if (vis === 'hidden') { renderNotFound(el, 'org/' + id); return; }
  var accent = org.alignment === 'dark' ? 'mz-accent-red' : (org.alignment === 'light' ? 'mz-accent-green' : 'mz-accent-gold');
  var base = {
    crumbs: [{ label: 'Organizations', hash: 'org/' + id }, { label: org.name, hash: 'org/' + id }],
    accent: accent,
    hero: { img: org.image, caption: org.name },
    eyebrow: 'Organization' + (org.alignment ? ' · ' + titleCase(org.alignment) : ''),
    title: org.name,
    epithet: (org.full_name && org.full_name !== org.name) ? org.full_name : titleCase(org.type || '')
  };
  if (vis === 'teaser') {
    base.lede = mzText(org.summary);
    base.after = teaserFooter('organization');
    renderMagazine(el, base);
    return;
  }
  base.lede = (org.id === 'the-formery' ? '<div class="formery-stamp nx-formery-stamp">FORM 1-A: RECEIVED… EVENTUALLY</div>' : '') + mzText(org.summary);
  base.sections = [
    ['Purpose', mzText(org.purpose) + mzPullsHtml(org, 0)],
    ['Public Perception', mzText(org.public_perception)],
    ['The Gigglegloom', mzText(org.gigglegloom_relationship)],
    ['Notable Facts', org.notable_facts && org.notable_facts.length ? '<ul class="nx-customs">' + org.notable_facts.map(function(f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' : '']
  ];
  base.after = renderAssociatedCharacters(getAssociatedCharacters('organizations', id));
  base.infobox = {
    name: org.name, sub: base.epithet,
    figure: org.image ? { img: org.image } : null,
    rows: [
      ['Type', esc(titleCase(org.type || ''))],
      ['Alignment', esc(titleCase(org.alignment || ''))],
      ['Age', esc(titleCase(org.age || ''))],
      ['Headquarters', esc(org.headquarters || '')]
    ]
  };
  renderMagazine(el, base);
}

function renderItem(id, el) {
  var items = typeof ITEMS !== 'undefined' ? ITEMS : [];
  var item = mzFind(items, id);
  if (!item) { renderNotFound(el, 'item/' + id); return; }
  var vis = getVisibility(item);
  if (vis === 'hidden') { renderNotFound(el, 'item/' + id); return; }
  var base = {
    accent: mzGgAccent(item.gigglegloom_type),
    hero: { img: item.image, portrait: true },
    eyebrow: 'Item · ' + titleCase(item.category || item.rarity || ''),
    title: item.name,
    epithet: item.rarity ? titleCase(item.rarity) : ''
  };
  if (vis === 'teaser') {
    base.lede = mzText(item.summary);
    base.after = teaserFooter('item');
    renderMagazine(el, base);
    return;
  }
  var split = mzSplit(item.description || item.summary || '');
  base.lede = split.lede;
  base.sections = [['About', split.rest + mzPullsHtml(item, 0)]];
  base.infobox = {
    name: item.name, sub: titleCase(item.category || ''),
    rows: [
      ['Category', esc(titleCase(item.category || ''))],
      ['Rarity', esc(titleCase(item.rarity || ''))],
      ['Gigglegloom', esc(titleCase(item.gigglegloom_type || ''))],
      ['Cost', item.cost_gp ? esc(String(item.cost_gp)) + ' gp' : ''],
      ['Weight', item.weight_lb ? esc(String(item.weight_lb)) + ' lb' : '']
    ]
  };
  renderMagazine(el, base);
}

// Lore pages: world_concepts rows (traditions, events, ideas) at #lore/<id>.
var CONCEPTS = typeof CONCEPTS !== 'undefined' ? CONCEPTS : [];
function renderLore(id, el) {
  var c = mzFind(typeof CONCEPTS !== 'undefined' ? CONCEPTS : [], id);
  if (!c) { renderNotFound(el, 'lore/' + id); return; }
  var vis = getVisibility(c);
  if (vis === 'hidden') { renderNotFound(el, 'lore/' + id); return; }
  var nations = typeof NATIONS !== 'undefined' ? NATIONS : [];
  var nation = c.nation ? mzFind(nations, c.nation) : null;
  var nationVisible = nation && getVisibility(nation) !== 'hidden';
  var crumbs = [];
  if (c.region) crumbs.push({ label: titleCase(c.region), hash: 'region/' + c.region });
  if (nationVisible) crumbs.push({ label: nation.name, hash: 'nation/' + nation.id });
  crumbs.push({ label: c.name, hash: 'lore/' + id });
  var base = {
    crumbs: crumbs,
    accent: c.nation ? mzPlaceAccent(c.nation, c.region) : (MZ_REGION_ACCENT[c.region] || 'mz-accent-gold'),
    hero: { img: c.image },
    eyebrow: (c.category || 'Lore') + (c.region ? ' · ' + titleCase(c.region) : ''),
    title: c.name,
    epithet: nation ? 'From the lore of ' + nation.name : ''
  };
  if (vis === 'teaser') {
    base.lede = mzText(c.summary);
    base.after = teaserFooter('story');
    renderMagazine(el, base);
    return;
  }
  var split = mzSplit(c.description || c.summary || '');
  base.lede = split.lede;
  base.sections = [['More', split.rest]];
  base.infobox = {
    name: c.name, sub: c.category || 'Lore',
    rows: [
      ['Kind', esc(c.category || '')],
      ['Nation', nation ? (nationVisible ? mzLink('nation/' + nation.id, nation.name) : esc(nation.name)) : ''],
      ['Region', c.region ? mzLink('region/' + c.region, titleCase(c.region)) : '']
    ]
  };
  renderMagazine(el, base);
}

// Species pages: the twelve peoples of Anavale at #species/<id>.
var SPECIES = typeof SPECIES !== 'undefined' ? SPECIES : [];
function renderSpeciesPage(id, el) {
  var sp = mzFind(typeof SPECIES !== 'undefined' ? SPECIES : [], id);
  if (!sp || sp.player_facing === false) { renderNotFound(el, 'species/' + id); return; }
  var split = mzSplit(sp.description || '');
  renderMagazine(el, {
    crumbs: [{ label: 'Peoples', hash: 'species/' + id }, { label: sp.name, hash: 'species/' + id }],
    accent: mzGgAccent(sp.affinity),
    hero: {},
    eyebrow: 'People of Anavale',
    title: sp.name,
    epithet: sp.phb_equivalent ? 'Known elsewhere as ' + String(sp.phb_equivalent).toLowerCase() : '',
    lede: split.lede,
    sections: [['More', split.rest]],
    infobox: {
      name: sp.name, sub: sp.phb_equivalent || '',
      rows: [
        ['Also called', esc(sp.phb_equivalent || '')],
        ['Homeland', sp.region ? mzLink('region/' + sp.region, titleCase(sp.region)) : ''],
        ['Gigglegloom', esc(titleCase(sp.affinity || ''))],
        ['Size', esc(titleCase(sp.size || ''))],
        ['Speed', sp.speed_ft ? esc(String(sp.speed_ft)) + ' ft' : '']
      ]
    }
  });
}

// Pull quote at index i from a row's extra_data.pull_quotes, if authored.
function mzPullsHtml(row, i) {
  var q = mzPulls(row)[i];
  return q ? '<blockquote class="nx-pull"><p>' + esc(q) + '</p><cite>' + esc(row.name) + '</cite></blockquote>' : '';
}

// Image cards for a list of cities or POIs.
function mzPlacesHtml(list, kind) {
  return '<div class="nx-places">' + list.map(function(r) {
    var hash = kind + '/' + r.id;
    return '<figure class="nx-place' + (r.image ? '' : ' nx-place--noimg') + '" data-nav="' + hash + '" onclick="navigate(\'' + hash + '\')">'
      + (r.image ? '<img src="' + esc(r.image) + '" alt="' + esc(r.name) + '" loading="lazy">' : '')
      + '<figcaption><b>' + esc(r.name) + '</b><span>' + esc(r.summary || '') + '</span></figcaption></figure>';
  }).join('') + '</div>';
}

// ══ SPELLBOOK ════════════════════════════════════════════════════════════════

var _sbType     = 'all';
var _sbLvl      = 'all';
var _sbPage     = 1;
var _sbPageSize = 9999;
var _sbFiltered = [];

var TYPE_ICONS = {
  Bubbleseed: '<img src="assets/icons/icon-bubbleseed.svg" class="sc-tab-svg">',
  Featherflow: '<img src="assets/icons/icon-featherflow.svg" class="sc-tab-svg">',
  Steelfist:  '<img src="assets/icons/icon-steelfist.svg" class="sc-tab-svg">',
  Flamerage:  '<img src="assets/icons/icon-flamerage.svg" class="sc-tab-svg">',
  Freeweave:  '<span style="font-size:0.85rem;color:rgba(0,0,0,0.5);">✧</span>'
};
var TYPE_COLORS = {
  Bubbleseed: '#2a7a3a', Featherflow: '#2266b8', Steelfist: '#6a3aaa',
  Flamerage:  '#aa3a1a', Freeweave:  '#f0ede6'
};

function renderSpells() {
  var query = (document.getElementById('sb-search') ? document.getElementById('sb-search').value || '' : '').toLowerCase();
  var list  = document.getElementById('sb-list');
  var count = document.getElementById('sb-count');
  var pager = document.getElementById('sb-pagination');
  var spellSource = (typeof SPELL_DATA !== 'undefined' && SPELL_DATA.length) ? SPELL_DATA : (WORLD_DATA && WORLD_DATA.spells && WORLD_DATA.spells.length ? WORLD_DATA.spells : null);
  if (!list || !spellSource) return;

  _sbFiltered = spellSource.filter(function(s) {
    if (_sbType !== 'all' && s.types.indexOf(_sbType) === -1) return false;
    if (_sbLvl  !== 'all' && String(s.level) !== String(_sbLvl)) return false;
    var spellDesc = s.spell_desc || s.desc || '';
    if (query && s.name.toLowerCase().indexOf(query) === -1 &&
        spellDesc.toLowerCase().indexOf(query) === -1) return false;
    return true;
  }).sort(function(a, b) { return a.name.localeCompare(b.name); });

  var total    = _sbFiltered.length;
  var pages    = Math.max(1, Math.ceil(total / _sbPageSize));
  if (_sbPage > pages) _sbPage = 1;
  var start    = (_sbPage - 1) * _sbPageSize;
  var pageData = _sbFiltered.slice(start, start + _sbPageSize);

  count.textContent = total + ' spell' + (total !== 1 ? 's' : '')
    + (pages > 1 ? ' — page ' + _sbPage + ' of ' + pages : '');

  var html = '';
  pageData.forEach(function(s, i) {
    var globalIdx = start + i;
    var lvlLabel  = s.level === 0 ? 'Cantrip' : 'Lv ' + s.level;
    var pType     = s.types.length > 1 ? 'multi' : (s.types[0] || 'Freeweave');
    var icon      = TYPE_ICONS[s.types[0]] || '✦';
    var label     = s.types.length > 1 ? s.types.join(' / ') : (s.types[0] || '');
    html += '<div class="spell-card" onclick="openSpellModal(' + globalIdx + ')">'
         +  '<div class="sc-type-tab sc-tab-' + pType + '">'
         +    '<span class="sc-tab-icon">' + icon + '</span>'
         +    '<span class="sc-tab-label">' + label + '</span>'
         +  '</div>'
         +  '<div class="sc-body">'
         +    '<div class="sc-name">' + s.name + '</div>'
         +    '<div class="sc-desc">' + s.desc + '</div>'
         +  '</div>'
         +  '<div class="sc-meta">'
         +    '<span class="sc-lvl-label">' + lvlLabel + '</span>'
         +    '<button class="sc-read-more" onclick="event.stopPropagation(); openSpellModal(' + globalIdx + ')">Read more →</button>'
         +  '</div>'
         +  '</div>';
  });
  list.innerHTML = html || '<div class="spell-card"><div class="sc-body"><div class="sc-desc">No spells match these filters.</div></div></div>';

  if (pages <= 1) { pager.innerHTML = ''; return; }
  var pHtml = '<button class="sb-page-btn" onclick="sbGoPage(' + (_sbPage-1) + ')"' + (_sbPage === 1 ? ' disabled' : '') + '>← Prev</button>';
  var lo = Math.max(1, _sbPage - 2);
  var hi = Math.min(pages, _sbPage + 2);
  if (lo > 1)     pHtml += '<span class="sb-page-info">1 …</span>';
  for (var p = lo; p <= hi; p++) {
    pHtml += '<button class="sb-page-btn' + (p === _sbPage ? ' active' : '') + '" onclick="sbGoPage(' + p + ')">' + p + '</button>';
  }
  if (hi < pages) pHtml += '<span class="sb-page-info">… ' + pages + '</span>';
  pHtml += '<button class="sb-page-btn" onclick="sbGoPage(' + (_sbPage+1) + ')"' + (_sbPage === pages ? ' disabled' : '') + '>Next →</button>';
  pager.innerHTML = pHtml;
}

function sbGoPage(n) {
  _sbPage = n;
  renderSpells();
  var el = document.getElementById('sb-search');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initSpellbook() {
  // Reset state
  _sbType = 'all'; _sbLvl = 'all'; _sbPage = 1;

  document.querySelectorAll('#sb-type-filters .spell-type-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _sbType = btn.dataset.type;
      _sbPage = 1;
      document.querySelectorAll('#sb-type-filters .spell-type-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.type === _sbType);
      });
      renderSpells();
    });
  });
  document.querySelectorAll('#sb-lvl-filters .spell-lvl-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _sbLvl = btn.dataset.lvl;
      _sbPage = 1;
      document.querySelectorAll('#sb-lvl-filters .spell-lvl-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.lvl === _sbLvl);
      });
      renderSpells();
    });
  });
  var searchEl = document.getElementById('sb-search');
  if (searchEl) searchEl.addEventListener('input', function() { _sbPage = 1; });
  renderSpells();
}

function openSpellModal(idx) {
  var s = _sbFiltered[idx];
  if (!s) return;
  var lvlLabel = s.level === 0 ? 'Cantrip' : (s.level === 1 ? '1st' : s.level === 2 ? '2nd' : s.level === 3 ? '3rd' : s.level + 'th') + '-level';
  var st = (window.SPELL_STATS && SPELL_STATS[s.name]) || null;

  var typeBadges = s.types.map(function(t) {
    var ico = TYPE_ICONS[t] ? TYPE_ICONS[t].replace('sc-tab-svg','sm-badge-icon') : '';
    return '<span class="sm-type-badge ' + t + '">' + ico + ' ' + t + '</span>';
  }).join('');
  typeBadges += '<span class="sm-lvl-badge">' + lvlLabel + (s.level === 0 ? '' : ' Spell') + '</span>';
  if (st && st.ritual) typeBadges += '<span class="sm-lvl-badge">Ritual</span>';
  if (st && st.conc)   typeBadges += '<span class="sm-lvl-badge">Concentration</span>';

  var school = st ? st.school : (s.types.map(function(t){
    return {Bubbleseed:'Conjuration',Featherflow:'Transmutation',Steelfist:'Abjuration',Flamerage:'Evocation',Freeweave:'Illusion'}[t] || '';
  }).join(' / '));

  var statsHtml = '';
  if (st) {
    [['Casting Time', st.ct], ['Range', st.range], ['Components', st.comp], ['Duration', st.dur]].forEach(function(row) {
      statsHtml += '<div class="sm-stat"><div class="sm-stat-label">' + row[0] + '</div><div class="sm-stat-value">' + row[1] + '</div></div>';
    });
  }

  var descHtml   = st ? '<div class="spell-modal-desc">' + st.desc + '</div>' : '';
  var higherHtml = (st && st.higher) ? '<div class="spell-modal-higher"><strong>Using a Higher-Level Spell Slot.</strong> ' + st.higher + '</div>' : '';
  var flavorHtml = s.desc || s.spell_desc ? '<div class="spell-modal-flavor">"' + (s.desc || s.spell_desc) + '"</div>' : '';

  document.getElementById('sm-type-row').innerHTML   = typeBadges;
  document.getElementById('sm-name').textContent     = s.name;
  document.getElementById('sm-school').textContent   = lvlLabel + (s.level === 0 ? ' Cantrip' : '') + (school ? ' · ' + school : '');
  document.getElementById('sm-stats').innerHTML      = statsHtml;
  document.getElementById('sm-stats').style.display  = statsHtml ? 'grid' : 'none';
  document.getElementById('sm-body').innerHTML       = descHtml + higherHtml + flavorHtml;
  document.getElementById('spell-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSpellModal() {
  document.getElementById('spell-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSpellModal();
});

// ══ INIT ═════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  buildSidebar();
  buildSearchIndex();
  buildWikiLinkMap();
  handleRoute();   // router.js wired to hashchange; call once on load
});
