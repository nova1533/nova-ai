# Handoff: Boz — Morning Command Center Dashboard

## Overview
A single-screen personal "command center" dashboard that Boz opens each morning. It surfaces, at a glance, everything that drives his day across four life domains: **business** (real-estate wholesaling + coaching), **health**, **tasks** (business + personal), and **schedule** (this week + upcoming key dates), capped by a daily intention.

The design ships **two complete visual skins** that the user switches between with an on-screen toggle:

- **Control Room** — a dark, "mission-control" aesthetic: neon accent glows, scanlines, Orbitron techy numerals.
- **California** — a light, airy, coastal aesthetic: warm/cool paper, serif numerals, a photographic coastline hero. The default California color scheme ("Tag Homes") is matched to the user's real-estate brand site (soft blue + cool blue-gray ink + Cormorant Garamond serif).

Both skins render the **same 11 content modules** in the same 4-column grid — only the styling changes.

---

## About the Design Files
The files in `source/` are **design references created in HTML/CSS + React (via in-browser Babel)** — prototypes that demonstrate the intended look, layout, and behavior. They are **not** production code to copy verbatim.

The task is to **recreate these designs in the target codebase's environment** using its established framework and patterns (React, Vue, Svelte, SwiftUI, etc.). If no codebase exists yet, choose an appropriate modern stack (React + a CSS solution like CSS variables / Tailwind / CSS Modules works well here, since the whole design is already token-driven).

The prototype loads React, ReactDOM and Babel from CDNs and concatenates the JSX files inline; that mechanism is a prototyping convenience and should **not** be reproduced — use the target project's real build pipeline.

---

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, glow treatments and interactions are all final and intentional. Recreate the UI pixel-accurately using the codebase's libraries. The two skins and their exact token values below are the source of truth.

---

## Current "as-delivered" settings (what the file opens with)
These are the live default settings the user approved. Preserve them as the initial state.

| Setting | Value |
|---|---|
| **Opening skin** | `California` (light) |
| Control Room accents | Cyan `#00E5FF` / Pink `#FF6B9D` / Gold `#FFD166` |
| Control Room glow | `100%` |
| Control Room numeral font | `Orbitron` |
| California color scheme | `Tag Homes` — Blue `#4F7BC7` / Sand `#BD8A5E` / Gold `#C6A24C` |
| California paper tone | `airy` (lightest) |
| California numeral font | `Cormorant Garamond` (serif) |
| Inspiration backdrop | off |

The user's stated favorite for everyday use is **Control Room (dark)**; California (light) is the second skin. The on-screen toggle lets them flip between the two. (The file currently *opens* on California so the light skin is immediately visible — flip the opening default to `dark` if the team prefers.)

---

## Global Layout

- **App container** (`.stage`): full-viewport, `min-height:100vh`. Background is a set of three large soft radial-gradient "halos" tinted with the accent colors, over the base `--bg`. A faint repeating horizontal scanline overlay sits on top (`::after`, ~3px period; much subtler in light skin).
- **Content wrapper** (`.wrap`): `max-width:1640px`, centered, padding `30px 30px 44px`.
- **Top bar** (`.topbar`): flex row, space-between, `margin-bottom:22px`.
  - Left: brand cluster — a glowing 10px dot + uppercase wordmark "MORNING COMMAND CENTER" (12px, letter-spacing .26em, `--text-mid`).
  - Right (`.meta`, flex, gap 14px): **the skin toggle** (`.skin-switch`), then a "SYNC · live" chip, then a time chip.
- **Main grid** (`.grid`): `display:grid; grid-template-columns:repeat(4,1fr); gap:18px`.
  - Span helpers: `.col2 { grid-column: span 2 }`, `.col4 { grid-column: span 4 }`.
  - Responsive: at `max-width:1100px` → 2 columns (`.col4` spans 2); at `max-width:640px` → 1 column.

### Grid module order (row by row, at 4 columns)
1. **Hero** (col2) · **Health HQ rings** (col1) · **Wholesaling KPI** (col1)
2. **Daily Practices / habits** (col2) · **Coaching KPI** (col1) · **Business Tasks** (col1)
3. **Contract for Deed / real estate** (col2) · **Personal Tasks** (col1) · **On the Horizon / important dates** (col1)
4. **This Week calendar** (col4)
5. **Daily Intention banner** (col4)

---

## The Skin Toggle (`.skin-switch`)
A pill-shaped segmented control in the top-right with two buttons: **CONTROL ROOM** and **CALIFORNIA**.
- Container: `inline-flex`, `border:1px solid var(--border-strong)`, `border-radius:999px`, `background:var(--card-2)`, `overflow:hidden`.
- Buttons: padding `8px 16px`, font 10px, uppercase, letter-spacing .14em, weight 700, color `--text-dim`.
- Active button: `color:var(--bg)`, `background:var(--teal)` (the primary accent), with a glow `box-shadow: 0 0 calc(14px*var(--gm)) var(--teal)`.
- Clicking sets the theme (`data-theme="dark"|"light"` on the root) which swaps every token below.

---

## Card Shell (shared by every module)
- `.card`: `background:var(--card)`, `border:1px solid var(--border)`, `border-radius:16px` (20px in light skin), `padding:20px`, `box-shadow:var(--shadow)`, `overflow:hidden`, `position:relative`.
- **Accent top-rail** (`.card::before`): a 1.5–2px horizontal bar inset 14px from each side at the very top, colored with the card's accent (`--acc`), with a neon glow `box-shadow: 0 0 calc(16px*var(--gm)) var(--acc)`. This is the signature motif — every card has a glowing colored "header line."
- **Hover**: border brightens toward the accent.
- **Card header** (`.card-head`): flex row, space-between, `margin-bottom:16px`. Left = a small glowing LED dot (`.led`, 7px, accent-colored) + an uppercase label (`.label`, 10px, letter-spacing .16em, `--text-dim`, `white-space:nowrap`). Right = optional small status text (e.g. "3/4 DONE", "5 PROPERTIES").
- **Accent assignment**: each card gets one of `acc-teal` / `acc-orange` / `acc-gold` / `acc-red` / `acc-dim`, which sets the local `--acc` custom property. NOTE: the token names "teal/orange/gold" are **slots**, not literal colors — in California they hold blue/sand/gold, etc.

---

## Design Tokens (CSS custom properties)

The entire design is driven by CSS variables on `:root`, overridden by `[data-theme="light"]` and then further tuned at runtime by the active palette/paper. Recreate this token system in the target stack.

### Shared / structural tokens
| Token | Meaning |
|---|---|
| `--bg`, `--bg-2` | page background + secondary |
| `--card`, `--card-2` | card surface + inset surface |
| `--border`, `--border-strong` | hairline borders |
| `--text`, `--text-mid`, `--text-dim` | text hierarchy |
| `--teal`, `--orange`, `--gold`, `--red` | accent **slots** (primary/secondary/tertiary/alert) |
| `--gm` | **glow multiplier** (0–1). Scales every neon `box-shadow`/`text-shadow` via `calc(Npx * var(--gm))`. Dark = up to 1.0; light is clamped to ≤0.10. |
| `--num-font` | font family for all numerals/stat values (`.num`) |
| `--track` | progress-bar / ring track color |
| `--shadow` | card drop shadow |
| `--scan` | scanline color |

### Control Room (dark) — `:root`
```
--bg:#0D1117;  --bg-2:#080b10;  --card:#131B24;  --card-2:#0f1620;
--border:rgba(125,155,185,0.12);  --border-strong:rgba(125,155,185,0.22);
--text:#EAF4FF;  --text-mid:#93a6b8;  --text-dim:#5A7080;
--teal:#00FFD1;  --orange:#FF8C00;  --gold:#FFD166;  --red:#FF4D6D;
--shadow:0 14px 38px rgba(0,0,0,0.55);
font-family: 'Inter', system-ui, sans-serif;
```
**As-delivered overrides applied at runtime:** accents become Cyan `#00E5FF` / Pink `#FF6B9D` / Gold `#FFD166`; `--gm` = 1.0 (glow 100%); `--num-font` = `'Orbitron'`.

### California (light) — `[data-theme="light"]` base
```
--text:#392E20;  --text-mid:#7B6A54;  --text-dim:#AD9C82;   (warm espresso ink — default)
--red:#B5463E;
--gm:0.08;  --scan:rgba(120,92,58,0.014);
--shadow:0 14px 34px rgba(96,68,40,0.13);
body font-family: 'Hanken Grotesk', system-ui, sans-serif;
.card border-radius: 20px;
```
Light skin also softens the halo field to warm tones and nearly removes the scanlines.

#### California **paper tone** (sets bg/card lightness) — current = `airy`
| Tone | --bg | --bg-2 | --card | --card-2 |
|---|---|---|---|---|
| **airy** (current) | `#FAF6EF` | `#F1EADD` | `#FFFFFF` | `#FAF5EC` |
| cream | `#F3EAD8` | `#E9DBC2` | `#FFFDF7` | `#F7EFDF` |
| warm | `#EFE3CB` | `#E3D3B4` | `#FBF4E6` | `#F1E6CF` |

#### California **color schemes** (accent slot values) — current = `Tag Homes`
| Scheme | primary (`--teal`) | secondary (`--orange`) | tertiary (`--gold`) |
|---|---|---|---|
| **Tag Homes** (current) | `#4F7BC7` soft blue | `#BD8A5E` sand | `#C6A24C` gold |
| Sage | `#6E8E6A` | `#C0815A` | `#CDA63F` |
| Coast | `#2F8475` | `#C06A48` | `#C2912F` |
| Tide | `#5388A6` | `#D08267` | `#C9A24A` |
| Olive | `#7E8B57` | `#A87B5E` | `#C79A3E` |

#### Tag Homes ink + serif override (special-cased)
When the **Tag Homes** scheme is active, the warm espresso ink is replaced with the brand's cooler blue-gray ink and a serif numeral font, to match the user's website:
```
--text:#2A2E3A;  --text-mid:#565B6B;  --text-dim:#8B8F9C;
--border:#D8D1BF;  --num-font:'Cormorant Garamond';
```
All other California schemes keep the warm espresso ink + `'Spectral'` serif numerals. (Implementation note: in the prototype this is a lookup keyed by the scheme's primary hex — `CALI_INK`. In production, model schemes as named objects each carrying their own ink + font, rather than keying on a color string.)

### Typography summary
| Role | Dark | Light |
|---|---|---|
| Body / UI sans | Inter | Hanken Grotesk |
| Numerals & stat values (`.num`) | Orbitron (toggleable to Space Mono) | Cormorant Garamond (Tag Homes) / Spectral (other schemes) |
| Hero name | Orbitron, 84px | Cormorant/Spectral serif, 80px, weight 700 |

`.label` = 10px, uppercase, letter-spacing .16em, `--text-dim`, weight 600, nowrap.
`.num` = `font-variant-numeric: tabular-nums`, weight 600.

### Spacing & radius
- Grid gap `18px`; card padding `20px`; card radius `16px` (dark) / `20px` (light).
- Inset sub-cards (habits, days, dates, goals) radius `10–13px`, on `--card-2`.
- Pills / chips radius `999px`.

---

## Modules (components) in detail

> Accent colors below refer to the **slot** (`--teal`/`--orange`/`--gold`), whose literal value depends on the active skin/scheme.

### 1. Hero (`col2`) — accent: primary (teal slot)
Two completely different renderings depending on skin (`Hero({d, skin})` in `cards.jsx`):

**Control Room (dark):** a flat card. Eyebrow "GOOD MORNING" → date/time/weather line → giant Orbitron name "BOZ." (84px, glowing) → italic-free intention line (17px, `--text-mid`, max 30ch) → a 3-up stat row pinned to the bottom (`margin-top:auto`). Each stat: accent-colored left border, value (`.num`, 26px), uppercase label (10px), accent delta (e.g. "+18%").

**California (light):** a **photographic hero**. The card has zero padding and contains:
- An `image-slot` (drag-and-drop user photo, persists) filling the card. Its fallback background is a CSS coastline gradient — currently a **cool blue** coast: `linear-gradient(195deg,#CFE3F2,#A7C8E6 36%,#7FAFD6 60%,#4E7E9A)`. (A small inline SVG of sky/sun/sea/sand is the actual default `src`; the gradient shows if that's removed.)
- A bottom-up dark **scrim** for legibility: `linear-gradient(to top, rgba(26,36,50,0.86), rgba(26,36,50,0.34) 46%, transparent)`.
- A "Drag your own photo →" hint pill, top-right.
- The same content (eyebrow / date / serif name "BOZ." / intention / 3-up stats) in light text (`#F4F8FC`) overlaid on the scrim. Min-height 300px.

Stat content (both skins): Revenue MTD `$128.4K` (+18%) · Pipeline `$2.4M` (+6 deals) · Goals On Track `78%` (3 of 4).

### 2. Health HQ rings (`col1`) — accent: teal slot
A triple concentric **progress-ring** SVG (168×168), three rings at radii 72/56/40, strokeWidth 9, round caps, each drawn from −90° with `stroke-dasharray`/`dashoffset` for its percentage, plus a faint full-circle track behind. Ring colors are the three accent slots. Center shows composite score `82` (40px `.num`, glowing) + "Composite". Below, a legend lists each ring: LED dot + name + `value / target`:
- Steps `8,240 / 10,000` (82%, teal)
- Gym `2 / 3·wk` (67%, orange)
- Breathwork `Done / daily` (100%, gold)

### 3. Wholesaling KPI (`col1`) — accent: orange slot
Header "WHOLESALING" + green "▲ +18%" trend. Big number `$2.4M` (40px, glowing) + "PIPELINE POTENTIAL". A progress bar (7px, rounded, glowing fill) showing MTD `128.4K / 175K` (≈73%). Then a 3-up row of "stage pills" (inset cards): Under Contract **4**, Negotiating **7**, Leads **23**.

### 4. Coaching KPI (`col1`) — accent: gold slot
Header "COACHING" + "▲ +2 this wk". Big `7` `/ 10` published, "CONTENT PUBLISHED · MTD", progress bar (70%). Then a 7-bar **mini bar chart** of content output by weekday (M–S): values [2,1,0,2,1,1,0]; zero days render as a flat track bar.

### 5. Daily Practices / Habits (`col2`) — accent: teal slot
Header "DAILY PRACTICES" + "x/4 DONE" counter. A 2×2 grid of habit tiles (`.habit`, inset cards). Each tile: a circular check button (30px; empty = dim ring; **done** = accent ring + accent-tinted fill + glow + check icon), name + sub-note, and a right-aligned streak number (accent, 18px) + "DAY STREAK". **Interactive:** clicking a tile toggles done and adjusts the streak ±1. Done tiles also get an inset accent glow.
Habits: Breathwork (streak 14, done, teal) · Steps (6, done, orange) · Gym Session (3, not done, orange) · IFS Journaling (9, done, teal).

### 6 & 7. Task lists — Business (`col1`, orange) and Personal (`col1`, teal)
Header label + "N OPEN" counter. A vertical list of rows divided by hairlines. Each row: a 18px rounded checkbox (checked = filled with accent + check icon in `--bg`), a small priority dot (high = red+glow, med = orange, low = teal), the task title (strikethrough + dimmed when done), and a right-aligned due label (10px). **Interactive:** clicking a row toggles done.
- Business: Call title co.—Oak St closing (Today, high) · Review JV agreement w/ Marcus (Today, med) · Send comps to buyer list (Tue, low) · Follow up—Mrs. Alvarez (Wed, med, done).
- Personal: Order anniversary gift (Today, high) · Book flights—July trip (Mon, low) · Schedule dentist (—, low) · Renew passport (Jun 10, med).

### 8. Contract for Deed / Real estate (`col2`) — accent: teal slot
Header "CONTRACT FOR DEED" + "5 PROPERTIES". List of property rows: a 34px rounded icon tile (home glyph, accent-colored) + address (bold) & "buyer · due" subline + a status tag pill + right-aligned monthly amount (`.num`). Status → accent + tag color: Active = teal, Pending = gold, Lead = dim. Tag pill = accent-tinted bg, accent text, accent border, uppercase 8.5px.
Rows: 1428 Oak St / J. Alvarez / Active / $1,240/mo · 705 Maple Dr / T. Nguyen / Active / $1,510/mo · 22 Linden Ave / K. Brooks / Pending / $980/mo · 88 Cedar Ln / R. Diaz / Active / $1,120/mo · 3 Birchwood Ct / — / Lead / —.

### 9. On the Horizon / Important dates (`col1`) — accent: gold slot
Header "ON THE HORIZON". Stacked rows (inset cards with an accent left-border): a left "countdown" block (big accent number = days, "DAYS"), then label + date + a small plan/next-action line.
- Oak St Closing · Jun 6 · **6** days · "Confirm wire + walkthrough" (orange)
- Maya's Birthday · Jun 14 · **14** days · "Book venue, order cake" (teal)
- Coaching Cohort Launch · Jul 1 · **31** days · "Finish 3 modules, email list" (gold)

### 10. This Week calendar (`col4`) — accent: teal slot
Header "THIS WEEK". A 7-column grid of day cells (inset cards, min-height 120px). Each: weekday label (MON…SUN), big date number, then event chips ("8a Breathwork" with the time in numeral font, accent-dim). **Today** (SUN 31) gets an inset glow, accent border, and accent-colored label/number.
Week data: Mon 25 (9a Buyer calls) · Tue 26 (11a Walkthrough—Maple) · Wed 27 (2p Coaching record) · Thu 28 (7a Gym, 4p JV sync) · Fri 29 (10a Title co.) · Sat 30 (—) · **Sun 31 today** (8a Breathwork, 6p Family dinner).

### 11. Daily Intention banner (`col4`) — accent: teal slot
Two-column band. Left (`1.1fr`, accent left-border): "// DAILY INTENTION" eyebrow + a large quote (22px, weight 500, balanced wrap), randomly chosen on load from 4 quotes. Right (`1.4fr`): "THIS WEEK'S COMMITMENTS" label + a 2×2 grid of goal chips (accent dot + label + ✓ if done): IFS journaling—daily (done, teal) · Breathwork streak→21 (gold) · Ship 3 coaching videos (orange) · Date night with partner (teal).

---

## Interactions & Behavior
- **Skin toggle**: top-bar segmented control switches `data-theme` between `dark`/`light`, swapping all tokens. Smooth via `transition: background .4s, color .4s` on body.
- **Habit tiles**: click to toggle complete; streak adjusts ±1; done state adds ring fill + glow.
- **Task rows**: click to toggle complete; checkbox fills, title strikes through + dims; "N OPEN" counter updates.
- **Hero photo (light skin)**: an image drop-slot — user drags an image in; it persists (localStorage in the prototype) and replaces the coastline placeholder. Reproduce with the codebase's file/upload + persistence approach.
- **Daily quote**: randomized once per load.
- **Hover**: cards brighten border toward accent; toggle buttons lighten text.
- **Glow system**: every neon shadow is `calc(Npx * var(--gm))`, so a single `--gm` value globally dials intensity. Keep this pattern — it's how "glow 100%" vs the near-flat light skin is achieved.
- All other numbers are currently **static sample data** (see below). No real data fetching yet.

## State Management
Minimal client state in the prototype:
- `theme` (`dark`|`light`) — drives token swap. **Persist** (the user expects their last skin to stick).
- Control Room: `accent` (3-color array), `glow` (0–100), `numFont` (Orbitron|Space Mono).
- California: `caliAccent` (scheme, 3-color array), `caliPaper` (airy|cream|warm).
- `inspiration` (bool) — optional ambient backdrop, currently off.
- Per-module local UI state: habit done-map, task done-maps, hero image, chosen quote index.

In production these settings would live in user preferences; the per-domain numbers (revenue, pipeline, steps, properties, calendar, etc.) should come from real integrations (Salesforce/CRM, Google Calendar, health/steps API, a tasks store). See `data.js` for the exact shape currently expected — it's a clean contract to back with real sources.

## Assets
- **No external image assets.** The coastline hero uses an inline SVG + CSS gradient placeholder and a user-supplied drop-in photo. Supply a real coastal photograph in production if desired.
- **Icons** are inline SVGs (home, check, bolt, chevron) defined in `cards.jsx` (`ICON`). Replace with the codebase's icon set.
- **Fonts** (Google Fonts): Orbitron, Space Mono, Inter, Spectral, Cormorant Garamond, Hanken Grotesk. Self-host or load via the app's font pipeline.

## Files (in `source/`)
| File | Contents |
|---|---|
| `Life Dashboard.html` | The self-contained prototype (all CSS/JS inlined) — open in a browser to see both skins live. Use the top-bar toggle. |
| `styles.css` | All tokens, both skins, every component's styles. The clearest spec for visuals. |
| `app.jsx` | App shell, token/skin logic, the palette/paper/ink tables, the skin toggle, and the (edit-mode) Tweaks panel wiring. |
| `cards.jsx` | All 11 module components + the dual-mode Hero + inline icons. |
| `data.js` | The sample-data contract (`window.DASH`) — the shape to back with real data. |
| `tweaks-panel.jsx`, `image-slot.js` | Prototype helpers (the tweak panel UI + the drag-drop image slot). Reimplement equivalents or drop them. |

> The Tweaks panel (`tweaks-panel.jsx`) is a prototyping affordance for exploring settings live; production should expose only the on-screen skin toggle plus whatever preference UI the app wants.
