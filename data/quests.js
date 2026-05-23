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
  },

  // ── REVELTOWN QUEST 1 ───────────────────────────────────────────────────────
  {
    id: "the-anomaly-reports",
    name: "The Anomaly Reports",
    status: "available",
    stakes: "low",
    first_available: "session-1",

    hook: "A Conclave observer named Pellwick Thorune has been filing anomaly reports about Reveltown's Gigglegloom for seventeen years. None have received a response. He has heard the players might be trustworthy. He would very much like someone to look at Report 612.",

    summary: "Pellwick Thorune has accumulated seventeen years of Gigglegloom observation data in Reveltown that the Conclave has never read. Report 612 documents a Featherflow surge pattern identical to pre-Fading readings from the Jani Forest. He is not saying Reveltown is Fading — but he would like to know what it means. What's actually happening: the pattern comes from Veilborn operatives performing deliberate color restoration work disguised as festival surges. The pattern looks like early Fading because a skilled Fading reversal uses the same Gigglegloom frequencies in reverse.",

    related: [
      { collection: "cities",        id: "reveltown"           },
      { collection: "characters",    id: "pellwick-thorune"    },
      { collection: "characters",    id: "marro-fenn"          },
      { collection: "organizations", id: "gigglegloom-conclave" },
      { collection: "organizations", id: "revel"               }
    ],

    beats: [
      { order: 1, description: "Players meet Pellwick at The Fortunate Collapse, where he eats dinner every night, or at his monitoring station. He asks a simple favor: look at Report 612. He has seventeen years of data and nobody has read any of it." },
      { order: 2, description: "Report 612 documents a Featherflow surge pattern matching pre-Fading readings from the Jani Forest. Pellwick is methodical and correct. The pattern is real. He wants to know the source." },
      { order: 3, description: "Investigating the surge timing against Revel performance schedules — Pellwick has this data — reveals that two specific troupes produce the pattern every time, regardless of what they perform or how large the audience is." },
      { order: 4, description: "Confronting or closely observing one of the two troupes during a performance reveals deliberate Gigglegloom work — skilled, controlled, not incidental. The saturation effect is not an accident." }
    ],

    reveals: [
      "The Featherflow pattern is not a Fading warning — it is the residual trace of a Fading reversal. Skilled practice in the opposite direction produces the same frequency signature.",
      "Two Revel troupes are producing the surges deliberately. They are Veilborn operatives. They are not hiding what they do — just what it means.",
      "The Revel's color restoration effect across Pogglewog is not accidental collective joy. It is a coordinated operation.",
      "Pellwick's 847 reports, read together, form the most complete non-Conclave Gigglegloom dataset in Caparia. He will share all of it with players who treat his work seriously."
    ],

    dm_notes: "This quest is a warm, funny entry point with a genuine discovery underneath. Pellwick should be rewarded for seventeen years of careful work by being right about everything. The Formery beat: getting a counter-signature on Report 612 requires Form 3-B (Field Observer, Temporary Status, Non-Conclave). The Reveltown branch has it. Seventeen pieces of supporting documentation required. One requires a notarized statement from the nearest Brightcreed temple, which is currently hosting a three-day Oro celebration. The notary is at The Fortunate Collapse tonight.",

    player_facing: false
  },

  // ── REVELTOWN QUEST 2 ───────────────────────────────────────────────────────
  {
    id: "something-in-the-archives",
    name: "Something in the Archives",
    status: "available",
    stakes: "mid",
    first_available: "session-1",

    hook: "A village two days east of Reveltown has written to The Revel asking why a troupe visited them without advance notice, performed without charging, and left before sunrise. The Revel has no record of this troupe. The description matches three different documented troupes, none of which were scheduled for that route.",

    summary: "Marro Fenn asks the players to investigate an unscheduled Revel performance at a village east of Reveltown. The performance left the village visibly more saturated. A festival program was left behind — real Revel stock, correct printing, dated eleven years ago. The date is not an error. It is a Veilborn operational marker indicating a deliberate color restoration working. The village was experiencing early Fading that no official report had yet documented.",

    related: [
      { collection: "cities",        id: "reveltown"        },
      { collection: "characters",    id: "marro-fenn"       },
      { collection: "characters",    id: "wix"              },
      { collection: "organizations", id: "revel"            },
      { collection: "organizations", id: "veilborn"         }
    ],

    beats: [
      { order: 1, description: "Marro Fenn asks the players to look into it — she wants to know, and she wants someone to look who doesn't already work for her. The village's letter is warm, grateful, and confused." },
      { order: 2, description: "At the Festival Archives, Wix confirms no troupe was scheduled for the eastern route. The physical evidence: a festival program left at the village, real Revel stock, correct printing, dated eleven years ago." },
      { order: 3, description: "Investigating the village: it is genuinely brighter than four weeks ago. Residents describe the performance with warmth and slightly uncertain detail — like remembering a dream. One resident kept a Tinywing that appeared during the performance and hasn't left." },
      { order: 4, description: "Cross-referencing the program date against Revel operational records reveals it is one of several identically-dated programs associated with unscheduled performances in communities that later showed no Fading progression. The pattern spans at least fifteen years." }
    ],

    reveals: [
      "The eleven-year-old date is not an error. It is a Veilborn operational marker indicating a specific type of intervention.",
      "The village had early Fading that no official report had captured. The performance was a targeted color restoration working.",
      "Wix knows what the date marker means and will not say so unless directly and correctly asked.",
      "This is evidence of a sophisticated, long-running, anonymous color restoration operation that predates any organization the players currently know about."
    ],

    dm_notes: "This is the players' first clear Veilborn thread if they pull it. Let the village discovery breathe — the Tinywing that stayed is the emotional beat. Wix's silence is not hostile; it is professional. Players who earn trust through this quest gain their first real indication that the Veilborn is not what the rumors say. Do not confirm the Veilborn connection here. Let players build the picture.",

    player_facing: false
  },

  // ── REVELTOWN QUEST 3 ───────────────────────────────────────────────────────
  {
    id: "the-greytalon",
    name: "The Greytalon",
    status: "available",
    stakes: "mid",
    first_available: "session-1",

    hook: "Torv Bassle, proprietor of The Fortunate Collapse, has been watching a grey corvid with pale eyes sitting on the post outside his inn for six days. It watches the crowd. It does not move like birds move. He is keeping a private log. He does not know what it is.",

    summary: "A Greytalon — a corvid bred by the Vareth's Drakhold operation as a surveillance creature — has been roosting outside The Fortunate Collapse for six days. Its presence means the Vareth is watching Reveltown. Drak's operation has been mapping Gigglegloom patterns across Caparia and the Revel's unexplained surges have appeared in his documentation. This is reconnaissance. Players must decide whether to remove it, ignore it, or follow it.",

    related: [
      { collection: "cities",        id: "reveltown"        },
      { collection: "characters",    id: "torv-bassle"      },
      { collection: "characters",    id: "drak"             },
      { collection: "characters",    id: "pellwick-thorune" },
      { collection: "creatures",     id: "greytalons"       },
      { collection: "organizations", id: "revel"            }
    ],

    beats: [
      { order: 1, description: "Torv shares his private log with players he has decided to trust. The log is meticulous. Six days of observations. The bird has a route — it moves between three points in Reveltown at consistent intervals." },
      { order: 2, description: "Players who investigate the three points find: the Revel Stage, the entrance to the Wandering Quarter, and the Conclave observer's monitoring station. The Vareth is watching all three." },
      { order: 3, description: "Players choose: remove the Greytalon, follow it, or leave it. Each choice has different consequences. Removing it tells the Vareth something noticed and acted. Following it leads to a relay point outside Reveltown where observations are collected." },
      { order: 4, description: "The relay point — if found — contains logged observations in Drak's documentation format. The observations are analytical: surge timing, troupe correlations, a note reading 'source unidentified, pattern deliberate.' Drak knows the Revel's saturation effect is intentional. He does not yet know how." }
    ],

    reveals: [
      "The Vareth is actively surveilling Reveltown. This is not random — Drak's documentation has flagged the Revel as an operational concern.",
      "Drak knows the surge effect is deliberate. He does not know the mechanism. This makes Pellwick's troupe correlation data (Report 847) extremely sensitive.",
      "The three surveillance points — Stage, Wandering Quarter, monitoring station — tell players exactly what the Vareth considers important about Reveltown.",
      "If the Greytalon is removed, it will be missed. The Vareth will send another. If it is followed, the relay point can be used as a disinformation channel — but only once before Drak notices the reports are wrong."
    ],

    dm_notes: "This quest plays completely straight — no jokes, no whimsy. The Vareth dark thread for Reveltown. The Greytalon itself is not dangerous; it is a consequence waiting to become a threat. The players' choice at Beat 3 is genuinely meaningful. The disinformation option — feeding false reports through the relay — is an advanced play that first-time players may not think of, but should be rewarded if they do. The Formery beat: Form 19-W (Wildlife, Anomalous Behavior, Suspected Vareth Affiliation) must be filed with the nearest Chromeguard outpost in person by a licensed Conclave observer or their designated agent. Pellwick has the license. He has never used it. He is not sure he wants to go to Prismhold.",

    player_facing: false
  },

];
