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
      + '<img class="char-type-icon" src="assets/icons/icon-' + typeId + '.svg" alt="' + t.name + '">'
      + '<div class="char-type-check">✓</div>'
      + '<div class="char-type-name">' + t.name + '</div>'
      + '<div class="char-type-element">' + t.element + '</div>'
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

// ── TOAST STYLES (injected) ────────────────────────────────────────
(function() {
  var style = document.createElement('style');
  style.textContent = '#char-toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(10,14,24,0.95);border:1px solid rgba(200,148,10,0.4);color:var(--gold);font-family:var(--font-sans);font-size:0.85rem;padding:0.65rem 1.5rem;border-radius:8px;opacity:0;transition:all 0.3s ease;z-index:300;pointer-events:none;white-space:nowrap;}#char-toast.visible{opacity:1;transform:translateX(-50%) translateY(0);}';
  document.head.appendChild(style);
})();
