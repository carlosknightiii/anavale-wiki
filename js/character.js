// ══════════════════════════════════════════════════════════════════
// ANAVALE CHARACTER CREATION — character.js
// Handles: stage navigation, localStorage draft, resume link,
//          name suggestions, appearance builder, form state,
//          duplicate check, GitHub API write, Formspree POST,
//          confirmation screen.
// ══════════════════════════════════════════════════════════════════

'use strict';

// ── CONFIGURATION ─────────────────────────────────────────────────
var CHAR_CONFIG = {
  formspree:    'https://formspree.io/f/xzdwaveg',
  github_token: '', // Injected at runtime from localStorage — never stored in repo
  github_repo:  'carlosknightiii/anavale-wiki',
  draft_key:    'anavale_char_draft',
  created_key:  'anavale_character_created',
  token_key:    'anavale_github_token',
  total_stages: 5
};

// Inject GitHub token from localStorage at runtime — set via DM Tools → Setup tab
(function() {
  var t = localStorage.getItem('anavale_github_token');
  if (t) CHAR_CONFIG.github_token = t;
})();

// ── STATE ──────────────────────────────────────────────────────────
var CHAR_STATE = {
  current_stage: 1,
  draft: {}
};

// ── INIT ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  checkAlreadyCreated();
  loadDraftFromStorage();
  loadDraftFromURL();
  renderProgress();
  renderSidebar();
  showStage(CHAR_STATE.current_stage);
  initStage1();
  initAutoSave();
  initTooltips();
});

// ── DUPLICATE CHECK ────────────────────────────────────────────────
function checkAlreadyCreated() {
  var token = localStorage.getItem(CHAR_CONFIG.created_key);
  if (token) {
    var banner = document.getElementById('char-already-exists');
    if (banner) {
      banner.style.display = 'flex';
      var link = banner.querySelector('.char-sheet-link');
      if (link) link.href = 'sheet/' + token + '.html';
    }
  }
}

// ── DRAFT PERSISTENCE ──────────────────────────────────────────────
function saveDraftToStorage() {
  try {
    localStorage.setItem(CHAR_CONFIG.draft_key, JSON.stringify(CHAR_STATE.draft));
  } catch(e) { console.warn('Draft save failed:', e); }
}

function loadDraftFromStorage() {
  try {
    var raw = localStorage.getItem(CHAR_CONFIG.draft_key);
    if (raw) {
      var parsed = JSON.parse(raw);
      CHAR_STATE.draft = parsed;
      if (parsed._stage && parsed._stage > 1) {
        CHAR_STATE.current_stage = parsed._stage;
        showReturnBanner();
      }
    }
  } catch(e) { console.warn('Draft load failed:', e); }
}

function loadDraftFromURL() {
  try {
    var params = new URLSearchParams(window.location.search);
    var encoded = params.get('draft');
    if (encoded) {
      var decoded = JSON.parse(atob(encoded));
      CHAR_STATE.draft = decoded;
      if (decoded._stage && decoded._stage > 1) {
        CHAR_STATE.current_stage = decoded._stage;
        showReturnBanner();
      }
    }
  } catch(e) {}
}

function generateResumeLink() {
  try {
    CHAR_STATE.draft._stage = CHAR_STATE.current_stage;
    var encoded = btoa(JSON.stringify(CHAR_STATE.draft));
    var url = window.location.origin + window.location.pathname + '?draft=' + encoded;
    navigator.clipboard.writeText(url).then(function() {
      showToast('Resume link copied to clipboard!');
    }).catch(function() {
      prompt('Copy this link to resume later:', url);
    });
  } catch(e) { console.warn('Resume link failed:', e); }
}

function showReturnBanner() {
  var banner = document.getElementById('char-return-banner');
  if (!banner) return;
  banner.classList.add('visible');
  requestAnimationFrame(function() {
    var h = banner.offsetHeight;
    var prog = document.getElementById('char-progress-wrap');
    if (prog) prog.style.top = h + 'px';
    var layout = document.querySelector('.char-layout');
    if (layout) layout.style.paddingTop = (h + 16) + 'px';
  });
}

function dismissReturnBanner() {
  var banner = document.getElementById('char-return-banner');
  if (!banner) return;
  banner.classList.remove('visible');
  var prog = document.getElementById('char-progress-wrap');
  if (prog) prog.style.top = '0';
  var layout = document.querySelector('.char-layout');
  if (layout) layout.style.paddingTop = '';
}

function resumeDraft() {
  var stage = (CHAR_STATE.draft._stage && CHAR_STATE.draft._stage > 1)
    ? CHAR_STATE.draft._stage
    : CHAR_STATE.current_stage;
  dismissReturnBanner();
  showStage(stage);
  initStageOnEnter(stage);
  // After banner dismisses and stage renders, scroll to top with chrome offset
  setTimeout(function() {
    var offset = 0;
    var prog = document.getElementById('char-progress-wrap');
    if (prog) offset += prog.offsetHeight;
    offset += 16;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  }, 100);
}

function initAutoSave() {
  // Save draft on every input change across the form
  document.addEventListener('input', function() {
    CHAR_STATE.draft._stage = CHAR_STATE.current_stage;
    saveDraftToStorage();
  });
  document.addEventListener('change', function() {
    CHAR_STATE.draft._stage = CHAR_STATE.current_stage;
    saveDraftToStorage();
  });
}

// ── WELCOME PANEL COLLAPSE ──────────────────────────────────────────
function toggleWelcomePanel(btn) {
  var body = document.getElementById('char-welcome-body');
  if (!body) return;
  var isCollapsed = body.classList.toggle('collapsed');
  var icon = btn.querySelector('.char-collapse-icon');
  if (isCollapsed) {
    btn.innerHTML = '<span class="char-collapse-icon">▼</span> Expand';
    btn.setAttribute('aria-expanded', 'false');
  } else {
    btn.innerHTML = '<span class="char-collapse-icon">▲</span> Collapse';
    btn.setAttribute('aria-expanded', 'true');
  }
}

// ── STAGE NAVIGATION ───────────────────────────────────────────────
function showStage(n) {
  var stages = document.querySelectorAll('.char-stage');
  stages.forEach(function(s) { s.classList.remove('active'); });
  var target = document.getElementById('char-stage-' + n);
  if (target) target.classList.add('active');
  CHAR_STATE.current_stage = n;
  if (!CHAR_STATE.highest_stage || n > CHAR_STATE.highest_stage) CHAR_STATE.highest_stage = n;
  CHAR_STATE.draft._stage = n;
  saveDraftToStorage();
  renderProgress();
  renderSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  initStageOnEnter(n);
}

function goNext() {
  if (!validateStage(CHAR_STATE.current_stage)) return;
  collectStageData(CHAR_STATE.current_stage);
  if (CHAR_STATE.current_stage < CHAR_CONFIG.total_stages) {
    showStage(CHAR_STATE.current_stage + 1);
  }
}

function goBack() {
  if (CHAR_STATE.current_stage > 1) {
    showStage(CHAR_STATE.current_stage - 1);
  }
}

function jumpToStage(n) {
  // Allow jumping to any stage the player has already reached
  var highest = CHAR_STATE.highest_stage || CHAR_STATE.current_stage;
  if (n <= highest) {
    collectStageData(CHAR_STATE.current_stage);
    showStage(n);
  }
}

function initStageOnEnter(n) {
  if (n === 2) initStage2();
  if (n === 3) { initAbilityScores(); restoreStage3Selections(); initAppearanceListeners(); renderStartingGear(); filterClothingByClass(CHAR_STATE.draft.class_id || ''); }
  if (n === 5) initStage5();
}

// ── PROGRESS BAR ───────────────────────────────────────────────────
function renderProgress() {
  var pct = ((CHAR_STATE.current_stage - 1) / (CHAR_CONFIG.total_stages - 1)) * 100;
  // Clamp to 10% minimum so bar is always visible
  pct = Math.max(10, pct);
  var bar = document.getElementById('char-progress-bar');
  if (bar) bar.style.width = pct + '%';
  var label = document.getElementById('char-progress-label');
  if (label) label.textContent = 'Stage ' + CHAR_STATE.current_stage + ' of ' + CHAR_CONFIG.total_stages;
}

// ── SIDEBAR ────────────────────────────────────────────────────────
var STAGE_NAMES = [
  '', // 0 unused
  'Your Gift',
  'Your Story',
  'Your Strengths',
  'Your Compass',
  'Who You Are'
];

function renderSidebar() {
  var highest = CHAR_STATE.highest_stage || CHAR_STATE.current_stage;
  for (var i = 1; i <= CHAR_CONFIG.total_stages; i++) {
    var el = document.getElementById('char-sidebar-stage-' + i);
    if (!el) continue;
    el.classList.remove('active', 'completed');
    if (i === CHAR_STATE.current_stage) {
      el.classList.add('active');
    } else if (i <= highest) {
      el.classList.add('completed');
    }
  }
}

// ── BACKGROUND DATA ────────────────────────────────────────────────
var ANAVALE_BACKGROUNDS = [
  {
    id: 'faithful', name: 'Faithful', phb: 'Acolyte',
    lore: 'You grew up inside one of Anavale\'s three faiths — the Brightcreed\'s color festivals, the Stillkeep\'s stone libraries, or the Veilborn\'s careful silences. You know the prayers, the practices, and the politics. You can also read pre-Partition script, which more people want than will admit it.',
    skills: ['Insight', 'Religion'],
    bonuses: ['+2 Int', '+1 Wis', 'Magic Initiate']
  },
  {
    id: 'streetwise', name: 'Streetwise', phb: 'Criminal',
    lore: 'You learned what you know in places that don\'t appear on official maps — back alleys, Grusk-adjacent markets, Nimblewood-adjacent neighborhoods. Not necessarily a bad person. Just someone who understands how the world actually moves when the Formery isn\'t watching.',
    skills: ['Deception', 'Stealth'],
    bonuses: ['+2 Dex', '+1 Int', 'Alert']
  },
  {
    id: 'learned', name: 'Learned', phb: 'Sage',
    lore: 'You spent years in one of Anavale\'s great collections of knowledge — the Great Index in Lightcrak, a Stillkeep archive, the Chroma Bureau\'s public records. You know more than most people want to know about things most people have never heard of. This has been both useful and isolating.',
    skills: ['Arcana', 'History'],
    bonuses: ['+2 Int', '+1 Wis', 'Keen Mind']
  },
  {
    id: 'tested', name: 'Tested', phb: 'Soldier',
    lore: 'You served — in a Confederation guard company, a Nombi honor corps, a Sohot desert patrol, or a fighting company attached to the Wanderkeep. You know how to follow orders, how to give them, and exactly which situations require which. The grey you\'ve seen may or may not have been the Vareth kind.',
    skills: ['Athletics', 'Intimidation'],
    bonuses: ['+2 Str', '+1 Con', 'Savage Attacker']
  },
  {
    id: 'wellborn', name: 'Wellborn', phb: 'Noble',
    lore: 'You come from one of Anavale\'s established families — a Confederation merchant house, a Sohot ceremonial lineage, a Nombi honor clan. You know how rooms full of powerful people work. You also know exactly what those people are willing to do to stay powerful, which is information the Formery would file under Form 9-C (Societal Leverage, Observed).',
    skills: ['History', 'Persuasion'],
    bonuses: ['+2 Cha', '+1 Int', 'Skilled']
  },
  {
    id: 'rootborn', name: 'Rootborn', phb: 'Folk Hero',
    lore: 'You\'re from a small place — Pebbleshire, a Bunari fishing village, a Zippydoda Hills farm — and something happened there that made people look at you differently. You didn\'t ask for it. You\'re not sure you deserved it. But the Pocketmoles have always found you specifically, and you\'ve stopped pretending that doesn\'t mean something.',
    skills: ['Animal Handling', 'Survival'],
    bonuses: ['+2 Con', '+1 Cha', 'Tough']
  },
  {
    id: 'masquerader', name: 'Masquerader', phb: 'Charlatan',
    lore: 'You\'ve worn more faces than you\'ve had homes — not because you\'re dishonest, exactly, but because the truth has never been your most useful tool. You know how documents are forged, how confidence works, and which Formery office is least likely to verify anything. The Nimblewood finds your skills interesting. You haven\'t decided how you feel about that.',
    skills: ['Deception', 'Sleight of Hand'],
    bonuses: ['+2 Cha', '+1 Dex', 'Skilled']
  },
  {
    id: 'reveler', name: 'Reveler', phb: 'Entertainer',
    lore: 'You grew up in The Revel, in a traveling troupe, or in Reveltown itself — surrounded by performance, color, and the particular chaos of people trying to make other people feel something. You know how to read a crowd, fill a silence, and make a room forget the grey for one night. Whether you\'re Veilborn-adjacent is something you\'ve stopped asking yourself.',
    skills: ['Acrobatics', 'Performance'],
    bonuses: ['+2 Cha', '+1 Dex', 'Inspiring Leader']
  },
  {
    id: 'craftborn', name: 'Craftborn', phb: 'Guild Artisan',
    lore: 'You trained under a master in one of the Zippan guilds, a Dingurei paper house, or a Stonemarked workshop in the Jani Mountains. You know how to make something from nothing, how guild politics work, and that the difference between a good piece and a great one is always the part nobody sees.',
    skills: ['Insight', 'Persuasion'],
    bonuses: ['+2 Int', '+1 Cha', 'Skilled']
  },
  {
    id: 'stillsought', name: 'Stillsought', phb: 'Hermit',
    lore: 'You spent a significant portion of your life alone — in a Stillkeep mountain retreat, in the deep Opu Forest near the Patient One, in a Nombi winter with only the aurora for company. You were looking for something. You may have found it. What you found has made you either very calm or very certain about something nobody else seems certain about yet.',
    skills: ['Medicine', 'Religion'],
    bonuses: ['+2 Wis', '+1 Con', 'Magic Initiate']
  },
  {
    id: 'wildborn', name: 'Wildborn', phb: 'Outlander',
    lore: 'The Dodooti Rainforest, the Nombi deep forest, the Wraithfell Tundra, the Jani Mountain passes — you grew up in one of these, or spent enough time there to change how you think. The Gigglegloom reads differently in the wild. Purer. Louder. You know what it sounds like when it\'s healthy and you know what the silence means when it isn\'t.',
    skills: ['Athletics', 'Survival'],
    bonuses: ['+2 Str', '+1 Wis', 'Tough']
  },
  {
    id: 'tidemarked', name: 'Tidemarked', phb: 'Sailor',
    lore: 'You know the Bunbun Bay, the Salindri Sea, the Glacial Sea off Nombi\'s coast, or the Golden Sea south of Sohot. Ships, currents, weather, the way Shimmer Rays surface before a storm and what that means. The Bunari consider the sea a living thing and treat it accordingly. You may not be Bunari, but you\'ve spent enough time on their ships to understand why.',
    skills: ['Athletics', 'Perception'],
    bonuses: ['+2 Str', '+1 Dex', 'Tavern Brawler']
  },
  {
    id: 'cobblewise', name: 'Cobblewise', phb: 'Urchin',
    lore: 'You grew up in the margins of one of Anavale\'s cities — Mirrenport\'s lower docks, Bumbleton\'s market back-alleys, the parts of Solenveil that don\'t appear in the Formery\'s official maps. You know how a city actually works, where to sleep when you have nothing, and which doors to knock on when you need help. A Pocketmole found you every time you were at your lowest. You still don\'t know what to make of that.',
    skills: ['Sleight of Hand', 'Stealth'],
    bonuses: ['+2 Dex', '+1 Wis', 'Lucky']
  },
  {
    id: 'greywitnessed', name: 'Greywitnessed', phb: 'Haunted One',
    lore: 'You were there when the grey arrived somewhere it shouldn\'t have been. A town that was fine last season. A creature that stopped humming. A person you loved who started forgetting why things were worth caring about. You didn\'t cause it. You couldn\'t stop it. But you saw it, and seeing it changed what you\'re willing to do. The Hollowmoth appeared. You remember exactly what it looked like.',
    skills: ['Arcana', 'Survival'],
    bonuses: ['+2 Wis', '+1 Str', 'Alert']
  },
  {
    id: 'threadpuller', name: 'Threadpuller', phb: 'Investigator',
    lore: 'You worked for the Chroma Bureau, the Dingurei Great Index, a Wanderkeep anomaly division, or simply had a mind that couldn\'t leave an unanswered question alone. You notice what\'s missing from a scene as readily as what\'s present. The Gigglegloom leaves traces everywhere, and you\'ve learned to read them like a language most people don\'t know exists.',
    skills: ['Insight', 'Investigation'],
    bonuses: ['+2 Int', '+1 Wis', 'Keen Mind']
  },
  {
    id: 'ringscarred', name: 'Ringscarred', phb: 'Gladiator',
    lore: 'You fought in the arenas — the Vokrath fighting pits in Sohot, the honor-bout circles of Nombi, the Caparia traveling tournaments that follow the festival circuit. You know how to perform violence and how to make it look like something else entirely. The crowd\'s color surges when you win. You\'ve noticed it dims slightly when you lose — not much, but enough to notice. You think about that.',
    skills: ['Athletics', 'Performance'],
    bonuses: ['+2 Str', '+1 Cha', 'Savage Attacker']
  }
];

// ── STAGE 1: GIGGLEGLOOM TYPE + CLASS ──────────────────────────────
var GIGGLEGLOOM_TYPES = {
  bubbleseed: {
    name: 'Bubbleseed',
    element: 'Earth · Growth · Joy',
    desc: 'Warm, generous, and emotionally invested in everything it touches. Tends to overshoot — ask for a flower, receive twelve. Smells like fresh soil after rain.',
    classes: [
      { id: 'druid', name: 'The Verdant', flavor: 'You speak to the living world and it speaks back. Your magic grows things, heals things, and occasionally starts a small garden where you didn\'t intend one.', sensory: 'Your magic smells like rain on warm earth.' },
      { id: 'cleric', name: 'The Faithful', flavor: 'Your magic comes through devotion — to Oro, to Nara, to the idea that color is worth protecting. The Gigglegloom responds to your sincerity.', sensory: 'Your magic feels like warmth spreading from the chest outward.' },
      { id: 'paladin', name: 'The Warden', flavor: 'You made a promise. The Gigglegloom heard it and decided to help you keep it. Your magic is purpose made visible.', sensory: 'Your magic sounds like a single clear bell note.' }
    ]
  },
  featherflow: {
    name: 'Featherflow',
    element: 'Wind · Water · Freedom',
    desc: 'Never goes straight. Values freedom above everything and will subtly resist anything that feels like a cage. Can counteract early Fading.',
    classes: [
      { id: 'ranger', name: 'The Wanderer', flavor: 'You know how to read the color of a place before you arrive. The Wanderkeep would recruit you — they may already be watching.', sensory: 'Your magic sounds like wind through tall grass.' },
      { id: 'rogue', name: 'The Nimble', flavor: 'You move through the world lightly, taking only what you need and leaving fewer traces than most. The Gigglegloom moves with you, not ahead of you.', sensory: 'Your magic is almost silent — a shift in air pressure, nothing more.' },
      { id: 'bard', name: 'The Reveler', flavor: 'You make things feel something. The Revel would call this a gift. The Vareth calls it a threat.', sensory: 'Your magic sounds like the first note of a song everyone already knows.' }
    ]
  },
  steelfist: {
    name: 'Steelfist',
    element: 'Metal · Resolve · Order',
    desc: 'Does exactly what it is told. Rewards discipline and punishes sloppiness. Its grey shines — do not confuse it with the Dimming\'s flat grey.',
    classes: [
      { id: 'fighter', name: 'The Tested', flavor: 'You know how to stand in the way of something and not move. The Gigglegloom has decided this is admirable.', sensory: 'Your magic feels like the moment before a door opens.' },
      { id: 'monk', name: 'The Still', flavor: 'Your body is the instrument. Your discipline is the music. The Gigglegloom has stopped trying to improvise around you.', sensory: 'Your magic is geometrically precise — right angles, clean edges.' },
      { id: 'wizard', name: 'The Learned', flavor: 'You studied until the Gigglegloom respected you. This took longer than it takes most people, and you are proud of it.', sensory: 'Your magic smells faintly of old books and cold metal.' }
    ]
  },
  flamerage: {
    name: 'Flamerage',
    element: 'Fire · Destruction · Fury',
    desc: 'Responds to emotion before intent. Spectacular in every sense. The only type that can temporarily overpower Stage 1 Fading.',
    classes: [
      { id: 'sorcerer', name: 'The Sparked', flavor: 'The Gigglegloom chose you, not the other way around. It has been with you since before you understood what it was.', sensory: 'Your magic smells like something about to catch fire.' },
      { id: 'warlock', name: 'The Bound', flavor: 'You made an agreement with something old. The terms were worth it. Probably.', sensory: 'Your magic feels like a promise being kept under significant pressure.' },
      { id: 'barbarian', name: 'The Furious', flavor: 'When you are angry enough, the Gigglegloom agrees with you. This is both useful and occasionally alarming.', sensory: 'Your magic sounds like the moment before a storm breaks.' }
    ]
  }
};

function initStage1() {
  var typeGrid = document.getElementById('char-type-grid');
  if (!typeGrid) return;

  typeGrid.innerHTML = Object.keys(GIGGLEGLOOM_TYPES).map(function(typeId) {
    var t = GIGGLEGLOOM_TYPES[typeId];
    return '<div class="char-type-card" data-type="' + typeId + '" onclick="selectType(\'' + typeId + '\')">'
      + '<div class="char-type-check">✓</div>'
      + '<div class="char-type-header">'
      + '<img class="char-type-icon" src="assets/icons/icon-' + typeId + '.svg" alt="' + t.name + '">'
      + '<div class="char-type-meta">'
      + '<div class="char-type-name">' + t.name + '</div>'
      + '<div class="char-type-element">' + t.element + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="char-type-desc">' + t.desc + '</div>'
      + '</div>';
  }).join('');

  // Restore selection from draft
  if (CHAR_STATE.draft.gigglegloom_type) {
    selectType(CHAR_STATE.draft.gigglegloom_type, true);
  }
  if (CHAR_STATE.draft.class_id) {
    restoreClassSelection(CHAR_STATE.draft.class_id);
  }
}

// ── SCROLL HELPER — accounts for fixed progress bar + optional banner ──
function scrollToField(el) {
  if (!el) return;
  var offset = 0;
  var prog = document.getElementById('char-progress-wrap');
  if (prog) offset += prog.offsetHeight;
  var banner = document.getElementById('char-return-banner');
  if (banner && banner.classList.contains('visible')) offset += banner.offsetHeight;
  offset += 64; // breathing room
  var top = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: top, behavior: 'smooth' });
}

function selectType(typeId, silent) {
  // Update card UI
  document.querySelectorAll('.char-type-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.type === typeId);
  });

  // Show class panel
  var t = GIGGLEGLOOM_TYPES[typeId];
  if (!t) return;

  var panel = document.getElementById('char-class-panel');
  if (panel) {
    panel.classList.add('visible');
    var classGrid = document.getElementById('char-class-grid');
    if (classGrid) {
      classGrid.innerHTML = t.classes.map(function(cls) {
        return '<div class="char-class-card" data-class="' + cls.id + '" onclick="selectClass(\'' + cls.id + '\')">'
          + '<div class="char-class-name">' + cls.name + '</div>'
          + '<div class="char-class-flavor">' + cls.flavor + '</div>'
          + '<div class="char-class-sensory">' + cls.sensory + '</div>'
          + '</div>';
      }).join('');
    }
  }

  if (!silent) {
    CHAR_STATE.draft.gigglegloom_type = typeId;
    CHAR_STATE.draft.class_id = null; // reset class when type changes
    saveDraftToStorage();
    // Scroll to class picker
    setTimeout(function() {
      scrollToField(document.getElementById('char-class-panel'));
    }, 80);
  }
}

function selectClass(classId) {
  document.querySelectorAll('.char-class-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.class === classId);
  });
  CHAR_STATE.draft.class_id = classId;
  saveDraftToStorage();
  // Scroll to the Continue button after class is chosen
  setTimeout(function() {
    scrollToField(document.querySelector('#char-stage-1 .char-nav'));
  }, 80);
}

function restoreClassSelection(classId) {
  var card = document.querySelector('.char-class-card[data-class="' + classId + '"]');
  if (card) card.classList.add('selected');
}

// ── STAGE 2: BACKGROUND + SPECIES ──────────────────────────────────
function initStage2() {
  renderBackgroundCards();
  renderSpeciesCards();
  restoreStage2Selections();
}

function renderBackgroundCards() {
  var grid = document.getElementById('char-background-grid');
  if (!grid) return;
  grid.innerHTML = ANAVALE_BACKGROUNDS.map(function(bg) {
    var bonusHtml = bg.bonuses.map(function(b) {
      return '<span class="char-bg-bonus-pill">' + b + '</span>';
    }).join('');
    return '<div class="char-bg-card" data-bg="' + bg.id + '">'
      + '<div class="char-bg-header" onclick="selectBackground(\'' + bg.id + '\')">'
      +   '<div class="char-bg-header-info">'
      +     '<div class="char-bg-name">' + bg.name + '</div>'
      +     '<div class="char-bg-phb">' + bg.phb + '</div>'
      +   '</div>'
      +   '<div class="char-bg-header-right">'
      +     '<div class="char-bg-bonuses">' + bonusHtml + '</div>'
      +     '<div class="char-bg-check">✓</div>'
      +     '<button class="char-bg-toggle" onclick="event.stopPropagation();toggleBgCard(this)" aria-label="Toggle details">Expand</button>'
      +   '</div>'
      + '</div>'
      + '<div class="char-bg-body">'
      +   '<div class="char-bg-lore">' + bg.lore + '</div>'
      +   '<div class="char-bg-skills"><span class="char-bg-skill-label">Skills</span> ' + bg.skills.join(' · ') + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

function toggleBgCard(btn) {
  var card = btn.closest('.char-bg-card');
  if (!card) return;
  var expanding = !card.classList.contains('expanded');
  card.classList.toggle('expanded');
  btn.classList.toggle('open');
  btn.textContent = expanding ? 'Collapse' : 'Expand';
}

// ── SPECIES DATA ───────────────────────────────────────────────────
var ANAVALE_SPECIES = [
  {
    id: 'solmeri', name: 'Solmeri', phb: 'Human',
    region: 'Everywhere',
    affinity: 'Adaptable — no dominant type',
    desc: 'Solmeri are found in every corner of Anavale, shaped by wherever they were born rather than any single magical tradition. They carry the Gigglegloom lightly, which means it fits them in whatever way they need it to.'
  },
  {
    id: 'verdathi', name: 'Verdathi', phb: 'Elf',
    region: 'Dingu, Opu & Dodooti Forests',
    affinity: 'Featherflow, Bubbleseed',
    desc: 'Verdathi grow up in the old forests where the Gigglegloom pools deepest. They move like they have time — because in the forests, they do. Most are unhurried in a way that others sometimes mistake for indifference.'
  },
  {
    id: 'stonemarked', name: 'Stonemarked', phb: 'Dwarf',
    region: 'Jani Mountains, Tanaki Peaks',
    affinity: 'Steelfist',
    desc: 'Stonemarked are carved from the same stubbornness as the mountains they come from. Their Gigglegloom runs in straight lines and holds its shape under pressure. They find this satisfying. Others find it occasionally alarming.'
  },
  {
    id: 'glimmerkin', name: 'Glimmerkin', phb: 'Gnome',
    region: 'Bumbleton, Prismhold, Zippydoda Hills',
    affinity: 'Bubbleseed, Steelfist',
    desc: 'Glimmerkin are the reason half the Conclave\'s safety protocols exist. Their magic is precise and enthusiastic simultaneously, which produces results that are either brilliant or spectacular, sometimes both at once.'
  },
  {
    id: 'hearthbound', name: 'Hearthbound', phb: 'Halfling',
    region: 'Pebbleshire, Mirrenport, Caparia',
    affinity: 'Bubbleseed',
    desc: 'Hearthbound carry warmth the way other people carry weapons — automatically and without thinking much about it. Their Gigglegloom responds to belonging and comfort. They are very difficult to discourage.'
  },
  {
    id: 'duskborn', name: 'Duskborn', phb: 'Tiefling',
    region: 'Veilhaven, Reveltown, scattered',
    affinity: 'Flamerage, shadow-adjacent',
    desc: 'Duskborn carry something old in their blood — a resonance with the edges of the Gigglegloom that most people never touch. This makes them interesting at parties and occasionally unsettling in quiet rooms.'
  },
  {
    id: 'brightblood', name: 'Brightblood', phb: 'Aasimar',
    region: 'Brightcreed temples, Solenveil',
    affinity: 'Bubbleseed, Oro resonance',
    desc: 'Brightblood carry a trace of Oro\'s attention — not a blessing exactly, more like being quietly watched by something that loves you. Their Gigglegloom is warm and difficult to extinguish, even when they are.'
  },
  {
    id: 'scalegrace', name: 'Scalegrace', phb: 'Dragonborn',
    region: 'Sohot volcanic, Caparia trade cities',
    affinity: 'Flamerage',
    desc: 'Scalegrace come from a tradition that treats fire as a conversation rather than a weapon. Their Gigglegloom runs hot and expressive. They are rarely subtle and have mostly made peace with this.'
  },
  {
    id: 'tallwalker', name: 'Tallwalker', phb: 'Goliath',
    region: 'Doopu Peaks, Tanaki, Jani Mountains',
    affinity: 'Steelfist, Flamerage',
    desc: 'Tallwalkers grow up where the weather is a daily negotiation and the ground does not forgive mistakes. Their magic reflects this — solid, purposeful, and with very little patience for anything decorative.'
  },
  {
    id: 'rootwalker', name: 'Rootwalker', phb: 'Orc',
    region: 'Jugabi, outer Dingu Forest',
    affinity: 'Bubbleseed, Flamerage',
    desc: 'Rootwalkers carry two currents that most people assume cancel each other out. They do not. The result is someone who grows things and protects them with the same intensity, which the Jugabi rainforest finds completely reasonable.'
  },
  {
    id: 'veilstepped', name: 'Veilstepped', phb: 'Changeling',
    region: 'Everywhere, documented nowhere',
    affinity: 'Featherflow, Solvara-adjacent',
    desc: 'Veilstepped are the only species that the Chroma Bureau has consistently failed to count. Their Gigglegloom moves like water around whatever shape is needed. They are not hiding. They are simply not particularly invested in being found.'
  },
  {
    id: 'gloomtouched', name: 'Gloomtouched', phb: 'Warforged',
    region: 'Prismhold, Conclave sites',
    affinity: 'Steelfist',
    desc: 'Gloomtouched were made rather than born, constructed at Conclave sites where Steelfist magic runs deep. They experience the Gigglegloom as something woven into their structure rather than something they carry. The distinction matters to them.'
  }
];

function renderSpeciesCards() {
  if (typeof window.renderSpeciesCardsImpl === 'function') {
    window.renderSpeciesCardsImpl();
  }
}

window.renderSpeciesCardsImpl = function() {
  var grid = document.getElementById('char-species-grid');
  if (!grid) return;
  grid.innerHTML = ANAVALE_SPECIES.map(function(sp) {
    return '<div class="char-bg-card" data-species="' + sp.id + '">'
      + '<div class="char-bg-header" onclick="selectSpecies(\'' + sp.id + '\')">'
      +   '<div class="char-bg-header-info">'
      +     '<div class="char-bg-name">' + sp.name + '</div>'
      +     '<div class="char-bg-phb">' + sp.phb + '</div>'
      +   '</div>'
      +   '<div class="char-bg-header-right">'
      +     '<div class="char-bg-bonuses"><span class="char-bg-bonus-pill">' + sp.affinity + '</span></div>'
      +     '<div class="char-bg-check">✓</div>'
      +     '<button class="char-bg-toggle" onclick="event.stopPropagation();toggleBgCard(this)" aria-label="Toggle details">Expand</button>'
      +   '</div>'
      + '</div>'
      + '<div class="char-bg-body">'
      +   '<div class="char-bg-lore">' + sp.desc + '</div>'
      +   '<div class="char-bg-skills"><span class="char-bg-skill-label">Region</span> ' + sp.region + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
};

function selectSpecies(speciesId) {
  document.querySelectorAll('#char-species-grid .char-bg-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.species === speciesId);
  });
  var selectedCard = document.querySelector('#char-species-grid .char-bg-card[data-species="' + speciesId + '"]');
  if (selectedCard && !selectedCard.classList.contains('expanded')) {
    selectedCard.classList.add('expanded');
    var toggleBtn = selectedCard.querySelector('.char-bg-toggle');
    if (toggleBtn) { toggleBtn.classList.add('open'); toggleBtn.textContent = 'Collapse'; }
  }
  CHAR_STATE.draft.species_id = speciesId;
  var hidden = document.getElementById('char-species');
  if (hidden) hidden.value = speciesId;
  saveDraftToStorage();
  setTimeout(function() {
    var target = document.getElementById('char-home-region-section') || document.getElementById('char-home-region');
    scrollToField(target);
  }, 80);
}

function selectBackground(bgId) {
  document.querySelectorAll('.char-bg-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.bg === bgId);
  });
  // Auto-expand the selected card if it isn't already open
  var selectedCard = document.querySelector('.char-bg-card[data-bg="' + bgId + '"]');
  if (selectedCard && !selectedCard.classList.contains('expanded')) {
    selectedCard.classList.add('expanded');
    var toggleBtn = selectedCard.querySelector('.char-bg-toggle');
    if (toggleBtn) { toggleBtn.classList.add('open'); toggleBtn.textContent = 'Collapse'; }
  }
  CHAR_STATE.draft.background_id = bgId;
  var hidden = document.getElementById('char-background');
  if (hidden) hidden.value = bgId;
  saveDraftToStorage();
  // Scroll past the background grid to the species section
  setTimeout(function() {
    var target = document.getElementById('char-species-section') || document.getElementById('char-species');
    scrollToField(target);
  }, 80);
}

function restoreStage2Selections() {
  if (CHAR_STATE.draft.background_id) {
    selectBackground(CHAR_STATE.draft.background_id);
  }
  if (CHAR_STATE.draft.species_id) {
    if (typeof selectSpecies === 'function') selectSpecies(CHAR_STATE.draft.species_id);
  }

  // Restore simple option cards (region, language)
  var simpleFields = [
    { field: 'char-home-region', saveKey: 'home_region' },
    { field: 'char-language',    saveKey: 'language'    }
  ];
  simpleFields.forEach(function(f) {
    var val = CHAR_STATE.draft[f.saveKey];
    if (!val) return;
    var hidden = document.getElementById(f.field);
    if (hidden) hidden.value = val;
    var container = document.querySelector('.char-option-cards[data-field="' + f.field + '"]');
    if (!container) return;
    container.querySelectorAll('.char-option-card').forEach(function(card) {
      card.classList.toggle('selected', card.dataset.value === val);
    });
  });

  // Restore past question cards
  var pastFields = [
    { past: 'raised',       draftKey: 'past_raised'       },
    { past: 'friend',       draftKey: 'past_friend'       },
    { past: 'pet',          draftKey: 'past_pet'          },
    { past: 'love',         draftKey: 'past_love'         },
    { past: 'org',          draftKey: 'past_org'          },
    { past: 'left-behind',  draftKey: 'past_left-behind'  },
    { past: 'why-left',     draftKey: 'past_why-left'     }
  ];
  pastFields.forEach(function(f) {
    var val = CHAR_STATE.draft[f.draftKey];
    if (!val) return;
    var container = document.querySelector('.char-option-cards[data-past="' + f.past + '"]');
    if (!container) return;
    var matched = null;
    container.querySelectorAll('.char-option-card').forEach(function(card) {
      var isMatch = card.dataset.value === val;
      card.classList.toggle('selected', isMatch);
      if (isMatch) matched = card;
    });
    // Restore hidden input
    var fieldId = container.dataset.field;
    var hidden = document.getElementById(fieldId);
    if (hidden) hidden.value = val;
    // Restore effect preview
    if (matched) {
      var effect = matched.dataset.effect || '';
      var preview = document.getElementById('effect-' + f.past);
      if (preview && effect) {
        preview.textContent = '✦ ' + effect;
        preview.classList.add('visible');
      }
      // Mark question answered
      var questionEl = document.getElementById('past-q-' + f.past);
      if (questionEl) questionEl.classList.add('answered');
    }
  });
}

// ── STAGE VALIDATION ───────────────────────────────────────────────
function validateStage(n) {
  if (n === 1) {
    if (!CHAR_STATE.draft.gigglegloom_type) {
      showToast('Please choose a Gigglegloom type first.');
      return false;
    }
    if (!CHAR_STATE.draft.class_id) {
      showToast('Please choose a class within your Gigglegloom type.');
      return false;
    }
  }
  if (n === 2) {
    if (!CHAR_STATE.draft.background_id) {
      showToast('Please choose a background.');
      return false;
    }
    if (!CHAR_STATE.draft.species_id) {
      showToast('Please choose a species.');
      return false;
    }
  }
  if (n === 3) {
    var abilities = ['str','dex','con','int','wis','cha'];
    var allAssigned = abilities.every(function(ab) {
      return document.getElementById('char-ability-' + ab).value !== '';
    });
    if (!allAssigned) {
      showToast('Please assign all six ability scores before continuing.');
      return false;
    }
  }
  if (n === 4) {
    if (!CHAR_STATE.draft.alignment) {
      showToast('Please choose an alignment.');
      return false;
    }
  }
  return true;
}

// ── STAGE DATA COLLECTION ──────────────────────────────────────────
function collectStageData(n) {
  if (n === 2) collectStage2Data();
  if (n === 3) collectStage3Data();
  if (n === 4) collectStage4Data();
  if (n === 5) collectStage5Data();
}

function collectStage2Data() {
  CHAR_STATE.draft.background_id = getVal('char-background');
  CHAR_STATE.draft.species_id    = getVal('char-species');
  CHAR_STATE.draft.language      = getVal('char-language');
  // Imagined past
  CHAR_STATE.draft.who_raised_you     = getVal('char-raised');
  CHAR_STATE.draft.dearest_friend     = getVal('char-friend');
  CHAR_STATE.draft.had_pet            = getVal('char-pet');
  CHAR_STATE.draft.fallen_in_love     = getVal('char-love');
  CHAR_STATE.draft.organization       = getVal('char-org');
  CHAR_STATE.draft.left_behind        = getVal('char-left-behind');
  CHAR_STATE.draft.why_you_left       = getVal('char-why-left');
}

function collectStage3Data() {
  CHAR_STATE.draft.ability_scores = {
    str: parseInt(getVal('char-ability-str')) || 10,
    dex: parseInt(getVal('char-ability-dex')) || 10,
    con: parseInt(getVal('char-ability-con')) || 10,
    int: parseInt(getVal('char-ability-int')) || 10,
    wis: parseInt(getVal('char-ability-wis')) || 10,
    cha: parseInt(getVal('char-ability-cha')) || 10
  };
  // Appearance
  CHAR_STATE.draft.appearance_data = collectAppearanceData();
  CHAR_STATE.draft.appearance_prompt = buildAIPrompt(CHAR_STATE.draft.appearance_data);
  // Personality
  CHAR_STATE.draft.personality_immediate = getVal('char-personality-1');
  CHAR_STATE.draft.personality_wrong     = getVal('char-personality-2');
  CHAR_STATE.draft.personality_laugh     = getVal('char-personality-3');
}

function collectStage4Data() {
  CHAR_STATE.draft.alignment       = getVal('char-alignment') || CHAR_STATE.draft.alignment;
  CHAR_STATE.draft.alignment_trait = CHAR_STATE.draft.alignment_trait || null;
}

function collectStage5Data() {
  CHAR_STATE.draft.character_name  = getVal('char-final-name');
  CHAR_STATE.draft.gender          = getVal('char-gender');
  CHAR_STATE.draft.cares_about     = getVal('char-cares-about');
  CHAR_STATE.draft.deepest_fear    = getVal('char-fear');
  CHAR_STATE.draft.seeking         = getVal('char-seeking');
}

// ── CLASS STARTING GEAR (PHB 2024) ────────────────────────────────
var CLASS_STARTING_GEAR = {
  barbarian: {
    armor: 'Explorer\'s Pack',
    weapons: ['Greataxe', 'Two handaxes', '4 javelins'],
    note: 'No starting armor — AC = 10 + Dex + Con modifier while unarmored'
  },
  bard: {
    armor: 'Leather Armor',
    weapons: ['Rapier', 'Dagger'],
    note: 'Entertainer\'s Pack + musical instrument of your choice'
  },
  cleric: {
    armor: 'Scale Mail',
    weapons: ['Mace', 'Shield'],
    note: 'Priest\'s Pack + Holy Symbol'
  },
  druid: {
    armor: 'Leather Armor',
    weapons: ['Quarterstaff', 'Shield'],
    note: 'Explorer\'s Pack + Druidic Focus (no metal armor)'
  },
  fighter: {
    armor: 'Chain Mail',
    weapons: ['Longsword', 'Shield', 'Light Crossbow + 20 bolts'],
    note: 'Dungeoneer\'s Pack'
  },
  monk: {
    armor: null,
    weapons: ['Shortsword', '5 darts'],
    note: 'Dungeoneer\'s Pack — AC = 10 + Dex + Wis while unarmored'
  },
  paladin: {
    armor: 'Chain Mail',
    weapons: ['Longsword', 'Shield', 'Javelin (×5)'],
    note: 'Priest\'s Pack + Holy Symbol'
  },
  ranger: {
    armor: 'Scale Mail',
    weapons: ['Longsword', 'Two shortswords', 'Longbow + 20 arrows'],
    note: 'Explorer\'s Pack'
  },
  rogue: {
    armor: 'Leather Armor',
    weapons: ['Rapier', 'Shortbow + 20 arrows', 'Dagger (×2)'],
    note: 'Burglar\'s Pack + Thieves\' Tools'
  },
  sorcerer: {
    armor: null,
    weapons: ['Light Crossbow + 20 bolts', 'Dagger (×2)'],
    note: 'Dungeoneer\'s Pack + Arcane Focus'
  },
  warlock: {
    armor: 'Leather Armor',
    weapons: ['Light Crossbow + 20 bolts', 'Dagger (×2)'],
    note: 'Scholar\'s Pack + Arcane Focus'
  },
  wizard: {
    armor: null,
    weapons: ['Quarterstaff', 'Dagger'],
    note: 'Scholar\'s Pack + Spellbook + Arcane Focus'
  }
};

// Stat data for clothing options (used by stat chip display)
var CLOTHING_STATS = {
  // app-top
  'plate armour':        { ac: 'AC 18', weight: 'Heavy', note: 'Str 15 req · Stealth ⚠' },
  'chainmail shirt':     { ac: 'AC 16', weight: 'Heavy', note: 'Str 13 req · Stealth ⚠' },
  'scale mail':          { ac: 'AC 14 + Dex (max +2)', weight: 'Medium', note: 'Stealth ⚠' },
  'breastplate':         { ac: 'AC 14 + Dex (max +2)', weight: 'Medium', note: '' },
  'leather armour':      { ac: 'AC 11 + Dex', weight: 'Light', note: '' },
  'studded leather':     { ac: 'AC 12 + Dex', weight: 'Light', note: '' },
  'padded gambeson':     { ac: 'AC 11 + Dex', weight: 'Light', note: 'Stealth ⚠' },
  'leather jerkin':      { ac: 'AC 11 + Dex', weight: 'Light', note: '' },
  // unarmored / no mechanical stats — intentionally omitted; chip shows nothing
};

// Clothing options by armor tier (controls app-top options)
var CLOTHING_TIERS = {
  unarmored: [
    { value: '',                    label: '— choose —' },
    { value: 'robes',               label: 'Robes' },
    { value: 'arcane vestments',    label: 'Arcane vestments' },
    { value: 'simple tunic',        label: 'Simple tunic' },
    { value: "monk's gi",           label: "Monk's gi" },
    { value: 'wrapped cloth',       label: 'Wrapped cloth' },
    { value: 'linen shirt',         label: 'Linen shirt' }
  ],
  light: [
    { value: 'leather jerkin',      label: 'Leather jerkin' },
    { value: 'studded leather',     label: 'Studded leather' },
    { value: 'padded gambeson',     label: 'Padded gambeson' },
    { value: "traveller's coat",    label: "Traveller's coat" }
  ],
  medium: [
    { value: 'scale mail',          label: 'Scale mail' },
    { value: 'chainmail shirt',     label: 'Chain shirt' },
    { value: 'breastplate',         label: 'Breastplate' },
    { value: 'ranger\'s mail',      label: "Ranger's mail" }
  ],
  heavy: [
    { value: 'plate armour',        label: 'Plate armour' },
    { value: 'half-plate cuirass',  label: 'Half-plate cuirass' },
    { value: 'splint coat',         label: 'Splint coat' }
  ]
};

// Lower-body options by tier
var LOWER_TIERS = {
  unarmored: [
    { value: '',                      label: '— choose —' },
    { value: 'trousers',              label: 'Trousers' },
    { value: 'a long skirt',          label: 'Long skirt' },
    { value: 'a skirt',               label: 'Skirt' },
    { value: 'wrapped cloth lower',   label: 'Wrapped cloth' },
    { value: 'flowing robes',         label: 'Flowing robes' }
  ],
  light: [
    { value: 'leather breeches',      label: 'Leather breeches' }
  ],
  medium: [],
  heavy: [
    { value: 'armoured greaves',      label: 'Armoured greaves' }
  ]
};

// Which tier each class can reach
var CLASS_ARMOR_TIER = {
  barbarian: 'medium',
  bard:      'light',
  cleric:    'medium',
  druid:     'medium',
  fighter:   'heavy',
  monk:      'unarmored',
  paladin:   'heavy',
  ranger:    'medium',
  rogue:     'light',
  sorcerer:  'unarmored',
  warlock:   'light',
  wizard:    'unarmored'
};

var TIER_ORDER = ['unarmored', 'light', 'medium', 'heavy'];

function getTiersUpTo(maxTier) {
  var maxIdx = TIER_ORDER.indexOf(maxTier);
  return TIER_ORDER.slice(0, maxIdx + 1);
}

function filterClothingByClass(cls) {
  var maxTier  = CLASS_ARMOR_TIER[cls] || 'unarmored';
  var tiers    = getTiersUpTo(maxTier);

  // Rebuild app-top
  var topSel = document.getElementById('app-top');
  if (topSel) {
    var topCurrent = topSel.value;
    topSel.innerHTML = '';
    tiers.forEach(function(tier) {
      (CLOTHING_TIERS[tier] || []).forEach(function(opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        topSel.appendChild(o);
      });
    });
    // Re-select previous value if still valid, else blank
    if (topCurrent && topSel.querySelector('option[value="' + topCurrent + '"]')) {
      topSel.value = topCurrent;
    } else {
      topSel.value = '';
    }
    updateGearStatChip('app-top', 'app-top-stat');
  }

  // Rebuild app-lower
  var lowSel = document.getElementById('app-lower');
  if (lowSel) {
    var lowCurrent = lowSel.value;
    lowSel.innerHTML = '';
    tiers.forEach(function(tier) {
      (LOWER_TIERS[tier] || []).forEach(function(opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        lowSel.appendChild(o);
      });
    });
    if (lowCurrent && lowSel.querySelector('option[value="' + lowCurrent + '"]')) {
      lowSel.value = lowCurrent;
    } else {
      lowSel.value = '';
    }
    updateGearStatChip('app-lower', 'app-lower-stat');
  }
}

function updateGearStatChip(selectId, chipId) {
  var sel  = document.getElementById(selectId);
  var chip = document.getElementById(chipId);
  if (!sel || !chip) return;
  var stats = CLOTHING_STATS[sel.value];
  if (!stats) {
    chip.innerHTML = '';
    chip.style.display = 'none';
    return;
  }
  var html = '<span class="char-stat-chip char-stat-chip--ac">' + stats.ac + '</span>'
           + '<span class="char-stat-chip char-stat-chip--weight">' + stats.weight + '</span>';
  if (stats.note) {
    html += '<span class="char-stat-chip char-stat-chip--note">' + stats.note + '</span>';
  }
  chip.innerHTML = html;
  chip.style.display = 'flex';
}

function renderStartingGear() {
  var panel = document.getElementById('char-starting-gear-panel');
  if (!panel) return;

  var cls = CHAR_STATE.draft.char_class;
  var bg  = CHAR_STATE.draft.background;

  if (!cls) {
    panel.innerHTML = '<p class="char-gear-empty">Go back to Stage 1 to choose your class — your starting gear will appear here.</p>';
    return;
  }

  var gear = CLASS_STARTING_GEAR[cls];
  if (!gear) { panel.innerHTML = ''; return; }

  // Resolve display name from ANAVALE_CLASSES data
  var clsLabel = cls.charAt(0).toUpperCase() + cls.slice(1);
  GIGGLEGLOOM_TYPES && Object.values(GIGGLEGLOOM_TYPES).forEach(function(type) {
    (type.classes || []).forEach(function(c) {
      if (c.id === cls) clsLabel = c.name + ' (' + cls.charAt(0).toUpperCase() + cls.slice(1) + ')';
    });
  });

  var bgLabel = '';
  if (bg && typeof ANAVALE_BACKGROUNDS !== 'undefined') {
    var bgObj = ANAVALE_BACKGROUNDS.find(function(b) { return b.id === bg; });
    if (bgObj) bgLabel = bgObj.name;
  }

  var itemsHtml = gear.weapons.map(function(w) {
    return '<div class="char-gear-item"><span class="char-gear-icon">⚔</span>' + w + '</div>';
  }).join('');

  if (gear.armor) {
    itemsHtml = '<div class="char-gear-item"><span class="char-gear-icon">🛡</span>' + gear.armor + '</div>' + itemsHtml;
  } else {
    itemsHtml = '<div class="char-gear-item char-gear-item--note"><span class="char-gear-icon">○</span>No armor — ' + gear.note.split('—')[1].trim() + '</div>' + itemsHtml;
  }

  itemsHtml += '<div class="char-gear-item char-gear-item--pack"><span class="char-gear-icon">🎒</span>' + gear.note.split('·')[0].trim() + '</div>';

  panel.innerHTML =
    '<div class="char-gear-header">'
    + '<span class="char-gear-label">Starting gear — ' + clsLabel + (bgLabel ? ' · ' + bgLabel : '') + '</span>'
    + '<span class="char-gear-sublabel">This gear is yours automatically. No choices needed.</span>'
    + '</div>'
    + '<div class="char-gear-items">' + itemsHtml + '</div>';
}

function initAppearanceListeners() {
  var ids = ['app-height','app-build','app-age','app-face-shape',
             'app-eye-color','app-eye-shape','app-facial-hair',
             'app-hair-color','app-hair-style','app-cloak','app-top',
             'app-lower','app-shoes','app-hat','app-accessory','app-jewelry'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', updateAIPrompt);
  });
  var skinTone = document.getElementById('app-skin-tone');
  if (skinTone) skinTone.addEventListener('input', updateAIPrompt);
  var topSel = document.getElementById('app-top');
  if (topSel) topSel.addEventListener('change', function() { updateGearStatChip('app-top', 'app-top-stat'); });
  var lowSel = document.getElementById('app-lower');
  if (lowSel) lowSel.addEventListener('change', function() { updateGearStatChip('app-lower', 'app-lower-stat'); });
  document.querySelectorAll('input[name="app-markings"]').forEach(function(cb) {
    cb.addEventListener('change', updateAIPrompt);
  });
}

// ── APPEARANCE DATA ────────────────────────────────────────────────
function collectAppearanceData() {
  return {
    height:           getVal('app-height'),
    build:            getVal('app-build'),
    age:              getVal('app-age'),
    skin_tone:        getVal('app-skin-tone'),
    face_shape:       getVal('app-face-shape'),
    eye_color:        getVal('app-eye-color'),
    eye_shape:        getVal('app-eye-shape'),
    glasses:          getVal('app-glasses'),
    facial_hair:      getVal('app-facial-hair'),
    facial_markings:  getChecked('app-markings'),
    hair_color:       getVal('app-hair-color'),
    hair_style:       getVal('app-hair-style'),
    cloak:            getVal('app-cloak'),
    top:              getVal('app-top'),
    lower:            getVal('app-lower'),
    shoes:            getVal('app-shoes'),
    hat:              getVal('app-hat'),
    accessory:        getVal('app-accessory'),
    jewelry:          getVal('app-jewelry')
  };
}

function buildAIPrompt(d) {
  if (!d) return '';
  var parts = ['Fantasy portrait of'];
  if (d.height)     parts.push(d.height);
  if (d.build)      parts.push(d.build);
  if (d.age)        parts.push(d.age);
  if (d.skin_tone)  parts.push('with ' + d.skin_tone + ' skin');
  if (d.face_shape) parts.push(d.face_shape + ' face');
  if (d.eye_color && d.eye_shape) parts.push(d.eye_shape + ' ' + d.eye_color + ' eyes');
  if (d.hair_color && d.hair_style) parts.push(d.hair_style + ' ' + d.hair_color + ' hair');
  if (d.facial_markings && d.facial_markings.length) parts.push(d.facial_markings.join(' and '));
  if (d.cloak && d.cloak !== 'none') parts.push('wearing a ' + d.cloak + ' cloak');
  if (d.top)   parts.push('over a ' + d.top);
  if (d.lower) parts.push('and ' + d.lower);
  if (d.jewelry) parts.push(d.jewelry);
  parts.push('Soft warm lighting. Anavale high fantasy style.');
  return parts.join(', ') + '.';
}

// ── STAGE 5: NAME SUGGESTIONS ──────────────────────────────────────
var NAME_LISTS = {
  solmeri:    ['Aela','Bram','Corra','Davi','Enne','Fallin','Goss','Hana','Idris','Jorra','Kael','Lira','Maren','Nico','Oryn','Pella','Quill','Reva','Sable','Tomas','Ula','Vesper','Wren','Xara','Yori','Zell'],
  verdathi:   ['Aelindra','Brethyn','Caliveth','Duronel','Elowyn','Farathen','Gilvara','Haelith','Ilyndor','Joreveth','Kaelindra','Lorveth','Maliveth','Norethyn','Orilindra','Perathyn','Quiveth','Raelowyn','Silvindra','Thaliveth','Ulyndor','Varithen','Wyrathyn'],
  stonemarked:['Aldrik','Borra','Duvrak','Edda','Forgna','Gundra','Heldrik','Ingra','Jolvrak','Korra','Lundrik','Morra','Nuldra','Olvrak','Pergna','Ruldrik','Sigra','Tholvrak','Uldra','Vorgna','Weldrik','Yuldra'],
  glimmerkin: ['Albi','Bixby','Cippi','Daffi','Elbix','Fippi','Gibbi','Hibix','Ippi','Jibbi','Kippi','Libix','Mibby','Nibbi','Obbix','Pippi','Quibby','Ribix','Sibbi','Tibby','Ubbi','Vibbi','Wibbix','Yibbi'],
  hearthbound:['Aldwell','Bessa','Corra','Delwin','Essie','Farrow','Gillie','Hessa','Idwell','Jorra','Kessa','Lidwell','Messa','Norwin','Orrie','Perwell','Ressa','Salwin','Tessa','Ulwell','Vessa','Welwin','Yessa'],
  duskborn:   ['Asmara','Braxis','Carven','Draeva','Embrix','Faraxis','Graeven','Haedrix','Ibraxis','Joraven','Kaelix','Maevra','Naedrix','Obraxis','Phaedrix','Raeven','Saedrix','Thaevra','Valix','Waedrix','Xaevra'],
  brightblood:['Auren','Brael','Caelia','Dauren','Elauri','Fauren','Gaelia','Hauren','Iaeli','Jauren','Kaelia','Lauren','Maeli','Nauren','Pauren','Raelia','Sauren','Taeli','Vauren','Waelia','Yauren','Zaeli'],
  scalegrace: ['Arathos','Braxis','Carathon','Draveth','Erathos','Faraxon','Grathos','Haraxon','Irathon','Joraxos','Karathos','Laraxon','Marathos','Naraxon','Orathos','Pharaxon','Rarathos','Saraxon','Tarathos','Varathos'],
  tallwalker: ['Aldrak','Borrna','Duvrak','Edrak','Forgna','Gordrak','Heldrak','Ingrak','Jolvrak','Kordrak','Lundrak','Mordrak','Nuldrak','Oldrak','Perdrak','Ruldrak','Sordrak','Tholdrak','Uldrak','Vordrak'],
  rootwalker: ['Arog','Brega','Drog','Egra','Groka','Hroga','Iroga','Jroka','Kroga','Mroga','Nroka','Oroga','Proka','Sroka','Troga','Uroka','Vroga','Wroka','Yroga','Zroka'],
  veilstepped:['Ash','Blur','Chime','Dusk','Echo','Fade','Ghost','Haze','Ink','Jest','Knell','Loom','Mist','Null','Ombre','Pale','Quiet','Riddle','Shade','Thorn','Umbra','Veil','Wisp','Yarn','Zero'],
  gloomtouched:['Anchor','Basalt','Cipher','Ember','Forge','Granite','Hollow','Iron','Jasper','Lattice','Mortar','Null','Obsidian','Prism','Quartz','Relic','Slate','Tether','Umbra','Vestige','Weld','Xenon']
};

function suggestNames() {
  var species = CHAR_STATE.draft.species_id || 'solmeri';
  var list = NAME_LISTS[species] || NAME_LISTS.solmeri;
  var shuffled = list.slice().sort(function() { return Math.random() - 0.5; });
  var picks = shuffled.slice(0, 5);
  var container = document.getElementById('char-name-suggestions');
  if (!container) return;
  container.innerHTML = picks.map(function(n) {
    return '<button class="char-name-pill" onclick="useNameSuggestion(\'' + n + '\')">' + n + '</button>';
  }).join('');
}

function useNameSuggestion(name) {
  var input = document.getElementById('char-final-name');
  if (input) { input.value = name; input.dispatchEvent(new Event('input')); }
}

// ── STAGE 5: INIT ──────────────────────────────────────────────────
function initStage5() {
  // Auto-generate summary
  generateSummary();
  // Pre-fill name if in draft
  if (CHAR_STATE.draft.character_name) {
    var nameInput = document.getElementById('char-final-name');
    if (nameInput) nameInput.value = CHAR_STATE.draft.character_name;
  }
  // Show initial name suggestions
  suggestNames();
}

function generateSummary() {
  var d = CHAR_STATE.draft;

  // ── Label lookups — convert raw keys to human-readable text ──
  var WHY_LEFT_LABELS = {
    'someone-disappeared': 'left home searching for someone who disappeared',
    'saw-the-grey':        'left after watching the grey arrive somewhere they thought was safe',
    'received-message':    'left after receiving a message that couldn\'t be ignored',
    'ran-from-something':  'left running from something they haven\'t named yet',
    'restlessness':        'left because the world was out there and staying felt impossible'
  };
  var LEFT_BEHIND_LABELS = {
    'person':   'a person they loved',
    'promise':  'a promise they didn\'t keep',
    'self':     'a version of themselves they can\'t return to',
    'place':    'a place that no longer exists',
    'nothing':  null
  };
  var RAISED_LABELS = {
    'kind-parents':     'raised by people who loved them well',
    'the-streets':      'raised by no one in particular — the streets taught them everything',
    'strict-religious': 'raised inside a strict faith that left its mark',
    'single-parent':    'raised by a single parent who worked too hard to complain about it',
    'grandparent':      'raised by a grandparent or elder who remembered things worth remembering'
  };
  var ALIGNMENT_LABELS = {
    'brightward':  'They believe the world is worth protecting, and they intend to be someone others can count on.',
    'colorful':    'They want to do right by people — they\'ve just never been good at following someone else\'s idea of how.',
    'greywarden':  'They see all sides. They weigh things carefully. They don\'t think the world divides neatly into light and dark.',
    'steelbound':  'They do what they said they would do. They consider this uncomplicated.',
    'ashwalker':   'They do what works for them, and they try to be honest about that.'
  };
  var SPECIES_LABELS = {
    'solmeri':     'Solmeri',
    'verdathi':    'Verdathi',
    'stonemarked': 'Stonemarked',
    'glimmerkin':  'Glimmerkin',
    'hearthbound': 'Hearthbound',
    'duskborn':    'Duskborn',
    'brightblood': 'Brightblood',
    'scalegrace':  'Scalegrace',
    'tallwalker':  'Tallwalker',
    'rootwalker':  'Rootwalker',
    'veilstepped': 'Veilstepped',
    'gloomtouched':'Gloomtouched'
  };

  // ── Resolve values ──
  var type = d.gigglegloom_type || 'bubbleseed';
  var typeData = GIGGLEGLOOM_TYPES[type];
  var typeName = typeData ? typeData.name : type;
  var classId = d.class_id || '';
  var cls = null;
  if (typeData) {
    typeData.classes.forEach(function(c) { if (c.id === classId) cls = c; });
  }
  var className  = cls ? cls.name : classId;
  var region     = d.home_region || 'Caparia';
  var speciesLabel  = SPECIES_LABELS[d.species_id] || d.species_id || '';
  var whyLeft       = WHY_LEFT_LABELS[d.why_you_left] || '';
  var leftBehind    = LEFT_BEHIND_LABELS[d.left_behind] || null;
  var raisedLabel   = RAISED_LABELS[d.who_raised_you] || '';
  var alignmentLine = ALIGNMENT_LABELS[d.alignment] || '';

  // ── Build narrative ──
  // Sentence 1: who they are
  var s1 = '';
  if (speciesLabel && className && typeName) {
    s1 = 'A ' + speciesLabel + ' ' + className + ' who carries the ' + typeName + ' — ';
  } else if (className && typeName) {
    s1 = 'A ' + className + ' who carries the ' + typeName + ' — ';
  } else {
    s1 = 'A practitioner of ' + typeName + ' magic — ';
  }
  if (raisedLabel) {
    s1 += raisedLabel + ', from ' + region + '.';
  } else {
    s1 += 'from ' + region + '.';
  }

  // Sentence 2: why they left and what they carry
  var s2 = '';
  if (whyLeft && leftBehind) {
    s2 = 'They ' + whyLeft + ', and they carry with them ' + leftBehind + '.';
  } else if (whyLeft) {
    s2 = 'They ' + whyLeft + '.';
  } else if (leftBehind) {
    s2 = 'They carry with them ' + leftBehind + '.';
  }

  // Sentence 3: alignment
  var s3 = alignmentLine || '';

  var summary = [s1, s2, s3].filter(Boolean).join(' ');

  var el = document.getElementById('char-auto-summary');
  if (el) el.textContent = summary;
  CHAR_STATE.draft.summary = summary;
}

// ── ALIGNMENT SELECTION ────────────────────────────────────────────
function selectAlignment(alignmentId) {
  CHAR_STATE.draft.alignment = alignmentId;
  document.querySelectorAll('.char-alignment-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.alignment === alignmentId);
  });
  saveDraftToStorage();
  // Scroll to the selected card's trait picker
  setTimeout(function() {
    var selected = document.querySelector('.char-alignment-card.selected');
    if (selected) {
      scrollToField(selected.querySelector('.char-alignment-traits') || selected);
    }
  }, 80);
}

function selectAlignmentTrait(el, trait) {
  // Deselect others in same card
  var card = el.closest('.char-alignment-card');
  if (card) {
    card.querySelectorAll('.char-alignment-trait').forEach(function(t) {
      t.classList.remove('selected');
    });
  }
  el.classList.add('selected');
  CHAR_STATE.draft.alignment_trait = trait;
  saveDraftToStorage();
}

// ── SUBMIT ─────────────────────────────────────────────────────────
async function submitCharacter() {
  var btn = document.getElementById('char-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    collectStageData(5);
    var d = CHAR_STATE.draft;

    // Basic validation
    if (!d.character_name || d.character_name.trim() === '') {
      showToast('Please enter a name for your character.');
      if (btn) { btn.disabled = false; btn.textContent = '✦ · BEGIN YOUR STORY · ✦'; }
      return;
    }

    // Generate token
    var token = generateToken();

    // Build character entry
    var entry = buildCharacterEntry(d, token);

    // 1. Write to GitHub
    var githubOk = await writeToGitHub(entry);
    if (!githubOk) throw new Error('GitHub write failed');

    // 2. Send to Formspree
    await sendToFormspree(entry);

    // 3. Mark as created locally
    localStorage.setItem(CHAR_CONFIG.created_key, token);
    localStorage.removeItem(CHAR_CONFIG.draft_key);

    // 4. Show confirmation
    showConfirmation(entry, token);

  } catch(err) {
    console.error('Submission error:', err);
    showSubmitError();
    if (btn) { btn.disabled = false; btn.textContent = '✦ · BEGIN YOUR STORY · ✦'; }
  }
}

function generateToken() {
  var arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(function(b) { return b.toString(16).padStart(2,'0'); }).join('');
}

function buildCharacterEntry(d, token) {
  return {
    id: slugify(d.character_name || 'player') + '-' + token.slice(0,6),
    name: d.character_name,
    pc: true,
    player_email: d.player_email || '',
    token: token,
    level: 1,
    class_id: d.class_id,
    class_gigglegloom: d.gigglegloom_type,
    species: d.species_id,
    background_id: d.background_id,
    alignment: d.alignment,
    alignment_trait: d.alignment_trait,
    home_region: d.home_region || 'Caparia',
    ability_scores: d.ability_scores || { str:10, dex:10, con:10, int:10, wis:10, cha:10 },
    language_extra: d.language,
    summary: d.summary || '',
    appearance_prompt: d.appearance_prompt || '',
    appearance_data: d.appearance_data || {},
    personality_immediate: d.personality_immediate,
    personality_wrong: d.personality_wrong,
    personality_laugh: d.personality_laugh,
    who_raised_you: d.who_raised_you,
    dearest_friend: d.dearest_friend,
    had_pet: d.had_pet,
    fallen_in_love: d.fallen_in_love,
    organization_joined: d.organization,
    left_behind: d.left_behind,
    why_you_left: d.why_you_left,
    cares_about: d.cares_about,
    deepest_fear: d.deepest_fear,
    seeking: d.seeking,
    gender: d.gender,
    category: 'player-character',
    player_facing: false,
    tags: ['player-character', d.gigglegloom_type || '', d.species_id || ''].filter(Boolean)
  };
}

async function writeToGitHub(entry) {
  try {
    // Read current file
    var getRes = await fetch(
      'https://api.github.com/repos/' + CHAR_CONFIG.github_repo + '/contents/data/characters.js',
      { headers: { 'Authorization': 'Bearer ' + CHAR_CONFIG.github_token, 'Accept': 'application/vnd.github.v3+json' } }
    );
    if (!getRes.ok) return false;
    var fileData = await getRes.json();
    var currentContent = atob(fileData.content.replace(/\n/g,''));
    var sha = fileData.sha;

    // Duplicate email check
    if (entry.player_email && currentContent.indexOf(entry.player_email) >= 0) {
      showToast('A character with that email already exists. Check your bookmark for your sheet link.');
      return false;
    }

    // Append new entry before closing ];
    var insertPoint = currentContent.lastIndexOf('];');
    if (insertPoint === -1) return false;

    var entryStr = '\n  ' + JSON.stringify(entry, null, 2).split('\n').join('\n  ');
    // Handle comma — add after previous entry if array not empty
    var hasEntries = currentContent.slice(0, insertPoint).trim().slice(-1) !== '[';
    var newContent = currentContent.slice(0, insertPoint)
      + (hasEntries ? ',\n' : '\n')
      + entryStr + '\n'
      + currentContent.slice(insertPoint);

    // Write back
    var putRes = await fetch(
      'https://api.github.com/repos/' + CHAR_CONFIG.github_repo + '/contents/data/characters.js',
      {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + CHAR_CONFIG.github_token,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: 'feat: add player character ' + (entry.name || 'new'),
          content: btoa(unescape(encodeURIComponent(newContent))),
          sha: sha
        })
      }
    );
    return putRes.ok;
  } catch(e) {
    console.error('GitHub write error:', e);
    return false;
  }
}

async function sendToFormspree(entry) {
  try {
    await fetch(CHAR_CONFIG.formspree, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        character_name:   entry.name,
        gigglegloom_type: entry.class_gigglegloom,
        class:            entry.class_id,
        species:          entry.species,
        background:       entry.background_id,
        alignment:        entry.alignment,
        region:           entry.home_region,
        who_raised_you:   entry.who_raised_you,
        dearest_friend:   entry.dearest_friend,
        organization:     entry.organization_joined,
        left_behind:      entry.left_behind,
        why_you_left:     entry.why_you_left,
        deepest_fear:     entry.deepest_fear,
        seeking:          entry.seeking,
        token:            entry.token,
        _subject:         'New Anavale Character: ' + entry.name
      })
    });
  } catch(e) { console.warn('Formspree send failed (non-fatal):', e); }
}

function showConfirmation(entry, token) {
  var screen = document.getElementById('char-confirmation');
  if (!screen) return;
  screen.classList.add('visible');

  // Name
  var nameEl = document.getElementById('char-confirm-name');
  if (nameEl) nameEl.textContent = entry.name;

  // Type line — gigglegloom · class · species
  var typeEl = document.getElementById('char-confirm-type');
  if (typeEl) {
    var typeName = entry.class_gigglegloom
      ? entry.class_gigglegloom.charAt(0).toUpperCase() + entry.class_gigglegloom.slice(1)
      : '';
    var className = entry.class_id
      ? entry.class_id.charAt(0).toUpperCase() + entry.class_id.slice(1)
      : '';
    var speciesName = entry.species
      ? entry.species.charAt(0).toUpperCase() + entry.species.slice(1)
      : '';
    typeEl.textContent = [typeName, className, speciesName].filter(Boolean).join(' · ');
  }

  // Sheet URL
  var sheetUrl = window.location.origin + '/anavale-wiki/sheet/' + token + '.html';
  var urlEl = document.getElementById('char-confirm-url');
  if (urlEl) urlEl.textContent = sheetUrl;

  // Open sheet link
  var sheetLink = document.getElementById('char-confirm-sheet-link');
  if (sheetLink) sheetLink.href = sheetUrl;

  // Copy button
  var copyBtn = document.getElementById('char-confirm-copy-btn');
  if (copyBtn) {
    copyBtn.onclick = function() {
      navigator.clipboard.writeText(sheetUrl).then(function() {
        copyBtn.textContent = 'Copied!';
        setTimeout(function() { copyBtn.textContent = 'Copy Link'; }, 2500);
      });
    };
  }

  // Spawn particles
  var particleContainer = document.getElementById('char-confirm-particles');
  if (particleContainer) {
    var colors = ['#e8c84a','#e87a8a','#9a70e8','#4ac8b8','#f8e888'];
    for (var i = 0; i < 28; i++) {
      (function() {
        var p = document.createElement('div');
        p.className = 'char-confirmation-particle';
        var size = Math.random() * 4 + 2;
        p.style.cssText = [
          'width:' + size + 'px',
          'height:' + size + 'px',
          'left:' + Math.random() * 100 + '%',
          'background:' + colors[Math.floor(Math.random() * colors.length)],
          'animation-duration:' + (Math.random() * 8 + 6) + 's',
          'animation-delay:' + (Math.random() * 10) + 's'
        ].join(';');
        particleContainer.appendChild(p);
      })();
    }
  }
}

function showSubmitError() {
  var fallback = document.getElementById('char-submit-error');
  if (fallback) {
    fallback.style.display = 'block';
    var copyBtn = fallback.querySelector('.char-copy-answers');
    if (copyBtn) {
      copyBtn.onclick = function() {
        var text = JSON.stringify(CHAR_STATE.draft, null, 2);
        navigator.clipboard.writeText(text).then(function() {
          showToast('Answers copied to clipboard.');
        });
      };
    }
  }
}

// ── UTILITIES ──────────────────────────────────────────────────────
function getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getChecked(name) {
  var checked = document.querySelectorAll('input[name="' + name + '"]:checked');
  return Array.from(checked).map(function(c) { return c.value; });
}

function slugify(str) {
  return (str || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function showToast(msg) {
  var toast = document.getElementById('char-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(function() { toast.classList.remove('visible'); }, 3000);
}

// ── TOOLTIP SYSTEM ────────────────────────────────────────────────
// Stub — tooltip logic now lives in an inline <script> block in character.html.
function initTooltips() {}

// Wire tooltip behaviour onto any element that has data-tip set.
// Mirrors the logic in the inline <script> block in character.html.
function wireTooltip(el) {
  var box = null;
  function show() {
    if (box) return;
    box = document.createElement('div');
    box.textContent = el.dataset.tip;
    box.setAttribute('style', [
      'position:fixed',
      'z-index:99999',
      'width:220px',
      'background:#0a0e18',
      'border:1px solid rgba(200,148,10,0.7)',
      'border-radius:6px',
      'padding:10px 14px',
      'font-size:13px',
      'line-height:1.5',
      'color:rgba(245,234,212,0.9)',
      'pointer-events:none',
      'box-shadow:0 4px 16px rgba(0,0,0,0.7)',
      'visibility:hidden',
      'top:0',
      'left:0'
    ].join(';'));
    document.body.appendChild(box);
    var bh   = box.offsetHeight || 60;
    var r    = el.getBoundingClientRect();
    var left = r.left + r.width / 2 - 110;
    if (left < 8) left = 8;
    if (left + 220 > window.innerWidth - 8) left = window.innerWidth - 228;
    var top  = r.top - bh - 8;
    if (top  < 8) top  = r.bottom + 8;
    box.style.top        = top  + 'px';
    box.style.left       = left + 'px';
    box.style.visibility = 'visible';
  }
  function hide() { if (box) { box.remove(); box = null; } }
  el.addEventListener('mouseenter', show);
  el.addEventListener('mouseleave', hide);
  el.addEventListener('click', function(e) {
    e.stopPropagation();
    if (box) { hide(); } else { show(); }
  });
}

// ── ABILITY SCORE DRAG AND DROP ───────────────────────────────
var ABILITY_SCORES = [15, 14, 13, 12, 10, 8];

function initAbilityScores() {
  resetAbilityScores();
  initAbilityDragDrop();
}

function resetAbilityScores() {
  // Restore bank chips
  var bank = document.getElementById('char-score-bank');
  if (!bank) return;
  bank.innerHTML = '';
  ABILITY_SCORES.forEach(function(score) {
    var chip = document.createElement('div');
    chip.className = 'char-score-chip';
    chip.draggable = true;
    chip.dataset.score = score;
    chip.textContent = score;
    bank.appendChild(chip);
  });
  // Clear all ability cards
  ['str','dex','con','int','wis','cha'].forEach(function(ab) {
    setAbilityScore(ab, null);
  });
  initAbilityDragDrop();
}

function setAbilityScore(ability, score) {
  var scoreEl = document.getElementById('ability-score-' + ability);
  var modEl   = document.getElementById('ability-mod-'   + ability);
  var hidden  = document.getElementById('char-ability-'  + ability);
  var card    = document.getElementById('ability-card-'  + ability);
  if (!scoreEl) return;
  if (score === null || score === undefined || score === '') {
    scoreEl.innerHTML = '<span class="char-ability-drop-target">drop here</span>';
    if (modEl)  modEl.textContent  = '';
    var modLabelEl = document.getElementById('ability-mod-label-' + ability);
    if (modLabelEl) modLabelEl.innerHTML = '';
    if (hidden) hidden.value = '';
    if (card)   card.dataset.score = '';
  } else {
    var n   = parseInt(score);
    var mod = Math.floor((n - 10) / 2);
    // Place a draggable chip on the card so the player can drag it back
    var chip = document.createElement('div');
    chip.className = 'char-score-chip';
    chip.draggable = true;
    chip.dataset.score = n;
    chip.textContent = n;
    chip.addEventListener('dragstart', onChipDragStart);
    chip.addEventListener('dragend',   onChipDragEnd);
    scoreEl.innerHTML = '';
    scoreEl.appendChild(chip);
    if (modEl)  modEl.textContent  = (mod >= 0 ? '+' : '') + mod;
    chip.dataset.tip = 'A score of ' + n + ' gives you a ' + (mod >= 0 ? '+' : '') + mod + ' to any roll using this ability.';
    wireTooltip(chip);
    var modLabelEl = document.getElementById('ability-mod-label-' + ability);
    if (modLabelEl) {
      modLabelEl.innerHTML = '<span class="char-field-tooltip" data-tip="This number is your roll bonus — it gets added (or subtracted) whenever you make a dice roll using this ability.">ⓘ</span>';
      wireTooltip(modLabelEl.querySelector('.char-field-tooltip'));
    }
    if (hidden) hidden.value = n;
    if (card)   card.dataset.score = n;
  }
}

function initAbilityDragDrop() {
  // Re-wire all chips (bank + any placed chips)
  document.querySelectorAll('.char-score-chip').forEach(function(chip) {
    chip.addEventListener('dragstart', onChipDragStart);
    chip.addEventListener('dragend',   onChipDragEnd);
  });
  // Wire ability cards as drop targets
  document.querySelectorAll('.char-ability-card').forEach(function(card) {
    card.addEventListener('dragover',  onCardDragOver);
    card.addEventListener('dragleave', onCardDragLeave);
    card.addEventListener('drop',      onCardDrop);
  });
  // Wire bank as drop target (for returning chips)
  var bank = document.getElementById('char-score-bank');
  if (bank) {
    bank.addEventListener('dragover',  function(e) { e.preventDefault(); bank.style.borderColor = 'var(--gold)'; });
    bank.addEventListener('dragleave', function()  { bank.style.borderColor = ''; });
    bank.addEventListener('drop',      onBankDrop);
  }
  // Touch support
  initAbilityTouchDrag();
}

var _dragScore = null;
var _dragSource = null; // 'bank' or ability id

function onChipDragStart(e) {
  _dragScore  = this.dataset.score;
  _dragSource = this.closest('.char-ability-card') ? this.closest('.char-ability-card').dataset.ability : 'bank';
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', _dragScore);
}

function onChipDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.char-ability-card').forEach(function(c) { c.classList.remove('drag-over'); });
  var bank = document.getElementById('char-score-bank');
  if (bank) bank.style.borderColor = '';
}

function onCardDragOver(e) {
  e.preventDefault();
  this.classList.add('drag-over');
}

function onCardDragLeave() {
  this.classList.remove('drag-over');
}

function onCardDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  var targetAbility = this.dataset.ability;
  var incomingScore = _dragScore;
  if (!incomingScore) return;

  // Read existing score from card before we change anything
  var existingScore = this.dataset.score;

  // Clear source
  if (_dragSource && _dragSource !== 'bank') {
    // Dragged from another card — clear that card
    setAbilityScore(_dragSource, null);
  } else {
    // Dragged from bank — remove the chip from the bank
    var bank = document.getElementById('char-score-bank');
    if (bank) {
      var bankChip = bank.querySelector('[data-score="' + incomingScore + '"]');
      if (bankChip) bankChip.remove();
    }
  }

  // If target card already had a score, return it to the bank
  if (existingScore && existingScore !== '') {
    addChipToBank(existingScore);
  }

  // Place incoming score on target card
  setAbilityScore(targetAbility, incomingScore);
  saveDraftToStorage();
  updateAIPrompt();
}

function onBankDrop(e) {
  e.preventDefault();
  var bank = document.getElementById('char-score-bank');
  if (bank) bank.style.borderColor = '';
  if (!_dragScore) return;
  // Only act if dragged from a card (not from bank itself)
  if (_dragSource && _dragSource !== 'bank') {
    setAbilityScore(_dragSource, null);
    addChipToBank(_dragScore);
    saveDraftToStorage();
  }
}

function addChipToBank(score) {
  var bank = document.getElementById('char-score-bank');
  if (!bank) return;
  // Don't add duplicates
  if (bank.querySelector('[data-score="' + score + '"]')) return;
  var chip = document.createElement('div');
  chip.className = 'char-score-chip';
  chip.draggable = true;
  chip.dataset.score = score;
  chip.textContent = score;
  chip.addEventListener('dragstart', onChipDragStart);
  chip.addEventListener('dragend',   onChipDragEnd);
  bank.appendChild(chip);
  // Re-sort bank chips in descending order
  var chips = Array.from(bank.querySelectorAll('.char-score-chip'));
  chips.sort(function(a,b) { return parseInt(b.dataset.score) - parseInt(a.dataset.score); });
  chips.forEach(function(c) { bank.appendChild(c); });
}

// Touch drag support (mobile)
function initAbilityTouchDrag() {
  var touchChip = null;
  var touchClone = null;

  document.querySelectorAll('.char-score-chip').forEach(function(chip) {
    chip.addEventListener('touchstart', function(e) {
      touchChip = chip;
      _dragScore  = chip.dataset.score;
      _dragSource = chip.closest('.char-ability-card') ? chip.closest('.char-ability-card').dataset.ability : 'bank';
      // Create floating clone
      var rect = chip.getBoundingClientRect();
      touchClone = chip.cloneNode(true);
      touchClone.style.cssText = 'position:fixed;pointer-events:none;opacity:0.8;z-index:9999;width:' + rect.width + 'px;height:' + rect.height + 'px;top:' + rect.top + 'px;left:' + rect.left + 'px;';
      document.body.appendChild(touchClone);
      chip.classList.add('dragging');
      e.preventDefault();
    }, { passive: false });

    chip.addEventListener('touchmove', function(e) {
      if (!touchClone) return;
      var t = e.touches[0];
      touchClone.style.top  = (t.clientY - 20) + 'px';
      touchClone.style.left = (t.clientX - 24) + 'px';
      e.preventDefault();
    }, { passive: false });

    chip.addEventListener('touchend', function(e) {
      if (touchClone) { touchClone.remove(); touchClone = null; }
      if (!touchChip) return;
      touchChip.classList.remove('dragging');
      var t = e.changedTouches[0];
      var el = document.elementFromPoint(t.clientX, t.clientY);
      var card = el ? el.closest('.char-ability-card') : null;
      var bank = document.getElementById('char-score-bank');
      if (card) {
        // Simulate drop on card
        var fakeEvent = { preventDefault: function(){} };
        var origSource = _dragSource;
        onCardDrop.call(card, fakeEvent);
      } else if (bank && bank.contains(el)) {
        var fakeEvent = { preventDefault: function(){} };
        onBankDrop(fakeEvent);
      }
      touchChip = null;
      _dragScore = null;
      _dragSource = null;
    });
  });
}

// ── APPEARANCE PROMPT ─────────────────────────────────────────
function updateAIPrompt() {
  var data = collectAppearanceData();
  var prompt = buildAIPrompt(data);
  var el = document.getElementById('char-ai-prompt-text');
  if (el) el.textContent = prompt || 'Fill in your appearance details above to generate your portrait prompt.';
  CHAR_STATE.draft.appearance_data   = data;
  CHAR_STATE.draft.appearance_prompt = prompt;
}

// ── STAGE 3 RESTORE ───────────────────────────────────────────
function restoreStage3Selections() {
  // Restore ability scores
  var scores = CHAR_STATE.draft.ability_scores;
  if (scores) {
    var bank = document.getElementById('char-score-bank');
    if (bank) bank.innerHTML = '';
    var placed = [];
    ['str','dex','con','int','wis','cha'].forEach(function(ab) {
      var val = scores[ab];
      if (val && val !== 10) {
        setAbilityScore(ab, val);
        placed.push(parseInt(val));
      } else if (val === 10) {
        setAbilityScore(ab, val);
        placed.push(10);
      }
    });
    // Put unplaced scores back in bank
    ABILITY_SCORES.forEach(function(s) {
      if (placed.indexOf(s) === -1) {
        addChipToBank(s);
      }
    });
    initAbilityDragDrop();
  }
  // Restore appearance selects
  var app = CHAR_STATE.draft.appearance_data;
  if (app) {
    var simpleIds = ['app-height','app-build','app-age','app-face-shape',
                     'app-eye-color','app-eye-shape','app-facial-hair',
                     'app-hair-color','app-hair-style','app-cloak','app-top',
                     'app-lower','app-shoes','app-hat','app-accessory','app-jewelry'];
    simpleIds.forEach(function(id) {
      var key = id.replace('app-','').replace(/-/g,'_');
      // handle key mismatches
      var map = { 'skin_tone': 'skin_tone', 'facial_hair': 'facial_hair',
                  'hair_color': 'hair_color', 'hair_style': 'hair_style',
                  'face_shape': 'face_shape', 'eye_color': 'eye_color',
                  'eye_shape': 'eye_shape' };
      var val = app[map[key] || key];
      if (!val) return;
      var el = document.getElementById(id);
      if (el) el.value = val;
    });
    // Restore skin tone color
    if (app.skin_tone) {
      var st = document.getElementById('app-skin-tone');
      if (st) st.value = app.skin_tone;
    }
    // Restore checkboxes
    if (app.facial_markings) {
      document.querySelectorAll('input[name="app-markings"]').forEach(function(cb) {
        cb.checked = app.facial_markings.indexOf(cb.value) >= 0;
      });
    }
    updateAIPrompt();
  }
}

// ── TOAST STYLES (injected) ────────────────────────────────────────
(function() {
  var style = document.createElement('style');
  style.textContent = '#char-toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(10,14,24,0.95);border:1px solid rgba(200,148,10,0.4);color:var(--gold);font-family:var(--font-sans);font-size:0.85rem;padding:0.65rem 1.5rem;border-radius:8px;opacity:0;transition:all 0.3s ease;z-index:300;pointer-events:none;white-space:nowrap;}#char-toast.visible{opacity:1;transform:translateX(-50%) translateY(0);}';
  document.head.appendChild(style);
})();
