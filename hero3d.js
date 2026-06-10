// Scroll-driven 3D hero: the visitor's scroll flies a camera through a dark
// world of floating career stations (title -> products -> say hello), then
// hands off to the regular site. Inertia-smoothed scrub + mouse parallax.
//
// Injected entirely from JS: no-JS visitors, mobile, reduced-motion, and
// WebGL-less browsers see the site unchanged.

import * as THREE from "three";

const CONFIG = {
  bandVh: 420,          // total scroll length of the band, in vh
  scrub: 0.075,         // camera inertia (lerp factor per frame)
  parallax: 0.45,       // mouse parallax amplitude
  stationGap: 14,       // z distance between stations
  dprMax: 1.75,
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
if (desktop && !reducedMotion) init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.dprMax));
  } catch (err) {
    return;
  }

  // ---- band + sticky stage injection ----
  const main = document.querySelector("main");
  const landing = document.querySelector(".landing");
  if (!main || !landing) return;

  const band = document.createElement("section");
  band.className = "hero3d";
  band.style.height = CONFIG.bandVh + "vh";
  band.setAttribute("aria-hidden", "true");
  band.innerHTML =
    '<div class="hero3d-sticky">' +
    '<div class="hero3d-fade"></div>' +
    '<p class="hero3d-cue">scroll</p>' +
    "</div>";
  main.insertBefore(band, landing);
  const sticky = band.querySelector(".hero3d-sticky");
  const fade = band.querySelector(".hero3d-fade");
  const cue = band.querySelector(".hero3d-cue");
  sticky.insertBefore(renderer.domElement, fade);

  const W = () => sticky.clientWidth;
  const H = () => sticky.clientHeight;
  renderer.setSize(W(), H());

  // ---- scene & atmosphere ----
  const INK = 0x1a1c16;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  scene.fog = new THREE.Fog(INK, 8, 46);

  const camera = new THREE.PerspectiveCamera(58, W() / H(), 0.1, 120);

  scene.add(new THREE.AmbientLight(0xfff6dd, 0.55));
  const key = new THREE.DirectionalLight(0xfff6dd, 1.6);
  key.position.set(5, 9, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9d0006, 0.7);
  rim.position.set(-6, -3, -4);
  scene.add(rim);

  // ---- station builder: cream panel, ink text, red frame ----
  function makeLabelTexture(title, sub, big) {
    const cv = document.createElement("canvas");
    cv.width = 1024;
    cv.height = 512;
    const cx = cv.getContext("2d");
    cx.fillStyle = "#f7efcf";
    cx.fillRect(0, 0, 1024, 512);
    cx.fillStyle = "#9d0006";
    cx.fillRect(64, 96, 88, 14);
    cx.fillStyle = "#1f211b";
    cx.textBaseline = "top";
    cx.font = "bold " + (big ? 104 : 92) + "px Menlo, monospace";
    cx.fillText(title, 64, 160, 896);
    cx.fillStyle = "#6f653b";
    cx.font = "44px Menlo, monospace";
    const words = sub.split(" ");
    let line = "";
    let y = big ? 320 : 300;
    words.forEach((w) => {
      if (cx.measureText(line + w).width > 880) {
        cx.fillText(line, 64, y);
        y += 62;
        line = "";
      }
      line += w + " ";
    });
    cx.fillText(line, 64, y);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function makeStation(title, sub, pos, yRot, big) {
    const group = new THREE.Group();
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 3.6, 0.16),
      new THREE.MeshStandardMaterial({
        map: makeLabelTexture(title, sub, big),
        roughness: 0.62,
      })
    );
    group.add(panel);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 3.9, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x9d0006, roughness: 0.45 })
    );
    frame.position.z = -0.09;
    group.add(frame);
    group.position.copy(pos);
    group.rotation.y = yRot;
    scene.add(group);
    return group;
  }

  const GAP = CONFIG.stationGap;
  const stations = [
    makeStation("APURWA SARWAJIT", "AI Product Lead — browser agents for enterprises",
      new THREE.Vector3(0, 0.2, -2), 0, true),
    makeStation("AI STUDIO", "Production browser agents — $1M contracted in year one",
      new THREE.Vector3(-3.8, 0.6, -2 - GAP), 0.42, false),
    makeStation("FRAUD SCORE", "$4M ARR in 24 months — India's top 6 banks",
      new THREE.Vector3(3.8, -0.4, -2 - GAP * 2), -0.42, false),
    makeStation("SCORE ENGINE", "50M+ transactions a month across 35+ clients",
      new THREE.Vector3(-3.8, 0.4, -2 - GAP * 3), 0.42, false),
    makeStation("SAY HELLO", "apurvsingh28@gmail.com — the full story is below",
      new THREE.Vector3(0, 0.1, -2 - GAP * 4), 0, true),
  ];

  // ---- floating dust for depth ----
  const DUST = 700;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 44;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    dustPos[i * 3 + 2] = 6 - Math.random() * (GAP * 4 + 24);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xd7c783,
    size: 0.06,
    transparent: true,
    opacity: 0.55,
  }));
  scene.add(dust);

  // red guide line running through the world (the "path")
  const guidePts = [];
  for (let i = 0; i <= 60; i++) {
    const z = 4 - (i / 60) * (GAP * 4 + 14);
    guidePts.push(new THREE.Vector3(Math.sin(i * 0.45) * 0.5, -2.6 + Math.sin(i * 0.3) * 0.2, z));
  }
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(guidePts),
    new THREE.LineBasicMaterial({ color: 0x9d0006, transparent: true, opacity: 0.5 })
  ));

  // ---- camera path: weaves past each station ----
  const pathPts = [new THREE.Vector3(0, 0.3, 7)];
  stations.forEach((s, i) => {
    pathPts.push(new THREE.Vector3(s.position.x * 0.32, s.position.y * 0.4 + 0.2, s.position.z + 5.6));
  });
  pathPts.push(new THREE.Vector3(0, 0.3, stations[stations.length - 1].position.z - 6));
  const path = new THREE.CatmullRomCurve3(pathPts, false, "catmullrom", 0.6);

  // ---- scroll + mouse state ----
  let progress = 0;       // smoothed
  let targetProgress = 0; // raw from scroll
  let mx = 0, my = 0, smx = 0, smy = 0;
  let scrolled = false;

  function readScroll() {
    const rect = band.getBoundingClientRect();
    const total = rect.height - sticky.clientHeight;
    targetProgress = total > 0 ? Math.max(0, Math.min(1, -rect.top / total)) : 0;
    if (targetProgress > 0.01 && !scrolled) {
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
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
  });

  // ---- render loop: pauses offscreen / hidden tab ----
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

  const camPos = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || !pageVisible) return;

    progress += (targetProgress - progress) * CONFIG.scrub;
    smx += (mx - smx) * 0.06;
    smy += (my - smy) * 0.06;

    const p = Math.max(0, Math.min(1, progress));
    path.getPointAt(p, camPos);
    camPos.x += smx * CONFIG.parallax;
    camPos.y += -smy * CONFIG.parallax * 0.6;
    camera.position.copy(camPos);
    path.getPointAt(Math.min(p + 0.05, 1), lookAt);
    lookAt.x += smx * CONFIG.parallax * 1.6;
    lookAt.y += -smy * CONFIG.parallax;
    camera.lookAt(lookAt);

    stations.forEach((s, i) => {
      s.position.y += Math.sin(now * 0.001 + i * 1.9) * 0.0012;
      s.rotation.z = Math.sin(now * 0.0006 + i) * 0.02;
    });
    dust.rotation.z = now * 0.00001;

    // hand off to the cream site near the end of the band
    const f = Math.max(0, (p - 0.86) / 0.14);
    fade.style.opacity = (f * f).toFixed(3);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
