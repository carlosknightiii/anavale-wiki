// data/cities.js
// All named cities and settlements across Pogglewog
// Migrated from Anavale_World_Lore.md
// Order: Caparia (11), Nombi (4), Sohot (5), Jugabi (3) = 24 total

var CITIES = [
  {
    id: "solenveil",
    name: "Solenveil",
    nation: "solenmere",
    region: "caparia",
    continent: "pogglewog",
    type: "capital",
    summary: "Seat of the Caldenric Accord. Most colorful city in Anavale. Color maintenance is law. Gigglegloom Conclave primary offices here.",
    description: "The beating heart of the Caldenric Accord and the Pogglewog Confederation. Color maintenance is not merely custom — it is enforceable law. Faded buildings receive restoration crews within a week. Home of the Gigglegloom Conclave's primary offices and the famous Mirrenflow promenade. The Formery has an office in Confederation Hall. Nobody invited it. It has been there sixty years.",
    landmarks: [
      { name: "Confederation Hall", description: "Seat of the Confederation Council. Two representatives per nation, rotating. The Formery has been in residence for sixty years without an invitation and the required paperwork to remove it has never been successfully completed." },
      { name: "Gigglegloom Conclave Offices", description: "Primary administrative hub for all Gigglegloom licensing in Anavale." },
      { name: "The Mirrenflow Promenade", description: "Celebrated riverside walkway along both banks of the Mirrenflow through the city center." }
    ],
    strategic_importance: "Confederation capital and Caldenric Accord seat — the diplomatic center of Pogglewog",
    color_health: "excellent — color maintenance is law",
    formery_present: true,
    vareth_presence: false,
    tone: "Warm, colorful, diplomatically precise. Everyone is welcome and everyone knows the rules.",
    tags: [
      "caparia",
      "solenmere",
      "capital",
      "confederation",
      "caldenric",
      "gigglegloom-conclave",
      "formery"
    ]
  },
  {
    id: "prismhold",
    name: "Prismhold",
    nation: "solenmere",
    region: "caparia",
    continent: "pogglewog",
    type: "city-state",
    summary: "Geographic and magical center of Caldenmor. Every Gigglegloom license in Anavale passes through here. Home of the Prior Stone.",
    description: "The Chroma Bureau's seat of power — an arcane city-state that answers to no government. Every Gigglegloom license issued anywhere in Anavale requires Prismhold's seal. Home of the Prior Stone, the holiest Brightcreed site in Anavale. 44 Bureau forms govern who may approach the Stone. The Formery is always somehow involved.",
    landmarks: [
      { name: "The Prior Stone", description: "A monolith of pure white raw Gigglegloom — the holiest Brightcreed site in Anavale. 44 Chroma Bureau forms govern who may approach." },
      { name: "Chroma Bureau Headquarters", description: "Governs all magic use across Anavale. Answers to no political authority." },
      { name: "The Chromeguard Barracks", description: "Base of operations for the Conclave's secret military enforcement force." }
    ],
    strategic_importance: "Magical regulatory center of all Pogglewog — controls all Gigglegloom licensing",
    color_health: "excellent — heavily monitored and enforced",
    formery_present: true,
    vareth_presence: false,
    tone: "Bureaucratic, powerful, deeply serious about forms.",
    tags: [
      "caparia",
      "prismhold",
      "chroma-bureau",
      "prior-stone",
      "gigglegloom",
      "city-state",
      "formery"
    ]
  },
  {
    id: "mirrenport",
    name: "Mirrenport",
    nation: "solenmere",
    region: "caparia",
    continent: "pogglewog",
    type: "major-port",
    summary: "Western coast, Salindri Sea. Largest trading port on Pogglewog. Goldenway headquarters.",
    description: "The commercial lungs of Pogglewog. More goods pass through Mirrenport in a week than most cities see in a year. The Goldenway trade guild operates its headquarters here. Where the Mirrenflow meets the Salindri Sea.",
    landmarks: [
      { name: "Goldenway Headquarters", description: "The world trade guild's primary offices. Neutral in politics, active in commerce." },
      { name: "The Great Docks", description: "Largest deep-water port on Pogglewog's western coast." }
    ],
    strategic_importance: "Largest trading port on Pogglewog — primary western trade hub",
    color_health: "excellent",
    formery_present: true,
    vareth_presence: false,
    tone: "Busy, commercial, cosmopolitan. Everyone passes through. Everyone owes something to someone.",
    tags: [
      "caparia",
      "solenmere",
      "port",
      "goldenway",
      "trade",
      "mirrenflow",
      "salindri"
    ]
  },
  {
    id: "reveltown",
    name: "Reveltown",
    nation: "solenmere",
    region: "caparia",
    continent: "pogglewog",
    type: "town",
    summary: "Home base of The Revel. Perpetually mid-festival. Nobody knows what day it is. Suspected Veilborn front.",
    description: "A town that has been in the middle of a festival for as long as anyone can remember. The Revel's traveling guild uses it as a permanent base. Buildings are more saturated with color than anywhere outside Prismhold. The Veilborn are rumored to use it as a front — the chaos of constant celebration makes surveillance nearly impossible.",
    landmarks: [
      { name: "The Revel Stage", description: "A permanent performance platform that has hosted continuous entertainment for years." },
      { name: "The Festival Archives", description: "Records of every performance The Revel has ever staged — written, if the rumors are true, in two languages, only one of which is readable." }
    ],
    strategic_importance: "Revel headquarters — cultural and suspected intelligence hub",
    color_health: "exceptional — surges frequently during performances",
    formery_present: false,
    vareth_presence: false,
    tone: "Chaotic, joyful, impossible to get a straight answer from anyone.",
    tags: [
      "caparia",
      "solenmere",
      "festival",
      "revel",
      "veilborn",
      "suspected-front"
    ]
  },
  {
    id: "bumbleton",
    name: "Bumbleton",
    nation: "zippan",
    region: "caparia",
    continent: "pogglewog",
    type: "capital",
    summary: "The Zippan's primary hub — a warm, loud, extraordinarily fragrant city. Seat of the Council of Guilds. Heart of Caparia's food, craft, and festival culture.",
    description: "Built low and wide rather than tall, Bumbleton's buildings are painted in warm seasonal colors that change throughout the year to reflect the current festival cycle. The streets smell like something baking at all hours. This is considered normal and correct. Guild banners hang from every significant building — extremely colorful, extremely competitive with each other. The surrounding Goober Bounce Meadows produce a near-constant 'boing' sound from Bounce Beetles.",
    landmarks: [
      { name: "The Guild Halls", description: "Each major guild hall doubles as governing chamber and showcase. The Baker's Guild keeps its windows open by city ordinance. The Builder's Guild hall is the most impressive structure in Bumbleton (they insisted; nobody argued). The Brewer's Guild has a public tasting room that is technically always open and practically always full." },
      { name: "The Grand Hall", description: "Rotating Confederation Council meeting venue decided by Craft Challenge — every guild built a table, the winner hosts the next session. Forty-seven different winning tables in recorded history." },
      { name: "The Festival Grounds", description: "Permanent, central, never fully empty. Current standing events include the Weekly Fizz-Tart Competition and the Perpetual Harvest Appreciation, running continuously for eleven years." },
      { name: "The Formery Office", description: "Located between the Baker's Guild and the Brewer's Guild. Its clerks are the most well-fed in all of Caparia. The Formery has never commented on this publicly." }
    ],
    strategic_importance: "Zippan cultural and governmental seat — festival and craft capital of western Caparia",
    color_health: "excellent — constant celebration sustains Gigglegloom health",
    formery_present: true,
    vareth_presence: false,
    tone: "Warm, loud, fragrant, competitive. Something is always being celebrated.",
    tags: [
      "caparia",
      "zippan",
      "capital",
      "guild",
      "festival",
      "food",
      "bubbleseed",
      "formery"
    ]
  },
  {
    id: "veilhaven",
    name: "Veilhaven",
    nation: "solenmere",
    region: "caparia",
    continent: "pogglewog",
    type: "hidden-settlement",
    summary: "Deep Dingu Forest. Secret seat of the Veilmoot. Does not appear on any official map.",
    description: "The hidden seat of the Veilmoot — the Veilborn's governing council. Location is not officially known. Does not appear on any Chroma Bureau, Caldenric Accord, or Goldenway map. The Stillkeep has been searching for it for forty years. The Vaultkeeper owls are always watching something in that direction.",
    landmarks: [
      { name: "The Veilmoot Chamber", description: "Unknown — no confirmed outside observer has returned with a description." }
    ],
    strategic_importance: "Veilborn operational and governance headquarters",
    color_health: "unknown — deep forest, Gigglegloom-saturated but immeasurable",
    formery_present: false,
    vareth_presence: false,
    tone: "Hidden, deliberate, watching.",
    tags: [
      "caparia",
      "veilborn",
      "hidden",
      "veilmoot",
      "dingu-forest",
      "solvara"
    ]
  },
  {
    id: "pebbleshire",
    name: "Pebbleshire",
    nation: "solenmere",
    region: "caparia",
    continent: "pogglewog",
    type: "village",
    summary: "Sillywiggles Meadows. Home of the annual Bounce Beetle race.",
    description: "A quiet village in the Sillywiggles Meadows best known for hosting the annual Bounce Beetle race — the most chaotic officially sanctioned sporting event in Caparia. No Bounce Beetle has ever completed the intended course. This has never been considered grounds for cancellation.",
    landmarks: [
      { name: "The Bounce Course", description: "A meandering series of painted flags through the meadows. Bounce Beetles arrive at the finish line through a combination of ricocheting, accident, and apparent spite." }
    ],
    strategic_importance: "None — beloved for the race",
    color_health: "excellent",
    formery_present: false,
    vareth_presence: false,
    tone: "Cheerful, pastoral, slightly chaotic on race days.",
    tags: [
      "caparia",
      "solenmere",
      "village",
      "bounce-beetle",
      "sillywiggles"
    ]
  },
  {
    id: "doopu-station",
    name: "Doopu Station",
    nation: "solenmere",
    region: "caparia",
    continent: "pogglewog",
    type: "outpost",
    summary: "Base of Doopu Peaks. Chroma Bureau monitoring post.",
    description: "An outpost at the base of the Doopu Peaks maintained by the Chroma Bureau as a monitoring station for the Brightwall — the world wonder where all four Gigglegloom types surge simultaneously at every equinox. Also monitors The Grasping Ledge, the Drakhold outpost hidden in the eastern peaks.",
    landmarks: [
      { name: "The Monitoring Station", description: "Chroma Bureau instruments tracking Gigglegloom surge patterns from the Brightwall and surrounding peaks." }
    ],
    strategic_importance: "Chroma Bureau observation post — monitors Brightwall and watches for Grasping Ledge Drakhold activity",
    color_health: "excellent near station, compromised near The Grasping Ledge",
    formery_present: false,
    vareth_presence: false,
    tone: "Professional, alert, slightly anxious about what is in the eastern peaks.",
    tags: [
      "caparia",
      "solenmere",
      "outpost",
      "chroma-bureau",
      "brightwall",
      "doopu-peaks"
    ]
  },
  {
    id: "lightcrak",
    name: "Lightcrak",
    nation: "dingurei",
    region: "caparia",
    continent: "pogglewog",
    type: "capital",
    summary: "Dingurei capital, built entirely around the Great Index. Takes its name from the luminous glow of the Partition Scar visible from its archive towers.",
    description: "A city of towers built for storage, not defense. The Great Index has exhausted horizontal space twice already. Towers connected by elevated covered walkways so scholars never have to go outside — the Dingurei consider going outside an inefficient interruption to thought. Streets below are quiet by Caparian standards. Street signs include the street's historical names, each change date, and a reference number pointing to the relevant City Records Archive entry.",
    landmarks: [
      { name: "The Great Index", description: "The most comprehensive magical library in Anavale. Table of contents is itself indexed. There is ongoing debate about whether the index of the table of contents requires its own index. Two Scribes are currently writing papers on opposite sides. Waiting list for access: eleven years." },
      { name: "The Partition Scar Observation Post", description: "Under continuous operation for three centuries. Permit required: research statement, three references, methodology, prior research evidence. Waiting list: eleven years. Scholars who arrive without a permit are given a form." },
      { name: "The Elevated Walkways", description: "Covered bridges connecting all major tower collections above street level. The Dingurei consider descending to street level during active research an inefficiency." }
    ],
    strategic_importance: "Greatest magical library in Anavale — Gigglegloom surge records more complete than the Chroma Bureau's",
    color_health: "excellent — Partition Scar glow provides constant ambient Gigglegloom",
    formery_present: false,
    vareth_presence: false,
    tone: "Precise, cerebral, surprisingly warm. Every question deserves a thorough answer.",
    tags: [
      "caparia",
      "dingurei",
      "capital",
      "great-index",
      "partition-scar",
      "library",
      "scholars"
    ]
  },
  {
    id: "inkwell",
    name: "Inkwell",
    nation: "dingurei",
    region: "caparia",
    continent: "pogglewog",
    type: "town",
    summary: "Two miles east of Lightcrak. Dedicated entirely to producing paper, binding materials, ink, and preservation supplies for the Great Index.",
    description: "Inkwell's craftspeople are among the most technically specialized in all of Caparia. Dingurei paper must meet exacting archival standards, and Inkwell's Paper Guild has developed formulations that resist fading, moisture, and minor Gigglegloom surges. They are not members of the Zippan's Council of Guilds. They find this clarification necessary to make regularly.",
    landmarks: [
      { name: "The Paper Guild Hall", description: "Home of Inkwell's most technically specialized craftspeople. Formulations for archival paper that resist fading, moisture, and Gigglegloom surges developed here." }
    ],
    strategic_importance: "Supplies all archival materials for the Great Index and Lightcrak's tower collections",
    color_health: "excellent",
    formery_present: false,
    vareth_presence: false,
    tone: "Industrious, precise, quietly proud. Not Zippan. Very different from Zippan.",
    tags: [
      "caparia",
      "dingurei",
      "town",
      "paper-guild",
      "archive",
      "lightcrak-support"
    ]
  },
  {
    id: "pebblecrown",
    name: "Pebblecrown",
    nation: "janiveth",
    region: "caparia",
    continent: "pogglewog",
    type: "capital",
    summary: "Carved directly into the northern face of the Jani Mountains, straddling the mouth of Gloomreach Pass. Controls all trade movement between Caparia and Sohot.",
    description: "A city built into the mountain rather than against it — structures carved from living rock, streets that are sometimes tunnels and sometimes ledges, architecture designed to endure centuries of passes and winters. Color here means something or it means nothing. Decorative color is minimal by choice. Functional color — the arm stripe of a trained soldier, the pigment mark of a Winter Count year, the Janiveth pass-shelter door painted the same green it has been for four hundred years — is permanent and precise.",
    landmarks: [
      { name: "The Winter Count Hall", description: "A long low hall of black granite built into the mountain. Interior walls covered floor to ceiling in four hundred years of annual pigment marks — one color per year chosen by community consensus." },
      { name: "The Wayhouses", description: "Seven free traveller shelters along the pass routes. The only rule: leave it better than you found it. Maintained continuously for four centuries." },
      { name: "The Merchant Quarter", description: "Stone benches required at the entrance to any transaction space — the Janiveth do not conduct commerce standing up. A seated merchant is a committed merchant." },
      { name: "The Garrison", description: "Mountain soldiers with colored arm stripes indicating training year. No other decoration. They do not need it." },
      { name: "The Formery Office", description: "Predates the current Winter Count Hall. Nobody knows what the Formery was doing in the mountains before there was a city here. The clerks have not commented." }
    ],
    strategic_importance: "Controls Gloomreach Pass — the primary Caparia-Sohot trade corridor",
    color_health: "moderate — minimal decorative color intentional; functional color deeply valued",
    formery_present: true,
    vareth_presence: false,
    tone: "Stoic, functional, quietly proud, surprisingly warm once earned.",
    tags: [
      "caparia",
      "janiveth",
      "capital",
      "mountain",
      "pass-control",
      "trade",
      "winter-count",
      "formery"
    ]
  },
  {
    id: "coldmere",
    name: "Coldmere",
    nation: "vorrkai",
    region: "nombi",
    continent: "pogglewog",
    type: "capital",
    summary: "Seat of the Deepchill Accord. Warm indoors, freezing out. Best stew in Anavale.",
    description: "The capital of the Deepchill Accord elder assembly. Famous for its extraordinary insulation — every building in Coldmere is designed to be warmer than physics suggests it should be. The best stew in Anavale is served here, a claim that produces the only situation in which a Vorrkai and a Zippan will argue at the same table.",
    landmarks: [
      { name: "The Accord Hall", description: "Seat of the Deepchill elder assembly. Full consensus required for all decisions. The national flag discussion has been tabled sixty-three times." },
      { name: "The Great Hearths", description: "Public warming stations open to any traveler. Maintained continuously through even the worst Nombi winters." }
    ],
    strategic_importance: "Deepchill Accord capital — political center of western Nombi",
    color_health: "good",
    formery_present: true,
    vareth_presence: false,
    tone: "Stoic warmth. The cold outside makes the warmth inside mean more.",
    tags: [
      "nombi",
      "vorrkai",
      "capital",
      "deepchill",
      "coldmere",
      "stew"
    ]
  },
  {
    id: "frostgate",
    name: "Frostgate",
    nation: "tekhari",
    region: "nombi",
    continent: "pogglewog",
    type: "major-town",
    summary: "Strix's trade hub. Being slowly drained of color. Residents notice food tasting less interesting but have no word for why.",
    description: "Once one of Nombi's most vibrant trade towns — the eastern gateway between Nombi and the rest of Pogglewog. Now under Strix's gradual trade-route manipulation, Frostgate is losing color in a way that produces no visible grey but creates a creeping absence. The fish taste less interesting. The stew is technically identical to last year's recipe but somehow lesser. Nobody has filed a complaint because nobody knows what complaint to file.",
    landmarks: [
      { name: "Frostgate Market", description: "The primary trade exchange for Nombi-Caparia commerce. Strix's agent network operates through here." },
      { name: "The Tekhari Research Outpost", description: "Tekhari researchers assigned to track trade anomalies. They have noted seventeen discrepancies they have not yet connected to a cause." }
    ],
    strategic_importance: "Primary Nombi-Caparia trade hub — currently being used by Strix to drain Nombi color reserves",
    color_health: "deteriorating — Stage 1 Fading establishing slowly",
    formery_present: false,
    vareth_presence: true,
    tone: "Busy, slightly off. Something is wrong and nobody can say what.",
    tags: [
      "nombi",
      "tekhari",
      "major-town",
      "strix",
      "fading",
      "trade",
      "vareth"
    ]
  },
  {
    id: "tumblesnow",
    name: "Tumblesnow",
    nation: "vorrkai",
    region: "nombi",
    continent: "pogglewog",
    type: "town",
    summary: "Western coast, where sky island tether routes begin. Windswept and cheerful.",
    description: "The departure point for sky island expeditions — tether routes anchored here connect to the aurora wind currents that allow access to the floating Sky Islands of Nombi. Windswept to a degree that has become civic identity. The cheerfulness is partly genuine and partly because anyone who cannot handle the wind leaves within a week.",
    landmarks: [
      { name: "The Tether Docks", description: "Anchored cable routes leading up into the aurora winds toward the Sky Islands." }
    ],
    strategic_importance: "Only reliable departure point for Sky Island access",
    color_health: "good — aurora-touched air carries natural Gigglegloom charge",
    formery_present: false,
    vareth_presence: false,
    tone: "Windswept and cheerful. Only the committed stay.",
    tags: [
      "nombi",
      "vorrkai",
      "town",
      "sky-islands",
      "tether",
      "aurora"
    ]
  },
  {
    id: "hollowpine",
    name: "Hollowpine",
    nation: "solvanu",
    region: "nombi",
    continent: "pogglewog",
    type: "village",
    summary: "Deep Endless Forest. Quiet. Rarely visited. The locals know something about the Mosskin they do not discuss.",
    description: "A Solvanu village deep in the Endless Forest, adjacent to the Ancient One's glacier. Rarely visited because it is very difficult to find and the Solvanu have not made finding it easier. The village maintains the closest human relationship with the Ancient One Mosskin of any settlement in Anavale. What they know from the Ancient One's long-ago signals, they have not shared with anyone. The Chroma Bureau has been politely requesting a meeting for thirty years.",
    landmarks: [
      { name: "The Glacier Approach", description: "The only marked path to the Ancient One's glacier — marked by the Solvanu in ways only the Solvanu can read." }
    ],
    strategic_importance: "Closest human settlement to the Ancient One Mosskin",
    color_health: "excellent — deep Gigglegloom saturation from Mosskin proximity",
    formery_present: false,
    vareth_presence: false,
    tone: "Still, knowing, deeply quiet.",
    tags: [
      "nombi",
      "solvanu",
      "village",
      "mosskin",
      "ancient-one",
      "endless-forest"
    ]
  },
  {
    id: "aurentum-city",
    name: "Aurentum City",
    nation: "auvari-remnance",
    region: "sohot",
    continent: "pogglewog",
    type: "capital",
    summary: "Seat of the Aurentum monarchy. Lavish and quietly anxious. The Queen's Fading is a closely guarded secret.",
    description: "The most lavish city in Sohot and the seat of the Aurentum hereditary monarchy. Magnificent ruins of the old empire serve as foundations and sometimes walls for newer construction. The Queen's Fading is known to only seven people — and the Chromeguard, who detected it three months before the court did and has not yet reported it publicly.",
    landmarks: [
      { name: "The Aurentum Palace", description: "Built into the ruins of the original imperial palace. Queen Sarova the Bright holds court here. Her color has been visibly diminishing for three seasons." },
      { name: "The Memory Archives", description: "Imperial records maintained by the Memory Keeper council. The Conclave has been trying to acquire certain sections for years." }
    ],
    strategic_importance: "Sohot monarchical seat — Queen Sarova's Fading makes this a crisis point",
    color_health: "deteriorating — Queen's Fading spreading slowly through court culture",
    formery_present: true,
    vareth_presence: true,
    tone: "Lavish, ceremonial, quietly desperate. Something is wrong and very few people know what.",
    tags: [
      "sohot",
      "auvari-remnance",
      "capital",
      "queen-sarova",
      "fading",
      "kess",
      "monarchy",
      "plot-critical"
    ]
  },
  {
    id: "sunharbor",
    name: "Sunharbor",
    nation: "telvari-exchange",
    region: "sohot",
    continent: "pogglewog",
    type: "major-port",
    summary: "Sohot's largest port. Bumti Bay. The Breth Chaine operates in the lower docks at night.",
    description: "The commercial heart of Sohot and one of the most cosmopolitan cities on Pogglewog — Sunharbor hosts more nationalities per day than some continents see per year. The Telvari Exchange's center of power. The harbor master has named every regular Bumti Jelly visitor, including Gerald, who has been arriving every summer for forty years. The Breth Chaine operates in the lower docks after dark.",
    landmarks: [
      { name: "The Telvari Exchange Hall", description: "Primary seat of the Merchant Prince council. Public record of all trades required by law." },
      { name: "The Lower Docks", description: "Breth Chaine territory after dark. Creature trafficking using port traffic as cover." },
      { name: "Bumti Bay Anchorage", description: "Home to the Bumti Jellies, including Gerald." }
    ],
    strategic_importance: "Largest port in Sohot — primary southern trade hub and Breth Chaine base",
    color_health: "good above water, compromised below",
    formery_present: true,
    vareth_presence: true,
    tone: "Vivid, commercial, brilliant on the surface. Watch the lower docks.",
    tags: [
      "sohot",
      "telvari-exchange",
      "port",
      "breth-chaine",
      "bumti-bay",
      "vareth",
      "trade"
    ]
  },
  {
    id: "ashenveil",
    name: "Ashenveil",
    nation: "auvari-remnance",
    region: "sohot",
    continent: "pogglewog",
    type: "city",
    summary: "Kess the Gray's seat. Once Anavale's most celebrated festival city. Nobody celebrates here now.",
    description: "Once the greatest festival city in all of Anavale — the most elaborate celebrations, the most skilled performers, the most vivid color traditions on Pogglewog. Kess the Gray has been seated here for years. Nobody celebrates here now. The buildings that hosted festivals are still standing. The decorations are still up in some of them. Nobody has taken them down and nobody goes near them.",
    landmarks: [
      { name: "The Festival Halls", description: "Still standing. Decorations still in place in several. Nobody goes near them." },
      { name: "Kess the Gray's Residence", description: "Location known. Not approached." }
    ],
    strategic_importance: "Kess the Gray's base of operations — former festival capital now a monument to the Dimming",
    color_health: "dire — Stage 2 Dimming in significant areas",
    formery_present: false,
    vareth_presence: true,
    tone: "Hollow. The shape of joy with everything removed from inside it.",
    tags: [
      "sohot",
      "auvari-remnance",
      "city",
      "kess",
      "dimming",
      "vareth",
      "former-festival"
    ]
  },
  {
    id: "driprock",
    name: "Driprock",
    nation: "vokrath",
    region: "sohot",
    continent: "pogglewog",
    type: "desert-town",
    summary: "Only reliable water source in the deep desert. Everyone passes through. Everyone owes someone here.",
    description: "The only consistent freshwater source in the deep Sohot desert. As a result, every faction, every trader, every traveler, and every raiding band has passed through Driprock at some point. The town has developed a culture of deliberate neutrality — everyone is welcome, no disputes are settled here, and the water is priced fairly for exactly that reason.",
    landmarks: [
      { name: "The Springs", description: "The actual water source — a series of deep rock fissures producing clean cool water at the base of a small escarpment." },
      { name: "The Neutral House", description: "The only inn in Driprock. Any dispute brought inside results in immediate ejection for all parties involved." }
    ],
    strategic_importance: "Only reliable water in the deep desert — neutral ground by necessity",
    color_health: "moderate — desert bleaches color, but Vokrath presence keeps it from Fading",
    formery_present: true,
    vareth_presence: false,
    tone: "Neutral, pragmatic, carefully friendly. Everyone is welcome because everyone needs the water.",
    tags: [
      "sohot",
      "vokrath",
      "desert",
      "water",
      "neutral",
      "trade",
      "driprock"
    ]
  },
  {
    id: "scaldmere",
    name: "Scaldmere",
    nation: "telvari-exchange",
    region: "sohot",
    continent: "pogglewog",
    type: "outpost-town",
    summary: "Far south, Golden Sea. Gateway to Bumti Bay.",
    description: "The southernmost significant settlement in Sohot — a gateway town on the Golden Sea coast where Bumti Bay shipping begins. Remote, hot, and extremely profitable for those who maintain it. The Bumti Jellies pass through here on their seasonal migrations.",
    landmarks: [
      { name: "The Golden Sea Dock", description: "Primary departure point for Bumti Bay voyages and the southernmost reliable port on Pogglewog." }
    ],
    strategic_importance: "Gateway to Bumti Bay and southernmost trade access point",
    color_health: "good — Flamerage-spectrum Bumti Jellie presence keeps color vivid",
    formery_present: false,
    vareth_presence: false,
    tone: "Remote, hot, entrepreneurial.",
    tags: [
      "sohot",
      "telvari-exchange",
      "outpost",
      "golden-sea",
      "bumti-bay",
      "scaldmere"
    ]
  },
  {
    id: "rootdeep",
    name: "Rootdeep",
    nation: "verdathi",
    region: "jugabi",
    continent: "pogglewog",
    type: "major-settlement",
    summary: "Heart of the Dodooti Rainforest. Greenvast Tribes' primary gathering place. Not a city — a permanent festival ground.",
    description: "Rootdeep is not a city in the architectural sense — it is the place where the Greenvast Tribes gather when they need to gather. Structures are permanent but built around living trees rather than displacing them. There is always something happening here. The Humid One Mosskin's presence suffuses the area with an ambient Bubbleseed warmth that visitors describe as feeling like being remembered fondly by something very large.",
    landmarks: [
      { name: "The Great Root Circle", description: "A clearing formed by the exposed root systems of several extremely ancient trees — the primary gathering space for Greenvast Tribe councils." },
      { name: "The Canopy Platform", description: "A system of connected platforms at canopy level where the Tribes hold their most significant ceremonies." }
    ],
    strategic_importance: "Primary Greenvast Tribes gathering point — political and ceremonial center of deep Jugabi",
    color_health: "exceptional — deepest Gigglegloom saturation on Pogglewog",
    formery_present: false,
    vareth_presence: false,
    tone: "Ancient, alive, deeply welcoming. The forest is paying attention.",
    tags: [
      "jugabi",
      "verdathi",
      "settlement",
      "greenvast-tribes",
      "rainforest",
      "mosskin",
      "rootdeep"
    ]
  },
  {
    id: "tanglevine",
    name: "Tanglevine",
    nation: "kalori-republic",
    region: "jugabi",
    continent: "pogglewog",
    type: "town",
    summary: "Northern Jugabi coast, Salindri Sea. Where Jugabi meets Caparia trade. Chaotic, colorful, smells amazing.",
    description: "The primary northern port of Jugabi and the main point of contact between Jugabi and Caparia trade networks. Founded by the Kalori Republic as its capital and main trade hub. Smells amazing because three different Jugabi culinary traditions compete here at all hours.",
    landmarks: [
      { name: "The Assembly Hall", description: "Seat of the Kalori Republic's elected Assembly of Voices. Any citizen may bring any matter to the floor." },
      { name: "The Salindri Docks", description: "Primary port connecting Jugabi to Caparia and Sohot trade routes." }
    ],
    strategic_importance: "Kalori Republic capital and primary Jugabi-Caparia trade connection",
    color_health: "excellent",
    formery_present: false,
    vareth_presence: false,
    tone: "Loud, colorful, delicious, politically energized.",
    tags: [
      "jugabi",
      "kalori-republic",
      "capital",
      "trade",
      "salindri",
      "tanglevine"
    ]
  },
  {
    id: "mumblewump",
    name: "Mumblewump",
    nation: "verdathi",
    region: "jugabi",
    continent: "pogglewog",
    type: "village",
    summary: "Interior deep jungle. Exists entirely in the canopy. Reached only by rope bridges. Nobody not born there can find it twice.",
    description: "A Verdathi village existing entirely at canopy level — no permanent structures touch the ground. Reached via a series of rope bridges whose arrangement subtly shifts, meaning that a traveler who found it once cannot reliably find it again. The Verdathi do not consider this a problem. The Verdathi consider this appropriate.",
    landmarks: [
      { name: "The Canopy Village", description: "Structures built among the highest branches, connected by rope bridges that shift seasonally." }
    ],
    strategic_importance: "Verdathi interior seat — impossible to find twice",
    color_health: "excellent",
    formery_present: false,
    vareth_presence: false,
    tone: "Ancient, hidden, deeply self-sufficient.",
    tags: [
      "jugabi",
      "verdathi",
      "village",
      "canopy",
      "hidden",
      "mumblewump"
    ]
  },
  {
    id: "gobblewump-crossing",
    name: "Gobblewump Crossing",
    nation: "solenmere",
    region: "caparia",
    continent: "pogglewog",
    type: "crossroads",
    summary: "Where the Mirrenflow meets the Tumblerun. Major crossroads. The Formery has an office here for some reason.",
    description: "The confluence of Caparia's two great rivers — the Mirrenflow (the main east-west trade artery) and the Tumblerun (flowing south from Nombi). As a result, virtually all overland and river trade crossing central Caparia passes through here. The Formery has an office here. Nobody remembers it arriving. Nobody has a record of it being established. It simply has always been here, which is either appropriate or alarming depending on how much you think about it.",
    landmarks: [
      { name: "The River Confluence", description: "The meeting point of the Mirrenflow and Tumblerun — marked by a standing stone whose inscription predates any known script." },
      { name: "The Formery Office", description: "Present for longer than anyone can document. Issues Form 88-C: Transit of Commerce Through a Documented Confluence. Nobody knows what 88-A and 88-B cover." }
    ],
    strategic_importance: "Primary Caparia river crossroads — all east-west and north-south river trade passes through",
    color_health: "good — constant trade traffic sustains Gigglegloom health",
    formery_present: true,
    vareth_presence: false,
    tone: "Busy, transactional, always someone new passing through. The Formery has been here longer than the crossing itself.",
    tags: ["caparia", "solenmere", "crossroads", "mirrenflow", "tumblerun", "trade", "formery"]
  }
];
