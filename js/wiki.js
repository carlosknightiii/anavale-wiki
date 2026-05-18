// ══ NAVIGATION ══
function show(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Auto-expand Caparia nations block when a nation page is shown
  var capBlock = document.getElementById('nav-caparia-block');
  if (capBlock) {
    if (id.startsWith('nation-')) { capBlock.classList.add('open'); }
  }
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) { page.classList.add('active'); window.scrollTo(0, 0); }
  document.querySelectorAll('.nav-link').forEach(l => {
    const oc = l.getAttribute('onclick') || '';
    if (oc === "show('" + id + "')") l.classList.add('active');
  });
  clearPageHighlights();
  if (typeof PAGE_RENDERERS !== 'undefined' && PAGE_RENDERERS[id]) { PAGE_RENDERERS[id](); }
}

// Navigate to a page AND scroll to the first element containing `term`.
function showAndScrollToTerm(pageId, term) {
  show(pageId);
  setTimeout(function() {
    const page = document.getElementById('page-' + pageId);
    if (!page) return;
    const needle = term.toLowerCase().replace(/^the /i, '');
    const headings = page.querySelectorAll('.creature-name, .entry-name, .region-heading, .page-title');
    for (const h of headings) {
      if (h.textContent.toLowerCase().includes(needle)) {
        const block = h.closest('.creature-entry, .entry-card, .region-section') || h;
        block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.toLowerCase().includes(needle)) {
        node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  }, 60);
}

// ══ SEARCH ══
let searchIndex = null;
let _searchResults = [];

function buildSearchIndex() {
  searchIndex = {};
  document.querySelectorAll('.page').forEach(function(page) {
    const id = page.id.replace('page-', '');
    const titleEl = page.querySelector('.page-title');
    searchIndex[id] = { title: titleEl ? titleEl.textContent : id, text: page.textContent };
  });
}

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function doSearch(query) {
  if (!searchIndex) buildSearchIndex();
  const q = query.trim();
  if (!q) { closeSearch(); return; }
  const ql = q.toLowerCase();
  _searchResults = [];
  Object.entries(searchIndex).forEach(function(kv) {
    const id = kv[0], data = kv[1];
    const lower = data.text.toLowerCase();
    const pos = lower.indexOf(ql);
    if (pos !== -1) {
      const start = Math.max(0, pos - 70);
      const end   = Math.min(data.text.length, pos + ql.length + 70);
      let excerpt  = data.text.slice(start, end).replace(/\s+/g, ' ').trim();
      if (start > 0) excerpt = '\u2026' + excerpt;
      if (end < data.text.length) excerpt += '\u2026';
      const re = new RegExp('(' + escapeRe(q) + ')', 'gi');
      excerpt = excerpt.replace(re, '<mark>$1</mark>');
      _searchResults.push({ id: id, title: data.title, excerpt: excerpt });
    }
  });
  renderSearchResults();
}

function renderSearchResults() {
  const container = document.getElementById('search-results');
  if (!_searchResults.length) {
    container.innerHTML = '<div class="search-no-results">No pages found.</div>';
  } else {
    container.innerHTML = _searchResults.map(function(r, i) {
      return '<button class="search-result" onclick="navigateToResult(' + i + ')">'
           + '<div class="search-result-title">' + r.title + '</div>'
           + '<div class="search-result-excerpt">' + r.excerpt + '</div>'
           + '</button>';
    }).join('');
  }
  container.style.display = 'block';
}

function navigateToResult(idx) {
  const r = _searchResults[idx];
  if (!r) return;
  const query = document.getElementById('wiki-search').value.trim();
  show(r.id);
  document.getElementById('wiki-search').value = query;
  setTimeout(function() {
    highlightPageTerms(r.id, query);
    document.getElementById('search-results').style.display = 'block';
  }, 60);
}

function closeSearch() {
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('wiki-search').value = '';
  _searchResults = [];
}

document.addEventListener('click', function(e) {
  const container = document.getElementById('search-results');
  const input = document.getElementById('wiki-search');
  if (container && !container.contains(e.target) && e.target !== input) {
    container.style.display = 'none';
  }
});

// ══ HIGHLIGHT ══
function highlightPageTerms(pageId, query) {
  clearPageHighlights();
  if (!query) return;
  const page = document.getElementById('page-' + pageId);
  if (!page) return;
  const re = new RegExp('(' + escapeRe(query) + ')', 'gi');
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, {
    acceptNode: function(node) {
      const el = node.parentElement;
      if (el.closest('.page-title, .page-category')) return NodeFilter.FILTER_REJECT;
      if (el.classList.contains('search-highlight')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) {
    re.lastIndex = 0;
    if (re.test(n.textContent)) nodes.push(n);
  }
  nodes.forEach(function(textNode) {
    re.lastIndex = 0;
    const parts = textNode.textContent.split(re);
    if (parts.length === 1) return;
    const frag = document.createDocumentFragment();
    parts.forEach(function(part) {
      re.lastIndex = 0;
      if (re.test(part)) {
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = part;
        frag.appendChild(mark);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });
    textNode.parentNode.replaceChild(frag, textNode);
  });
  const first = page.querySelector('.search-highlight');
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearPageHighlights() {
  document.querySelectorAll('.search-highlight').forEach(function(mark) {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
  });
}

// ══ WIKI LINKS ══
const WIKI_LINK_MAP = [
  { terms: ['Gigglegloom Conclave'], page: 'gigglegloom' },
  { terms: ['the Wanderkeep', 'the Kindpact', 'the Prism Exchange', 'the Formery', 'the Nimblewood', 'the Revel', 'Chromeguard', 'Wanderkeep', 'Kindpact', 'Prism Exchange', 'Formery', 'Nimblewood', 'Voidblush'], page: 'organizations' },
  { terms: ['Bubbleseed', 'Featherflow', 'Steelfist', 'Flamerage', 'Gigglegloom'], page: 'gigglegloom' },
  { terms: ['the Dimming', 'the Fading', 'Dimming', 'Fading', 'Dimmed'], page: 'color' },
  { terms: ['the Partition', 'Partition'], page: 'gods' },
  { terms: ['Brightcreed', 'Stillkeep', 'Veilborn'], page: 'gods' },
  { terms: ['Caparia'], page: 'caparia' },
  { terms: ['Nombi'], page: 'nombi' },
  { terms: ['Sohot'], page: 'sohot' },
  { terms: ['Jugabi'], page: 'jugabi' },
  { terms: ['Bumble Frogs', 'Bumble Frog', 'Bounce Beetles', 'Bounce Beetle', 'Fluffets', 'Fluffet', 'Tinywings', 'Tinywing', 'Pocketmoles', 'Pocketmole', 'Sparklings', 'Sparkling'], page: 'creatures-common' },
  { terms: ['Hollowmoths', 'Hollowmoth', 'Mirrorwolves', 'Mirrorwolf', 'Loomhares', 'Loomhare', 'The Unseen'], page: 'creatures-rare' },
  { terms: ['Oro', 'Nara', 'Thyun', 'Solvara', 'Grak'], page: 'gods' },
  { terms: ['The Solenmere', 'Solenmere', 'Caldenric Accord', 'Mirrenflow', 'Solenveil', 'Color Reader', 'Color Readers'], page: 'nation-solenmere' },
  { terms: ['The Bunari', 'Bunari', 'Mirrenport', 'Shimmer Shoals', 'Harbor Master'], page: 'nation-bunari' },
  { terms: ['The Zippan', 'Zippan', 'Bumbleton', 'Craft Challenge'], page: 'nation-zippan' },
  { terms: ['The Dingurei', 'Dingurei', 'Partition Scar', 'Assembly of Scribes'], page: 'nation-dingurei' },
  { terms: ['The Janiveth', 'Janiveth', 'Winter Count'], page: 'nation-janiveth' },
  { terms: ['The Opuri', 'Opuri', 'Patient One', 'Mosswhisper Grove', 'Council of Listeners', 'Mosskin'], page: 'nation-opuri' },
];

function addWikiLinks() {
  document.querySelectorAll('.page').forEach(function(page) {
    const pageId = page.id.replace('page-', '');
    const termMap = {};
    WIKI_LINK_MAP.forEach(function(entry) {
      if (entry.page === pageId) return;
      entry.terms.forEach(function(t) {
        const key = t.toLowerCase();
        if (!termMap[key]) termMap[key] = { term: t, page: entry.page };
      });
    });
    const sorted = Object.values(termMap).sort(function(a, b) { return b.term.length - a.term.length; });
    if (!sorted.length) return;
    const pattern = sorted.map(function(e) { return escapeRe(e.term); }).join('|');
    const re = new RegExp('(' + pattern + ')', 'g');
    page.querySelectorAll('.wiki-body p, .creature-body, .entry-body, .rumor-text, .warning-body, .creature-note, .pull-quote, .nation-body p, .nation-tagline, .acc-body p, .acc-body li').forEach(function(container) {
      applyWikiLinks(container, termMap, re);
    });
  });
}

function applyWikiLinks(container, termMap, re) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(function(textNode) {
    re.lastIndex = 0;
    if (!re.test(textNode.textContent)) return;
    re.lastIndex = 0;
    const text = textNode.textContent;
    const frag = document.createDocumentFragment();
    let last = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
      if (match.index > last) frag.appendChild(document.createTextNode(text.slice(last, match.index)));
      const matched = match[0];
      const entry   = termMap[matched.toLowerCase()];
      if (entry) {
        const span = document.createElement('span');
        span.className = 'wiki-link';
        span.textContent = matched;
        span.title = 'Go to: ' + entry.page.replace(/-/g, ' ');
        (function(p, t) { span.addEventListener('click', function() { showAndScrollToTerm(p, t); }); })(entry.page, matched);
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


// ══ RENDERERS ══

// ── Static config per region ──────────────────────────────────────────────
var REGION_CONFIG = {
  caparia: {
    subtitle: 'The central heartlands of Pogglewog',
    quote: '"In Caparia, color maintenance is not pride. It is law. The fine for a faded storefront is modest. The social consequences are not."',
    quoteAttrib: '— A Bunari merchant, describing Solenveil',
    heroImg: 'assets/images/regions/img-caparia-landscape.png',
    nationDetailPages: ['solenmere', 'bunari', 'zippan', 'dingurei', 'janiveth', 'opuri']
  },
  nombi: {
    subtitle: 'The frozen north of Pogglewog',
    quote: '"The aurora does not rise in Nombi. It arrives. There is a difference, and the difference is the Gigglegloom."',
    quoteAttrib: '— Solvanu color journal, transcribed before burning',
    heroImg: null,
    nationDetailPages: []
  },
  sohot: {
    subtitle: 'The blazing south of Pogglewog',
    quote: '"The desert keeps everything. Memory, color, grief. The heat does not destroy — it preserves. This is why Sohot has not forgotten anything."',
    quoteAttrib: '— Auvari Remnance oral history',
    heroImg: null,
    nationDetailPages: []
  },
  jugabi: {
    subtitle: 'The ancient jungle southwest of Pogglewog',
    quote: '"The canopy is not above you. You are inside the forest. The forest has been here longer than anyone and is aware of you specifically."',
    quoteAttrib: '— Verdathi elder, speaking to a Kalori Republic delegation',
    heroImg: null,
    nationDetailPages: []
  }
};

// ── Gigglegloom type card data ─────────────────────────────────────────────
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

// ── Per-god static display data ───────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function creatureSubtitle(c) {
  if (!c) return '';
  var h = (c.habitat || '').split(' — ')[0].split(',')[0];
  if (h.length > 60) h = h.slice(0, 57) + '…';
  return (c.tier ? c.tier.charAt(0).toUpperCase() + c.tier.slice(1) : '')
       + (h ? ' · ' + h : '');
}

function titleCase(str) {
  return (str || '').replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

// ── Gigglegloom type-cards renderer ──────────────────────────────────────

function renderGigglegloomPage() {
  var grid = document.getElementById('gigglegloom-types-grid');
  if (!grid) return;
  var html = '';
  GIGGLEGLOOM_TYPES.forEach(function(t) {
    html += '<div class="entry-card">'
          + '<div class="entry-name" style="color:' + t.color + ';">'
          + '<img src="' + esc(t.icon) + '" class="giggle-icon" alt=""> '
          + esc(t.name) + '</div>'
          + '<div class="entry-tag">' + t.tag + '</div>'
          + '<div class="entry-body">' + esc(t.body) + '</div>'
          + '</div>';
  });
  grid.innerHTML = html;
}

// ── Gods-entries renderer ─────────────────────────────────────────────────

function renderGodsPage() {
  var wrapper = document.getElementById('gods-entries');
  if (!wrapper) return;
  var godOrder = ['oro', 'nara', 'thyun', 'solvara', 'grak'];
  var chars    = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA : [];
  var html     = '';
  godOrder.forEach(function(godId) {
    var c = null;
    for (var i = 0; i < chars.length; i++) { if (chars[i].id === godId) { c = chars[i]; break; } }
    if (!c) return;
    var m = GODS_META[godId] || {};
    html += '<div class="creature-entry">'
          + '<div class="creature-header">'
          + '<div class="creature-name" style="color:' + (m.color || '') + ';">' + esc(c.name) + '</div>'
          + '<div class="creature-latin">' + esc(m.domain) + '</div>'
          + '</div>'
          + '<div class="creature-body">' + esc(c.player_knowledge) + '</div>'
          + '<div class="creature-note">' + esc(m.note) + '</div>'
          + '</div>';
  });
  wrapper.innerHTML = html;
}

// ── Region page renderer ──────────────────────────────────────────────────

function renderRegionPage(regionId) {
  var page = document.getElementById('page-' + regionId);
  if (!page) return;
  var regions  = typeof REGIONS        !== 'undefined' ? REGIONS        : [];
  var region   = null;
  for (var i = 0; i < regions.length; i++) { if (regions[i].id === regionId) { region = regions[i]; break; } }
  if (!region) return;
  var cfg = REGION_CONFIG[regionId] || {};

  var nations   = (typeof NATIONS       !== 'undefined' ? NATIONS       : []).filter(function(n) { return n.region === regionId; });
  var cities    = (typeof CITIES        !== 'undefined' ? CITIES        : []).filter(function(c) { return c.region === regionId; });
  var creatures = (typeof CREATURE_DATA !== 'undefined' ? CREATURE_DATA : []).filter(function(c) {
    return c.player_facing !== false && Array.isArray(c.regions) && c.regions.indexOf(regionId) >= 0;
  });

  var body = '';

  // Intro paragraph
  body += '<p>' + esc(region.summary) + '</p>';

  // Pull quote
  if (cfg.quote) {
    body += '<div class="pull-quote">' + cfg.quote
          + ' <cite>' + esc(cfg.quoteAttrib) + '</cite></div>';
  }

  // At-a-glance info cards
  body += '<div class="entry-grid">';
  body += '<div class="entry-card"><div class="entry-name">Gigglegloom</div>'
        + '<div class="entry-body">' + esc(region.gigglegloom_notes) + '</div></div>';
  body += '<div class="entry-card"><div class="entry-name">Color Health</div>'
        + '<div class="entry-tag">' + esc(region.color_health) + '</div>'
        + '<div class="entry-body">' + esc(region.tone) + '</div></div>';
  if (region.vareth_presence) {
    body += '<div class="entry-card"><div class="entry-name" style="color:#7a6a60;">Vareth Presence</div>'
          + '<div class="entry-body">' + esc(region.vareth_presence) + '</div></div>';
  }
  body += '</div>';

  // Nations section
  if (nations.length) {
    body += '<div class="region-section"><div class="region-heading">Nations</div>'
          + '<div class="entry-grid">';
    nations.forEach(function(n) {
      var hasPage = cfg.nationDetailPages && cfg.nationDetailPages.indexOf(n.id) >= 0;
      var nameEl  = hasPage
        ? '<div class="entry-name"><span class="wiki-link" onclick="show(\'nation-' + n.id + '\')" '
          + 'title="Go to nation page">' + esc(n.name) + '</span></div>'
        : '<div class="entry-name">' + esc(n.name) + '</div>';
      body += '<div class="entry-card">' + nameEl
            + '<div class="entry-tag">' + esc(n.government_type) + '</div>'
            + '<div class="entry-body">' + esc(n.summary) + '</div>'
            + '</div>';
    });
    body += '</div></div>';
  }

  // Key Sites section
  var sites = region.key_sites || [];
  if (sites.length) {
    body += '<div class="region-section"><div class="region-heading">Key Sites</div>'
          + '<ul class="region-site-list">';
    sites.forEach(function(s) { body += '<li>' + esc(s) + '</li>'; });
    body += '</ul></div>';
  }

  // Settlements section
  if (cities.length) {
    body += '<div class="region-section"><div class="region-heading">Settlements</div>'
          + '<div class="entry-grid">';
    cities.forEach(function(c) {
      body += '<div class="entry-card">'
            + '<div class="entry-name">' + esc(c.name) + '</div>'
            + '<div class="entry-tag">' + esc(c.type) + '</div>'
            + '<div class="entry-body">' + esc(c.summary || c.description || '') + '</div>'
            + '</div>';
    });
    body += '</div></div>';
  }

  // Creatures section
  if (creatures.length) {
    body += '<div class="region-section"><div class="region-heading">Creatures Found Here</div>'
          + '<div class="entry-grid">';
    creatures.forEach(function(c) {
      body += '<div class="entry-card">'
            + '<div class="entry-name">' + esc(c.name) + '</div>'
            + '<div class="entry-tag">' + esc(creatureSubtitle(c)) + '</div>'
            + '<div class="entry-body">' + esc(c.description) + '</div>'
            + '</div>';
    });
    body += '</div></div>';
  }

  // Hero image
  var heroHtml = cfg.heroImg
    ? '<img src="' + esc(cfg.heroImg) + '" alt="' + esc(region.name) + '" class="region-hero">' : '';

  page.innerHTML =
    '<div class="page-header">'
    + '<div class="page-category">Region</div>'
    + '<h1 class="page-title">' + esc(region.name) + '</h1>'
    + '<p class="page-subtitle">' + esc(cfg.subtitle || '') + '</p>'
    + '</div>'
    + '<div class="wiki-body">'
    + heroHtml
    + body
    + '</div>';
}

// ── Creatures page renderer ───────────────────────────────────────────────

function renderCreaturesPage(tier) {
  var pageId = 'creatures-' + tier;
  var page   = document.getElementById('page-' + pageId);
  if (!page) return;

  var COMMON_TIERS = ['merry', 'common'];
  var RARE_TIERS   = ['dimmed', 'sparked', 'unseen', 'ancient', 'rare', 'unknown', 'corrupted'];
  var allCreatures = typeof CREATURE_DATA !== 'undefined' ? CREATURE_DATA : [];

  var creatures = allCreatures.filter(function(c) {
    var allowed   = tier === 'common' ? COMMON_TIERS : RARE_TIERS;
    var okTier    = allowed.indexOf(c.tier) >= 0;
    // The Unseen is player_facing:false but shown on the rare page by design
    var okFacing  = tier === 'rare'
      ? (c.player_facing !== false || c.id === 'the-unseen')
      : c.player_facing !== false;
    return okTier && okFacing;
  });

  var isCommon  = tier === 'common';
  var title     = isCommon ? 'Common Creatures'   : 'Rare & Mysterious';
  var subtitle  = isCommon
    ? 'Those you are likely to meet on any given afternoon'
    : 'Those you may meet once, or never, or in dreams';
  var introText = isCommon
    ? 'Anavale’s creatures are everywhere, and they are paying attention to you. This is not threatening. It is, in fact, rather wonderful once you get used to it. The following entries cover creatures a traveller on Pogglewog will encounter regularly.'
    : 'Anavale contains things that resist easy categorization. The following entries are compiled from eyewitness accounts, Stillkeep records, Brightcreed theological texts, and one extremely detailed letter written to the Chroma Bureau that the Bureau declined to respond to.';

  var entriesHtml = '';
  creatures.forEach(function(c) {
    var bodyText = c.description + (c.behavior ? ' ' + c.behavior : '');
    var noteText = c.gigglegloom_relationship || '';
    entriesHtml += '<div class="creature-entry">'
                + '<div class="creature-header">'
                + '<div class="creature-name">' + esc(c.name) + '</div>'
                + '<div class="creature-latin">' + esc(creatureSubtitle(c)) + '</div>'
                + '</div>'
                + '<div class="creature-body">' + esc(bodyText) + '</div>'
                + (noteText ? '<div class="creature-note">' + esc(noteText) + '</div>' : '')
                + '</div>';
  });

  page.innerHTML =
    '<div class="page-header">'
    + '<div class="page-category">Bestiary</div>'
    + '<h1 class="page-title">' + esc(title) + '</h1>'
    + '<p class="page-subtitle">' + esc(subtitle) + '</p>'
    + '</div>'
    + '<div class="wiki-body">'
    + '<p>' + esc(introText) + '</p>'
    + entriesHtml
    + '</div>';
}

// ── Organizations page renderer ───────────────────────────────────────────

function renderOrganizationsPage() {
  var page = document.getElementById('page-organizations');
  if (!page) return;

  var orgs = (typeof ORGANIZATION_DATA !== 'undefined' ? ORGANIZATION_DATA : []).filter(function(o) {
    return o.alignment !== 'dark';
  });

  var entriesHtml = '';
  orgs.forEach(function(o) {
    var isFormery  = o.id === 'the-formery';
    var latinLabel = (o.full_name && o.full_name !== o.name) ? o.full_name : titleCase(o.type);
    var firstFact  = (o.notable_facts && o.notable_facts.length) ? o.notable_facts[0] : '';
    entriesHtml += '<div class="creature-entry">'
                + '<div class="creature-header">'
                + '<div class="creature-name">' + esc(o.name) + '</div>'
                + '<div class="creature-latin">' + esc(latinLabel) + '</div>'
                + (isFormery ? '<div class="formery-stamp">FORM 1-A: RECEIVED… EVENTUALLY</div>' : '')
                + '</div>'
                + '<div class="creature-body">' + esc(o.summary) + '</div>'
                + (firstFact ? '<div class="creature-note">' + esc(firstFact) + '</div>' : '')
                + '</div>';
  });

  page.innerHTML =
    '<div class="page-header">'
    + '<div class="page-category">Society</div>'
    + '<h1 class="page-title">Notable Organizations</h1>'
    + '<p class="page-subtitle">Guilds, institutions, and groups worth knowing about</p>'
    + '</div>'
    + '<div class="wiki-body">'
    + entriesHtml
    + '</div>';
}

// ── Page renderer dispatch map ────────────────────────────────────────────
var PAGE_RENDERERS = {
  gigglegloom:         renderGigglegloomPage,
  gods:                renderGodsPage,
  caparia:             function() { renderRegionPage('caparia'); },
  nombi:               function() { renderRegionPage('nombi'); },
  sohot:               function() { renderRegionPage('sohot'); },
  jugabi:              function() { renderRegionPage('jugabi'); },
  'creatures-common':  function() { renderCreaturesPage('common'); },
  'creatures-rare':    function() { renderCreaturesPage('rare'); },
  organizations:       renderOrganizationsPage
};

// ══ INIT ══


  // ── Spellbook ────────────────────────────────────────────────────
  var _sbType     = 'all';
  var _sbLvl      = 'all';
  var _sbPage     = 1;
  var _sbPageSize = 9999;
  var _sbFiltered = [];

  function renderSpells() {
    var query = (document.getElementById('sb-search').value || '').toLowerCase();
    var list  = document.getElementById('sb-list');
    var count = document.getElementById('sb-count');
    var pager = document.getElementById('sb-pagination');
    if (!list || typeof SPELL_DATA === 'undefined') return;

    // Filter + sort alphabetically
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

    // Spell cards
    var html = '';
    pageData.forEach(function(s, i) {
      var globalIdx = start + i;
      var lvlLabel  = s.level === 0 ? 'Cantrip' : 'Lv ' + s.level;
      var pType     = s.types.length > 1 ? 'multi' : (s.types[0] || 'Freeweave');
      var icon      = TYPE_ICONS[s.types[0]] || '\u2726';
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

    // Pagination controls
    if (pages <= 1) { pager.innerHTML = ''; return; }
    var pHtml = '';
    pHtml += '<button class="sb-page-btn" onclick="sbGoPage(' + (_sbPage-1) + ')"'
          +  (_sbPage === 1 ? ' disabled' : '') + '>&#8592; Prev</button>';

    // Show page number buttons — window of 5 around current page
    var lo = Math.max(1, _sbPage - 2);
    var hi = Math.min(pages, _sbPage + 2);
    if (lo > 1)     pHtml += '<span class="sb-page-info">1 …</span>';
    for (var p = lo; p <= hi; p++) {
      pHtml += '<button class="sb-page-btn' + (p === _sbPage ? ' active' : '') + '" onclick="sbGoPage(' + p + ')">' + p + '</button>';
    }
    if (hi < pages) pHtml += '<span class="sb-page-info">… ' + pages + '</span>';

    pHtml += '<button class="sb-page-btn" onclick="sbGoPage(' + (_sbPage+1) + ')"'
          +  (_sbPage === pages ? ' disabled' : '') + '>Next &#8594;</button>';
    pager.innerHTML = pHtml;
  }

  function sbGoPage(n) {
    _sbPage = n;
    renderSpells();
    // Scroll to top of spellbook section
    var el = document.getElementById('sb-search');
    if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function initSpellbook() {
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
    // Reset page on search
    document.getElementById('sb-search').addEventListener('input', function() { _sbPage = 1; });
    renderSpells();
  }

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

  function openSpellModal(idx) {
    var s = _sbFiltered[idx];
    if (!s) return;
    var lvlLabel = s.level === 0 ? 'Cantrip' : (s.level === 1 ? '1st' : s.level === 2 ? '2nd' : s.level === 3 ? '3rd' : s.level + 'th') + '-level';
    var st = (window.SPELL_STATS && SPELL_STATS[s.name]) || null;

    // Type + level badges
    var typeBadges = s.types.map(function(t) {
      var ico = TYPE_ICONS[t] ? TYPE_ICONS[t].replace('sc-tab-svg','sm-badge-icon') : ''; return '<span class="sm-type-badge ' + t + '">' + ico + ' ' + t + '</span>';
    }).join('');
    typeBadges += '<span class="sm-lvl-badge">' + lvlLabel + (s.level === 0 ? '' : ' Spell') + '</span>';
    if (st && st.ritual) typeBadges += '<span class="sm-lvl-badge">Ritual</span>';
    if (st && st.conc)   typeBadges += '<span class="sm-lvl-badge">Concentration</span>';

    // School line
    var school = st ? st.school : (s.types.map(function(t){
      return {Bubbleseed:'Conjuration',Featherflow:'Transmutation',Steelfist:'Abjuration',Flamerage:'Evocation',Freeweave:'Illusion'}[t] || '';
    }).join(' / '));

    // Stats grid
    var statsHtml = '';
    if (st) {
      var statsData = [
        ['Casting Time', st.ct], ['Range', st.range],
        ['Components',   st.comp], ['Duration', st.dur]
      ];
      statsData.forEach(function(row) {
        statsHtml += '<div class="sm-stat"><div class="sm-stat-label">' + row[0] + '</div><div class="sm-stat-value">' + row[1] + '</div></div>';
      });
    }

    // Description
    var descHtml = st ? '<div class="spell-modal-desc">' + st.desc + '</div>' : '';
    var higherHtml = (st && st.higher) ? '<div class="spell-modal-higher"><strong>Using a Higher-Level Spell Slot.</strong> ' + st.higher + '</div>' : '';
    var flavorHtml = '<div class="spell-modal-flavor">“' + s.desc + '”</div>';

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

document.addEventListener('DOMContentLoaded', function() {
  // Populate all dynamically-rendered pages before search indexing
  Object.keys(PAGE_RENDERERS).forEach(function(id) { PAGE_RENDERERS[id](); });
  addWikiLinks();
  buildSearchIndex();
  initSpellbook();
});
