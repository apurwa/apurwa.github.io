# Agent Demo ("An agent is browsing this site right now") — Design

**Date:** 2026-06-10
**Status:** Approved pending user review
**Target:** apurwa.github.io (static GitHub Pages, vanilla HTML/CSS/JS, no dependencies)

## Overview

A hero-centerpiece feature where a simulated browser agent visibly operates the
portfolio itself. Visitors pick a mission; a distinct "agent cursor" scrolls the
page, highlights evidence, and streams a reasoning trace into a right-sidebar
panel, ending in a verdict card. The feature is deterministic replay — no live
AI, no API keys, no backend — built so a live LLM-driven mode can be added later
without changing the engine.

**Why:** Apurwa productizes browser agents (AI Studio at Redblock.ai). The site
demonstrating a browser agent operating the site itself is direct, self-referential
proof of craft for hiring managers and founders.

## Goals

- Every visitor can watch a complete agent run with one click, on any modern browser.
- The run reads like a real agent platform: mission → tool calls → extracted
  evidence → verdict.
- The visitor always stays in control: any scroll/click/Esc pauses the agent.
- Zero runtime cost, zero external requests, works offline once loaded.

## Non-goals (v1)

- No live LLM calls (bring-your-own-key live mode is phase 2).
- No free-text mission input (presets only).
- No analytics/tracking of runs.
- No changes to existing site content or sections.

## Visitor experience

### Idle state
A slim "agent bar" sits in the landing under the intro paragraphs:

> **I build browser agents for a living. Watch one evaluate me.**
> [ Founding PM fit? ] [ Does he get AI agents? ] [ Business impact in 30s ]

The bar has a subtle pulse on the dot indicator. Nothing auto-plays on page load.

### Running state
On mission click:

1. Trace sidebar slides in from the right (~300px, dark `#1f211b` panel,
   monospace, matching the site's Geist Mono). Page content shifts left on wide
   screens; on narrow screens the sidebar becomes a bottom sheet (~40vh).
2. Agent cursor appears: a red (`#9d0006`) triangle pointer with a small
   "agent" label tag. It is visually distinct from the visitor's custom cursor
   and exists independently of it (visitor's cursor keeps working — on touch
   devices there is no visitor cursor and only the simplified run plays).
3. The engine executes the mission script step by step (~25–30s total):
   - cursor glides to a target element (CSS transform animation, ease curves)
   - page scrolls smoothly to bring targets into view
   - evidence elements get a temporary highlight (accent outline + warm tint)
   - each step appends a trace line with a typing effect, e.g.:
     - `→ scroll_to(#experience)`
     - `→ extract("0→1 record")`
     - `✓ found: "$1M contracted revenue, year one"`
4. Trace lines accumulate; the sidebar autoscrolls. Past steps remain visible.

### Verdict state
The run ends with a verdict card rendered at the bottom of the trace:

- one-line verdict (e.g. `✓ Strong signal: interview him`)
- bullet list of extracted evidence, each linking to its section anchor
- CTA button: "Reach out" → `mailto:apurvsingh28@gmail.com`
- "Run another mission" returns to the mission list inside the sidebar

The sidebar stays open until dismissed (× button or Esc).

### Interruption
Any of: wheel/touchmove scroll, pointerdown on the page, or Esc — pauses the run
immediately. The trace prints `⚠ user took control — pausing`. The sidebar shows
[ Resume ] [ Stop ]. Resume continues from the current step; Stop dismisses the
cursor and offers the mission list again. This mirrors human-in-the-loop design
in real agent products and is a deliberate craft signal.

## Missions (v1 content)

Three preset missions, each a scripted pass over existing page content:

1. **"Should I interview Apurwa for a founding PM role?"**
   Visits: landing intro → Experience (Redblock 0→1, $1M contracted, 12-person
   org) → Fraud Score ($4M ARR) → verdict: strong founding-PM signal.
2. **"Does he actually understand AI agents?"**
   Visits: AI Studio card → redflow bullet (patent-filed DSL) → eval harness
   bullet → Skills (AI/Agents column) → "Thinking about" section → verdict.
3. **"Show me his business impact in 30 seconds"**
   Fast sweep of metrics: $1M contracted, $4M ARR, $12M losses prevented,
   170K+ fraud accounts, 50M+ monthly transactions, 60% of revenue → verdict.

Mission copy is written during implementation; tone is dry and factual with one
or two winks (the interruption line, the verdict phrasing). No invented metrics —
every extract quotes text that exists on the page.

## Architecture

Three new files; minimal additions to `index.html`. No build step, no deps.

```
agent.js      — replay engine (cursor, scroll, highlight, trace, state machine)
missions.js   — mission scripts as data (window.AGENT_MISSIONS)
agent.css     — agent cursor, trace sidebar, highlights, verdict card, agent bar
```

`index.html` gains only a stylesheet link and two script tags. The agent bar,
trace sidebar, and cursor elements are all injected by `agent.js` at load time,
so visitors without JS see today's site byte-for-byte unchanged.

### Mission script format

A mission is data, not code. Adding/editing missions touches only `missions.js`.

```js
{
  id: "founding-pm",
  label: "Founding PM fit?",
  mission: "Should I interview Apurwa for a founding PM role?",
  steps: [
    { action: "say",     text: "Checking his 0→1 record first." },
    { action: "goto",    target: "#experience",
      trace: "scroll_to(#experience)" },
    { action: "extract", target: "#experience .timeline-item:first-child li:nth-child(3)",
      trace: 'extract("0→1 record")',
      found: "$1M contracted revenue in year one" },
    // ...
  ],
  verdict: {
    line: "Strong signal: interview him.",
    evidence: [ { text: "$1M contracted, year one", anchor: "#experience" }, ... ]
  }
}
```

Engine-supported actions (v1): `say` (trace narration only), `goto` (scroll +
cursor move to element), `extract` (cursor to element + highlight + found line),
`pause` (beat for pacing). The engine validates targets at runtime and skips
steps whose selector no longer matches, logging `⚠ element not found — skipping`
to the trace (graceful degradation if page content changes later).

### Replay engine (agent.js)

A small state machine: `idle → running → paused → done`, one active mission at
a time. Implementation notes:

- Cursor movement via `requestAnimationFrame` lerp to target coordinates
  (reuses the pattern already in `script.js` for the custom cursor).
- Scrolling via `scrollIntoView({behavior:"smooth", block:"center"})`; the
  engine listens for scroll-end before moving the cursor onto the target.
- Distinguishing agent-initiated scroll from user scroll: the engine sets an
  `agentScrolling` flag around its own scrolls; `wheel`/`touchmove`/`keydown`
  (arrows, space, PgUp/PgDn) events are unambiguously user input and trigger pause.
  `pointerdown` outside the sidebar also pauses.
- Highlights: a `.agent-highlight` class (accent outline, warm background tint,
  ~2.5s) applied to extract targets; removed on the next step.
- Trace typing effect: characters appended on a short interval; instant when
  `prefers-reduced-motion`.
- All timings live in one config object at the top of `agent.js`.

## Responsive and accessibility

- **Mobile / touch (≤720px):** no agent cursor (pointer affordance is
  meaningless on touch). The run still works: sections scroll into view,
  highlights apply, trace renders in a bottom sheet. Mission bar buttons are
  full-width.
- **`prefers-reduced-motion`:** no cursor animation, no smooth scroll, no typing
  effect. Steps execute with instant transitions on a fixed cadence so the trace
  remains readable. (Same media query the site already respects.)
- **Screen readers:** trace container is `aria-live="polite"`; mission buttons
  are real `<button>`s; the sidebar is `role="complementary"` with a labelled
  close button. The agent cursor is `aria-hidden`.
- **Keyboard:** Esc pauses/dismisses. Tab order unaffected when sidebar closed.

## Edge cases

- **Visitor clicks a second mission mid-run:** current run stops cleanly, new
  one starts.
- **Window resized mid-run:** target coordinates recomputed per step (cursor
  positions are always derived from `getBoundingClientRect` at step time).
- **Selector rot:** engine skips missing targets with a visible trace warning
  (see mission format) rather than breaking the run.
- **JS disabled:** agent bar is rendered by JS, so the site is byte-identical
  to today — no broken UI.
- **Very short viewports:** sidebar max-height capped; trace scrolls internally.

## Phase 2 (out of scope, designed-for)

Bring-your-own-key live mode: a "live" toggle where a visitor pastes an
Anthropic API key (kept in memory only, never stored) and types a free-text
mission. Claude plans steps client-side against the same engine primitives
(`goto`/`extract`/`say`/verdict) via tool definitions, so the replay engine
needs no changes — the planner just emits the same step objects the scripts
contain. This is why missions are data.

## Testing

Manual verification matrix (no test framework on this repo):

- Chrome/Safari/Firefox desktop: all 3 missions run to verdict; interruption
  via scroll, click, and Esc; resume and stop both work.
- iPhone Safari + Android Chrome (responsive mode minimum): bottom-sheet run.
- `prefers-reduced-motion` emulated: run completes, readable, no animation.
- Lighthouse: no regression in performance/accessibility scores vs. current site.
- `python3 -m http.server` local run before push (existing workflow).

## Success criteria

- A first-time visitor understands within 5 seconds of clicking a mission that
  an agent is operating the page (cursor + trace + highlights all reinforce it).
- A complete run takes 25–30s and ends with a verdict card whose every evidence
  line quotes real page content.
- The visitor can always take control instantly, and the site without JS or on
  any device never looks broken.
