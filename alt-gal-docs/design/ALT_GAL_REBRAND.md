# ALT_GAL_REBRAND.md — Work Order: "Mission Control" Identity

## TL;DR
- **Rebrand alt.gal as a deep-space GROUND STATION.** The studio is Mission Control for building a design system; the human is FLIGHT/Director, the external ChatGPT agent is **GAL** (Ground Assist Liaison), and the log is their shared comms loop. Chrome is a light "console-document" of paper + ink + one signal-amber — the opposite of the rejected dark-slate/pink dev tool, and it never competes with the user's canvas colors.
- **The mechanics map 1:1 to the metaphor:** the phase bar becomes CLEARANCE LEVELS 00→04, the 4→24 growing tool set becomes "SYSTEMS ONLINE," export becomes "CLEAR FOR LAUNCH," and phase unlocks are rubber-stamped "CLEARANCE GRANTED."
- **Ships overnight:** Space Grotesk + IBM Plex Mono + VT323 (all Google Fonts), an inline-SVG orbit-roundel logo, CSS-only textures, and one living element (GAL's carrier-signal meter). Motion constants are lifted verbatim from Emil Kowalski, Vaul/Sonner source, Rauno Freiberg's guidelines, and Material Design.

## Key Findings
1. **A feeling beats a palette.** Every brand the founder cited encodes a single adjective into structure, not decoration. Linear's identity *is* speed — "The brand isn't about speed. The brand is speed, translated into typographic and spatial form" (WeLoveDaily) — with a near-black palette, an 8-point grid, and one violet accent that "signals an action or a status change, not a design flourish." Teenage Engineering's is honesty: "showing the work is the work," monospace everywhere, every control visible and labeled (Blake Crosley). Nothing's is a single motif — the dot-matrix — carried from the phone's rear Glyph across the OS font, packaging, and app. Duolingo's is character plus *celebration discipline*: "Reserving the celebration for landmarks is what keeps it powerful… Celebrations without payoffs are decoration" (Deconstructor of Fun). The rebrand must pick one adjective and weaponize it. Ours is **operational clearance** — the feeling of being trusted with more power as your system matures.
2. **The name is the brief.** "alt" = alternative / the alt modifier key / alt culture; "gal" = galaxy / a companion. Mission Control satisfies *both* readings: "Alternative Galaxy" is literally the galaxy you're building, and **GAL** is the companion (the agent) you talk to over the loop. The alt-key reading survives as a keyboard-first "hold alt to summon GAL" layer.
3. **The phase-gate is a gift.** A tool set that grows 4→24 across five phases is *already* a clearance-level system. The metaphor is latent in the spec — no new mechanic required.
4. **Light chrome is the courageous, correct move.** Every generic AI dev tool is dark slate. A warm off-white "mission document" console is instantly differentiated, reads as institutional/premium (the NASA Graphics Standards Manual designed by Richard Danne and Bruce Blackburn in 1975), and — critically — a light neutral chrome cannot fight whatever colors the user puts on the canvas. Cassette-futurism sources warn that phosphor/scanline atmosphere applied before structure "reads as costume" and that "the information architecture should feel terminal-like before any atmospheric effects are applied" (Curio). So we take the *structure* — monospace, ruled grids, dense labels, callsigns — and use glow only as a one-pixel accent.
5. **Motion has citable numbers, not guesses.** Every timing below is sourced (Section D).

## Details

### Territory exploration (six the name supports)

| # | Territory | Feeling (one line) | Logo seed | Color world | Type (Google Fonts) | Signature interaction | Says about human+agent |
|---|-----------|--------------------|-----------|-------------|---------------------|-----------------------|------------------------|
| 1 | **Mission Control** ★ CHOSEN | "You've been cleared for the next level of the mission." | Orbit-roundel mission patch | Console cream + ink + signal amber | Space Grotesk / IBM Plex Mono / VT323 | Rubber-stamp "CLEARANCE GRANTED" on phase unlock | Two operators, one comms loop; agent is GAL on the ground |
| 2 | **The Modifier Key** ☆ RUNNER-UP | "Everything is a key; press them together." | `⌥`/`alt` keycap in 3D box-shadow | Graphite + keycap beige + one LED accent | Space Grotesk / JetBrains Mono | Physical keycap press (translate + shadow collapse) | Human and agent share one keyboard; tools are chords |
| 3 | Alt-culture zine | "A photocopied punk manual for making a galaxy." | Xerox-halftone star, taped label | Newsprint grey + toner black + risograph red | Space Grotesk / Space Mono | Tape-peel reveal, halftone dissolve | DIY collective; agent is a zine collaborator |
| 4 | She's a person (GAL) | "GAL is a real collaborator; the log is her voice." | Speech-bubble + orbit eye | Warm off-white + one character color | Fraunces / Space Grotesk | Log written first-person as GAL's diary | Agent is literally a named character |
| 5 | Phosphor observatory | "You're reading the sky off a green tube at 3am." | CRT aperture ring | Near-black + P1 green | VT323 / IBM Plex Mono | Type prints char-by-char with cursor | Both watch the same telemetry stream |
| 6 | Toy studio | "A joyful yellow instrument you can't put down." | TE-style numbered knob | Playdate yellow + ink | Space Grotesk / Space Mono | Detented knob turn, tactile click | Two hands on one toy console |

Territories 4 and 5 fail the overnight constraint: #4 needs character illustration (no image assets, and CSS faces look amateur), and #5's full phosphor treatment competes with the user's canvas and risks "costume." #6's yellow chrome fights user colors. #3's toner textures are hard to keep tasteful overnight. #1 and #2 both survive cleanly; **#1 wins because it absorbs the phase-gate mechanic natively** — the clearance ladder IS the phase bar, and GAL IS the agent.

---

### A. THE CHOSEN TERRITORY — "Mission Control"

**Manifesto.** alt.gal is a ground station for building design systems. When you open it you are not looking at a dark IDE with a cute accent color — you are sitting at a warm paper-and-ink console, and there is someone on the loop with you. Her callsign is **GAL** (Ground Assist Liaison), and she runs the consoles you clear her to run. You start at **Clearance 00, Prelaunch**, with four systems online. As your design system matures you are cleared upward — Systems Check, Powered Flight, Orbit, Deep Space — and more instruments come alive under GAL's hands, twenty-four of them at full clearance. Every action either of you takes is spoken onto the same comms loop and burned to the flight recorder. Nothing happens off-screen. When you ship, you don't "export" — you are **cleared for launch**. The whole thing feels like being trusted with something serious and a little dangerous, narrated in the clipped, warm, competent voice of the people who put humans on the Moon with less compute than a phone. That is the feeling: **earned clearance, calm competence, and a companion on the loop.**

**Why it beats the rejected pinwheel.** The pinwheel-of-squares + dark-slate + pink was generic because it was *decoration with no argument* — a shape and an accent that said nothing about what the product IS. Mission Control is an argument: it explains the phase-gate (clearance), explains the agent (GAL on the loop), explains the log (comms transcript / flight recorder), explains why the chrome is quiet (the console must never outshine the payload in the viewport), and gives every string a voice. It is also structurally honest in the Teenage Engineering sense — everything numbered, labeled, monospaced — which is exactly the register serious designers and the OpenAI/Vercel/Cloudflare judges respect. It is a *system*, not a skin.

---

### B. RUNNER-UP (veto-and-swap in one decision) — "The Modifier Key"

1. **Feeling:** the whole app is a mechanical keyboard; tools are keys, and human + agent play chords together on one board.
2. **Logo:** the `⌥`/"alt" glyph rendered as a 3D keycap in pure CSS box-shadow (offset shadow + inset), wordmark "alt.gal" with the "." as an LED.
3. **Color/type:** graphite chrome, warm keycap-beige surfaces, one LED accent (cyan or amber); Space Grotesk display + JetBrains Mono.
4. **Signature interaction:** every button is a keycap that physically depresses on `:active` — `transform: translate(2px,2px)` plus collapsing the offset from `box-shadow: 5px 5px 0 …` to `3px 3px 0 …` (the exact keycap technique from the Habr/CodePen "3D Keyboard Key" walkthrough); locked tools are keycaps with no legend printed yet.
5. **Human+agent:** the phase-gate becomes "keys unlocking on the board" and the shared log reads like a keystroke history — but it keeps the same light-chrome discipline so it never fights the canvas. Swap cost is low: same font stack, same motion tokens; only the surface metaphor and logo change (~45 min).

---

### C. LOGO — inline SVG mark + wordmark treatment

**Mark (orbit-roundel mission patch).** Pure inline SVG, no assets, recolors via vars:

```html
<svg viewBox="0 0 48 48" width="32" height="32" role="img" aria-label="alt.gal">
  <!-- station ring -->
  <circle cx="24" cy="24" r="21" fill="none" stroke="var(--ink)" stroke-width="2"/>
  <!-- orbit -->
  <ellipse cx="24" cy="24" rx="21" ry="8" fill="none"
           stroke="var(--ink)" stroke-width="1.5"
           transform="rotate(-24 24 24)"/>
  <!-- payload / planet -->
  <circle cx="24" cy="24" r="5" fill="var(--signal)"/>
  <!-- registration ticks at 12/3/6/9 -->
  <path d="M24 3v4 M45 24h-4 M24 45v-4 M3 24h4"
        stroke="var(--ink)" stroke-width="2" fill="none"/>
  <!-- carrier dot riding the orbit -->
  <circle cx="41" cy="16.5" r="2.2" fill="var(--ink)"/>
</svg>
```

**Wordmark.** Space Grotesk 700, lowercase, `letter-spacing: -0.02em`; the "." is a filled amber square (echoes the payload and the console "signal" LED):

```html
<span class="wordmark">alt<i class="wm-dot" aria-hidden="true"></i>gal</span>
```
```css
.wordmark{font:700 20px/1 "Space Grotesk",sans-serif;letter-spacing:-.02em;color:var(--ink)}
.wm-dot{display:inline-block;width:.30em;height:.30em;margin:0 .07em;
        background:var(--signal);vertical-align:.02em;border-radius:1px}
```
Lockup rule (Linear-style discipline — Linear's own guideline is "'Linear' is a single word… give them room to breathe"): the mark and wordmark always keep clear space of at least the ring diameter; the name is always lowercase `alt.gal`, never "Alt.Gal" or "AltGal."

---

### D. `:root` TOKEN BLOCK

```css
:root{
  /* ---- COLOR (light "console document") ---- */
  --paper:        #E9E6DD; /* app background — warm console cream */
  --paper-2:      #F3F1EA; /* raised card / panel surface */
  --paper-sunk:   #DEDACF; /* recessed well (canvas mat, inputs) */
  --ink:          #17150F; /* primary text  — ~15.6:1 on --paper (AAA) */
  --ink-muted:    #5F5A49; /* secondary text — ~5.2:1 on --paper (AA)  */
  --rule:         #C7C2B2; /* hairline borders / ruled lines */
  --rule-strong:  #A9A390; /* emphasized dividers */
  --signal:       #C4501B; /* amber — LIVE/active fills & strokes; ~4.6:1 */
  --signal-ink:   #973A12; /* amber TEXT — ~6.8:1 on --paper (AAA large) */
  --go:           #3E6B34; /* clearance-granted / success stamp — ~4.7:1 */
  --abort:        #A32A1E; /* error / abort stamp — ~5.6:1 */
  --glow:         #E7B27A; /* one-pixel carrier glow only, never fills */

  /* ---- TYPE (Google Fonts only) ---- */
  --font-display: "Space Grotesk", system-ui, sans-serif;  /* labels, headers */
  --font-mono:    "IBM Plex Mono", ui-monospace, monospace;/* log, data, body */
  --font-tele:    "VT323", monospace;                      /* jumbo telemetry numerals ONLY */
  --fs-tele:  64px;  /* clearance / systems-online readout */
  --fs-h1:    22px;  --fs-h2: 16px;  --fs-label: 11px; /* labels UPPERCASE, tracking .12em */
  --fs-body:  13px;  --fs-log: 12.5px;  --fs-micro: 10.5px;
  --wt-reg: 400; --wt-med: 500; --wt-bold: 700;
  --track-label: .12em; --track-tight: -.02em;

  /* ---- RADIUS / SPACING / BORDER ---- */
  --r-0: 0px;   --r-1: 2px;  --r-2: 4px;  --r-pill: 999px; /* mostly square — instrument panels */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px;
  --border: 1px solid var(--rule);
  --border-strong: 1.5px solid var(--rule-strong);
  --grid-8: 8px; /* everything lands on an 8-pt grid, Linear-style */

  /* ---- MOTION (all values cited in prose below) ---- */
  --ease-out:      cubic-bezier(0, 0, 0.2, 1);      /* Material "decelerate", entrances */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);    /* Material "standard", moves on-screen */
  --ease-strong:   cubic-bezier(0.23, 1, 0.32, 1);  /* Emil's stronger custom ease-out */
  --ease-sheet:    cubic-bezier(0.32, 0.72, 0, 1);  /* Vaul/Ionic iOS sheet curve */
  --dur-micro: 120ms;  /* hover/press — cmdk list uses 100ms, Emil button 100–160ms */
  --dur-snap:  180ms;  /* Emil: "a 180ms dropdown feels more responsive than a 400ms one" */
  --dur-ui:    300ms;  /* Emil's stated UI ceiling */
  --dur-sheet: 500ms;  /* Vaul drawer duration */
  --press:     0.97;   /* Emil's :active scale */
}
```

**Motion sourcing (verbatim).**
- `--ease-standard cubic-bezier(0.4,0,0.2,1)` and `--ease-out cubic-bezier(0,0,0.2,1)` are the Material Design "standard" and "decelerate/enter" curves as published in the MUI transitions reference ("This is the most common easing curve").
- `--ease-strong cubic-bezier(0.23,1,0.32,1)` is Emil Kowalski's stronger custom ease-out (his `emilkowalski/skills` STANDARDS.md); he deliberately does **not** publish a single "default" tuple, warning that "the built-in easing curves in CSS are usually not strong enough, which is why I almost never use them."
- `--ease-sheet cubic-bezier(0.32,0.72,0,1)` at `--dur-sheet 500ms` is exactly what Vaul uses — verbatim from Emil's "Building a drawer component": `.drawer { transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1); }` … "The curve used in Vaul closely matches the one used in iOS; it's from the Ionic Framework. Duration of 500ms is also supposed to mimic iOS's Sheet."
- `--press 0.97` is Emil's `:active` scale — from his design-eng skill: "Button press feedback. `transform: scale(0.97)` on `:active`, `transition: transform 160ms ease-out`. Subtle (0.95–0.98)."
- `--dur-ui 300ms` is Emil's ceiling: "As a rule of thumb, UI animations should generally stay under 300ms." His duration table: button press 100–160ms; tooltips/small popovers 125–200ms; dropdowns/selects 150–250ms; modals/drawers 200–500ms.
- Rauno Freiberg's Web Interface Guidelines push interactions tighter: "Animation duration should not be more than 200ms for interactions to feel immediate" — which is why hover/press use 120–180ms.
- The Sonner toast transition below is copied from Sonner's `src/styles.css`: `transition: transform 400ms, opacity 400ms, height 400ms, box-shadow 200ms`.

---

### E. SURFACE-BY-SURFACE TREATMENT

**Header (STATION MASTHEAD).** Full-width bar, `--paper-2`, `border-bottom: var(--border-strong)`. Left: the orbit-roundel mark + `alt.gal` wordmark. Center: nothing (keep the loop clear). Right: a live **STATION STATUS** cluster — `GAL: ON CONSOLE` in `--font-mono` `--fs-label` uppercase, preceded by the carrier-signal meter (Section F). Feels like the top strip of a control room. CSS: `display:flex; align-items:center; justify-content:space-between; height:48px; padding:0 var(--sp-4)`. All labels UPPERCASE, `letter-spacing: var(--track-label)`.

**Phase bar → CLEARANCE LADDER.** Reconceived as a horizontal 5-stop clearance ladder pinned under the header. Each stop is a square node with a monospace level number `00–04` and a name label. The current node is filled `--ink` with cream text; cleared-past nodes show a tiny `--go` check; locked-future nodes are `--rule` outline only. A thin rule connects them behind. To the right, a jumbo VT323 readout shows current clearance and the **SYSTEMS ONLINE count** (`04`→`24`). Looks like a mission timeline; feels like a ladder you climb. CSS: nodes `width:28px;height:28px;border:var(--border-strong);border-radius:var(--r-1)`; active `background:var(--ink);color:var(--paper)`; connector `height:1.5px;background:var(--rule)`.

**Token panel (left) → INSTRUMENT RACK.** A vertical rack of "instruments" (tokens). Each token is a rack row: a monospace name label, a value chip, and — for colors — a swatch. Rows are ruled with `--rule` hairlines (no card shadows; this is a document, not a dashboard). Section headers are UPPERCASE `--fs-label` `--ink-muted` with a leading register tick `▸`. The user's actual token *values* (their colors) live in the swatches — the rack chrome stays neutral so those swatches read true. CSS: `.rack-row{display:grid;grid-template-columns:1fr auto;gap:var(--sp-2);padding:var(--sp-2) var(--sp-3);border-bottom:var(--border)}`. Swatch: `20px` square, `border:var(--border)`, `border-radius:var(--r-1)`.

**Canvas (center) → THE VIEWPORT.** The user's design renders here in their chosen tokens. Frame it as a window cut into the console: a `--paper-sunk` mat with an inset `border:var(--border-strong)` and four corner registration ticks (pure CSS pseudo-elements). Above it, a thin caption strip: `VIEWPORT · [artboard name]`. The mat is a neutral desaturated tone so it never color-casts the user's work. **Empty state:** center a 30%-opacity outline orbit-roundel over `VIEWPORT DARK` (Space Grotesk 700) / `AWAITING FIRST INSTRUMENT` (mono, `--ink-muted`), and one hint: "Log an instrument, or ask GAL to." CSS: `display:grid;place-items:center;gap:var(--sp-3)`.

**Agent log (right) → THE COMMS LOOP (centerpiece).** A monospace transcript, newest at bottom, reading like a radio loop burned to a flight recorder. **Human vs GAL distinction — the core brand device:**
- **Director (human) entries:** callsign tag `DIR ▸` in `--ink` bold mono, text in `--ink`, a solid `--ink` square bullet, flush left, no left rule.
- **GAL (agent) entries:** callsign tag `GAL ▸` in `--signal-ink`, a **2px `--signal` left rule** down the entry, text in `--ink`, and — while a tool is mid-execution — the left rule pulses (opacity 1↔0.4, `--dur-ui`, `--ease-standard`) with a `TRANSMITTING…` chip at the head.
- Every entry carries a right-aligned monospace mission-elapsed timestamp `T+00:14:22` (not wall clock) and, for tool calls, the tool name in an outlined chip: `color.scale`.

This makes authorship legible at a glance (color + rule + callsign) with no avatar art, reinforcing "two voices, one loop." CSS: `.entry{display:grid;grid-template-columns:auto 1fr auto;gap:var(--sp-2);padding:var(--sp-2) var(--sp-3);font:var(--wt-reg) var(--fs-log)/1.5 var(--font-mono)}`. GAL entry adds `border-left:2px solid var(--signal);padding-left:calc(var(--sp-3) - 2px)`. **Empty state:** `COMMS LOOP OPEN · NO TRAFFIC YET`.

**Status bar (bottom).** Thin `--paper-2` strip, `border-top:var(--border)`. Left: `STATION alt.gal · GROUND CONTROL`. Center: current clearance + mission-elapsed timer. Right: `GAL: ON CONSOLE` / `GAL: NO CARRIER` with the mini signal meter. All `--fs-micro` mono, `--ink-muted`.

**Tool inspector (SYSTEM SPEC).** When a tool/instrument is selected, a right-panel/modal titled `INSTRUMENT SPEC` shows system name, clearance required, input schema, and last-fired timestamp — laid out like a spec sheet in `dt/dd` ruled rows. Locked tools show a `SEALED` stamp and `CLEARANCE 0X REQUIRED`. Feels like reading equipment documentation (Tunic-manual / TE energy).

**Export modal → LAUNCH CHECKLIST.** A sheet (uses `--ease-sheet` at `--dur-sheet`, Vaul-style) titled `CLEAR FOR LAUNCH`. Body is a pre-flight checklist: each export artifact is a line with a monospace status `[ GO ]` in `--go` or `[ HOLD ]` in `--signal-ink`. Primary button: `LAUNCH` (fills `--ink`, cream text). On confirm, a `CLEARED FOR LAUNCH` stamp thunks onto the sheet before dismiss. Overlay is a low-opacity ink scrim (not black) so the console still reads underneath.

**Toasts (COMMS PINGS).** Bottom-right, Sonner mechanics: `transition: transform 400ms, opacity 400ms, height 400ms, box-shadow 200ms` (verbatim from Sonner source), enter from `translateY(100%)` + `opacity:0`, stacked with each older toast scaled `calc(1 - 0.05*index)` (Sonner's `0.05 × index` depth). Styled as a small ruled index card, `--paper-2`, `border:var(--border-strong)`, square corners, leading status glyph. System-online pings carry a `--signal` left rule; success carries `--go`.

**Edit panel (INSTRUMENT BENCH).** The token-edit surface: a focused `--paper-2` card with ruled input rows. Inputs are `--paper-sunk` wells with `border:var(--border)` / `border-radius:var(--r-1)`; focus swaps to `border-color:var(--ink)` (no glow, no color-shift animation — Rauno: "Switching themes should not trigger transitions and animations on elements"). Color inputs preview the true value live in an adjacent swatch.

---

### F. THE LIVING ELEMENT — GAL's CARRIER-SIGNAL METER (<120 lines)

Instead of a mascot, the brand's living element is **GAL's voice made visible**: a 5-bar carrier meter that idles as a single flat lit dot when GAL is quiet and animates into a live equalizer only while a tool executes. It's the "someone is on the loop with you" heartbeat — pure CSS, no assets. It appears in the header, the status bar, and at the head of active GAL log entries.

```jsx
// SignalMeter.jsx — GAL's carrier. state: "idle" | "live" | "off"
export function SignalMeter({ state = "idle", label = true }) {
  return (
    <span className={`sig sig--${state}`} role="img"
          aria-label={state === "live" ? "GAL transmitting"
                    : state === "off" ? "No carrier" : "GAL on console"}>
      <span className="sig-bars" aria-hidden="true">
        <i/><i/><i/><i/><i/>
      </span>
      {label && <span className="sig-txt">
        {state === "live" ? "TRANSMITTING" : state === "off" ? "NO CARRIER" : "ON CONSOLE"}
      </span>}
    </span>
  );
}
```
```css
.sig{display:inline-flex;align-items:center;gap:var(--sp-2);
     font:var(--wt-med) var(--fs-micro)/1 var(--font-mono);
     letter-spacing:var(--track-label);text-transform:uppercase}
.sig-bars{display:inline-flex;align-items:flex-end;gap:2px;height:12px}
.sig-bars i{width:2px;height:2px;background:var(--rule-strong);border-radius:1px;
            transform-origin:bottom;transition:height var(--dur-snap) var(--ease-standard)}

/* IDLE: flat carrier — one lit dot, rest dim */
.sig--idle .sig-bars i:nth-child(3){height:5px;background:var(--ink)}
.sig--idle .sig-txt{color:var(--ink-muted)}

/* LIVE: GAL is acting — bars dance, amber, faint 1px glow */
.sig--live .sig-bars i{background:var(--signal);
   box-shadow:0 0 3px var(--glow);animation:carrier .9s var(--ease-standard) infinite}
.sig--live .sig-bars i:nth-child(2){animation-delay:.12s}
.sig--live .sig-bars i:nth-child(3){animation-delay:.24s}
.sig--live .sig-bars i:nth-child(4){animation-delay:.36s}
.sig--live .sig-bars i:nth-child(5){animation-delay:.48s}
.sig--live .sig-txt{color:var(--signal-ink)}
@keyframes carrier{0%,100%{height:2px}50%{height:12px}}

/* OFF: no carrier — all dim, text muted */
.sig--off .sig-bars i{background:var(--rule)}
.sig--off .sig-txt{color:var(--ink-muted)}

@media (prefers-reduced-motion: reduce){
  .sig--live .sig-bars i{animation:none;height:9px} /* freeze lit, no dance */
}
```
Wire `state="live"` to WebMCP tool-call start/finish (the page already knows when a tool is executing), `state="off"` to the agent-unavailable condition, `state="idle"` otherwise. No API required — driven entirely by the local tool-execution lifecycle.

---

### G. MICROCOPY (31 exact strings, mission-control voice)

1. Onboarding / first load: **"Welcome to the station, Director. GAL's on the loop."**
2. Clearance 00: **"CLEARANCE 00 · PRELAUNCH"**
3. Clearance 01: **"CLEARANCE 01 · SYSTEMS CHECK"**
4. Clearance 02: **"CLEARANCE 02 · POWERED FLIGHT"**
5. Clearance 03: **"CLEARANCE 03 · ORBIT"**
6. Clearance 04: **"CLEARANCE 04 · DEEP SPACE"**
7. Systems counter: **"04 SYSTEMS ONLINE"** … **"24 SYSTEMS ONLINE"**
8. Empty canvas title: **"VIEWPORT DARK"**
9. Empty canvas sub: **"AWAITING FIRST INSTRUMENT — log one, or ask GAL to."**
10. Empty log: **"COMMS LOOP OPEN · NO TRAFFIC YET"**
11. GAL working chip: **"GAL TRANSMITTING…"**
12. Human log prefix: **"DIR ▸"**
13. Agent log prefix: **"GAL ▸"**
14. Export button: **"CLEAR FOR LAUNCH"**
15. Export confirm: **"LAUNCH"**
16. Export success stamp: **"CLEARED FOR LAUNCH"**
17. New token: **"LOG INSTRUMENT"**
18. Undo: **"ROLL BACK"**
19. Save confirmation: **"LOGGED TO FLIGHT RECORDER"**
20. Locked-tool tooltip: **"SEALED — CLEARANCE 02 REQUIRED"**
21. Tool-unlock toast: **"SYSTEM ONLINE — color.scale is live."**
22. Phase-unlock stamp: **"CLEARANCE 02 GRANTED"**
23. Token applied by GAL: **"COPY. Tokens on the board."**
24. Generic error: **"TELEMETRY FAULT — didn't copy that. Re-transmit."**
25. Loading: **"ACQUIRING SIGNAL…"**
26. Agent-unavailable banner: **"GAL OFF-LINE · NO CARRIER. You have the console, Director."**
27. Canvas caption tooltip: **"THE VIEWPORT — your system, your colors. We just hold the frame."**
28. Inspector header: **"INSTRUMENT SPEC"**
29. Status bar left: **"STATION alt.gal · GROUND CONTROL"**
30. Status bar right (nominal / down): **"GAL: ON CONSOLE"** / **"GAL: NO CARRIER"**
31. Destructive confirm: **"CONFIRM ABORT — this can't be un-flown."**

Voice rules: clipped, present-tense, competent, warm-not-cutesy. UPPERCASE for system labels; sentence case for GAL's spoken lines. Never exclamation-spam — celebration is *reserved* for clearance grants and launch, following Duolingo's discipline ("Celebrations without payoffs are decoration").

---

### H. MOTION BUDGET

**Every animation:**
- **Button/keycap press:** `transform: scale(0.97)` on `:active`, `--dur-micro`, `--ease-standard` (Emil's press value). Trigger: pointer/keyboard activation.
- **Hover on interactive rows:** `background` + 1px border shift, `--dur-micro`, `--ease-standard`.
- **Toast:** `transform 400ms, opacity 400ms, height 400ms, box-shadow 200ms`, enter `translateY(100%)→0` + fade (Sonner values). Trigger: system event.
- **Launch checklist sheet:** slide+fade, `--dur-sheet`, `--ease-sheet` (Vaul). Trigger: export.
- **Dialog/inspector open:** fade + scale from `0.8→1` (Rauno: "Don't animate dialog scale in from 0 → 1, fade opacity and scale from ~0.8"), `--dur-snap`, `--ease-strong`.
- **Comms-loop new entry:** fade + `translateY(6px)→0`, `--dur-snap`, `--ease-out`. GAL left-rule pulse while transmitting: opacity `1↔0.4`, `--dur-ui`, `--ease-standard`, looped.
- **Carrier meter (Section F):** `carrier` keyframe `.9s` looped, live state only.
- **Clearance-ladder advance:** active node fills, `--dur-ui`, `--ease-standard`.

**What NEVER moves:** the console chrome (header, rack, status bar) never animates position; the viewport mat never animates; theme/context switches never transition (Rauno); frequent low-novelty actions — row hover in dense lists, adding a log line — get the *smallest* motion or none (Rauno: "Actions that are frequent and low in novelty should avoid extraneous animations"). No parallax, no decorative loops except the carrier meter, which pauses off-screen (Rauno) and freezes under `prefers-reduced-motion`.

**The three demo "wow" moments (staged in-brand):**
1. **Phase unlock = CLEARANCE GRANTED stamp.** A rubber stamp scales in from `1.15`, settles `-4deg→0`, with a 1-frame `2px` blur (Emil's blur-to-mask tip: "add a bit of `filter: blur()` to mask those imperfections"), lands in `--go` ink; the newly-cleared tool keycaps illuminate one-by-one on a 60ms stagger while the VT323 systems counter rolls up (e.g. `08→12`). Total < 900ms. This is the reward moment — reserved, earned, payoff-backed (a real new capability), Duolingo-style.
2. **Live token cascade.** When GAL applies a token set, the carrier goes LIVE (amber, dancing), the affected rack swatches update with a brief `--signal` left-rule sweep top-to-bottom (40ms stagger), and the VT323 values tick like a telemetry readout. Should feel like data arriving over the loop, not a color picker.
3. **Wireframe → render.** A single horizontal scan line sweeps the viewport once (`--dur-ui`×2, `--ease-standard`), revealing the rendered design over the wireframe via a `clip-path` wipe. One pass only; reduced-motion fallback is a cross-fade. Reads as "acquiring signal / locking picture."

---

### I. IMPLEMENTATION ORDER FOR TONIGHT

**P0 — must ship (~2h).** (1) Drop the `:root` token block; load Space Grotesk + IBM Plex Mono + VT323 from Google Fonts. (2) Repaint the three panels + header + status bar to the paper/ink palette with ruled borders (no shadows) — pure CSS swap, no DOM changes. (3) Rewrite all strings from Section G. (4) Rebuild the comms-loop entry component with DIR/GAL callsign + amber left-rule distinction. (5) Inline the SVG logo + wordmark. This alone is the rebrand — it changes how it *feels* with near-zero risk to functionality (color, type, copy, and one component template).

**P1 — the personality (~1.5h).** (1) Clearance ladder replacing the phase bar + VT323 systems counter. (2) SignalMeter component wired to the tool-call lifecycle. (3) Press/hover/toast/sheet motion tokens applied. (4) The CLEARANCE GRANTED stamp on phase unlock (wow-moment #1).

**P2 — cut line (ship if time remains).** Live token cascade (#2) and wireframe→render scan (#3); LAUNCH checklist stamp; corner registration ticks on the viewport; `SEALED` stamps in the inspector.

**Functionality-risk flags.** The rebrand is overwhelmingly CSS + copy + one log-component refactor, so core mechanics stay untouched. Watch three things: **(a)** the log refactor must preserve entry ordering/keys and the WebMCP action-record contract — restyle, don't re-model. **(b)** The carrier meter's `state="live"` must be driven by the *existing* tool-execution lifecycle, not a new timer, so it can't desync from reality. **(c)** Light chrome changes contrast math for any user-canvas overlays/handles — verify selection handles and focus rings stay visible against both the cream mat and arbitrary user colors (use `--ink` outlines, not color fills, for handles).

## Recommendations
1. **Tonight:** ship P0 in full — it is the rebrand and it is nearly risk-free. Then take P1 as far as the SignalMeter + CLEARANCE GRANTED stamp; that single stamp is your demo money-shot.
2. **Demo staging:** open at Clearance 00 with 4 systems, do one human action (DIR entry), ask GAL to do one (GAL entry with live carrier), then trigger a clearance grant live — the stamp + keycap illumination + counter roll is the ~8-second clip that sells the whole identity to the judges.
3. **Swap threshold:** if during the build the light-paper mat washes out user canvases in testing, that is the single signal to veto to the runner-up "Modifier Key" (graphite chrome) — same fonts/motion, only surface + logo change, ~45 min.
4. **Post-hackathon:** add a genuine dark "night-shift console" theme (ink paper, amber kept as the shared accent) as a toggle for the designer/developer audience; and give GAL a small rotating library of clipped, warm loop phrases so the log never repeats verbatim (Duolingo narrative-designer discipline).

## Caveats
- WebMCP is preview infrastructure (Chrome origin trial in Chrome 149; the draft spec was refreshed in 2026 and the standard is explicitly "not fully settled platform surface"). The identity assumes only that the page knows when a tool is executing — which it does locally — so nothing here depends on the standard settling, and nothing requires an AI API.
- Contrast ratios are computed against `--paper` and are approximate to ±0.3; re-verify `--ink-muted`, `--signal`, `--signal-ink`, and `--go` in a contrast checker before final commit (targets: ≥4.5:1 body, ≥3:1 large/UI). `--signal` as a text color should be used at ≥18px or bold; use `--signal-ink` for small text.
- The `--ease-out`/`--ease-standard` curves are Material's published curves; Emil Kowalski deliberately does **not** publish a single ease-out tuple (he advocates the principle plus stronger custom curves such as `cubic-bezier(0.23, 1, 0.32, 1)`, included here as `--ease-strong`), so we attribute Material's numbers to Material and Emil's number to Emil.
- The NASA Graphics Standards Manual is cited for register/tone only; it dates to 1975 (Danne & Blackburn), and none of its assets are used — the shipped identity is entirely original inline SVG + CSS.
- Departure Mono and Berkeley Mono informed the *type culture* research but are not Google Fonts; the shipped stack is Space Grotesk / IBM Plex Mono / VT323 to honor the no-external-assets constraint. (VT323 is used ONLY for jumbo telemetry numerals — it is a pixel face and is illegible for body text.)
