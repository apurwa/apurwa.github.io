// Scroll-driven particle hero, v3 (polish pass).
//
// One luminous particle field morphs through formations as the visitor
// scrolls: name -> agent network -> risk surface -> orbital system -> rises
// away into the cream site. Bloom post-processing, soft additive sprites,
// choreographed camera beats, crisp DOM captions synced to scroll.
//
// Injected entirely from JS: no-JS, mobile, reduced-motion, and WebGL-less
// visitors see the site unchanged.

const CONFIG = {
  bandVh: 520,        // scroll length (5 beats)
  scrub: 0.07,        // scroll inertia
  parallax: 0.5,
  dprMax: 1.5,        // bloom is per-pixel; keep DPR modest
  bloom: { strength: 0.5, radius: 0.55, threshold: 0.22 },
  pointSize: 0.15,
  introMs: 2200,      // load-in: scatter converges into the name
  introStaggerMs: 700,
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
// three.js is dynamically imported INSIDE the gate so phones, reduced-motion,
// and small windows never download a byte of it.
if (desktop && !reducedMotion) boot();

async function boot() {
  let THREE, EffectComposer, RenderPass, UnrealBloomPass;
  try {
    const [three, ec, rp, ub] = await Promise.all([
      import("three"),
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
    ]);
    THREE = three;
    EffectComposer = ec.EffectComposer;
    RenderPass = rp.RenderPass;
    UnrealBloomPass = ub.UnrealBloomPass;
  } catch (err) {
    return; // module fetch failed -> site stays as-is
  }
  init(THREE, EffectComposer, RenderPass, UnrealBloomPass);
}

function init(THREE, EffectComposer, RenderPass, UnrealBloomPass) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.dprMax));
  } catch (err) {
    return;
  }

  // ---- band + sticky stage + captions ----
  const main = document.querySelector("main");
  const landing = document.querySelector(".landing");
  if (!main || !landing) return;

  const band = document.createElement("section");
  band.className = "hero3d";
  band.style.height = CONFIG.bandVh + "vh";
  band.setAttribute("aria-hidden", "true");
  band.innerHTML =
    '<div class="hero3d-sticky">' +
    '<div class="hero3d-vignette"></div>' +
    '<div class="hero3d-grain"></div>' +
    '<div class="hero3d-captions"></div>' +
    '<div class="hero3d-fade"></div>' +
    '<p class="hero3d-cue">scroll</p>' +
    "</div>";
  main.insertBefore(band, landing);
  const sticky = band.querySelector(".hero3d-sticky");
  const fade = band.querySelector(".hero3d-fade");
  const cue = band.querySelector(".hero3d-cue");
  const captionWrap = band.querySelector(".hero3d-captions");
  sticky.insertBefore(renderer.domElement, sticky.firstChild);

  // the landing h1/portrait fade in as the hero hands off (echo, not duplicate)
  document.body.classList.add("hero3d-active");
  if ("IntersectionObserver" in window) {
    const landIO = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        document.body.classList.add("hero3d-landed");
        landIO.disconnect();
      }
    }, { threshold: 0.2 });
    landIO.observe(landing);
  } else {
    document.body.classList.add("hero3d-landed");
  }

  const CAPTIONS = [
    { kicker: "", title: "", body: "AI Product Lead — browser agents", pos: "center-low" },
    { kicker: "01 / AI STUDIO", title: "Browser agents in production",
      body: "Enterprise security teams automate legacy workflows without APIs. $1M contracted in year one.", pos: "left" },
    { kicker: "02 / FRAUD SCORE", title: "Risk, scored before onboarding",
      body: "India's first pre-onboarding fraud score. $4M ARR in 24 months across the top 6 banks.", pos: "right" },
    { kicker: "03 / SCORE ENGINE", title: "Decisions at platform scale",
      body: "A configurable decisioning core behind 50M+ transactions every month.", pos: "left" },
    { kicker: "", title: "Say hello", body: "The full story is below ↓", pos: "center" },
  ];
  const captionEls = CAPTIONS.map((c) => {
    const el = document.createElement("div");
    el.className = "hero3d-caption is-" + c.pos;
    el.innerHTML =
      (c.kicker ? '<p class="hero3d-kicker">' + c.kicker + "</p>" : "") +
      (c.title ? '<h2 class="hero3d-title">' + c.title + "</h2>" : "") +
      '<p class="hero3d-body">' + c.body + "</p>";
    captionWrap.appendChild(el);
    return el;
  });

  const W = () => sticky.clientWidth;
  const H = () => sticky.clientHeight;
  renderer.setSize(W(), H());

  // ---- scene, camera, post ----
  const INK = 0x12130e;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  scene.fog = new THREE.FogExp2(INK, 0.028);

  const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.1, 120);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(W(), H()),
    CONFIG.bloom.strength, CONFIG.bloom.radius, CONFIG.bloom.threshold
  ));
  composer.setSize(W(), H());

  // ---- soft round sprite for particles ----
  function makeSprite() {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const cx = cv.getContext("2d");
    const g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.65)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = g;
    cx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ---- formation 0: the name, sampled from canvas ----
  const cv = document.createElement("canvas");
  cv.width = 640;
  cv.height = 280;
  const cx = cv.getContext("2d");
  cx.fillStyle = "#fff";
  cx.font = "bold 96px Menlo, monospace";
  cx.textAlign = "center";
  cx.fillText("APURWA", 320, 108);
  cx.fillText("SARWAJIT", 320, 224);
  const img = cx.getImageData(0, 0, cv.width, cv.height).data;
  const namePts = [];
  for (let y = 0; y < cv.height; y += 2) {
    for (let x = 0; x < cv.width; x += 2) {
      if (img[(y * cv.width + x) * 4] > 128) {
        namePts.push(
          (x - cv.width / 2) * 0.030,
          -(y - cv.height / 2) * 0.030,
          (Math.random() - 0.5) * 0.35
        );
      }
    }
  }
  const COUNT = namePts.length / 3;
  const fName = new Float32Array(namePts);

  // ---- formation 1: agent network (clusters + edges + pulse path) ----
  const NODES = 26;
  const nodes = [];
  for (let i = 0; i < NODES; i++) {
    const L = i % 5;
    nodes.push(new THREE.Vector3(
      (L - 2) * 4.4 + (Math.random() - 0.5) * 1.2,
      ((i / 5 | 0) - 2.1) * 2.2 + (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 3.5
    ));
  }
  const fNetwork = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const n = nodes[i % NODES];
    fNetwork[i * 3] = n.x + (Math.random() - 0.5) * 1.5;
    fNetwork[i * 3 + 1] = n.y + (Math.random() - 0.5) * 1.5;
    fNetwork[i * 3 + 2] = n.z + (Math.random() - 0.5) * 1.5;
  }
  const edgePairs = [];
  for (let i = 0; i < NODES; i++) {
    for (let k = 0; k < 2; k++) {
      const j = Math.floor(Math.random() * NODES);
      if (j !== i) edgePairs.push(i, j);
    }
  }

  // ---- formation 2: risk surface (flowing wave grid) ----
  const fWave = new Float32Array(COUNT * 3);
  {
    const cols = Math.ceil(Math.sqrt(COUNT * 2.2));
    const rows = Math.ceil(COUNT / cols);
    for (let i = 0; i < COUNT; i++) {
      const gx = (i % cols) / (cols - 1) - 0.5;
      const gz = ((i / cols) | 0) / (rows - 1) - 0.5;
      const x = gx * 22;
      const z = gz * 10;
      fWave[i * 3] = x;
      fWave[i * 3 + 1] = Math.sin(x * 0.55) * 1.1 + Math.cos(z * 0.9 + x * 0.3) * 0.8 - 0.6;
      fWave[i * 3 + 2] = z;
    }
  }

  // ---- formation 3: orbital system ----
  const fOrbit = new Float32Array(COUNT * 3);
  {
    const v = new THREE.Vector3();
    const axis = new THREE.Vector3(1, 0.4, 0).normalize();
    for (let i = 0; i < COUNT; i++) {
      if (i % 9 === 0) {
        // dense core
        const r = Math.random() * 1.3;
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(2 * Math.random() - 1);
        v.set(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p));
      } else {
        const ring = 2.6 + (i % 5) * 1.15;
        const t = Math.random() * Math.PI * 2;
        v.set(Math.cos(t) * ring, (Math.random() - 0.5) * 0.18, Math.sin(t) * ring);
        v.applyAxisAngle(axis, (i % 5) * 0.22);
      }
      v.toArray(fOrbit, i * 3);
    }
  }

  // ---- formation 4: dispersal (rises and spreads) ----
  const fGone = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    fGone[i * 3] = (Math.random() - 0.5) * 40;
    fGone[i * 3 + 1] = 6 + Math.random() * 18;
    fGone[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }

  const formations = [fName, fNetwork, fWave, fOrbit, fGone];
  const SEGS = formations.length - 1;

  // ---- entrance: particles converge from a wide scatter into the name ----
  const fScatter = new Float32Array(COUNT * 3);
  const introStagger = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const t = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r = 16 + Math.random() * 9;
    fScatter[i * 3] = r * Math.sin(ph) * Math.cos(t);
    fScatter[i * 3 + 1] = r * Math.sin(ph) * Math.sin(t);
    fScatter[i * 3 + 2] = r * Math.cos(ph) - 6;
    introStagger[i] = Math.random();
  }
  let introStart = -1;
  let introDone = false;

  // ---- particles ----
  const positions = new Float32Array(fName);
  const colors = new Float32Array(COUNT * 3);
  const cream = new THREE.Color("#d9d2bb");
  const red = new THREE.Color("#a9504a");
  for (let i = 0; i < COUNT; i++) {
    (Math.random() < 0.05 ? red : cream).toArray(colors, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: CONFIG.pointSize,
    map: makeSprite(),
    vertexColors: true,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  scene.add(points);

  // ---- network edges + agent pulse (visible only around beat 1) ----
  const edgePos = new Float32Array(edgePairs.length * 3);
  edgePairs.forEach((n, k) => { nodes[n].toArray(edgePos, k * 3); });
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePos, 3));
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xa89e80,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new THREE.LineSegments(edgeGeo, edgeMat));

  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xb85e55, transparent: true, opacity: 0 })
  );
  scene.add(pulse);
  const pulsePath = [3, 8, 12, 17, 23].map((i) => nodes[i % NODES]);

  // ---- line-work for the wave beat: flow lines tracing the surface ----
  const waveLineMat = new THREE.LineBasicMaterial({
    color: 0xa89e80,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  [-4, -2, 0, 2, 4].forEach((z) => {
    const pts = [];
    for (let x = -11; x <= 11; x += 0.4) {
      pts.push(new THREE.Vector3(
        x,
        Math.sin(x * 0.55) * 1.1 + Math.cos(z * 0.9 + x * 0.3) * 0.8 - 0.6,
        z
      ));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), waveLineMat));
  });

  // ---- line-work for the orbit beat: the rings themselves ----
  const ringMat = new THREE.LineBasicMaterial({
    color: 0xa89e80,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ringsGroup = new THREE.Group();
  const ringAxis = new THREE.Vector3(1, 0.4, 0).normalize();
  for (let k = 0; k < 5; k++) {
    const r = 2.6 + k * 1.15;
    const pts = [];
    for (let s = 0; s <= 72; s++) {
      const t = (s / 72) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r)
        .applyAxisAngle(ringAxis, k * 0.22));
    }
    ringsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
  }
  scene.add(ringsGroup);

  // ---- ambient drift dust ----
  const DUST = 300;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 50;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 26;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.05,
    map: makeSprite(),
    color: 0x5f5840,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  scene.add(dust);

  // ---- camera beats: one keyframe per formation ----
  const camBeats = [
    { pos: new THREE.Vector3(0, 0, 14), look: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(-4.5, 1.6, 13), look: new THREE.Vector3(0.5, 0, 0) },
    { pos: new THREE.Vector3(0, 5.2, 13), look: new THREE.Vector3(0, -1.2, 0) },
    { pos: new THREE.Vector3(5.5, 2.4, 10), look: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(0, -1.5, 17), look: new THREE.Vector3(0, 5, 0) },
  ];

  // ---- scroll + pointer ----
  let progress = 0;
  let target = 0;
  let mx = 0, my = 0, smx = 0, smy = 0;
  let scrolled = false;
  let lastScrollInput = 0;

  function readScroll() {
    const rect = band.getBoundingClientRect();
    const total = rect.height - sticky.clientHeight;
    target = total > 0 ? Math.max(0, Math.min(1, -rect.top / total)) : 0;
    lastScrollInput = performance.now();
    if (target > 0.01 && !scrolled) {
      scrolled = true;
      cue.classList.add("is-hidden");
    }
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  window.addEventListener("pointermove", (e) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  window.addEventListener("resize", () => {
    renderer.setSize(W(), H());
    composer.setSize(W(), H());
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
  });

  // ---- visibility pause ----
  let visible = true;
  let pageVisible = !document.hidden;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(band);
  }
  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
  });

  const smooth = (x) => x * x * (3 - 2 * x);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  // weight peaking at beat i (1 at the beat, 0 a full beat away)
  const beatWeight = (p, i) => clamp01(1 - Math.abs(p * SEGS - i));

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || !pageVisible) return;

    // beat magnetism: when the scroll is idle near a formation, ease the
    // visual progress onto it so visitors rest ON beats, not between them.
    if (now - lastScrollInput > 450 && target > 0.01 && target < 0.99) {
      const bf = target * SEGS;
      const nearest = Math.round(bf);
      if (Math.abs(bf - nearest) < 0.4) {
        target += (nearest / SEGS - target) * 0.03;
      }
    }

    progress += (target - progress) * CONFIG.scrub;
    smx += (mx - smx) * 0.05;
    smy += (my - smy) * 0.05;
    const p = clamp01(progress);

    // formation morph
    const segF = Math.min(p * SEGS, SEGS - 1e-6);
    const seg = segF | 0;
    const local = smooth(segF - seg);
    const A = formations[seg];
    const B = formations[seg + 1];
    const wobble = Math.sin(now * 0.0011) * 0.018;
    const introActive = !introDone;
    let introElapsed = 0;
    if (introActive) {
      if (introStart < 0) introStart = now;
      introElapsed = now - introStart;
    }
    for (let n = 0; n < COUNT; n++) {
      const i = n * 3;
      let x = A[i] + (B[i] - A[i]) * local + Math.sin(now * 0.001 + i) * wobble;
      let y = A[i + 1] + (B[i + 1] - A[i + 1]) * local + Math.cos(now * 0.0013 + i) * wobble;
      let z = A[i + 2] + (B[i + 2] - A[i + 2]) * local;
      if (introActive) {
        const il = smooth(clamp01(
          (introElapsed - introStagger[n] * CONFIG.introStaggerMs) /
          (CONFIG.introMs - CONFIG.introStaggerMs)
        ));
        x = fScatter[i] + (x - fScatter[i]) * il;
        y = fScatter[i + 1] + (y - fScatter[i + 1]) * il;
        z = fScatter[i + 2] + (z - fScatter[i + 2]) * il;
      }
      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = z;
    }
    if (introActive && introElapsed >= CONFIG.introMs) introDone = true;
    geo.attributes.position.needsUpdate = true;

    // beat-scoped extras
    const wNet = beatWeight(p, 1);
    edgeMat.opacity = smooth(wNet) * 0.22;
    if (wNet > 0.4) {
      const t = (now * 0.00035) % 1;
      const segs = pulsePath.length - 1;
      const si = Math.min(t * segs | 0, segs - 1);
      pulse.position.lerpVectors(pulsePath[si], pulsePath[si + 1], (t * segs) - si);
      pulse.material.opacity = smooth((wNet - 0.4) / 0.6);
      pulse.scale.setScalar(1 + Math.sin(now * 0.01) * 0.3);
    } else {
      pulse.material.opacity = 0;
    }

    // wave + orbit line-work fades with its beat
    waveLineMat.opacity = smooth(beatWeight(p, 2)) * 0.16;
    ringMat.opacity = smooth(beatWeight(p, 3)) * 0.2;

    // orbital beat: slow rotation of the whole field (rings stay in sync)
    points.rotation.y = beatWeight(p, 3) * now * 0.00012;
    ringsGroup.rotation.y = points.rotation.y;

    // camera: lerp between beat keyframes + parallax
    const ca = camBeats[seg];
    const cb = camBeats[seg + 1];
    camPos.lerpVectors(ca.pos, cb.pos, local);
    camLook.lerpVectors(ca.look, cb.look, local);
    camPos.x += smx * CONFIG.parallax;
    camPos.y += -smy * CONFIG.parallax * 0.6;
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    dust.rotation.y = now * 0.00002;

    // captions
    captionEls.forEach((el, i) => {
      const w = beatWeight(p, i);
      const o = clamp01((w - 0.55) / 0.45);
      el.style.opacity = smooth(o).toFixed(3);
      el.style.transform = "translateY(" + ((1 - smooth(o)) * 18).toFixed(1) + "px)";
    });

    // handoff to cream site
    const f = clamp01((p - 0.9) / 0.1);
    fade.style.opacity = (f * f).toFixed(3);

    composer.render();
  }
  requestAnimationFrame(frame);
}
