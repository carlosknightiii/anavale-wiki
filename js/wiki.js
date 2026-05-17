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
      html += '<div class="spell-card">'
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
           +    '<button class="sc-read-more" onclick="openSpellModal(' + globalIdx + ')">Read more →</button>'
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
  addWikiLinks();
  buildSearchIndex();
  initSpellbook();
});
