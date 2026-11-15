# Hereabouts design system: "Night map"

Hereabouts records older people telling stories about places and pins each one to a spot on the map and a decade. The interface works like a calm operations console for a town's memory. Charcoal panels float over a dark street map. Warm gold marks whatever is live or chosen. The storytellers' own words are the only thing set in a serif.

The tokens live in `src/styles.css` and the components in `src/components`.

## Principles

1. **The map is the canvas.** Every main screen either is the map or sits next to it. Panels float over it with a hairline ring and a deep shadow. They never sit on a light page.
2. **One warm accent.** Gold (`--gold`) is used for three things: the action that matters on a screen, the selected or tuned thing, and live state. Everything else stays in the greys. Never use two gold buttons side by side.
3. **Quiet chrome, loud content.** Labels are small and grey (`text-text-faint`, 12–13px, sentence case). Values are white and medium weight. Every detail panel follows the label/value pattern: "Told by / Ria van Dam", "Length / 2:14".
4. **Their words, in a serif.** `.prose-story` (Literata) is reserved for the storyteller's story and transcript. All UI text is Inter.
5. **Time has a colour.** Each decade has a colour that runs from sepia (1930s) through gold (1960s and 1970s) to dusk blue (2020s). It shows up only as small dots, pin rings and chips, never as fills.

## Colour

| Token | Hex | Use |
|---|---|---|
| `canvas` | #111214 | App background |
| `map` | #17181A | Map land |
| `panel` | #1B1C1F | Sidebar, floating panels, cards |
| `raised` | #232427 | Chips, inputs, hovered rows |
| `raised-2` | #2C2D31 | Active segment, pressed, clusters |
| `sunk` | #151619 | Chart tracks, wells |
| `line` / `line-strong` | white 7.5% / 13% | Hairlines, rings |
| `text` / `text-soft` / `text-faint` | #EDEDEF / #A1A2A8 / #6C6D74 | Values / body / labels |
| `gold` | #F3D08E | Primary action fill, selection, live |
| `gold-tint` / `gold-line` | gold 12% / 50% | Active nav, "live" pills, hover-card outline |
| `on-air` | #EF5A4F | Recording, destructive |
| `signal` | #E6D36B | Family circle |
| `ok` | #63C98B | Public, success |
| `now` | #3D86F0 | Only the "now" playhead tag on a waveform |

Status dots (8px circles) carry visibility: private is `text-faint`, family circle is `signal`, public is `ok`.

The decade ramp is `--decade-1930` … `--decade-2020`. Use `decadeColor()` in CSS and `DECADE_HEX` for the map and canvas.

Tailwind names: `bg-panel`, `bg-raised`, `text-text-soft`, `ring-line-strong`, `bg-gold-tint`, `text-gold`, `border-gold-line`, and so on. Legacy names from the first design (`paper`, `ink`, `amber`, `rule`) are aliased onto this palette so old code still renders. **New code uses the new names.**

## Type

- **Inter Variable** (optical sizes) for all UI text. The base is 15px. Use weight 500 for UI labels and values, and 600 for headings and big numbers. Headings get −0.02em tracking.
- **Literata Variable** only inside `.prose-story`.
- Scale: 12 (labels, meta), 13 (secondary), 14 (UI, buttons), 15 (body), 18 (panel titles), 24 (page titles), 40–56 (landing headline only).
- Use `.numerals` for counts, years and durations. It sets tabular figures.
- Never use all caps, letter-spaced eyebrows, or middle-dot meta strings joined with "·" in headings. A short grey label above a value is fine.

## Shape & depth

- Radius: 8px for buttons and inputs, 12–14px for panels and cards (`rounded-xl` or `rounded-2xl`), full for pills, chips and icon buttons.
- Floating panels use `.panel-float`: a 94% panel colour, a `line-strong` ring and a deep black shadow. In-page cards use `.panel` (panel colour with a hairline border, no shadow).
- Icon buttons are round with a hairline ring: `<Button variant="outline" size="icon-sm">`. Use them for close (✕), the arrow (→) on cards, and the play button.

## Components

- **Button** (`ui/button`). `gold` is the single primary action. `gold-soft` is a tinted toolbar action, for example "Record a memory" on the map. `secondary` is a charcoal default. `outline` is a ring only. `ghost` is text only. `destructive` is a red tint. Sizes are `sm` (32px), `default` (40px) and `lg` (48px).
- **Badge** (`ui/badge`). Pills. `gold` or `live` for live state, "Sample" or "On air". Use `DecadeTag` for decades.
- **Tabs** (`ui/tabs`). Use `variant="line"` inside panels (underline tabs, as in Overview / Slots / Logs) and `default` as a segmented control.
- **AppShell / Page** (`app-shell.tsx`). The sidebar contains the wordmark, the nav (Map, Record a memory, Your archive, Family; the active item is gold-tinted), and the Storytellers list (initials chips and story counts). The account sits at the bottom. On phones the sidebar becomes a sheet and a slim top bar appears. `AppShell bleed` is for full-bleed screens. `Page` wraps content in a readable column.
- **StoryMap** (`story-map.tsx`). Night-map tiles. Each pin is a dark disc with a decade-coloured ring and a white waveform glyph. Clusters are grey discs showing a count. Pins from other decades become ghosts at 40% instead of disappearing. Hovering a pin shows the **PinCard**: a gold-outlined slip with the title pill and decade dot, the place, Told by / Length, and a round →.
- **DecadeDial** (`decade-dial.tsx`). The decade scrubber is a histogram of memories per decade that doubles as the time control: drag it or use the arrow keys. The tuned bar is gold, the others are hatched, and "All years" lights every bar.
- **Story card** (landing grid, archive, teller page). Follows the station-card pattern: a title pill with the decade dot, a decade chip on the right, the place line with a small icon, then a row of label/value pairs (Told by, Length or Year) and a round → button. When a photo exists, it sits on top as a 16:10 image with `rounded-xl` corners.
- **Story panel** (map side panel and story page). Shows the title, the place line, and a round ✕. Underline tabs: Story, Transcript, Connected (n). Under them is the waveform player, styled like the station-usage chart: vertical bars, the played part gold, the unplayed part hatched, and a blue "now" tag at the playhead. After that comes the Details definition list: Told by, When, Place, Recorded, Visibility (with a status dot), Length.
- **Hatching** (`.hatch`). Marks the unplayed or unknown parts of a chart.
- **Kbd** (`.kbd`). Shows keyboard hints in the search bar.

## Motion

Motion only answers what the person does. Panels slide in 8px from their edge with a fade over 200ms. The scrubber bars ease their height over 300ms. The record key pulses only while recording. Nothing animates on page load except the landing hero's single reveal. Every animation honours `prefers-reduced-motion`.

## Voice

Plain and warm, from the user's side. "Record a memory", "Told by", "Who can hear this?", "Nobody has recorded the 1950s here yet. Record one". Errors say what happened and what to do next. Sample content is always labelled "Sample".

## Where AI shows up

The AI suggests the next interview question, tidies a transcript into a story, and guesses the place and the decade. Each of these is a suggestion the person confirms. AI output is never decorated with sparkles. A small "Suggested" label is enough.
