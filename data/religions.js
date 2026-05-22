// data/religions.js
// The three faiths of Anavale — source of truth for religious data
// Each entry is intentionally lean on facts (those live in characters.js,
// organizations.js, cities.js, pois.js, creatures.js) and rich on voice.
// The renderReligion() function in wiki.js assembles full pages dynamically
// by querying getReligionData(id) across all data files.
//
// Schema per entry:
//   id, name, summary, deity_ids[], color, symbol,
//   partition_account, core_belief, practices[], structure,
//   relationship_to_gigglegloom, relationship_to_vareth,
//   relationship_to_other_faiths, tone, dm_notes,
//   player_facing, tags[]

var RELIGIONS = [
  {
    id: "brightcreed",
    name: "The Brightcreed",
    summary: "The most widespread faith in Anavale. Worships Oro and Nara. Holds that color is sacred, joy is devotion, and keeping the world vivid is the most meaningful act a living creature can perform. Has no behavior that is not also ordinary life.",
    deity_ids: ["oro", "nara"],
    color: "#c8940a",
    symbol: "An open hand with a circle of color above the palm — gold on most temple art, adapted to local hues in practice",

    partition_account: "Grak's grief was a symptom of a flaw that was always present. The Partition revealed it rather than caused it. Oro held. Nara survived. The world has color. This is the proof. The Brightcreed does not linger on what was lost — it celebrates what remains. The Stillkeep finds this emotionally convenient. The Brightcreed has never found the Stillkeep's objection persuasive.",

    core_belief: "The Brightcreed does not distinguish between Oro and the Gigglegloom. Where other faiths see magic as a force and a god as a separate thing, the Brightcreed sees one thing: color, alive and generous, which loves the world back. To practice Bubbleseed magic is to pray. To paint your door is to pray. To laugh until you cry at a festival is, absolutely and unambiguously, to pray. There is no separation between the sacred and the everyday. A good meal counts. A creature sitting on your foot counts. The sincerity is the practice.",

    practices: [
      "Color maintenance — allowing Fading to spread through neglect is a moral failing, not merely misfortune. Most Brightcreed communities have a color-warden: someone formally tasked with noticing when things start going grey.",
      "The Bounty Gesture — giving a gift of food to someone you have just met. Standard greeting in heavily Brightcreed communities. Refusing it politely is acceptable. Refusing it rudely means you are having a bad day and someone will quietly check on you later.",
      "Lighting something — any candle, lantern, or fire lit at dusk with the phrase 'for what remains' is a Brightcreed observance. Done at funerals, at the end of festivals, at the close of a long journey. Not required. Most people do it anyway.",
      "The festival calendar — officially 34 festival days per year. Unofficially, practitioners will find a reason for more. The Zippan are undisputed champions. The Grand Brightmark is held every three years and draws pilgrims from every region.",
      "Pilgrimage — to the Prior Stone at Prismhold (holiest site) and Bloom Hollow in Jugabi (second holiest). The Brightwall ascent at Doopu Peaks is not administered by the Brightcreed but is considered Oro's most visible ongoing act of protection and draws the most consistent pilgrim traffic."
    ],

    structure: "The Brightcreed has no central authority, no hierarchy of command, no governing council. It has Brightwardens (local color-maintenance officers), Festival Keepers (who manage the calendar and coordinate the Grand Brightmark), and Lumenites (itinerant preachers who travel between settlements, check color health, and officiate at rites of passage). The Gigglegloom Conclave and the Brightcreed maintain a complicated relationship — the Conclave treats magic as a discipline; the Brightcreed treats it as an expression of love. They agree on almost nothing procedurally and almost everything practically.",

    relationship_to_gigglegloom: "The Brightcreed does not separate Oro from the Gigglegloom — they are the same thing or expressions of the same thing, and the distinction does not interest most practitioners. The Conclave considers this imprecise. The Brightcreed considers the Conclave's precision beside the point. In practice, Bubbleseed magic is the most common type among Brightcreed communities, but all four types are embraced. Flamerage practitioners who light pyres at festivals are considered as devout as any.",

    relationship_to_vareth: "The Brightcreed is the Vareth's most visible ideological opposition — a faith built entirely around what the Vareth seeks to end. The Vareth does not fight the Brightcreed directly. It does not need to. If a community can be Faded slowly enough, the festivals feel hollow before anyone notices why. Kess the Gray considers this the most elegant thing the Vareth does. The Brightcreed's practical response — constant color maintenance, community wardens, the presence of Lumenites in vulnerable settlements — is more effective than any formal resistance. They are doing the work without naming it a war.",

    relationship_to_other_faiths: "The Brightcreed and the Stillkeep disagree on the Partition's meaning and do not resolve it. Their practitioners occasionally share meals without argument — Doopu Station is famous for this — but the theological divide is genuine. The Brightcreed reads Grak's grief as proof of a flaw. The Stillkeep reads it as a preventable tragedy. These are not compatible. The Veilborn are regarded with uneasy respect — the Revel's saturation effect and the Brightcreed's festivals often work in the same communities, sometimes simultaneously, without either faith confirming the relationship.",

    tone: "Warm, communal, relentlessly present-tense. The Brightcreed does not dwell on the Partition except to note that the world survived it. Its theology is less a system of belief than a description of how people already live when things are going well — and a reminder of what to protect when they are not.",

    dm_notes: "The Brightcreed should feel like the default texture of Anavale at its best. Players don't need to know they're encountering religion — they encounter a festival, a door being painted, a meal pressed into their hands. The faith is the culture. When the Dimming threatens a Brightcreed community, the players feel it as a loss of something they already loved, not an abstract theological problem.",

    player_facing: true,
    tags: ["brightcreed", "oro", "nara", "caparia", "faith", "color", "festivals", "light", "widespread"]
  },

  {
    id: "stillkeep",
    name: "The Stillkeep",
    summary: "A monastic order of record-keepers, historians, and patient observers. Worships Thyun, god of memory and deep time. Believes the Partition was preventable, that Grak's grief was legitimate, and that the most important thing a person can do is remember accurately.",
    deity_ids: ["thyun"],
    color: "#4a5878",
    symbol: "An open book with a single unbroken line running across both pages — representing the continuity of what has been",

    partition_account: "The Partition was preventable. Grak's grief was real and legitimate — a genuine response to impermanence that deserved to be heard. Oro and Nara did not listen carefully enough. Whether this makes them culpable is the question the Stillkeep has been arguing about for eight hundred years. They have not resolved it. The argument itself is considered the practice — a refusal to arrive at a comfortable answer and stop looking. The Brightcreed's reading (Grak was always flawed) is considered emotionally convenient. The Veilborn's reading is considered classified, which the Stillkeep finds professionally frustrating.",

    core_belief: "Memory is the most sacred thing in Anavale. Not nostalgia — memory. The accurate, complete, honest record of what actually happened. Thyun does not want to change the past; Thyun wants the past to be known. The Stillkeep exists to make this possible. They record everything: Gigglegloom surges, color health reports, the accounts of travelers, the decisions of governments, the behavior of the Vareth. They do not always share what they record. They share it when the record is complete and the moment is right. This patience is either their greatest virtue or their most dangerous flaw, depending on who you ask.",

    practices: [
      "The Transcription — the central ongoing practice of the order. Every member maintains a personal record. Every chapter maintains an institutional record. The Stillkeep's archives are the most complete historical resource in Anavale. They are also not fully accessible to anyone outside the order.",
      "The Long Silence — a monthly observance of one full day without speaking, dedicated to listening. What is being listened for varies by chapter and practitioner. The Vorrkai, who share some Stillkeep-adjacent beliefs, have a related practice.",
      "The Witness Oath — Stillkeep members who observe significant events are bound to record them accurately, including events that reflect poorly on the order itself. This oath is considered the hardest part of membership.",
      "The Slow Question — major decisions are never made in the same session in which they are raised. Every significant question is set aside for a minimum of one full day before deliberation. The reasoning: the first answer is usually the comfortable one."
    ],

    structure: "The Stillkeep is organized into chapters, each maintaining a library and a record-keeping staff. Chapters are largely autonomous. The Grand Archivist title is honorific rather than executive — no Stillkeep chapter is obligated to follow another's decisions, but the Grand Archivist's interpretations carry significant weight. The order is monastic in culture but not in requirement — members may live outside chapter houses, travel, hold other roles. What is required is the Transcription and the Witness Oath.",

    relationship_to_gigglegloom: "The Solvanu nation believes color is the world's memory — that the Gigglegloom is Thyun's expression in the physical world. The Stillkeep has not confirmed or denied this interpretation, which the Solvanu find simultaneously respectful and maddening. Stillkeep practitioners tend toward Steelfist magic — precise, disciplined, does exactly what it is told. Their color records are the most complete in Anavale, more detailed than the Conclave's surge logs. The Conclave acknowledges this with diplomatic discomfort.",

    relationship_to_vareth: "The Stillkeep records the Vareth's movements as it records everything else — methodically, accurately, and without rushing to conclusions. This is not neutrality. It is the recognition that an incomplete record is more dangerous than a slow one. The Stillkeep's archive of Vareth activity is the most complete in existence. They have not published it. The reason they have not published it is not confirmed.",

    relationship_to_other_faiths: "The Stillkeep's disagreement with the Brightcreed is genuine and ongoing — the Partition account cannot be reconciled, and neither order pretends otherwise. The disagreement is conducted with mutual respect and occasional shared meals, which both faiths consider sufficient. The Veilborn are a source of significant Stillkeep frustration: Solvara knows what actually happened at the Partition, the Veilborn has access to Solvara's truth in ways the Stillkeep does not, and the Veilborn will not share it. The Stillkeep has been formally requesting this information for four hundred years. The Veilborn's response has not changed.",

    tone: "Patient, precise, and genuinely warm beneath the discipline. The Stillkeep does not rush. It does not perform urgency. It is doing the long work of remembering everything and trusting that accuracy, accumulated long enough, matters.",

    dm_notes: "The Stillkeep is the players' best access point for historical information. If something happened more than fifty years ago, the Stillkeep probably recorded it. Whether they will share it depends on whether the record is complete and whether the players have earned the trust. A Stillkeep chapter that opens its archive to the players is a significant moment — they are being trusted with something the order takes very seriously.",

    player_facing: true,
    tags: ["stillkeep", "thyun", "memory", "records", "monastic", "nombi", "caparia", "archive", "patience"]
  },

  {
    id: "veilborn",
    name: "The Veilborn",
    summary: "A secretive faith centered on Solvara, god of secrets and hidden truth. The Veilborn believe that Solvara knows what actually happened at the Partition and has told no one — and that this truth, when it is finally revealed, will change everything. Their practices are not public knowledge. Their membership is not confirmed for any individual.",
    deity_ids: ["solvara"],
    color: "#6a3aaa",
    symbol: "A closed eye — not sleeping, not blind. Waiting.",

    partition_account: "Solvara knows what actually happened at the Partition. This is the Veilborn's entire theological position, its founding claim, and the source of every practice and structure that follows from it. The truth exists. It is being kept. It will be revealed at the right moment to the right audience in the right form — because Solvara does not keep secrets to protect them, but because the telling would change what is true, and the truth matters more than the telling. The Brightcreed's account is incomplete. The Stillkeep's account is incomplete. The Veilborn's account is: we know it is incomplete, and we know who holds the rest.",

    core_belief: "Truth is not the same as information. Information can be extracted, transmitted, recorded. Truth — real truth, the kind that changes what came before it — must be received at the right time by someone ready to hold it. Solvara is not withholding the Partition's truth out of cruelty or secrecy for its own sake. Solvara is waiting for the moment when the telling will not destroy what it reveals. The Veilborn's entire practice is preparation for that moment: keeping themselves ready, keeping the world stable enough to receive it, and ensuring that when it comes, the right people are listening.",

    practices: [
      "The practices of the Veilborn are not publicly documented. What is known comes from observation, inference, and occasional voluntary disclosure by former members.",
      "Confirmed: the Veilmoot — a governing council that meets in Veilhaven, deep in the Dingu Forest. Location is not on any official map. The Stillkeep has been searching for it for forty years.",
      "Confirmed: the Vaultkeepers are considered sacred. Members who encounter one of the four-eyed owls do not approach or disturb it. They record the encounter. They report it to the nearest Veilmoot contact.",
      "Confirmed: the Revel — the traveling festival guild — has Veilborn members. Their saturation effect in Fading communities may not be accidental. The Veilborn has not confirmed the relationship. The Revel has not confirmed it either.",
      "Inferred: new members are not recruited. They are identified. The process by which identification occurs has not been described by anyone who has undergone it.",
      "Inferred: the Veilborn maintains intelligence about the Vareth that no other organization possesses. What they do with it is operational rather than published."
    ],

    structure: "The Veilmoot governs. Below it: cells of members who know each other but not the full network. Above it: nothing confirmed. Whether the Veilmoot has direct contact with Solvara is not stated by any Veilborn member who has been asked. The question is not denied. It is not answered. Skiv — believed to be a Vareth lieutenant — is in fact a deep-cover Veilborn operative who has been feeding false intelligence to the Vareth for eleven years. This is known to the Veilmoot and to no one else.",

    relationship_to_gigglegloom: "Solvara's domain includes the places the Gigglegloom does not reach — the gaps between colors, the things that do not show under light. Whether the Dimming falls within Solvara's domain or is opposed to it is a question the Veilborn considers classified. Their practitioners tend toward unusual Gigglegloom expressions — multiple types, unexpected combinations, patterns the Conclave cannot fully categorize. The Conclave has filed three formal requests for Veilborn Gigglegloom methodology. None have received a response.",

    relationship_to_vareth: "The Veilborn considers the Vareth an operational concern, not a theological one. The Dimming is real and must be countered — not because it offends the faith, but because a Dimmed world cannot receive the truth Solvara holds. A world without color, joy, or memory has no capacity for revelation. The Veilborn's counter-Vareth operations are some of the most effective in Anavale and entirely deniable. Skiv is the clearest example.",

    relationship_to_other_faiths: "The Veilborn and the Brightcreed operate in the same communities, often simultaneously, without either confirming the relationship. Festival saturation and color protection are practical alignments, not theological ones. The Stillkeep has been requesting the Veilborn's Partition knowledge for four hundred years. The Veilborn's answer has not changed: not yet. The Stillkeep finds this unacceptable. The Veilborn finds the Stillkeep's timeline understandable but not decisive.",

    tone: "The Veilborn is not sinister. It is patient in a way that can look like secrecy to people who expect faith to be legible. It is doing something difficult over a very long time and it knows it. The closed eye is not blind — it is waiting for the moment when opening will matter.",

    dm_notes: "The Veilborn is the campaign's deepest faction. Skiv's revelation — not a villain, a Veilborn operative — is a major story beat. The Partition truth Solvara holds is the campaign's deepest mystery. The Veilborn's operations (the Revel, Skiv, the intelligence network) are the most sophisticated counter-Vareth force in Anavale, and the players may not realize they are being helped for a long time. Do not reveal the full Veilborn structure early. Let players build a picture of shadow and ambiguity before the pieces connect.",

    player_facing: true,
    tags: ["veilborn", "solvara", "secrets", "shadow", "partition-truth", "veilmoot", "caparia", "intelligence", "dingu-forest"]
  }
];
