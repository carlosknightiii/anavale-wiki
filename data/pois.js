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
  }
];
