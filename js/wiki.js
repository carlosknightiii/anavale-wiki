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
  var h = (c.habitat || '').split(' — ')[0].split(',')[0];
  if (h.length > 60) h = h.slice(0, 57) + '…';
  return (c.tier ? c.tier.charAt(0).toUpperCase() + c.tier.slice(1) : '')
       + (h ? ' · ' + h : '');
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

function getVisibility(entry) {
  if (!entry) return 'hidden';
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

  if (isOpen) {
    body.classList.remove('open');
    btn.classList.remove('open');
  } else {
    body.classList.add('open');
    btn.classList.add('open');
  }
}

function getAccState(key) {
  try { return sessionStorage.getItem('acc-' + key); } catch(e) { return null; }
}

function makeAccordion(key, label, childrenHtml, defaultOpen) {
  var stored = getAccState(key);
  var open   = stored !== null ? stored === '1' : !!defaultOpen;
  var openCls = open ? ' open' : '';
  return '<button class="nav-accordion-header' + openCls + '" data-key="' + esc(key) + '" onclick="toggleAccordion(this)">'
    + '<span>' + esc(label) + '</span>'
    + '<span class="nav-accordion-arrow">▶</span>'
    + '</button>'
    + '<div class="nav-accordion-body' + openCls + '">'
    + childrenHtml
    + '</div>';
}

// Like makeAccordion but styled as a top-level section title (larger, less indented)
function makeSectionAccordion(key, label, childrenHtml, defaultOpen) {
  var stored = getAccState(key);
  var open   = stored !== null ? stored === '1' : !!defaultOpen;
  var openCls = open ? ' open' : '';
  return '<button class="nav-section-accordion-header' + openCls + '" data-key="' + esc(key) + '" onclick="toggleAccordion(this)">'
    + '<span>' + label + '</span>'
    + '<span class="nav-accordion-arrow">▶</span>'
    + '</button>'
    + '<div class="nav-accordion-body' + openCls + '">'
    + childrenHtml
    + '</div>';
}

function navLink(label, hash, activeHash) {
  var isActive = (hash === activeHash) ? ' active' : '';
  return '<button class="nav-link' + isActive + '" data-hash="' + esc(hash) + '" onclick="navigate(\'' + esc(hash) + '\')">'
    + esc(label) + '</button>';
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
    + makeSectionAccordion('intro', '✦ Introduction',
        navLink('Welcome, To  Anavale', 'home', currentHash), introActive)
    + '</div>';

  // ── The World ──────────────────────────────────────
  var worldActive = ['gigglegloom','color','gods'].indexOf(currentHash) >= 0;
  html += '<div class="nav-section">'
    + makeSectionAccordion('world', '◯ The World',
        navLink('The Gigglegloom', 'gigglegloom', currentHash)
        + navLink('Color & The Dimming', 'color', currentHash)
        + navLink('The Gods', 'gods', currentHash), worldActive)
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
      var nLabel = nVis === 'teaser'
        ? '<span class="nav-teaser-mark">✨</span>' + esc(n.name)
        : esc(n.name);

      var nCities = cities.filter(function(c) {
        return c.nation === n.id && getVisibility(c) !== 'hidden';
      }).sort(function(a,b) { return a.name.localeCompare(b.name); });

      if (nCities.length > 0) {
        var cityLinks = '';
        nCities.forEach(function(c) {
          var cVis   = getVisibility(c);
          var cLabel = cVis === 'teaser' ? '✨ ' + c.name : c.name;
          cityLinks += '<div class="nav-level-4">'
            + navLink(cLabel, 'city/' + c.id, currentHash)
            + '</div>';
        });
        innerHtml += '<div class="nav-level-3">'
          + makeAccordion('nation-' + n.id, nLabel,
            navLink('Overview', 'nation/' + n.id, currentHash) + cityLinks)
          + '</div>';
      } else {
        innerHtml += '<div class="nav-level-3">'
          + navLink(nLabel, 'nation/' + n.id, currentHash)
          + '</div>';
      }
    });

    innerHtml += '</div>';
    regionAccordions += makeAccordion('region-' + rId, rLabel, innerHtml);
  });

  if (regionAccordions) {
    var regActive = currentHash.indexOf('region/') === 0 || currentHash.indexOf('nation/') === 0 || currentHash.indexOf('city/') === 0;
    html += '<div class="nav-section">'
      + makeSectionAccordion('regions-section', '⛰ Regions', regionAccordions, regActive)
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
      var cLabel = cVis === 'teaser' ? '✨ ' + c.name : c.name;
      return '<div class="nav-level-3">' + navLink(cLabel, 'creature/' + c.id, currentHash) + '</div>';
    }).join('');
    creatureInner += '<div class="nav-level-2">'
      + makeAccordion('tier-' + grp.key, grp.label, links)
      + '</div>';
  });
  if (hasCreatures) {
    var creatActive = currentHash.indexOf('creature/') === 0;
    html += '<div class="nav-section">'
      + makeSectionAccordion('creatures-section', '𓃠 Creatures', creatureInner, creatActive)
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
      var oLabel = oVis === 'teaser' ? '✨ ' + o.name : o.name;
      return '<div class="nav-level-3">' + navLink(oLabel, 'org/' + o.id, currentHash) + '</div>';
    }).join('');
    orgInner += '<div class="nav-level-2">'
      + makeAccordion('org-' + cat.key, cat.label, links)
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
      var itLabel = itVis === 'teaser' ? '✨ ' + it.name : it.name;
      return '<div class="nav-level-2">' + navLink(itLabel, 'item/' + it.id, currentHash) + '</div>';
    }).join('');
    societyContent += makeAccordion('items', 'Notable Items', itemLinks);
  }

  // POIs — filtered by visibility
  var visPois = pois.filter(function(p) { return getVisibility(p) !== 'hidden'; })
    .sort(function(a,b) { return a.name.localeCompare(b.name); });
  if (visPois.length) {
    var poiLinks = visPois.map(function(p) {
      var pVis   = getVisibility(p);
      var pLabel = pVis === 'teaser' ? '✨ ' + p.name : p.name;
      return '<div class="nav-level-2">' + navLink(pLabel, 'poi/' + p.id, currentHash) + '</div>';
    }).join('');
    societyContent += makeAccordion('pois', 'Points of Interest', poiLinks);
  }

  // Rumors — direct link (no extra accordion wrapper needed)
  societyContent += navLink('Rumours & Hearsay', 'rumors', currentHash);

  var societyActive = currentHash.indexOf('org/') === 0 || currentHash.indexOf('item/') === 0
    || currentHash.indexOf('poi/') === 0 || currentHash === 'rumors';
  html += '<div class="nav-section">'
    + makeSectionAccordion('society-section', '⚑ Society', societyContent, societyActive)
    + '</div>';

  // ── Faiths (religions, visibility-filtered) ──────────────────────
  var religions = typeof RELIGIONS !== 'undefined' ? RELIGIONS : [];
  var visReligions = religions.filter(function(r) { return getVisibility(r) !== 'hidden'; })
    .sort(function(a,b) { return a.name.localeCompare(b.name); });
  if (visReligions.length) {
    var faithContent = '';
    visReligions.forEach(function(r) {
      var rVis   = getVisibility(r);
      var rLabel = rVis === 'teaser' ? '✨ ' + r.name : r.name;
      faithContent += navLink(rLabel, 'religion/' + r.id, currentHash);
    });
    var faithActive = currentHash.indexOf('religion/') === 0;
    html += '<div class="nav-section">'
      + makeSectionAccordion('faiths-section', '✦ Faiths', faithContent, faithActive)
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

  // Static pages — always player-facing
  [
    { hash: 'home',        title: 'Welcome, To Anavale', text: 'welcome home introduction anavale pogglewog',                                  player_facing: true },
    { hash: 'gigglegloom', title: 'The Gigglegloom',    text: 'gigglegloom magic bubbleseed featherflow steelfist flamerage prior conclave',   player_facing: true },
    { hash: 'color',       title: 'Color & The Dimming',text: 'color dimming fading stage grey vareth quietude',                              player_facing: true },
    { hash: 'gods',        title: 'The Gods',           text: 'gods oro nara thyun solvara grak partition brightcreed stillkeep veilborn',     player_facing: true },
    { hash: 'religion/brightcreed', title: 'The Brightcreed', text: 'The Brightcreed brightcreed oro nara faith color festivals joy practices lumenites wardens',  player_facing: true },
    { hash: 'religion/stillkeep',   title: 'The Stillkeep',   text: 'The Stillkeep stillkeep thyun memory records archive monastic patience partition history',   player_facing: true },
    { hash: 'religion/veilborn',    title: 'The Veilborn',     text: 'The Veilborn veilborn solvara secrets shadow partition truth veilmoot hidden faith',        player_facing: true },
    { hash: 'rumors',      title: 'Rumours & Hearsay',  text: 'rumors hearsay rumours',                                                       player_facing: true },
    { hash: 'spells',      title: 'Spellbook',          text: 'spells spellbook gigglegloom cast',                                            player_facing: true }
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
    { term: 'Prior Stone',      hash: 'region/caparia' },
    { term: 'Pogglewog',        hash: 'home' }
  ];
  statics.forEach(function(s) { _wikiLinkMap.push(s); });

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

  // linked tracks which terms have been linked in this render pass (link-once)
  var linked = {};
  el.querySelectorAll('.wiki-body p, .creature-body, .entry-body, .rumor-text, .warning-body, .creature-note, .pull-quote, .nation-body p, .acc-body p, .acc-body li, .teaser-footer').forEach(function(container) {
    walkTextNodes(container, termMap, re, linked);
  });
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
    body: 'Warm golden magic. Generous to a fault. Smells like fresh soil after rain. Tends to overshoot — ask for a flower, receive twelve. Common among healers, farmers, and optimistic people generally.' },
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
  oro:     { color: '#1a5a28', domain: 'God of Color, Joy & Laughter',
             note: 'Worshipped by: The Brightcreed (most widely). Temples: open fields.' },
  nara:    { color: '#1a4f8f', domain: 'Goddess of Wild Magic & Living Things',
             note: 'Appears as: different things to different observers. Children usually report bright green.' },
  thyun:   { color: '#4a5878', domain: 'God of Memory, Deep Time & Patience',
             note: 'Worshipped by: The Stillkeep. Temples: stone libraries.' },
  solvara: { color: '#6a3aaa', domain: 'Goddess of Secrets, Shadow & Hidden Truth',
             note: 'Worshipped by: The Veilborn. Their practices are not public knowledge.' },
  grak:    { color: '#7a6a60', domain: 'The Fallen — God of Order, now of Silence',
             note: 'Symbol: a cracked grey circle — once perfect.' }
};

var REGION_CONFIG = {
  caparia: {
    subtitle: 'The central heartlands of Pogglewog',
    quote: '"In Caparia, color maintenance is not pride. It is law. The fine for a faded storefront is modest. The social consequences are not."',
    quoteAttrib: '— A Bunari merchant, describing Solenveil',
    heroImg: 'assets/images/regions/img-caparia-landscape.png'
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
    heroImg: 'assets/images/regions/img-sohot-landscape.png'
  },
  jugabi: {
    subtitle: 'The ancient jungle southwest of Pogglewog',
    quote: '"The canopy is not above you. You are inside the forest. The forest has been here longer than anyone and is aware of you specifically."',
    quoteAttrib: '— Verdathi elder, speaking to a Kalori Republic delegation',
    heroImg: 'assets/images/regions/img-jugabi-landscape.png'
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
        + '<p class="home-tagline-line" style="animation-delay:0.6s">A world of color and happiness where cute creatures roam and play.</p>'
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
          + '<div class="glance-card-title">The Vareth</div>'
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
          image: 'assets/images/regions/img-caparia-landscape.png' },
        { id: 'nombi', name: 'Nombi', label: 'Region',
          climate: 'The frozen, aurora-lit north',
          blurb: 'Dense forests, icy mountains, and skies painted by the aurora. The north is stoic and beautiful and dangerous in equal measure. Honor is currency here.',
          image: 'assets/images/regions/img-nombi-landscape.webp' },
        { id: 'sohot', name: 'Sohot', label: 'Region',
          climate: 'The ancient, blazing south',
          blurb: 'Desert dunes, ancient ceremony, and the weight of a kingdom that has never forgotten a single thing. The south\'s colors have always been vivid. They have been looking slightly less so, lately.',
          image: 'assets/images/regions/img-sohot-landscape.png' },
        { id: 'jugabi', name: 'Jugabi', label: 'Region',
          climate: 'The living jungle southwest',
          blurb: 'The Dodooti Rainforest produces more ambient Gigglegloom than any other terrain type on the continent. The jungle has opinions. The jungle is always right.',
          image: 'assets/images/regions/img-jugabi-landscape.png' }
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
  var typesHtml = GIGGLEGLOOM_TYPES.map(function(t) {
    return '<div class="entry-card">'
      + '<div class="entry-name" style="color:' + t.color + ';">'
      + '<img src="' + esc(t.icon) + '" class="giggle-icon" alt=""> '
      + esc(t.name) + '</div>'
      + '<div class="entry-tag">' + t.tag + '</div>'
      + '<div class="entry-body">' + esc(t.body) + '</div>'
      + '</div>';
  }).join('');

  el.innerHTML = pageHeader('Magic', 'The Gigglegloom', 'The living magical force woven through all things')
    + '<div class="wiki-body">'
    + '<p>The <em>Gigglegloom</em> is what most people mean when they say "magic" in Anavale, though scholars and the Gigglegloom Conclave\'s licensing department would like it noted that this is an oversimplification they find professionally upsetting.</p>'
    + '<p>The Gigglegloom is not a tool. It is not a resource in the conventional sense. It is a <em>living force</em> woven through every thing that exists in Anavale — through the roots of trees, the water in rivers, the warmth of sunlight, and the bodies of every creature. It responds to emotion. It responds to intent. It has opinions about what it is asked to do.</p>'
    + '<div class="pull-quote">"Asking the Gigglegloom nicely does not guarantee results. But it does seem to improve them."<cite>— Wanderkeep Field Notes, Vol. 44</cite></div>'
    + '<div class="ornament">✦</div>'
    + '<div class="entry-grid">' + typesHtml + '</div>'
    + '<div class="warning-box"><div class="warning-title">Regarding the Gigglegloom Conclave</div>'
    + '<div class="warning-body">All use of the Gigglegloom within governed territories technically requires a license from the Gigglegloom Conclave. The application form is Form 7-A. Form 7-A requires Form 7-B as supporting documentation. Form 7-B requires Form 7-A. This has been noted. It has not been resolved.</div>'
    + '<div class="spellbook-section">'
    + '<div class="spellbook-heading">The Gigglegloom Spellbook</div>'
    + '<p>The following spells are known to practitioners across Anavale.</p>'
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
    + '</div></div>'
    + '</div>';

  // Reinitialize spellbook now that the DOM nodes exist
  initSpellbook();
}

function renderColor(el) {
  el.innerHTML = pageHeader('Magic', 'Color & The Dimming', 'What color means in Anavale, and what its absence means')
    + '<div class="wiki-body">'
    + '<p>In Anavale, color is not decoration. It is the Gigglegloom made visible. Every colored thing holds a fragment of the world\'s magic within it. This is not metaphorical. A red apple is alive with red in a way that a grey stone is not.</p>'
    + '<div class="pull-quote">"When the paint starts fading faster than it should, call the Wanderkeep. Don\'t wait until you can\'t remember why you painted it in the first place."<cite>— Brightcreed practical wisdom, Caparia</cite></div>'
    + '<p><strong>The Fading</strong> is the first stage of color loss — colors muting slightly, joy becoming a little harder to access, laughter arriving a moment late. Most people in affected regions live at this stage without realizing anything is wrong. It is subtle by design.</p>'
    + '<div class="dimming-fader"></div>'
    + '<p><strong>The Dimming</strong> is the second stage. Full greyscale. Joy is not felt — only remembered. People and creatures at this stage continue to function, but the light has gone out behind their eyes. Grey Fluffets still try to bring acorn gifts. The acorns are also grey.</p>'
    + '<p>There is no third stage. The Dimmed do not become something else. They simply remain — in a world they can no longer feel. This is the goal of those who cause the Dimming. Not conquest. Not cruelty for its own sake. Simply <em>quietude.</em></p>'
    + '<div class="warning-box"><div class="warning-title">Signs of the Dimming</div>'
    + '<div class="warning-body">In order of increasing concern: colors appearing slightly muted; food losing an unnamed quality; Bumble Frogs going quiet; Hollowmoths appearing in daylight; animals going very still without apparent cause; a small perfect black prism carved somewhere it wasn\'t yesterday.</div></div>'
    + '</div>';
}

function renderGods(el) {
  var chars    = typeof CHARACTERS !== 'undefined' ? CHARACTERS : [];
  var godOrder = ['oro', 'nara', 'thyun', 'solvara', 'grak'];
  var godsHtml = '';

  godOrder.forEach(function(godId) {
    var c = null;
    for (var i = 0; i < chars.length; i++) { if (chars[i].id === godId) { c = chars[i]; break; } }
    if (!c) return;
    var m = GODS_META[godId] || {};
    godsHtml += '<div class="creature-entry">'
      + '<div class="creature-header">'
      + '<div class="creature-name" style="color:' + (m.color || '') + ';">' + esc(c.name) + '</div>'
      + '<div class="creature-latin">' + esc(m.domain) + '</div>'
      + '</div>'
      + '<div class="creature-body">' + esc(c.player_knowledge) + '</div>'
      + '<div class="creature-note">' + esc(m.note) + '</div>'
      + '</div>';
  });

  el.innerHTML = pageHeader('Theology', 'The Gods', 'As understood by the faithful, the scholars, and those caught in between')
    + '<div class="wiki-body">'
    + '<p>Anavale has five gods, though theologians will argue at length about whether certain of them are truly independent deities or aspects of others. This argument has been ongoing for three hundred years. It has not reached a conclusion.</p>'
    + godsHtml
    + '</div>';
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
  var creatures = typeof CREATURES  !== 'undefined' ? CREATURES  : [];

  var region = null;
  for (var i = 0; i < regions.length; i++) { if (regions[i].id === id) { region = regions[i]; break; } }
  if (!region) { renderNotFound(el, 'region/' + id); return; }

  var cfg = REGION_CONFIG[id] || {};

  // Only show visible/teaser nations, cities, creatures
  var rNations = nations.filter(function(n) {
    return n.region === id && getVisibility(n) !== 'hidden';
  });
  var rCities = cities.filter(function(c) {
    return c.region === id && getVisibility(c) !== 'hidden';
  });
  var rCreatures = creatures.filter(function(c) {
    return getVisibility(c) !== 'hidden' && Array.isArray(c.regions) && c.regions.indexOf(id) >= 0;
  });

  var body = '';
  body += '<p>' + esc(region.summary) + '</p>';
  if (cfg.quote) {
    body += '<div class="pull-quote">' + cfg.quote + '<cite>' + esc(cfg.quoteAttrib) + '</cite></div>';
  }

  // Info cards
  body += '<div class="entry-grid">'
    + '<div class="entry-card"><div class="entry-name">Gigglegloom</div>'
    + '<div class="entry-body">' + esc(region.gigglegloom_notes) + '</div></div>'
    + '<div class="entry-card"><div class="entry-name">Color Health</div>'
    + '<div class="entry-tag">' + esc(region.color_health) + '</div>'
    + '<div class="entry-body">' + esc(region.tone) + '</div></div>';
  if (region.vareth_presence) {
    body += '<div class="entry-card"><div class="entry-name" style="color:#7a6a60;">Vareth Presence</div>'
      + '<div class="entry-body">' + esc(region.vareth_presence) + '</div></div>';
  }
  body += '</div>';

  // Nations
  if (rNations.length) {
    body += '<div class="region-section"><div class="region-heading">Nations</div><div class="entry-grid">';
    rNations.forEach(function(n) {
      var nVis = getVisibility(n);
      body += '<div class="entry-card" data-nav="nation/' + n.id + '" onclick="navigate(\'nation/' + n.id + '\')">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(n.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(n.government_type) + '</div>'
        + '<div class="entry-body">' + esc(n.summary) + '</div>'
        + (nVis === 'teaser' ? '<div class="entry-teaser-hint">✦ Not yet fully discovered</div>' : '')
        + '</div>';
    });
    body += '</div></div>';
  }

  // Key sites
  var sites = region.key_sites || [];
  if (sites.length) {
    body += '<div class="region-section"><div class="region-heading">Key Sites</div>'
      + '<ul class="region-site-list">';
    sites.forEach(function(s) { body += '<li>' + esc(s) + '</li>'; });
    body += '</ul></div>';
  }

  // Settlements — image-left card layout via cityCard()
  if (rCities.length) {
    body += '<div class="region-section"><div class="region-heading">Settlements</div>';
    rCities.forEach(function(c) { body += cityCard(c); });
    body += '</div>';
  }

  // Creatures
  if (rCreatures.length) {
    body += '<div class="region-section"><div class="region-heading">Creatures Found Here</div><div class="entry-grid">';
    rCreatures.forEach(function(c) {
      var cVis = getVisibility(c);
      var desc = cVis === 'teaser'
        ? (function() { var d = c.description || ''; var dot = d.search(/[.!?]/); return dot >= 0 ? d.slice(0, dot + 1) : d; })()
        : c.description;
      var cImgHtml = c.image
        ? '<img class="creature-card-image" src="' + esc(c.image) + '" alt="' + esc(c.name) + '">'
        : '<div class="creature-card-image-placeholder"><span>Illustration Reserved</span></div>';
      body += '<div class="entry-card" data-nav="creature/' + c.id + '" onclick="navigate(\'creature/' + c.id + '\')">'
        + cImgHtml
        + '<div class="entry-name"><span class="wiki-link">' + esc(c.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(creatureSubtitle(c)) + '</div>'
        + '<div class="entry-body">' + esc(desc) + '</div>'
        + (cVis === 'teaser' ? '<div class="entry-teaser-hint">✦ Not yet fully discovered</div>' : '')
        + '</div>';
    });
    body += '</div></div>';
  }

  var heroHtml = cfg.heroImg
    ? '<img src="' + esc(cfg.heroImg) + '" alt="' + esc(region.name) + '" class="region-hero">' : '';

    body += renderAssociatedCharacters(getAssociatedCharacters('regions', id));
  el.innerHTML = pageHeader('Region', region.name, cfg.subtitle || '')
    + '<div class="wiki-body">'
    + heroHtml
    + body
    + '</div>';
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

  // Visible — full render
  var nCities = cities.filter(function(c) {
    return c.nation === id && getVisibility(c) !== 'hidden';
  }).sort(function(a,b) { return a.name.localeCompare(b.name); });

  var factsHtml = [
    ['Region',         titleCase(nation.region)],
    ['Government',     nation.government_type],
    ['Gov. Body',      nation.government_body],
    ['Capital',        nation.capital],
    ['Magic Affinity', nation.gigglegloom_affinity],
    ['Color Health',   nation.color_health],
    ['Dimming',        nation.vareth_presence || 'None noted'],
  ].filter(function(r){ return r[1]; }).map(function(r) {
    return '<div class="nation-fact-row">'
      + '<div class="nation-fact-label">' + esc(r[0]) + '</div>'
      + '<div class="nation-fact-value">' + esc(r[1]) + '</div>'
      + '</div>';
  }).join('');

  var customsHtml = '';
  if (nation.customs && nation.customs.length) {
    customsHtml = '<div class="nation-section-heading">Customs</div>'
      + '<ul class="wiki-list">'
      + nation.customs.map(function(c) { return '<li>' + esc(c) + '</li>'; }).join('')
      + '</ul>';
  }

  var citiesHtml = '';
  if (nCities.length) {
    citiesHtml = '<div class="nation-section-heading">Cities & Settlements</div>'
      + '<div class="entry-grid">';
    nCities.forEach(function(c) {
      var cVis = getVisibility(c);
      citiesHtml += '<div class="entry-card" data-nav="city/' + c.id + '" onclick="navigate(\'city/' + c.id + '\')">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(c.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(c.type) + '</div>'
        + '<div class="entry-body">' + esc(c.summary || '') + '</div>'
        + (cVis === 'teaser' ? '<div class="entry-teaser-hint">✦ Not yet fully discovered</div>' : '')
        + '</div>';
    });
    citiesHtml += '</div>';
  }

  el.innerHTML = breadcrumb([
      { label: 'Regions', hash: 'region/' + nation.region },
      { label: titleCase(nation.region), hash: 'region/' + nation.region },
      { label: nation.name, hash: 'nation/' + id }
    ])
    + pageHeader(titleCase(nation.region) + ' · Nation', nation.name, nation.summary)
    + entryImage(nation.image, nation.name)
    + '<div class="nation-layout">'
    + '<div class="nation-body">'
    + '<p>' + esc(nation.culture) + '</p>'
    + (nation.beliefs ? '<div class="nation-section-heading">Beliefs</div><p>' + esc(nation.beliefs) + '</p>' : '')
    + customsHtml
    + (nation.gigglegloom_notes ? '<div class="nation-section-heading">Gigglegloom</div><p>' + esc(nation.gigglegloom_notes) + '</p>' : '')
    + (nation.threats ? '<div class="nation-section-heading">Threats & Shadows</div><p>' + esc(nation.threats) + '</p>' : '')
    + citiesHtml
    + '</div>'
    + '<div class="nation-facts">'
    + '<div class="nation-facts-title">⚑ Quick Facts</div>'
    + factsHtml
    + '</div></div>'
    + renderAssociatedCharacters(getAssociatedCharacters('nations', id));
}

function renderCity(id, el) {
  var cities  = typeof CITIES  !== 'undefined' ? CITIES  : [];
  var nations = typeof NATIONS !== 'undefined' ? NATIONS : [];
  var city    = null;
  for (var i = 0; i < cities.length; i++) { if (cities[i].id === id) { city = cities[i]; break; } }
  if (!city) { renderNotFound(el, 'city/' + id); return; }

  var vis = getVisibility(city);
  if (vis === 'hidden') { renderNotFound(el, 'city/' + id); return; }

  var nation = null;
  for (var j = 0; j < nations.length; j++) { if (nations[j].id === city.nation) { nation = nations[j]; break; } }

  if (vis === 'teaser') {
    el.innerHTML = breadcrumb([
        { label: titleCase(city.region), hash: 'region/' + city.region },
        { label: nation ? nation.name : titleCase(city.nation), hash: 'nation/' + city.nation },
        { label: city.name, hash: 'city/' + id }
      ])
      + pageHeader(titleCase(city.region) + ' · ' + titleCase(city.type), city.name, city.summary)
      + '<div class="wiki-body">'
      + entryImage(city.image, city.name)
      + '<p>' + esc(city.summary || '') + '</p>'
      + teaserFooter('settlement')
      + '</div>';
    return;
  }

  // Visible — full render
  var landmarksHtml = '';
  if (city.landmarks && city.landmarks.length) {
    landmarksHtml = '<div class="section-heading">Landmarks</div>'
      + city.landmarks.map(function(lm) {
        return '<div class="creature-entry">'
          + '<div class="creature-header"><div class="creature-name">' + esc(lm.name) + '</div></div>'
          + '<div class="creature-body">' + esc(lm.description) + '</div>'
          + '</div>';
      }).join('');
  }

  var factsHtml = [
    ['Type',     city.type],
    ['Nation',   nation ? nation.name : titleCase(city.nation)],
    ['Region',   titleCase(city.region)],
    ['Color',    city.color_health],
    ['Vareth',   city.vareth_presence || 'None noted'],
    ['Formery',  city.formery_present ? 'Yes — office present' : null]
  ].filter(function(r){ return r[1]; }).map(function(r) {
    return '<div class="nation-fact-row">'
      + '<div class="nation-fact-label">' + esc(r[0]) + '</div>'
      + '<div class="nation-fact-value">' + esc(r[1]) + '</div>'
      + '</div>';
  }).join('');

  el.innerHTML = breadcrumb([
      { label: titleCase(city.region), hash: 'region/' + city.region },
      { label: nation ? nation.name : titleCase(city.nation), hash: 'nation/' + city.nation },
      { label: city.name, hash: 'city/' + id }
    ])
    + pageHeader(titleCase(city.region) + ' · ' + titleCase(city.type), city.name, city.summary)
    + entryImage(city.image, city.name)
    + '<div class="nation-layout">'
    + '<div class="nation-body">'
    + '<p>' + esc(city.description || city.summary || '') + '</p>'
    + (city.strategic_importance ? '<div class="nation-section-heading">Strategic Importance</div><p>' + esc(city.strategic_importance) + '</p>' : '')
    + landmarksHtml
    + '</div>'
    + '<div class="nation-facts"><div class="nation-facts-title">⚑ Quick Facts</div>' + factsHtml + '</div>'
    + '</div>'
    + renderAssociatedCharacters(getAssociatedCharacters('cities', id));
}

function renderCreature(id, el) {
  var creatures = typeof CREATURES !== 'undefined' ? CREATURES : [];
  var creature  = null;
  for (var i = 0; i < creatures.length; i++) { if (creatures[i].id === id) { creature = creatures[i]; break; } }
  if (!creature) { renderNotFound(el, 'creature/' + id); return; }

  var vis = getVisibility(creature);
  if (vis === 'hidden') { renderNotFound(el, 'creature/' + id); return; }

  var tierLabel = titleCase(creature.tier || creature.category);

  if (vis === 'teaser') {
    var desc = creature.description || '';
    var dot  = desc.search(/[.!?]/);
    var firstSentence = dot >= 0 ? desc.slice(0, dot + 1) : desc;
    el.innerHTML = breadcrumb([
        { label: 'Creatures', hash: 'creature/' + id },
        { label: tierLabel, hash: 'creature/' + id },
        { label: creature.name, hash: 'creature/' + id }
      ])
      + pageHeader('Bestiary · ' + tierLabel, creature.name, creatureSubtitle(creature))
      + '<div class="wiki-body">'
      + entryImage(creature.image, creature.name, 'entry-hero-image--creature')
      + '<p>' + esc(firstSentence) + '</p>'
      + teaserFooter('creature')
      + '</div>';
    return;
  }

  // Visible — full render
  var dimmedHtml = '';
  if (creature.dimmed_version) {
    var dimmed = null;
    for (var j = 0; j < creatures.length; j++) {
      if (creatures[j].id === creature.dimmed_version) { dimmed = creatures[j]; break; }
    }
    if (dimmed) {
      dimmedHtml = '<div class="teaser-footer">Dimmed version: '
        + '<span class="wiki-link" onclick="navigate(\'creature/' + dimmed.id + '\')">' + esc(dimmed.name) + '</span>'
        + '</div>';
    }
  }

  var regionTagsHtml = (creature.regions || []).map(function(r) {
    return '<span style="margin-right:0.5rem;font-size:0.8rem;color:var(--amber);">' + titleCase(r) + '</span>';
  }).join('');

  el.innerHTML = breadcrumb([
      { label: 'Creatures', hash: 'creature/' + id },
      { label: tierLabel, hash: 'creature/' + id },
      { label: creature.name, hash: 'creature/' + id }
    ])
    + pageHeader('Bestiary · ' + tierLabel, creature.name, creatureSubtitle(creature))
    + '<div class="wiki-body">'
    + entryImage(creature.image, creature.name, 'entry-hero-image--creature')
    + (regionTagsHtml ? '<div style="margin-bottom:1rem;">' + regionTagsHtml + '</div>' : '')
    + '<p>' + esc(creature.description) + '</p>'
    + (creature.behavior ? '<div class="section-heading">Behavior</div><p>' + esc(creature.behavior) + '</p>' : '')
    + (creature.gigglegloom_relationship ? '<div class="section-heading">Gigglegloom Relationship</div><p>' + esc(creature.gigglegloom_relationship) + '</p>' : '')
    + dimmedHtml
    + '</div>';
}

function renderReligion(id, el) {
  var data = getReligionData(id);
  var religion = data.religion;
  if (!religion) { renderNotFound(el, 'religion/' + id); return; }

  var vis = getVisibility(religion);
  if (vis === 'hidden') { renderNotFound(el, 'religion/' + id); return; }

  // Teaser — name + summary only
  if (vis === 'teaser') {
    el.innerHTML = breadcrumb([{ label: 'Faiths', hash: 'religion/' + id }, { label: religion.name, hash: 'religion/' + id }])
      + pageHeader('Faith', religion.name, religion.summary)
      + '<div class="wiki-body"><p>' + esc(religion.summary || '') + '</p>' + teaserFooter('faith') + '</div>';
    return;
  }

  // Visible — full dynamic render
  var accentColor = religion.color || 'var(--gold)';

  // ── Gods section ──
  var godsHtml = '';
  if (data.gods && data.gods.length) {
    godsHtml = '<div class="section-heading">Gods</div><div class="entry-grid">';
    data.gods.forEach(function(g) {
      godsHtml += '<div class="entry-card" onclick="navigate(\'gods\')" style="cursor:pointer">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(g.name) + '</span></div>'
        + '<div class="entry-body">' + esc(g.player_knowledge || g.summary || '') + '</div>'
        + '</div>';
    });
    godsHtml += '</div>';
  }

  // ── Practices section ──
  var practicesHtml = '';
  if (religion.practices && religion.practices.length) {
    practicesHtml = '<div class="section-heading">Practices</div><ul class="wiki-list">'
      + religion.practices.map(function(p) { return '<li>' + esc(p) + '</li>'; }).join('')
      + '</ul>';
  }

  // ── Structure section ──
  var structureHtml = religion.structure
    ? '<div class="section-heading">Structure</div><p>' + esc(religion.structure) + '</p>'
    : '';

  // ── Holy Sites section ──
  var sitesHtml = '';
  if (data.holy_sites && data.holy_sites.length) {
    sitesHtml = '<div class="section-heading">Holy Sites</div><div class="entry-grid">';
    data.holy_sites.forEach(function(p) {
      sitesHtml += '<div class="entry-card" onclick="navigate(\'poi/' + esc(p.id) + '\')" style="cursor:pointer">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(p.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(titleCase(p.type || '')) + '</div>'
        + '<div class="entry-body">' + esc(p.summary || '') + '</div>'
        + '</div>';
    });
    sitesHtml += '</div>';
  }

  // ── Organizations section ──
  var orgsHtml = '';
  if (data.organizations && data.organizations.length) {
    orgsHtml = '<div class="section-heading">Associated Organizations</div><div class="entry-grid">';
    data.organizations.forEach(function(o) {
      orgsHtml += '<div class="entry-card" onclick="navigate(\'org/' + esc(o.id) + '\')" style="cursor:pointer">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(o.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(titleCase(o.type || '')) + '</div>'
        + '<div class="entry-body">' + esc(o.summary || '') + '</div>'
        + '</div>';
    });
    orgsHtml += '</div>';
  }

  // ── Nations section ──
  var nationsHtml = '';
  if (data.nations && data.nations.length) {
    nationsHtml = '<div class="section-heading">Nations of the Faith</div><div class="entry-grid">';
    data.nations.forEach(function(n) {
      nationsHtml += '<div class="entry-card" onclick="navigate(\'nation/' + esc(n.id) + '\')" style="cursor:pointer">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(n.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(titleCase(n.region || '')) + '</div>'
        + '<div class="entry-body">' + esc(n.summary || '') + '</div>'
        + '</div>';
    });
    nationsHtml += '</div>';
  }

  // ── Creatures section ──
  var creaturesHtml = '';
  if (data.creatures && data.creatures.length) {
    creaturesHtml = '<div class="section-heading">Sacred & Associated Creatures</div><div class="entry-grid">';
    data.creatures.forEach(function(c) {
      creaturesHtml += '<div class="entry-card" onclick="navigate(\'creature/' + esc(c.id) + '\')" style="cursor:pointer">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(c.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(creatureSubtitle(c)) + '</div>'
        + '<div class="entry-body">' + esc(c.description ? c.description.split('.')[0] + '.' : '') + '</div>'
        + '</div>';
    });
    creaturesHtml += '</div>';
  }

  // ── Facts sidebar ──
  var factsHtml = [
    ['Symbol',   religion.symbol],
    ['Deity',    data.gods.map(function(g){ return g.name; }).join(', ') || null],
    ['Spread',   (data.nations && data.nations.length) ? data.nations.length + ' nations' : null]
  ].filter(function(r){ return r[1]; }).map(function(r) {
    return '<div class="nation-fact-row">'
      + '<div class="nation-fact-label">' + esc(r[0]) + '</div>'
      + '<div class="nation-fact-value">' + esc(r[1]) + '</div>'
      + '</div>';
  }).join('');

  el.innerHTML = breadcrumb([{ label: 'Faiths', hash: 'religion/' + id }, { label: religion.name, hash: 'religion/' + id }])
    + pageHeader('Faith', religion.name, religion.summary)
    + '<div class="nation-layout">'
    + '<div class="nation-body">'
    + (religion.core_belief ? '<div class="nation-section-heading">Core Belief</div><p>' + esc(religion.core_belief) + '</p>' : '')
    + (religion.partition_account ? '<div class="nation-section-heading">The Partition — Their Account</div><p>' + esc(religion.partition_account) + '</p>' : '')
    + practicesHtml
    + structureHtml
    + (religion.relationship_to_gigglegloom ? '<div class="nation-section-heading">Relationship to the Gigglegloom</div><p>' + esc(religion.relationship_to_gigglegloom) + '</p>' : '')
    + (religion.relationship_to_vareth ? '<div class="nation-section-heading">Relationship to the Vareth</div><p>' + esc(religion.relationship_to_vareth) + '</p>' : '')
    + (religion.relationship_to_other_faiths ? '<div class="nation-section-heading">Other Faiths</div><p>' + esc(religion.relationship_to_other_faiths) + '</p>' : '')
    + godsHtml
    + sitesHtml
    + orgsHtml
    + nationsHtml
    + creaturesHtml
    + '</div>'
    + '<div class="nation-facts"><div class="nation-facts-title">⚑ Quick Facts</div>' + factsHtml + '</div>'
    + '</div>';
}

function renderOrg(id, el) {
  var orgs = typeof ORGANIZATIONS !== 'undefined' ? ORGANIZATIONS : [];
  var org  = null;
  for (var i = 0; i < orgs.length; i++) { if (orgs[i].id === id) { org = orgs[i]; break; } }
  if (!org) { renderNotFound(el, 'org/' + id); return; }

  var vis = getVisibility(org);
  if (vis === 'hidden') { renderNotFound(el, 'org/' + id); return; }

  var alignColor = org.alignment === 'dark' ? '#aa3a1a' : (org.alignment === 'light' ? '#2a7a3a' : '#7a5200');

  if (vis === 'teaser') {
    el.innerHTML = breadcrumb([
        { label: 'Organizations', hash: 'org/' + id },
        { label: org.name, hash: 'org/' + id }
      ])
      + pageHeader('Organization · <span style="color:' + alignColor + '">' + titleCase(org.alignment) + '</span>',
          org.name,
          (org.full_name && org.full_name !== org.name) ? org.full_name : titleCase(org.type))
      + '<div class="wiki-body">'
      + entryImage(org.image, org.name)
      + '<p>' + esc(org.summary) + '</p>'
      + teaserFooter('organization')
      + '</div>';
    return;
  }

  // Visible — full render
  var isFormery    = org.id === 'the-formery';
  var factsHtml = [
    ['Type',      titleCase(org.type)],
    ['Alignment', titleCase(org.alignment)],
    ['Age',       titleCase(org.age)],
    ['HQ',        org.headquarters]
  ].filter(function(r){ return r[1]; }).map(function(r) {
    return '<div class="nation-fact-row">'
      + '<div class="nation-fact-label">' + esc(r[0]) + '</div>'
      + '<div class="nation-fact-value">' + esc(r[1]) + '</div>'
      + '</div>';
  }).join('');

  var factsListHtml = '';
  if (org.notable_facts && org.notable_facts.length) {
    factsListHtml = '<div class="section-heading">Notable Facts</div>'
      + '<ul class="wiki-list">'
      + org.notable_facts.map(function(f) { return '<li>' + esc(f) + '</li>'; }).join('')
      + '</ul>';
  }

  var formeryStamp = isFormery
    ? '<div class="formery-stamp" style="margin:1rem 0;">FORM 1-A: RECEIVED… EVENTUALLY</div>' : '';

  el.innerHTML = breadcrumb([
      { label: 'Organizations', hash: 'org/' + id },
      { label: org.name, hash: 'org/' + id }
    ])
    + pageHeader('Organization · <span style="color:' + alignColor + '">' + titleCase(org.alignment) + '</span>',
        org.name,
        (org.full_name && org.full_name !== org.name) ? org.full_name : titleCase(org.type))
    + entryImage(org.image, org.name)
    + '<div class="nation-layout">'
    + '<div class="nation-body">'
    + formeryStamp
    + '<p>' + esc(org.summary) + '</p>'
    + (org.purpose ? '<div class="nation-section-heading">Purpose</div><p>' + esc(org.purpose) + '</p>' : '')
    + (org.public_perception ? '<div class="nation-section-heading">Public Perception</div><p>' + esc(org.public_perception) + '</p>' : '')
    + (org.gigglegloom_relationship ? '<div class="nation-section-heading">Gigglegloom</div><p>' + esc(org.gigglegloom_relationship) + '</p>' : '')
    + factsListHtml
    + '</div>'
    + '<div class="nation-facts"><div class="nation-facts-title">⚑ Quick Facts</div>' + factsHtml + '</div>'
    + '</div>'
    + renderAssociatedCharacters(getAssociatedCharacters('organizations', id));
}

function renderItem(id, el) {
  var items = typeof ITEMS !== 'undefined' ? ITEMS : [];
  var item  = null;
  for (var i = 0; i < items.length; i++) { if (items[i].id === id) { item = items[i]; break; } }
  if (!item) { renderNotFound(el, 'item/' + id); return; }

  var vis = getVisibility(item);
  if (vis === 'hidden') { renderNotFound(el, 'item/' + id); return; }

  if (vis === 'teaser') {
    el.innerHTML = pageHeader('Item · ' + titleCase(item.category || item.rarity), item.name, item.summary)
      + '<div class="wiki-body">'
      + entryImage(item.image, item.name)
      + '<p>' + esc(item.summary || '') + '</p>'
      + teaserFooter('item')
      + '</div>';
    return;
  }

  // Visible — full render
  el.innerHTML = pageHeader('Item · ' + titleCase(item.category || item.rarity), item.name, item.summary)
    + '<div class="wiki-body">'
    + entryImage(item.image, item.name)
    + '<p>' + esc(item.description || item.summary || '') + '</p>'
    + (item.gigglegloom_type ? '<p><strong>Gigglegloom Type:</strong> ' + esc(item.gigglegloom_type) + '</p>' : '')
    + '</div>';
}

function renderPOI(id, el) {
  var pois = typeof POIS !== 'undefined' ? POIS : [];
  var poi  = null;
  for (var i = 0; i < pois.length; i++) { if (pois[i].id === id) { poi = pois[i]; break; } }
  if (!poi) { renderNotFound(el, 'poi/' + id); return; }

  var vis = getVisibility(poi);
  if (vis === 'hidden') { renderNotFound(el, 'poi/' + id); return; }

  if (vis === 'teaser') {
    el.innerHTML = breadcrumb([
        { label: titleCase(poi.region || ''), hash: 'region/' + poi.region },
        { label: poi.name, hash: 'poi/' + id }
      ])
      + pageHeader('Point of Interest · ' + titleCase(poi.type || ''), poi.name, poi.summary)
      + '<div class="wiki-body">'
      + entryImage(poi.image, poi.name)
      + '<p>' + esc(poi.summary || '') + '</p>'
      + teaserFooter('location')
      + '</div>';
    return;
  }

  // Visible — full render
  el.innerHTML = breadcrumb([
      { label: titleCase(poi.region || ''), hash: 'region/' + poi.region },
      { label: poi.name, hash: 'poi/' + id }
    ])
    + pageHeader('Point of Interest · ' + titleCase(poi.type || ''), poi.name, poi.summary)
    + '<div class="wiki-body">'
    + entryImage(poi.image, poi.name)
    + '<p>' + esc(poi.description || poi.summary || '') + '</p>'
    + (poi.gigglegloom_notes ? '<p><em>' + esc(poi.gigglegloom_notes) + '</em></p>' : '')
    + renderAssociatedCharacters(getAssociatedCharacters('pois', id))
    + '</div>';
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
  if (!list || typeof SPELL_DATA === 'undefined') return;

  _sbFiltered = SPELL_DATA.filter(function(s) {
    if (_sbType !== 'all' && s.types.indexOf(_sbType) === -1) return false;
    if (_sbLvl  !== 'all' && String(s.level) !== String(_sbLvl)) return false;
    if (query && s.name.toLowerCase().indexOf(query) === -1 &&
        s.desc.toLowerCase().indexOf(query) === -1) return false;
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
  var flavorHtml = '<div class="spell-modal-flavor">"' + s.desc + '"</div>';

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
