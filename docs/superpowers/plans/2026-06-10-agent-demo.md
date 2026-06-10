# Agent Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hero-centerpiece feature where a simulated browser agent visibly operates apurwa.github.io — picking a mission, scrolling, highlighting evidence, streaming a reasoning trace into a sidebar, and ending in a verdict card.

**Architecture:** Three new files (`agent.css`, `missions.js`, `agent.js`) loaded by `index.html`. All UI (mission bar, trace sidebar, agent cursor) is injected by `agent.js` at load time, so the no-JS site is unchanged. Missions are pure data; `agent.js` is a small replay engine (state machine: idle → running → paused → done) that interprets mission steps.

**Tech Stack:** Vanilla HTML/CSS/JS. No dependencies, no build step, no test framework (verification is manual via local server — this repo's established workflow per the spec).

**Spec:** `docs/superpowers/specs/2026-06-10-agent-demo-design.md`

**Dev server:** `python3 -m http.server 8765` from the repo root, then open `http://localhost:8765`. Hard-reload (Cmd+Shift+R) after every change — the page is aggressively cached.

**Site conventions:** colors come from CSS variables in `styles.css` (`--bg: #f7efcf`, `--fg: #1f211b`, `--accent: #9d0006`, `--signal: #35b986`, `--card-border: #d7c783`). The body font is Geist Mono; `font: inherit` picks it up.

---

### Task 1: Stylesheet (`agent.css`)

All agent styles in one new file, linked from `index.html`. Nothing uses these classes yet, so the page must look identical after this task.

**Files:**
- Create: `agent.css`
- Modify: `index.html` (one line, after the `styles.css` link)

- [ ] **Step 1: Create `agent.css` with the complete stylesheet**

```css
/* Agent demo — see docs/superpowers/specs/2026-06-10-agent-demo-design.md */

/* ---- Mission bar (landing) ---- */
.agent-bar {
  margin: 28px 0 8px;
  padding: 16px 18px;
  border: 1px solid var(--card-border);
  border-radius: 10px;
}
.agent-bar-title {
  margin: 0 0 12px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--fg);
}
.agent-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 50%;
  background: var(--signal);
  animation: agent-pulse 2.2s ease-in-out infinite;
}
@keyframes agent-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.8); }
}
.agent-bar-missions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.agent-mission-btn {
  font: inherit;
  font-size: 0.82rem;
  padding: 7px 12px;
  border: 1px solid var(--card-border);
  border-radius: 999px;
  background: transparent;
  color: var(--fg);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.agent-mission-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ---- Trace sidebar ---- */
#agent-trace {
  position: fixed;
  top: 0;
  right: 0;
  width: min(320px, 90vw);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--fg);
  color: var(--bg);
  font-size: 0.78rem;
  line-height: 1.55;
  transform: translateX(100%);
  transition: transform 0.35s ease;
  z-index: 60;
}
#agent-trace.is-open {
  transform: translateX(0);
}
.agent-trace-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(247, 239, 207, 0.18);
}
.agent-trace-title {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  color: var(--signal);
}
.agent-trace-close {
  font: inherit;
  font-size: 1.1rem;
  line-height: 1;
  background: none;
  border: none;
  color: var(--bg);
  cursor: pointer;
  opacity: 0.7;
}
.agent-trace-close:hover {
  opacity: 1;
}
.agent-trace-log {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
}
.agent-line {
  margin: 0 0 7px;
  word-break: break-word;
}
.agent-line.mission { color: var(--signal); }
.agent-line.say { font-style: italic; opacity: 0.9; }
.agent-line.tool { opacity: 0.75; }
.agent-line.found { color: var(--card-border); }
.agent-line.warn { color: #e8a14a; }
.agent-line.muted { opacity: 0.55; }

/* ---- Pause controls ---- */
.agent-trace-controls {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(247, 239, 207, 0.18);
}
.agent-trace-controls button {
  font: inherit;
  font-size: 0.78rem;
  flex: 1;
  padding: 8px 0;
  border-radius: 6px;
  cursor: pointer;
}
.agent-resume {
  border: none;
  background: var(--signal);
  color: var(--fg);
}
.agent-stop {
  border: 1px solid rgba(247, 239, 207, 0.4);
  background: none;
  color: var(--bg);
}

/* ---- Page shift while trace is open (wide screens only) ---- */
@media (min-width: 1100px) {
  main {
    transition: padding-right 0.35s ease;
  }
  body.agent-trace-open main {
    padding-right: 340px;
  }
}

/* ---- Agent pointer ---- */
.agent-pointer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 70;
  display: none;
  pointer-events: none;
  transform: translate(50vw, 50vh);
  transition: transform 0.9s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.agent-pointer.is-active {
  display: block;
}
.agent-pointer-arrow {
  display: block;
  color: var(--accent);
  font-size: 18px;
  transform: rotate(-15deg);
}
.agent-pointer-tag {
  display: inline-block;
  margin-top: 2px;
  padding: 2px 7px;
  background: var(--accent);
  color: var(--bg);
  border-radius: 999px;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* ---- Evidence highlight ---- */
.agent-highlight {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

/* ---- Verdict card (inside trace log) ---- */
.agent-verdict {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid rgba(247, 239, 207, 0.25);
  border-radius: 8px;
}
.agent-verdict-line {
  margin: 0 0 10px;
  font-weight: 600;
  color: var(--signal);
}
.agent-verdict-evidence {
  margin: 0 0 12px;
  padding-left: 16px;
}
.agent-verdict-evidence li {
  margin-bottom: 5px;
}
.agent-verdict-evidence a {
  color: var(--bg);
  text-decoration-color: rgba(247, 239, 207, 0.4);
}
.agent-verdict-actions {
  display: flex;
  gap: 8px;
}
.agent-cta {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 6px;
  background: var(--accent);
  color: var(--bg);
  text-decoration: none;
  font-weight: 600;
}
.agent-again {
  flex: 1;
  font: inherit;
  font-size: 0.78rem;
  border: 1px solid rgba(247, 239, 207, 0.4);
  background: none;
  color: var(--bg);
  border-radius: 6px;
  cursor: pointer;
}
.agent-trace-missions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
#agent-trace .agent-mission-btn {
  border-color: rgba(247, 239, 207, 0.4);
  color: var(--bg);
}
#agent-trace .agent-mission-btn:hover {
  border-color: var(--signal);
  color: var(--signal);
}

/* ---- Mobile: trace becomes a bottom sheet, no pointer ---- */
@media (max-width: 720px) {
  #agent-trace {
    top: auto;
    bottom: 0;
    width: 100%;
    height: 42vh;
    transform: translateY(100%);
    border-radius: 12px 12px 0 0;
  }
  #agent-trace.is-open {
    transform: translateY(0);
  }
  .agent-pointer {
    display: none !important;
  }
}

/* ---- Reduced motion ---- */
@media (prefers-reduced-motion: reduce) {
  .agent-pulse { animation: none; }
  .agent-pointer { transition: none; }
  #agent-trace { transition: none; }
  main { transition: none; }
}
```

- [ ] **Step 2: Link it in `index.html`**

Find:
```html
  <link rel="stylesheet" href="styles.css?v=20260529-5" />
```
Add directly below:
```html
  <link rel="stylesheet" href="agent.css?v=1" />
```

- [ ] **Step 3: Verify no visual change**

Hard-reload `http://localhost:8765`. The page must look identical to before (no class in `agent.css` is used yet). Check DevTools Network tab: `agent.css` loads with status 200.

- [ ] **Step 4: Commit**

```bash
git add agent.css index.html
git commit -m "Add agent demo stylesheet"
```

---

### Task 2: Mission data (`missions.js`)

Missions are pure data on `window.AGENT_MISSIONS`. Every `target` is a real selector in today's `index.html`, and every `found` string paraphrases text that exists on the page — never invent metrics.

**Files:**
- Create: `missions.js`
- Modify: `index.html` (one line, before the `script.js` tag)

- [ ] **Step 1: Create `missions.js` with the complete data**

```js
// Mission scripts for the agent demo. Pure data — the engine lives in agent.js.
// Actions: say (narration), goto (scroll + cursor), extract (highlight + found line), pause.
window.AGENT_MISSIONS = [
  {
    id: "founding-pm",
    label: "Founding PM fit?",
    mission: "Should I interview Apurwa for a founding PM role?",
    steps: [
      { action: "say", text: "Checking his 0→1 record first." },
      { action: "goto", target: "#experience", trace: "scroll_to(#experience)" },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(1) .job-bullets li:nth-child(2)",
        trace: 'extract("0→1 record")',
        found: "took AI Studio 0→1 — production browser agents in 4 banks and enterprises",
      },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(1) .job-bullets li:nth-child(3)",
        trace: 'extract("revenue")',
        found: "$1M contracted revenue in year one",
      },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(1) .job-bullets li:nth-child(1)",
        trace: 'extract("team scope")',
        found: "leads a 12-person product and engineering org",
      },
      { action: "say", text: "One success could be luck. Checking for repeats." },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(2) .job-bullets li:nth-child(1)",
        trace: 'extract("previous 0→1")',
        found: "India's first pre-onboarding AI fraud score — $4M ARR in 24 months",
      },
    ],
    verdict: {
      line: "Strong signal. Interview him.",
      evidence: [
        { text: "AI Studio: 0→1, $1M contracted in year one", anchor: "#experience" },
        { text: "Fraud Score: $4M ARR in 24 months, top 6 banks", anchor: "#experience" },
        { text: "Leads a 12-person product & engineering org", anchor: "#experience" },
      ],
    },
  },
  {
    id: "ai-agents",
    label: "Does he get AI agents?",
    mission: "Does Apurwa actually understand AI agents?",
    steps: [
      { action: "say", text: "Looking for shipped agent work, not buzzwords." },
      { action: "goto", target: "#selected-work", trace: "scroll_to(#selected-work)" },
      {
        action: "extract",
        target: ".work-grid .work-card:nth-child(1)",
        trace: 'extract("agent product")',
        found: "production browser agents for enterprise IT and security",
      },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(1) .job-bullets li:nth-child(5)",
        trace: 'extract("agent tooling")',
        found: "created redflow, a patent-filed DSL — new AI Skills live in under 60 minutes",
      },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(1) .job-bullets li:nth-child(6)",
        trace: 'extract("evals")',
        found: "eval harnesses for workflow accuracy, safe tool use, and regression testing",
      },
      {
        action: "extract",
        target: ".skills .skill-col:nth-child(1)",
        trace: 'extract("agent skills")',
        found: "orchestration, eval harnesses, reliability, observability",
      },
      {
        action: "extract",
        target: ".thinking-grid p:nth-child(2)",
        trace: 'extract("current thinking")',
        found: "thinking about how AI products should be evaluated after launch",
      },
    ],
    verdict: {
      line: "He ships agents to production — and evals them.",
      evidence: [
        { text: "Browser agents live in 4 banks and enterprises", anchor: "#selected-work" },
        { text: "redflow: patent-filed agent DSL", anchor: "#experience" },
        { text: "Eval harnesses before rollout", anchor: "#experience" },
      ],
    },
  },
  {
    id: "impact",
    label: "Business impact in 30s",
    mission: "Show me Apurwa's business impact, fast.",
    steps: [
      { action: "say", text: "Sweeping for hard numbers only." },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(1) .job-bullets li:nth-child(3)",
        trace: 'extract("Redblock revenue")',
        found: "$1M contracted revenue, year one",
      },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(2) .job-bullets li:nth-child(1)",
        trace: 'extract("Fraud Score revenue")',
        found: "$4M ARR in 24 months",
      },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(2) .job-bullets li:nth-child(2)",
        trace: 'extract("fraud prevented")',
        found: "170K+ fraud accounts caught, $12M losses prevented",
      },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(3) .job-bullets li:nth-child(1)",
        trace: 'extract("platform scale")',
        found: "50M+ monthly transactions across 35+ clients",
      },
      {
        action: "extract",
        target: "#experience .timeline-item:nth-child(3) .job-bullets li:nth-child(2)",
        trace: 'extract("revenue share")',
        found: "tools that drove 60% of revenue",
      },
    ],
    verdict: {
      line: "Quantified impact at every role.",
      evidence: [
        { text: "$1M contracted (AI Studio, yr 1)", anchor: "#experience" },
        { text: "$4M ARR (Fraud Score, 24 mo)", anchor: "#experience" },
        { text: "$12M fraud losses prevented", anchor: "#experience" },
        { text: "50M+ tx/month platform", anchor: "#experience" },
      ],
    },
  },
];
```

- [ ] **Step 2: Load it in `index.html`**

Find:
```html
  <script src="script.js?v=20260529-5"></script>
```
Add directly **above** it (order matters — the agent bar must exist before `script.js` binds its cursor-hover listeners, which Task 3 relies on):
```html
  <script src="missions.js?v=1"></script>
```

- [ ] **Step 3: Verify every selector resolves**

Hard-reload `http://localhost:8765`, then run in the DevTools console:
```js
window.AGENT_MISSIONS.flatMap(m => m.steps)
  .filter(s => s.target && !document.querySelector(s.target))
  .map(s => s.target)
```
Expected: `[]` (empty array). If any selector prints, fix it in `missions.js` against the actual `index.html` structure before continuing.

- [ ] **Step 4: Commit**

```bash
git add missions.js index.html
git commit -m "Add agent demo mission scripts"
```

---

### Task 3: Engine skeleton — UI injection and trace open/close (`agent.js`)

A complete, runnable `agent.js` that injects all UI and can open/close the trace with a typed mission header. Run/pause/verdict are stubs that later tasks replace — each stub is marked `// REPLACED IN TASK N`.

**Files:**
- Create: `agent.js`
- Modify: `index.html` (one line)

- [ ] **Step 1: Create `agent.js`**

```js
(function () {
  "use strict";

  // All timings in one place.
  var CONFIG = {
    typingMs: 14,        // per character in the trace
    stepGapMs: 650,      // beat between steps
    sayPauseMs: 900,     // extra beat after narration
    cursorMs: 900,       // pointer glide duration (must match agent.css transition)
    highlightMs: 2600,   // evidence highlight duration
    scrollSettleMs: 700, // wait after smooth scroll
  };

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var showCursor = window.matchMedia("(pointer: fine)").matches
    && !window.matchMedia("(max-width: 720px)").matches
    && !reducedMotion;

  var missions = window.AGENT_MISSIONS || [];
  var landingLeft = document.querySelector(".landing-left");
  var linksList = landingLeft ? landingLeft.querySelector(".links") : null;
  if (!missions.length || !landingLeft || !linksList) return;

  // state: idle | running | paused | done
  var state = "idle";
  var runToken = 0;
  var pauseWaiters = [];

  // ---- UI injection ----
  var bar = document.createElement("section");
  bar.className = "agent-bar";
  bar.setAttribute("aria-label", "Agent demo");
  bar.innerHTML =
    '<p class="agent-bar-title"><span class="agent-pulse" aria-hidden="true"></span>' +
    "I build browser agents for a living. Watch one evaluate me.</p>" +
    '<div class="agent-bar-missions"></div>';
  var missionWrap = bar.querySelector(".agent-bar-missions");
  missions.forEach(function (m) {
    missionWrap.appendChild(makeMissionButton(m));
  });
  landingLeft.insertBefore(bar, linksList);

  var trace = document.createElement("aside");
  trace.id = "agent-trace";
  trace.setAttribute("role", "complementary");
  trace.setAttribute("aria-label", "Agent reasoning trace");
  trace.innerHTML =
    '<div class="agent-trace-head">' +
    '<span class="agent-trace-title">agent trace</span>' +
    '<button type="button" class="agent-trace-close" aria-label="Close agent trace">×</button>' +
    "</div>" +
    '<div class="agent-trace-log" aria-live="polite"></div>' +
    '<div class="agent-trace-controls" hidden>' +
    '<button type="button" class="agent-resume">Resume</button>' +
    '<button type="button" class="agent-stop">Stop</button>' +
    "</div>";
  document.body.appendChild(trace);
  var log = trace.querySelector(".agent-trace-log");
  var controls = trace.querySelector(".agent-trace-controls");

  var pointer = document.createElement("div");
  pointer.className = "agent-pointer";
  pointer.setAttribute("aria-hidden", "true");
  pointer.innerHTML =
    '<span class="agent-pointer-arrow">▲</span>' +
    '<span class="agent-pointer-tag">agent</span>';
  document.body.appendChild(pointer);

  // ---- helpers ----
  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function makeMissionButton(mission) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "agent-mission-btn";
    btn.textContent = mission.label;
    btn.addEventListener("click", function () { startMission(mission); });
    return btn;
  }

  function setState(next) {
    state = next;
    document.body.classList.toggle(
      "agent-running",
      next === "running" || next === "paused"
    );
  }

  function openTrace() {
    trace.classList.add("is-open");
    document.body.classList.add("agent-trace-open");
  }

  function closeTrace() {
    stopRun(true);
    trace.classList.remove("is-open");
    document.body.classList.remove("agent-trace-open");
  }

  // Appends a trace line with a typing effect. Returns a promise that
  // resolves when the line is fully printed.
  function appendLine(text, cls, instant) {
    var line = document.createElement("p");
    line.className = "agent-line" + (cls ? " " + cls : "");
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    if (reducedMotion || instant) {
      line.textContent = text;
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      var i = 0;
      var tick = setInterval(function () {
        i += 1;
        line.textContent = text.slice(0, i);
        log.scrollTop = log.scrollHeight;
        if (i >= text.length) {
          clearInterval(tick);
          resolve();
        }
      }, CONFIG.typingMs);
    });
  }

  // ---- run lifecycle ----
  async function startMission(mission) {
    stopRun(true);
    var token = ++runToken;
    log.innerHTML = "";
    openTrace();
    setState("running");
    if (showCursor) pointer.classList.add("is-active");
    await appendLine("🎯 mission: " + mission.mission, "mission");
    await wait(500);
    var completed = await runSteps(mission, token);
    if (!completed || token !== runToken) return;
    renderVerdict(mission);
    setState("done");
    pointer.classList.remove("is-active");
  }

  // REPLACED IN TASK 4 — executes mission steps; returns true if all ran.
  async function runSteps(mission, token) {
    await appendLine("(engine not implemented yet)", "muted");
    return true;
  }

  // REPLACED IN TASK 5 — pause/resume.
  function pauseRun() {}
  function resumeRun() {}

  // Cancels any in-flight run. silent=true skips the trace message.
  function stopRun(silent) {
    runToken++;
    pauseWaiters.splice(0).forEach(function (resolve) { resolve(); });
    controls.hidden = true;
    pointer.classList.remove("is-active");
    if (!silent) {
      appendLine("■ run stopped", "muted", true);
      renderMissionList();
    }
    setState("idle");
  }

  // REPLACED IN TASK 6 — verdict card and in-trace mission list.
  function renderVerdict(mission) {}
  function renderMissionList() {}

  // ---- wiring ----
  trace.querySelector(".agent-trace-close").addEventListener("click", closeTrace);
  controls.querySelector(".agent-resume").addEventListener("click", resumeRun);
  controls.querySelector(".agent-stop").addEventListener("click", function () {
    stopRun(false);
  });

  // REPLACED IN TASK 5 — interruption listeners.
})();
```

- [ ] **Step 2: Load it in `index.html`**

Find:
```html
  <script src="missions.js?v=1"></script>
```
Add directly below (still above `script.js`):
```html
  <script src="agent.js?v=1"></script>
```

- [ ] **Step 3: Verify the skeleton**

Hard-reload `http://localhost:8765` and check:
1. The agent bar appears in the landing between the intro paragraphs and the Resume/LinkedIn links, with a pulsing green dot and 3 mission buttons.
2. Clicking a mission slides in the dark right sidebar; the mission line types out, followed by "(engine not implemented yet)"; on a window ≥1100px wide the page content shifts left.
3. The × button closes the sidebar and the content shifts back.
4. No console errors.

- [ ] **Step 4: Commit**

```bash
git add agent.js index.html
git commit -m "Add agent demo engine skeleton with injected UI"
```

---

### Task 4: Step executor — scroll, pointer, highlight

Replace the `runSteps` stub with the real engine. After this task all three missions run end-to-end (without pause support or a verdict card yet).

**Files:**
- Modify: `agent.js`

- [ ] **Step 1: Replace the `runSteps` stub**

Delete:
```js
  // REPLACED IN TASK 4 — executes mission steps; returns true if all ran.
  async function runSteps(mission, token) {
    await appendLine("(engine not implemented yet)", "muted");
    return true;
  }
```

Insert in its place:
```js
  // Resolves immediately unless paused; then resolves on resume/stop.
  function waitWhilePaused() {
    if (state !== "paused") return Promise.resolve();
    return new Promise(function (resolve) { pauseWaiters.push(resolve); });
  }

  function scrollToTarget(el) {
    el.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
    });
    return wait(reducedMotion ? 50 : CONFIG.scrollSettleMs);
  }

  // Glides the pointer to the left-center of the element. Coordinates are
  // computed at step time, so window resizes mid-run self-correct.
  function movePointerTo(el) {
    if (!showCursor) return Promise.resolve();
    var rect = el.getBoundingClientRect();
    var x = Math.min(rect.left + 24, window.innerWidth - 56);
    var y = Math.min(Math.max(rect.top + rect.height / 2, 16), window.innerHeight - 48);
    pointer.style.transform = "translate(" + x + "px, " + y + "px)";
    return wait(reducedMotion ? 0 : CONFIG.cursorMs);
  }

  function highlight(el) {
    el.classList.add("agent-highlight");
    setTimeout(function () { el.classList.remove("agent-highlight"); }, CONFIG.highlightMs);
  }

  async function runStep(step) {
    if (step.action === "say") {
      await appendLine(step.text, "say");
      await wait(CONFIG.sayPauseMs);
      return;
    }
    if (step.action === "pause") {
      await wait(step.ms || 800);
      return;
    }
    var el = step.target ? document.querySelector(step.target) : null;
    if (!el) {
      // Graceful degradation if page content changes later (selector rot).
      await appendLine("⚠ element not found — skipping", "warn");
      return;
    }
    if (step.action === "goto") {
      await appendLine("→ " + step.trace, "tool");
      await scrollToTarget(el);
      await movePointerTo(el);
      return;
    }
    if (step.action === "extract") {
      await appendLine("→ " + step.trace, "tool");
      await scrollToTarget(el);
      await movePointerTo(el);
      highlight(el);
      await wait(400);
      await appendLine('✓ found: "' + step.found + '"', "found");
      return;
    }
  }

  // Executes mission steps; returns true only if every step ran under this token.
  async function runSteps(mission, token) {
    for (var i = 0; i < mission.steps.length; i++) {
      if (token !== runToken) return false;
      await waitWhilePaused();
      if (token !== runToken) return false;
      await runStep(mission.steps[i]);
      if (token !== runToken) return false;
      await wait(CONFIG.stepGapMs);
    }
    return true;
  }
```

- [ ] **Step 2: Verify full runs**

Hard-reload and run each of the 3 missions top to bottom. Check:
1. The red ▲ "agent" pointer appears and glides between targets.
2. The page scrolls to each section; evidence elements get the red outline + tint for ~2.5s.
3. Trace shows `→ tool` lines followed by `✓ found: "..."` lines; no `⚠ element not found` warnings.
4. A full run takes roughly 25–35 seconds and ends quietly (verdict comes in Task 6).
5. Clicking a different mission mid-run abandons the old run cleanly and starts fresh.

If a run feels rushed or sluggish, tune `CONFIG` values — they're the only knobs.

- [ ] **Step 3: Commit**

```bash
git add agent.js
git commit -m "Implement agent step executor with scroll, pointer, and highlights"
```

---

### Task 5: Interruption — pause, resume, stop

The visitor always wins: any scroll intent, click on the page, or Esc pauses the run. This is a deliberate craft signal (human-in-the-loop), so the trace acknowledges it.

**Files:**
- Modify: `agent.js`

- [ ] **Step 1: Replace the pause/resume stubs**

Delete:
```js
  // REPLACED IN TASK 5 — pause/resume.
  function pauseRun() {}
  function resumeRun() {}
```

Insert in its place:
```js
  function pauseRun() {
    if (state !== "running") return;
    setState("paused");
    appendLine("⚠ user took control — pausing", "warn", true);
    controls.hidden = false;
  }

  function resumeRun() {
    if (state !== "paused") return;
    setState("running");
    controls.hidden = true;
    appendLine("▶ resuming", "muted", true);
    pauseWaiters.splice(0).forEach(function (resolve) { resolve(); });
  }
```

- [ ] **Step 2: Replace the interruption-listeners comment**

Delete:
```js
  // REPLACED IN TASK 5 — interruption listeners.
```

Insert in its place:
```js
  // ---- interruption: the visitor always wins ----
  // wheel/touchmove only fire from real user input (programmatic smooth
  // scroll does not), so no flag is needed to tell them apart.
  ["wheel", "touchmove"].forEach(function (evt) {
    window.addEventListener(evt, pauseRun, { passive: true });
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (state === "running") pauseRun();
      else if (state === "paused") stopRun(false);
      else if (trace.classList.contains("is-open")) closeTrace();
      return;
    }
    var navKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
    if (navKeys.indexOf(event.key) !== -1) pauseRun();
  });

  document.addEventListener("pointerdown", function (event) {
    if (state !== "running") return;
    if (trace.contains(event.target) || bar.contains(event.target)) return;
    pauseRun();
  });
```

- [ ] **Step 3: Verify interruption**

Hard-reload, start a mission, then check each path:
1. Scroll the wheel mid-run → trace prints `⚠ user took control — pausing`; Resume/Stop buttons appear; the pointer freezes.
2. Resume → `▶ resuming` prints and the run continues from the same step.
3. Pause again, press Stop → `■ run stopped` prints (the in-trace mission list appears after Task 6).
4. Esc while running pauses; Esc while paused stops; Esc when idle closes the sidebar.
5. Clicking page content (not the sidebar or agent bar) pauses; clicking inside the sidebar does not.
6. Press Space mid-run → pauses (nav keys count as taking control).

- [ ] **Step 4: Commit**

```bash
git add agent.js
git commit -m "Add agent run interruption with pause, resume, and stop"
```

---

### Task 6: Verdict card and in-trace mission list

**Files:**
- Modify: `agent.js`

- [ ] **Step 1: Replace the verdict stubs**

Delete:
```js
  // REPLACED IN TASK 6 — verdict card and in-trace mission list.
  function renderVerdict(mission) {}
  function renderMissionList() {}
```

Insert in its place:
```js
  function renderVerdict(mission) {
    var card = document.createElement("div");
    card.className = "agent-verdict";
    var evidence = mission.verdict.evidence
      .map(function (ev) {
        return '<li><a href="' + ev.anchor + '">' + ev.text + "</a></li>";
      })
      .join("");
    card.innerHTML =
      '<p class="agent-verdict-line">✓ ' + mission.verdict.line + "</p>" +
      '<ul class="agent-verdict-evidence">' + evidence + "</ul>" +
      '<div class="agent-verdict-actions">' +
      '<a class="agent-cta" href="mailto:apurvsingh28@gmail.com">Reach out</a>' +
      '<button type="button" class="agent-again">Run another mission</button>' +
      "</div>";
    card.querySelector(".agent-again").addEventListener("click", renderMissionList);
    log.appendChild(card);
    log.scrollTop = log.scrollHeight;
  }

  function renderMissionList() {
    var wrap = document.createElement("div");
    wrap.className = "agent-trace-missions";
    missions.forEach(function (m) {
      wrap.appendChild(makeMissionButton(m));
    });
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  }
```

- [ ] **Step 2: Verify the verdict flow**

Hard-reload and check:
1. Each mission ends with a verdict card: green verdict line, evidence bullets, "Reach out" + "Run another mission".
2. Every evidence link scrolls to its section when clicked.
3. "Reach out" opens a mail draft to apurvsingh28@gmail.com.
4. "Run another mission" lists the 3 missions inside the trace; clicking one starts a fresh run.
5. Pause → Stop now shows the mission list after `■ run stopped`.

- [ ] **Step 3: Commit**

```bash
git add agent.js
git commit -m "Add agent verdict card and in-trace mission relaunch"
```

---

### Task 7: Responsive, reduced-motion, and final verification

No new code planned — this task is the spec's manual test matrix. Fix anything that fails before committing.

**Files:**
- Possibly modify: `agent.css`, `agent.js` (only if a check below fails)

- [ ] **Step 1: Mobile / bottom sheet (DevTools responsive mode, iPhone-size)**

1. Mission bar buttons wrap and remain tappable.
2. Starting a mission opens the trace as a bottom sheet (~42vh) instead of a sidebar; no agent pointer appears.
3. Sections scroll into view and highlights still apply; run completes to verdict.
4. Touch-scrolling mid-run pauses it.

- [ ] **Step 2: Reduced motion (DevTools → Rendering → emulate `prefers-reduced-motion`)**

Reload with emulation on, then run a mission:
1. No typing effect (lines appear instantly), no smooth scroll, no pointer (it's gated off), no pulse animation.
2. The run still progresses step-by-step on the `stepGapMs` cadence and reaches the verdict.

- [ ] **Step 3: Cross-browser sanity**

Run one full mission in Safari and Firefox (Chrome already covered). Watch for: `100dvh` sidebar height, `color-mix` highlight tint, smooth scrolling. All are supported in 2024+ versions of all three — this is a regression check, not a compatibility build-out.

- [ ] **Step 4: No-JS check**

DevTools → Settings → Debugger → Disable JavaScript → reload. The site must look exactly like the pre-feature site: no agent bar, no sidebar, no stray elements.

- [ ] **Step 5: Accessibility spot-checks**

1. Tab order: with the sidebar closed, tabbing through the page never lands on hidden agent controls (the sidebar is off-screen via transform — confirm its buttons don't receive focus while closed; if they do, add `visibility: hidden` to the closed state in `agent.css` with `visibility: visible` on `.is-open`).
2. The trace log has `aria-live="polite"` (set in Task 3).
3. Mission buttons and trace controls are reachable and operable by keyboard when the sidebar is open.

- [ ] **Step 6: Lighthouse no-regression check**

DevTools → Lighthouse → run Performance + Accessibility against `http://localhost:8765`. Compare with a run against the live https://apurwa.github.io. Scores must not drop more than a point or two (the agent code is idle until clicked, so any larger drop means something is animating or loading eagerly — investigate before continuing).

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "Polish agent demo responsive and accessibility behavior"
```

(Skip if nothing changed.)

---

### Task 8: Ship

- [ ] **Step 1: Final review of the full diff**

```bash
git log --oneline main@{u}..HEAD 2>/dev/null || git log --oneline -8
git diff main@{u}..HEAD --stat 2>/dev/null || git show --stat HEAD
```
Confirm only intended files changed: `agent.css`, `agent.js`, `missions.js`, `index.html`, plan/spec docs.

- [ ] **Step 2: One last full pass**

Hard-reload `http://localhost:8765`, run all 3 missions to verdict, interrupt once, resume once.

- [ ] **Step 3: Push (only with explicit user approval)**

The repo deploys to GitHub Pages on push to `main`. **Ask the user before pushing.** Note that `index.html` also carries earlier uncommitted changes (intro rewrite, OG image, JSON-LD) — commit those separately first if still pending:

```bash
git status
# if the earlier content changes are still uncommitted:
git add index.html assets/og-image.png assets/generate_og_image.py
git commit -m "Sharpen intro, add OG card and structured data"
# then, with user approval:
git push origin main
```

- [ ] **Step 4: Post-deploy verification**

After GitHub Pages rebuilds (~1 min): hard-reload https://apurwa.github.io, run one mission end-to-end, and confirm `agent.css?v=1`, `missions.js?v=1`, `agent.js?v=1` all load with 200s.
