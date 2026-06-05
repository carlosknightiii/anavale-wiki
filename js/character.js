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
  // Pin mobile progress bar flush under nav after paint
  function pinMobileProgressBar() {
    // Progress bar now lives inside char-mobile-stage-nav — no separate positioning needed
  }
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      pinMobileProgressBar();
    });
  });
  window.addEventListener('resize', pinMobileProgressBar);
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
    // New short-key resume format
    var resumeKey = params.get('resume');
    if (resumeKey) {
      var raw = localStorage.getItem(resumeKey);
      if (raw) {
        var decoded = JSON.parse(raw);
        CHAR_STATE.draft = decoded;
        if (decoded._stage && decoded._stage > 1) {
          CHAR_STATE.current_stage = decoded._stage;
          showReturnBanner();
        }
        return;
      }
    }
    // Legacy base64 draft format — keep for backwards compatibility
    var encoded = params.get('draft');
    if (encoded) {
      var binary = atob(encoded);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      var json = new TextDecoder().decode(bytes);
      var legacy = JSON.parse(json);
      CHAR_STATE.draft = legacy;
      if (legacy._stage && legacy._stage > 1) {
        CHAR_STATE.current_stage = legacy._stage;
        showReturnBanner();
      }
    }
  } catch(e) {}
}

function generateResumeLink() {
  try {
    CHAR_STATE.draft._stage = CHAR_STATE.current_stage;
    // Save full draft to localStorage under a short resume key
    var resumeKey = 'anavale_resume_' + Date.now();
    localStorage.setItem(resumeKey, JSON.stringify(CHAR_STATE.draft));
    // Also keep the standard draft key in sync
    saveDraftToStorage();
    // Put only the short key in the URL — not the entire draft
    var url = window.location.origin + window.location.pathname + '?resume=' + resumeKey;
    navigator.clipboard.writeText(url).then(function() {
      showToast('Progress saved! Link copied to clipboard.');
    }).catch(function() {
      prompt('Copy this link to resume later:', url);
    });
  } catch(e) {
    console.warn('Resume link failed:', e);
    showToast('Could not copy link — try again.', 'error');
  }
}

function showReturnBanner() {
  var banner = document.getElementById('char-return-banner');
  if (!banner) return;
  banner.classList.add('visible');
  document.body.classList.add('banner-visible');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      var isMobile = window.innerWidth <= 768;
      if (isMobile) {
        var bh = banner.offsetHeight;
        var nav = document.getElementById('char-mobile-stage-nav');
        var bar = document.getElementById('char-progress-wrap-mobile');
        var main = document.querySelector('.char-main');
        if (nav) nav.style.top = bh + 'px';
        requestAnimationFrame(function() {
          var navH = nav ? nav.offsetHeight : 74;
          if (bar) bar.style.top = (bh + navH) + 'px';
          if (main) main.style.paddingTop = (bh + navH + 16) + 'px';
        });
      } else {
        var layout = document.querySelector('.char-layout');
        if (layout) layout.style.paddingTop = (banner.offsetHeight + 16) + 'px';
      }
    });
  });
}

function dismissReturnBanner() {
  var banner = document.getElementById('char-return-banner');
  if (!banner) return;
  banner.classList.remove('visible');
  document.body.classList.remove('banner-visible');
  var isMobile = window.innerWidth <= 768;
  if (isMobile) {
    var nav  = document.getElementById('char-mobile-stage-nav');
    var bar  = document.getElementById('char-progress-wrap-mobile');
    var main = document.querySelector('.char-main');
    if (nav)  nav.style.top  = '';
    if (bar)  bar.style.top  = '';
    if (main) main.style.paddingTop = '';
  } else {
    var layout = document.querySelector('.char-layout');
    if (layout) layout.style.paddingTop = '';
  }
}

function resumeDraft() {
  // Re-arm splash so it fires again on resume
  if (typeof window.armSplashForResume === 'function') window.armSplashForResume();
  var stage = (CHAR_STATE.draft._stage && CHAR_STATE.draft._stage > 1)
    ? CHAR_STATE.draft._stage
    : CHAR_STATE.current_stage;
  dismissReturnBanner();
  showStage(stage);
  initStageOnEnter(stage);
}

function initAutoSave() {
  // Save draft on every input change across the form
  document.addEventListener('input', function() {
    CHAR_STATE.draft._stage = CHAR_STATE.current_stage;
    // Sync Stage 4 appearance selects into draft immediately on change
    if (CHAR_STATE.current_stage === 4) {
      CHAR_STATE.draft.appearance_data = collectAppearanceData();
    }
    saveDraftToStorage();
  });
  document.addEventListener('change', function() {
    CHAR_STATE.draft._stage = CHAR_STATE.current_stage;
    // Sync Stage 4 appearance selects into draft immediately on change
    if (CHAR_STATE.current_stage === 4) {
      CHAR_STATE.draft.appearance_data = collectAppearanceData();
    }
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
  window.scrollTo({ top: 0 });
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
  if (n === 1) { initStage1(); initAppearanceListeners(); }
  if (n === 2) { initStage2(); }
  if (n === 3) { initAbilityScores(); restoreStage3Selections(); renderStage3Panel(); renderStage3ClassBanner(); updateStage3ContinueButton(); }
  if (n === 4) { initAppearanceListeners(); renderStartingGear(); filterClothingByClass(CHAR_STATE.draft.class_id || ''); filterWeaponsByClass(CHAR_STATE.draft.class_id || ''); updateGoldDisplay(); updateStage4Hud(); initHudSticky(); }
  if (n === 5) { initStage5(); }
}

// ── PROGRESS BAR ───────────────────────────────────────────────────
function renderProgress() {
  var pct = ((CHAR_STATE.current_stage - 1) / (CHAR_CONFIG.total_stages - 1)) * 100;
  pct = Math.max(10, pct);
  // Desktop bar
  var bar = document.getElementById('char-progress-bar');
  if (bar) bar.style.width = pct + '%';
  var label = document.getElementById('char-progress-label');
  if (label) {
    label.textContent = 'Stage ' + CHAR_STATE.current_stage + ' of ' + CHAR_CONFIG.total_stages;
    if (pct < 40) { label.classList.add('outside'); } else { label.classList.remove('outside'); }
  }
  // Mobile bar (duplicate inside char-main)
  var barM = document.getElementById('char-progress-bar-mobile');
  if (barM) barM.style.width = pct + '%';
  var labelM = document.getElementById('char-progress-label-mobile');
  if (labelM) {
    labelM.textContent = 'Stage ' + CHAR_STATE.current_stage + ' of ' + CHAR_CONFIG.total_stages;
    if (pct < 40) { labelM.classList.add('outside'); } else { labelM.classList.remove('outside'); }
  }
}

// ── SIDEBAR ────────────────────────────────────────────────────────
var STAGE_NAMES = [
  '', // 0 unused
  'Your Story',
  'Your Class',
  'Ability Scores',
  'Gear & Look',
  'Review & Submit'
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
  // Sync mobile stage pills
  for (var j = 1; j <= CHAR_CONFIG.total_stages; j++) {
    var pill = document.getElementById('char-mobile-pill-' + j);
    if (!pill) continue;
    pill.classList.remove('active', 'completed');
    if (j === CHAR_STATE.current_stage) {
      pill.classList.add('active');
    } else if (j <= highest) {
      pill.classList.add('completed');
    }
  }
}

// ── BACKGROUND DATA ────────────────────────────────────────────────
var ANAVALE_BACKGROUNDS = [
  {
    id: 'cobblewise', name: 'Cobblewise', phb: 'Urchin', starting_gold: 10,
    lore: 'You grew up in the margins of one of Anavale\'s cities — Mirrenport\'s lower docks, Bumbleton\'s market back-alleys, the parts of Solenveil that don\'t appear in the Formery\'s official maps. You know how a city actually works, where to sleep when you have nothing, and which doors to knock on when you need help. A Pocketmole found you every time you were at your lowest. You still don\'t know what to make of that.',
    skills: ['Sleight of Hand', 'Stealth'],
    bonuses: ['+2 Dex', '+1 Wis', 'Lucky']
  },
  {
    id: 'craftborn', name: 'Craftborn', phb: 'Guild Artisan', starting_gold: 15,
    lore: 'You trained under a master in one of the Zippan guilds, a Dingurei paper house, or a Stonemarked workshop in the Jani Mountains. You know how to make something from nothing, how guild politics work, and that the difference between a good piece and a great one is always the part nobody sees.',
    skills: ['Insight', 'Persuasion'],
    bonuses: ['+2 Int', '+1 Cha', 'Skilled']
  },
  {
    id: 'faithful', name: 'Faithful', phb: 'Acolyte', starting_gold: 10,
    lore: 'You grew up inside one of Anavale\'s three faiths — the Brightcreed\'s color festivals, the Stillkeep\'s stone libraries, or the Veilborn\'s careful silences. You know the prayers, the practices, and the politics. You can also read pre-Partition script, which more people want than will admit it.',
    skills: ['Insight', 'Religion'],
    bonuses: ['+2 Int', '+1 Wis', 'Magic Initiate']
  },
  {
    id: 'greywitnessed', name: 'Greywitnessed', phb: 'Haunted One', starting_gold: 10,
    lore: 'You were there when the grey arrived somewhere it shouldn\'t have been. A town that was fine last season. A creature that stopped humming. A person you loved who started forgetting why things were worth caring about. You didn\'t cause it. You couldn\'t stop it. But you saw it, and seeing it changed what you\'re willing to do. The Hollowmoth appeared. You remember exactly what it looked like.',
    skills: ['Arcana', 'Survival'],
    bonuses: ['+2 Wis', '+1 Str', 'Alert']
  },
  {
    id: 'learned', name: 'Learned', phb: 'Sage', starting_gold: 10,
    lore: 'You spent years in one of Anavale\'s great collections of knowledge — the Great Index in Lightcrak, a Stillkeep archive, the Chroma Bureau\'s public records. You know more than most people want to know about things most people have never heard of. This has been both useful and isolating.',
    skills: ['Arcana', 'History'],
    bonuses: ['+2 Int', '+1 Wis', 'Keen Mind']
  },
  {
    id: 'masquerader', name: 'Masquerader', phb: 'Charlatan', starting_gold: 15,
    lore: 'You\'ve worn more faces than you\'ve had homes — not because you\'re dishonest, exactly, but because the truth has never been your most useful tool. You know how documents are forged, how confidence works, and which Formery office is least likely to verify anything. The Nimblewood finds your skills interesting. You haven\'t decided how you feel about that.',
    skills: ['Deception', 'Sleight of Hand'],
    bonuses: ['+2 Cha', '+1 Dex', 'Skilled']
  },
  {
    id: 'reveler', name: 'Reveler', phb: 'Entertainer', starting_gold: 15,
    lore: 'You grew up in The Revel, in a traveling troupe, or in Reveltown itself — surrounded by performance, color, and the particular chaos of people trying to make other people feel something. You know how to read a crowd, fill a silence, and make a room forget the grey for one night. Whether you\'re Veilborn-adjacent is something you\'ve stopped asking yourself.',
    skills: ['Acrobatics', 'Performance'],
    bonuses: ['+2 Cha', '+1 Dex', 'Inspiring Leader']
  },
  {
    id: 'ringscarred', name: 'Ringscarred', phb: 'Gladiator', starting_gold: 15,
    lore: 'You fought in the arenas — the Vokrath fighting pits in Sohot, the honor-bout circles of Nombi, the Caparia traveling tournaments that follow the festival circuit. You know how to perform violence and how to make it look like something else entirely. The crowd\'s color surges when you win. You\'ve noticed it dims slightly when you lose — not much, but enough to notice. You think about that.',
    skills: ['Athletics', 'Performance'],
    bonuses: ['+2 Str', '+1 Cha', 'Savage Attacker']
  },
  {
    id: 'rootborn', name: 'Rootborn', phb: 'Folk Hero', starting_gold: 10,
    lore: 'You\'re from a small place — Pebbleshire, a Bunari fishing village, a Zippydoda Hills farm — and something happened there that made people look at you differently. You didn\'t ask for it. You\'re not sure you deserved it. But the Pocketmoles have always found you specifically, and you\'ve stopped pretending that doesn\'t mean something.',
    skills: ['Animal Handling', 'Survival'],
    bonuses: ['+2 Con', '+1 Cha', 'Tough']
  },
  {
    id: 'stillsought', name: 'Stillsought', phb: 'Hermit', starting_gold: 5,
    lore: 'You spent a significant portion of your life alone — in a Stillkeep mountain retreat, in the deep Opu Forest near the Patient One, in a Nombi winter with only the aurora for company. You were looking for something. You may have found it. What you found has made you either very calm or very certain about something nobody else seems certain about yet.',
    skills: ['Medicine', 'Religion'],
    bonuses: ['+2 Wis', '+1 Con', 'Magic Initiate']
  },
  {
    id: 'streetwise', name: 'Streetwise', phb: 'Criminal', starting_gold: 25,
    lore: 'You learned what you know in places that don\'t appear on official maps — back alleys, Grusk-adjacent markets, Nimblewood-adjacent neighborhoods. Not necessarily a bad person. Just someone who understands how the world actually moves when the Formery isn\'t watching.',
    skills: ['Deception', 'Stealth'],
    bonuses: ['+2 Dex', '+1 Int', 'Alert']
  },
  {
    id: 'tested', name: 'Tested', phb: 'Soldier', starting_gold: 10,
    lore: 'You served — in a Confederation guard company, a Nombi honor corps, a Sohot desert patrol, or a fighting company attached to the Wanderkeep. You know how to follow orders, how to give them, and exactly which situations require which. The grey you\'ve seen may or may not have been the Vareth kind.',
    skills: ['Athletics', 'Intimidation'],
    bonuses: ['+2 Str', '+1 Con', 'Savage Attacker']
  },
  {
    id: 'threadpuller', name: 'Threadpuller', phb: 'Investigator', starting_gold: 10,
    lore: 'You worked for the Chroma Bureau, the Dingurei Great Index, a Wanderkeep anomaly division, or simply had a mind that couldn\'t leave an unanswered question alone. You notice what\'s missing from a scene as readily as what\'s present. The Gigglegloom leaves traces everywhere, and you\'ve learned to read them like a language most people don\'t know exists.',
    skills: ['Insight', 'Investigation'],
    bonuses: ['+2 Int', '+1 Wis', 'Keen Mind']
  },
  {
    id: 'tidemarked', name: 'Tidemarked', phb: 'Sailor', starting_gold: 10,
    lore: 'You know the Bunbun Bay, the Salindri Sea, the Glacial Sea off Nombi\'s coast, or the Golden Sea south of Sohot. Ships, currents, weather, the way Shimmer Rays surface before a storm and what that means. The Bunari consider the sea a living thing and treat it accordingly. You may not be Bunari, but you\'ve spent enough time on their ships to understand why.',
    skills: ['Athletics', 'Perception'],
    bonuses: ['+2 Str', '+1 Dex', 'Tavern Brawler']
  },
  {
    id: 'wellborn', name: 'Wellborn', phb: 'Noble', starting_gold: 25,
    lore: 'You come from one of Anavale\'s established families — a Confederation merchant house, a Sohot ceremonial lineage, a Nombi honor clan. You know how rooms full of powerful people work. You also know exactly what those people are willing to do to stay powerful, which is information the Formery would file under Form 9-C (Societal Leverage, Observed).',
    skills: ['History', 'Persuasion'],
    bonuses: ['+2 Cha', '+1 Int', 'Skilled']
  },
  {
    id: 'wildborn', name: 'Wildborn', phb: 'Outlander', starting_gold: 10,
    lore: 'The Dodooti Rainforest, the Nombi deep forest, the Wraithfell Tundra, the Jani Mountain passes — you grew up in one of these, or spent enough time there to change how you think. The Gigglegloom reads differently in the wild. Purer. Louder. You know what it sounds like when it\'s healthy and you know what the silence means when it isn\'t.',
    skills: ['Athletics', 'Survival'],
    bonuses: ['+2 Str', '+1 Wis', 'Tough']
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

// ── CLASS DATA (PHB 2024) ──────────────────────────────────────────
// ── CLASS DATA (PHB 2024) ──────────────────────────────────────────
var CLASS_DATA = [
  {
    id: 'barbarian', name: 'Barbarian',
    gigglegloom: 'flamerage', gigglegloom_label: 'Flamerage',
    summary: 'Storm into battle with primal fury, shrugging off blows that would fell lesser warriors. Your rage transforms you into an unstoppable force.',
    hit_die: 'd12', hit_die_tip: 'Your Hit Die determines how many hit points you gain per level. A d12 means you roll a 12-sided die each level — Barbarians are the hardiest class in the game.',
    primary: 'Strength',
    saves: 'Strength, Constitution', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'Light, Medium, Shields', weapons: 'Simple, Martial',
    weapons_tip: 'Simple weapons are basic tools anyone can use (clubs, daggers, spears). Martial weapons are advanced weapons requiring training (swords, axes, bows).',
    skills: 'Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, Survival',
    skills_tip: {
      'Animal Handling': 'Calm or control animals, keep your mount steady in combat.',
      'Athletics': 'Climb, jump, swim, or grapple — anything requiring raw physical effort.',
      'Intimidation': 'Frighten or pressure someone through threats and displays of force.',
      'Nature': 'Recall knowledge about terrain, plants, animals, and the natural world.',
      'Perception': 'Notice things — spot a hidden enemy, hear footsteps, find a secret door.',
      'Survival': 'Track creatures, forage for food, navigate wilderness, and avoid natural hazards.'
    },
    skills_count: 2,
    skills_list: ['Animal Handling','Athletics','Intimidation','Nature','Perception','Survival'],
    features: [
      'Rage — bonus damage on attacks, resistance to physical damage while raging',
      'Unarmored Defense — AC = 10 + Dex modifier + Con modifier (no armor needed)',
      'Reckless Attack — attack with advantage, but enemies gain advantage against you until your next turn',
      'Danger Sense — advantage on Dex saving throws against effects you can see',
      'Primal Path subclass at level 3',
      'Extra Attack at level 5 — attack twice whenever you take the Attack action'
    ]
  },
  {
    id: 'bard', name: 'Bard',
    gigglegloom: 'featherflow', gigglegloom_label: 'Featherflow',
    summary: 'Weave magic through music, words, and performance. Inspire allies, confound enemies, and collect secrets — the Revel would call this a calling.',
    hit_die: 'd8', hit_die_tip: 'Your Hit Die determines hit points per level. A d8 is average — Bards are resilient but not frontline fighters.',
    primary: 'Charisma',
    saves: 'Dexterity, Charisma', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'Light', weapons: 'Simple, Hand Crossbow, Longsword, Rapier, Shortsword',
    weapons_tip: 'Simple weapons are basic tools anyone can use (clubs, daggers, spears). Martial weapons are advanced weapons requiring training (swords, axes, bows).',
    skills: 'Choose 3 from any skill',
    skills_tip: {
      'Acrobatics': 'Stay on your feet, tumble, or perform feats of agility.',
      'Animal Handling': 'Calm or control animals, keep your mount steady in combat.',
      'Arcana': 'Recall knowledge about spells, magic items, and magical traditions.',
      'Athletics': 'Climb, jump, swim, or grapple — anything requiring raw physical effort.',
      'Deception': 'Lie convincingly, disguise your intentions, and mislead others.',
      'History': 'Recall knowledge about past events, legends, and important figures.',
      'Insight': 'Read people — sense if someone is lying or hiding something.',
      'Intimidation': 'Frighten or pressure someone through threats and displays of force.',
      'Investigation': 'Search an area carefully, find clues, deduce conclusions.',
      'Medicine': 'Stabilize a dying creature or diagnose illness and poison.',
      'Nature': 'Recall knowledge about terrain, plants, animals, and the natural world.',
      'Perception': 'Notice things — spot a hidden enemy, hear footsteps, find a secret door.',
      'Performance': 'Entertain an audience with music, dance, acting, or storytelling.',
      'Persuasion': 'Influence someone through honest appeals, diplomacy, or charm.',
      'Religion': 'Recall knowledge about gods, religious rites, and holy symbols.',
      'Sleight of Hand': 'Pick pockets, palm objects, or perform manual trickery unnoticed.',
      'Stealth': 'Move silently and stay hidden from creatures that might notice you.',
      'Survival': 'Track creatures, forage for food, navigate wilderness, and avoid natural hazards.'
    },
    skills_count: 3,
    skills_list: ['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival'],
    features: [
      'Bardic Inspiration — grant a bonus die (d6) to an ally\'s attack roll, ability check, or saving throw',
      'Spellcasting (Charisma) — cast spells using Charisma as your magic ability',
      'Jack of All Trades — add half your proficiency bonus to any skill you\'re not proficient in',
      'Song of Rest — allies who hear you play during a short rest regain extra hit points',
      'Bard College subclass at level 3',
      'Expertise at level 3 — double your proficiency bonus for 2 chosen skills'
    ]
  },
  {
    id: 'cleric', name: 'Cleric',
    gigglegloom: 'bubbleseed', gigglegloom_label: 'Bubbleseed',
    summary: 'Channel divine power from the gods of Anavale. Heal, protect, and smite — your magic comes through devotion.',
    hit_die: 'd8', hit_die_tip: 'Your Hit Die determines hit points per level. A d8 is average — Clerics can hold their own in combat while supporting allies.',
    primary: 'Wisdom',
    saves: 'Wisdom, Charisma', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'Light, Medium, Shields', weapons: 'Simple',
    weapons_tip: 'Simple weapons are basic tools anyone can use — clubs, daggers, maces, spears, and similar weapons.',
    skills: 'Choose 2: History, Insight, Medicine, Persuasion, Religion',
    skills_tip: {
      'History': 'Recall knowledge about past events, legends, and important figures.',
      'Insight': 'Read people — sense if someone is lying or hiding something.',
      'Medicine': 'Stabilize a dying creature or diagnose illness and poison.',
      'Persuasion': 'Influence someone through honest appeals, diplomacy, or charm.',
      'Religion': 'Recall knowledge about gods, religious rites, and holy symbols.'
    },
    skills_count: 2,
    skills_list: ['History','Insight','Medicine','Persuasion','Religion'],
    features: [
      'Spellcasting (Wisdom) — cast spells using Wisdom as your magic ability',
      'Divine Domain subclass at level 1 — chosen domain shapes your powers from the very start',
      'Channel Divinity — activate powerful domain-specific effects once per rest',
      'Turn Undead — force undead creatures to flee from you',
      'Destroy Undead at level 5 — instantly destroy weak undead instead of just turning them',
      'Divine Intervention at level 10 — call on your god to directly intervene on your behalf'
    ]
  },
  {
    id: 'druid', name: 'Druid',
    gigglegloom: 'bubbleseed', gigglegloom_label: 'Bubbleseed',
    summary: 'Speak to the living world and shape-shift into beasts. Your magic grows things, heals things, and occasionally starts a garden where you didn\'t intend one.',
    hit_die: 'd8', hit_die_tip: 'Your Hit Die determines hit points per level. A d8 is average — Druids can take hits while staying mobile.',
    primary: 'Wisdom',
    saves: 'Intelligence, Wisdom', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'Light, Medium, Shields (no metal)', weapons: 'Simple (no metal)',
    weapons_tip: 'Simple weapons are basic tools anyone can use. Druids avoid metal weapons and armor by tradition — it disrupts their connection to the living world.',
    skills: 'Choose 2: Arcana, Animal Handling, Insight, Medicine, Nature, Perception, Religion, Survival',
    skills_tip: {
      'Arcana': 'Recall knowledge about spells, magic items, and magical traditions.',
      'Animal Handling': 'Calm or control animals, keep your mount steady in combat.',
      'Insight': 'Read people — sense if someone is lying or hiding something.',
      'Medicine': 'Stabilize a dying creature or diagnose illness and poison.',
      'Nature': 'Recall knowledge about terrain, plants, animals, and the natural world.',
      'Perception': 'Notice things — spot a hidden enemy, hear footsteps, find a secret door.',
      'Religion': 'Recall knowledge about gods, religious rites, and holy symbols.',
      'Survival': 'Track creatures, forage for food, navigate wilderness, and avoid natural hazards.'
    },
    skills_count: 2,
    skills_list: ['Arcana','Animal Handling','Insight','Medicine','Nature','Perception','Religion','Survival'],
    features: [
      'Spellcasting (Wisdom) — cast spells using Wisdom as your magic ability',
      'Wild Shape — transform into a beast you have seen; stronger forms unlock at higher levels',
      'Druidic — you know a secret language only Druids share',
      'Druid Circle subclass at level 2',
      'Timeless Body at level 18 — you age 10× slower and can\'t be aged magically',
      'Beast Spells at level 18 — cast spells even while in Wild Shape form'
    ]
  },
  {
    id: 'fighter', name: 'Fighter',
    gigglegloom: 'steelfist', gigglegloom_label: 'Steelfist',
    summary: 'Master every weapon and suit of armor. You know how to stand in the way of something and not move — the Gigglegloom has decided this is admirable.',
    hit_die: 'd10', hit_die_tip: 'Your Hit Die determines hit points per level. A d10 is excellent — Fighters are built to take punishment.',
    primary: 'Strength or Dexterity',
    saves: 'Strength, Constitution', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'All armor, Shields', weapons: 'Simple, Martial',
    weapons_tip: 'Simple weapons are basic tools anyone can use (clubs, daggers, spears). Martial weapons are advanced weapons requiring training (swords, axes, bows). Fighters can use all of them.',
    skills: 'Choose 2: Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival',
    skills_tip: {
      'Acrobatics': 'Stay on your feet, tumble, or perform feats of agility.',
      'Animal Handling': 'Calm or control animals, keep your mount steady in combat.',
      'Athletics': 'Climb, jump, swim, or grapple — anything requiring raw physical effort.',
      'History': 'Recall knowledge about past events, legends, and important figures.',
      'Insight': 'Read people — sense if someone is lying or hiding something.',
      'Intimidation': 'Frighten or pressure someone through threats and displays of force.',
      'Perception': 'Notice things — spot a hidden enemy, hear footsteps, find a secret door.',
      'Survival': 'Track creatures, forage for food, navigate wilderness, and avoid natural hazards.'
    },
    skills_count: 2,
    skills_list: ['Acrobatics','Animal Handling','Athletics','History','Insight','Intimidation','Perception','Survival'],
    features: [
      'Fighting Style — choose a specialty: Archery, Defense, Dueling, Great Weapon Fighting, Protection, or Two-Weapon Fighting',
      'Second Wind — heal yourself for 1d10 + Fighter level as a bonus action, once per rest',
      'Action Surge — take one additional action on your turn, once per rest',
      'Martial Archetype subclass at level 3',
      'Extra Attack at level 5 — attack twice whenever you take the Attack action',
      'Indomitable at level 9 — reroll a failed saving throw, keeping the new result'
    ]
  },
  {
    id: 'monk', name: 'Monk',
    gigglegloom: 'steelfist', gigglegloom_label: 'Steelfist',
    summary: 'Your body is the instrument. Strike fast, deflect blows bare-handed, and channel ki into precise supernatural techniques.',
    hit_die: 'd8', hit_die_tip: 'Your Hit Die determines hit points per level. A d8 is average — Monks compensate with exceptional mobility and defense.',
    primary: 'Dexterity & Wisdom',
    saves: 'Strength, Dexterity', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'None', weapons: 'Simple, Shortsword',
    weapons_tip: 'Monks use simple weapons and shortswords, but their unarmed strikes are their most powerful tool — they deal more damage than most weapons.',
    skills: 'Choose 2: Acrobatics, Athletics, History, Insight, Religion, Stealth',
    skills_tip: {
      'Acrobatics': 'Stay on your feet, tumble, or perform feats of agility.',
      'Athletics': 'Climb, jump, swim, or grapple — anything requiring raw physical effort.',
      'History': 'Recall knowledge about past events, legends, and important figures.',
      'Insight': 'Read people — sense if someone is lying or hiding something.',
      'Religion': 'Recall knowledge about gods, religious rites, and holy symbols.',
      'Stealth': 'Move silently and stay hidden from creatures that might notice you.'
    },
    skills_count: 2,
    skills_list: ['Acrobatics','Athletics','History','Insight','Religion','Stealth'],
    features: [
      'Unarmored Defense — AC = 10 + Dex modifier + Wis modifier (no armor needed)',
      'Martial Arts — unarmed strikes use Dexterity and deal more damage than normal punches',
      'Ki points — fuel special techniques like Flurry of Blows and Patient Defense',
      'Unarmored Movement — move faster than normal, eventually run on walls and water',
      'Monastic Tradition subclass at level 3',
      'Stunning Strike — spend a ki point to potentially stun a creature you hit'
    ]
  },
  {
    id: 'paladin', name: 'Paladin',
    gigglegloom: 'bubbleseed', gigglegloom_label: 'Bubbleseed',
    summary: 'You made a promise. The Gigglegloom heard it and decided to help you keep it. Smite foes with divine power and shield your allies with sacred oaths.',
    hit_die: 'd10', hit_die_tip: 'Your Hit Die determines hit points per level. A d10 is excellent — Paladins are durable frontline fighters with healing capability.',
    primary: 'Strength & Charisma',
    saves: 'Wisdom, Charisma', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'All armor, Shields', weapons: 'Simple, Martial',
    weapons_tip: 'Simple weapons are basic tools anyone can use (clubs, daggers, spears). Martial weapons are advanced weapons requiring training (swords, axes, bows). Paladins can use all of them.',
    skills: 'Choose 2: Athletics, Insight, Intimidation, Medicine, Persuasion, Religion',
    skills_tip: {
      'Athletics': 'Climb, jump, swim, or grapple — anything requiring raw physical effort.',
      'Insight': 'Read people — sense if someone is lying or hiding something.',
      'Intimidation': 'Frighten or pressure someone through threats and displays of force.',
      'Medicine': 'Stabilize a dying creature or diagnose illness and poison.',
      'Persuasion': 'Influence someone through honest appeals, diplomacy, or charm.',
      'Religion': 'Recall knowledge about gods, religious rites, and holy symbols.'
    },
    skills_count: 2,
    skills_list: ['Athletics','Insight','Intimidation','Medicine','Persuasion','Religion'],
    features: [
      'Divine Smite — expend a spell slot after hitting to deal extra radiant damage (more slots = more damage)',
      'Spellcasting (Charisma) — cast spells using Charisma as your magic ability',
      'Divine Health — you are immune to disease',
      'Sacred Oath subclass at level 3 — your oath defines your powers and code of conduct',
      'Aura of Protection at level 6 — you and nearby allies add your Charisma modifier to all saving throws',
      'Extra Attack at level 5 — attack twice whenever you take the Attack action'
    ]
  },
  {
    id: 'ranger', name: 'Ranger',
    gigglegloom: 'featherflow', gigglegloom_label: 'Featherflow',
    summary: 'Weave martial prowess with nature magic. You know how to read the color of a place before you arrive — and how to move through it without leaving a trace.',
    hit_die: 'd10', hit_die_tip: 'Your Hit Die determines hit points per level. A d10 is excellent — Rangers are mobile and tough.',
    primary: 'Dexterity & Wisdom',
    saves: 'Strength, Dexterity', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'Light, Medium, Shields', weapons: 'Simple, Martial',
    weapons_tip: 'Simple weapons are basic tools anyone can use (clubs, daggers, spears). Martial weapons are advanced weapons requiring training (swords, axes, bows).',
    skills: 'Choose 3: Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, Survival',
    skills_tip: {
      'Animal Handling': 'Calm or control animals, keep your mount steady in combat.',
      'Athletics': 'Climb, jump, swim, or grapple — anything requiring raw physical effort.',
      'Insight': 'Read people — sense if someone is lying or hiding something.',
      'Investigation': 'Search an area carefully, find clues, deduce conclusions.',
      'Nature': 'Recall knowledge about terrain, plants, animals, and the natural world.',
      'Perception': 'Notice things — spot a hidden enemy, hear footsteps, find a secret door.',
      'Stealth': 'Move silently and stay hidden from creatures that might notice you.',
      'Survival': 'Track creatures, forage for food, navigate wilderness, and avoid natural hazards.'
    },
    skills_count: 3,
    skills_list: ['Animal Handling','Athletics','Insight','Investigation','Nature','Perception','Stealth','Survival'],
    features: [
      'Favored Enemy — choose a creature type; you have advantage on tracking and recalling knowledge about them',
      'Natural Explorer — choose a terrain type; you move faster, don\'t get lost, and always find food there',
      'Spellcasting (Wisdom) — cast spells using Wisdom as your magic ability',
      'Ranger Archetype subclass at level 3',
      'Extra Attack at level 5 — attack twice whenever you take the Attack action',
      'Hide in Plain Sight at level 10 — spend 1 minute to camouflage yourself; +10 to Stealth while still'
    ]
  },
  {
    id: 'rogue', name: 'Rogue',
    gigglegloom: 'featherflow', gigglegloom_label: 'Featherflow',
    summary: 'Move through the world lightly, strike precisely, and disappear. Sneak Attack turns a single well-placed hit into something devastating.',
    hit_die: 'd8', hit_die_tip: 'Your Hit Die determines hit points per level. A d8 is average — Rogues rely on not getting hit rather than absorbing blows.',
    primary: 'Dexterity',
    saves: 'Dexterity, Intelligence', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'Light', weapons: 'Simple, Hand Crossbow, Longsword, Rapier, Shortsword',
    weapons_tip: 'Simple weapons are basic tools anyone can use. Rogues also train with a handful of martial weapons — rapiers and longswords — that suit a precise, mobile fighting style.',
    skills: 'Choose 4: Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth',
    skills_tip: {
      'Acrobatics': 'Stay on your feet, tumble, or perform feats of agility.',
      'Athletics': 'Climb, jump, swim, or grapple — anything requiring raw physical effort.',
      'Deception': 'Lie convincingly, disguise your intentions, and mislead others.',
      'Insight': 'Read people — sense if someone is lying or hiding something.',
      'Intimidation': 'Frighten or pressure someone through threats and displays of force.',
      'Investigation': 'Search an area carefully, find clues, deduce conclusions.',
      'Perception': 'Notice things — spot a hidden enemy, hear footsteps, find a secret door.',
      'Performance': 'Entertain an audience with music, dance, acting, or storytelling.',
      'Persuasion': 'Influence someone through honest appeals, diplomacy, or charm.',
      'Sleight of Hand': 'Pick pockets, palm objects, or perform manual trickery unnoticed.',
      'Stealth': 'Move silently and stay hidden from creatures that might notice you.'
    },
    skills_count: 4,
    skills_list: ['Acrobatics','Athletics','Deception','Insight','Intimidation','Investigation','Perception','Performance','Persuasion','Sleight of Hand','Stealth'],
    features: [
      'Sneak Attack — deal extra damage (1d6, growing each level) when you have advantage or an ally is next to your target',
      'Thieves\' Cant — a secret language of signs, symbols, and slang known only to rogues and thieves',
      'Cunning Action — Dash, Disengage, or Hide as a bonus action every turn',
      'Roguish Archetype subclass at level 3',
      'Uncanny Dodge — when hit by an attacker you can see, use your reaction to halve the damage',
      'Evasion at level 7 — when a spell or effect targets your Dex save: no damage on success, half on failure'
    ]
  },
  {
    id: 'sorcerer', name: 'Sorcerer',
    gigglegloom: 'flamerage', gigglegloom_label: 'Flamerage',
    summary: 'The Gigglegloom chose you, not the other way around. Wield innate magic that flows from your bloodline — reshape spells with Metamagic.',
    hit_die: 'd6', hit_die_tip: 'Your Hit Die determines hit points per level. A d6 is the lowest — Sorcerers are powerful but fragile. Stay out of melee range.',
    primary: 'Charisma',
    saves: 'Constitution, Charisma', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'None', weapons: 'Simple, Light Crossbow',
    weapons_tip: 'Simple weapons are basic tools anyone can use. Sorcerers have minimal weapon training — their spells are their primary offense.',
    skills: 'Choose 2: Arcana, Deception, Insight, Intimidation, Persuasion, Religion',
    skills_tip: {
      'Arcana': 'Recall knowledge about spells, magic items, and magical traditions.',
      'Deception': 'Lie convincingly, disguise your intentions, and mislead others.',
      'Insight': 'Read people — sense if someone is lying or hiding something.',
      'Intimidation': 'Frighten or pressure someone through threats and displays of force.',
      'Persuasion': 'Influence someone through honest appeals, diplomacy, or charm.',
      'Religion': 'Recall knowledge about gods, religious rites, and holy symbols.'
    },
    skills_count: 2,
    skills_list: ['Arcana','Deception','Insight','Intimidation','Persuasion','Religion'],
    features: [
      'Spellcasting (Charisma) — cast spells using Charisma as your magic ability',
      'Sorcerous Origin subclass at level 1 — your magical bloodline shapes your powers from the start',
      'Font of Magic — convert spell slots into sorcery points and back again',
      'Metamagic — modify spells in powerful ways: cast two at once, extend range, add targets, and more',
      'Flexible Casting — spend sorcery points to create spell slots of any level on the fly',
      'Sorcerous Restoration at level 20 — regain 4 sorcery points whenever you have none left'
    ]
  },
  {
    id: 'warlock', name: 'Warlock',
    gigglegloom: 'flamerage', gigglegloom_label: 'Flamerage',
    summary: 'You made an agreement with something old. The terms were worth it. Probably. Cast powerful spells fueled by your patron — and Eldritch Blast when slots run dry.',
    hit_die: 'd8', hit_die_tip: 'Your Hit Die determines hit points per level. A d8 is average — Warlocks are resilient, especially since their spell slots recharge on short rests.',
    primary: 'Charisma',
    saves: 'Wisdom, Charisma', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'Light', weapons: 'Simple',
    weapons_tip: 'Simple weapons are basic tools anyone can use. Warlocks pair simple weapons with Eldritch Blast — a powerful at-will ranged attack that never runs out.',
    skills: 'Choose 2: Arcana, Deception, History, Intimidation, Investigation, Nature, Religion',
    skills_tip: {
      'Arcana': 'Recall knowledge about spells, magic items, and magical traditions.',
      'Deception': 'Lie convincingly, disguise your intentions, and mislead others.',
      'History': 'Recall knowledge about past events, legends, and important figures.',
      'Intimidation': 'Frighten or pressure someone through threats and displays of force.',
      'Investigation': 'Search an area carefully, find clues, deduce conclusions.',
      'Nature': 'Recall knowledge about terrain, plants, animals, and the natural world.',
      'Religion': 'Recall knowledge about gods, religious rites, and holy symbols.'
    },
    skills_count: 2,
    skills_list: ['Arcana','Deception','History','Intimidation','Investigation','Nature','Religion'],
    features: [
      'Otherworldly Patron subclass at level 1 — your patron defines your expanded spell list and special powers',
      'Pact Magic — fewer spell slots than other casters, but they recharge on a short rest (not long rest)',
      'Eldritch Invocations — customize your magic with permanent upgrades chosen from a long list',
      'Pact Boon at level 3 — your patron gives you a lasting gift: a weapon, a familiar, or a magical tome',
      'Mystic Arcanum at level 11 — gain one very powerful spell that you can cast once per long rest',
      'Eldritch Master at level 20 — spend 1 minute communing with your patron to regain all spell slots'
    ]
  },
  {
    id: 'wizard', name: 'Wizard',
    gigglegloom: 'steelfist', gigglegloom_label: 'Steelfist',
    summary: 'You studied until the Gigglegloom respected you. Command the widest spell list in the game — and write new spells into your spellbook as you discover them.',
    hit_die: 'd6', hit_die_tip: 'Your Hit Die determines hit points per level. A d6 is the lowest — Wizards are powerful but fragile. Position carefully and keep allies between you and danger.',
    primary: 'Intelligence',
    saves: 'Intelligence, Wisdom', saves_tip: 'These are the two abilities you add your proficiency bonus to when making saving throws — rolls to resist spells, traps, and other threats.',
    armor: 'None', weapons: 'Simple, Light Crossbow',
    weapons_tip: 'Simple weapons are basic tools anyone can use. Wizards have minimal weapon training — their vast spell list is their entire offense and defense.',
    skills: 'Choose 2: Arcana, History, Insight, Investigation, Medicine, Religion',
    skills_tip: {
      'Arcana': 'Recall knowledge about spells, magic items, and magical traditions.',
      'History': 'Recall knowledge about past events, legends, and important figures.',
      'Insight': 'Read people — sense if someone is lying or hiding something.',
      'Investigation': 'Search an area carefully, find clues, deduce conclusions.',
      'Medicine': 'Stabilize a dying creature or diagnose illness and poison.',
      'Religion': 'Recall knowledge about gods, religious rites, and holy symbols.'
    },
    skills_count: 2,
    skills_list: ['Arcana','History','Insight','Investigation','Medicine','Religion'],
    features: [
      'Spellcasting (Intelligence) — cast spells using Intelligence as your magic ability',
      'Spellbook — start with 6 spells; copy new ones from scrolls and other spellbooks as you adventure',
      'Arcane Recovery — once per day during a short rest, recover expended spell slots',
      'Arcane Tradition subclass at level 2',
      'Spell Mastery at level 18 — choose one 1st-level and one 2nd-level spell; cast them at will without slots',
      'Signature Spells at level 20 — two 3rd-level spells you can always cast for free once per rest'
    ]
  }
];

// Class → Gigglegloom type mapping
var CLASS_TO_GIGGLEGLOOM = {
  barbarian: 'flamerage', bard: 'featherflow', cleric: 'bubbleseed',
  druid: 'bubbleseed', fighter: 'steelfist', monk: 'steelfist',
  paladin: 'bubbleseed', ranger: 'featherflow', rogue: 'featherflow',
  sorcerer: 'flamerage', warlock: 'flamerage', wizard: 'steelfist'
};

function toggleAccordion(panelId) {
  var panel = document.getElementById(panelId);
  if (!panel) return;
  var body = document.getElementById(panelId + '-body');
  var header = panel.querySelector('.char-accordion-header');
  if (!body || !header) return;
  var isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  header.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  // Render dynamic content when panels first open
  if (!isOpen) {
    if (panelId === 'acc-magic') {
      renderGigglogloomAffinity('char-type-grid');
      if (CHAR_STATE.draft.gigglegloom_type) highlightAffinityCard(CHAR_STATE.draft.gigglegloom_type);
    }
    if (panelId === 'acc-who') {
      restoreStage1Selections();
    }
    if (panelId === 'acc-background') {
      renderBackgroundCards();
      renderSpeciesCards();
      restoreStage1Selections();
      // Restore gender button visual state and unlock species grid
      if (CHAR_STATE.draft.gender) {
        var gBtn = document.querySelector('.char-gender-btn[data-value="' + CHAR_STATE.draft.gender + '"]');
        if (gBtn) selectGender(gBtn);
      }
    }
    if (panelId === 'acc-past') {
      restoreStage1Selections();
    }
    if (panelId === 'acc-appearance') {
      restoreStage1Selections();
    }
    // Mobile: tapping anywhere in an open accordion body selects that option.
    // We attach once per open, and remove on close or on any selection.
    body._accordionTapHandler = function(e) {
      var IGNORE = 'input, button, select, label, a, textarea';
      if (e.target.closest(IGNORE)) return;
      // Find the nearest selectable option card or class card and click it
      var card = e.target.closest('.char-option-card, .char-class-card, .char-bg-card, .char-type-card, .char-region-card, .char-lang-card, .char-alignment-card, .char-species-card');
      if (card) {
        card.click();
      }
    };
    body.addEventListener('click', body._accordionTapHandler);
  } else {
    // Panel closing — remove tap handler if present
    if (body._accordionTapHandler) {
      body.removeEventListener('click', body._accordionTapHandler);
      body._accordionTapHandler = null;
    }
  }
}

function initStage1() {
  // Render dynamic content into accordion panels
  renderBackgroundCards();
  renderSpeciesCards();
  // Restore all Stage 1 selections from draft
  restoreStage1Selections();
}

function restoreStage1Selections() {
  // Name, gender, personality, three last things
  var nameEl = document.getElementById('char-final-name');
  if (nameEl && CHAR_STATE.draft.character_name) nameEl.value = CHAR_STATE.draft.character_name;
  var genderEl = document.getElementById('char-gender');
  if (genderEl && CHAR_STATE.draft.gender) genderEl.value = CHAR_STATE.draft.gender;
  var p1 = document.getElementById('char-personality-1');
  if (p1 && CHAR_STATE.draft.personality_immediate) p1.value = CHAR_STATE.draft.personality_immediate;
  var p2 = document.getElementById('char-personality-2');
  if (p2 && CHAR_STATE.draft.personality_wrong) p2.value = CHAR_STATE.draft.personality_wrong;
  var p3 = document.getElementById('char-personality-3');
  if (p3 && CHAR_STATE.draft.personality_laugh) p3.value = CHAR_STATE.draft.personality_laugh;
  var caresEl = document.getElementById('char-cares-about');
  if (caresEl && CHAR_STATE.draft.cares_about) caresEl.value = CHAR_STATE.draft.cares_about;
  var fearEl = document.getElementById('char-fear');
  if (fearEl && CHAR_STATE.draft.deepest_fear) fearEl.value = CHAR_STATE.draft.deepest_fear;
  var seekEl = document.getElementById('char-seeking');
  if (seekEl && CHAR_STATE.draft.seeking) seekEl.value = CHAR_STATE.draft.seeking;
  // Gigglegloom affinity
  if (CHAR_STATE.draft.gigglegloom_type) {
    highlightAffinityCard(CHAR_STATE.draft.gigglegloom_type);
  }
  // Background, species, region, language, imagined past
  restoreStage2Selections();
  // Alignment
  if (CHAR_STATE.draft.alignment) {
    selectAlignment(CHAR_STATE.draft.alignment);
  }
  // Appearance
  var app = CHAR_STATE.draft.appearance_data;
  if (app) {
    var simpleAppIds = ['app-height','app-build','app-age','app-face-shape',
      'app-eye-color','app-eye-shape','app-facial-hair',
      'app-hair-color','app-hair-style',
      'app-cloak','app-top','app-lower','app-shoes','app-hat',
      'app-hand-right','app-hand-left',
      'app-ring-right','app-ring-left','app-necklace','app-earrings'];
    simpleAppIds.forEach(function(id) {
      var key = id.replace('app-','').replace(/-/g,'_');
      var map = { 'facial_hair': 'facial_hair', 'hair_color': 'hair_color',
                  'hair_style': 'hair_style', 'face_shape': 'face_shape',
                  'eye_color': 'eye_color', 'eye_shape': 'eye_shape' };
      var val = app[map[key] || key];
      if (!val) return;
      var el = document.getElementById(id);
      if (el) el.value = val;
    });
    if (app.skin_tone) {
      var st = document.getElementById('app-skin-tone');
      if (st) st.value = app.skin_tone;
    }
    if (app.facial_markings) {
      document.querySelectorAll('input[name="app-markings"]').forEach(function(cb) {
        cb.checked = app.facial_markings.indexOf(cb.value) >= 0;
      });
    }
    updateAIPrompt();
  }
  // Restore region, language, and past question cards
  restoreStage2Selections();
}

function renderClassGrid() {
  var grid = document.getElementById('char-class-grid');
  if (!grid) return;

  // Icon paths matching TYPE_ICONS in wiki.js
  var AFFINITY_ICONS = {
    bubbleseed:  'assets/icons/icon-bubbleseed.svg',
    featherflow: 'assets/icons/icon-featherflow.svg',
    steelfist:   'assets/icons/icon-steelfist.svg',
    flamerage:   'assets/icons/icon-flamerage.svg'
  };

  grid.innerHTML = CLASS_DATA.map(function(cls) {
    var FEAT_ICONS = [
      // Specific features — checked first, most specific to least
      { pattern: /favored enemy/i,            icon: '🎯' },
      { pattern: /natural explorer/i,         icon: '🌿' },
      { pattern: /hide in plain sight/i,      icon: '👁️' },
      { pattern: /rage/i,                     icon: '👹' },
      { pattern: /unarmored defense/i,        icon: '💪' },
      { pattern: /danger sense/i,             icon: '⁉️' },
      { pattern: /primal path/i,              icon: '🐅' },
      { pattern: /bardic inspiration/i,       icon: '🎭' },
      { pattern: /jack of all trades/i,       icon: '🎵' },
      { pattern: /song of rest/i,             icon: '🎵' },
      { pattern: /expertise/i,               icon: '🎵' },
      { pattern: /destroy undead/i,           icon: '💀' },
      { pattern: /turn undead/i,              icon: '🧟' },
      { pattern: /druidic circle/i,           icon: '💫' },
      { pattern: /druidic/i,                  icon: '💬' },
      { pattern: /timeless body/i,            icon: '⏳' },
      { pattern: /beast spells/i,             icon: '✨' },
      { pattern: /wild shape/i,               icon: '🌿' },
      { pattern: /second wind/i,              icon: '🌬️' },
      { pattern: /action surge/i,             icon: '⚡' },
      { pattern: /indomitable/i,              icon: '👊' },
      { pattern: /martial arts/i,             icon: '🥋' },
      { pattern: /stunning strike/i,          icon: '🤛' },
      { pattern: /unarmored movement/i,       icon: '💨' },
      { pattern: /metamagic/i,                icon: '🔮' },
      { pattern: /pact magic/i,               icon: '🩸' },
      { pattern: /eldritch invocation/i,      icon: '😈' },
      { pattern: /mystic arcanum/i,           icon: '📜' },
      { pattern: /arcane tradition/i,         icon: '⚱️' },
      { pattern: /arcane recovery/i,          icon: '💠' },
      { pattern: /spell mastery/i,            icon: '🧙🏽‍♂️' },
      { pattern: /spellbook/i,                icon: '📖' },
      { pattern: /reckless attack/i,          icon: '⚡' },
      { pattern: /sneak attack/i,             icon: '🗡️' },
      { pattern: /divine smite|smite/i,       icon: '⚔️' },
      { pattern: /extra attack/i,             icon: '⚔️' },
      { pattern: /fighting style/i,           icon: '⚔️' },
      { pattern: /spellcasting/i,             icon: '✨' },
      { pattern: /channel divinity/i,         icon: '☀️' },
      { pattern: /divine intervention/i,      icon: '☀️' },
      { pattern: /aura of protection/i,       icon: '🛡️' },
      { pattern: /sacred oath|monastic tradition|ranger archetype|bard college|sorcerous origin|otherworldly patron/i, icon: '🌟' },
      { pattern: /subclass/i,                 icon: '🌟' },
      { pattern: /cunning action|uncanny dodge|evasion/i, icon: '🗡️' },
      { pattern: /superiority|maneuver/i,     icon: '💫' },
      { pattern: /ki point|flurry|patient defense/i, icon: '👊' },
      { pattern: /eldritch blast/i,           icon: '😈' },
      { pattern: /dark one|pact of/i,         icon: '🩸' },
      { pattern: /signature spell/i,          icon: '🧙🏽‍♂️' },
      // Generic fallback
      { pattern: /./,                         icon: '✦' }
    ];
    var featuresHtml = cls.features.map(function(f) {
      var icon = '✦';
      for (var fi = 0; fi < FEAT_ICONS.length; fi++) {
        if (FEAT_ICONS[fi].pattern.test(f)) { icon = FEAT_ICONS[fi].icon; break; }
      }
      return '<li><span class="char-feature-icon">' + icon + '</span><span>' + f + '</span></li>';
    }).join('');

    var traitsHtml = [
      { label: 'HIT DIE',  value: cls.hit_die,  tip: cls.hit_die_tip  },
      { label: 'PRIMARY',  value: cls.primary,  tip: null              },
      { label: 'SAVES',    value: cls.saves,    tip: cls.saves_tip    },
      { label: 'ARMOR',    value: cls.armor,    tip: null              },
      { label: 'WEAPONS',  value: cls.weapons,  tip: cls.weapons_tip  }
    ].map(function(t) {
      var labelHtml = t.tip
        ? '<span class="char-class-trait-label char-trait-has-tip char-field-tooltip" data-tip="' + t.tip.replace(/"/g, '&quot;') + '">'
          + t.label + ' <span class="char-trait-tip-icon">?</span></span>'
        : '<span class="char-class-trait-label">' + t.label + '</span>';
      return '<span class="char-class-trait">' + labelHtml + t.value + '</span>';
    }).join('');

    var skillsHtml = cls.skills_list.map(function(sk) {
      var tip = cls.skills_tip[sk] || '';
      return '<label class="char-skill-option" data-class="' + cls.id + '">'
        + '<input type="checkbox" name="skill-' + cls.id + '" value="' + sk + '">'
        + '<span class="char-skill-name">' + sk
        +   (tip ? ' <span class="char-field-tooltip" data-tip="' + tip.replace(/"/g, '&quot;') + '"><span class="char-trait-tip-icon">?</span></span>' : '')
        + '</span>'
        + '</label>';
    }).join('');

    return '<div class="char-class-card" data-class="' + cls.id + '" data-gigglegloom="' + cls.gigglegloom + '">'
      + '<div class="char-class-card-header" onclick="selectClass(\'' + cls.id + '\')">'
      +   '<img class="char-class-icon" src="assets/images/classes/class-' + cls.id + '.webp" alt="' + cls.name + '">'
      +   '<div class="char-class-card-names">'
      +     '<div class="char-class-name">' + cls.name + '</div>'
      +   '</div>'
      +   '<div class="char-class-card-check">✓</div>'
      +   '<button class="char-bg-toggle" onclick="event.stopPropagation();toggleClassCard(this)" aria-label="Toggle details">Details</button>'
      + '</div>'
      + '<div class="char-class-summary" onclick="selectClass(\'' + cls.id + '\')">' + cls.summary + '</div>'
      + '<div class="char-class-body">'
      +   '<div class="char-class-traits">' + traitsHtml + '</div>'
      +   '<div class="char-class-skills-section" id="skills-section-' + cls.id + '">'
      +     '<div class="char-class-skills-required">⚠ Required — choose ' + cls.skills_count + ' skills before you can continue</div>'
      +     '<div class="char-class-skills-header">'
      +       '<div class="char-class-skills-label">Choose ' + cls.skills_count + ' skills</div>'
      +       '<div class="char-class-skills-slots" id="skills-slots-' + cls.id + '">'
      +         Array.from({length: cls.skills_count}, function() {
                  return '<div class="char-class-skills-slot">✓</div>';
                }).join('')
      +       '</div>'
      +     '</div>'
      +     '<div class="char-class-skills-grid">' + skillsHtml + '</div>'
      +     '<div class="char-class-skills-count" id="skill-count-' + cls.id + '">Choose ' + cls.skills_count + ' to continue</div>'
      +   '</div>'
      +   '<div class="char-class-features-label">Key Features</div>'
      +   '<ul class="char-class-features">' + featuresHtml + '</ul>'
      + '</div>'
      + '</div>';
  }).join('');

  // Wire skill checkboxes
  document.querySelectorAll('.char-skill-option input[type=checkbox]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      var classId = this.closest('.char-class-card').dataset.class;
      var cls = CLASS_DATA.find(function(c) { return c.id === classId; });
      // Auto-select this class if the player picks a skill without clicking the header
      if (CHAR_STATE.draft.class_id !== classId) {
        selectClass(classId);
      }
      var checked = document.querySelectorAll('input[name="skill-' + classId + '"]:checked');
      if (checked.length > cls.skills_count) {
        this.checked = false;
        return;
      }

      // Clear skill selections on every OTHER class card
      CLASS_DATA.forEach(function(otherCls) {
        if (otherCls.id === classId) return;
        // Uncheck all checkboxes for the other class
        document.querySelectorAll('input[name="skill-' + otherCls.id + '"]').forEach(function(cb) {
          cb.checked = false;
        });
        // Reset slot UI
        var otherSlots = document.getElementById('skills-slots-' + otherCls.id);
        if (otherSlots) {
          otherSlots.querySelectorAll('.char-class-skills-slot').forEach(function(slot) {
            slot.classList.remove('filled');
          });
        }
        // Reset counter text
        var otherCounter = document.getElementById('skill-count-' + otherCls.id);
        if (otherCounter) otherCounter.textContent = 'Choose ' + otherCls.skills_count + ' to continue';
        // Reset section state
        var otherSection = document.getElementById('skills-section-' + otherCls.id);
        if (otherSection) otherSection.classList.remove('skills-complete');
        // Clear from draft
        delete CHAR_STATE.draft['skills_' + otherCls.id];
      });

      // Update current class UI
      var counter = document.getElementById('skill-count-' + classId);
      var section = document.getElementById('skills-section-' + classId);
      var slotsEl = document.getElementById('skills-slots-' + classId);
      var complete = checked.length >= cls.skills_count;
      if (counter) counter.textContent = complete ? '✓ All skills chosen' : 'Choose ' + cls.skills_count + ' to continue';
      if (section) section.classList.toggle('skills-complete', complete);
      if (slotsEl) {
        slotsEl.querySelectorAll('.char-class-skills-slot').forEach(function(slot, i) {
          slot.classList.toggle('filled', i < checked.length);
        });
      }
      CHAR_STATE.draft['skills_' + classId] = Array.from(checked).map(function(c) { return c.value; });
      saveDraftToStorage();
      updateStage2SkillAlert();
    });
  });

  // Wire tooltips for dynamically rendered [data-tip] elements
  document.querySelectorAll('#char-class-grid [data-tip]').forEach(function(el) {
    if (typeof wireTooltip === 'function') wireTooltip(el);
  });
}

function renderGigglogloomAffinity(targetId) {
  var grid = document.getElementById(targetId || 'char-type-grid');
  if (!grid) return;
  var TYPE_COLORS = {
    bubbleseed: '#2a7a3a',
    featherflow: '#2266b8',
    steelfist:  '#6a3aaa',
    flamerage:  '#aa3a1a'
  };
  grid.innerHTML = Object.keys(GIGGLEGLOOM_TYPES).map(function(typeId) {
    var t = GIGGLEGLOOM_TYPES[typeId];
    var color = TYPE_COLORS[typeId] || '#c8a83a';
    return '<div class="char-type-card" data-type="' + typeId + '" onclick="selectType(\'' + typeId + '\')" style="--type-color:' + color + '">'
      + '<div class="char-type-video-wrap">'
      +   '<video class="char-type-video" src="assets/videos/anim-' + typeId + '.mp4" autoplay muted loop playsinline preload="none"></video>'
      +   '<div class="char-type-video-overlay"></div>'
      + '</div>'
      + '<div class="char-type-content">'
      +   '<div class="char-type-check">✓</div>'
      +   '<div class="char-type-header">'
      +     '<img class="char-type-icon" src="assets/icons/icon-' + typeId + '.svg" alt="' + t.name + '">'
      +     '<div class="char-type-meta">'
      +       '<div class="char-type-name">' + t.name + '</div>'
      +       '<div class="char-type-element">' + t.element + '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="char-type-desc">' + t.desc + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
  // Lazy-load videos when the grid scrolls into view
  if ('IntersectionObserver' in window) {
    var videoObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.char-type-video').forEach(function(v) {
            if (v.preload === 'none') { v.preload = 'metadata'; v.load(); }
          });
          videoObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '200px' });
    videoObserver.observe(grid);
  }
}

function highlightAffinityCard(typeId) {
  document.querySelectorAll('.char-type-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.type === typeId);
  });
}

function toggleClassCard(btn) {
  var card = btn.closest('.char-class-card');
  if (!card) return;
  var expanding = !card.classList.contains('expanded');
  card.classList.toggle('expanded');
  btn.classList.toggle('open');
  btn.textContent = expanding ? 'Close' : 'Details';
}

function selectClass(classId) {
  document.querySelectorAll('.char-class-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.class === classId);
  });
  var typeId = CLASS_TO_GIGGLEGLOOM[classId] || 'bubbleseed';
  CHAR_STATE.draft.class_id = classId;
  CHAR_STATE.draft.gigglegloom_type = typeId;
  saveDraftToStorage();
  updateStage2SkillAlert();
}

function updateStage2SkillAlert() {
  var classId = CHAR_STATE.draft.class_id;
  var cls = classId ? CLASS_DATA.find(function(c) { return c.id === classId; }) : null;
  var btn = document.getElementById('char-stage2-continue');
  var alert = document.getElementById('char-stage2-skill-alert');
  if (!cls || !btn) return;
  var chosen = (CHAR_STATE.draft['skills_' + classId] || []).length;
  var needed = cls.skills_count;
  var complete = chosen >= needed;
  btn.disabled = !complete;
  if (alert) {
    alert.classList.toggle('visible', !complete);
    // Always remove and recreate the link so it targets the current class
    var oldLink = alert.querySelector('.char-skill-scroll-link');
    if (oldLink) oldLink.parentNode.removeChild(oldLink);
    if (!complete) {
      var skillsSection = document.getElementById('skill-count-' + classId);
      if (skillsSection) {
        var link = document.createElement('a');
        link.className = 'char-skill-scroll-link';
        link.href = '#';
        link.textContent = ' — Take me there →';
        link.addEventListener('click', function(e) {
          e.preventDefault();
          // Ensure the selected class card is expanded before scrolling
          var card = document.querySelector('.char-class-card[data-class="' + classId + '"]');
          if (card && !card.classList.contains('expanded')) {
            card.classList.add('expanded');
            var btn = card.querySelector('.char-bg-toggle');
            if (btn) { btn.classList.add('open'); btn.textContent = 'Close'; }
          }
          scrollToField(skillsSection);
        });
        alert.appendChild(link);
      }
    }
  }
}

function selectType(typeId, silent) {
  highlightAffinityCard(typeId);
  // Reveal class section on first affinity selection
  var classSection = document.getElementById('char-class-section');
  if (classSection) classSection.style.display = 'block';
  if (!silent) {
    CHAR_STATE.draft.gigglegloom_type = typeId;
    saveDraftToStorage();

  }
}

function restoreClassSelection(classId) {
  var card = document.querySelector('.char-class-card[data-class="' + classId + '"]');
  if (card) {
    card.classList.add('selected');
    card.classList.add('expanded');
    var btn = card.querySelector('.char-bg-toggle');
    if (btn) { btn.classList.add('open'); btn.textContent = 'Close'; }
  }
  // Restore skill checkbox state from draft
  var cls = CLASS_DATA.find(function(c) { return c.id === classId; });
  var savedSkills = CHAR_STATE.draft['skills_' + classId] || [];
  if (cls && savedSkills.length) {
    savedSkills.forEach(function(skillVal) {
      var cb = document.querySelector('input[name="skill-' + classId + '"][value="' + skillVal + '"]');
      if (cb) cb.checked = true;
    });
    var section = document.getElementById('skills-section-' + classId);
    var counter = document.getElementById('skill-count-' + classId);
    var slotsEl = document.getElementById('skills-slots-' + classId);
    var complete = savedSkills.length >= cls.skills_count;
    if (section) section.classList.toggle('skills-complete', complete);
    if (counter) counter.textContent = complete ? '✓ All skills chosen' : 'Choose ' + cls.skills_count + ' to continue';
    if (slotsEl) {
      slotsEl.querySelectorAll('.char-class-skills-slot').forEach(function(slot, i) {
        slot.classList.toggle('filled', i < savedSkills.length);
      });
    }
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

// ── STAGE 2: BACKGROUND + SPECIES ──────────────────────────────────
function initStage2() {
  renderClassGrid();
  if (CHAR_STATE.draft.class_id) {
    restoreClassSelection(CHAR_STATE.draft.class_id);
  }
  updateStage2SkillAlert();
}

function renderBackgroundCards() {
  var grid = document.getElementById('char-background-grid');
  if (!grid) return;
  grid.innerHTML = ANAVALE_BACKGROUNDS.map(function(bg) {
    var FEAT_TIPS = {
      'Skilled':           'Gain proficiency in 3 additional skills of your choice.',
      'Lucky':             'Reroll any attack roll, ability check, or saving throw 3 times per long rest — use the new result.',
      'Alert':             '+5 to initiative. You can\'t be surprised. Hidden creatures gain no advantage on attacks against you.',
      'Tough':             'Your maximum hit points increase by 2 for every level, including this one.',
      'Magic Initiate':    'Learn 2 cantrips and 1 first-level spell from any class. Cast the spell once per long rest without a spell slot.',
      'Inspiring Leader':  'After a 10-minute speech, nearby allies gain temporary HP equal to your level + your Charisma modifier.',
      'Tavern Brawler':    'Proficiency with improvised weapons. Unarmed strikes deal 1d4 + Strength modifier.',
      'Savage Attacker':   'Once per turn when you hit with a weapon, reroll the damage dice and use the higher result.',
      'Keen Mind':         'Always know which direction is north, how long until sunrise/sunset, and can recall anything you\'ve heard or read in the past month.'
    };
    var bonusHtml = bg.bonuses.map(function(b) {
      var tip = FEAT_TIPS[b] || '';
      if (tip) {
        return b + ' <span class="char-field-tooltip" data-tip="' + tip.replace(/"/g, '&quot;') + '"><span class="char-trait-tip-icon">?</span></span>';
      }
      return b;
    }).join(' · ');
    return '<div class="char-bg-card" data-bg="' + bg.id + '">'
      + '<div class="char-bg-header" onclick="selectBackground(\'' + bg.id + '\')">'
      +   '<img class="char-bg-thumb" src="assets/images/backgrounds/bg-' + bg.id + '.png" alt="" aria-hidden="true">'
      +   '<div class="char-bg-header-info">'
      +     '<div class="char-bg-name">' + bg.name + '</div>'
      +     '<div class="char-bg-phb">' + bg.phb + '</div>'
      +   '</div>'
      +   '<div class="char-bg-header-right">'
      +     '<div class="char-bg-check">✓</div>'
      +     '<button class="char-bg-toggle" onclick="event.stopPropagation();toggleBgCard(this)" aria-label="Toggle details">Expand</button>'
      +   '</div>'
      + '</div>'
      + '<div class="char-bg-body">'
      +   '<div class="char-bg-lore">' + bg.lore + '</div>'
      +   '<div class="char-bg-body-footer">'
      +     '<span class="char-bg-bonus-row">' + bonusHtml + '</span>'
      +     '<span class="char-bg-skills"><span class="char-bg-skill-label">Skills</span> '
      +       bg.skills.map(function(sk) {
                var SKILL_TIPS = {
                  'Acrobatics':       'Dexterity — tumbling, balancing, graceful physical feats.',
                  'Animal Handling':  'Wisdom — calming, controlling, or reading animals.',
                  'Arcana':           'Intelligence — knowledge of magic, spells, and the Gigglegloom.',
                  'Athletics':        'Strength — climbing, jumping, swimming, feats of raw power.',
                  'Deception':        'Charisma — misleading, lying convincingly, disguising intent.',
                  'History':          'Intelligence — recalling past events, legends, and lore.',
                  'Insight':          'Wisdom — reading people, sensing lies, understanding motives.',
                  'Intimidation':     'Charisma — frightening, threatening, pressuring others.',
                  'Investigation':    'Intelligence — searching carefully, finding clues, deducing.',
                  'Medicine':         'Wisdom — stabilizing the dying, diagnosing illness or poison.',
                  'Nature':           'Intelligence — knowledge of plants, animals, weather, terrain.',
                  'Perception':       'Wisdom — noticing things around you with your senses.',
                  'Performance':      'Charisma — entertaining through music, dance, acting, storytelling.',
                  'Persuasion':       'Charisma — convincing others through reason, charm, or negotiation.',
                  'Religion':         'Intelligence — knowledge of gods, rites, and holy symbols.',
                  'Sleight of Hand':  'Dexterity — pickpocketing, planting items, fine manual trickery.',
                  'Stealth':          'Dexterity — moving silently and hiding from notice.',
                  'Survival':         'Wisdom — tracking, foraging, navigating, and surviving the wild.'
                };
                var tip = SKILL_TIPS[sk] || '';
                return sk + (tip ? ' <span class="char-field-tooltip" data-tip="' + tip.replace(/"/g, '&quot;') + '"><span class="char-trait-tip-icon">?</span></span>' : '');
              }).join(' · ')
      +     '</span>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }).join('');
  document.querySelectorAll('#acc-background-body [data-tip]').forEach(function(el) {
    if (typeof wireTooltip === 'function') wireTooltip(el);
  });
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
    id: 'brightblood', name: 'Brightblood', phb: 'Aasimar',
    region: 'Brightcreed temples, Solenveil',
    affinity: 'Bubbleseed, Oro resonance',
    desc: 'Brightblood carry a trace of Oro\'s attention — not a blessing exactly, more like being quietly watched by something that loves you. Their Gigglegloom is warm and difficult to extinguish, even when they are.'
  },
  {
    id: 'duskborn', name: 'Duskborn', phb: 'Tiefling',
    region: 'Veilhaven, Reveltown, scattered',
    affinity: 'Flamerage, shadow-adjacent',
    desc: 'Duskborn carry something old in their blood — a resonance with the edges of the Gigglegloom that most people never touch. This makes them interesting at parties and occasionally unsettling in quiet rooms.'
  },
  {
    id: 'glimmerkin', name: 'Glimmerkin', phb: 'Gnome',
    region: 'Bumbleton, Prismhold, Zippydoda Hills',
    affinity: 'Bubbleseed, Steelfist',
    desc: 'Glimmerkin are the reason half the Conclave\'s safety protocols exist. Their magic is precise and enthusiastic simultaneously, which produces results that are either brilliant or spectacular, sometimes both at once.'
  },
  {
    id: 'gloomtouched', name: 'Gloomtouched', phb: 'Warforged',
    region: 'Prismhold, Conclave sites',
    affinity: 'Steelfist',
    desc: 'Gloomtouched were made rather than born, constructed at Conclave sites where Steelfist magic runs deep. They experience the Gigglegloom as something woven into their structure rather than something they carry. The distinction matters to them.'
  },
  {
    id: 'hearthbound', name: 'Hearthbound', phb: 'Halfling',
    region: 'Pebbleshire, Mirrenport, Caparia',
    affinity: 'Bubbleseed',
    desc: 'Hearthbound carry warmth the way other people carry weapons — automatically and without thinking much about it. Their Gigglegloom responds to belonging and comfort. They are very difficult to discourage.'
  },
  {
    id: 'rootwalker', name: 'Rootwalker', phb: 'Orc',
    region: 'Jugabi, outer Dingu Forest',
    affinity: 'Bubbleseed, Flamerage',
    desc: 'Rootwalkers carry two currents that most people assume cancel each other out. They do not. The result is someone who grows things and protects them with the same intensity, which the Jugabi rainforest finds completely reasonable.'
  },
  {
    id: 'scalegrace', name: 'Scalegrace', phb: 'Dragonborn',
    region: 'Sohot volcanic, Caparia trade cities',
    affinity: 'Flamerage',
    desc: 'Scalegrace come from a tradition that treats fire as a conversation rather than a weapon. Their Gigglegloom runs hot and expressive. They are rarely subtle and have mostly made peace with this.'
  },
  {
    id: 'solmeri', name: 'Solmeri', phb: 'Human',
    region: 'Everywhere',
    affinity: 'Adaptable — no dominant type',
    desc: 'Solmeri are found in every corner of Anavale, shaped by wherever they were born rather than any single magical tradition. They carry the Gigglegloom lightly, which means it fits them in whatever way they need it to.'
  },
  {
    id: 'stonemarked', name: 'Stonemarked', phb: 'Dwarf',
    region: 'Jani Mountains, Tanaki Peaks',
    affinity: 'Steelfist',
    desc: 'Stonemarked are carved from the same stubbornness as the mountains they come from. Their Gigglegloom runs in straight lines and holds its shape under pressure. They find this satisfying. Others find it occasionally alarming.'
  },
  {
    id: 'tallwalker', name: 'Tallwalker', phb: 'Goliath',
    region: 'Doopu Peaks, Tanaki, Jani Mountains',
    affinity: 'Steelfist, Flamerage',
    desc: 'Tallwalkers grow up where the weather is a daily negotiation and the ground does not forgive mistakes. Their magic reflects this — solid, purposeful, and with very little patience for anything decorative.'
  },
  {
    id: 'veilstepped', name: 'Veilstepped', phb: 'Changeling',
    region: 'Everywhere, documented nowhere',
    affinity: 'Featherflow, Solvara-adjacent',
    desc: 'Veilstepped are the only species that the Chroma Bureau has consistently failed to count. Their Gigglegloom moves like water around whatever shape is needed. They are not hiding. They are simply not particularly invested in being found.'
  },
  {
    id: 'verdathi', name: 'Verdathi', phb: 'Elf',
    region: 'Dingu, Opu & Dodooti Forests',
    affinity: 'Featherflow, Bubbleseed',
    desc: 'Verdathi grow up in the old forests where the Gigglegloom pools deepest. They move like they have time — because in the forests, they do. Most are unhurried in a way that others sometimes mistake for indifference.'
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
  var gender = CHAR_STATE.draft.gender || 'm';
  var suffix = gender === 'female' ? 'f' : gender === 'non-binary' ? 'nb' : 'm';
  grid.innerHTML = ANAVALE_SPECIES.map(function(sp) {
    return '<div class="char-bg-card" data-species="' + sp.id + '">'
      + '<div class="char-bg-header" onclick="selectSpecies(\'' + sp.id + '\')">'
      +   '<img class="char-bg-thumb" src="assets/images/species/sp-' + sp.id + '-' + suffix + '.png" alt="' + sp.name + '">'
      +   '<div class="char-bg-header-info">'
      +     '<div class="char-bg-name">' + sp.name + '</div>'
      +     '<div class="char-bg-phb">' + sp.phb + '</div>'
      +   '</div>'
      +   '<div class="char-bg-header-right">'
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
  // Restore selection if already chosen
  if (CHAR_STATE.draft.species_id) {
    var selected = grid.querySelector('[data-species="' + CHAR_STATE.draft.species_id + '"]');
    if (selected) selected.classList.add('selected');
  }
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

}

function restoreStage2Selections() {
  if (CHAR_STATE.draft.background_id) {
    selectBackground(CHAR_STATE.draft.background_id);
  }
  if (CHAR_STATE.draft.species_id) {
    if (typeof selectSpecies === 'function') selectSpecies(CHAR_STATE.draft.species_id);
  }

  // Restore region cards
  if (CHAR_STATE.draft.home_region) {
    var regVal = CHAR_STATE.draft.home_region;
    var regHidden = document.getElementById('char-home-region');
    if (regHidden) regHidden.value = regVal;
    document.querySelectorAll('.char-region-card').forEach(function(card) {
      card.classList.toggle('selected', (card.dataset.value || '').toLowerCase() === regVal.toLowerCase());
    });
  }
  // Restore language cards
  if (CHAR_STATE.draft.language) {
    var langVal = CHAR_STATE.draft.language;
    var langHidden = document.getElementById('char-language');
    if (langHidden) langHidden.value = langVal;
    document.querySelectorAll('.char-lang-card').forEach(function(card) {
      card.classList.toggle('selected', (card.dataset.value || '').toLowerCase() === langVal.toLowerCase());
    });
  }

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
        preview.innerHTML = effect.replace(/(\+\d+)/g, '<span style="color:#6ecf6e;">$1</span>');
        preview.classList.add('visible');
      }
      // Mark question answered
      var questionEl = document.getElementById('past-q-' + f.past);
      if (questionEl) questionEl.classList.add('answered');
    }
  });
  // Restore kept-to-myself free skill pick
  if (CHAR_STATE.draft['past_org_solo_skill'] && CHAR_STATE.draft['past_org'] === 'kept-to-myself') {
    var picker = document.getElementById('org-solo-skill-picker');
    var sel    = document.getElementById('org-solo-skill-select');
    if (picker) picker.style.display = 'block';
    if (sel)    sel.value = CHAR_STATE.draft['past_org_solo_skill'];
  }
}

// ── STAGE VALIDATION ───────────────────────────────────────────────
function validateStage(n) {
  if (n === 1) {
    // Stage 1: Your Story — no hard gates, all optional lore fields
  }
  if (n === 2) {
    if (!CHAR_STATE.draft.gigglegloom_type) {
      showToast('Please choose a Gigglegloom type first.');
      return false;
    }
    if (!CHAR_STATE.draft.class_id) {
      showToast('Please choose a class within your Gigglegloom type.');
      return false;
    }
    var classId2 = CHAR_STATE.draft.class_id;
    var cls2 = CLASS_DATA.find(function(c) { return c.id === classId2; });
    if (cls2) {
      var chosenSkills2 = (CHAR_STATE.draft['skills_' + classId2] || []);
      if (chosenSkills2.length < cls2.skills_count) {
        showToast('Choose ' + cls2.skills_count + ' skills for your class before continuing.');
        return false;
      }
    }
  }
  if (n === 3) {
    var abilities = ['str','dex','con','int','wis','cha'];
    var allAssigned = abilities.every(function(ab) {
      return document.getElementById('char-ability-' + ab) &&
             document.getElementById('char-ability-' + ab).value !== '';
    });
    if (!allAssigned) {
      showToast('Please assign all six ability scores before continuing.');
      return false;
    }
  }
  if (n === 4) {
    var goldRemaining = getStartingGold() - calcGoldSpent();
    if (goldRemaining < 0) {
      showToast('You\'ve spent more than your starting gold. Remove some items before continuing.', 'error');
      return false;
    }
  }
  return true;
}

// ── STAGE DATA COLLECTION ──────────────────────────────────────────
function collectStageData(n) {
  if (n === 1) collectStage1Data();
  if (n === 2) collectStage2Data();
  if (n === 3) collectStage3Data();
  if (n === 4) collectStage4Data();
  if (n === 5) collectStage5Data();
}

function selectGender(btn) {
  var container = btn.closest('.char-gender-options');
  container.querySelectorAll('.char-gender-btn').forEach(function(b) {
    b.classList.remove('selected');
  });
  btn.classList.add('selected');
  var hidden = document.getElementById('char-gender');
  if (hidden) hidden.value = btn.dataset.value;
  CHAR_STATE.draft.gender = btn.dataset.value;
  saveDraftToStorage();
  // Unlock and re-render species grid with gender-correct portraits
  var section = document.getElementById('char-species-section');
  if (section) section.classList.remove('char-species-section--locked');
  var lockedMsg = document.getElementById('char-species-locked-msg');
  if (lockedMsg) lockedMsg.style.display = 'none';
  var grid = document.getElementById('char-species-grid');
  if (grid) grid.style.display = 'block';
  renderSpeciesCards();
}

function collectStage1Data() {
  // Name, gender, personality
  syncCharacterName();
  CHAR_STATE.draft.character_name      = getVal('char-final-name');
  CHAR_STATE.draft.gender              = getVal('char-gender');
  CHAR_STATE.draft.personality_immediate = getVal('char-personality-1');
  CHAR_STATE.draft.personality_wrong   = getVal('char-personality-2');
  CHAR_STATE.draft.personality_laugh   = getVal('char-personality-3');
  // Gigglegloom affinity (read from DOM in case card was clicked without Continue)
  var selectedType = document.querySelector('.char-type-card.selected');
  if (selectedType && selectedType.dataset.type) {
    CHAR_STATE.draft.gigglegloom_type = selectedType.dataset.type;
  }
  // Background, species, region, language
  CHAR_STATE.draft.background_id = getVal('char-background');
  CHAR_STATE.draft.species_id    = getVal('char-species');
  CHAR_STATE.draft.home_region   = getVal('char-home-region');
  CHAR_STATE.draft.language      = getVal('char-language');
  // Imagined past — keys must match selectPastCard's 'past_' + pastKey pattern
  CHAR_STATE.draft['past_raised']      = getVal('char-raised')      || CHAR_STATE.draft['past_raised'];
  CHAR_STATE.draft['past_friend']      = getVal('char-friend')      || CHAR_STATE.draft['past_friend'];
  CHAR_STATE.draft['past_pet']         = getVal('char-pet')         || CHAR_STATE.draft['past_pet'];
  CHAR_STATE.draft['past_love']        = getVal('char-love')        || CHAR_STATE.draft['past_love'];
  CHAR_STATE.draft['past_org']         = getVal('char-org')         || CHAR_STATE.draft['past_org'];
  CHAR_STATE.draft['past_left-behind'] = getVal('char-left-behind') || CHAR_STATE.draft['past_left-behind'];
  CHAR_STATE.draft['past_why-left']    = getVal('char-why-left')    || CHAR_STATE.draft['past_why-left'];
  // Appearance
  CHAR_STATE.draft.appearance_data   = collectAppearanceData();
  CHAR_STATE.draft.appearance_prompt = buildAIPrompt(CHAR_STATE.draft.appearance_data);
  // Alignment
  CHAR_STATE.draft.alignment       = getVal('char-alignment') || CHAR_STATE.draft.alignment;
  CHAR_STATE.draft.alignment_trait = CHAR_STATE.draft.alignment_trait || null;
  // Cares/fear/seeking (Three Last Things)
  CHAR_STATE.draft.cares_about  = getVal('char-cares-about');
  CHAR_STATE.draft.deepest_fear = getVal('char-fear');
  CHAR_STATE.draft.seeking      = getVal('char-seeking');
  saveDraftToStorage();
}

function collectStage2Data() {
  var selectedCard = document.querySelector('.char-class-card.selected');
  if (selectedCard && selectedCard.dataset.class) {
    CHAR_STATE.draft.class_id = selectedCard.dataset.class;
  }
  var selectedType = document.querySelector('.char-type-card.selected');
  if (selectedType && selectedType.dataset.type) {
    CHAR_STATE.draft.gigglegloom_type = selectedType.dataset.type;
  }
  saveDraftToStorage();
}

function collectStage3Data() {
  CHAR_STATE.draft.ability_scores = {
    str: parseInt(getVal('char-ability-str')) || null,
    dex: parseInt(getVal('char-ability-dex')) || null,
    con: parseInt(getVal('char-ability-con')) || null,
    int: parseInt(getVal('char-ability-int')) || null,
    wis: parseInt(getVal('char-ability-wis')) || null,
    cha: parseInt(getVal('char-ability-cha')) || null
  };
  saveDraftToStorage();
}

function collectStage4Data() {
  CHAR_STATE.draft.appearance_data   = collectAppearanceData();
  CHAR_STATE.draft.appearance_prompt = buildAIPrompt(CHAR_STATE.draft.appearance_data);
  saveDraftToStorage();
}

function collectStage5Data() {
  // Stage 5 is a read-only summary — all data was collected in prior stages
  saveDraftToStorage();
}

// ── CLASS STARTING GEAR (PHB 2024) ────────────────────────────────
var CLASS_STARTING_GEAR = {
  barbarian: {
    armor: null,
    unarmored_ac: 'AC = 10 + Dex + Con modifier while unarmored',
    weapons: ['Greataxe', 'Two handaxes', '4 javelins'],
    pack: "Explorer's Pack",
    pack_contents: 'Backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50 ft hempen rope'
  },
  bard: {
    armor: 'Leather Armor',
    unarmored_ac: null,
    weapons: ['Rapier', 'Dagger'],
    pack: "Entertainer's Pack",
    pack_contents: 'Backpack, bedroll, 2 costumes, 5 candles, 5 days rations, waterskin, disguise kit',
    pack_extras: 'Musical instrument of your choice'
  },
  cleric: {
    armor: 'Scale Mail',
    unarmored_ac: null,
    weapons: ['Mace', 'Shield'],
    pack: "Priest's Pack",
    pack_contents: 'Backpack, blanket, 10 candles, tinderbox, alms box, 2 blocks incense, censer, vestments, 2 days rations, waterskin',
    pack_extras: 'Holy Symbol'
  },
  druid: {
    armor: 'Leather Armor',
    unarmored_ac: null,
    weapons: ['Quarterstaff', 'Shield'],
    pack: "Explorer's Pack",
    pack_contents: 'Backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50 ft hempen rope',
    pack_extras: 'Druidic Focus (no metal armor)'
  },
  fighter: {
    armor: 'Chain Mail',
    unarmored_ac: null,
    weapons: ['Longsword', 'Shield', 'Light Crossbow + 20 bolts'],
    pack: "Dungeoneer's Pack",
    pack_contents: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50 ft hempen rope'
  },
  monk: {
    armor: null,
    unarmored_ac: 'AC = 10 + Dex + Wis modifier while unarmored',
    weapons: ['Shortsword', '5 darts'],
    pack: "Dungeoneer's Pack",
    pack_contents: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50 ft hempen rope'
  },
  paladin: {
    armor: 'Chain Mail',
    unarmored_ac: null,
    weapons: ['Longsword', 'Shield', 'Javelin (×5)'],
    pack: "Priest's Pack",
    pack_contents: 'Backpack, blanket, 10 candles, tinderbox, alms box, 2 blocks incense, censer, vestments, 2 days rations, waterskin',
    pack_extras: 'Holy Symbol'
  },
  ranger: {
    armor: 'Scale Mail',
    unarmored_ac: null,
    weapons: ['Longsword', 'Two shortswords', 'Longbow + 20 arrows'],
    pack: "Explorer's Pack",
    pack_contents: 'Backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50 ft hempen rope'
  },
  rogue: {
    armor: 'Leather Armor',
    unarmored_ac: null,
    weapons: ['Rapier', 'Shortbow + 20 arrows', 'Dagger (×2)'],
    pack: "Burglar's Pack",
    pack_contents: 'Backpack, 1000 ball bearings, 10 ft string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 flasks oil, 5 days rations, tinderbox, waterskin',
    pack_extras: "Thieves' Tools"
  },
  sorcerer: {
    armor: null,
    unarmored_ac: null,
    weapons: ['Light Crossbow + 20 bolts', 'Dagger (×2)'],
    pack: "Dungeoneer's Pack",
    pack_contents: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50 ft hempen rope',
    pack_extras: 'Arcane Focus'
  },
  warlock: {
    armor: 'Leather Armor',
    unarmored_ac: null,
    weapons: ['Light Crossbow + 20 bolts', 'Dagger (×2)'],
    pack: "Scholar's Pack",
    pack_contents: 'Backpack, book of lore, bottle of ink, ink pen, 10 sheets parchment, little bag of sand, small knife',
    pack_extras: 'Arcane Focus'
  },
  wizard: {
    armor: null,
    unarmored_ac: null,
    weapons: ['Quarterstaff', 'Dagger'],
    pack: "Scholar's Pack",
    pack_contents: 'Backpack, book of lore, bottle of ink, ink pen, 10 sheets parchment, little bag of sand, small knife',
    pack_extras: 'Spellbook + Arcane Focus'
  }
};

// Stat data for clothing options (used by stat chip display)
var CLOTHING_STATS = {
  // app-top
  'plate armour':        { ac: 'AC 18', weight: 'Heavy', note: 'Str 15 req · Stealth ⚠' },
  'chainmail shirt':     { ac: 'AC 13 + Dex (max +2)', weight: 'Heavy', note: 'Str 13 req · Stealth ⚠' },
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
    { value: '',                  label: '— choose —' },
    { value: 'arcane vestments',  label: 'Arcane vestments' },
    { value: 'linen shirt',       label: 'Linen shirt' },
    { value: "monk's gi",         label: "Monk's gi" },
    { value: 'robes',             label: 'Robes' },
    { value: 'simple tunic',      label: 'Simple tunic' },
    { value: 'wrapped cloth',     label: 'Wrapped cloth' }
  ],
  light: [
    { value: 'leather jerkin',    label: 'Leather jerkin',   cost_gp: 10 },
    { value: 'padded gambeson',   label: 'Padded gambeson',  cost_gp: 5  },
    { value: 'studded leather',   label: 'Studded leather',  cost_gp: 45 },
    { value: "traveller's coat",  label: "Traveller's coat", cost_gp: 2  }
  ],
  medium: [
    { value: 'breastplate',       label: 'Breastplate',      cost_gp: 400 },
    { value: 'chainmail shirt',   label: 'Chain shirt',      cost_gp: 50  },
    { value: "ranger's mail",     label: "Ranger's mail",    cost_gp: 30  },
    { value: 'scale mail',        label: 'Scale mail',       cost_gp: 50  }
  ],
  heavy: [
    { value: 'half-plate cuirass', label: 'Half-plate cuirass', cost_gp: 750 },
    { value: 'plate armour',       label: 'Plate armour',        cost_gp: 1500 },
    { value: 'splint coat',        label: 'Splint coat',         cost_gp: 200  }
  ]
};

// Lower-body options by tier
var LOWER_TIERS = {
  unarmored: [
    { value: '',                    label: '— choose —' },
    { value: 'flowing robes',       label: 'Flowing robes' },
    { value: 'a long skirt',        label: 'Long skirt' },
    { value: 'a skirt',             label: 'Skirt' },
    { value: 'trousers',            label: 'Trousers' },
    { value: 'wrapped cloth lower', label: 'Wrapped cloth' }
  ],
  light: [
    { value: 'leather breeches',    label: 'Leather breeches', cost_gp: 5 }
  ],
  medium: [],
  heavy: [
    { value: 'armoured greaves',    label: 'Armoured greaves', cost_gp: 20 }
  ]
};

// ── CLASS WEAPON PROFICIENCY ───────────────────────────────────────
// 'simple' = simple weapons only; 'martial' = simple + martial
var CLASS_WEAPON_TIER = {
  barbarian: 'martial', bard: 'martial',   cleric: 'simple',
  druid:     'simple',  fighter: 'martial', monk: 'simple',
  paladin:   'martial', ranger: 'martial',  rogue: 'martial',
  sorcerer:  'simple',  warlock: 'simple',  wizard: 'simple'
};
// Classes that can use a shield in off-hand
var CLASS_CAN_SHIELD = {
  barbarian: false, bard: false,   cleric: true,
  druid:     true,  fighter: true, monk: false,
  paladin:   true,  ranger: false, rogue: false,
  sorcerer:  false, warlock: false, wizard: false
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
        var costLbl = formatCost(opt.cost_gp);
        o.textContent = costLbl ? opt.label + ' ' + costLbl : opt.label;
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
        var costLbl = formatCost(opt.cost_gp);
        o.textContent = costLbl ? opt.label + ' ' + costLbl : opt.label;
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
  // Rebuild hand slots from live ITEMS database
  filterWeaponsByClass(cls);
}

function filterWeaponsByClass(cls) {
  if (typeof ITEMS === 'undefined') return;
  var tier     = CLASS_WEAPON_TIER[cls] || 'simple';
  var canShield = CLASS_CAN_SHIELD[cls] || false;
  // All player_addable weapons matching tier
  var eligible = ITEMS.filter(function(item) {
    if (!item.player_addable) return false;
    if (item.category === 'weapon') {
      if (item.weapon_type === 'simple') return true;
      if (item.weapon_type === 'martial' && tier === 'martial') return true;
      return false;
    }
    if (item.category === 'shield') return canShield;
    return false;
  }).sort(function(a, b) { return a.name.localeCompare(b.name); });
  ['app-hand-right', 'app-hand-left'].forEach(function(slotId) {
    var sel = document.getElementById(slotId);
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="">— none —</option>';
    // For left hand, show shields; for right hand, weapons only
    eligible.forEach(function(item) {
      if (slotId === 'app-hand-right' && item.category === 'shield') return;
      var o = document.createElement('option');
      o.value = item.id;
      var startIds = getStartingGearIds();
      var isFree   = startIds.indexOf(item.id) >= 0;
      // Only show (free) if this item is not already claimed as free in the other hand.
      // Read from draft state, not the DOM — DOM selects may be stale during rebuild.
      if (isFree) {
        var otherKey2 = slotId === 'app-hand-right' ? 'hand_left' : 'hand_right';
        var otherDraftVal = CHAR_STATE.draft.appearance_data
          ? CHAR_STATE.draft.appearance_data[otherKey2] : '';
        if (otherDraftVal && otherDraftVal === item.id) {
          isFree = false;
        }
      }
      var costLabel = isFree ? '(free)' : formatCost(item.cost_gp);
      o.textContent = costLabel ? item.name + ' [' + costLabel + ']' : item.name;
      sel.appendChild(o);
    });
    if (current && sel.querySelector('option[value="' + current + '"]')) {
      sel.value = current;
    }
    updateWeaponStatChip(slotId, slotId + '-stat');
    // Re-inject two-handed placeholder if the OTHER hand has a two-handed weapon
    var otherSlotId3 = slotId === 'app-hand-right' ? 'app-hand-left' : 'app-hand-right';
    var otherSel3 = document.getElementById(otherSlotId3);
    if (otherSel3 && otherSel3.value) {
      var otherItem3 = typeof ITEMS !== 'undefined'
        ? ITEMS.find(function(i) { return i.id === otherSel3.value; }) : null;
      if (otherItem3 && otherItem3.properties
          && otherItem3.properties.indexOf('two-handed') >= 0) {
        // Other hand has two-handed weapon — lock this slot
        if (!sel.options[0] || sel.options[0].value !== '__two_handed__') {
          var ph = document.createElement('option');
          ph.value = '__two_handed__';
          ph.text  = '⚔ Two-handed weapon selected';
          sel.insertBefore(ph, sel.options[0]);
        }
        sel.value    = '__two_handed__';
        sel.disabled = true;
      }
    }
  });
}
function updateWeaponStatChip(selectId, chipId) {
  var sel  = document.getElementById(selectId);
  var chip = document.getElementById(chipId);
  if (!sel || !chip) return;
  if (!sel.value || typeof ITEMS === 'undefined') {
    chip.innerHTML = '';
    chip.style.display = 'none';
    // Re-enable other hand if this slot is cleared
    var otherIdClr = selectId === 'app-hand-right' ? 'app-hand-left' : 'app-hand-right';
    var otherSelClr = document.getElementById(otherIdClr);
    if (otherSelClr) {
      otherSelClr.disabled = false;
      if (otherSelClr.options[0] && otherSelClr.options[0].value === '__two_handed__') {
        otherSelClr.remove(0);
      }
    }
    return;
  }
  var item = ITEMS.find(function(i) { return i.id === sel.value; });
  if (!item) { chip.innerHTML = ''; chip.style.display = 'none'; return; }
  var html = '';
  if (item.category === 'shield') {
    html = '<span class="char-stat-chip char-stat-chip--ac">AC +' + (item.ac_bonus || 2) + '</span>';
  } else {
    var dmg = item.damage_dice + ' ' + item.damage_type;
    if (item.magic_bonus) dmg += ' (+' + item.magic_bonus + ')';
    html = '<span class="char-stat-chip char-stat-chip--dmg">' + dmg + '</span>';
    if (item.range_normal) {
      html += '<span class="char-stat-chip char-stat-chip--note">Range ' + item.range_normal + ' / ' + item.range_long + ' ft</span>';
    }
    if (item.versatile_dice) {
      html += '<span class="char-stat-chip char-stat-chip--note">Versatile: ' + item.versatile_dice + ' two-handed</span>';
    }
    var PROP_LABELS = {
      'heavy':      'Heavy',
      'light':      'Light',
      'finesse':    'Finesse',
      'thrown':     'Thrown',
      'reach':      'Reach',
      'two-handed': 'Two-handed',
      'loading':    'Loading',
      'ammunition': 'Ammunition'
    };
    var PROP_TIPS = {
      'heavy':      'Requires both hands. Can\'t be used by Small creatures.',
      'light':      'Small enough for your off-hand — no penalty to attack with both.',
      'finesse':    'Use either Strength or Dexterity for attack and damage — pick whichever is higher.',
      'thrown':     'Hurl it at a target instead of swinging. Check the range numbers.',
      'reach':      'Attacks enemies up to 10 ft away — one square further than normal.',
      'two-handed': 'Requires both hands to wield.',
      'loading':    'Can only fire once per turn regardless of how many attacks you have.',
      'ammunition': 'Requires arrows or bolts. You recover half after a battle.'
    };
    if (item.properties && item.properties.length) {
      item.properties
        .filter(function(p) { return p !== 'versatile'; })
        .forEach(function(p) {
          var label = PROP_LABELS[p] || p;
          var tip   = PROP_TIPS[p] || '';
          if (tip) {
            html += '<span class="char-stat-chip char-stat-chip--note char-field-tooltip" data-tip="' + tip.replace(/"/g, '&quot;') + '">'
              + label + ' <span class="char-trait-tip-icon">?</span></span>';
          } else {
            html += '<span class="char-stat-chip char-stat-chip--note">' + label + '</span>';
          }
        });
    }
  }
  chip.innerHTML = html;
  chip.style.display = 'flex';
  chip.querySelectorAll('[data-tip]').forEach(function(el) {
    if (typeof wireTooltip === 'function') wireTooltip(el);
  });

  // Two-handed weapon handling — disable other hand slot
  var otherSlotId = selectId === 'app-hand-right' ? 'app-hand-left' : 'app-hand-right';
  var otherSel    = document.getElementById(otherSlotId);
  var otherChip   = document.getElementById(otherSlotId + '-stat');
  // Clean up any previous conflict state on the other slot
  if (otherSel) {
    otherSel.disabled = false;
    if (otherSel.options[0] && otherSel.options[0].value === '__two_handed__') {
      otherSel.remove(0);
    }
  }
  if (item && item.category === 'weapon'
      && item.properties && item.properties.indexOf('two-handed') >= 0) {
    // This weapon is two-handed — lock the other hand
    if (otherSel) {
      var placeholder = document.createElement('option');
      placeholder.value   = '__two_handed__';
      placeholder.text    = '⚔ Two-handed weapon selected';
      placeholder.disabled = false;
      otherSel.insertBefore(placeholder, otherSel.options[0]);
      otherSel.value    = '__two_handed__';
      otherSel.disabled = true;
      if (otherChip) { otherChip.innerHTML = ''; otherChip.style.display = 'none'; }
    }
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
  var WEIGHT_LABELS = {
    'Light':  'Light armor — easy to move in',
    'Medium': 'Medium armor — some movement penalty',
    'Heavy':  'Heavy armor — slow and loud'
  };
  var weightLabel = WEIGHT_LABELS[stats.weight] || stats.weight;
  // Expand stealth note into plain English
  var noteLabel = stats.note
    ? stats.note.replace('Stealth ⚠', 'Disadvantage on Stealth rolls — enemies hear you coming')
                .replace('Str 15 req', 'Requires Strength 15+')
                .replace('Str 13 req', 'Requires Strength 13+')
    : '';
  var html = '<span class="char-stat-chip char-stat-chip--ac">' + stats.ac + '</span>'
           + '<span class="char-stat-chip char-stat-chip--weight">' + weightLabel + '</span>';
  if (noteLabel) {
    html += '<span class="char-stat-chip char-stat-chip--note">' + noteLabel + '</span>';
  }
  chip.innerHTML = html;
  chip.style.display = 'flex';
  chip.querySelectorAll('[data-tip]').forEach(function(el) {
    if (typeof wireTooltip === 'function') wireTooltip(el);
  });
}

function renderStartingGear() {
  var panel = document.getElementById('char-starting-gear-panel');
  if (!panel) return;

  var cls = CHAR_STATE.draft.class_id;
  var bg  = CHAR_STATE.draft.background_id;

  if (!cls) {
    panel.innerHTML = '<p class="char-gear-empty">Go back to Stage 1 to choose your class — your starting gear will appear here.</p>';
    return;
  }

  var gear = CLASS_STARTING_GEAR[cls];
  if (!gear) { panel.innerHTML = ''; return; }

  // Resolve class display name
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

  // ── Per-weapon icon lookup ──
  var WEAPON_ICONS = {
    'greataxe': '🪓', 'handaxe': '🪓', 'battleaxe': '🪓',
    'longsword': '⚔️', 'shortsword': '⚔️', 'rapier': '🤺',
    'dagger': '🗡️', 'quarterstaff': '🪄', 'mace': '🔨',
    'warhammer': '🔨', 'light-hammer': '🔨', 'flail': '⛓️',
    'glaive': '🔱', 'halberd': '🔱', 'pike': '🔱',
    'javelin': '🎯', 'spear': '🎯', 'dart': '🎯',
    'longbow': '🏹', 'shortbow': '🏹',
    'light crossbow': '🏹', 'heavy crossbow': '🏹',
    'shield': '🛡️', 'default': '⚔️'
  };

  function weaponIcon(weaponStr) {
    var w = weaponStr.toLowerCase();
    var keys = Object.keys(WEAPON_ICONS);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== 'default' && w.indexOf(keys[i]) >= 0) return WEAPON_ICONS[keys[i]];
    }
    return WEAPON_ICONS['default'];
  }

  // Tooltip definitions for D&D concepts first-timers won't know
  var GEAR_TIPS = {
    'finesse':    'Finesse — you can use either your Strength or Dexterity modifier for attack and damage rolls. Pick whichever is higher.',
    'light':      'Light — small enough to hold in your off-hand. You can attack with both hands without penalty.',
    'thrown':     'Thrown — you can hurl this weapon at a target instead of swinging it. Use the range numbers to see how far.',
    'heavy':      'Heavy — this weapon is large and powerful. Small-sized creatures have disadvantage using it.',
    'two-handed': 'Two-handed — this weapon requires both hands to use. You cannot hold anything in your other hand.',
    'reach':      'Reach — this weapon lets you strike enemies up to 10 feet away, not just 5 feet.',
    'loading':    'Loading — this weapon takes time to reload. You can only fire it once per turn, regardless of how many attacks you have.',
    'ammunition': 'Ammunition — this weapon needs arrows or bolts to fire. You start with a supply included in your starting gear.',
    'versatile':  'Versatile — you can use this weapon one-handed or two-handed. Two-handed deals more damage.',
    'Arcane Focus':    'Arcane Focus — a held object (wand, crystal, staff, or orb) that channels your magic. You need it in hand to cast most spells. A quarterstaff counts as a valid arcane focus — so a wizard holding their staff is already set.',
    'Spellbook':       'Spellbook — a personal book containing your wizard spells. You start with 6 spells written inside. You can copy new spells into it as you adventure.',
    'Holy Symbol':     'Holy Symbol — a religious emblem of your god. Clerics and Paladins need it to cast certain spells. Can be worn as an amulet or emblazoned on a shield.',
    'Druidic Focus':   'Druidic Focus — a natural object (sprig of mistletoe, totem, staff, or wand of yew) used to channel druid magic instead of material components.',
    'Thieves\' Tools': 'Thieves\' Tools — a set of lockpicks and small tools. Required to pick locks or disarm traps. You are proficient with these.',
    'musical instrument of your choice': 'Musical instrument — you are proficient with one instrument of your choice (lute, flute, drum, etc). Bards can use it as a spellcasting focus.'
  };

  function tipChip(label, tipKey) {
    var tip = GEAR_TIPS[tipKey || label];
    if (tip) {
      return '<span class="char-stat-chip char-stat-chip--note char-field-tooltip" data-tip="' + tip.replace(/"/g, '&quot;') + '">'
        + label + ' <span class="char-trait-tip-icon">?</span></span>';
    }
    return '<span class="char-stat-chip char-stat-chip--note">' + label + '</span>';
  }

  function weaponStatChips(weaponStr) {
    if (typeof ITEMS === 'undefined') return '';
    var w = weaponStr.toLowerCase();
    var item = ITEMS.find(function(it) {
      if (it.category !== 'weapon') return false;
      var name = it.name.toLowerCase();
      return w.indexOf(name) >= 0 || name.indexOf(w.split(' ')[0]) >= 0;
    });
    if (!item || !item.damage_dice) return '';
    var chips = '';
    var diceStr = item.damage_dice;
    var dmgLabel = diceStr + ' ' + item.damage_type;
    var dmgTip = 'Roll ' + diceStr + ' (a ' + diceStr.replace('1','') + '-sided die) and add your modifier — that\'s your damage.';
    if (item.versatile_dice) {
      dmgLabel += ' / ' + item.versatile_dice + ' two-handed';
      dmgTip += ' Use two hands for ' + item.versatile_dice + ' damage instead.';
    }
    chips += '<span class="char-stat-chip char-stat-chip--dmg char-field-tooltip" data-tip="' + dmgTip.replace(/"/g, '&quot;') + '">' + dmgLabel + ' <span class="char-trait-tip-icon">?</span></span>';
    if (item.range_normal) {
      var rangeTip = 'Normal range: ' + item.range_normal + ' ft — full accuracy. Long range: ' + item.range_long + ' ft — you have disadvantage (roll twice, take the lower result).';
      chips += '<span class="char-stat-chip char-stat-chip--note char-field-tooltip" data-tip="' + rangeTip + '">'
        + item.range_normal + ' / ' + item.range_long + ' ft range <span class="char-trait-tip-icon">?</span></span>';
    }
    var showProps = (item.properties || []).filter(function(p) {
      return ['heavy','light','finesse','thrown','reach','two-handed','loading','ammunition'].indexOf(p) >= 0;
    });
    showProps.forEach(function(p) {
      chips += tipChip(p, p);
    });
    // Staff-as-focus note for spellcasting classes
    var STAFF_FOCUS_CLASSES = ['wizard', 'druid', 'warlock', 'sorcerer'];
    if (w.indexOf('quarterstaff') >= 0 && STAFF_FOCUS_CLASSES.indexOf(cls) >= 0) {
      chips += tipChip('also your spellcasting tool', 'Arcane Focus');
    }
    return chips ? '<div class="char-stat-chips" style="flex-wrap:wrap;">' + chips + '</div>' : '';
  }

  function sectionLabel(text) {
    return '<div class="char-gear-section-label">' + text + '</div>';
  }

  // ── Armor row ──
  var armorHtml = '';
  if (gear.armor) {
    var armorKey   = gear.armor.toLowerCase();
    var armorStats = CLOTHING_STATS[armorKey];
    var armorChips = '';
    if (armorStats) {
      armorChips = '<div class="char-stat-chips">'
        + '<span class="char-stat-chip char-stat-chip--ac">' + armorStats.ac + '</span>'
        + '<span class="char-stat-chip char-stat-chip--weight">' + armorStats.weight + '</span>'
        + (armorStats.note ? '<span class="char-stat-chip char-stat-chip--note">' + armorStats.note + '</span>' : '')
        + '</div>';
    }
    armorHtml = '<div class="char-gear-item">'
      + '<span class="char-gear-icon">🛡️</span>'
      + '<div class="char-gear-item-body"><span class="char-gear-item-name">' + gear.armor + '</span>' + armorChips + '</div>'
      + '</div>';
  } else if (gear.unarmored_ac) {
    armorHtml = '<div class="char-gear-item char-gear-item--unarmored">'
      + '<span class="char-gear-icon">🌀</span>'
      + '<div class="char-gear-item-body">'
      +   '<span class="char-gear-item-name">Unarmored</span>'
      +   '<div class="char-stat-chips">'
      +     '<span class="char-stat-chip char-stat-chip--ac">' + gear.unarmored_ac + '</span>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }

  // ── Weapons rows ──
  var weaponsHtml = gear.weapons.map(function(w) {
    return '<div class="char-gear-item">'
      + '<span class="char-gear-icon">' + weaponIcon(w) + '</span>'
      + '<div class="char-gear-item-body"><span class="char-gear-item-name">' + w + '</span>' + weaponStatChips(w) + '</div>'
      + '</div>';
  }).join('');

  // ── Pack row with tooltip ──
  var packTip = gear.pack_contents
    + (gear.pack_extras ? ' · ' + gear.pack_extras : '');
  var packHtml = '<div class="char-gear-item char-gear-item--pack">'
    + '<span class="char-gear-icon">🎒</span>'
    + '<div class="char-gear-item-body">'
    +   '<span class="char-gear-item-name char-field-tooltip" data-tip="' + packTip + '">'
    +     gear.pack
    +     ' <span class="char-trait-tip-icon">?</span>'
    +   '</span>'
    +   (gear.pack_extras
        ? '<div class="char-stat-chips">' + gear.pack_extras.split(' + ').map(function(ex) { return tipChip(ex.trim(), ex.trim()); }).join('') + '</div>'
        : '')
    + '</div>'
    + '</div>';

  panel.innerHTML =
    '<div class="char-gear-header">'
    + '<span class="char-gear-label">⚔️ Your Starting Gear</span>'
    + '<span class="char-gear-sublabel">Everything below is yours from day one — no choices needed.</span>'
    + '</div>'
    + '<div class="char-gear-items">'
    +   (armorHtml ? sectionLabel('ARMOR') + armorHtml : '')
    +   sectionLabel('WEAPONS')
    +   weaponsHtml
    +   sectionLabel('PACK')
    +   packHtml
    + '</div>';

  // Wire tooltips on pack name and all gear chips
  panel.querySelectorAll('.char-field-tooltip[data-tip]').forEach(function(el) {
    if (typeof wireTooltip === 'function') wireTooltip(el);
  });
  // Add equip nudge link below the panel
  var nudge = document.getElementById('char-gear-equip-nudge');
  if (nudge && gear.weapons && gear.weapons.length) {
    nudge.style.display = 'block';
  } else if (nudge) {
    nudge.style.display = 'none';
  }
}

// ── STATIC APPEARANCE OPTION COSTS ───────────────────────────────
// Cost data for selects that are not driven by CLOTHING_TIERS/LOWER_TIERS
var STATIC_OPTION_COSTS = {
  // app-cloak
  'colourful':      { label: 'Colourful cloak',   cost_gp: 2   },
  'fur-trimmed':    { label: 'Fur-trimmed cloak',  cost_gp: 15  },
  'hooded':         { label: 'Hood',               cost_gp: 1   },
  'long dark':      { label: 'Long dark cloak',    cost_gp: 2   },
  'short dark':     { label: 'Short dark cloak',   cost_gp: 1   },
  'tattered':       { label: 'Tattered cloak' },
  // app-shoes
  'fine boots':     { label: 'Fine boots',         cost_gp: 10  },
  'sandals':        { label: 'Sandals',             cost_gp: 0.1 },
  'sturdy boots':   { label: 'Sturdy boots',        cost_gp: 2   },
  'worn boots':     { label: 'Worn boots',          cost_gp: 0.5 },
  // app-hat
  'a circlet':      { label: 'Circlet',             cost_gp: 25  },
  'a crown':        { label: 'Crown',               cost_gp: 100 },
  'a headband':     { label: 'Headband',            cost_gp: 0.2 },
  'a helmet':       { label: 'Helmet',              cost_gp: 10  },
  'a turban':       { label: 'Turban',              cost_gp: 1   },
  'a wide-brimmed hat': { label: 'Wide-brimmed hat', cost_gp: 1  },
  // app-ring-right / app-ring-left
  'a braided cord ring':  { label: 'Braided cord ring' },
  'a gemstone ring':      { label: 'Gemstone earring', cost_gp: 25  },
  'a gold ring':          { label: 'Gold ring',         cost_gp: 25  },
  'a plain iron ring':    { label: 'Plain iron ring',   cost_gp: 0.1 },
  'a signet ring':        { label: 'Signet ring',       cost_gp: 5   },
  'a silver ring':        { label: 'Silver ring',       cost_gp: 10  },
  // app-necklace
  'a beaded necklace':        { label: 'Beaded necklace',  cost_gp: 1   },
  'a gold chain necklace':    { label: 'Gold chain',        cost_gp: 50  },
  'a holy symbol on a chain': { label: 'Holy symbol',       cost_gp: 5   },
  'a leather cord necklace':  { label: 'Leather cord',      cost_gp: 0.2 },
  'a pendant necklace':       { label: 'Pendant',           cost_gp: 10  },
  'a silver necklace':        { label: 'Silver necklace',   cost_gp: 15  },
  // app-earrings
  'bone or carved earrings':    { label: 'Carved bone',      cost_gp: 0.5 },
  'dangling gold earrings':     { label: 'Gold hoops',       cost_gp: 15  },
  'dangling silver earrings':   { label: 'Silver hoops',     cost_gp: 5   },
  'gemstone earrings':          { label: 'Gemstone earrings', cost_gp: 25  },
  'small gold earrings':        { label: 'Gold studs',        cost_gp: 10  },
  'small silver earrings':      { label: 'Silver studs',      cost_gp: 3   }
};

function rebuildStaticSelect(selectId, blankLabel) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  var current = sel.value;
  // Collect all non-blank options with their values
  var opts = Array.from(sel.options)
    .filter(function(o) { return o.value !== ''; })
    .map(function(o) { return o.value; })
    .sort(function(a, b) {
      var la = (STATIC_OPTION_COSTS[a] && STATIC_OPTION_COSTS[a].label) || a;
      var lb = (STATIC_OPTION_COSTS[b] && STATIC_OPTION_COSTS[b].label) || b;
      return la.localeCompare(lb);
    });
  sel.innerHTML = '<option value="">' + (blankLabel || '— choose —') + '</option>';
  opts.forEach(function(val) {
    var meta     = STATIC_OPTION_COSTS[val];
    var label    = (meta && meta.label)   || val;
    var costFmt  = meta ? formatCost(meta.cost_gp) : null;
    var o        = document.createElement('option');
    o.value      = val;
    o.textContent = costFmt ? label + ' ' + costFmt : label;
    sel.appendChild(o);
  });
  // Restore selection
  if (current && sel.querySelector('option[value="' + current + '"]')) sel.value = current;
}

function initAppearanceListeners() {
  // Rebuild static selects with costs and alphabetical sorting
  rebuildStaticSelect('app-cloak',    'No cloak');
  rebuildStaticSelect('app-shoes',    '— choose —');
  rebuildStaticSelect('app-hat',      'None');
  rebuildStaticSelect('app-ring-right', '— none —');
  rebuildStaticSelect('app-ring-left',  '— none —');
  rebuildStaticSelect('app-necklace',   '— none —');
  rebuildStaticSelect('app-earrings',   '— none —');

  var ids = ['app-height','app-build','app-age','app-face-shape',
             'app-eye-color','app-eye-shape','app-facial-hair',
             'app-hair-color','app-hair-style','app-cloak','app-top',
             'app-lower','app-shoes','app-hat','app-hand-right','app-hand-left',
             'app-ring-right','app-ring-left','app-necklace','app-earrings'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', updateAIPrompt);
  });
  var skinTone = document.getElementById('app-skin-tone');
  if (skinTone) skinTone.addEventListener('input', updateAIPrompt);
  var topSel = document.getElementById('app-top');
  if (topSel) topSel.addEventListener('change', function() { updateGearStatChip('app-top', 'app-top-stat'); updateGoldDisplay(); });
  var lowSel = document.getElementById('app-lower');
  if (lowSel) lowSel.addEventListener('change', function() { updateGearStatChip('app-lower', 'app-lower-stat'); updateGoldDisplay(); });
  var rhSel = document.getElementById('app-hand-right');
  if (rhSel) rhSel.addEventListener('change', function() {
    updateWeaponStatChip('app-hand-right', 'app-hand-right-stat');
    updateGoldDisplay();
    filterWeaponsByClass(CHAR_STATE.draft.class_id || '');
  });
  var lhSel = document.getElementById('app-hand-left');
  if (lhSel) lhSel.addEventListener('change', function() {
    updateWeaponStatChip('app-hand-left', 'app-hand-left-stat');
    updateGoldDisplay();
    filterWeaponsByClass(CHAR_STATE.draft.class_id || '');
  });
  // Wire gold display updates for static clothing/accessory slots
  ['app-cloak','app-shoes','app-hat','app-ring-right','app-ring-left','app-necklace','app-earrings'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', updateGoldDisplay);
  });
  document.querySelectorAll('input[name="app-markings"]').forEach(function(cb) {
    cb.addEventListener('change', updateAIPrompt);
  });
  initAppearancePreviews();
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
    hand_right:       getVal('app-hand-right'),
    hand_left:        getVal('app-hand-left'),
    ring_right:       getVal('app-ring-right'),
    ring_left:        getVal('app-ring-left'),
    necklace:         getVal('app-necklace'),
    earrings:         getVal('app-earrings')
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
  if (d.ring_right) parts.push(d.ring_right + ' on right hand');
  if (d.ring_left)  parts.push(d.ring_left  + ' on left hand');
  if (d.necklace)   parts.push(d.necklace);
  if (d.earrings)   parts.push(d.earrings);
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
  var input = document.getElementById('char-first-name');
  if (input) { input.value = name; input.dispatchEvent(new Event('input')); }
  syncCharacterName();
}

function syncCharacterName() {
  var first = (document.getElementById('char-first-name') || {}).value || '';
  var last  = (document.getElementById('char-last-name')  || {}).value || '';
  var full  = last.trim() ? first.trim() + ' ' + last.trim() : first.trim();
  var hidden = document.getElementById('char-final-name');
  if (hidden) hidden.value = full;
  CHAR_STATE.draft.character_name = full;
  saveDraftToStorage();
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
    'brightward':  'They are Protective — they believe the world is worth protecting, and they intend to be someone others can count on.',
    'colorful':    'They are Freespirited — they want to do right by people, they\'ve just never been good at following someone else\'s idea of how.',
    'greywarden':  'They are Measured — they see all sides, weigh things carefully, and don\'t think the world divides neatly into light and dark.',
    'steelbound':  'They are Disciplined — they do what they said they would do. They consider this uncomplicated.',
    'ashwalker':   'They are Pragmatic — they do what works for them, and they try to be honest about that.'
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

function selectSoloSkill(skill) {
  CHAR_STATE.draft['past_org_solo_skill'] = skill || null;
  saveDraftToStorage();
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

// ── PRE-SUBMIT CONFIRMATION ─────────────────────────────────────────
function showPreSubmitConfirm() {
  // Collect all current stage data so the summary is up to date
  collectStageData(1);
  collectStageData(2);
  collectStageData(3);
  collectStageData(4);
  var d = CHAR_STATE.draft;
  var modal = document.getElementById('char-presubmit-modal');
  var summary = document.getElementById('char-presubmit-summary');
  if (!modal || !summary) { submitCharacter(); return; }
  // Build a quick-read summary of key choices
  var clsObj = d.class_id && typeof CLASS_DATA !== 'undefined'
    ? CLASS_DATA.find(function(c) { return c.id === d.class_id; }) : null;
  var bgObj = d.background_id && typeof ANAVALE_BACKGROUNDS !== 'undefined'
    ? ANAVALE_BACKGROUNDS.find(function(b) { return b.id === d.background_id; }) : null;
  var spObj = d.species_id && typeof ANAVALE_SPECIES !== 'undefined'
    ? ANAVALE_SPECIES.find(function(s) { return s.id === d.species_id; }) : null;
  var TYPE_LABELS = {
    bubbleseed: 'Bubbleseed', featherflow: 'Featherflow',
    steelfist: 'Steelfist', flamerage: 'Flamerage'
  };
  var rows = [
    ['Name',        d.character_name || '—'],
    ['Class',       clsObj ? clsObj.name + ' (' + (d.class_id || '—') + ')' : (d.class_id || '—')],
    ['Magic',       TYPE_LABELS[d.gigglegloom_type] || d.gigglegloom_type || '—'],
    ['Species',     spObj ? spObj.name : (d.species_id || '—')],
    ['Background',  bgObj ? bgObj.name : (d.background_id || '—')],
    ['Alignment',   d.alignment || '—'],
    ['Region',      d.home_region || '—']
  ];
  summary.innerHTML = rows.map(function(r) {
    return '<div class="char-presubmit-row">'
      + '<span class="char-presubmit-label">' + r[0] + '</span>'
      + '<span class="char-presubmit-value">' + r[1] + '</span>'
      + '</div>';
  }).join('');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closePreSubmitConfirm() {
  var modal = document.getElementById('char-presubmit-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

// ── SUBMIT ─────────────────────────────────────────────────────────
async function submitCharacter() {
  var btn = document.getElementById('char-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    collectStageData(1);
    collectStageData(2);
    collectStageData(3);
    collectStageData(4);
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

// ── DEV MODE — RANDOMIZE ALL STAGES ───────────────────────────────
(function() {
  if (new URLSearchParams(window.location.search).get('devmode') === '1') {
    document.addEventListener('DOMContentLoaded', function() {
      var btn = document.getElementById('char-dev-randomize');
      if (btn) btn.style.display = 'block';
    });
  }
})();

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function randomizeDraft() {
  var names = ['Aldric','Bessa','Corra','Davin','Elira','Farro','Genna','Holt','Idris','Jorra','Kael','Lira','Maren','Nori','Oryn','Pella','Quill','Reva','Sable','Tomas','Ula','Vesper','Wren','Yori','Zell'];
  var genders = ['male','female','non-binary'];
  var personalities = ['Jumps in before thinking','Painfully honest','Makes everyone laugh somehow','Quietly observant','Overly cautious','Surprisingly reckless'];
  var alignments = ['brightward','colorful','greywarden','steelbound','ashwalker'];
  var regions = ['caparia','nombi','sohot','jugabi'];
  var languages = ['elvish','dwarvish','gnomish','halfling','draconic','orcish','infernal','celestial','sylvan'];
  var pastRaised    = ['kind-parents','the-streets','strict-religious','single-parent','grandparent'];
  var pastFriend    = ['neighbor','animal','imaginary','no-one','mentor'];
  var pastPet       = ['a loyal hound','a clever crow','a tiny dragon','no pet','a cat that chose you'];
  var pastLove      = ['someone from home','a fellow traveller','a mentor','no one yet','someone you lost'];
  var pastOrg       = ['wanderkeep','merchant-guild','brightcreed','fighting-company','kept-to-myself'];
  var pastLeft      = ['a person','a place','a promise','a secret','an object'];
  var pastWhyLeft   = ['something called to me','I had no choice','I was running from something','I was looking for something','I needed to prove something'];
  var skinTones     = ['#f5d5b0','#e8b88a','#c8a070','#a07040','#7a4820','#4a2810'];
  var hairColors    = ['black','brown','blonde','silver','red','white'];
  var hairStyles    = ['long','short','braided','wild','shaved','curly'];
  var eyeColors     = ['brown','blue','green','grey','amber','violet'];
  var eyeShapes     = ['sharp','warm','wide','heavy-lidded'];
  var faceShapes    = ['angular','round','heart-shaped','oval','square'];
  var cloakOpts     = ['colourful','fur-trimmed','hooded','long dark','short dark','tattered',''];
  var shoeOpts      = ['fine boots','sandals','sturdy boots','worn boots',''];
  var hatOpts       = ['a circlet','a headband','a helmet','a wide-brimmed hat',''];
  var necklaceOpts  = ['a beaded necklace','a gold chain necklace','a leather cord necklace','a pendant necklace',''];
  var ringOpts      = ['a braided cord ring','a gold ring','a plain iron ring','a silver ring',''];
  var earringOpts   = ['bone or carved earrings','dangling gold earrings','small silver earrings','gemstone earrings',''];

  // ── Stage 1 ──
  var gender = rand(genders);
  var bg     = rand(ANAVALE_BACKGROUNDS);
  var sp     = rand(ANAVALE_SPECIES);
  var region = rand(regions);
  var lang   = rand(languages);
  var typeId = rand(Object.keys(GIGGLEGLOOM_TYPES));

  CHAR_STATE.draft.character_name        = rand(names);
  CHAR_STATE.draft.gender                = gender;
  CHAR_STATE.draft.personality_immediate = rand(personalities);
  CHAR_STATE.draft.personality_wrong     = rand(personalities);
  CHAR_STATE.draft.personality_laugh     = rand(personalities);
  CHAR_STATE.draft.cares_about           = 'People who can\'t protect themselves';
  CHAR_STATE.draft.deepest_fear          = 'Losing someone to the Dimming';
  CHAR_STATE.draft.seeking               = 'A reason to stay somewhere';
  CHAR_STATE.draft.background_id         = bg.id;
  CHAR_STATE.draft.species_id            = sp.id;
  CHAR_STATE.draft.home_region           = region;
  CHAR_STATE.draft.language              = lang;
  CHAR_STATE.draft.gigglegloom_type      = typeId;
  CHAR_STATE.draft.alignment             = rand(alignments);
  CHAR_STATE.draft['past_raised']        = rand(pastRaised);
  CHAR_STATE.draft['past_friend']        = rand(pastFriend);
  CHAR_STATE.draft['past_pet']           = rand(pastPet);
  CHAR_STATE.draft['past_love']          = rand(pastLove);
  CHAR_STATE.draft['past_org']           = rand(pastOrg);
  CHAR_STATE.draft['past_left-behind']   = rand(pastLeft);
  CHAR_STATE.draft['past_why-left']      = rand(pastWhyLeft);

  // ── Stage 2 ──
  var classesForType = GIGGLEGLOOM_TYPES[typeId].classes;
  var cls    = rand(classesForType);
  var clsData = CLASS_DATA.find(function(c) { return c.id === cls.id; });
  var skills = shuffle(clsData.skills_list).slice(0, clsData.skills_count);
  CHAR_STATE.draft.class_id              = cls.id;
  CHAR_STATE.draft['skills_' + cls.id]  = skills;

  // ── Stage 3 ──
  var shuffled = shuffle([15,14,13,12,10,8]);
  var abKeys   = ['str','dex','con','int','wis','cha'];
  var scores   = {};
  abKeys.forEach(function(ab, i) { scores[ab] = shuffled[i]; });
  CHAR_STATE.draft.ability_scores = scores;

  // ── Stage 4 — pick starting weapon + random top/lower within budget ──
  var startIds  = getStartingGearIds();
  var freeWeapon = typeof ITEMS !== 'undefined'
    ? ITEMS.find(function(it) { return it.player_addable && it.category === 'weapon' && startIds.indexOf(it.id) >= 0; })
    : null;
  var cls4top   = '';
  var cls4lower = '';
  var tier = CLASS_ARMOR_TIER ? CLASS_ARMOR_TIER[cls.id] : 'unarmored';
  var topOptions = (CLOTHING_TIERS && CLOTHING_TIERS[tier]) ? CLOTHING_TIERS[tier].filter(function(o) { return o.value; }) : [];
  if (topOptions.length) cls4top = rand(topOptions).value;
  var lowerOptions = (LOWER_TIERS && LOWER_TIERS[tier]) ? LOWER_TIERS[tier].filter(function(o) { return o.value; }) : [];
  if (lowerOptions.length) cls4lower = rand(lowerOptions).value;

  CHAR_STATE.draft.appearance_data = {
    height:          rand(['tall','average height','short','very tall']),
    build:           rand(['slender','athletic','stocky','lean']),
    age:             rand(['young','middle-aged','weathered']),
    skin_tone:       rand(skinTones),
    face_shape:      rand(faceShapes),
    eye_color:       rand(eyeColors),
    eye_shape:       rand(eyeShapes),
    glasses:         'none',
    facial_hair:     'none',
    facial_markings: [],
    hair_color:      rand(hairColors),
    hair_style:      rand(hairStyles),
    cloak:           rand(cloakOpts),
    top:             cls4top,
    lower:           cls4lower,
    shoes:           rand(shoeOpts),
    hat:             rand(hatOpts),
    hand_right:      freeWeapon ? freeWeapon.id : '',
    hand_left:       '',
    ring_right:      rand(ringOpts),
    ring_left:       rand(ringOpts),
    necklace:        rand(necklaceOpts),
    earrings:        rand(earringOpts)
  };
  // ── Gold-aware accessory pass ─────────────────────────────────
  // top/lower are always free (class starting gear) — not counted.
  // Accessories are sorted by cost descending and cut until budget fits.
  (function() {
    var budget = getStartingGold();
    var app = CHAR_STATE.draft.appearance_data;
    // Slots to budget-check, with their free fallback values
    var SLOTS = [
      { key: 'cloak',      fallback: ''                     },
      { key: 'shoes',      fallback: 'worn boots'           },
      { key: 'hat',        fallback: ''                     },
      { key: 'necklace',   fallback: ''                     },
      { key: 'ring_right', fallback: 'a plain iron ring'    },
      { key: 'ring_left',  fallback: ''                     },
      { key: 'earrings',   fallback: 'bone or carved earrings' }
    ];
    function slotCost(val) {
      if (!val) return 0;
      var meta = STATIC_OPTION_COSTS[val];
      return (meta && meta.cost_gp) ? meta.cost_gp : 0;
    }
    // Sort slots by cost descending so we cut the most expensive first
    SLOTS.sort(function(a, b) {
      return slotCost(app[b.key]) - slotCost(app[a.key]);
    });
    var spent = 0;
    SLOTS.forEach(function(slot) {
      var cost = slotCost(app[slot.key]);
      if (spent + cost <= budget) {
        spent += cost;
      } else {
        // Replace with fallback — if fallback still fits, use it; else blank
        var fbCost = slotCost(slot.fallback);
        if (spent + fbCost <= budget) {
          app[slot.key] = slot.fallback;
          spent += fbCost;
        } else {
          app[slot.key] = '';
        }
      }
    });
  })();
  CHAR_STATE.draft.appearance_prompt = buildAIPrompt(CHAR_STATE.draft.appearance_data);

  // ── Set highest stage so all stages are navigable ──
  CHAR_STATE.draft._stage    = 5;
  CHAR_STATE.highest_stage   = 5;
  saveDraftToStorage();

  // ── Sync DOM for Stage 4 (gear/appearance selects exist after initStageOnEnter) ──
  // Stage 1–3 cards restore automatically when the player navigates back to those
  // stages, via the existing initStageOnEnter → restore path. We only need to
  // sync the selects that live in Stage 4 and the name field.
  var app = CHAR_STATE.draft.appearance_data;
  var nameEl = document.getElementById('char-final-name');
  if (nameEl) nameEl.value = CHAR_STATE.draft.character_name || '';
  // Sync hidden inputs so stage-entry restore functions read correct values
  var hiddenMap = {
    'char-gender':    CHAR_STATE.draft.gender,
    'char-background': CHAR_STATE.draft.background_id,
    'char-species':   CHAR_STATE.draft.species_id,
    'char-home-region': CHAR_STATE.draft.home_region,
    'char-language':  CHAR_STATE.draft.language,
    'char-alignment': CHAR_STATE.draft.alignment
  };
  Object.keys(hiddenMap).forEach(function(id) {
    var el = document.getElementById(id);
    if (el && hiddenMap[id] !== undefined) el.value = hiddenMap[id];
  });
  // Ability scores
  abKeys.forEach(function(ab) {
    var el = document.getElementById('char-ability-' + ab);
    if (el) el.value = scores[ab];
  });
  // Stage 4 selects — init stage (renders options), then set values on next
  // animation frame so all synchronous rebuild/change handlers have settled
  initStageOnEnter(4);
  var appSelects = {
    'app-height': app.height, 'app-build': app.build, 'app-age': app.age,
    'app-skin-tone': app.skin_tone, 'app-face-shape': app.face_shape,
    'app-eye-color': app.eye_color, 'app-eye-shape': app.eye_shape,
    'app-hair-color': app.hair_color, 'app-hair-style': app.hair_style,
    'app-cloak': app.cloak, 'app-top': app.top, 'app-lower': app.lower,
    'app-shoes': app.shoes, 'app-hat': app.hat,
    'app-hand-right': app.hand_right, 'app-hand-left': app.hand_left,
    'app-ring-right': app.ring_right, 'app-ring-left': app.ring_left,
    'app-necklace': app.necklace, 'app-earrings': app.earrings
  };
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      Object.keys(appSelects).forEach(function(id) {
        var el = document.getElementById(id);
        if (el && appSelects[id] !== undefined) el.value = appSelects[id];
      });
      // Do NOT call updateAIPrompt() here — it would re-collect from DOM
      // and overwrite the correctly randomized appearance_data in the draft.
      updateGoldDisplay();
      updateStage4Hud();
      // ── Jump to Stage 5 and re-render panel with populated inputs ──
      showStage(5);
      renderStage3Panel();
      showToast('🎲 Randomized! Check Stage 5 for your character summary.');
    });
  });
}

function showToast(msg, type) {
  var toast = document.getElementById('char-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.toggle('error', type === 'error');
  toast.classList.add('visible');
  setTimeout(function() {
    toast.classList.remove('visible');
    toast.classList.remove('error');
  }, 3000);
}

// ── APPEARANCE IMAGE PREVIEWS ─────────────────────────────────────
// Explicit filename overrides for slots whose option values don't
// directly slug-convert to their image filenames.
var APPEARANCE_IMG_OVERRIDE = {
  // app-cloak: value → filename (without extension)
  'colourful':   'colourful-cloak',
  'fur-trimmed': 'fur-trimmed-cloak',
  'hooded':      'hooded-cloak',
  'long dark':   'long-dark-cloak',
  'short dark':  'short-dark-cloak',
  'tattered':    'tattered-cloak',
  // app-lower: values with leading articles or mismatched slugs
  'a long skirt':   'long-skirt',
  'a skirt':        'skirt',
  // app-top: value whose slug doesn't match filename
  'chainmail shirt': 'chain-shirt',
  // app-lower: 'flowing robes' doesn't slug to the image filename
  'flowing robes':            'robes',
  // app-hat: all static option values have leading 'a' article
  'a wide-brimmed hat':       'wide-brimmed-hat',
  'a circlet':                'circlet',
  'a crown':                  'crown',
  'a helmet':                 'helmet',
  'a headband':               'headband',
  'a turban':                 'turban',
  // app-necklace: leading articles + mismatched slug
  'a beaded necklace':        'beaded-necklace',
  'a gold chain necklace':    'gold-chain-necklace',
  'a holy symbol on a chain': 'holy-symbol-chain',
  'a leather cord necklace':  'leather-cord-necklace',
  'a pendant necklace':       'pendant-necklace',
  'a silver necklace':        'silver-necklace',
  // app-ring-right / app-ring-left: leading articles
  'a braided cord ring':      'braided-cord-ring',
  'a gemstone ring':          'gemstone-ring',
  'a gold ring':              'gold-ring',
  'a plain iron ring':        'plain-iron-ring',
  'a signet ring':            'signet-ring',
  'a silver ring':            'silver-ring',
  // app-earrings: slug 'bone-or-carved-earrings' doesn't match filename
  'bone or carved earrings':  'bone-carved-earrings'
};

function appearanceImgSlug(value) {
  if (!value) return '';
  if (APPEARANCE_IMG_OVERRIDE[value]) return APPEARANCE_IMG_OVERRIDE[value];
  return value.trim().replace(/\s+/g, '-').replace(/'/g, '').replace(/[^a-z0-9\-]/gi, '').toLowerCase();
}

function updateAppearancePreview(selectId, imgId) {
  var sel = document.getElementById(selectId);
  var img = document.getElementById(imgId);
  if (!sel || !img) return;
  var slug = appearanceImgSlug(sel.value);
  if (!slug) {
    img.style.display = 'none';
    img.src = '';
    return;
  }
  var src = 'assets/images/appearance/' + slug + '.webp';
  img.onerror = function() { img.style.display = 'none'; };
  img.src = src;
  img.style.display = 'block';
}

function initAppearancePreviews() {
  [
    ['app-top',        'app-top-preview'],
    ['app-lower',      'app-lower-preview'],
    ['app-cloak',      'app-cloak-preview'],
    ['app-shoes',      'app-shoes-preview'],
    ['app-hat',        'app-hat-preview'],
    ['app-necklace',   'app-necklace-preview'],
    ['app-ring-right', 'app-ring-right-preview'],
    ['app-ring-left',  'app-ring-left-preview'],
    ['app-earrings',   'app-earrings-preview']
  ].forEach(function(pair) {
    var sel = document.getElementById(pair[0]);
    if (sel) {
      sel.addEventListener('change', function() {
        updateAppearancePreview(pair[0], pair[1]);
      });
      // Fire once immediately to restore preview if draft already has a value
      updateAppearancePreview(pair[0], pair[1]);
    }
  });
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
    document.querySelectorAll('._tooltip-box-active').forEach(function(b) { b.remove(); });
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
    box.classList.add('_tooltip-box-active');
    window.addEventListener('scroll', hide, { passive: true, once: true });
  }
  function hide() { if (box) { box.remove(); box = null; } }
  el.addEventListener('mouseenter', show);
  el.addEventListener('mouseleave', hide);
  el.addEventListener('click', function(e) {
    e.stopPropagation();
    if (box) { hide(); } else { show(); }
  });
  el.addEventListener('touchstart', function(e) {
    e.stopPropagation();
    if (box) { hide(); } else {
      e.preventDefault();
      show();
    }
  }, { passive: false });
  document.addEventListener('touchstart', function onOutside(ev) {
    if (!box) { document.removeEventListener('touchstart', onOutside, true); return; }
    if (!el.contains(ev.target)) {
      hide();
      document.removeEventListener('touchstart', onOutside, true);
    }
  }, true);
}

// ── ABILITY SCORE DRAG AND DROP ───────────────────────────────
var ABILITY_SCORES = [15, 14, 13, 12, 10, 8];

// ── STAGE 3 SUMMARY PANEL ────────────────────────────────────────
function getStartingGold() {
  var bgId = CHAR_STATE.draft.background_id;
  if (!bgId) return 0;
  var bg = ANAVALE_BACKGROUNDS.find(function(b) { return b.id === bgId; });
  return bg ? (bg.starting_gold || 0) : 0;
}
function getStartingGearIds() {
  var cls = CHAR_STATE.draft.class_id;
  if (!cls || typeof ITEMS === 'undefined') return [];
  var gear = CLASS_STARTING_GEAR[cls];
  if (!gear) return [];
  // Build a set of lowercase single-word tokens from gear strings
  // e.g. 'Two handaxes' → ['handaxe','handaxes'], '4 javelins' → ['javelin','javelins']
  // We match if any ITEM name token appears in the gear string or vice versa
  var gearStrings = gear.weapons.slice();
  if (gear.armor) gearStrings.push(gear.armor);
  return ITEMS
    .filter(function(item) {
      if (!item.player_addable) return false;
      if (item.category !== 'weapon' && item.category !== 'armor' && item.category !== 'shield') return false;
      var itemName = item.name.toLowerCase();
      return gearStrings.some(function(g) {
        var gs = g.toLowerCase();
        // Exact match
        if (gs === itemName) return true;
        // Gear string contains item name as a word (e.g. 'Two handaxes' contains 'handaxe' stem)
        if (gs.indexOf(itemName) >= 0) return true;
        // Item name contains the gear string
        if (itemName.indexOf(gs) >= 0) return true;
        // Stem match: strip trailing 's' from both and compare
        var itemStem = itemName.replace(/s$/, '');
        var gWords = gs.split(/\s+/);
        return gWords.some(function(w) {
          return w.replace(/s$/, '') === itemStem && w.length > 2;
        });
      });
    })
    .map(function(item) { return item.id; });
}
function calcGoldSpent() {
  if (typeof ITEMS === 'undefined') return 0;
  var startingIds = getStartingGearIds();
  var spent = 0;
  // Track how many times each starting-gear item has already been "used free"
  var freeUsed = {};
  // ITEMS-backed slots (weapons, armor, lower)
  ['app-top', 'app-lower', 'app-hand-right', 'app-hand-left'].forEach(function(slotId) {
    var sel = document.getElementById(slotId);
    if (!sel || !sel.value) return;
    var id = sel.value;
    var isFreeItem = startingIds.indexOf(id) >= 0;
    // Only the FIRST use of a starting-gear item is free.
    // A second copy of the same item (e.g. two quarterstaffs) costs gold.
    if (isFreeItem && !freeUsed[id]) {
      freeUsed[id] = true;
      return; // free — don't charge
    }
    var item = ITEMS.find(function(i) { return i.id === id; });
    if (item && item.cost_gp) spent += item.cost_gp;
  });
  // Static option slots (cloak, shoes, hat, rings, necklace, earrings)
  ['app-cloak','app-shoes','app-hat','app-ring-right','app-ring-left','app-necklace','app-earrings'].forEach(function(slotId) {
    var sel = document.getElementById(slotId);
    if (!sel || !sel.value) return;
    var meta = STATIC_OPTION_COSTS[sel.value];
    if (meta && meta.cost_gp) spent += meta.cost_gp;
  });
  return spent;
}
// Format a cost_gp value into the most readable denomination
function formatCost(cost_gp) {
  if (!cost_gp) return null;
  if (cost_gp >= 1) return '-' + cost_gp + ' Gold';
  var sp = Math.round(cost_gp * 10);
  if (sp >= 1) return '-' + sp + ' Silver';
  var cp = Math.round(cost_gp * 100);
  return '-' + cp + ' Copper';
}
function toggleStage3Panel(btn) {
  var panel = document.getElementById('char-stage3-summary');
  if (!panel) return;
  var collapsed = panel.classList.toggle('char-stage3-panel--collapsed');
  btn.textContent = collapsed ? 'Expand' : 'Collapse';
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

// Lookup: past question answer value → bonus skill granted
var PAST_SKILL_GRANTS = {
  // who_raised_you (data-value uses hyphens)
  'kind-parents':    { skill: 'Insight' },
  'the-streets':     { skill: 'Sleight of Hand' },
  'strict-religious':{ skill: 'Religion' },
  'single-parent':   { skill: 'Athletics' },
  'grandparent':     { skill: 'History' },
  // dearest_friend
  'neighbor':        { skill: 'Insight' },
  'animal':          { skill: 'Animal Handling' },
  'imaginary':       { skill: 'Perception' },
  'no-one':          { skill: 'Survival' },
  'mentor':          { skill: 'History' },
  // organization
  'wanderkeep':      { skill: 'Survival' },
  'merchant-guild':  { skill: 'Persuasion' },
  'brightcreed':     { skill: 'Religion' },
  'fighting-company':{ skill: 'Athletics' },
  'kept-to-myself': { skill: null } // free pick — handled by org-solo-skill-picker
};

// Lookup: background bonus string → ability key + amount
function parseBgBonuses(bonuses) {
  var result = {};
  if (!bonuses) return result;
  var AB_MAP = { 'Str':'str','Dex':'dex','Con':'con','Int':'int','Wis':'wis','Cha':'cha' };
  bonuses.forEach(function(b) {
    var m = b.match(/([+-]\d+)\s+(\w+)/);
    if (m && AB_MAP[m[2]]) result[AB_MAP[m[2]]] = parseInt(m[1]);
  });
  return result;
}

function renderStage3Panel() {
  var body = document.getElementById('char-stage3-panel-body');
  if (!body) return;

  var classId = CHAR_STATE.draft.class_id;
  var bgId    = CHAR_STATE.draft.background_id;

  // ── Class + background labels ──
  var clsName = classId ? classId.charAt(0).toUpperCase() + classId.slice(1) : '—';
  var clsObj  = classId && typeof CLASS_DATA !== 'undefined'
    ? CLASS_DATA.find(function(c) { return c.id === classId; }) : null;
  if (clsObj) clsName = clsObj.name;

  var bgName = '';
  var bgPhb  = '';
  var bgObj  = null;
  if (bgId && typeof ANAVALE_BACKGROUNDS !== 'undefined') {
    bgObj = ANAVALE_BACKGROUNDS.find(function(b) { return b.id === bgId; });
    if (bgObj) { bgName = bgObj.name; bgPhb = bgObj.phb || ''; }
  }

  // ── Background ability bonuses (for score display) ──
  var bgBonusMap = bgObj ? parseBgBonuses(bgObj.bonuses) : {};

  // ── Per-class ability advice blurbs ──
  var CLASS_ABILITY_ADVICE = {
    barbarian: 'Put your 15 in Strength. Constitution second — it boosts your HP and your unarmored AC.',
    bard:      'Put your 15 in Charisma. Dexterity second for AC and initiative.',
    cleric:    'Put your 15 in Wisdom — it powers your spells and saves. Constitution second for survivability.',
    druid:     'Put your 15 in Wisdom. Constitution second — Druids take hits in Wild Shape.',
    fighter:   'Put your 15 in Strength (melee) or Dexterity (ranged/finesse). Constitution second for hit points.',
    monk:      'Put your 15 in Dexterity. Wisdom second — it boosts your AC and ki abilities.',
    paladin:   'Split your top scores between Strength and Charisma. Constitution third for durability.',
    ranger:    'Put your 15 in Dexterity. Wisdom second for spells and perception.',
    rogue:     'Put your 15 in Dexterity — it drives everything you do. Intelligence or Charisma second.',
    sorcerer:  'Put your 15 in Charisma. Constitution second to keep concentration spells alive.',
    warlock:   'Put your 15 in Charisma. Constitution second for concentration.',
    wizard:    'Put your 15 in Intelligence. Constitution second to hold concentration spells.'
  };
  var abilityAdvice = classId ? (CLASS_ABILITY_ADVICE[classId] || '') : '';

  // ── Armor class ──
  var ac = 10;
  var topSel   = document.getElementById('app-top');
  var topVal   = topSel ? topSel.value : '';
  var topStats = topVal && typeof CLOTHING_STATS !== 'undefined' ? CLOTHING_STATS[topVal] : null;
  if (topStats) {
    var acMatch = topStats.ac.match(/\d+/);
    ac = acMatch ? parseInt(acMatch[0]) : 10;
  }

  // ── Hit points ──
  var hp = 0;
  if (clsObj && clsObj.hit_die) {
    var die    = parseInt((clsObj.hit_die || 'd8').replace('d', '')) || 8;
    var conRaw = parseInt((document.getElementById('char-ability-con') || {}).value) || 10;
    var conBonus = bgBonusMap['con'] || 0;
    var conFinal = conRaw + conBonus;
    var conMod   = Math.floor((conFinal - 10) / 2);
    hp = die + conMod;
  }

  // ── Gold ──
  var total     = getStartingGold();
  var spent     = calcGoldSpent();
  var remaining = total - spent;
  var totalCP   = Math.round(remaining * 100);
  var absCP     = Math.abs(totalCP);
  var remGold   = Math.floor(absCP / 100) * (remaining < 0 ? -1 : 1);
  var remSilver = Math.floor((absCP % 100) / 10);
  var remCopper = absCP % 10;
  var goldValClass = remaining < 0 ? 'char-stage3-stat-value char-stage3-stat-value--red' : 'char-stage3-stat-value char-stage3-stat-value--gold';
  var moneyHtml =
    '<div class="' + goldValClass + '">◈ ' + remGold + ' Gold</div>'
    + '<div class="char-stage3-stat-value char-stage3-stat-value--silver" style="font-size:0.8rem;">◈ ' + remSilver + ' Silver</div>'
    + '<div class="char-stage3-stat-value char-stage3-stat-value--copper" style="font-size:0.8rem;">◈ ' + remCopper + ' Copper</div>';

  // ── Skills: class + background + imagined past ──
  var profSkills = [];
  var bonusLines = [];
  // Class chosen skills
  if (classId) {
    (CHAR_STATE.draft['skills_' + classId] || []).forEach(function(s) {
      if (profSkills.indexOf(s) < 0) profSkills.push(s);
    });
  }
  // Background skills → proficiencies
  if (bgObj && bgObj.skills) {
    bgObj.skills.forEach(function(s) {
      if (profSkills.indexOf(s) < 0) profSkills.push(s);
    });
  }
  // Imagined past skills → flat +1 modifiers (not full proficiency)
  var modifierSkills = [];
  var pastKeys = ['who_raised_you','dearest_friend','organization'];
  pastKeys.forEach(function(k) {
    var val = CHAR_STATE.draft[k];
    if (val && PAST_SKILL_GRANTS[val]) {
      var sk = PAST_SKILL_GRANTS[val].skill;
      modifierSkills.push('+1 ' + sk);
    }
  });
  profSkills.sort();
  // Ability modifier bonuses from background — shown in Ability Scores section, not Skills
  var AB_EXPAND = { 'Str':'Strength','Dex':'Dexterity','Con':'Constitution',
                    'Int':'Intelligence','Wis':'Wisdom','Cha':'Charisma' };
  if (bgObj && bgObj.bonuses) {
    bgObj.bonuses.forEach(function(b) {
      var m = b.trim().match(/^([+-]\d+)\s+(\w+)$/);
      if (m && AB_EXPAND[m[2]]) {
        bonusLines.push(m[1] + ' ' + AB_EXPAND[m[2]]);
      }
    });
  }

  // ── Ability scores with background bonuses applied ──
  var AB_KEYS  = ['str','dex','con','int','wis','cha'];
  var AB_NAMES = { str:'STR', dex:'DEX', con:'CON', int:'INT', wis:'WIS', cha:'CHA' };
  var abilityHtml = '';
  var anyScore = false;
  AB_KEYS.forEach(function(ab) {
    var raw = parseInt((document.getElementById('char-ability-' + ab) || {}).value) || 0;
    if (!raw) return;
    anyScore = true;
    var bonus = bgBonusMap[ab] || 0;
    var final = raw + bonus;
    var lowCls = final <= 9 ? ' is-low' : '';
    abilityHtml +=
      '<div class="char-stage3-score-pill' + lowCls + '">'
      + '<span class="char-stage3-score-pill-val">' + final + '</span>'
      + '<span class="char-stage3-score-pill-ab">' + AB_NAMES[ab] + '</span>'
      + '</div>';
  });

  // ── Weapons ──
  var rhSel  = document.getElementById('app-hand-right');
  var lhSel  = document.getElementById('app-hand-left');
  var rhVal  = rhSel ? rhSel.value : '';
  var lhVal  = lhSel ? lhSel.value : '';
  var rhItem = rhVal && typeof ITEMS !== 'undefined' ? ITEMS.find(function(i) { return i.id === rhVal; }) : null;
  var lhItem = lhVal && typeof ITEMS !== 'undefined' ? ITEMS.find(function(i) { return i.id === lhVal; }) : null;

  function fmtWeapon(item, otherItem) {
    if (!item) return 'N/A';
    // If the OTHER hand has a two-handed weapon, this hand can't be used
    if (otherItem && otherItem.properties && otherItem.properties.indexOf('two-handed') >= 0) return 'N/A';
    if (item.category === 'shield') return 'Shield (AC +' + (item.ac_bonus || 2) + ')';
    var s = item.damage_dice + ' ' + item.damage_type;
    var props = (item.properties || []).filter(function(p) { return p !== 'versatile'; });
    if (props.length) s += ' · ' + props.join(', ');
    return s;
  }

  var dmgHtml = '';
  if (rhItem || lhItem) {
    dmgHtml = '<div class="char-stage3-lower-block">'
      + '<div class="char-stage3-lower-label">Damage</div>'
      + '<div class="char-stage3-lower-row"><span>Right</span>' + fmtWeapon(rhItem, lhItem) + '</div>'
      + '<div class="char-stage3-lower-row"><span>Left</span>'  + fmtWeapon(lhItem, rhItem) + '</div>'
      + '</div>';
  }

  // ── Class icon ──
  var CLASS_ICONS = {
    barbarian:'⚔️', bard:'🎵', cleric:'✨', druid:'🌿', fighter:'🛡️',
    monk:'👊', paladin:'⚔️', ranger:'🏹', rogue:'🗡️',
    sorcerer:'💫', warlock:'🌑', wizard:'📖'
  };
  var icon = classId ? (CLASS_ICONS[classId] || '✦') : '✦';

  // ── Render ──
  var bgDisplay = bgName + (bgPhb ? ' (' + bgPhb + ')' : '');
  var savesLine = clsObj ? 'Saving Throws: ' + clsObj.saves : '';

  body.innerHTML =
    (clsObj ? '<div class="char-stage3-class-banner">'
      + '<img class="char-stage3-class-img" src="assets/images/classes/class-' + classId + '.webp" alt="' + clsName + '">'
      + '<div class="char-stage3-class-banner-info">'
        + '<div class="char-stage3-class-banner-name">' + clsName + '</div>'
        + '<div class="char-stage3-class-banner-meta">Primary: ' + clsObj.primary + ' &nbsp;·&nbsp; Saves: ' + clsObj.saves + '</div>'
        + (abilityAdvice ? '<div class="char-stage3-class-banner-advice">' + abilityAdvice + '</div>' : '')
      + '</div>'
    + '</div>' : '')
    +
    '<div class="char-stage3-panel-icon">' + icon + '</div>'
    + '<div class="char-stage3-panel-top-row">'
      + '<div>'
        + '<div class="char-stage3-panel-class">' + clsName + '</div>'
        + (clsObj ? '<div class="char-stage3-panel-sub">Main Abilities: ' + clsObj.primary + '</div>' : '')
        + (clsObj ? '<div class="char-stage3-panel-sub">' + savesLine + '</div>' : '')
        + (bgDisplay ? '<div class="char-stage3-panel-sub">' + bgDisplay + '</div>' : '')
      + '</div>'
      + '<div class="char-stage3-panel-stats">'
        + '<div class="char-stage3-stat-block">'
          + '<div class="char-stage3-stat-label">Armor</div>'
          + '<div class="char-stage3-stat-value">🛡 ' + ac + '</div>'
        + '</div>'
        + '<div class="char-stage3-stat-block">'
          + '<div class="char-stage3-stat-label">Hit Points</div>'
          + '<div class="char-stage3-stat-value">♥ ' + (hp || '—') + '</div>'
        + '</div>'
        + '<div class="char-stage3-stat-block">'
          + '<div class="char-stage3-stat-label">Money</div>'
          + moneyHtml
        + '</div>'
      + '</div>'
    + '</div>'
    + '<div class="char-stage3-panel-lower">'
      + '<div class="char-stage3-lower-block">'
        + '<div class="char-stage3-lower-label">Skills</div>'
        + (profSkills.length
            ? '<div class="char-stage3-lower-row"><span>Proficiency:</span>' + profSkills.join(', ') + '</div>'
            : '<div class="char-stage3-lower-row" style="color:var(--char-text-faint);font-style:italic;">Choose class + background to see skills</div>')
        + (modifierSkills.length
            ? '<div class="char-stage3-lower-row"><span>Modifiers:</span>'
              + modifierSkills.map(function(s) {
                  var p = s.match(/^([+-]\d+)\s+(.+)$/);
                  return p ? '<span style="color:#6ecf6e;margin-right:0;">' + p[1] + '</span> <span style="color:#fff;margin-right:0;">' + p[2] + '</span>'
                           : '<span style="color:#6ecf6e;">' + s + '</span>';
                }).join(', ')
              + '</div>'
            : '')
      + '</div>'
      + '<div class="char-stage3-lower-block">'
        + '<div class="char-stage3-lower-label">Total Ability Scores</div>'
        + '<div style="font-family:var(--font-sans);font-size:0.72rem;color:var(--char-text-faint);margin-bottom:0.4rem;line-height:1.4;">Includes assigned scores and modifiers from your previous selections.</div>'
        + (bonusLines.length
            ? '<div class="char-stage3-lower-row" style="margin-bottom:0.4rem;"><span>Bonuses</span>' + bonusLines.map(function(b) {
                var p = b.match(/^([+-]\d+)\s+(.+)$/);
                return p ? '<span style="color:#6ecf6e;margin-right:0;">' + p[1] + '</span> <span style="color:#fff;margin-right:0;">' + p[2] + '</span>'
                         : b;
              }).join(', ') + '</div>'
            : '')
        + (anyScore
            ? '<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">' + abilityHtml + '</div>'
            : '<div class="char-stage3-lower-row" style="color:var(--char-text-faint);font-style:italic;">Assign scores below</div>')
      + '</div>'
      + dmgHtml
    + '</div>';
}
function initHudSticky() {
  var hud = document.getElementById('char-stage4-hud');
  if (!hud) return;

  // Remove any existing sentinel
  var existing = document.getElementById('char-hud-sentinel');
  if (existing) existing.parentNode.removeChild(existing);
  hud.classList.remove('char-hud--stuck');
  if (hud._scrollCleanup) { hud._scrollCleanup(); hud._scrollCleanup = null; }

  var isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // Add visible gap above the HUD by setting margin-top directly on the HUD element
    // (padding-top on parent is blocked by overflow:hidden; margin on sentinel is ignored by sticky)
    hud.style.marginTop = '1rem';

    // Use scroll listener on document for WebKit mobile
    var navEl = document.getElementById('char-mobile-stage-nav');
    var navH = navEl ? navEl.offsetHeight : 74;
    hud.style.top = navH + 'px';

    var lastStuck = false;
    function onScroll() {
      var rect = hud.getBoundingClientRect();
      // Only stick when HUD top has actually reached the nav bottom
      // Use a negative threshold so margin gap is fully scrolled past first
      var shouldStick = rect.top <= navH;
      if (shouldStick !== lastStuck) {
        lastStuck = shouldStick;
        hud.classList.toggle('char-hud--stuck', shouldStick);
        hud.style.marginTop = shouldStick ? '0' : '1rem';
      }
    }
    // Run once on init to set correct state without triggering gap removal
    requestAnimationFrame(function() {
      var rect = hud.getBoundingClientRect();
      if (rect.top > navH) {
        hud.style.marginTop = '1rem';
      }
    });
    document.addEventListener('scroll', onScroll, { passive: true });
    hud._scrollCleanup = function() {
      document.removeEventListener('scroll', onScroll);
    };
  } else {
    // Desktop: IntersectionObserver
    hud.style.marginTop = '';
    hud.style.top = '';
    var sentinel = document.createElement('div');
    sentinel.id = 'char-hud-sentinel';
    sentinel.style.cssText = 'height:1px;padding:0;pointer-events:none;position:relative;';
    hud.parentNode.insertBefore(sentinel, hud);
    var stuck = false;
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var shouldBeStuck = !entry.isIntersecting;
        if (shouldBeStuck !== stuck) {
          stuck = shouldBeStuck;
          hud.classList.toggle('char-hud--stuck', stuck);
        }
      });
    }, { threshold: 0 });
    observer.observe(sentinel);
  }
}

function updateStage4Hud() {
  if (CHAR_STATE.current_stage !== 4) return;

  // ── AC ──
  var acEl = document.getElementById('hud-ac-value');
  if (acEl) {
    var ac = 10;
    var topSel = document.getElementById('app-top');
    var topVal = topSel ? topSel.value : '';
    var topStats = topVal && typeof CLOTHING_STATS !== 'undefined' ? CLOTHING_STATS[topVal] : null;
    if (topStats) {
      var acMatch = topStats.ac.match(/\d+/);
      if (acMatch) ac = parseInt(acMatch[0]);
    }
    var dexRaw = parseInt((document.getElementById('char-ability-dex') || {}).value) || 10;
    var dexMod = Math.floor((dexRaw - 10) / 2);
    if (topStats) {
      if (topStats.weight === 'Heavy') { /* no dex */ }
      else if (topStats.weight === 'Medium') { ac += Math.min(dexMod, 2); }
      else { ac += dexMod; }
    } else { ac += dexMod; }
    // Shield bonus
    var lhSel = document.getElementById('app-hand-left');
    if (lhSel && lhSel.value) {
      var lhItem = typeof ITEMS !== 'undefined' ? ITEMS.find(function(i) { return i.id === lhSel.value; }) : null;
      if (lhItem && lhItem.category === 'shield') ac += (lhItem.ac_bonus || 2);
    }
    acEl.textContent = ac;
    acEl.dataset.ac = ac;
  }

  // ── Money ──
  var moneyEl = document.getElementById('hud-money-values');
  if (moneyEl) {
    var total = getStartingGold();
    var spent = calcGoldSpent();
    var remaining = total - spent;
    if (remaining < 0) {
      moneyEl.innerHTML = '<span class="char-hud-money-negative">−' + Math.abs(remaining).toFixed(1) + ' gp overspent</span>';
    } else {
      var totalCP = Math.round(remaining * 100);
      var remGold   = Math.floor(totalCP / 100);
      var remSilver = Math.floor((totalCP % 100) / 10);
      var remCopper = totalCP % 10;
      moneyEl.innerHTML =
        '<div class="char-hud-money-row"><span class="char-hud-money-gold">'   + remGold   + '</span><span class="char-hud-money-denom char-hud-money-denom--gold">GP</span></div>' +
        '<div class="char-hud-money-row"><span class="char-hud-money-silver">' + remSilver + '</span><span class="char-hud-money-denom char-hud-money-denom--silver">SP</span></div>' +
        '<div class="char-hud-money-row"><span class="char-hud-money-copper">' + remCopper + '</span><span class="char-hud-money-denom char-hud-money-denom--copper">CP</span></div>';
    }
  }

  // ── Weapon damage ──
  var rhEl = document.getElementById('hud-weapon-right');
  var lhEl = document.getElementById('hud-weapon-left');
  function hudWeaponLabel(slotId) {
    var sel = document.getElementById(slotId);
    if (!sel || !sel.value) return '—';
    var it = typeof ITEMS !== 'undefined' ? ITEMS.find(function(i) { return i.id === sel.value; }) : null;
    if (!it) return '—';
    if (it.category === 'shield') return 'Shield +' + (it.ac_bonus || 2) + ' AC';
    if (it.damage_dice) {
      var s = it.damage_dice + ' ' + it.damage_type;
      if (it.magic_bonus) s += ' +' + it.magic_bonus;
      return s;
    }
    return it.name || '—';
  }
  if (rhEl) { rhEl.textContent = hudWeaponLabel('app-hand-right'); rhEl.dataset.dmg = hudWeaponLabel('app-hand-right'); }
  if (lhEl) { lhEl.textContent = hudWeaponLabel('app-hand-left');  lhEl.dataset.dmg = hudWeaponLabel('app-hand-left'); }

  // ── Weight ──
  var fillEl    = document.getElementById('hud-weight-fill');
  var numsEl    = document.getElementById('hud-weight-numbers');
  var labelEl   = document.getElementById('hud-weight-label');
  var strRaw    = parseInt((document.getElementById('char-ability-str') || {}).value) || 10;
  var capacity  = strRaw * 15;
  var carried   = 0;
  if (typeof ITEMS !== 'undefined') {
    ['app-top','app-lower','app-hand-right','app-hand-left'].forEach(function(slotId) {
      var sel = document.getElementById(slotId);
      if (!sel || !sel.value) return;
      var item = ITEMS.find(function(i) { return i.id === sel.value; });
      if (item && item.weight_lb) carried += item.weight_lb;
    });
  }
  var pct = capacity > 0 ? Math.min((carried / capacity) * 100, 100) : 0;
  if (fillEl) {
    fillEl.style.width = pct + '%';
    fillEl.classList.toggle('over-half',  pct >= 50 && pct < 90);
    fillEl.classList.toggle('encumbered', pct >= 90);
  }
  if (numsEl) numsEl.textContent = carried.toFixed(1) + ' / ' + capacity + ' lb';
  if (labelEl) {
    labelEl.textContent = pct >= 90 ? '⚠ Encumbered' : pct >= 50 ? 'Weight Carried' : 'Weight Carried';
    labelEl.style.color = pct >= 90 ? '#e05050' : pct >= 50 ? '#e8b830' : '';
  }
}

function updateGoldDisplay() {
  renderStage3Panel();
  updateStage4Hud();
  if (CHAR_STATE.current_stage === 3) {
    var overspent = (getStartingGold() - calcGoldSpent()) < 0;
    var btn = document.querySelector('#char-stage-3 .char-btn-next');
    if (btn) {
      btn.disabled     = overspent;
      btn.style.opacity = overspent ? '0.35' : '';
      btn.style.cursor  = overspent ? 'not-allowed' : '';
    }
    var err = document.getElementById('char-stage3-gold-error');
    if (err) err.style.display = overspent ? 'block' : 'none';
  }
}

function updateStage3ContinueButton() {
  if (CHAR_STATE.current_stage !== 3) return;
  var abilities = ['str','dex','con','int','wis','cha'];
  var allAssigned = abilities.every(function(ab) {
    var el = document.getElementById('char-ability-' + ab);
    return el && el.value !== '';
  });
  var btn = document.querySelector('#char-stage-3 .char-btn-next');
  if (!btn) return;
  btn.disabled      = !allAssigned;
  btn.style.opacity = allAssigned ? '' : '0.35';
  btn.style.cursor  = allAssigned ? '' : 'not-allowed';
}


function updateResetButton() {
  var btn  = document.getElementById('char-ability-reset-btn');
  var bank = document.getElementById('char-score-bank');
  if (!btn || !bank) return;
  var bankChips = bank.querySelectorAll('.char-score-chip').length;
  var allPlaced = bankChips === 0;
  // Show/hide reset button
  btn.style.display = bankChips < ABILITY_SCORES.length ? 'inline-flex' : 'none';
  // Show/hide "all placed" confirmation
  var confirm = document.getElementById('char-bank-complete-msg');
  if (allPlaced) {
    bank.classList.add('char-score-bank--complete');
    if (!confirm) {
      var msg = document.createElement('div');
      msg.id = 'char-bank-complete-msg';
      msg.className = 'char-bank-complete-msg';
      msg.textContent = '✓ All scores placed';
      bank.appendChild(msg);
    }
    btn.style.display = 'inline-flex';
  } else {
    bank.classList.remove('char-score-bank--complete');
    if (confirm) confirm.parentNode.removeChild(confirm);
  }
}

function updateAbilityCardHints() {
  var classId = CHAR_STATE.draft.class_id;
  var cls = classId ? CLASS_DATA.find(function(c) { return c.id === classId; }) : null;
  var CLASS_PRIMARY_AB = {
    barbarian: ['str'], bard: ['cha'], cleric: ['wis'], druid: ['wis'],
    fighter: ['str','dex'], monk: ['dex','wis'], paladin: ['str','cha'],
    ranger: ['dex','wis'], rogue: ['dex'], sorcerer: ['cha'],
    warlock: ['cha'], wizard: ['int']
  };
  var primaryAbs = (cls && CLASS_PRIMARY_AB[classId]) ? CLASS_PRIMARY_AB[classId] : [];
  ['str','dex','con','int','wis','cha'].forEach(function(ab) {
    var card = document.getElementById('ability-card-' + ab);
    if (!card) return;
    var score = parseInt(card.dataset.score) || 0;
    var isPrimary = primaryAbs.indexOf(ab) >= 0;
    var isGood = isPrimary && score >= 13;
    var isWarn = isPrimary && score > 0 && score <= 10;
    card.classList.toggle('char-ability-card--primary', isGood);
    card.classList.toggle('char-ability-card--warn',    isWarn);
    // Remove any existing hint
    var existing = card.querySelector('.char-ability-primary-hint');
    if (existing) existing.parentNode.removeChild(existing);
    // Inject hint on primary cards with a score placed
    if (isPrimary && score > 0) {
      var hint = document.createElement('div');
      hint.className = 'char-ability-primary-hint';
      if (isGood) {
        hint.textContent = '👍 Good choice! This is your class\'s primary stat.';
        hint.classList.add('char-ability-primary-hint--good');
      } else if (isWarn) {
        hint.textContent = '⚠ This is your class\'s primary stat — consider a higher score.';
        hint.classList.add('char-ability-primary-hint--warn');
      } else {
        // Placed but not high enough to be green, not low enough to warn — neutral nudge
        hint.textContent = '★ This is your class\'s primary stat.';
        hint.classList.add('char-ability-primary-hint--neutral');
      }
      var nameEl = card.querySelector('.char-ability-name');
      if (nameEl) nameEl.insertAdjacentElement('afterend', hint);
    }
  });
}

function renderStage3ClassBanner() {
  var el = document.getElementById('char-stage3-class-banner');
  if (!el) return;
  var classId = CHAR_STATE.draft.class_id;
  var cls = classId ? CLASS_DATA.find(function(c) { return c.id === classId; }) : null;
  if (!cls) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }
  var CLASS_ABILITY_ADVICE = {
    barbarian: 'Put your 15 in Strength. Constitution second — it boosts your HP and your unarmored AC.',
    bard:      'Put your 15 in Charisma. Dexterity second for AC and initiative.',
    cleric:    'Put your 15 in Wisdom — it powers your spells and saves. Constitution second for survivability.',
    druid:     'Put your 15 in Wisdom. Constitution second — Druids take hits in Wild Shape.',
    fighter:   'Put your 15 in Strength (melee) or Dexterity (ranged/finesse). Constitution second for hit points.',
    monk:      'Put your 15 in Dexterity. Wisdom second — it boosts your AC and ki abilities.',
    paladin:   'Split your top scores between Strength and Charisma. Constitution third for durability.',
    ranger:    'Put your 15 in Dexterity. Wisdom second for spells and perception.',
    rogue:     'Put your 15 in Dexterity — it drives everything you do. Intelligence or Charisma second.',
    sorcerer:  'Put your 15 in Charisma. Constitution second to keep concentration spells alive.',
    warlock:   'Put your 15 in Charisma. Constitution second for concentration.',
    wizard:    'Put your 15 in Intelligence. Constitution second to hold concentration spells.'
  };
  var advice = CLASS_ABILITY_ADVICE[classId] || '';
  el.style.display = '';
  el.innerHTML = '<div class="char-stage3-class-banner-inner">'
    + '<img class="char-stage3-class-img" src="assets/images/classes/class-' + classId + '.webp" alt="' + cls.name + '">'
    + '<div class="char-stage3-class-banner-info">'
      + '<div class="char-stage3-class-banner-name">' + cls.name + '</div>'
      + '<div class="char-stage3-class-banner-meta">Primary: ' + cls.primary + ' &nbsp;·&nbsp; Saves: ' + cls.saves + '</div>'
      + (advice ? '<div class="char-stage3-class-banner-advice">' + advice + '</div>' : '')
    + '</div>'
  + '</div>';
}


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
  // Add reset button if not already present
  if (!document.getElementById('char-ability-reset-btn')) {
    var resetBtn = document.createElement('button');
    resetBtn.id = 'char-ability-reset-btn';
    resetBtn.className = 'char-ability-reset-btn';
    resetBtn.textContent = '↺ Reset';
    resetBtn.style.display = 'none';
    resetBtn.addEventListener('click', function() {
      resetAbilityScores();
      saveDraftToStorage();
    });
    bank.appendChild(resetBtn);
  }
  updateResetButton();
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
    wireTouchDrag(chip);
    scoreEl.innerHTML = '';
    scoreEl.appendChild(chip);
    if (modEl)  modEl.textContent  = (mod >= 0 ? '+' : '') + mod;
    chip.dataset.tip = 'A score of ' + n + ' gives you a ' + (mod >= 0 ? '+' : '') + mod + ' to any roll using this ability.';
    wireTooltip(chip);
    var modLabelEl = document.getElementById('ability-mod-label-' + ability);
    if (modLabelEl) {
      modLabelEl.innerHTML = '<span class="char-field-tooltip" data-tip="This number is your roll bonus — it gets added (or subtracted) whenever you make a dice roll using this ability."><span class="char-trait-tip-icon">?</span></span>';
      wireTooltip(modLabelEl.querySelector('.char-field-tooltip'));
    }
    if (hidden) hidden.value = n;
    if (card)   card.dataset.score = n;
  }
  renderStage3Panel();
  updateResetButton();
  updateAbilityCardHints();
  updateStage3ContinueButton();
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
  wireTouchDrag(chip);
  bank.appendChild(chip);
  // Re-sort bank chips in descending order
  var chips = Array.from(bank.querySelectorAll('.char-score-chip'));
  chips.sort(function(a,b) { return parseInt(b.dataset.score) - parseInt(a.dataset.score); });
  chips.forEach(function(c) { bank.appendChild(c); });
}

// Touch drag support (mobile)
// wireTouchDrag() is called on every chip at creation time so newly placed
// chips and restored draft chips are always touch-draggable.
function wireTouchDrag(chip) {
  var _touchOffsetX = 0;
  var _touchOffsetY = 0;
  var touchClone = null;

  chip.addEventListener('touchstart', function(e) {
    _dragScore  = chip.dataset.score;
    _dragSource = chip.closest('.char-ability-card')
      ? chip.closest('.char-ability-card').dataset.ability
      : 'bank';
    // Capture where the finger landed within the chip so the clone tracks correctly
    var rect = chip.getBoundingClientRect();
    var t = e.touches[0];
    _touchOffsetX = t.clientX - rect.left;
    _touchOffsetY = t.clientY - rect.top;
    // Create floating clone
    touchClone = chip.cloneNode(true);
    touchClone.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'opacity:0.9',
      'z-index:9999',
      'width:'  + rect.width  + 'px',
      'height:' + rect.height + 'px',
      'top:'    + (t.clientY - _touchOffsetY) + 'px',
      'left:'   + (t.clientX - _touchOffsetX) + 'px',
      'transform:scale(1.1)',
      'box-shadow:0 8px 24px rgba(0,0,0,0.5)'
    ].join(';');
    document.body.appendChild(touchClone);
    chip.classList.add('dragging');
    e.preventDefault();
  }, { passive: false });

  chip.addEventListener('touchmove', function(e) {
    if (!touchClone) return;
    var t = e.touches[0];
    touchClone.style.top  = (t.clientY - _touchOffsetY) + 'px';
    touchClone.style.left = (t.clientX - _touchOffsetX) + 'px';
    // Highlight the card or bank under the finger
    var el = document.elementFromPoint(t.clientX, t.clientY);
    var overCard = el ? el.closest('.char-ability-card') : null;
    var overBank = !overCard && el
      ? el.closest('#char-score-bank') !== null
      : false;
    document.querySelectorAll('.char-ability-card').forEach(function(c) {
      c.classList.toggle('drag-over', c === overCard);
    });
    var bank = document.getElementById('char-score-bank');
    if (bank) bank.style.borderColor = overBank ? 'var(--gold)' : '';
    e.preventDefault();
  }, { passive: false });

  chip.addEventListener('touchend', function(e) {
    if (touchClone) { touchClone.remove(); touchClone = null; }
    chip.classList.remove('dragging');
    // Clear all highlights
    document.querySelectorAll('.char-ability-card').forEach(function(c) {
      c.classList.remove('drag-over');
    });
    var bank = document.getElementById('char-score-bank');
    if (bank) bank.style.borderColor = '';
    if (!_dragScore) return;
    var t = e.changedTouches[0];
    var el = document.elementFromPoint(t.clientX, t.clientY);
    var card = el ? el.closest('.char-ability-card') : null;
    if (card) {
      onCardDrop.call(card, { preventDefault: function(){} });
    } else if (bank && el && bank.contains(el)) {
      onBankDrop({ preventDefault: function(){} });
    }
    _dragScore  = null;
    _dragSource = null;
  });
}

function initAbilityTouchDrag() {
  document.querySelectorAll('.char-score-chip').forEach(wireTouchDrag);
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
    var placed = [];
    var bank = document.getElementById('char-score-bank');
    ['str','dex','con','int','wis','cha'].forEach(function(ab) {
      var val = scores[ab];
      if (val !== null && val !== undefined && val !== '') {
        // Remove the matching chip from the bank before placing on card
        if (bank) {
          var bankChip = bank.querySelector('.char-score-chip[data-score="' + parseInt(val) + '"]');
          if (bankChip) bankChip.remove();
        }
        setAbilityScore(ab, val);
        placed.push(parseInt(val));
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
                     'app-lower','app-shoes','app-hat','app-hand-right','app-hand-left',
                     'app-ring-right','app-ring-left','app-necklace','app-earrings'];
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
  style.textContent = '#char-toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(10,14,24,0.95);border:1px solid rgba(200,148,10,0.4);color:var(--gold);font-family:var(--font-sans);font-size:0.85rem;padding:0.65rem 1.5rem;border-radius:8px;opacity:0;transition:all 0.3s ease;z-index:300;pointer-events:none;white-space:nowrap;}#char-toast.visible{opacity:1;transform:translateX(-50%) translateY(0);}#char-toast.error{border-color:rgba(224,80,80,0.6);color:#e05050;}';
  document.head.appendChild(style);
})();
