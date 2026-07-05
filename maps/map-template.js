/* ══════════════════════════════════════════════════════════════════
   ANAVALE — maps/map-template.js
   Shared engine for all location maps.
   Handles: zoom/pan, popup system, Supabase fetch, DM/player gate,
   relationship badge, copy read aloud, time-of-day toggle.
   Each map HTML sets window.MAP_CONFIG before this script loads.
   MAP_CONFIG shape:
   {
     title:      string,
     subtitle:   string,
     supabaseUrl: string,
     anonKey:    string,
     wikiBase:   string,
     entities: [{
       id, type, label, category, wikiHash, description, dmOnly, playerFacing
     }]
   }
   PLAYER-SAFE COLUMNS only — never expose DM fields to players.
══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var TABLE = {
    character: 'world_characters',
    poi:       'pois',
    city:      'cities',
    org:       'organizations',
    creature:  'creatures'
  };
  var PLAYER_COLS = {
    character: 'id,name,summary,role,pronouns,status,location,affiliation,image,player_knowledge,read_aloud,player_facing',
    poi:       'id,name,summary,description,type,region,image,read_aloud,player_knowledge,player_facing',
    city:      'id,name,summary,description,type,region,image,read_aloud,player_facing',
    org:       'id,name,summary,description,org_type,image,player_facing',
    creature:  'id,name,summary,description,tier,habitat,image,player_facing'
  };
  var scale    = 1;
  var minScale = 0.3;
  var maxScale = 4;
  var offsetX  = 0;
  var offsetY  = 0;
  var dragging = false;
  var dragStart = { x: 0, y: 0 };
  var canvas, viewport, popupOverlay, popup;
  var currentEntityId = null;
  var IS_DM = false;
  var SESSION_NUM = null;
  var npcRelationships = {};
  document.addEventListener('DOMContentLoaded', function () {
    canvas       = document.getElementById('map-canvas');
    viewport     = document.getElementById('map-viewport');
    popupOverlay = document.getElementById('map-popup-overlay');
    popup        = document.getElementById('map-popup');
    if (!canvas || !viewport) { return; }
    var urlParams2 = new URLSearchParams(window.location.search);
    IS_DM = urlParams2.get('dm') === '1' || !!sessionStorage.getItem('anavale_dm');
    if (IS_DM) { document.body.classList.add('map-dm'); }
    var urlParams = new URLSearchParams(window.location.search);
    SESSION_NUM   = urlParams.get('session') ? parseInt(urlParams.get('session'), 10) : null;
    if (SESSION_NUM) {
      document.body.classList.add('map-session-' + SESSION_NUM);
      // Session badge removed from new nav — session state tracked via body class only
      if (IS_DM) { loadSessionRelationships(SESSION_NUM); }
    }
    centerMap();
    viewport.addEventListener('mousedown',  onDragStart);
    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('mousemove',  onDragMove);
    document.addEventListener('touchmove',  onTouchMove, { passive: false });
    document.addEventListener('mouseup',    onDragEnd);
    document.addEventListener('touchend',   onDragEnd);
    viewport.addEventListener('wheel',      onWheel, { passive: false });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePopup(); });
    var bd = document.getElementById('map-popup-backdrop');
    if (bd) bd.addEventListener('click', closePopup);
    document.querySelectorAll('[data-entity-id]').forEach(function (pin) {
      var eid = pin.getAttribute('data-entity-id');
      var entity = findEntity(eid);
      if (entity && entity.dmOnly && !IS_DM) {
        pin.style.display = 'none';
        return;
      }
      pin.setAttribute('tabindex', '0');
      pin.setAttribute('role', 'button');
      pin.setAttribute('aria-label', entity ? 'View details: ' + entity.label : eid);
      pin.addEventListener('click', function (e) {
        e.stopPropagation();
        openPopup(eid, pin);
      });
      pin.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPopup(eid, pin); }
      });
    });
    // Time of day radios
    document.querySelectorAll('.map-tod-radio').forEach(function (radio) {
      radio.addEventListener('click', function () {
        var tod = radio.getAttribute('data-tod');
        document.querySelectorAll('.map-tod-radio').forEach(function (r) { r.classList.remove('active'); });
        radio.classList.add('active');
        document.body.classList.remove('map-day', 'map-dusk', 'map-night');
        document.body.classList.add('map-' + tod);
      });
    });
    // DM View toggle
    var dmToggleBtn = document.getElementById('map-dm-toggle');
    if (dmToggleBtn) {
      // Reflect initial DM state on the toggle
      if (IS_DM) { dmToggleBtn.classList.remove('off'); } else { dmToggleBtn.classList.add('off'); }
      var dmTrackText = dmToggleBtn.querySelector('.map-dm-toggle-text');
      if (dmTrackText) { dmTrackText.textContent = IS_DM ? 'On' : 'Off'; }
      dmToggleBtn.addEventListener('click', function () {
        IS_DM = !IS_DM;
        if (IS_DM) {
          document.body.classList.add('map-dm');
          sessionStorage.setItem('anavale_dm', '1');
          dmToggleBtn.classList.remove('off');
          if (dmTrackText) { dmTrackText.textContent = 'On'; }
        } else {
          document.body.classList.remove('map-dm');
          sessionStorage.removeItem('anavale_dm');
          dmToggleBtn.classList.add('off');
          if (dmTrackText) { dmTrackText.textContent = 'Off'; }
        }
        // Re-evaluate pin visibility
        document.querySelectorAll('[data-entity-id]').forEach(function (pin) {
          var eid    = pin.getAttribute('data-entity-id');
          var entity = findEntity(eid);
          if (entity && entity.dmOnly) {
            pin.style.display = IS_DM ? '' : 'none';
          }
        });
      });
    }
    // Search input — filter pins by label
    var searchInput = document.getElementById('map-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var q = searchInput.value.trim().toLowerCase();
        document.querySelectorAll('[data-entity-id]').forEach(function (pin) {
          var eid    = pin.getAttribute('data-entity-id');
          var entity = findEntity(eid);
          if (!entity) return;
          if (entity.dmOnly && !IS_DM) return;
          var match = !q || entity.label.toLowerCase().indexOf(q) >= 0;
          pin.style.display = match ? '' : 'none';
        });
      });
    }
    // Filter dropdown — filter pins by entity type
    var filterSelect = document.getElementById('map-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', function () {
        var val = filterSelect.value;
        document.querySelectorAll('[data-entity-id]').forEach(function (pin) {
          var eid    = pin.getAttribute('data-entity-id');
          var entity = findEntity(eid);
          if (!entity) return;
          if (entity.dmOnly && !IS_DM) return;
          var match = val === 'all' || entity.type === val;
          pin.style.display = match ? '' : 'none';
        });
      });
    }
    var loading = document.getElementById('map-loading');
    if (loading) loading.style.display = 'none';
  });
  function findEntity(id) {
    var cfg = window.MAP_CONFIG;
    if (!cfg) return null;
    for (var i = 0; i < cfg.entities.length; i++) {
      if (cfg.entities[i].id === id) return cfg.entities[i];
    }
    return null;
  }
  function centerMap() {
    var svgEl = canvas.querySelector('svg');
    if (!svgEl) return;
    var svgW = parseInt(svgEl.getAttribute('width'))  || 900;
    var svgH = parseInt(svgEl.getAttribute('height')) || 700;
    var vW = viewport.offsetWidth;
    var vH = viewport.offsetHeight;
    var sx = (vW - 32) / svgW;
    var sy = (vH - 32) / svgH;
    scale   = Math.min(sx, sy, 1.1);
    scale   = Math.max(scale, minScale);
    offsetX = (vW - svgW * scale) / 2;
    offsetY = (vH - svgH * scale) / 2;
    applyTransform();
  }
  function applyTransform() {
    canvas.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + scale + ')';
  }
  function onDragStart(e) { dragging = true; dragStart = { x: e.clientX - offsetX, y: e.clientY - offsetY }; }
  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    dragging = true;
    dragStart = { x: e.touches[0].clientX - offsetX, y: e.touches[0].clientY - offsetY };
  }
  function onDragMove(e) {
    if (!dragging) return;
    offsetX = e.clientX - dragStart.x;
    offsetY = e.clientY - dragStart.y;
    applyTransform();
  }
  function onTouchMove(e) {
    if (!dragging || e.touches.length !== 1) return;
    e.preventDefault();
    offsetX = e.touches[0].clientX - dragStart.x;
    offsetY = e.touches[0].clientY - dragStart.y;
    applyTransform();
  }
  function onDragEnd() { dragging = false; }
  function onWheel(e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.11 : 0.9;
    var rect   = viewport.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
  }
  function zoomAt(mx, my, factor) {
    var ns  = Math.min(maxScale, Math.max(minScale, scale * factor));
    var r   = ns / scale;
    offsetX = mx - r * (mx - offsetX);
    offsetY = my - r * (my - offsetY);
    scale   = ns;
    applyTransform();
  }
  function zoomCenter(factor) { zoomAt(viewport.offsetWidth / 2, viewport.offsetHeight / 2, factor); }
  window.mapZoomIn  = function () { zoomCenter(1.25); };
  window.mapZoomOut = function () { zoomCenter(0.8); };
  window.mapReset   = centerMap;
  function loadSessionRelationships(sessionNum) {
    var cfg = window.MAP_CONFIG;
    if (!cfg) return;
    var url = cfg.supabaseUrl + '/rest/v1/session_notes'
            + '?session_number=eq.' + sessionNum
            + '&select=npc_relationships&limit=1';
    fetch(url, { headers: { 'apikey': cfg.anonKey, 'Authorization': 'Bearer ' + cfg.anonKey } })
    .then(function (r) { return r.json(); })
    .then(function (rows) {
      if (!rows || !rows.length || !rows[0].npc_relationships) return;
      try { npcRelationships = JSON.parse(rows[0].npc_relationships); } catch (e) { npcRelationships = {}; }
    })
    .catch(function () { npcRelationships = {}; });
  }
  function openPopup(entityId, pinEl) {
    var cfg    = window.MAP_CONFIG;
    var entity = findEntity(entityId);
    if (!entity || !cfg) return;
    currentEntityId = entityId;
    popup.querySelector('.map-popup-title').textContent  = entity.label;
    popup.querySelector('.map-popup-type').textContent   = entity.category || entity.type;
    popup.querySelector('.map-popup-hero-img').style.display      = 'none';
    popup.querySelector('.map-popup-hero-fallback').style.display = 'flex';
    popup.querySelector('.map-popup-hero-fallback').textContent   = entity.label ? entity.label.charAt(0).toUpperCase() : '?';
    popup.querySelector('.map-popup-badges').innerHTML  = '';
    popup.querySelector('.map-popup-body').innerHTML    = '<div class="map-popup-loading">Loading…</div>';
    positionPopup(pinEl);
    popupOverlay.classList.add('active');
    requestAnimationFrame(function () { popup.classList.add('visible'); });
    fetchEntity(entity, cfg);
  }
  function positionPopup(pinEl) {
    var vW  = window.innerWidth;
    var vH  = window.innerHeight;
    var pW  = 310;
    var pMH = Math.min(vH * 0.72, 480);
    var rect = pinEl ? pinEl.getBoundingClientRect() : { left: vW/2, top: vH/2, width: 0, height: 0 };
    var left = rect.right + 12;
    var top  = rect.top;
    if (left + pW  > vW - 12) left = Math.max(12, rect.left - pW - 12);
    if (top  + pMH > vH - 12) top  = Math.max(12, vH - pMH - 12);
    popup.style.left      = left + 'px';
    popup.style.top       = top  + 'px';
    popup.style.maxHeight = pMH  + 'px';
  }
  function closePopup() {
    popup.classList.remove('visible');
    setTimeout(function () { popupOverlay.classList.remove('active'); currentEntityId = null; }, 170);
  }
  window.mapClosePopup = closePopup;
  Object.defineProperty(window, 'MAP_IS_DM', { get: function () { return IS_DM; } });
  function fetchEntity(entity, cfg) {
    var table = TABLE[entity.type] || entity.type;
    var cols  = IS_DM ? '*' : (PLAYER_COLS[entity.type] || '*');
    var url   = cfg.supabaseUrl + '/rest/v1/' + table
              + '?id=eq.' + encodeURIComponent(entity.id)
              + '&select=' + cols + '&limit=1';
    fetch(url, {
      headers: { 'apikey': cfg.anonKey, 'Authorization': 'Bearer ' + cfg.anonKey, 'Content-Type': 'application/json' }
    })
    .then(function (r) { return r.json(); })
    .then(function (rows) {
      if (currentEntityId !== entity.id) return;
      if (!rows || !rows.length) { renderFallback(entity); return; }
      renderPopup(entity, rows[0], cfg);
    })
    .catch(function () { if (currentEntityId === entity.id) renderFallback(entity); });
  }
  function renderPopup(entity, row, cfg) {
    var imgEl = popup.querySelector('.map-popup-hero-img');
    var fbEl  = popup.querySelector('.map-popup-hero-fallback');
    if (row.image) {
      imgEl.src = row.image;
      imgEl.onload  = function () { imgEl.style.display = 'block'; fbEl.style.display = 'none'; };
      imgEl.onerror = function () { imgEl.style.display = 'none';  fbEl.style.display = 'flex'; };
      imgEl.style.display = 'block';
      fbEl.style.display  = 'none';
    } else {
      imgEl.style.display = 'none';
      fbEl.style.display  = 'flex';
      fbEl.textContent    = entity.label ? entity.label.charAt(0).toUpperCase() : '?';
    }
    var badgesEl = popup.querySelector('.map-popup-badges');
    badgesEl.innerHTML = '';
    if (IS_DM) {
      var rel = npcRelationships[entity.id];
      if (rel) {
        var relBadge = document.createElement('span');
        relBadge.className   = 'map-popup-badge map-badge-' + rel.toLowerCase();
        relBadge.textContent = rel.charAt(0).toUpperCase() + rel.slice(1);
        badgesEl.appendChild(relBadge);
      }
      var visLabel = row.player_facing === true ? 'Visible to Players' : 'DM Only';
      var visClass = row.player_facing === true ? 'map-badge-visible' : 'map-badge-dm-only';
      var visBadge = document.createElement('span');
      visBadge.className   = 'map-popup-badge ' + visClass;
      visBadge.textContent = visLabel;
      badgesEl.appendChild(visBadge);
    }
    var bodyEl  = popup.querySelector('.map-popup-body');
    var html    = '';
    var bodyText = IS_DM
      ? (row.summary || row.description || entity.description || '')
      : (row.player_knowledge || row.summary || row.description || entity.description || '');
    if (bodyText) html += '<p class="map-popup-summary">' + esc(bodyText) + '</p>';
    var facts = [];
    if (entity.type === 'character') {
      if (row.role)        facts.push(['Role',        row.role]);
      if (row.pronouns)    facts.push(['Pronouns',    row.pronouns]);
      if (row.status)      facts.push(['Status',      row.status]);
      if (row.location)    facts.push(['Location',    row.location]);
      if (row.affiliation) facts.push(['Affiliation', row.affiliation]);
    } else if (entity.type === 'poi') {
      if (row.type)   facts.push(['Type',   row.type]);
      if (row.region) facts.push(['Region', row.region]);
    } else if (entity.type === 'org') {
      if (row.org_type)                    facts.push(['Type',       row.org_type]);
      if (IS_DM && row.leadership)         facts.push(['Leadership', row.leadership]);
    } else if (entity.type === 'creature') {
      if (row.tier)    facts.push(['Tier',    row.tier]);
      if (row.habitat) facts.push(['Habitat', row.habitat]);
    }
    html += facts.map(function (f) {
      return '<div class="map-popup-fact-row">'
        + '<span class="map-popup-fact-label">' + esc(f[0]) + '</span>'
        + '<span class="map-popup-fact-value">' + esc(f[1]) + '</span>'
        + '</div>';
    }).join('');
    if (IS_DM) {
      [['Contradiction', row.contradiction], ['Secret', row.secret],
       ['Motivation', row.motivation], ['DM Notes', row.dm_notes],
       ['Gigglegloom', row.gigglegloom_relationship]].forEach(function (f) {
        if (f[1]) {
          html += '<div class="map-popup-dm-block">'
            + '<div class="map-popup-dm-label">' + esc(f[0]) + '</div>'
            + '<div class="map-popup-dm-text">'  + esc(f[1]) + '</div>'
            + '</div>';
        }
      });
    }
    if (IS_DM && row.read_aloud) {
      html += '<div class="map-popup-read-aloud-wrap">'
        + '<div class="map-popup-read-aloud-header">'
          + '<span class="map-popup-read-aloud-label">Read Aloud</span>'
          + '<button class="map-popup-copy-btn" onclick="mapCopyReadAloud(this)"'
          + ' data-text="' + escAttr(row.read_aloud) + '">Copy</button>'
        + '</div>'
        + '<div class="map-popup-read-aloud-text">' + esc(row.read_aloud) + '</div>'
        + '</div>';
    }
    if (entity.wikiHash && cfg.wikiBase) {
      html += '<a class="map-popup-wiki-link" href="'
        + esc(cfg.wikiBase) + '#' + esc(entity.wikiHash)
        + '" target="_blank">Open in Compendium &#8594;</a>';
    }
    bodyEl.innerHTML = html;
  }
  function renderFallback(entity) {
    var bodyEl = popup.querySelector('.map-popup-body');
    var html   = '';
    if (entity.description) html += '<p class="map-popup-summary">' + esc(entity.description) + '</p>';
    if (entity.wikiHash && window.MAP_CONFIG && window.MAP_CONFIG.wikiBase) {
      html += '<a class="map-popup-wiki-link" href="'
        + esc(window.MAP_CONFIG.wikiBase) + '#' + esc(entity.wikiHash)
        + '" target="_blank">Open in Compendium &#8594;</a>';
    }
    if (!html) html = '<div class="map-popup-loading">No data found.</div>';
    bodyEl.innerHTML = html;
  }
  window.mapCopyReadAloud = function (btn) {
    var text = btn.getAttribute('data-text');
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    }).catch(function () {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      btn.textContent = 'Copied!'; btn.classList.add('copied');
      setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    });
  };
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(s) {
    return String(s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
})();
