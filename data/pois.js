// Points of Interest — Anavale Wiki
// Schema per entry: { id, name, region, nation, type, summary, description,
//   gigglegloom_notes, vareth_presence, formery_present, color_health, tone, tags[] }
var POIS = [
  {
    id:               "doopu-station",
    name:             "Doopu Station",
    region:           "caparia",
    nation:           "janiveth",
    type:             "town",
    summary:          "The last outpost before the Brightwall, and the first place travelers feel it. Not quite a city — more like a held breath. Every door is painted a different color. Every traveler is at a turning point.",
    description:      `Doopu Station exists for one reason: the Brightwall. Every pilgrim, Brightcreed cleric, Conclave researcher, and color-sick traveler hoping to be healed passes through here before ascending the Doopu Peaks. The town grew up around that foot traffic — inns, gear traders, guides-for-hire, and a surprising number of people who came for the Brightwall and simply never left.

The Station is built low and sturdy against the mountain wind. Stone buildings, heavy wooden shutters, rooflines sloped to shed the Peaks' frequent mist. Nothing decorative about the architecture — but every door in town is painted a different color. Local tradition: when you arrive, you pick a color. When you leave (if you leave), you paint it back to wood. The oldest doors have been painted forty or fifty times over, and in the right light you can see every layer.

**Notable Features**

**The Goldenstream Crossing** — The Goldenstream river passes directly through the center of town on its way down from the Doopu Peaks toward Bunbun Bay. It runs faintly luminescent at dusk, picking up ambient Gigglegloom from the peaks. Children swim in it. Older locals claim it used to glow brighter.

**The Door Museum** — Not an official museum. Just old Delwa Opp (retired Wanderkeep, uses a walking stick shaped like a narwhal) who has collected seventeen doors from buildings that no longer exist. She keeps them leaned against her outer wall and will explain every painted layer to anyone who asks. Most people ask.

**The Ascent Registry** — The Formery maintains a mandatory registration desk for all Brightwall pilgrims. Form 7-G (Intention of Ascent, Non-Commercial) requires six copies. Form 7-G (Commercial) requires eleven copies and a notarized Statement of Non-Misuse of Wonder. Nobody has ever successfully filed a 7-G (Commercial). The Formery considers this a victory.

**Shimmerpost Inn** — Largest inn in town. Fifty-three rooms, none of which are the same size. The owner, a former Conclave researcher named Brev, left the Conclave after a Steelfist surge reorganized his filing system so perfectly he realized he had nothing left to do. He makes excellent soup.`,
    gigglegloom_notes:"The Brightwall's 5-mile Vareth-free radius doesn't quite reach Doopu Station, but its influence does. The Gigglegloom here runs slightly ahead of intent — spells resolve a half-second faster than they should. Animals are calmer. Nightmares are rare. Locals call this the hum. Wanderkeep healers maintain a permanent rotating post here to tend Faded travelers before they attempt the ascent.",
    vareth_presence:  "none — within the Brightwall's sphere of influence. The Vareth does not send agents here. They do not come back.",
    formery_present:  true,
    formery_notes:    "Maintains the mandatory Ascent Registry desk. Form 7-G (Non-Commercial) requires six copies. Form 7-G (Commercial) has never been successfully filed. The Formery considers this a point of institutional pride.",
    color_health:     "excellent — Brightwall proximity keeps color vibrant and surges gentle",
    tone:             "Quiet in the way places near something holy are quiet. Not somber — people laugh, the Goldenstream is beautiful, festivals happen. But conversations tend toward sincerity. One of the few places in Caparia where a Brightcreed pilgrim and a Stillkeep monk might share breakfast without argument.",
    tags:             ["caparia", "janiveth", "doopu-peaks", "brightwall", "town", "pilgrimage", "goldenstream", "formery", "wanderkeep", "brightcreed"]
  },

  {
    id: "the-fortunate-collapse",
    name: "The Fortunate Collapse",
    region: "caparia",
    nation: "solenmere",
    type: "site",
    summary: "The best inn in Reveltown. Named after a structural incident involving a load-bearing column and three Bounce Beetles. Excellent food. The proprietor knows everything and will tell you almost none of it.",
    description: `The best inn in Reveltown and one of the more comfortable establishments in northwest Caparia. The ground floor is a tavern — open to festival crowds, reliably loud, reliably excellent food. The upper floors are genuinely quiet, insulated by twenty years of deliberate renovation decisions. Travelers who stay more than one night begin to understand why people never leave Reveltown.

The inn is named after an incident in which a spectacular structural failure of the original bar resulted in nobody being hurt and a load-bearing column landing perfectly on three Bounce Beetles who had been ricocheting dangerously for most of the evening. A bronze plaque on the replacement column reads: "In memory of what stood here. It did its best." Three Bounce Beetles live permanently under the bar. Their names are a source of ongoing disagreement among the regulars.`,
    gigglegloom_notes: "Warm Bubbleseed ambient — the specific quality of a place that has been consistently happy for a long time. Tinywings occasionally appear during particularly good musical sets and cannot explain themselves.",
    vareth_presence: false,
    formery_present: false,
    color_health: "excellent",
    tone: "Warm, loud downstairs, miraculously quiet upstairs. The kind of place that is hard to leave.",
    tags: ["reveltown", "caparia", "solenmere", "inn", "tavern", "nimblewood-adjacent", "bounce-beetles", "greytalon-watch"]
  },

  {
    id: "the-festival-archives",
    name: "The Festival Archives",
    region: "caparia",
    nation: "solenmere",
    type: "site",
    summary: "Records of every Revel performance ever staged. Maintained by an archivist who has been here thirty-one years. Contains a second record set in an unreadable cipher script that predates The Revel's founding. The archivist says this is a clerical error.",
    description: `A long, low building with excellent ventilation and poor lighting, because the archivist keeps the windows shuttered to prevent color fade on the older materials. Thousands of performance records — programs, cast lists, stage notes, audience counts, weather logs, and in some cases physical residue of performances: a jar of Featherflow-touched confetti that has not stopped moving in thirty years, a Bubbleseed bloom pressed flat that still smells like the specific summer it came from.

The public collection is genuinely remarkable and genuinely accessible. A second collection occupies four drawers in the back room, filed under performance dates and indistinguishable from surrounding records unless you know what you are looking at. The cipher script in these documents predates The Revel's founding. The archivist says this is a clerical error and has been saying so for forty years.

The Formery has been requesting access for a color saturation study for eleven years. Each of the seventeen sub-forms of Form 14-C (Archive Access, Cultural Heritage, Non-Governmental Entity, Third-Party Observation) must be notarized separately. Progress is being made.`,
    gigglegloom_notes: "The oldest materials carry residual Bubbleseed Gigglegloom pressed into paper and ink over generations. Being here long enough feels like being somewhere that has been happy for a very long time.",
    vareth_presence: false,
    formery_present: true,
    formery_notes: "Eleven-year access request in progress. Form 14-C has seventeen sub-forms. Each requires separate notarization. The Formery considers this standard procedure.",
    color_health: "excellent — deliberately maintained through controlled light and temperature",
    tone: "Quiet, precise, faintly warm in the way old records are warm. The specific atmosphere of a place that takes its work seriously.",
    tags: ["reveltown", "caparia", "solenmere", "revel", "veilborn", "archives", "cipher", "formery", "late-campaign"]
  },

  {
    id: "the-wandering-quarter",
    name: "The Wandering Quarter",
    region: "caparia",
    nation: "solenmere",
    type: "site",
    summary: "The semi-permanent, moveable section of Reveltown. Buildings can be broken down and reassembled when Revel circuits depart and return. Nothing here is where it was last season. Maps of it are sold in three shops. None of them agree.",
    description: `A section of Reveltown in the northwest where structures are designed for mobility — built to be broken down and moved when a Revel circuit departs, reassembled when it returns. The layout shifts each season. Buildings present six months ago may be elsewhere; structures here now may not have existed last month.

Maps of the Wandering Quarter are sold in three shops in the main festival district. None agree. All three are sold as current. Locals do not find this confusing because locals do not use maps of the Wandering Quarter. Visitors find this very confusing.

Most of the quarter is exactly what it appears to be — temporary festival infrastructure for performers and crew. The Gigglegloom surge readings here run 12% lower than the surrounding town average, which the Conclave observer has noted in Anomaly Report 412 and which has not received a response.`,
    gigglegloom_notes: "Surge readings 12% below surrounding town average despite proximity to the Revel Stage. The Conclave observer has documented this. No explanation has been offered. No response has been received.",
    vareth_presence: false,
    formery_present: false,
    color_health: "good — lower than expected for its location",
    tone: "Familiar and slightly disorienting. The kind of place that is impossible to have good directions to.",
    tags: ["reveltown", "caparia", "solenmere", "revel", "veilborn-adjacent", "gigglegloom-anomaly", "semi-permanent"]
  },

  {
    id: "reveltown-formery-branch",
    name: "Reveltown Formery Branch Office",
    region: "caparia",
    nation: "solenmere",
    type: "site",
    summary: "The Formery's Reveltown presence — a converted hat stall that was supposed to be temporary fourteen years ago. Processes 1,400 festival regulatory filings per year. Accepts all dates without comment. The hat hooks are still on two walls.",
    description: `The hat stall conversion was supposed to be temporary. That was fourteen years ago. The Formery branch office in Reveltown now operates out of a space that still has the original hat display hooks on two walls, which branch manager Helda Rimm has repurposed for hanging forms. This is not officially sanctioned. She has filed the form to sanction it. It is being reviewed.

The branch processes more festival-related regulatory filings per year than any other Formery office in Caparia — 1,400 and rising, most of them Form 7-P (Temporary Gathering, Recurring, Indefinite Duration). The form was not designed to be filed on a recurring basis. The Reveltown branch files it every 90 days for the town's general festival status and has been doing so for a decade. The Formery's central office considers this innovative and technically compliant.

Helda accepts all submitted dates without comment. She has processed forms dated yesterday, sixty years ago, and at least one predating the current calendar system. She processed them all. Nothing bad happened.`,
    gigglegloom_notes: "None noted. The Formery does not file Gigglegloom anomaly reports. The Formery files forms.",
    vareth_presence: false,
    formery_present: true,
    formery_notes: "This IS the Formery presence. Helda Rimm, branch manager. Form 7-P filed every 90 days for the general festival. Hat hooks still on walls. Sanctioning form still in review.",
    color_health: "good — Formery offices are required to maintain baseline color health by Confederation code",
    tone: "Efficient, cheerful, operating under conditions that would defeat most bureaucracies. The hat hooks are not going anywhere.",
    tags: ["reveltown", "caparia", "solenmere", "formery", "helda-rimm", "form-7p", "recurring-filing"]
  },
];
