// ══ ROUTER — js/router.js ══════════════════════════════════════════════
// Hash-based routing for the Anavale Wiki.
// URL format: #section   or   #type/id
//   #home          → home page
//   #gigglegloom   → Gigglegloom page
//   #color         → Color & The Dimming
//   #gods          → Gods
//   #rumors        → Rumours
//   #spells        → Spellbook page
//   #calendar      → The Anavale Calendar (The Calendar / Weather tabs)
//   #weather       → Same page, opened on the Weather tab
//   #region/caparia        → Region page
//   #nation/solenmere      → Nation entry
//   #city/solenveil        → City entry
//   #creature/fluffets     → Creature entry
//   #org/the-formery       → Organization entry
//   #item/voidblush-vial   → Item entry
//   #poi/partition-scar    → POI entry
//   #religion/brightcreed  → Religion entry
// ======================================================================

function getHash() {
  return window.location.hash.replace(/^#/, '') || 'home';
}

function parseHash(hash) {
  var parts = hash.split('/');
  return { type: parts[0] || 'home', id: parts[1] || null };
}

function navigate(hash) {
  window.location.hash = hash;
}

function handleRoute() {
  var hash    = getHash();
  var parsed  = parseHash(hash);
  var el      = document.getElementById('wiki-content');
  if (!el) return;

  // Clear and render
  el.innerHTML = '';

  var type = parsed.type;
  var id   = parsed.id;

  if      (type === 'home')          renderHome(el);
  else if (type === 'gigglegloom')   renderGigglegloom(el);
  else if (type === 'color')         renderColor(el);
  else if (type === 'gods')          renderGods(el);
  else if (type === 'rumors')        renderRumors(el);
  else if (type === 'spells')        renderSpellsPage(el);
  else if (type === 'calendar')      renderCalendarPage(el, 'cal');
  else if (type === 'weather')       renderCalendarPage(el, 'wx');
  else if (type === 'region'  && id) renderRegion(id, el);
  else if (type === 'nation'  && id) renderNation(id, el);
  else if (type === 'city'    && id) renderCity(id, el);
  else if (type === 'creature'&& id) renderCreature(id, el);
  else if (type === 'org'     && id) renderOrg(id, el);
  else if (type === 'item'    && id) renderItem(id, el);
  else if (type === 'poi'     && id) renderPOI(id, el);
  else if (type === 'character'&& id) renderCharacter(id, el);
  else if (type === 'religion'&& id) renderReligion(id, el);
  else if (type === 'lore'    && id) renderLore(id, el);
  else if (type === 'species' && id) renderSpeciesPage(id, el);
  else                               renderNotFound(el, hash);

  window.scrollTo(0, 0);
  if (typeof closeMobileNav === 'function') closeMobileNav();
  updateSidebarActive(hash);
  addWikiLinks();
}

function updateSidebarActive(hash) {
  // Remove all active states
  document.querySelectorAll('.nav-link.active, .nav-accordion-header.active').forEach(function(el) {
    el.classList.remove('active');
  });

  // Mark matching link active
  document.querySelectorAll('.nav-link[data-hash]').forEach(function(el) {
    if (el.getAttribute('data-hash') === hash) el.classList.add('active');
  });
  document.querySelectorAll('.nav-accordion-header[data-hash]').forEach(function(el) {
    if (el.getAttribute('data-hash') === hash) el.classList.add('active');
  });

  // Auto-open parent accordion if nested item is active
  var activeLink = document.querySelector('[data-hash="' + hash + '"]');

  // Highlight only the section that holds the current page
  document.querySelectorAll('.nav-section-accordion-header.has-active').forEach(function(el) { el.classList.remove('has-active'); });
  var sec = activeLink && activeLink.closest ? activeLink.closest('.nav-section') : null;
  var secHdr = sec ? sec.querySelector('.nav-section-accordion-header') : null;
  if (secHdr) secHdr.classList.add('has-active');
  if (activeLink) {
    var parent = activeLink.parentElement;
    while (parent) {
      if (parent.classList.contains('nav-accordion-body')) {
        parent.classList.add('open');
        var hdr = parent.previousElementSibling;
        if (hdr && (hdr.classList.contains('nav-accordion-header') || hdr.classList.contains('nav-section-accordion-header'))) {
          hdr.classList.add('open');
          hdr.setAttribute('aria-expanded', 'true');
        }
      }
      parent = parent.parentElement;
    }
    // Keep the current page visible in the sidebar
    var sb = document.getElementById('wiki-sidebar');
    if (sb && activeLink.closest && activeLink.closest('#wiki-sidebar')) {
      var r = activeLink.getBoundingClientRect(), sr = sb.getBoundingClientRect();
      if (r.top < sr.top + 80 || r.bottom > sr.bottom - 40) sb.scrollTop += r.top - sr.top - sr.height / 3;
    }
  }
}

// ── Mobile drawer (index.html .mobile-bar) ──
function setMobileNav(open) {
  document.body.classList.toggle('nav-open', !!open);
  var btn = document.getElementById('mobile-nav-btn');
  if (btn) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
}
function toggleMobileNav() { setMobileNav(!document.body.classList.contains('nav-open')); }
function closeMobileNav() { setMobileNav(false); }
function openMobileSearch() {
  setMobileNav(true);
  var input = document.getElementById('wiki-search');
  if (input) setTimeout(function() { input.focus(); }, 250);
}
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeMobileNav(); });

// Wire up hashchange
window.addEventListener('hashchange', handleRoute);
