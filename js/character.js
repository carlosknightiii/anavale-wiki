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
  github_token: '', // Token set at runtime via DM setup — never stored in repo
  github_repo:  'carlosknightiii/anavale-wiki',
  draft_key:    'anavale_char_draft',
  created_key:  'anavale_character_created',
  total_stages: 5
};

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
  if (banner) {
    banner.classList.add('visible');
    // Shift progress bar down to account for banner height
    var prog = document.getElementById('char-progress-wrap');
    if (prog) prog.style.top = banner.offsetHeight + 'px';
  }
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
  CHAR_STATE.draft._stage = n;
  saveDraftToStorage();
  renderProgress();
  renderSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goNext() {
  if (!validateStage(CHAR_STATE.current_stage)) return;
  collectStageData(CHAR_STATE.current_stage);
  if (CHAR_STATE.current_stage < CHAR_CONFIG.total_stages) {
    showStage(CHAR_STATE.current_stage + 1);
    initStageOnEnter(CHAR_STATE.current_stage);
  }
}

function goBack() {
  if (CHAR_STATE.current_stage > 1) {
    showStage(CHAR_STATE.current_stage - 1);
  }
}

function jumpToStage(n) {
  // Only allow jumping to completed stages
  if (n < CHAR_STATE.current_stage) {
    collectStageData(CHAR_STATE.current_stage);
    showStage(n);
    initStageOnEnter(n);
  }
}

function initStageOnEnter(n) {
  if (n === 2) initStage2();
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
  for (var i = 1; i <= CHAR_CONFIG.total_stages; i++) {
    var el = document.getElementById('char-sidebar-stage-' + i);
    if (!el) continue;
    el.classList.remove('active', 'completed');
    if (i === CHAR_STATE.current_stage) {
      el.classList.add('active');
    } else if (i < CHAR_STATE.current_stage) {
      el.classList.add('completed');
    }
  }
}

// ── BACKGROUND DATA ────────────────────────────────────────────────
var ANAVALE_BACKGROUNDS = [
  {
    id: 'faithful', name: 'The Faithful', phb: 'Acolyte',
    lore: 'You grew up inside one of Anavale\'s three faiths — the Brightcreed\'s color festivals, the Stillkeep\'s stone libraries, or the Veilborn\'s careful silences. You know the prayers, the practices, and the politics. You can also read pre-Partition script, which more people want than will admit it.',
    skills: ['Insight', 'Religion'],
    bonuses: ['+2 Int', '+1 Wis', 'Magic Initiate']
  },
  {
    id: 'streetwise', name: 'The Streetwise', phb: 'Criminal',
    lore: 'You learned what you know in places that don\'t appear on official maps — back alleys, Grusk-adjacent markets, Nimblewood-adjacent neighborhoods. Not necessarily a bad person. Just someone who understands how the world actually moves when the Formery isn\'t watching.',
    skills: ['Deception', 'Stealth'],
    bonuses: ['+2 Dex', '+1 Int', 'Alert']
  },
  {
    id: 'learned', name: 'The Learned', phb: 'Sage',
    lore: 'You spent years in one of Anavale\'s great collections of knowledge — the Great Index in Lightcrak, a Stillkeep archive, the Chroma Bureau\'s public records. You know more than most people want to know about things most people have never heard of. This has been both useful and isolating.',
    skills: ['Arcana', 'History'],
    bonuses: ['+2 Int', '+1 Wis', 'Keen Mind']
  },
  {
    id: 'tested', name: 'The Tested', phb: 'Soldier',
    lore: 'You served — in a Confederation guard company, a Nombi honor corps, a Sohot desert patrol, or a fighting company attached to the Wanderkeep. You know how to follow orders, how to give them, and exactly which situations require which. The grey you\'ve seen may or may not have been the Vareth kind.',
    skills: ['Athletics', 'Intimidation'],
    bonuses: ['+2 Str', '+1 Con', 'Savage Attacker']
  },
  {
    id: 'wellborn', name: 'The Wellborn', phb: 'Noble',
    lore: 'You come from one of Anavale\'s established families — a Confederation merchant house, a Sohot ceremonial lineage, a Nombi honor clan. You know how rooms full of powerful people work. You also know exactly what those people are willing to do to stay powerful, which is information the Formery would file under Form 9-C (Societal Leverage, Observed).',
    skills: ['History', 'Persuasion'],
    bonuses: ['+2 Cha', '+1 Int', 'Skilled']
  },
  {
    id: 'rootborn', name: 'The Rootborn', phb: 'Folk Hero',
    lore: 'You\'re from a small place — Pebbleshire, a Bunari fishing village, a Zippydoda Hills farm — and something happened there that made people look at you differently. You didn\'t ask for it. You\'re not sure you deserved it. But the Pocketmoles have always found you specifically, and you\'ve stopped pretending that doesn\'t mean something.',
    skills: ['Animal Handling', 'Survival'],
    bonuses: ['+2 Con', '+1 Cha', 'Tough']
  },
  {
    id: 'masquerader', name: 'The Masquerader', phb: 'Charlatan',
    lore: 'You\'ve worn more faces than you\'ve had homes — not because you\'re dishonest, exactly, but because the truth has never been your most useful tool. You know how documents are forged, how confidence works, and which Formery office is least likely to verify anything. The Nimblewood finds your skills interesting. You haven\'t decided how you feel about that.',
    skills: ['Deception', 'Sleight of Hand'],
    bonuses: ['+2 Cha', '+1 Dex', 'Skilled']
  },
  {
    id: 'reveler', name: 'The Reveler', phb: 'Entertainer',
    lore: 'You grew up in The Revel, in a traveling troupe, or in Reveltown itself — surrounded by performance, color, and the particular chaos of people trying to make other people feel something. You know how to read a crowd, fill a silence, and make a room forget the grey for one night. Whether you\'re Veilborn-adjacent is something you\'ve stopped asking yourself.',
    skills: ['Acrobatics', 'Performance'],
    bonuses: ['+2 Cha', '+1 Dex', 'Inspiring Leader']
  },
  {
    id: 'craftborn', name: 'The Craftborn', phb: 'Guild Artisan',
    lore: 'You trained under a master in one of the Zippan guilds, a Dingurei paper house, or a Stonemarked workshop in the Jani Mountains. You know how to make something from nothing, how guild politics work, and that the difference between a good piece and a great one is always the part nobody sees.',
    skills: ['Insight', 'Persuasion'],
    bonuses: ['+2 Int', '+1 Cha', 'Skilled']
  },
  {
    id: 'stillsought', name: 'The Stillsought', phb: 'Hermit',
    lore: 'You spent a significant portion of your life alone — in a Stillkeep mountain retreat, in the deep Opu Forest near the Patient One, in a Nombi winter with only the aurora for company. You were looking for something. You may have found it. What you found has made you either very calm or very certain about something nobody else seems certain about yet.',
    skills: ['Medicine', 'Religion'],
    bonuses: ['+2 Wis', '+1 Con', 'Magic Initiate']
  },
  {
    id: 'wildborn', name: 'The Wildborn', phb: 'Outlander',
    lore: 'The Dodooti Rainforest, the Nombi deep forest, the Wraithfell Tundra, the Jani Mountain passes — you grew up in one of these, or spent enough time there to change how you think. The Gigglegloom reads differently in the wild. Purer. Louder. You know what it sounds like when it\'s healthy and you know what the silence means when it isn\'t.',
    skills: ['Athletics', 'Survival'],
    bonuses: ['+2 Str', '+1 Wis', 'Tough']
  },
  {
    id: 'tidemarked', name: 'The Tidemarked', phb: 'Sailor',
    lore: 'You know the Bunbun Bay, the Salindri Sea, the Glacial Sea off Nombi\'s coast, or the Golden Sea south of Sohot. Ships, currents, weather, the way Shimmer Rays surface before a storm and what that means. The Bunari consider the sea a living thing and treat it accordingly. You may not be Bunari, but you\'ve spent enough time on their ships to understand why.',
    skills: ['Athletics', 'Perception'],
    bonuses: ['+2 Str', '+1 Dex', 'Tavern Brawler']
  },
  {
    id: 'cobblewise', name: 'The Cobblewise', phb: 'Urchin',
    lore: 'You grew up in the margins of one of Anavale\'s cities — Mirrenport\'s lower docks, Bumbleton\'s market back-alleys, the parts of Solenveil that don\'t appear in the Formery\'s official maps. You know how a city actually works, where to sleep when you have nothing, and which doors to knock on when you need help. A Pocketmole found you every time you were at your lowest. You still don\'t know what to make of that.',
    skills: ['Sleight of Hand', 'Stealth'],
    bonuses: ['+2 Dex', '+1 Wis', 'Lucky']
  },
  {
    id: 'greywitnessed', name: 'The Greywitnessed', phb: 'Haunted One',
    lore: 'You were there when the grey arrived somewhere it shouldn\'t have been. A town that was fine last season. A creature that stopped humming. A person you loved who started forgetting why things were worth caring about. You didn\'t cause it. You couldn\'t stop it. But you saw it, and seeing it changed what you\'re willing to do. The Hollowmoth appeared. You remember exactly what it looked like.',
    skills: ['Arcana', 'Survival'],
    bonuses: ['+2 Wis', '+1 Str', 'Alert']
  },
  {
    id: 'threadpuller', name: 'The Threadpuller', phb: 'Investigator',
    lore: 'You worked for the Chroma Bureau, the Dingurei Great Index, a Wanderkeep anomaly division, or simply had a mind that couldn\'t leave an unanswered question alone. You notice what\'s missing from a scene as readily as what\'s present. The Gigglegloom leaves traces everywhere, and you\'ve learned to read them like a language most people don\'t know exists.',
    skills: ['Insight', 'Investigation'],
    bonuses: ['+2 Int', '+1 Wis', 'Keen Mind']
  },
  {
    id: 'ringscarred', name: 'The Ringscarred', phb: 'Gladiator',
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
  }
}

function selectClass(classId) {
  document.querySelectorAll('.char-class-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.class === classId);
  });
  CHAR_STATE.draft.class_id = classId;
  saveDraftToStorage();
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
    return '<div class="char-bg-card" data-bg="' + bg.id + '" onclick="selectBackground(\'' + bg.id + '\')">'
      + '<div class="char-bg-check">✓</div>'
      + '<div class="char-bg-name">' + bg.name + '</div>'
      + '<div class="char-bg-phb">' + bg.phb + '</div>'
      + '<div class="char-bg-lore">' + bg.lore + '</div>'
      + '<div class="char-bg-skills">'
      + '<span class="char-bg-skill-label">Skills</span> '
      + bg.skills.join(' · ')
      + '</div>'
      + '<div class="char-bg-bonuses">'
      + bg.bonuses.map(function(b) { return '<span class="char-bg-bonus-pill">' + b + '</span>'; }).join('')
      + '</div>'
      + '</div>';
  }).join('');
}

function renderSpeciesCards() {
  // Placeholder — species cards will be wired in a follow-up. Guarded so
  // calling initStage2() today is safe.
  if (typeof window.renderSpeciesCardsImpl === 'function') {
    window.renderSpeciesCardsImpl();
  }
}

function selectBackground(bgId) {
  document.querySelectorAll('.char-bg-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.bg === bgId);
  });
  CHAR_STATE.draft.background_id = bgId;
  var hidden = document.getElementById('char-background');
  if (hidden) hidden.value = bgId;
  saveDraftToStorage();
}

function restoreStage2Selections() {
  if (CHAR_STATE.draft.background_id) {
    selectBackground(CHAR_STATE.draft.background_id);
  }
  if (CHAR_STATE.draft.species_id) {
    if (typeof selectSpecies === 'function') selectSpecies(CHAR_STATE.draft.species_id);
  }
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
  var type = d.gigglegloom_type || 'bubbleseed';
  var typeData = GIGGLEGLOOM_TYPES[type];
  var typeName = typeData ? typeData.name : type;
  var classId = d.class_id || '';
  var cls = null;
  if (typeData) {
    typeData.classes.forEach(function(c) { if (c.id === classId) cls = c; });
  }
  var className = cls ? cls.name : classId;
  var region = d.home_region || 'Caparia';

  var summary = 'A practitioner of ' + typeName + ' magic';
  if (className) summary += ', known among their people as ' + className;
  if (region)    summary += ', from ' + region;
  if (d.why_you_left) summary += '. ' + d.why_you_left;
  else summary += '.';

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
  var nameEl = document.getElementById('char-confirm-name');
  if (nameEl) nameEl.textContent = entry.name;
  var typeEl = document.getElementById('char-confirm-type');
  if (typeEl) typeEl.textContent = entry.class_gigglegloom;
  var sheetLink = document.getElementById('char-confirm-sheet-link');
  if (sheetLink) sheetLink.href = 'sheet/' + token + '.html';
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
function initTooltips() {
  var active = null; // { el, box }
  function destroy() {
    if (active) { active.box.remove(); active = null; }
  }
  function create(el) {
    destroy();
    var box = document.createElement('div');
    box.textContent = el.getAttribute('data-tip');
    var styles = {
      position:         'fixed',
      zIndex:           '99999',
      width:            '220px',
      maxWidth:         'calc(100vw - 24px)',
      background:       'rgba(10,14,24,0.96)',
      border:           '1px solid rgba(200,148,10,0.6)',
      borderRadius:     '6px',
      padding:          '0.6rem 0.9rem',
      fontFamily:       'Roboto, system-ui, sans-serif',
      fontSize:         '0.78rem',
      lineHeight:       '1.55',
      color:            'rgba(245,234,212,0.85)',
      whiteSpace:       'normal',
      pointerEvents:    'none',
      boxShadow:        '0 4px 16px rgba(0,0,0,0.6)',
      visibility:       'hidden',  // hidden but laid out — so we can measure height
      top:              '0',
      left:             '0'
    };
    Object.keys(styles).forEach(function(k) { box.style[k] = styles[k]; });
    document.body.appendChild(box);
    // Measure real height now that element is in DOM and laid out
    var bh   = box.offsetHeight || 56;
    var rect = el.getBoundingClientRect();
    var left = rect.left + rect.width / 2 - 110;
    left = Math.max(8, Math.min(left, window.innerWidth - 228));
    var top  = rect.top - bh - 10;
    if (top < 8) top = rect.bottom + 8;
    box.style.top        = top  + 'px';
    box.style.left       = left + 'px';
    box.style.visibility = 'visible';
    active = { el: el, box: box };
  }
  document.querySelectorAll('.char-field-tooltip[data-tip]').forEach(function(el) {
    el.addEventListener('mouseenter', function() { create(el); });
    el.addEventListener('mouseleave', destroy);
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      if (active && active.el === el) { destroy(); } else { create(el); }
    });
  });
  document.addEventListener('click', destroy);
}

// ── TOAST STYLES (injected) ────────────────────────────────────────
(function() {
  var style = document.createElement('style');
  style.textContent = '#char-toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(10,14,24,0.95);border:1px solid rgba(200,148,10,0.4);color:var(--gold);font-family:var(--font-sans);font-size:0.85rem;padding:0.65rem 1.5rem;border-radius:8px;opacity:0;transition:all 0.3s ease;z-index:300;pointer-events:none;white-space:nowrap;}#char-toast.visible{opacity:1;transform:translateX(-50%) translateY(0);}';
  document.head.appendChild(style);
})();
