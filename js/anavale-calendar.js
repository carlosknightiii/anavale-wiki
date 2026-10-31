// ══ ANAVALE CALENDAR — js/anavale-calendar.js ═══════════════════════════
// Shared by dm.html (time bar, calendar drawer panel, scenario time-advance)
// and index.html (player wiki #calendar page). ANV-43.
//
// Time model: campaign_clock.minutes = minutes since Janufrost 1, 312 AA,
// 00:00. Months have fixed lengths (no leap day), day index 189 (0-based)
// is Julisun 9, a Frogday.
//
// Live data: world_concepts id 'anavale-calendar' (column `types`) is read
// by AnavaleCal.loadConcept(), which overlays months, weekdays, icons and
// each region's 12 monthly rows onto the built-in defaults below. If the
// fetch fails (offline, blocked, row missing) the defaults are used, so the
// calendar always renders. Region presentation (accent, tagline, image,
// travel notes) is not stored in the database and lives here.
(function(root) {
  'use strict';

  var DEFAULT_MONTHS = [
    ['Janufrost', 'January', 31], ['Febrillow', 'February', 28], ['Marchwind', 'March', 31],
    ['Aprillune', 'April', 30], ['Maybloom', 'May', 31], ['Junebright', 'June', 30],
    ['Julisun', 'July', 31], ['Augustorm', 'August', 31], ['Septemleaf', 'September', 30],
    ['Octumble', 'October', 31], ['Novemmist', 'November', 30], ['Decembell', 'December', 31]
  ];
  var DEFAULT_WEEKDAYS = [
    ['Shineday', 'Sunday'], ['Moonday', 'Monday'], ['Tumbleday', 'Tuesday'], ['Wishday', 'Wednesday'],
    ['Thunderday', 'Thursday'], ['Frogday', 'Friday'], ['Starday', 'Saturday']
  ];
  var DEFAULT_ICON_LABELS = {
    sun: 'Clear and sunny', heat: 'Heat wave', rain: 'Rain', monsoon: 'Monsoon downpours',
    storm: 'Thunderstorms', snow: 'Snow and deep cold', wind: 'Wind and dust', leaf: 'Autumn',
    flower: 'Spring bloom', fog: 'Fog and mist', cloud: 'Overcast', thaw: 'Thaw', partly: 'Sun and cloud'
  };
  var TEMP_WORDS = [[20, 'bitter cold'], [35, 'freezing'], [50, 'cold'], [62, 'cool'], [75, 'mild'], [85, 'warm'], [95, 'hot'], [999, 'blazing']];

  // Holidays shown on the calendar grid and the wiki's month cards, keyed by
  // 0-based month index. `day` is the day of month.
  var HOLIDAYS = {
    3:  { day: 14, chip: 'Aprillune 14 · Creature Festival Day', name: 'Creature Festival Day', when: 'APRILLUNE 14 · CAPARIA', gridLabel: 'Creature Festival Day (Caparia)',
          what: 'A national holiday in the Caldenric Accord honoring the creatures that share the land, from Bumble Frogs to Pocketmoles.',
          doo: 'Towns parade their animals in ribbons, children draw every creature they spotted that year, and nobody is allowed to shoo a frog off anything.' },
    4:  { day: 20, chip: 'Maybloom 20 · Accord Day', name: 'Accord Day', when: 'MAYBLOOM 20 · CAPARIA', gridLabel: 'Accord Day (Caparia)',
          what: 'The anniversary of the Signing at Solenveil, the day Anavale started counting its years.',
          doo: 'Every household paints one stripe on a long table set out in the street, and strangers share one meal along it. In Solenveil, children are allowed to sit at the real Signing Table. Nombi and Sohot mostly ignore it.' },
    5:  { day: 21, chip: 'Junebright 21 · The Dawnburst', name: 'The Dawnburst', when: 'JUNEBRIGHT 21 · SUMMER SOLSTICE', gridLabel: 'The Dawnburst',
          what: 'The Brightcreed festival of the longest day, a full day of color offered to Oro.',
          doo: 'A whole day of noise, painting, feasting and setting creatures free. At dusk, people burn small handmade colored things so the smoke carries color up to Oro.' },
    11: { day: 21, chip: 'Decembell 21 · The Long Vigil', name: 'The Long Vigil', when: 'DECEMBELL 21 · WINTER SOLSTICE', gridLabel: 'The Long Vigil',
          what: 'The Stillkeep vigil on the longest night, kept in honor of Thyun.',
          doo: 'Monks sit in darkness from dusk to dawn, each holding one memory perfectly still. Ordinary families keep a single candle lit and tell one story they never want forgotten.' }
  };

  // m: per month [season, high_f, low_f, icon, feel]
  var REGIONS = {
    caparia: { name: 'Caparia', tagline: 'The colorful heartlands', img: 'assets/images/regions/img-caparia-landscape.webp',
      climate: 'The sunny heart of Pogglewog. Long, hot, dry summers turn the meadows gold, and mild, rainy winters turn them green again. Snow falls only on the peaks.',
      extra: ['rain', 'Rainy season', 'Octumble to Febrillow'], travel: 'Maybloom and Septemleaf',
      m: [['Mild wet winter',56,39,'rain','Cool rain off the hills, frost only on the coldest mornings.'],['Mild wet winter',58,40,'rain','Almond trees blooming between rainstorms.'],['Spring',63,44,'flower','Wildflowers on the meadows, rivers running full.'],['Spring',68,48,'flower','Warm afternoons, cool nights, the frogs singing again.'],['Spring',76,55,'sun','Everything green and gold; perfect travel weather.'],['Dry summer',84,62,'sun','Hot sun, dry roads, midsummer festivals at month end.'],['Dry summer',90,67,'heat','Baking afternoons; everyone is in the river by noon.'],['Dry summer',90,67,'heat','Dusty heat, buzzing cicadas, the grass gone gold.'],['Autumn',83,61,'leaf','Grape and olive harvests, long warm evenings.'],['Autumn',73,53,'rain','The first rains return and the land turns green again.'],['Autumn',63,45,'fog','Damp and windy, river fog in the mornings.'],['Mild wet winter',57,40,'cloud','Short grey days, bell festivals, snow only on the peaks.']] },
    nombi: { name: 'Nombi', tagline: 'The frozen, aurora-lit north', img: 'assets/images/regions/img-nombi-landscape.webp',
      climate: 'The frozen north. Winters are long, dark and buried in snow, lit by the aurora, and well below zero at night. Summers are short, cool and bright, when the sun barely sets at all.',
      extra: ['snow', 'Snow season', 'Novemmist to Aprillune'], travel: 'Junebright and Julisun',
      m: [['Deep winter',10,-8,'snow','A few hours of blue daylight, deep snow, the aurora most nights.'],['Deep winter',13,-7,'snow','Bitter, clear cold; rivers frozen solid.'],['Late winter',24,4,'snow','The light comes back; the snow does not leave.'],['Thaw',36,18,'thaw','River ice breaks with a roar; mud everywhere.'],['Spring',49,29,'flower','Birch leaves overnight, lakes open, endless evenings.'],['Bright summer',58,38,'sun','The sun barely sets and nobody sleeps much.'],['Bright summer',62,43,'sun','The warmest it gets: berries, and swimming in cold lakes.'],['Late summer',59,41,'partly','Cool nights creep back; mushroom season.'],['Autumn',48,32,'leaf','Gold birches, the first frost, fish and berry harvests.'],['Autumn',35,23,'rain','Grey rain turning to sleet, early dark.'],['Early winter',23,12,'snow','The first real snow; the long dark begins.'],['Deep winter',13,-4,'snow','Barely any daylight; candles in every window.']] },
    sohot: { name: 'Sohot', tagline: 'The ancient, blazing south', img: 'assets/images/regions/img-sohot-landscape.webp',
      climate: 'Desert country beyond the Jani Mountains. Summers are brutal, often well past 110°F, and almost no rain falls. Winters are mild and pleasant, and the nights are cold all year.',
      extra: ['heat', 'Deadly heat', 'Junebright to Septemleaf'], travel: 'Novemmist to Febrillow',
      m: [['Cool season',74,50,'sun','Warm days, cold desert nights; the best time to travel.'],['Cool season',78,53,'sun','Clear skies, cold mornings, oases in bloom.'],['Warming',86,60,'wind','Dust winds start blowing in off the dunes.'],['Hot season',96,68,'wind','Sandstorms; travelers move only at dawn and dusk.'],['Hot season',105,77,'heat','Shimmering heat; the dunes are too hot to cross by noon.'],['Scorching season',113,84,'heat','Nobody moves at midday.'],['Scorching season',116,87,'heat','The hottest month; wells guarded, roads empty at noon.'],['Scorching season',115,86,'heat','Heavy, breathless heat; nights barely cool.'],['Hot season',109,80,'heat','Still blazing, with the first relief after dark.'],['Cooling',99,71,'sun','The heat breaks and the caravans set out again.'],['Cool season',86,60,'sun','Pleasant days, crisp nights, market season.'],['Cool season',76,51,'sun','Mild days and cold, clear nights full of stars.']] },
    jugabi: { name: 'Jugabi', tagline: 'The living jungle southwest', img: 'assets/images/regions/img-jugabi-landscape.webp',
      climate: 'Hot, green and wet all year. Spring is a blazing wait for rain, then the monsoon arrives and pours for months. The cool season is warm by anyone else’s standards.',
      extra: ['monsoon', 'Monsoon', 'Junebright to Septemleaf'], travel: 'Novemmist to Febrillow',
      m: [['Cool dry season',84,66,'sun','Warm, dry and pleasant; festival season.'],['Cool dry season',88,68,'sun','Clear skies and rising heat.'],['Hot season',93,73,'heat','Heat building; the rainforest hums.'],['Hot season',97,78,'heat','The hottest and stickiest month; everyone waits for rain.'],['Hot season',96,80,'storm','Thunderheads gather every afternoon.'],['Monsoon',91,79,'monsoon','The rains arrive with a roar; rivers rise overnight.'],['Monsoon',88,78,'monsoon','Daily downpours, flooded roads, everything green.'],['Monsoon',87,77,'monsoon','Warm rain all day; mushrooms and frogs everywhere.'],['Monsoon',88,77,'rain','The rains thin out and steam rises off the forest.'],['Retreating rains',89,75,'partly','Storms ease and the land glistens.'],['Cool dry season',87,70,'sun','Drier air, cooler nights, the harvest.'],['Cool dry season',84,66,'sun','Warm days, mild nights, lantern festivals.']] }
  };
  var REGION_ORDER = ['caparia', 'nombi', 'sohot', 'jugabi'];

  var PERIODS = [
    { key: 'night', name: 'Night' },
    { key: 'morning', name: 'Morning' },
    { key: 'afternoon', name: 'Afternoon' },
    { key: 'evening', name: 'Evening' }
  ];

  var Cal = {
    months: DEFAULT_MONTHS.map(function(m) { return { name: m[0], like: m[1], days: m[2] }; }),
    weekdays: DEFAULT_WEEKDAYS.map(function(w) { return { name: w[0], like: w[1] }; }),
    iconLabels: JSON.parse(JSON.stringify(DEFAULT_ICON_LABELS)),
    regions: REGIONS,
    regionOrder: REGION_ORDER,
    holidays: HOLIDAYS,
    periods: PERIODS,
    weatherIconBase: 'assets/images/weather/',
    conceptLoaded: false
  };

  // ── Overlay live world_concepts data onto the defaults ────────────
  // `types` is world_concepts.types for id 'anavale-calendar'. Defensive:
  // anything missing or malformed is skipped, never thrown.
  Cal.applyConcept = function(types) {
    if (!types || typeof types !== 'object') return false;
    try {
      if (Array.isArray(types.months) && types.months.length === 12) {
        Cal.months = types.months.map(function(m, i) {
          return { name: m.name || DEFAULT_MONTHS[i][0], like: m.like || DEFAULT_MONTHS[i][1], days: m.days || DEFAULT_MONTHS[i][2] };
        });
      }
      if (Array.isArray(types.weekdays) && types.weekdays.length === 7) {
        Cal.weekdays = types.weekdays.map(function(w, i) {
          return { name: w.name || DEFAULT_WEEKDAYS[i][0], like: w.like || DEFAULT_WEEKDAYS[i][1] };
        });
      }
      if (types.icons && typeof types.icons === 'object') {
        Object.keys(types.icons).forEach(function(k) { Cal.iconLabels[k] = types.icons[k]; });
      }
      if (types.regions && typeof types.regions === 'object') {
        Object.keys(types.regions).forEach(function(k) {
          var src = types.regions[k], dst = Cal.regions[k];
          if (!dst || !src || !Array.isArray(src.months) || src.months.length !== 12) return;
          dst.m = src.months.map(function(r, i) {
            var d = dst.m[i];
            return [r.season || d[0], r.high_f != null ? r.high_f : d[1], r.low_f != null ? r.low_f : d[2], r.icon || d[3], r.feel || d[4]];
          });
          if (src.climate) dst.climate = src.climate;
        });
      }
      Cal.conceptLoaded = true;
      return true;
    } catch (e) {
      return false;
    }
  };

  // fetchRows(table, query) must return a Promise of the JSON rows. dm.html
  // passes sccFetch; the wiki passes its own fetch wrapper.
  Cal.loadConcept = function(fetchRows) {
    return fetchRows('world_concepts', '&id=eq.anavale-calendar').then(function(rows) {
      var row = Array.isArray(rows) && rows[0];
      return Cal.applyConcept(row && row.types);
    }).catch(function() { return false; });
  };

  // ── Time math ─────────────────────────────────────────────────────
  var YEAR_DAYS = 365;
  Cal.monthStarts = function() {
    var out = [], acc = 0;
    Cal.months.forEach(function(m) { out.push(acc); acc += m.days; });
    return out;
  };
  // 0 = Shineday. Day index 189 (Julisun 9) is a Frogday (5).
  Cal.weekdayOfDay = function(day) { return (((day - 189) % 7) + 7 + 5) % 7; };
  Cal.periodIndex = function(h) { return (h < 5 || h >= 21) ? 0 : h < 12 ? 1 : h < 17 ? 2 : 3; };

  Cal.parts = function(mins) {
    mins = Math.max(0, Math.round(mins));
    var day = Math.floor(mins / 1440);
    var m = mins - day * 1440;
    var h = m / 60;
    var dy = ((day % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS, mi = 0;
    while (dy >= Cal.months[mi].days) { dy -= Cal.months[mi].days; mi++; }
    return { mins: mins, day: day, minOfDay: m, hour: h, monthIdx: mi, dom: dy + 1,
             weekday: Cal.weekdayOfDay(day), periodIdx: Cal.periodIndex(h), year: 312 + Math.floor(day / YEAR_DAYS) };
  };
  Cal.fromParts = function(monthIdx, dom, minOfDay) {
    return (Cal.monthStarts()[monthIdx] + dom - 1) * 1440 + (minOfDay || 0);
  };

  Cal.clockStr = function(minOfDay) {
    var m = ((Math.round(minOfDay) % 1440) + 1440) % 1440;
    var hh = Math.floor(m / 60), mm = m % 60;
    return ((hh % 12) || 12) + ':' + String(mm).padStart(2, '0') + ' ' + (hh < 12 ? 'AM' : 'PM');
  };
  Cal.dateStr = function(p) {
    return Cal.weekdays[p.weekday].name + ', ' + Cal.months[p.monthIdx].name + ' ' + p.dom;
  };
  // 100 -> "1 hr 40 min", 20 -> "20 min", 60 -> "1 hr"
  Cal.durStr = function(mins) {
    mins = Math.round(mins);
    var h = Math.floor(mins / 60), m = mins % 60;
    var out = [];
    if (h) out.push(h + ' hr');
    if (m || !h) out.push(m + ' min');
    return out.join(' ');
  };

  // Cosine curve between the month's low (5 AM) and high (3 PM).
  Cal.tempAt = function(regionKey, monthIdx, hour) {
    var r = Cal.regions[regionKey] || Cal.regions.caparia;
    var hi = r.m[monthIdx][1], lo = r.m[monthIdx][2];
    var f = (hour >= 5 && hour < 15) ? (hour - 5) / 10 : 1 - (((hour - 15) + 24) % 24) / 14;
    f = Math.max(0, Math.min(1, f));
    return Math.round(lo + (hi - lo) * (0.5 - 0.5 * Math.cos(Math.PI * f)));
  };
  Cal.tempWord = function(t) {
    for (var i = 0; i < TEMP_WORDS.length; i++) if (t < TEMP_WORDS[i][0]) return TEMP_WORDS[i][1];
    return TEMP_WORDS[TEMP_WORDS.length - 1][1];
  };

  // ── Colors (all resolved from css/tokens.css at call time) ────────
  function cssVar(name, fallback) {
    var v = '';
    try { v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) {}
    return v || fallback;
  }
  function parseRgb(str) {
    var m = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(str || '');
    return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
  }
  var TEMP_STOP_DEFAULT = [[-10, 'rgb(220,236,255)'], [24, 'rgb(143,200,255)'], [74, 'rgb(111,211,154)'], [96, 'rgb(239,91,91)'], [116, 'rgb(214,52,52)']];
  Cal.tempColor = function(t) {
    var stops = TEMP_STOP_DEFAULT.map(function(s, i) { return [s[0], parseRgb(cssVar('--cal-temp-' + i, s[1]))]; });
    if (t <= stops[0][0]) return 'rgb(' + stops[0][1].join(',') + ')';
    for (var i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        var a = stops[i - 1], b = stops[i], f = (t - a[0]) / (b[0] - a[0]);
        return 'rgb(' + a[1].map(function(v, j) { return Math.round(v + (b[1][j] - v) * f); }).join(',') + ')';
      }
    }
    return 'rgb(' + stops[stops.length - 1][1].join(',') + ')';
  };
  // Returns a CSS custom-property reference, e.g. 'var(--cal-season-winter)'.
  Cal.seasonVar = function(s) {
    var k = /winter|Cool/.test(s) ? 'winter' : /Monsoon|rains/.test(s) ? 'monsoon' : /Spring|Thaw|Warming/.test(s) ? 'spring'
          : /Scorching/.test(s) ? 'scorching' : /summer|Hot/.test(s) ? 'summer' : 'autumn';
    return 'var(--cal-season-' + k + ')';
  };
  Cal.iconUrl = function(k) { return Cal.weatherIconBase + 'wx-' + k + '.svg'; };

  // ── Tiny helpers shared by both UIs ───────────────────────────────
  Cal.esc = function(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  // Period icon SVG paths (rising sun, full sun, setting sun, moon).
  Cal.periodIconSvg = function(idx) {
    var open = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">';
    var icons = [
      '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"></path>',
      '<path d="M3 18h18"></path><path d="M7 18a5 5 0 0 1 10 0"></path><path d="M12 6v3"></path><path d="M5.6 10.6l1.4 1.4"></path><path d="M18.4 10.6L17 12"></path>',
      '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>',
      '<path d="M3 18h18"></path><path d="M7 18a5 5 0 0 1 10 0"></path><path d="M12 9v3"></path><path d="M9 6l3 3 3-3"></path>'
    ];
    return open + icons[idx] + '</svg>';
  };

  root.AnavaleCal = Cal;
  if (typeof module !== 'undefined' && module.exports) module.exports = Cal;
})(typeof window !== 'undefined' ? window : globalThis);
