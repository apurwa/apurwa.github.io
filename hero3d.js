// ASCII hero: monospace particles assemble the name, dissolve into an agent
// workflow graph, and a pulse executes pipelines forever. Rendered through
// three.js AsciiEffect — red glyphs on the site's cream.
//
// Injected entirely from JS: no-JS visitors and unsupported devices see the
// site unchanged. Desktop-only by design (full-viewport ASCII is CPU-heavy).

import * as THREE from "three";
import { AsciiEffect } from "three/addons/effects/AsciiEffect.js";
import { buildGraph, makeAgentRun } from "./hero3d-graph.js";

const CONFIG = {
  assembleMs: 2400,     // scatter -> name
  assembleStaggerMs: 600,
  holdMs: 6000,         // name hold before auto-dissolve (scroll skips ahead)
  dissolveMs: 1800,     // name -> graph
  fps: 30,              // render cap
  fontPx: 10,           // ascii cell size
  resolution: 0.12,     // ascii sampling resolution
  charSet: " .:-+*=%@#",
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
if (!desktop) {
  // Mobile/touch: current site, unchanged.
} else {
  init();
}

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(1);
  } catch (err) {
    return; // no WebGL -> no hero band
  }

  // ---- band injection ----
  const band = document.createElement("section");
  band.className = "hero3d";
  band.setAttribute("aria-hidden", "true");
  const cue = document.createElement("p");
  cue.className = "hero3d-cue";
  cue.textContent = "scroll";
  band.appendChild(cue);
  const main = document.querySelector("main");
  const landing = document.querySelector(".landing");
  if (!main || !landing) return;
  main.insertBefore(band, landing);

  const W = () => band.clientWidth;
  const H = () => band.clientHeight;
  renderer.setSize(W(), H());

  const effect = new AsciiEffect(renderer, CONFIG.charSet, {
    invert: false,
    resolution: CONFIG.resolution,
  });
  effect.setSize(W(), H());
  effect.domElement.className = "hero3d-ascii";
  effect.domElement.style.fontSize = CONFIG.fontPx + "px";
  effect.domElement.style.lineHeight = CONFIG.fontPx + "px";
  band.insertBefore(effect.domElement, cue);

  // ---- scene ----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 100);
  camera.position.set(0, 0, 21);

  const group = new THREE.Group();
  scene.add(group);

  // ---- name targets: sample two stacked lines from a canvas ----
  const cv = document.createElement("canvas");
  cv.width = 560;
  cv.height = 260;
  const cx = cv.getContext("2d");
  cx.fillStyle = "#fff";
  cx.font = "bold 86px monospace";
  cx.textAlign = "center";
  cx.fillText("APURWA", 280, 95);
  cx.fillText("SARWAJIT", 280, 205);
  const img = cx.getImageData(0, 0, cv.width, cv.height).data;
  const textTargets = [];
  for (let y = 0; y < cv.height; y += 4) {
    for (let x = 0; x < cv.width; x += 4) {
      if (img[(y * cv.width + x) * 4] > 128) {
        textTargets.push(new THREE.Vector3(
          (x - cv.width / 2) * 0.034,
          -(y - cv.height / 2) * 0.034,
          (Math.random() - 0.5) * 0.3
        ));
      }
    }
  }
  const COUNT = textTargets.length;

  // ---- graph targets: particles cluster around graph nodes ----
  const graph = buildGraph();
  const N = graph.nodes.length;
  const graphTargets = [];
  for (let i = 0; i < COUNT; i++) {
    const n = graph.nodes[i % N];
    graphTargets.push(new THREE.Vector3(
      n.x + (Math.random() - 0.5) * 0.85,
      n.y + (Math.random() - 0.5) * 0.85,
      n.z + (Math.random() - 0.5) * 0.85
    ));
  }

  // ---- scatter start positions ----
  const scatter = [];
  for (let i = 0; i < COUNT; i++) {
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    const r = 13 + Math.random() * 6;
    scatter.push(new THREE.Vector3(
      r * Math.sin(p) * Math.cos(t),
      r * Math.sin(p) * Math.sin(t),
      r * Math.cos(p)
    ));
  }

  // ---- particles as instanced spheres (bright enough for ascii) ----
  const PARTICLE_R = 0.085;
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(PARTICLE_R, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    COUNT
  );
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);
  const dummy = new THREE.Object3D();
  const stagger = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) stagger[i] = Math.random();

  // ---- edges: thin cylinders, fade in during dissolve ----
  const edgeMats = [];
  const up = new THREE.Vector3(0, 1, 0);
  graph.edges.forEach(([a, b]) => {
    const va = graph.nodes[a];
    const vb = graph.nodes[b];
    const dir = new THREE.Vector3().subVectors(vb, va);
    const len = dir.length();
    const mat = new THREE.MeshBasicMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0,
    });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 5), mat);
    cyl.position.copy(va).addScaledVector(dir, 0.5);
    cyl.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    group.add(cyl);
    edgeMats.push(mat);
  });

  // ---- the agent pulse ----
  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  );
  group.add(pulse);

  // visited state: scale up that node's particle cluster
  const visited = new Uint8Array(N);
  const setNodeVisited = (i, on) => { visited[i] = on ? 1 : 0; };
  const run = makeAgentRun(graph, setNodeVisited, pulse);

  // ---- phase machine ----
  const PHASE = { ASSEMBLE: 0, HOLD: 1, DISSOLVE: 2, LIVE: 3 };
  let phase = PHASE.ASSEMBLE;
  let phaseStart = performance.now();

  function setPhase(p) {
    phase = p;
    phaseStart = performance.now();
    if (p === PHASE.DISSOLVE) band.classList.add("is-dissolved");
  }

  function requestDissolve() {
    if (phase === PHASE.HOLD || phase === PHASE.ASSEMBLE) setPhase(PHASE.DISSOLVE);
  }
  window.addEventListener("wheel", requestDissolve, { passive: true });
  window.addEventListener("touchmove", requestDissolve, { passive: true });
  window.addEventListener("scroll", requestDissolve, { passive: true });

  const smooth = (x) => x * x * (3 - 2 * x);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  function layoutParticles(now) {
    const elapsed = now - phaseStart;
    for (let i = 0; i < COUNT; i++) {
      let p;
      if (phase === PHASE.ASSEMBLE) {
        const local = clamp01(
          (elapsed - stagger[i] * CONFIG.assembleStaggerMs) /
          (CONFIG.assembleMs - CONFIG.assembleStaggerMs)
        );
        p = scatter[i].clone().lerp(textTargets[i], smooth(local));
      } else if (phase === PHASE.HOLD) {
        p = textTargets[i].clone();
        p.x += Math.sin(now * 0.002 + i) * 0.025;
        p.y += Math.cos(now * 0.0017 + i * 1.7) * 0.025;
      } else if (phase === PHASE.DISSOLVE) {
        const local = smooth(clamp01(elapsed / CONFIG.dissolveMs));
        p = textTargets[i].clone().lerp(graphTargets[i], local);
      } else {
        p = graphTargets[i];
      }
      const scale = phase === PHASE.LIVE && visited[i % N] ? 1.6 : 1;
      dummy.position.copy(p);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // ---- render loop: 30fps cap, paused when offscreen or tab hidden ----
  let visible = true;
  let pageVisible = !document.hidden;
  let acc = 0;
  let last = performance.now();
  const frameMs = 1000 / CONFIG.fps;

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.05 }).observe(band);
  }
  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
    last = performance.now();
  });

  window.addEventListener("resize", () => {
    renderer.setSize(W(), H());
    effect.setSize(W(), H());
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
  });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || !pageVisible) {
      last = now;
      return;
    }
    acc += now - last;
    last = now;
    if (acc < frameMs) return;
    const dt = Math.min(acc / 1000, 0.1);
    acc = 0;

    const elapsed = now - phaseStart;
    if (phase === PHASE.ASSEMBLE && elapsed >= CONFIG.assembleMs) setPhase(PHASE.HOLD);
    else if (phase === PHASE.HOLD && elapsed >= CONFIG.holdMs) setPhase(PHASE.DISSOLVE);
    else if (phase === PHASE.DISSOLVE && elapsed >= CONFIG.dissolveMs) {
      setPhase(PHASE.LIVE);
      pulse.material.opacity = 1;
    }

    if (phase === PHASE.DISSOLVE) {
      const k = smooth(clamp01(elapsed / CONFIG.dissolveMs));
      edgeMats.forEach((m) => { m.opacity = k * 0.8; });
    }

    if (phase === PHASE.LIVE) {
      run(dt);
      pulse.scale.setScalar(1 + Math.sin(now * 0.009) * 0.25);
      group.rotation.y = Math.sin(now * 0.00015) * 0.28;
      group.rotation.x = Math.sin(now * 0.00011) * 0.08;
    }

    layoutParticles(now);
    effect.render(scene, camera);
  }

  if (reducedMotion) {
    // Static frame: completed graph, no animation, no loop.
    setPhase(PHASE.LIVE);
    edgeMats.forEach((m) => { m.opacity = 0.8; });
    pulse.material.opacity = 0;
    band.classList.add("is-dissolved");
    layoutParticles(performance.now());
    effect.render(scene, camera);
    return;
  }

  requestAnimationFrame(frame);
}
