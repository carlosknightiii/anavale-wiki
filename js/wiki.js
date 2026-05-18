// ══ WIKI.JS — Anavale Wiki ═══════════════════════════════════════════════════
// Navigation, sidebar, renderers, search, wiki-links, spellbook.
// Requires: data/regions.js, nations.js, cities.js, creatures.js,
//           organizations.js, characters.js, pois.js, items.js, index.js
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
  el.innerHTML = pageHeader('Error', 'Page Not Found', null)
    + '<div class="wiki-body"><p>No entry found for: <em>' + esc(hash) + '</em>.</p>'
    + '<p>Use the navigation on the left to find what you are looking for.</p></div>';
}

// Render an optional entry image
function entryImage(src, alt) {
  if (!src) return '';
  return '<img src="' + esc(src) + '" alt="' + esc(alt || '') + '" class="entry-image">';
}

// Visibility badge (player_facing)
function visibilityBadge(entry) {
  if (entry && entry.player_facing === false) {
    return '<span class="entry-tag" style="color:#aa3a1a;">DM Only</span>';
  }
  return '';
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
  var creatures = typeof CREATURE_DATA  !== 'undefined' ? CREATURE_DATA  : [];
  var orgs      = typeof ORGANIZATION_DATA !== 'undefined' ? ORGANIZATION_DATA : [];
  var items     = typeof ITEMS          !== 'undefined' ? ITEMS          : [];
  var pois      = typeof POIS           !== 'undefined' ? POIS           : [];

  var html = '';

  // ── Introduction ──────────────────────────────────
  html += '<div class="nav-section">'
    + '<div class="nav-section-title">✦ Introduction</div>'
    + navLink('Welcome, Traveller', 'home', currentHash)
    + '</div>';

  // ── The World ──────────────────────────────────────
  html += '<div class="nav-section">'
    + '<div class="nav-section-title">✧ The World</div>'
    + navLink('The Gigglegloom', 'gigglegloom', currentHash)
    + navLink('Color & The Dimming', 'color', currentHash)
    + navLink('The Gods', 'gods', currentHash)
    + '</div>';

  // ── Regions (accordion per region → nations → cities) ──
  html += '<div class="nav-section">'
    + '<div class="nav-section-title">◈ Regions</div>';

  var regionOrder = ['caparia', 'nombi', 'sohot', 'jugabi'];
  regionOrder.forEach(function(rId) {
    var region = null;
    for (var i = 0; i < regions.length; i++) {
      if (regions[i].id === rId) { region = regions[i]; break; }
    }
    var rLabel = region ? region.name : titleCase(rId);
    var rNations = nations.filter(function(n) { return n.region === rId; })
      .sort(function(a,b) { return a.name.localeCompare(b.name); });

    var innerHtml = '<div class="nav-level-2">'
      + navLink('Overview', 'region/' + rId, currentHash);

    rNations.forEach(function(n) {
      var nCities = cities.filter(function(c) { return c.nation === n.id; })
        .sort(function(a,b) { return a.name.localeCompare(b.name); });

      if (nCities.length > 0) {
        var cityLinks = '';
        nCities.forEach(function(c) {
          cityLinks += '<div class="nav-level-4">'
            + navLink(c.name, 'city/' + c.id, currentHash)
            + '</div>';
        });
        innerHtml += '<div class="nav-level-3">'
          + makeAccordion('nation-' + n.id, n.name,
            navLink('Overview', 'nation/' + n.id, currentHash) + cityLinks)
          + '</div>';
      } else {
        innerHtml += '<div class="nav-level-3">'
          + navLink(n.name, 'nation/' + n.id, currentHash)
          + '</div>';
      }
    });

    innerHtml += '</div>';

    html += makeAccordion('region-' + rId, rLabel, innerHtml);
  });
  html += '</div>';

  // ── Creatures (accordion by tier group) ────────────
  var TIER_GROUPS = [
    { key: 'merry',      label: 'The Merry',      tiers: ['merry'] },
    { key: 'common',     label: 'Common',          tiers: ['common'] },
    { key: 'rare',       label: 'Rare',            tiers: ['rare'] },
    { key: 'sparked',    label: 'The Sparked',     tiers: ['sparked'] },
    { key: 'dimmed',     label: 'The Dimmed',      tiers: ['dimmed'] },
    { key: 'corrupted',  label: 'Corrupted',       tiers: ['corrupted'] },
    { key: 'ancient',    label: 'Ancient & Mythic',tiers: ['ancient', 'unseen', 'unknown'] },
    { key: 'regional',   label: 'Region-Exclusive',tiers: ['region-exclusive'] }
  ];

  html += '<div class="nav-section"><div class="nav-section-title">✿ Creatures</div>';
  var creatureInner = '';
  TIER_GROUPS.forEach(function(grp) {
    var grpCreatures = creatures.filter(function(c) {
      return grp.tiers.indexOf(c.tier) >= 0 && c.player_facing !== false;
    }).sort(function(a,b) { return a.name.localeCompare(b.name); });
    if (!grpCreatures.length) return;
    var links = grpCreatures.map(function(c) {
      return '<div class="nav-level-3">' + navLink(c.name, 'creature/' + c.id, currentHash) + '</div>';
    }).join('');
    creatureInner += '<div class="nav-level-2">'
      + makeAccordion('tier-' + grp.key, grp.label, links)
      + '</div>';
  });
  html += makeAccordion('creatures', 'All Creatures', creatureInner);
  html += '</div>';

  // ── Organizations ──────────────────────────────────
  var ORG_CATS = [
    { key: 'light',   label: 'Forces of Light' },
    { key: 'neutral', label: 'Neutral Powers'  },
    { key: 'dark',    label: 'Shadow Forces'   }
  ];

  html += '<div class="nav-section"><div class="nav-section-title">⚑ Society</div>';
  var orgInner = '';
  ORG_CATS.forEach(function(cat) {
    var catOrgs = orgs.filter(function(o) { return o.alignment === cat.key; })
      .sort(function(a,b) { return a.name.localeCompare(b.name); });
    if (!catOrgs.length) return;
    var links = catOrgs.map(function(o) {
      return '<div class="nav-level-3">' + navLink(o.name, 'org/' + o.id, currentHash) + '</div>';
    }).join('');
    orgInner += '<div class="nav-level-2">'
      + makeAccordion('org-' + cat.key, cat.label, links)
      + '</div>';
  });
  html += makeAccordion('organizations', 'Organizations', orgInner);

  // Items (if any)
  if (items.length) {
    var itemLinks = items.slice().sort(function(a,b) { return a.name.localeCompare(b.name); })
      .map(function(it) {
        return '<div class="nav-level-2">' + navLink(it.name, 'item/' + it.id, currentHash) + '</div>';
      }).join('');
    html += makeAccordion('items', 'Notable Items', itemLinks);
  }

  // POIs (if any)
  if (pois.length) {
    var poiLinks = pois.slice().sort(function(a,b) { return a.name.localeCompare(b.name); })
      .map(function(p) {
        return '<div class="nav-level-2">' + navLink(p.name, 'poi/' + p.id, currentHash) + '</div>';
      }).join('');
    html += makeAccordion('pois', 'Points of Interest', poiLinks);
  }

  html += navLink('Rumours & Hearsay', 'rumors', currentHash);
  html += '</div>';

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
  var creatures = typeof CREATURE_DATA  !== 'undefined' ? CREATURE_DATA  : [];
  var orgs      = typeof ORGANIZATION_DATA !== 'undefined' ? ORGANIZATION_DATA : [];
  var chars     = typeof CHARACTER_DATA !== 'undefined' ? CHARACTER_DATA : [];
  var items     = typeof ITEMS          !== 'undefined' ? ITEMS          : [];
  var pois      = typeof POIS           !== 'undefined' ? POIS           : [];

  regions.forEach(function(r)   { allData.push({ hash: 'region/' + r.id,   title: r.name, text: r.name + ' ' + (r.summary||'') + ' ' + (r.tone||'') }); });
  nations.forEach(function(n)   { allData.push({ hash: 'nation/' + n.id,   title: n.name, text: n.name + ' ' + (n.summary||'') + ' ' + (n.culture||'') + ' ' + (n.beliefs||'') }); });
  cities.forEach(function(c)    { allData.push({ hash: 'city/' + c.id,     title: c.name, text: c.name + ' ' + (c.summary||'') + ' ' + (c.description||'') }); });
  creatures.forEach(function(c) { allData.push({ hash: 'creature/' + c.id, title: c.name, text: c.name + ' ' + (c.description||'') + ' ' + (c.behavior||'') + ' ' + (c.tags||[]).join(' ') }); });
  orgs.forEach(function(o)      { allData.push({ hash: 'org/' + o.id,      title: o.name, text: o.name + ' ' + (o.summary||'') + ' ' + (o.purpose||'') + ' ' + (o.tags||[]).join(' ') }); });
  chars.forEach(function(c)     { allData.push({ hash: 'gods',             title: c.name, text: c.name + ' ' + (c.summary||'') + ' ' + (c.player_knowledge||'') }); });
  items.forEach(function(it)    { allData.push({ hash: 'item/' + it.id,    title: it.name, text: it.name + ' ' + (it.summary||'') + ' ' + (it.description||'') }); });
  pois.forEach(function(p)      { allData.push({ hash: 'poi/' + p.id,      title: p.name, text: p.name + ' ' + (p.summary||'') + ' ' + (p.description||'') }); });

  // Static pages
  [
    { hash: 'home',        title: 'Welcome, Traveller', text: 'welcome home introduction anavale pogglewog' },
    { hash: 'gigglegloom', title: 'The Gigglegloom',    text: 'gigglegloom magic bubbleseed featherflow steelfist flamerage prior conclave' },
    { hash: 'color',       title: 'Color & The Dimming',text: 'color dimming fading stage grey vareth quietude' },
    { hash: 'gods',        title: 'The Gods',           text: 'gods oro nara thyun solvara grak partition brightcreed stillkeep veilborn' },
    { hash: 'rumors',      title: 'Rumours & Hearsay',  text: 'rumors hearsay rumours' },
    { hash: 'spells',      title: 'Spellbook',          text: 'spells spellbook gigglegloom cast' }
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
      _searchResults.push({ hash: entry.hash, title: entry.title, excerpt: excerpt });
    }
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
  var creatures = typeof CREATURE_DATA  !== 'undefined' ? CREATURE_DATA  : [];
  var orgs      = typeof ORGANIZATION_DATA !== 'undefined' ? ORGANIZATION_DATA : [];
  var items     = typeof ITEMS          !== 'undefined' ? ITEMS          : [];

  nations.forEach(function(n) {
    _wikiLinkMap.push({ term: n.name, hash: 'nation/' + n.id });
    if (n.full_name && n.full_name !== n.name) {
      _wikiLinkMap.push({ term: n.full_name, hash: 'nation/' + n.id });
    }
  });

  cities.forEach(function(c) {
    _wikiLinkMap.push({ term: c.name, hash: 'city/' + c.id });
  });

  creatures.filter(function(c) { return c.player_facing !== false; }).forEach(function(c) {
    _wikiLinkMap.push({ term: c.name, hash: 'creature/' + c.id });
  });

  orgs.forEach(function(o) {
    _wikiLinkMap.push({ term: o.name, hash: 'org/' + o.id });
    if (o.full_name && o.full_name !== o.name) {
      _wikiLinkMap.push({ term: o.full_name, hash: 'org/' + o.id });
    }
  });

  items.forEach(function(it) {
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
    { term: 'Brightcreed',      hash: 'gods' },
    { term: 'Stillkeep',        hash: 'gods' },
    { term: 'Veilborn',         hash: 'gods' },
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

  el.querySelectorAll('.wiki-body p, .creature-body, .entry-body, .rumor-text, .warning-body, .creature-note, .pull-quote, .nation-body p, .acc-body p, .acc-body li, .teaser-footer').forEach(function(container) {
    walkTextNodes(container, termMap, re);
  });
}

function walkTextNodes(container, termMap, re) {
  var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  var nodes  = [];
  var n;
  while ((n = walker.nextNode())) nodes.push(n);

  nodes.forEach(function(textNode) {
    re.lastIndex = 0;
    if (!re.test(textNode.textContent)) return;
    re.lastIndex = 0;

    var text = textNode.textContent;
    var frag = document.createDocumentFragment();
    var last = 0;
    var match;

    while ((match = re.exec(text)) !== null) {
      if (match.index > last) frag.appendChild(document.createTextNode(text.slice(last, match.index)));
      var matched = match[0];
      var entry   = termMap[matched.toLowerCase()];
      if (entry) {
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
    heroImg: null
  },
  sohot: {
    subtitle: 'The blazing south of Pogglewog',
    quote: '"The desert keeps everything. Memory, color, grief. The heat does not destroy — it preserves. This is why Sohot has not forgotten anything."',
    quoteAttrib: '— Auvari Remnance oral history',
    heroImg: null
  },
  jugabi: {
    subtitle: 'The ancient jungle southwest of Pogglewog',
    quote: '"The canopy is not above you. You are inside the forest. The forest has been here longer than anyone and is aware of you specifically."',
    quoteAttrib: '— Verdathi elder, speaking to a Kalori Republic delegation',
    heroImg: null
  }
};

function renderHome(el) {
  el.innerHTML = pageHeader('Introduction', 'Welcome, Traveller',
    'A practical guide to the continent of Pogglewog and the wider world of Anavale')
    + '<div class="wiki-body">'
    + '<p>You are reading the <em>Anavale Traveller\'s Compendium</em> — a collection of observations, records, and accumulated wisdom gathered by scholars, wanderers, merchants, and at least one extremely well-travelled tortoise. It is not complete. It is not official. It is, however, honest, which is more than can be said for several of the Formery\'s pamphlets.</p>'
    + '<p>Anavale is a world that rewards attention. Pay attention to the color of things. Pay attention to the creatures. Pay attention when the Bumble Frogs go quiet — they are almost never quiet, and when they are, something has happened or is about to.</p>'
    + '<div class="pull-quote">"The world is full of color and it wants to stay that way. Assist it where you can."<cite>— Common Brightcreed greeting, Caparia</cite></div>'
    + '<p>This compendium is organized into sections covering the world\'s magic, its regions, its creatures, its organizations, and a final section of rumours that the editorial committee insists on including despite ongoing disagreement about their accuracy.</p>'
    + '<p>Use the navigation on the left to explore. Begin wherever your curiosity takes you. That is, after all, very much in the spirit of Anavale.</p>'
    + '<div class="ornament">✦ &nbsp; ✦ &nbsp; ✦</div>'
    + '<p><strong>A note on navigation:</strong> Throughout this compendium, important terms are <span class="wiki-link" style="cursor:default;">underlined and bold</span> and may be clicked to navigate directly to the relevant entry. In Anavale, everything is connected. This compendium tries to reflect that.</p>'
    + '</div>';
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
  var chars    = typeof CHARACTER_DATA !== 'undefined' ? CHARACTER_DATA : [];
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

function renderRegion(id, el) {
  var regions   = typeof REGIONS        !== 'undefined' ? REGIONS        : [];
  var nations   = typeof NATIONS        !== 'undefined' ? NATIONS        : [];
  var cities    = typeof CITIES         !== 'undefined' ? CITIES         : [];
  var creatures = typeof CREATURE_DATA  !== 'undefined' ? CREATURE_DATA  : [];

  var region = null;
  for (var i = 0; i < regions.length; i++) { if (regions[i].id === id) { region = regions[i]; break; } }
  if (!region) { renderNotFound(el, 'region/' + id); return; }

  var cfg        = REGION_CONFIG[id] || {};
  var rNations   = nations.filter(function(n) { return n.region === id; });
  var rCities    = cities.filter(function(c) { return c.region === id; });
  var rCreatures = creatures.filter(function(c) {
    return c.player_facing !== false && Array.isArray(c.regions) && c.regions.indexOf(id) >= 0;
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
      body += '<div class="entry-card" data-nav="nation/' + n.id + '" onclick="navigate(\'nation/' + n.id + '\')">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(n.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(n.government_type) + '</div>'
        + '<div class="entry-body">' + esc(n.summary) + '</div>'
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

  // Settlements
  if (rCities.length) {
    body += '<div class="region-section"><div class="region-heading">Settlements</div><div class="entry-grid">';
    rCities.forEach(function(c) {
      body += '<div class="entry-card" data-nav="city/' + c.id + '" onclick="navigate(\'city/' + c.id + '\')">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(c.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(c.type) + '</div>'
        + '<div class="entry-body">' + esc(c.summary || c.description || '') + '</div>'
        + '</div>';
    });
    body += '</div></div>';
  }

  // Creatures
  if (rCreatures.length) {
    body += '<div class="region-section"><div class="region-heading">Creatures Found Here</div><div class="entry-grid">';
    rCreatures.forEach(function(c) {
      body += '<div class="entry-card" data-nav="creature/' + c.id + '" onclick="navigate(\'creature/' + c.id + '\')">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(c.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(creatureSubtitle(c)) + '</div>'
        + '<div class="entry-body">' + esc(c.description) + '</div>'
        + '</div>';
    });
    body += '</div></div>';
  }

  var heroHtml = cfg.heroImg
    ? '<img src="' + esc(cfg.heroImg) + '" alt="' + esc(region.name) + '" class="region-hero">' : '';

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

  var nCities = cities.filter(function(c) { return c.nation === id; })
    .sort(function(a,b) { return a.name.localeCompare(b.name); });

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
      citiesHtml += '<div class="entry-card" data-nav="city/' + c.id + '" onclick="navigate(\'city/' + c.id + '\')">'
        + '<div class="entry-name"><span class="wiki-link">' + esc(c.name) + '</span></div>'
        + '<div class="entry-tag">' + esc(c.type) + '</div>'
        + '<div class="entry-body">' + esc(c.summary || '') + '</div>'
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
    + '</div></div>';
}

function renderCity(id, el) {
  var cities  = typeof CITIES  !== 'undefined' ? CITIES  : [];
  var nations = typeof NATIONS !== 'undefined' ? NATIONS : [];
  var city    = null;
  for (var i = 0; i < cities.length; i++) { if (cities[i].id === id) { city = cities[i]; break; } }
  if (!city) { renderNotFound(el, 'city/' + id); return; }

  var nation = null;
  for (var j = 0; j < nations.length; j++) { if (nations[j].id === city.nation) { nation = nations[j]; break; } }

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
    + '<div class="nation-layout">'
    + '<div class="nation-body">'
    + '<p>' + esc(city.description || city.summary || '') + '</p>'
    + (city.strategic_importance ? '<div class="nation-section-heading">Strategic Importance</div><p>' + esc(city.strategic_importance) + '</p>' : '')
    + landmarksHtml
    + '</div>'
    + '<div class="nation-facts"><div class="nation-facts-title">⚑ Quick Facts</div>' + factsHtml + '</div>'
    + '</div>';
}

function renderCreature(id, el) {
  var creatures = typeof CREATURE_DATA !== 'undefined' ? CREATURE_DATA : [];
  var creature  = null;
  for (var i = 0; i < creatures.length; i++) { if (creatures[i].id === id) { creature = creatures[i]; break; } }
  if (!creature) { renderNotFound(el, 'creature/' + id); return; }

  var tierLabel = titleCase(creature.tier || creature.category);
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
    + entryImage(creature.image, creature.name)
    + (regionTagsHtml ? '<div style="margin-bottom:1rem;">' + regionTagsHtml + '</div>' : '')
    + '<p>' + esc(creature.description) + '</p>'
    + (creature.behavior ? '<div class="section-heading">Behavior</div><p>' + esc(creature.behavior) + '</p>' : '')
    + (creature.gigglegloom_relationship ? '<div class="section-heading">Gigglegloom Relationship</div><p>' + esc(creature.gigglegloom_relationship) + '</p>' : '')
    + dimmedHtml
    + '</div>';
}

function renderOrg(id, el) {
  var orgs = typeof ORGANIZATION_DATA !== 'undefined' ? ORGANIZATION_DATA : [];
  var org  = null;
  for (var i = 0; i < orgs.length; i++) { if (orgs[i].id === id) { org = orgs[i]; break; } }
  if (!org) { renderNotFound(el, 'org/' + id); return; }

  var isFormery    = org.id === 'the-formery';
  var alignColor   = org.alignment === 'dark' ? '#aa3a1a' : (org.alignment === 'light' ? '#2a7a3a' : '#7a5200');
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
    + '</div>';
}

function renderItem(id, el) {
  var items = typeof ITEMS !== 'undefined' ? ITEMS : [];
  var item  = null;
  for (var i = 0; i < items.length; i++) { if (items[i].id === id) { item = items[i]; break; } }
  if (!item) { renderNotFound(el, 'item/' + id); return; }

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

  el.innerHTML = breadcrumb([
      { label: titleCase(poi.region || ''), hash: 'region/' + poi.region },
      { label: poi.name, hash: 'poi/' + id }
    ])
    + pageHeader('Point of Interest · ' + titleCase(poi.type || ''), poi.name, poi.summary)
    + '<div class="wiki-body">'
    + entryImage(poi.image, poi.name)
    + '<p>' + esc(poi.description || poi.summary || '') + '</p>'
    + (poi.gigglegloom_notes ? '<p><em>' + esc(poi.gigglegloom_notes) + '</em></p>' : '')
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
