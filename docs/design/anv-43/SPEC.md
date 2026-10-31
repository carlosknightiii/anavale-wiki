# ANV-43 design bundle: Time of Day, Calendar, Kingdoms

DM-approved 2026-10-30. Requests row: fb7e21f8-36bb-41dd-838f-ce7e726e3a3d.

## What is in this folder

| Path | What it is |
| --- | --- |
| `boards/1-time-bar.html` | Pinned time-of-day bar (approved) |
| `boards/2-scenario-time-advance.html` | Scenario cards that advance the clock (approved) |
| `boards/3-calendar-drawer.html` | Calendar panel for the Field Guide quick actions drawer (approved) |
| `boards/4-wiki-calendar-page.html` | Player wiki Calendar page (approved) |
| `boards/5-signing-table-sigils.html` | Final sigil set, gold border = chosen (approved) |
| `sigils/sigil-<nation>.svg` | Final standalone sigil SVGs, one per Caparian nation |
| `sigils/sigils.json` | Stripe color, shield field color, shape and motto per nation |
| `assets/weather/*.svg` | 13 weather icons used by the calendar |
| `assets/regions/*.webp` | Region landscape images (likely already in the repo under the same names) |
| `assets/thumbs/*` | Timeline thumbnails (map crops, Thyun, Grak, Nara) |
| `previews/signing-table-sigils.png` | Rendered preview of the six sigils on their textured stripes |

The board files are design-canvas components. Each is an `<x-dc>` HTML template with `{{holes}}`, `sc-for` loops and `sc-if` conditionals, plus a `class Component extends DCLogic` at the bottom holding all data and behavior. They do not run outside the canvas. Read them as a precise spec: layout, copy, colors, sizes, keyframes and logic are all there. Rebuild them in the site's own stack (vanilla HTML/CSS/JS in anavale-wiki).

## House rules that apply

- Every color goes through `css/tokens.css` first. The mockups use raw hex; convert each to a token (reuse existing tokens where one already matches, add new ones only when needed).
- Fonts: Cinzel Decorative 700 for headings, Roboto for everything else. Gold is #f0b429 only.
- No em dashes in any user-facing text.
- Respect `prefers-reduced-motion` for every animation (the mockup already has the rule).
- Player wiki links only to entities that are player_facing. Solenveil, the Sunnish and Frostgate stay plain text.

## Data sources (already in Supabase)

- `campaign_clock` (single row id=1): `minutes` = minutes since Janufrost 1, 312 AA, 00:00. `region` = current region id for temperatures. Anon select/update RLS exists. Current value 272820 = Frogday, Julisun 9, 11:00 AM.
- `world_concepts` id `anavale-calendar`, column `types` (jsonb): `months`, `weekdays`, `regions` (12 months per region with season, high_f, low_f, icon, feel), `icons`, `year_scheme` (AA/BA), `holidays`, `current`, `temperature_words`, `temperature_curve`, `times_of_day`.
- Weekday: day index 189 (0-based) is Julisun 9, a Frogday. `weekday = ((day - 189) % 7 + 7 + 5) % 7`, with Shineday as index 0.
- Temperature by hour: coldest at 5 AM, warmest at 3 PM, cosine curve between the month's low and high (see `Main` board logic).
- Temperature color gradient stops (°F to color): -10 → rgb(220,236,255); 24 → rgb(143,200,255); 74 → rgb(111,211,154); 96 → rgb(239,91,91); 116 → rgb(214,52,52). Interpolate between stops.
- Season colors: winter/cool #8fb3e0, monsoon #5fc4c0, spring #8fd19e, scorching #ef6b5f, summer/hot #f0b429, autumn #e98a5c.
- Region accents: Caparia #e3cf62, Nombi #9fd3f0, Sohot #f2a65a, Jugabi #6fd39a.
- `nations` (Caparia's six): `description` (markdown, player-facing story) and `extra_data` keys `epithet`, `motto`, `origin_title`, `origin_legend` (markdown), `color_and_creatures` (markdown), `rivalries` (array of {with, tone, text}), `at_a_glance` (object), `leader` ({title, name, note}), `accord_contribution`, `sigil` ({shield_shape, design}), `dominant_religion`, `secondary_religion`, `dm_only` (array, DM eyes only).
- `regions` id `caparia`, `extra_data.history`: Toll Years, Hungry Winter, Signing, each nation's contribution, dated events.
- `creatures` id `tidehares` (new, full stat block).

## 1. Time bar (DM Tools Field Guide)

- Pinned to the top of the Field Guide view, full width, 40px tall.
- Background color by period: Night (before 5 AM or from 9 PM) #26335f with light text; Morning (5 AM to noon) #f2cf86; Afternoon (noon to 5 PM) #8cc4ec; Evening (5 PM to 9 PM) #e98a5c. Animate the color change.
- A thin horizontal center line, small ticks at 6 AM, noon and 6 PM.
- A round 34px icon slides along the bar at the current minute of the day (left = midnight, right = midnight). Icon changes by period: rising sun, full sun, setting sun, moon. Dragging it sets the time (10-minute steps) on the same day.
- Under the bar, a slim info strip: period name (Cinzel, gold), clock (e.g. 2:00 PM), date (weekday, month day), and "°F, word" for the current region.
- Right side of the strip: "Add [days] days [hours] hours [Add]". Going past midnight rolls the date. Negative numbers rewind.
- Every change writes `campaign_clock.minutes` and re-renders. Read on load.

## 2. Scenario cards that advance time

- Add an optional integer `duration_minutes` to scenario card tiles in `field_guide_sessions.blocks` (scenario_cards category). Add an editor field for it in DM Tools. Document it in `docs/field-guide-render-rules.md`.
- A card with a duration shows "Takes 1 hr 40 min" under its title, and a "They do this" button.
- Clicking it turns the card gold and shows: "Move the clock 1 hr 40 min? They arrive around 3:40 PM, Afternoon." with [Advance 1 hr 40 min] and [Keep the time].
- Advance writes the new clock and the time bar animates there. Keep the time marks the card chosen without changing the clock. Both end states show an Undo that restores the previous clock value.
- Nothing ever moves the clock without that confirmation.

## 3. Calendar drawer panel (Field Guide quick actions drawer)

- 400px-wide panel, see board 3. Header "Calendar, 312 AA, After the Accord", a Today button, and a region switcher (Caparia, Nombi, Sohot, Jugabi).
- Month grid with weekday headers, today ringed in gold, holidays marked, a DM-only marker style for "something happens".
- Selected-day card: big date, weekday, weather icon with its label, high and low in gradient colors, season tag in season color, the month's feel line, any holiday.
- "The Year in <Region>": 12 rows, month name, season, high/low colored by the temperature gradient.

## 4. Player wiki Calendar page (route `#calendar`)

- Two pill tabs at the top: **The Calendar** (Parts 1 to 3) and **Weather** (Part 4). Default to The Calendar.
- Part 1, The Year: the 312 AA seal, the Signing at Solenveil with the Solenveil map image, the **Signing Table**: six textured painted stripes (use `sigils/` SVGs, ~86x100px each) with nation links and italic mottos under them, the first Chancellor pull quote, the AA/BA explainer, and "A Timeline of Anavale": 12 rows each with a round 64px thumbnail, the year, a 1 to 3 word Cinzel title and one line of text.
- Part 2, Months: twelve month cards. The four holidays (Creature Festival Day, Accord Day, The Dawnburst, The Long Vigil) show a chip that opens a popup on hover and keyboard focus with name, date line, what it is, and what people do. Copy is in the board's `HOL` object.
- Part 3, The Week: the seven weekdays.
- Part 4, Weather: four image tiles to pick a region, a 320px hero image with a live effect per region, a temperature range chart with a thin average line, and month cards. Effects:
  - Caparia: slow rotating sun rays plus soft, curved SVG wind wisps drifting across.
  - Nombi: light falling snow.
  - Jugabi: light rain.
  - Sohot: an SVG mirage (feTurbulence + feDisplacementMap with an animated baseFrequency) applied to the image, a warm horizon glow, and glowing heat motes drifting diagonally up and to the right.
- Add a "Calendar" link to the wiki navigation.

## 5. Nation pages (player wiki and DM Tools)

- Player wiki nation page: render `nations.description` as markdown (bold and italic only), then from `extra_data`: the sigil and motto at the top, "How They Began: <origin_title>" with `origin_legend`, "Color and Creatures", "Rivalries" (show `with` and `text`; do not show `tone`), the `at_a_glance` table, the leader, and "At the Signing" with `accord_contribution`. Keep the existing facts box and customs.
- Never render `extra_data.dm_only` anywhere on the player wiki. Confirm by searching the rendered page for a dm_only sentence.
- DM Tools nation view: show everything above plus `dm_only` in a DM-only style box.
