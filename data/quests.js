// data/quests.js
// Anavale campaign quest data — source of truth for all quest tracking
// Schema: see inline comments on first entry
// Load order: add to index.html BEFORE index.js
// ─────────────────────────────────────────────────────────────────────────────

var QUESTS = [

  // ── INKWELL QUEST 1 ────────────────────────────────────────────────────────
  {
    id:              "the-missing-shipment",
    name:            "The Missing Shipment",

    // status: available | active | completed | dormant
    status:          "available",
    // stakes: low | mid | high | campaign
    stakes:          "low",
    // earliest session players could encounter this
    first_available: "session-1",

    hook:    "A routine Goldfast Ink delivery to the Great Index never arrived. The Paper Guild wants to know where it went before filing the complaint — complaints require twelve copies and they haven't printed enough yet.",
    summary: "A shipment of Inkwell's most expensive product, Goldfast Ink, went missing between Inkwell and Lightcrak. The merchant who carried it, Cavel, is confused and cooperative. His wagon log is intact. Something about the route doesn't add up — and Goldfast Ink is rare enough that someone really wanted it.",

    // related[] drives cross-linking in DM Tools — "Quests involving this entry"
    related: [
      { collection: "cities",        id: "inkwell"     },
      { collection: "cities",        id: "lightcrak"   },
      { collection: "characters",    id: "drak"        },
      { collection: "organizations", id: "great-index" }
    ],

    beats: [
      { order: 1, description: "Players hear about the missing shipment — either from Pell at the Paper Guild Hall, from a notice posted at the Great Index, or from Cavel himself looking embarrassed at a roadside inn." },
      { order: 2, description: "Cavel's wagon log shows an unscheduled stop at a waystation the players can investigate. The stop was legitimate — a broken axle — but someone took the Goldfast crate during the repair." },
      { order: 3, description: "The crate is found, empty, at a drop site. The ink itself is gone. A receipt stub in the crate names a procurement agent — Merret — who has no official client on record." },
      { order: 4, description: "Merret points (nervously, after persuasion) to a standing order routed through two more intermediaries. The trail goes cold before reaching Drak. But the destination region is wrong — it's not a library." }
    ],

    reveals: [
      "Cavel is innocent. He has been used as an unknowing courier for Drak's supply chain for at least two years.",
      "The Goldfast Ink is going to Drak's hidden archive — its surge-resistant properties make it ideal for housing corrupted Gigglegloom records permanently.",
      "Merret is the third intermediary in a four-link chain. He does not know who the final client is. He thought he was supplying a private research estate.",
      "The drop site has traces of flat grey residue — not Dimming grey, but something deliberate. A Dingurei scholar at the Great Index would recognize it as an archival preservation agent used by no known institution."
    ],

    dm_notes: "Players will not reach Drak here. This quest exists to plant the first thread — a supply chain operating in plain sight, a name (Merret) that will reappear, and the first sense that someone is building something. Reward curiosity and investigation. Cavel should be likable; the players should feel bad that he's been used. Osric at the Paper Guild will have filed this as Anomaly 7-C already — if the players talk to him, he is delighted someone else has noticed.",

    player_facing: false
  },

  // ── INKWELL QUEST 2 ────────────────────────────────────────────────────────
  {
    id:              "the-defect-that-isnt",
    name:            "The Defect That Isn't",

    status:          "available",
    stakes:          "mid",
    first_available: "session-1",

    hook:    "Brindle at the Paper Guild has been trying to fix a 'broken' ink for six months and is increasingly frantic. They've been told it's a quality problem. It is not a quality problem.",
    summary: "Inkwell Deep, Brindle's experimental ink formulation, resists Gigglegloom corruption entirely — texts written with it cannot be altered by magical surge or interference. Brindle thinks this is a manufacturing defect. The players, if they investigate, will discover it's the most tamper-proof writing medium in Anavale. Drak has become aware of it through the supply chain and very much wants it destroyed.",

    related: [
      { collection: "cities",     id: "inkwell" },
      { collection: "characters", id: "drak"    }
    ],

    beats: [
      { order: 1, description: "Brindle approaches the players (or the players meet Brindle while investigating the missing shipment) and asks if anyone has Gigglegloom knowledge — they want someone to test a batch of ink that 'doesn't behave right.'" },
      { order: 2, description: "Testing the ink confirms it: Inkwell Deep is completely inert to Gigglegloom manipulation. Surges pass through it. Corruption attempts slide off. Texts written in it cannot be changed by magical means." },
      { order: 3, description: "While Brindle processes this revelation, a procurement agent arrives with a standing buy order for the 'defective' ink batches — specifically the defective ones, at triple the Goldfast rate. The agent claims to represent a private collector. The agent is nervous." },
      { order: 4, description: "Players can investigate the agent, refuse the order, or follow the money. The agent leads (reluctantly) back toward the same intermediary network as the Goldfast shipment." }
    ],

    reveals: [
      "Drak knows about Inkwell Deep. If texts written in it cannot be altered by Gigglegloom corruption, they cannot be altered by Drak's archive processes — meaning records written in it would survive his corrupted archive intact and legible.",
      "Drak wants it destroyed, not acquired. A writing medium that resists corruption is a direct threat to his ability to maintain the false records he's building.",
      "Brindle has already produced eleven batches trying to 'fix' it. Seven batches are unaccounted for in the inventory log.",
      "The Gigglegloom Conclave would consider Inkwell Deep one of the most significant material discoveries in a generation. It has never been reported to them. Brindle didn't think it was real."
    ],

    dm_notes: "Brindle is genuinely warm and excitable — they should be someone the players like immediately. The moment of revelation (the ink is fine, the ink is extraordinary, the ink is dangerous to have) should land as a proper beat. If the players protect Brindle and the remaining batches, they've done something important that won't pay off until much later. The Gigglegloom Conclave, if informed, will send someone — and that someone will be very interested in who was trying to buy the defective batches.",

    player_facing: false
  },

  // ── INKWELL QUEST 3 ────────────────────────────────────────────────────────
  {
    id:              "the-spring-is-dimming",
    name:            "The Spring Is Dimming",

    status:          "available",
    stakes:          "mid",
    first_available: "session-1",

    hook:    "The frogs in the Inkwell spring are glowing a little less brightly than they were two years ago. Only Pell has noticed. She hasn't told anyone. She is quietly scared.",
    summary: "The luminous spring at the heart of Inkwell — the one the town is named for, the one that has three faintly glowing frogs no one has ever explained — is showing early signs of Fading. If the spring Fades, Inkwell's water-based ink formulations lose their Gigglegloom-resistance properties. The Great Index's archival supply chain fails within a year.",

    related: [
      { collection: "cities",     id: "inkwell"   },
      { collection: "cities",     id: "lightcrak" },
      { collection: "characters", id: "drak"      }
    ],

    beats: [
      { order: 1, description: "Pell pulls a player aside — not in front of others — and shows them the spring. She has kept a measurement log: the bioluminescence of the three frogs has decreased 12% in two years. She needs someone to tell her she's wrong, or help her figure out what's right." },
      { order: 2, description: "Osric, consulted carefully so he doesn't immediately file seventeen forms, confirms the readings and ties it (correctly) to Anomaly 7-C. He cannot explain how they're connected yet." },
      { order: 3, description: "Investigation of the spring's water source reveals trace contamination — not Dimming grey exactly, but a chemical signature consistent with prolonged contact with corrupted archival materials. Something upstream is wrong." },
      { order: 4, description: "The contamination source is a drainage runoff from a storage site two miles north — one of Drak's supply waypoints, now abandoned but still leaching residue into the groundwater." }
    ],

    reveals: [
      "The spring's Fading is not natural and not the Vareth's direct work — it's collateral damage. Drak's supply operation has been contaminating Inkwell's water table as a side effect of storing corrupted archival materials nearby.",
      "The three spring frogs are not ordinary Bumble Frogs. The Gigglegloom Conclave's 40-year-old report stamped FROGS DECLINED TO COOPERATE is more accurate than it sounds. Whatever they are, they are noticing.",
      "Reversing the Fading requires clearing the contaminated site and restoring the water source — a practical, completable task, but the site will have been used recently enough to yield evidence.",
      "Pell, if the players succeed, will finally raise her hand at the next Paper Guild meeting and make an announcement. She has been waiting two years to have enough data. She considers this a form of courage."
    ],

    dm_notes: "This is the most emotionally accessible of the four Inkwell quests — a quiet, local problem caused by something much larger, solved by paying attention. Pell's fear should be understated. She is not someone who panics; she is someone who noticed something wrong and has been carrying it alone. The frogs are deliberately unexplained. Do not explain them. The Conclave report is a joke that is also true.",

    player_facing: false
  },

  // ── INKWELL QUEST 4 ────────────────────────────────────────────────────────
  {
    id:              "anomaly-7c",
    name:            "Anomaly 7-C",

    status:          "dormant",
    stakes:          "high",
    first_available: "session-2",

    hook:    "Osric at the Paper Guild has been quietly logging unexplained variances in outbound supply orders for eight months. He filed it as Non-Urgent. He was wrong.",
    summary: "Osric's Anomaly 7-C — a single document in a stack of low-priority research notes — is the most complete accidental map of Drak's Dingurei supply network in existence. Osric doesn't know what he has. He filed it correctly, thoroughly, and in triplicate. It is sitting in the Paper Guild's secondary archive waiting to be retrieved by someone who understands what they're looking at.",

    related: [
      { collection: "cities",        id: "inkwell"     },
      { collection: "cities",        id: "lightcrak"   },
      { collection: "characters",    id: "drak"        },
      { collection: "organizations", id: "great-index" }
    ],

    beats: [
      { order: 1, description: "Players, having completed one or more earlier Inkwell quests, realize that Osric's research notes may contain more than anyone has read carefully. Osric is delighted to be asked. He pulls out seventeen folders." },
      { order: 2, description: "Cross-referencing Anomaly 7-C with the missing shipment data, the Inkwell Deep procurement attempts, and the spring contamination timeline reveals a single consistent pattern: one unknown client, four intermediaries, eight months of activity, a destination that keeps moving east." },
      { order: 3, description: "The pattern points toward a location in the eastern Dingu Forest — not Lightcrak, not any registered research site. A location that officially doesn't exist." },
      { order: 4, description: "Bringing the compiled report to the Gigglegloom Conclave or the Great Index triggers a formal investigation. Drak will know the report exists within days. The supply chain goes dark." }
    ],

    reveals: [
      "Anomaly 7-C is not Non-Urgent. It is the single most actionable intelligence document about Drak's Dingurei operation that has ever been compiled, and it was written by a forties-aged ink assessor who was mostly annoyed that the variance was making his averages look odd.",
      "The location in the eastern Dingu Forest is Drak's secondary archive — not his main one, but a distribution hub. Finding it would yield evidence, not Drak himself.",
      "Drak has been aware of Osric for three months. He has not moved against him because Osric has not yet connected the dots. If Osric connects the dots, that changes.",
      "The Great Index has a waiting list of eleven years. The Gigglegloom Conclave does not. This choice has consequences for how quickly the investigation moves."
    ],

    dm_notes: "This quest is a payoff quest — it only becomes available after the players have engaged with at least two of the first three Inkwell quests and accumulated enough threads to see the pattern. Osric should be rewarded for his thoroughness by being right about everything and wrong only about the urgency. He filed it correctly. He just didn't know what he was filing. The moment the players tell him what Anomaly 7-C actually means, let it land. He will need a moment. Then he will ask if there is a form for this.",

    player_facing: false
  }

];
