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
  if (n === 3) { initAbilityScores(); restoreStage3Selections(); initAppearanceListeners(); renderStartingGear(); filterClothingByClass(CHAR_STATE.draft.class_id || ''); renderStage3Panel(); updateGoldDisplay(); }
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
    id: 'faithful', name: 'Faithful', phb: 'Acolyte', starting_gold: 10,
    lore: 'You grew up inside one of Anavale\'s three faiths — the Brightcreed\'s color festivals, the Stillkeep\'s stone libraries, or the Veilborn\'s careful silences. You know the prayers, the practices, and the politics. You can also read pre-Partition script, which more people want than will admit it.',
    skills: ['Insight', 'Religion'],
    bonuses: ['+2 Int', '+1 Wis', 'Magic Initiate']
  },
  {
    id: 'streetwise', name: 'Streetwise', phb: 'Criminal', starting_gold: 25,
    lore: 'You learned what you know in places that don\'t appear on official maps — back alleys, Grusk-adjacent markets, Nimblewood-adjacent neighborhoods. Not necessarily a bad person. Just someone who understands how the world actually moves when the Formery isn\'t watching.',
    skills: ['Deception', 'Stealth'],
    bonuses: ['+2 Dex', '+1 Int', 'Alert']
  },
  {
    id: 'learned', name: 'Learned', phb: 'Sage', starting_gold: 10,
    lore: 'You spent years in one of Anavale\'s great collections of knowledge — the Great Index in Lightcrak, a Stillkeep archive, the Chroma Bureau\'s public records. You know more than most people want to know about things most people have never heard of. This has been both useful and isolating.',
    skills: ['Arcana', 'History'],
    bonuses: ['+2 Int', '+1 Wis', 'Keen Mind']
  },
  {
    id: 'tested', name: 'Tested', phb: 'Soldier', starting_gold: 10,
    lore: 'You served — in a Confederation guard company, a Nombi honor corps, a Sohot desert patrol, or a fighting company attached to the Wanderkeep. You know how to follow orders, how to give them, and exactly which situations require which. The grey you\'ve seen may or may not have been the Vareth kind.',
    skills: ['Athletics', 'Intimidation'],
    bonuses: ['+2 Str', '+1 Con', 'Savage Attacker']
  },
  {
    id: 'wellborn', name: 'Wellborn', phb: 'Noble', starting_gold: 25,
    lore: 'You come from one of Anavale\'s established families — a Confederation merchant house, a Sohot ceremonial lineage, a Nombi honor clan. You know how rooms full of powerful people work. You also know exactly what those people are willing to do to stay powerful, which is information the Formery would file under Form 9-C (Societal Leverage, Observed).',
    skills: ['History', 'Persuasion'],
    bonuses: ['+2 Cha', '+1 Int', 'Skilled']
  },
  {
    id: 'rootborn', name: 'Rootborn', phb: 'Folk Hero', starting_gold: 10,
    lore: 'You\'re from a small place — Pebbleshire, a Bunari fishing village, a Zippydoda Hills farm — and something happened there that made people look at you differently. You didn\'t ask for it. You\'re not sure you deserved it. But the Pocketmoles have always found you specifically, and you\'ve stopped pretending that doesn\'t mean something.',
    skills: ['Animal Handling', 'Survival'],
    bonuses: ['+2 Con', '+1 Cha', 'Tough']
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
    id: 'craftborn', name: 'Craftborn', phb: 'Guild Artisan', starting_gold: 15,
    lore: 'You trained under a master in one of the Zippan guilds, a Dingurei paper house, or a Stonemarked workshop in the Jani Mountains. You know how to make something from nothing, how guild politics work, and that the difference between a good piece and a great one is always the part nobody sees.',
    skills: ['Insight', 'Persuasion'],
    bonuses: ['+2 Int', '+1 Cha', 'Skilled']
  },
  {
    id: 'stillsought', name: 'Stillsought', phb: 'Hermit', starting_gold: 5,
    lore: 'You spent a significant portion of your life alone — in a Stillkeep mountain retreat, in the deep Opu Forest near the Patient One, in a Nombi winter with only the aurora for company. You were looking for something. You may have found it. What you found has made you either very calm or very certain about something nobody else seems certain about yet.',
    skills: ['Medicine', 'Religion'],
    bonuses: ['+2 Wis', '+1 Con', 'Magic Initiate']
  },
  {
    id: 'wildborn', name: 'Wildborn', phb: 'Outlander', starting_gold: 10,
    lore: 'The Dodooti Rainforest, the Nombi deep forest, the Wraithfell Tundra, the Jani Mountain passes — you grew up in one of these, or spent enough time there to change how you think. The Gigglegloom reads differently in the wild. Purer. Louder. You know what it sounds like when it\'s healthy and you know what the silence means when it isn\'t.',
    skills: ['Athletics', 'Survival'],
    bonuses: ['+2 Str', '+1 Wis', 'Tough']
  },
  {
    id: 'tidemarked', name: 'Tidemarked', phb: 'Sailor', starting_gold: 10,
    lore: 'You know the Bunbun Bay, the Salindri Sea, the Glacial Sea off Nombi\'s coast, or the Golden Sea south of Sohot. Ships, currents, weather, the way Shimmer Rays surface before a storm and what that means. The Bunari consider the sea a living thing and treat it accordingly. You may not be Bunari, but you\'ve spent enough time on their ships to understand why.',
    skills: ['Athletics', 'Perception'],
    bonuses: ['+2 Str', '+1 Dex', 'Tavern Brawler']
  },
  {
    id: 'cobblewise', name: 'Cobblewise', phb: 'Urchin', starting_gold: 10,
    lore: 'You grew up in the margins of one of Anavale\'s cities — Mirrenport\'s lower docks, Bumbleton\'s market back-alleys, the parts of Solenveil that don\'t appear in the Formery\'s official maps. You know how a city actually works, where to sleep when you have nothing, and which doors to knock on when you need help. A Pocketmole found you every time you were at your lowest. You still don\'t know what to make of that.',
    skills: ['Sleight of Hand', 'Stealth'],
    bonuses: ['+2 Dex', '+1 Wis', 'Lucky']
  },
  {
    id: 'greywitnessed', name: 'Greywitnessed', phb: 'Haunted One', starting_gold: 10,
    lore: 'You were there when the grey arrived somewhere it shouldn\'t have been. A town that was fine last season. A creature that stopped humming. A person you loved who started forgetting why things were worth caring about. You didn\'t cause it. You couldn\'t stop it. But you saw it, and seeing it changed what you\'re willing to do. The Hollowmoth appeared. You remember exactly what it looked like.',
    skills: ['Arcana', 'Survival'],
    bonuses: ['+2 Wis', '+1 Str', 'Alert']
  },
  {
    id: 'threadpuller', name: 'Threadpuller', phb: 'Investigator', starting_gold: 10,
    lore: 'You worked for the Chroma Bureau, the Dingurei Great Index, a Wanderkeep anomaly division, or simply had a mind that couldn\'t leave an unanswered question alone. You notice what\'s missing from a scene as readily as what\'s present. The Gigglegloom leaves traces everywhere, and you\'ve learned to read them like a language most people don\'t know exists.',
    skills: ['Insight', 'Investigation'],
    bonuses: ['+2 Int', '+1 Wis', 'Keen Mind']
  },
  {
    id: 'ringscarred', name: 'Ringscarred', phb: 'Gladiator', starting_gold: 15,
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

function initStage1() {
  renderGigglogloomAffinity();
  renderClassGrid();
  // Class grid hidden until affinity is chosen
  var classSection = document.getElementById('char-class-section');
  if (classSection) classSection.style.display = 'none';
  // Restore from draft
  if (CHAR_STATE.draft.gigglegloom_type) {
    highlightAffinityCard(CHAR_STATE.draft.gigglegloom_type);
    if (classSection) classSection.style.display = 'block';
  }
  if (CHAR_STATE.draft.class_id) {
    restoreClassSelection(CHAR_STATE.draft.class_id);
  }
  updateStage1SkillAlert();
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
    var featuresHtml = cls.features.map(function(f) {
      return '<li>' + f + '</li>';
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
      +   '<div class="char-class-card-names">'
      +     '<div class="char-class-name">' + cls.name + '</div>'
      +   '</div>'
      +   '<div class="char-class-card-check">✓</div>'
      +   '<button class="char-bg-toggle" onclick="event.stopPropagation();toggleClassCard(this)" aria-label="Toggle details">Details</button>'
      + '</div>'
      + '<div class="char-class-summary" onclick="selectClass(\'' + cls.id + '\')">' + cls.summary + '</div>'
      + '<div class="char-class-body">'
      +   '<div class="char-class-traits">' + traitsHtml + '</div>'
      +   '<div class="char-class-skills-section">'
      +     '<div class="char-class-skills-label">Skills — choose ' + cls.skills_count + '</div>'
      +     '<div class="char-class-skills-grid">' + skillsHtml + '</div>'
      +     '<div class="char-class-skills-count" id="skill-count-' + cls.id + '">0 of ' + cls.skills_count + ' chosen</div>'
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
      var checked = document.querySelectorAll('input[name="skill-' + classId + '"]:checked');
      if (checked.length > cls.skills_count) {
        this.checked = false;
        return;
      }
      var counter = document.getElementById('skill-count-' + classId);
      if (counter) counter.textContent = checked.length + ' of ' + cls.skills_count + ' chosen';
      CHAR_STATE.draft['skills_' + classId] = Array.from(checked).map(function(c) { return c.value; });
      saveDraftToStorage();
      updateStage1SkillAlert();
    });
  });

  // Wire tooltips for dynamically rendered [data-tip] elements
  if (typeof initTooltips === 'function') initTooltips();
}

function renderGigglogloomAffinity() {
  var grid = document.getElementById('char-type-grid');
  if (!grid) return;
  grid.innerHTML = Object.keys(GIGGLEGLOOM_TYPES).map(function(typeId) {
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
  updateStage1SkillAlert();
}

function updateStage1SkillAlert() {
  var classId = CHAR_STATE.draft.class_id;
  var cls = classId ? CLASS_DATA.find(function(c) { return c.id === classId; }) : null;
  var btn = document.getElementById('char-stage1-continue');
  var alert = document.getElementById('char-stage1-skill-alert');
  if (!cls || !btn) return;
  var chosen = (CHAR_STATE.draft['skills_' + classId] || []).length;
  var needed = cls.skills_count;
  var complete = chosen >= needed;
  btn.disabled = !complete;
  if (alert) alert.classList.toggle('visible', !complete);
}

function selectType(typeId, silent) {
  highlightAffinityCard(typeId);
  // Reveal class section on first affinity selection
  var classSection = document.getElementById('char-class-section');
  if (classSection) classSection.style.display = 'block';
  if (!silent) {
    CHAR_STATE.draft.gigglegloom_type = typeId;
    saveDraftToStorage();
    // Scroll to class section
    setTimeout(function() {
      scrollToField(document.getElementById('char-class-section'));
    }, 80);
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
  renderBackgroundCards();
  renderSpeciesCards();
  restoreStage2Selections();
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
  // Wire tooltips for dynamically rendered [data-tip] elements in background cards
  if (typeof initTooltips === 'function') initTooltips();
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
        preview.innerHTML = effect.replace(/(\+\d+)/g, '<span style="color:#6ecf6e;">$1</span>');
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
    // Skill gate: must choose the required number of skills for chosen class
    var classId1 = CHAR_STATE.draft.class_id;
    var cls1 = CLASS_DATA.find(function(c) { return c.id === classId1; });
    if (cls1) {
      var chosenSkills = (CHAR_STATE.draft['skills_' + classId1] || []);
      if (chosenSkills.length < cls1.skills_count) {
        showToast('Choose ' + cls1.skills_count + ' skills for your class before continuing.');
        updateStage1SkillAlert();
        return false;
      }
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
    var goldRemaining = getStartingGold() - calcGoldSpent();
    if (goldRemaining < 0) {
      showToast('You\'ve spent more than your starting gold. Remove some items before continuing.');
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
  if (n === 1) collectStage1Data();
  if (n === 2) collectStage2Data();
  if (n === 3) collectStage3Data();
  if (n === 4) collectStage4Data();
  if (n === 5) collectStage5Data();
}

function collectStage1Data() {
  // Read selected class from DOM — covers sidebar-jump case where Continue was not clicked
  var selectedCard = document.querySelector('.char-class-card.selected');
  if (selectedCard && selectedCard.dataset.class) {
    CHAR_STATE.draft.class_id = selectedCard.dataset.class;
  }
  // Read selected gigglegloom type from DOM
  var selectedType = document.querySelector('.char-type-card.selected');
  if (selectedType && selectedType.dataset.type) {
    CHAR_STATE.draft.gigglegloom_type = selectedType.dataset.type;
  }
  saveDraftToStorage();
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
    str: parseInt(getVal('char-ability-str')) || null,
    dex: parseInt(getVal('char-ability-dex')) || null,
    con: parseInt(getVal('char-ability-con')) || null,
    int: parseInt(getVal('char-ability-int')) || null,
    wis: parseInt(getVal('char-ability-wis')) || null,
    cha: parseInt(getVal('char-ability-cha')) || null
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
      var costLabel = isFree ? '(free)' : formatCost(item.cost_gp);
      o.textContent = costLabel ? item.name + ' ' + costLabel : item.name;
      sel.appendChild(o);
    });
    if (current && sel.querySelector('option[value="' + current + '"]')) {
      sel.value = current;
    }
    updateWeaponStatChip(slotId, slotId + '-stat');
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
    if (item.versatile_dice) {
      html += '<span class="char-stat-chip char-stat-chip--note">Versatile ' + item.versatile_dice + '</span>';
    }
    if (item.properties && item.properties.length) {
      item.properties.filter(function(p) { return p !== 'versatile'; }).forEach(function(p) {
        html += '<span class="char-stat-chip char-stat-chip--note">' + p + '</span>';
      });
    }
  }
  chip.innerHTML = html;
  chip.style.display = 'flex';

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
      placeholder.text    = 'Using a 2-handed Weapon';
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

  var cls = CHAR_STATE.draft.class_id;
  var bg  = CHAR_STATE.draft.background_id;

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
    var noArmorNote = gear.note.indexOf('—') >= 0 ? gear.note.split('—')[1].trim() : gear.note;
    itemsHtml = '<div class="char-gear-item char-gear-item--note"><span class="char-gear-icon">○</span>No armor — ' + noArmorNote + '</div>' + itemsHtml;
  }

  var packLabel = gear.note.indexOf('·') >= 0 ? gear.note.split('·')[0].trim() : gear.note;
  itemsHtml += '<div class="char-gear-item char-gear-item--pack"><span class="char-gear-icon">🎒</span>' + packLabel + '</div>';

  panel.innerHTML =
    '<div class="char-gear-header">'
    + '<span class="char-gear-label">Starting gear — ' + clsLabel + (bgLabel ? ' · ' + bgLabel : '') + '</span>'
    + '<span class="char-gear-sublabel">This gear is yours automatically. No choices needed.</span>'
    + '</div>'
    + '<div class="char-gear-items">' + itemsHtml + '</div>';
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
  'a hood':         { label: 'Hood',                cost_gp: 0.5 },
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
  if (rhSel) rhSel.addEventListener('change', function() { updateWeaponStatChip('app-hand-right', 'app-hand-right-stat'); updateGoldDisplay(); });
  var lhSel = document.getElementById('app-hand-left');
  if (lhSel) lhSel.addEventListener('change', function() { updateWeaponStatChip('app-hand-left', 'app-hand-left-stat'); updateGoldDisplay(); });
  // Wire gold display updates for static clothing/accessory slots
  ['app-cloak','app-shoes','app-hat','app-ring-right','app-ring-left','app-necklace','app-earrings'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', updateGoldDisplay);
  });
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
  // ITEMS-backed slots (weapons, armor, lower)
  ['app-top', 'app-lower', 'app-hand-right', 'app-hand-left'].forEach(function(slotId) {
    var sel = document.getElementById(slotId);
    if (!sel || !sel.value) return;
    if (startingIds.indexOf(sel.value) >= 0) return;
    var item = ITEMS.find(function(i) { return i.id === sel.value; });
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
  'fighting-company':{ skill: 'Athletics' }
  // 'kept-to-myself' grants +1 Stealth + 1 free skill — no fixed grant, skip
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
            : '<div class="char-stage3-lower-row" style="color:var(--char-text-faint);font-style:italic;">Assign scores above</div>')
      + '</div>'
      + dmgHtml
    + '</div>';
}
function updateGoldDisplay() {
  renderStage3Panel();
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
  renderStage3Panel();
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
      if (val !== null && val !== undefined && val !== '') {
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
  style.textContent = '#char-toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(10,14,24,0.95);border:1px solid rgba(200,148,10,0.4);color:var(--gold);font-family:var(--font-sans);font-size:0.85rem;padding:0.65rem 1.5rem;border-radius:8px;opacity:0;transition:all 0.3s ease;z-index:300;pointer-events:none;white-space:nowrap;}#char-toast.visible{opacity:1;transform:translateX(-50%) translateY(0);}';
  document.head.appendChild(style);
})();
