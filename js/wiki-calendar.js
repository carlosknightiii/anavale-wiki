// ══ WIKI CALENDAR PAGE — js/wiki-calendar.js ════════════════════════════
// Player wiki route #calendar (ANV-43). Two pill tabs: The Calendar
// (Year / Months / Week) and Weather. Built from the approved board
// (docs/design/anv-43/boards/4-wiki-calendar-page.html); month, weekday and
// weather figures come from js/anavale-calendar.js (which overlays the live
// world_concepts 'anavale-calendar' row when it can be read).
//
// Player-facing only: the timeline copy below is the approved player text.
// world_concepts' own timeline also holds player_facing:false rows; those
// are never read here. Links are rendered only for entities that exist in
// the wiki's loaded data AND have player_facing === true; anything else
// (Solenveil, the Sunnish, Frostgate...) stays plain text.
(function(root) {
  'use strict';
  var Cal = root.AnavaleCal;
  var STATE = { tab: 'cal', region: 'caparia' };
  var esc = Cal.esc;

  // ── Safe linking ──────────────────────────────────────────────────
  var LINK_SRC = {
    nation: ['NATIONS', 'nation'], org: ['ORGANIZATIONS', 'org'], character: ['CHARACTERS', 'character'],
    religion: ['RELIGIONS', 'religion'], region: ['REGIONS', 'region'],
    city: ['CITIES', 'city'], poi: ['POIS', 'poi']
  };
  function canLink(type, id) {
    var src = LINK_SRC[type];
    var list = src && root[src[0]];
    if (!Array.isArray(list)) return false;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].player_facing === true;
    return false;
  }
  function L(type, id, label) {
    return canLink(type, id) ? '<a href="#' + LINK_SRC[type][1] + '/' + esc(id) + '">' + esc(label) + '</a>' : esc(label);
  }
  function reduced() { try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  // ── Copy (approved board text) ────────────────────────────────────
  var NATIONS6 = [
    ['solenmere', 'Solenmere', 'No One Eats Alone.'], ['zippan', 'Zippan', 'We Make the Joy.'], ['bunari', 'Bunari', 'Home Is the Horizon.'],
    ['janiveth', 'Janiveth', 'We Stayed.'], ['dingurei', 'Dingurei', 'Every Answer Asks Again.'], ['opuri', 'Opuri', 'The Forest Speaks First.']
  ];
  function timelineRows() {
    return [
      { year: 'Before counting', yc: 'var(--cal-text-3)', title: 'The Partition', pair: ['assets/images/characters/grak.webp', 'Grak', 'assets/images/characters/nara.webp', 'Nara'],
        text: L('character', 'grak', 'Grak') + ' collides with ' + L('character', 'nara', 'Nara') + ', and three gods become five.' },
      { year: '488 BA', yc: 'var(--cal-ba)', title: 'Thyun’s Thought', img: 'assets/images/characters/thyun.webp', alt: 'Thyun', ring: 'var(--cal-ba-ring)',
        text: 'Monks of the ' + L('religion', 'stillkeep', 'Stillkeep') + ' begin trying to transcribe one complete thought of ' + L('character', 'thyun', 'Thyun') + '. They are still working on it.' },
      { year: '1 AA', yc: 'var(--gold)', title: 'The Signing', img: 'assets/images/calendar/solenveil-map.jpg', alt: 'Solenveil on the map', ring: 'var(--gold)', pos: '45% 55%',
        text: L('org', 'pogglewog-confederation', 'The Signing') + ' at Solenveil founds the ' + L('org', 'pogglewog-confederation', 'Pogglewog Confederation') + ' and the ' + L('org', 'caldenric-accord', 'Caldenric Accord') + '.' },
      { year: '9 AA', title: 'Dated Forms', stamp: '9 AA',
        text: L('org', 'the-formery', 'The Formery') + ' puts the Accord count on its date line. Everyone else follows, eventually.' },
      { year: 'c. 10 AA', title: 'Tekhari Founded', img: 'assets/images/regions/img-nombi-landscape.webp', alt: 'Nombi landscape', ring: 'var(--cal-region-nombi)',
        text: 'The ' + L('nation', 'tekhari', 'Tekhari') + ' nation is founded at ' + L('city', 'frostgate', 'Frostgate') + ', the youngest nation in ' + L('region', 'nombi', 'Nombi') + '.' },
      { year: 'c. 12 AA', title: 'Studying the Scar', img: 'assets/images/calendar/partition-scar.jpg', alt: 'The Partition Scar on the map', ring: 'var(--cal-stripe-dingurei)',
        text: 'The ' + L('nation', 'dingurei', 'Dingurei') + ' begin their study of the ' + L('poi', 'partition-scar', 'Partition Scar') + '.' },
      { year: '112 AA', title: 'The Silent Mosskin', img: 'assets/images/calendar/icey-mountains.jpg', alt: 'The Icey Mountains on the map', ring: 'var(--cal-icey-ring)',
        text: L('poi', 'the-ancient-one', 'The Ancient One') + ', ' + L('region', 'nombi', 'Nombi') + '’s oldest ' + L('org', 'mosskin', 'Mosskin') + ', sends its last clear signal.' },
      { year: '232 AA', title: 'A New Republic', img: 'assets/images/regions/img-jugabi-landscape.webp', alt: 'Jugabi landscape', ring: 'var(--cal-region-jugabi)',
        text: 'The ' + L('nation', 'kalori-republic', 'Kalori Republic') + ' emerges from within the ' + L('nation', 'verdathi', 'Verdathi') + '.' },
      { year: '252 AA', title: 'The Uninvited Office', office: true,
        text: L('org', 'the-formery', 'The Formery') + ' opens its uninvited office in ' + L('poi', 'confederation-hall', 'Confederation Hall') + '. ' + L('org', 'deepchill-accord', 'The Deepchill Accord') + ' begins debating its national flag.' },
      { year: '272 AA', title: 'Veilmoot Withdraws', img: 'assets/images/calendar/doopu-peaks.jpg', alt: 'The Doopu Peaks on the map', ring: 'var(--cal-stripe-janiveth)',
        text: 'The ' + L('org', 'veilmoot', 'Veilmoot') + ' sends its last ambassador.' },
      { year: '301 AA', title: 'Tabled Alliance', img: 'assets/images/regions/img-nombi-landscape.webp', alt: 'Nombi landscape', ring: 'var(--cal-region-nombi)', pos: '80% 50%',
        text: L('org', 'deepchill-accord', 'The Deepchill Accord') + ' of ' + L('region', 'nombi', 'Nombi') + ' tables a trade alliance with ' + L('region', 'caparia', 'Caparia') + '. It is still on the table.' },
      { year: '312 AA', yc: 'var(--gold)', title: 'Now', now: true, img: 'assets/images/calendar/gobblewump-map.jpg', alt: 'Gobblewump Crossing on the map', ring: 'var(--gold)',
        text: 'Three hundred and twelve years after ' + L('org', 'pogglewog-confederation', 'the Signing') + '. You are here.' }
    ];
  }
  var TL_MARKS = [[-488, '488 BA', 'var(--cal-ba)'], [1, '1 AA', 'var(--gold)'], [112, '112 AA', 'var(--cal-text-2)'], [232, '232 AA', 'var(--cal-text-2)'], [272, '272 AA', 'var(--cal-text-2)'], [312, 'Now', 'var(--gold)']];

  // ── Part 1: The Year ──────────────────────────────────────────────
  function stripesHtml() {
    return '<div class="cw-stripes">' + NATIONS6.map(function(n) {
      return '<div class="cw-stripe cw-stripe--' + n[0] + '"><img src="assets/images/sigils/sigil-' + n[0] + '.svg" alt="" width="86" height="100"></div>';
    }).join('') + '</div><div class="cw-mottos">' + NATIONS6.map(function(n) {
      return '<div><b>' + L('nation', n[0], n[1]).replace(/^<a /, '<a ') + '</b><span>“' + esc(n[2]) + '”</span></div>';
    }).join('') + '</div>';
  }
  function tlRowHtml(r) {
    var thumb;
    if (r.pair) thumb = '<div class="cw-tl-pair"><img src="' + r.pair[0] + '" alt="' + r.pair[1] + '"><img src="' + r.pair[2] + '" alt="' + r.pair[3] + '"></div>';
    else if (r.stamp) thumb = '<div class="cw-tl-paper"><div class="cw-tl-paper-stamp">' + esc(r.stamp) + '</div></div>';
    else if (r.office) thumb = '<div class="cw-tl-paper"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"></path><path d="M5 21V9l7-5 7 5v12"></path><path d="M9 21v-6h6v6"></path><path d="M9 11h6"></path></svg></div>';
    else thumb = '<img class="cw-tl-thumb" src="' + r.img + '" alt="' + esc(r.alt) + '" style="--ring:' + r.ring + (r.pos ? ';object-position:' + r.pos : '') + '">';
    return '<div class="cw-tl-row">' + thumb
      + '<div class="cw-tl-year"' + (r.yc ? ' style="--yc:' + r.yc + '"' : '') + '>' + esc(r.year) + '</div>'
      + '<div class="cw-tl-text"><div class="cw-tl-title' + (r.now ? ' cw-tl-title--now' : '') + '">' + esc(r.title) + '</div><div class="cw-tl-body">' + r.text + '</div></div></div>';
  }
  function partYear() {
    var tl = function(y) { return 4 + (y + 500) / 812 * 93; };
    var marks = TL_MARKS.map(function(k, i) {
      return '<div class="cw-tl-mark" style="left:' + tl(k[0]) + '%;--mk:' + k[2] + '"><div class="cw-tl-dot"></div><div class="cw-tl-lbl ' + (i % 2 ? 'cw-tl-lbl--down' : 'cw-tl-lbl--up') + '">' + esc(k[1]) + '</div></div>';
    }).join('');
    var rc = function(key, text) {
      var R = Cal.regions[key];
      return '<div class="cw-rcard cw-rcard--' + key + '"><img src="' + R.img + '" alt="' + R.name + ' landscape"><div>'
        + '<a href="#region/' + key + '">' + R.name + '</a><p>' + text + '</p></div></div>';
    };
    return '<section class="cw-section cw-section--year"><div class="cw-part"><span>PART ONE</span><span></span></div><h2 class="cw-h2">The Year</h2>'
      + '<div class="cw-seal-row"><div class="cw-seal"><div class="cw-seal-in"><small>THE YEAR IS</small><div class="cw-seal-year">312</div><div class="cw-seal-aa">AA</div><em>After the Accord</em></div></div>'
      + '<p class="cw-big">Ask anyone in Anavale what year it is and they will say <strong>three-twelve</strong>. Three hundred and twelve years ago, six quarrelling nations sat down at one painted table in Solenveil and agreed to stop quarrelling, more or less. Everyone has been counting from that day since, even the people who would rather not.</p></div>'
      + '<div class="cw-block"><h3 class="cw-h3">The Signing at Solenveil</h3><div class="cw-two">'
      + '<figure class="cw-fig"><img src="assets/images/calendar/solenveil-map.jpg" alt="Map of central Caparia showing Solenveil on the Mirrenflow River, with Prismhold to the south"><figcaption>Solenveil, on the Mirrenflow in the heart of ' + L('region', 'caparia', 'Caparia') + '.</figcaption></figure>'
      + '<div class="cw-prose"><p>On <strong>Maybloom 20</strong>, after a generation of border squabbles, the six nations of ' + L('region', 'caparia', 'Caparia') + ' met in Solenveil and signed the agreements of the ' + L('org', 'pogglewog-confederation', 'Pogglewog Confederation') + '. They promised four things: no member makes war on another, trade roads belong to everyone, festivals are shared, and every quarrel goes to the ' + L('org', 'pogglewog-confederation', 'Confederation Council') + '.</p>'
      + '<p>The ' + L('nation', 'solenmere', 'Solenmere') + ' wrote their own new government, the ' + L('org', 'caldenric-accord', 'Caldenric Accord') + ', into the same document, and its council sat for the first time that very evening. That day became <strong>1 AA</strong>.</p></div></div>'
      + '<div class="cw-table-card"><div class="cw-table-head"><b>The Signing Table</b><span>One painted stripe and sigil for each signer, above each kingdom’s motto. It still stands in ' + L('poi', 'confederation-hall', 'Confederation Hall') + '.</span></div>' + stripesHtml() + '</div>'
      + '<blockquote class="cw-quote"><p>“We did not agree on much that day. We agreed to keep talking. It turned out that was enough.”</p><cite>The first Chancellor of the ' + L('org', 'caldenric-accord', 'Caldenric Accord') + ', at ' + L('org', 'pogglewog-confederation', 'the Signing') + '</cite></blockquote></div>'
      + '<div class="cw-block"><h3 class="cw-h3">How to Say It</h3><div class="cw-ba"><div class="cw-ba-half"></div><div class="cw-ba-mid"></div><div class="cw-ba-tag">THE SIGNING</div>'
      + '<div class="cw-ba-l">BA · Before the Accord</div><div class="cw-ba-ls">counts backwards: 40 BA was 40 years before</div><div class="cw-ba-r">After the Accord · AA</div><div class="cw-ba-rs">counts forward: now is 312 AA</div></div>'
      + '<div class="cw-cards-3"><div class="cw-mini"><b>312 AA</b>“Three-twelve After the Accord,” or just “three-twelve.”</div><div class="cw-mini"><b>1 BA → 1 AA</b>There is no year zero. The year before the Signing is 1 BA.</div><div class="cw-mini"><b>No year at all</b>The Partition happened before anyone was counting, so it has no date.</div></div></div>'
      + '<div class="cw-block"><h3 class="cw-h3">Why Everyone Uses It</h3><div class="cw-why"><p>A Caparian date ended up on the whole continent because of ' + L('org', 'the-formery', 'the Formery') + '. In 9 AA it put the Accord count on the date line of every form it issues, after the Confederation Council filed the request correctly on its eleventh attempt. The Formery issues forms everywhere, so every permit, receipt and travel paper in Anavale has carried an AA date ever since.</p>'
      + '<div class="cw-form"><div class="cw-form-t">THE FORMERY · FORM 6-C</div><div class="cw-form-s">Declaration of Commercial Intent Through a River Crossing</div><div class="cw-form-d">DATE OF APPLICATION: <span>Julisun 9</span>, <span>312</span> AA</div><div class="cw-form-n">(If BA, see Form 1-B: Retroactive Existence, Request For.)</div><div class="cw-stamp">RECEIVED<br>IN DUE<br>COURSE</div></div></div></div>'
      + '<div class="cw-block"><h3 class="cw-h3">Not Everyone Is Happy About It</h3><p class="cw-lead cw-lead--sm">The Accord is Caparian, and the rest of Pogglewog has never let Caparia forget it.</p><div class="cw-region-cards">'
      + rc('caparia', 'Uses it proudly. Accord Day, Maybloom 20, is a holiday, with painted tables set out in the streets of every town.')
      + rc('nombi', L('org', 'deepchill-accord', 'The Deepchill Accord') + ' has tabled officially adopting it forty-one times, and uses it anyway on every trade paper. The ' + L('nation', 'tekhari', 'Tekhari') + ' adopted it on day one, which the rest of Nombi has never quite forgiven.')
      + rc('sohot', 'The ' + L('nation', 'auvari-remnance', 'Auvari Remnance') + ' counts in Imperial Years, a number well over two thousand, and calls AA “Caparian years.” The ' + L('nation', 'telvari-exchange', 'Telvari Exchange') + ' uses whichever date the customer prefers.')
      + rc('jugabi', 'The ' + L('nation', 'verdathi', 'Verdathi') + ' count time by the forest’s own seasons and find numbering years faintly rude. The ' + L('nation', 'kalori-republic', 'Kalori Republic') + ' adopted AA the year it was founded, mostly to annoy them.')
      + '</div><blockquote class="cw-quote cw-quote--sohot"><p>“Our empire was counting its years before Caparia had a word for counting.”</p><cite>A Memory Keeper of the ' + L('nation', 'auvari-remnance', 'Auvari Remnance') + '</cite></blockquote></div>'
      + '<div class="cw-block"><h3 class="cw-h3">A Timeline of Anavale</h3><div class="cw-tl-bar"><div class="cw-tl-line"></div><div class="cw-tl-dash"></div>' + marks + '</div><div class="cw-tl">' + timelineRows().map(tlRowHtml).join('') + '</div></div></section>';
  }

  // ── Parts 2 and 3: Months, Week ───────────────────────────────────
  function partMonths() {
    var cards = Cal.months.map(function(m, i) {
      var h = Cal.holidays[i];
      var days = i === 1 ? '28 (29)' : m.days;
      return '<div class="cw-month"><div class="cw-month-n">' + String(i + 1).padStart(2, '0') + '</div><div class="cw-month-name">' + esc(m.name) + '</div>'
        + '<div class="cw-month-like">like ' + esc(m.like) + ' · ' + days + ' days</div>'
        + (h ? '<div class="cw-hol"><button type="button" class="cw-hol-btn" aria-describedby="hol-' + i + '"><span class="cw-hol-dot"></span>' + esc(h.chip) + '</button>'
            + '<div class="cw-hol-pop" role="tooltip" id="hol-' + i + '"><div class="cw-hol-name">' + esc(h.name) + '</div><div class="cw-hol-when">' + esc(h.when) + '</div><div class="cw-hol-txt">' + esc(h.what) + '</div><div class="cw-hol-do">WHAT PEOPLE DO</div><div class="cw-hol-txt">' + esc(h.doo) + '</div></div></div>' : '')
        + '</div>';
    }).join('');
    return '<section class="cw-section"><div class="cw-part"><span>PART TWO</span><span></span></div><h2 class="cw-h2">The Months</h2><p class="cw-lead">Twelve months, the same lengths as the ones you know. Each one sounds like its twin and starts with the same letter.</p><div class="cw-months">' + cards + '</div></section>';
  }
  function partWeek() {
    return '<section class="cw-section"><div class="cw-part"><span>PART THREE</span><span></span></div><h2 class="cw-h2">The Week</h2><p class="cw-lead">Seven days, starting with Shineday. Yes, Friday is Frogday. Nobody in ' + L('region', 'caparia', 'Caparia') + ' thinks this is funny.</p><div class="cw-week">'
      + Cal.weekdays.map(function(d) { return '<div class="cw-day"><b>' + esc(d.name) + '</b><span>' + esc(d.like) + '</span></div>'; }).join('') + '</div></section>';
  }

  // ── Part 4: Weather ───────────────────────────────────────────────
  function fxHtml(key) {
    var i, out = '';
    if (key === 'jugabi') {
      for (i = 0; i < 40; i++) out += '<div class="cw-fx-drop" style="--l:' + ((i * 37) % 100) + '%;--dur:' + (0.7 + (i % 5) * 0.09).toFixed(2) + 's;--delay:' + (-((i * 0.13) % 1.2)).toFixed(2) + 's"></div>';
    } else if (key === 'nombi') {
      for (i = 0; i < 45; i++) { var sz = 3 + (i % 3) * 1.5; out += '<div class="cw-fx-flake" style="--l:' + ((i * 53) % 100) + '%;--sz:' + sz + 'px;--dur:' + (7 + (i % 4)) + 's;--delay:' + (-((i * 0.7) % 8)).toFixed(1) + 's"></div>'; }
    } else if (key === 'caparia') {
      out += '<div class="cw-fx-rays"></div>';
      for (i = 0; i < 5; i++) {
        var w = 120 + (i % 3) * 40;
        out += '<div class="cw-fx-wisp" style="--t:' + (12 + i * 12) + '%;--dur:' + (14 + (i % 3) * 3) + 's;--delay:' + (-(i * 3.4)).toFixed(1) + 's"><svg width="' + w + '" height="30" viewBox="0 0 160 30" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M2 19 C 28 7, 52 27, 80 15 S 128 5, 158 13" stroke-width="1.6" stroke-linecap="round"></path><path d="M38 24 C 58 18, 80 26, 106 20" stroke-width="1.1" stroke-linecap="round"></path></svg></div>';
      }
    } else if (key === 'sohot') {
      out += '<div class="cw-fx-horizon"></div>';
      for (i = 0; i < 34; i++) { var s2 = 2 + (i % 3); out += '<div class="cw-fx-mote" style="--l:' + (((i * 41) % 120) - 30) + '%;--sz:' + s2 + 'px;--dur:' + (6 + (i % 5)) + 's;--delay:' + (-((i * 0.9) % 10)).toFixed(1) + 's"></div>'; }
    }
    return out;
  }
  function mirageSvg() {
    // The turbulence drifts via SMIL; skipped entirely for reduced motion.
    var anim = reduced() ? '' : '<animate attributeName="baseFrequency" dur="10s" values="0.003 0.04;0.005 0.055;0.003 0.04" repeatCount="indefinite"></animate>';
    return '<svg class="cw-svg-hidden" aria-hidden="true"><filter id="sohotMirage" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.003 0.04" numOctaves="2" seed="4">' + anim + '</feTurbulence><feDisplacementMap in="SourceGraphic" scale="8" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap></filter></svg>';
  }
  function partWeather() {
    var key = STATE.region, R = Cal.regions[key];
    var MIN = -15, MAX = 120, pct = function(t) { return (t - MIN) / (MAX - MIN) * 100; };
    var hiI = 0, loI = 0;
    R.m.forEach(function(x, i) { if (x[1] > R.m[hiI][1]) hiI = i; if (x[2] < R.m[loI][2]) loI = i; });
    var lbl = function(k) { return esc(Cal.iconLabels[k] || k); };
    var glance = [
      [R.m[hiI][3], 'HOTTEST', Cal.months[hiI].name + ', about ' + R.m[hiI][1] + '°F'],
      [R.m[loI][3], 'COLDEST', Cal.months[loI].name + ', down to ' + R.m[loI][2] + '°F'],
      [R.extra[0], R.extra[1].toUpperCase(), R.extra[2]],
      ['sun', 'BEST TIME TO TRAVEL', R.travel]
    ].map(function(g) { return '<div class="cw-gl"><img src="' + Cal.iconUrl(g[0]) + '" alt="" width="32" height="32"><div><small>' + esc(g[1]) + '</small><b>' + esc(g[2]) + '</b></div></div>'; }).join('');
    var cols = R.m.map(function(x, i) {
      return '<div class="cw-col"><img src="' + Cal.iconUrl(x[3]) + '" alt="' + lbl(x[3]) + '" title="' + lbl(x[3]) + '" width="22" height="22"><div class="cw-col-hi">' + x[1] + '°</div>'
        + '<div class="cw-col-plot"><div class="cw-col-bar" style="bottom:' + pct(x[2]) + '%;height:' + (pct(x[1]) - pct(x[2])) + '%;background:' + Cal.seasonVar(x[0]) + '"></div><div class="cw-col-avg" style="bottom:' + pct((x[1] + x[2]) / 2) + '%"></div></div>'
        + '<div class="cw-col-lo">' + x[2] + '°</div><div class="cw-col-m">' + esc(Cal.months[i].name.slice(0, 3)) + '</div></div>';
    }).join('');
    var cards = R.m.map(function(x, i) {
      return '<div class="cw-mcard" style="border-top-color:' + Cal.seasonVar(x[0]) + '"><div class="cw-mcard-top"><div class="cw-mcard-name">' + esc(Cal.months[i].name) + '</div><img src="' + Cal.iconUrl(x[3]) + '" alt="' + lbl(x[3]) + '" title="' + lbl(x[3]) + '" width="26" height="26"></div>'
        + '<div class="cw-mcard-season" style="color:' + Cal.seasonVar(x[0]) + '">' + esc(x[0]) + '</div><div class="cw-mcard-range">Around ' + x[1] + '°F by day, ' + x[2] + '°F at night</div><div class="cw-mcard-feel">' + esc(x[4]) + '</div></div>';
    }).join('');
    var tabs = Cal.regionOrder.map(function(k) {
      var r = Cal.regions[k];
      return '<button type="button" role="tab" class="cw-wx-tab cw-reg--' + k + '" data-region="' + k + '" aria-selected="' + (k === key ? 'true' : 'false') + '"><img src="' + r.img + '" alt=""><span class="cw-wx-tab-cap"><b>' + r.name + '</b><span>' + esc(r.tagline) + '</span></span></button>';
    }).join('');
    return '<section class="cw-section cw-wx"><div class="cw-part"><span>PART FOUR</span><span></span></div><h2 class="cw-h2">Weather Across Pogglewog</h2>'
      + '<div class="cw-wx-tabs" role="tablist" aria-label="Region">' + tabs + '</div>'
      + '<div class="cw-wx-panel cw-reg--' + key + '"><div class="cw-hero"><img class="cw-hero-img' + (key === 'sohot' ? ' cw-hero-img--sohot' : '') + '" src="' + R.img + '" alt="' + R.name + ' landscape">'
      + '<div class="cw-fx" aria-hidden="true">' + fxHtml(key) + '</div>' + (key === 'sohot' ? mirageSvg() : '')
      + '<div class="cw-hero-cap"><div class="cw-hero-tag">' + esc(R.tagline.toUpperCase()) + '</div><div class="cw-hero-name">' + R.name + '</div><p>' + esc(R.climate) + '</p></div></div>'
      + '<div class="cw-wx-body"><div class="cw-glance">' + glance + '</div>'
      + '<div class="cw-chart"><div class="cw-chart-key"><span>Top of each bar: daytime high. Bottom: nighttime low. °F.</span><span><i></i>Thin line: the daily average</span></div><div class="cw-chart-cols">' + cols + '</div></div>'
      + '<div class="cw-mcards">' + cards + '</div></div></div></section>';
  }

  // ── Page ──────────────────────────────────────────────────────────
  function pageHtml() {
    var tabs = [['cal', 'The Calendar', 'Years, months and weeks'], ['wx', 'Weather', 'Seasons in all four regions']].map(function(t) {
      return '<button type="button" role="tab" class="cw-tab" data-tab="' + t[0] + '" aria-selected="' + (STATE.tab === t[0] ? 'true' : 'false') + '"><b>' + t[1] + '</b><span>' + t[2] + '</span></button>';
    }).join('');
    return '<div class="cw-page"><div class="cw-inner"><div class="cw-head"><div class="cw-eyebrow">WORLD · TIME</div><h1 class="cw-h1">The Anavale Calendar</h1>'
      + '<p class="cw-lede">Years, months and weeks across ' + L('region', 'caparia', 'Caparia') + ', ' + L('region', 'nombi', 'Nombi') + ', ' + L('region', 'sohot', 'Sohot') + ' and ' + L('region', 'jugabi', 'Jugabi') + ', and what the weather is doing while you count them.</p></div>'
      + '<div class="cw-tabs" role="tablist" aria-label="Calendar page sections">' + tabs + '</div>'
      + '<div class="cw-pane" id="cw-pane">' + (STATE.tab === 'cal' ? partYear() + partMonths() + partWeek() : partWeather()) + '</div></div></div>';
  }

  root.renderCalendarPage = function(el, startTab) {
    if (startTab === 'cal' || startTab === 'wx') STATE.tab = startTab;
    function draw() {
      el.innerHTML = pageHtml();
      Array.prototype.forEach.call(el.querySelectorAll('.cw-tab'), function(b) {
        b.addEventListener('click', function() {
          STATE.tab = b.getAttribute('data-tab');
          // Keep the address and the sidebar in step with the tab (no re-route).
          var h = STATE.tab === 'wx' ? 'weather' : 'calendar';
          if (root.history && root.history.replaceState) root.history.replaceState(null, '', '#' + h);
          if (typeof root.updateSidebarActive === 'function') root.updateSidebarActive(h);
          draw();
        });
      });
      Array.prototype.forEach.call(el.querySelectorAll('.cw-wx-tab'), function(b) {
        b.addEventListener('click', function() { STATE.region = b.getAttribute('data-region'); draw(); });
      });
      Array.prototype.forEach.call(el.querySelectorAll('.cw-hol-btn'), function(b) {
        b.addEventListener('keydown', function(e) { if (e.key === 'Escape') b.blur(); });
      });
    }
    draw();
    // Fold in the live calendar row once; redraw only if it changed anything.
    if (!Cal.conceptLoaded && !root.__calConceptRequested && typeof root.calWikiFetch === 'function') {
      root.__calConceptRequested = true;
      Cal.loadConcept(root.calWikiFetch).then(function(ok) { if (ok && document.body.contains(el) && el.querySelector('.cw-page')) draw(); });
    }
  };
})(window);
