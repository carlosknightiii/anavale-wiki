// ══ DM TOOLS CALENDAR — js/dm-calendar.js ═══════════════════════════════
// ANV-43, DM Tools (dm.html) only. Three pieces, all backed by the single
// campaign_clock row (id=1, `minutes` since Janufrost 1, 312 AA 00:00,
// `region` = region id used for temperatures):
//   1. DmClock      the pinned time-of-day bar at the top of the Field Guide
//   2. scenario cards  optional card.duration_minutes, "They do this" ->
//                   confirm -> Advance / Keep the time -> Undo
//   3. calendar panel  the Calendar entry in the Field Guide quick-actions
//                   drawer (sidebar rail), reading world_concepts
//                   'anavale-calendar'
// Depends on dm.html globals: sccFetch, sccPatch, showDMToast,
// SCC_VIEWING_HISTORY, SCC_FG_DOC_CACHE, sccFgActiveSessionNum,
// sccFgFindScenarioCardsBlockByDomId, sccFgSwitchScenarioCard,
// sccFgRedrawScenarioCardsBlock. Nothing here moves the clock except an
// explicit control press (slider release, Add, or Advance on a card).
(function(root) {
  'use strict';
  var Cal = root.AnavaleCal;
  var esc = Cal.esc;
  var DEFAULT_MINUTES = 189 * 1440 + 11 * 60; // Frogday, Julisun 9, 11:00 AM
  var CLOCK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>';
  var CHECK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>';

  function locked() { return typeof root.SCC_VIEWING_HISTORY !== 'undefined' && !!root.SCC_VIEWING_HISTORY; }
  function toast(msg, kind) { if (typeof root.showDMToast === 'function') root.showDMToast(msg, kind || 'error'); }

  // ═══ 1. Clock + time bar ═══════════════════════════════════════════
  var S = { minutes: null, region: 'caparia', loading: null, subs: [], chain: Promise.resolve(), dragMin: null };
  var Clock = {};
  root.DmClock = Clock;

  Clock.minutes = function() { return S.minutes == null ? DEFAULT_MINUTES : S.minutes; };
  Clock.region = function() { return S.region || 'caparia'; };
  Clock.loaded = function() { return S.minutes != null; };
  Clock.subscribe = function(fn) { S.subs.push(fn); };
  function notify() { S.subs.forEach(function(fn) { try { fn(); } catch (e) {} }); }

  // Reads campaign_clock and the calendar concept once; safe to call often.
  Clock.ensure = function() {
    if (S.loading) return S.loading;
    S.loading = Promise.all([
      root.sccFetch('campaign_clock', '&id=eq.1'),
      Cal.loadConcept(root.sccFetch)
    ]).then(function(res) {
      var row = Array.isArray(res[0]) && res[0][0];
      if (row && typeof row.minutes === 'number') {
        S.minutes = row.minutes;
        if (row.region) S.region = row.region;
      } else {
        throw new Error('no campaign_clock row');
      }
      updateBar(); notify();
    }).catch(function() {
      S.loading = null;
      setStatus('Could not read the clock', true);
    });
    return S.loading;
  };

  // Every write goes through one promise chain so two quick changes can
  // never land out of order (see CLAUDE.md on the relationship-badge race).
  Clock.set = function(mins) {
    mins = Math.max(0, Math.round(mins));
    S.minutes = mins;
    updateBar(); notify();
    S.chain = S.chain.then(function() {
      return root.sccPatch('campaign_clock', '?id=eq.1', { minutes: mins, updated_at: new Date().toISOString() });
    }).then(function(r) {
      if (!r.ok) { setStatus('Could not save the time', true); toast('Could not save the time'); } else setStatus('', false);
    }).catch(function() { setStatus('Could not save the time', true); toast('Could not save the time'); });
    return S.chain;
  };

  var barEls = null;
  function setStatus(msg, isErr) {
    if (!barEls) return;
    barEls.status.textContent = msg;
    barEls.status.classList.toggle('tb-status--err', !!isErr);
  }

  function buildBar() {
    var host = document.getElementById('scc-time-bar');
    if (!host || host.getAttribute('data-built')) return;
    host.setAttribute('data-built', '1');
    host.innerHTML =
      '<div class="tb-bar tb-bar--night" id="tb-bar"><div class="tb-track">'
      + '<div class="tb-line"></div><div class="tb-tick tb-tick--6"></div><div class="tb-tick tb-tick--12"></div><div class="tb-tick tb-tick--18"></div>'
      + '<div class="tb-icon" id="tb-icon"><span class="tb-icon-inner" id="tb-icon-inner"></span></div>'
      + '<input type="range" class="tb-slider" id="tb-slider" min="0" max="1430" step="10" value="0" aria-label="Time of day, drag to change">'
      + '</div></div>'
      + '<div class="tb-info"><div class="tb-info-left"><span class="tb-period" id="tb-period"></span><span class="tb-clock" id="tb-clock"></span><span id="tb-date"></span><span class="tb-temp" id="tb-temp"></span><span class="tb-status" id="tb-status" role="status"></span></div>'
      + '<div class="tb-add"><span class="tb-add-label">Add</span>'
      + '<label><input type="number" class="tb-num tb-num--d" id="tb-add-d" value="0" step="1" aria-label="Days to add">days</label>'
      + '<label><input type="number" class="tb-num tb-num--h" id="tb-add-h" value="1" step="0.25" aria-label="Hours to add">hours</label>'
      + '<button type="button" class="tb-btn" id="tb-add-btn">Add</button></div></div>';
    barEls = {
      host: host, bar: host.querySelector('#tb-bar'), icon: host.querySelector('#tb-icon'), inner: host.querySelector('#tb-icon-inner'),
      slider: host.querySelector('#tb-slider'), period: host.querySelector('#tb-period'), clock: host.querySelector('#tb-clock'),
      date: host.querySelector('#tb-date'), temp: host.querySelector('#tb-temp'), status: host.querySelector('#tb-status'),
      d: host.querySelector('#tb-add-d'), h: host.querySelector('#tb-add-h'), btn: host.querySelector('#tb-add-btn')
    };
    // Dragging previews live; releasing writes (same day, 10-minute steps).
    barEls.slider.addEventListener('input', function() {
      var p = Cal.parts(Clock.minutes());
      S.dragMin = p.day * 1440 + Number(barEls.slider.value);
      barEls.icon.classList.add('tb-dragging');
      paint(S.dragMin);
    });
    barEls.slider.addEventListener('change', function() {
      var p = Cal.parts(Clock.minutes());
      var next = p.day * 1440 + Number(barEls.slider.value);
      S.dragMin = null;
      barEls.icon.classList.remove('tb-dragging');
      if (locked()) { paint(Clock.minutes()); return; }
      Clock.set(next);
    });
    barEls.btn.addEventListener('click', function() {
      if (locked()) { toast('This session is locked for audit, the clock can’t change here'); return; }
      var d = Number(barEls.d.value) || 0, h = Number(barEls.h.value) || 0;
      Clock.set(Clock.minutes() + Math.round(d * 1440 + h * 60));
    });
    updateBar();
  }

  function paint(mins) {
    if (!barEls) return;
    var p = Cal.parts(mins);
    var per = Cal.periods[p.periodIdx];
    barEls.bar.className = 'tb-bar tb-bar--' + per.key;
    barEls.icon.style.left = 'calc(' + (p.minOfDay / 1440 * 100) + '% - 17px)';
    barEls.inner.innerHTML = Cal.periodIconSvg(p.periodIdx);
    barEls.period.textContent = per.name;
    barEls.clock.textContent = Cal.clockStr(p.minOfDay);
    barEls.date.textContent = Cal.dateStr(p);
    var t = Cal.tempAt(Clock.region(), p.monthIdx, p.hour);
    barEls.temp.textContent = t + '°F, ' + Cal.tempWord(t);
    if (S.dragMin == null) barEls.slider.value = String(Math.min(1430, Math.round(p.minOfDay / 10) * 10));
  }
  function updateBar() {
    buildBar();
    if (!barEls) return;
    barEls.host.classList.toggle('tb-wrap--readonly', locked());
    paint(S.dragMin != null ? S.dragMin : Clock.minutes());
  }
  Clock.update = updateBar;

  // Sticky offset: the DM header slides away on scroll-down, so the bar
  // follows it (CSS var read by .tb-wrap). Called from
  // sccUpdateHeaderScrollState() in dm.html.
  Clock.syncHeaderOffset = function() {
    var header = document.querySelector('.dm-shell-header');
    var h = (header && !header.classList.contains('dm-shell-header--hidden')) ? header.offsetHeight : 0;
    document.documentElement.style.setProperty('--dm-header-visible-h', h + 'px');
  };

  // ═══ 2. Scenario cards that advance time ═══════════════════════════
  var CARD = {}; // 'domId|idx' -> { stage: 'confirm'|'done'|'kept', prev: minutes }
  function ckey(domId, idx) { return domId + '|' + idx; }
  function redrawCard(domId, idx) { if (typeof root.sccFgSwitchScenarioCard === 'function') root.sccFgSwitchScenarioCard(domId, idx, null); }

  // Small chip shown under a tile's title (and in the open card).
  root.sccCalDurChip = function(card) {
    var d = card && Number(card.duration_minutes);
    return d > 0 ? '<span class="sct-chip">' + CLOCK_ICON + 'Takes ' + esc(Cal.durStr(d)) + '</span>' : '';
  };

  // Block rendered at the top of an open card's body.
  root.sccCalCardTimeHtml = function(card, domId, idx) {
    var d = card && Number(card.duration_minutes);
    var out = '';
    if (d > 0) {
      var st = CARD[ckey(domId, idx)] || null;
      var stage = st && st.stage;
      var arriveMin = Clock.minutes() + d;
      var ap = Cal.parts(arriveMin);
      var k = '\'' + esc(domId) + '\',' + idx;
      var inner = root.sccCalDurChip(card);
      if (!stage && !locked()) {
        inner += '<div class="sct-row"><button type="button" class="sct-btn" onclick="sccCalCardChoose(' + k + ')">They do this</button></div>';
      } else if (stage === 'confirm') {
        inner += '<div class="sct-text">Move the clock ' + esc(Cal.durStr(d)) + '? They arrive around <strong>' + esc(Cal.clockStr(ap.minOfDay)) + ', ' + esc(Cal.periods[ap.periodIdx].name) + '</strong>.</div>'
          + '<div class="sct-row"><button type="button" class="sct-btn sct-btn--gold" onclick="sccCalCardAdvance(' + k + ')">Advance ' + esc(Cal.durStr(d)) + '</button>'
          + '<button type="button" class="sct-btn" onclick="sccCalCardKeep(' + k + ')">Keep the time</button></div>';
      } else if (stage === 'done' || stage === 'kept') {
        inner += '<div class="sct-done"><span class="sct-done-text">' + CHECK_ICON + (stage === 'kept' ? 'Chosen, time unchanged' : 'Advanced to ' + esc(Cal.clockStr(Cal.parts(Clock.minutes()).minOfDay))) + '</span>'
          + (locked() ? '' : '<button type="button" class="sct-undo" onclick="sccCalCardUndo(' + k + ')">Undo</button>') + '</div>';
      }
      out += '<div class="sct-box' + (stage ? ' sct-box--active' : '') + '">' + inner + '</div>';
    }
    return out;
  };

  // DM editor field: the card's optional time cost, saved to the block.
  root.sccCalCardEditHtml = function(card, domId, idx) {
    if (locked()) return '';
    var v = card && Number(card.duration_minutes) > 0 ? Number(card.duration_minutes) : '';
    return '<label class="sct-edit">Time cost in minutes (optional) <input type="number" min="0" step="5" value="' + v + '" aria-label="Minutes this card takes" onchange="sccCalCardSetDuration(\'' + esc(domId) + '\',' + idx + ',this.value)"></label>';
  };

  root.sccCalCardChoose = function(domId, idx) {
    if (locked()) return;
    Clock.ensure();
    CARD[ckey(domId, idx)] = { stage: 'confirm', prev: null };
    redrawCard(domId, idx);
  };
  root.sccCalCardAdvance = function(domId, idx) {
    var found = root.sccFgFindScenarioCardsBlockByDomId(domId);
    var card = found && found.block.cards && found.block.cards[idx];
    var d = card && Number(card.duration_minutes);
    if (!(d > 0) || locked()) return;
    var prev = Clock.minutes();
    CARD[ckey(domId, idx)] = { stage: 'done', prev: prev };
    Clock.set(prev + d);
    redrawCard(domId, idx);
  };
  root.sccCalCardKeep = function(domId, idx) {
    CARD[ckey(domId, idx)] = { stage: 'kept', prev: Clock.minutes() };
    redrawCard(domId, idx);
  };
  root.sccCalCardUndo = function(domId, idx) {
    if (locked()) return;
    var st = CARD[ckey(domId, idx)];
    if (st && st.prev != null && st.prev !== Clock.minutes()) Clock.set(st.prev);
    delete CARD[ckey(domId, idx)];
    redrawCard(domId, idx);
  };
  // Persists duration_minutes onto the card inside field_guide_sessions.blocks
  // (same whole-column PATCH the loot widget already uses). Empty or 0
  // removes the key so cards without a time cost stay exactly as authored.
  root.sccCalCardSetDuration = function(domId, idx, raw) {
    if (locked()) return;
    var found = root.sccFgFindScenarioCardsBlockByDomId(domId);
    var card = found && found.block.cards && found.block.cards[idx];
    if (!card) return;
    var n = parseInt(raw, 10);
    if (n > 0) card.duration_minutes = n; else delete card.duration_minutes;
    var num = root.sccFgActiveSessionNum();
    var row = root.SCC_FG_DOC_CACHE && root.SCC_FG_DOC_CACHE[num];
    if (!row) return;
    delete CARD[ckey(domId, idx)];
    root.sccPatch('field_guide_sessions', '?session_number=eq.' + encodeURIComponent(num), { blocks: row.blocks }).then(function(r) {
      if (!r.ok) toast('Could not save the time cost');
      else toast('Time cost saved', 'success');
      root.sccFgRedrawScenarioCardsBlock(domId, idx);
    }).catch(function() { toast('Could not save the time cost'); });
  };

  // ═══ 3. Calendar panel (quick-actions drawer popup pane) ═══════════
  // One DM-only marker, from the approved board and the calendar concept's
  // own `current.note` (the courier arrives Thunderday, Julisun 15).
  var DM_NOTES = { '6-15': 'Grusk courier collects at the Sunken Ferry' };
  var PS = { vm: 6, sm: 6, sd: 9, rg: 'caparia' };
  var ARROW_L = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>';
  var ARROW_R = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>';

  function panelHtml() {
    var today = Cal.parts(Clock.minutes());
    var RG = Cal.regions[PS.rg];
    var starts = Cal.monthStarts();
    var first = Cal.weekdayOfDay(starts[PS.vm]);
    var heads = Cal.weekdays.map(function(w) { return '<div class="cp-head-cell" title="' + esc(w.name) + '">' + esc(w.name.slice(0, 2)) + '</div>'; }).join('');
    var cells = '';
    for (var i = 0; i < first; i++) cells += '<button type="button" class="cp-cell cp-cell--empty" tabindex="-1" aria-hidden="true"></button>';
    for (var d = 1; d <= Cal.months[PS.vm].days; d++) {
      var isToday = PS.vm === today.monthIdx && d === today.dom;
      var isSel = PS.vm === PS.sm && d === PS.sd;
      var hol = Cal.holidays[PS.vm] && Cal.holidays[PS.vm].day === d;
      var ev = DM_NOTES[PS.vm + '-' + d];
      cells += '<button type="button" class="cp-cell' + (isToday ? ' cp-cell--today' : '') + (isSel ? ' cp-cell--sel' : '') + (ev ? ' cp-cell--event' : hol ? ' cp-cell--holiday' : '')
        + '" data-cp="day" data-d="' + d + '" aria-label="' + esc(Cal.weekdays[Cal.weekdayOfDay(starts[PS.vm] + d - 1)].name + ', ' + Cal.months[PS.vm].name + ' ' + d) + '">' + d + '</button>';
    }
    var sel = RG.m[PS.sm];
    var selWd = Cal.weekdays[Cal.weekdayOfDay(starts[PS.sm] + PS.sd - 1)].name;
    var selIsToday = PS.sm === today.monthIdx && PS.sd === today.dom;
    var selEv = DM_NOTES[PS.sm + '-' + PS.sd];
    var selHol = Cal.holidays[PS.sm] && Cal.holidays[PS.sm].day === PS.sd ? Cal.holidays[PS.sm].gridLabel : '';
    var seasonVar = Cal.seasonVar(sel[0]);
    var region = Clock.region();
    var regions = Cal.regionOrder.map(function(k) {
      return '<button type="button" class="cp-region' + (k === PS.rg ? ' cp-region--on' : '') + '" data-cp="region" data-r="' + k + '" aria-label="Show ' + Cal.regions[k].name + '"><img src="' + Cal.regions[k].img + '" alt=""><span>' + Cal.regions[k].name + '</span></button>';
    }).join('');
    var year = Cal.months.map(function(m, i) {
      var r = RG.m[i];
      return '<button type="button" class="cp-year-row' + (i === PS.vm ? ' cp-year-row--on' : '') + '" data-cp="month" data-m="' + i + '"><img src="' + Cal.iconUrl(r[3]) + '" alt="" width="20" height="20"><span class="m">' + esc(m.name) + '</span><span class="s">' + esc(r[0]) + '</span>'
        + '<span class="h" style="color:' + Cal.tempColor(r[1]) + '">' + r[1] + '°</span><span class="sl">/</span><span class="l" style="color:' + Cal.tempColor(r[2]) + '">' + r[2] + '°</span></button>';
    }).join('');
    return '<div class="cp-root">'
      + '<div class="cp-head"><div><div class="cp-sub">' + today.year + ' AA · After the Accord</div></div><button type="button" class="cp-today-btn" data-cp="today">Today</button></div>'
      + '<div class="cp-regions">' + regions + '</div>'
      + '<div class="cp-here">' + (PS.rg === region ? 'The party is in ' + RG.name + '. Tap another region to compare.' : 'Comparing ' + RG.name + '. The party is still in ' + esc(Cal.regions[region] ? Cal.regions[region].name : region) + '.') + '</div>'
      + '<div class="cp-sel"><div class="cp-sel-bar" style="background:' + seasonVar + '"></div><div class="cp-sel-body">'
      + '<div class="cp-sel-top"><div class="cp-date-tile"><div class="cp-date-mon">' + esc(Cal.months[PS.sm].name.slice(0, 3).toUpperCase()) + '</div><div class="cp-date-day">' + PS.sd + '</div></div>'
      + '<div class="cp-sel-title"><div class="cp-sel-wd">' + esc(selWd) + (selIsToday ? '<span class="cp-today-tag">TODAY</span>' : '') + '</div><div class="cp-sel-full">' + esc(Cal.months[PS.sm].name) + ' ' + PS.sd + ', ' + today.year + ' AA</div></div></div>'
      + '<div class="cp-wx"><img src="' + Cal.iconUrl(sel[3]) + '" alt="" width="40" height="40"><div class="cp-wx-mid"><div class="cp-wx-name">' + esc(Cal.iconLabels[sel[3]] || sel[3]) + '</div><div class="cp-wx-in">in ' + RG.name + '</div></div>'
      + '<div class="cp-deg"><b style="color:' + Cal.tempColor(sel[1]) + '">' + sel[1] + '°</b><i>HIGH</i></div><div class="cp-deg-sep"></div><div class="cp-deg"><b style="color:' + Cal.tempColor(sel[2]) + '">' + sel[2] + '°</b><i>LOW</i></div></div>'
      + '<div class="cp-tags"><span class="cp-season-tag" style="background:' + seasonVar + '">' + esc(sel[0]) + '</span><span class="cp-region-tag">' + RG.name + '</span></div>'
      + '<div class="cp-feel" style="border-left-color:' + seasonVar + '">' + esc(sel[4]) + '</div>'
      + ((selEv || selHol) ? '<div class="cp-note ' + (selEv ? 'cp-note--event' : 'cp-note--holiday') + '"><span class="cp-note-dot"></span>' + esc(selEv || selHol) + '</div>' : '')
      + '</div></div>'
      + '<div class="cp-nav"><button type="button" class="cp-nav-btn" data-cp="prev" aria-label="Previous month">' + ARROW_L + '</button><div class="cp-nav-mid"><div class="cp-nav-name">' + esc(Cal.months[PS.vm].name) + '</div><div class="cp-nav-like">like ' + esc(Cal.months[PS.vm].like) + ' · ' + esc(RG.m[PS.vm][0]) + '</div></div><button type="button" class="cp-nav-btn" data-cp="next" aria-label="Next month">' + ARROW_R + '</button></div>'
      + '<div class="cp-grid">' + heads + cells + '</div>'
      + '<div class="cp-legend"><span><i class="cp-lg-ring"></i>Today</span><span><i class="cp-lg-dot cp-lg-dot--event"></i>Something happens (DM only)</span><span><i class="cp-lg-dot cp-lg-dot--holiday"></i>Holiday</span></div>'
      + '<div class="cp-rule"></div><div class="cp-year-title">THE YEAR IN ' + RG.name.toUpperCase() + '</div><div class="cp-year">' + year + '</div></div>';
  }

  function drawPanel() {
    var pane = document.getElementById('scc-live-popup-pane-calendar');
    if (!pane) return;
    pane.innerHTML = panelHtml();
  }
  function gotoToday() {
    var t = Cal.parts(Clock.minutes());
    PS.vm = t.monthIdx; PS.sm = t.monthIdx; PS.sd = t.dom; PS.rg = Clock.region();
  }
  root.sccCalOpenPanel = function() {
    gotoToday();
    drawPanel();
    Clock.ensure().then(function() { gotoToday(); drawPanel(); });
  };
  Clock.subscribe(function() {
    var pane = document.getElementById('scc-live-popup-pane-calendar');
    if (pane && pane.classList.contains('active')) drawPanel();
  });
  document.addEventListener('click', function(e) {
    var el = e.target.closest ? e.target.closest('[data-cp]') : null;
    if (!el || !document.getElementById('scc-live-popup-pane-calendar').contains(el)) return;
    var a = el.getAttribute('data-cp');
    if (a === 'region') PS.rg = el.getAttribute('data-r');
    else if (a === 'day') { PS.sm = PS.vm; PS.sd = Number(el.getAttribute('data-d')); }
    else if (a === 'month') PS.vm = Number(el.getAttribute('data-m'));
    else if (a === 'prev') PS.vm = (PS.vm + 11) % 12;
    else if (a === 'next') PS.vm = (PS.vm + 1) % 12;
    else if (a === 'today') gotoToday();
    drawPanel();
  });

  // Build the bar as soon as the page is ready; data loads when the Field
  // Guide opens (Clock.ensure is also called from sccFgInitDocument).
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildBar); else buildBar();
})(window);
