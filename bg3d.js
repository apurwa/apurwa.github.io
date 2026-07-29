// Minimal ambient 3D background for the cream sections: sparse muted dots
// drifting slowly in depth, with soft scroll parallax and mouse drift.
// Sits behind all content (z-index 0); the dark hero band covers it while
// in view. Desktop + WebGL + motion-ok only; otherwise the site is unchanged.

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
// dynamic import inside the gate: non-desktop visitors download nothing
if (desktop && !reducedMotion) {
  import("three").then(init).catch(() => {});
}

function init(THREE) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  } catch (err) {
    return;
  }

  const el = renderer.domElement;
  el.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;";
  document.body.appendChild(el);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // transparent over the cream

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.1, 60
  );
  camera.position.z = 16;

  // soft round sprite
  const cv = document.createElement("canvas");
  cv.width = cv.height = 32;
  const cx = cv.getContext("2d");
  const g = cx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = g;
  cx.fillRect(0, 0, 32, 32);
  const sprite = new THREE.CanvasTexture(cv);

  const COUNT = 180;
  const BOUNDS = { x: 26, y: 16, z: 14 };
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const vel = new Float32Array(COUNT * 3);
  const olive = new THREE.Color("#6f653b");
  const ember = new THREE.Color("#9d0006");
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * BOUNDS.x * 2;
    pos[i * 3 + 1] = (Math.random() - 0.5) * BOUNDS.y * 2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS.z * 2;
    // base ambient drift, kept very slow (~40% of original) so it reads as
    // a still backdrop, not motion that distracts while reading
    vel[i * 3] = (Math.random() - 0.5) * 0.00147;
    vel[i * 3 + 1] = (Math.random() - 0.5) * 0.00118;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.00063;
    (Math.random() < 0.07 ? ember : olive).toArray(col, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.16,
    map: sprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  }));
  scene.add(points);

  // displacement layer: cursor repulsion + scroll kicks, decaying back to drift
  const disp = new Float32Array(COUNT * 3);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(2, 2); // offscreen until first pointermove
  const pt = new THREE.Vector3();
  const closest = new THREE.Vector3();
  const push = new THREE.Vector3();
  const REPULSE_RADIUS = 3.6;
  const REPULSE_STRENGTH = 0.085;

  let mx = 0, my = 0, smx = 0, smy = 0;
  window.addEventListener("pointermove", (e) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
    ndc.set(mx, -my);
  }, { passive: true });

  let lastScrollY = window.scrollY;

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  let pageVisible = !document.hidden;
  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
    last = performance.now();
  });

  // 30fps is plenty for ambience
  let last = performance.now();
  let acc = 0;
  const frameMs = 1000 / 30;

  function frame(now) {
    requestAnimationFrame(frame);
    if (!pageVisible) { last = now; return; }
    acc += now - last;
    last = now;
    if (acc < frameMs) return;
    acc = 0;

    // scroll velocity becomes a vertical kick that settles back to calm
    const scrollDv = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    const kick = Math.max(-0.8, Math.min(0.8, scrollDv * 0.006));

    // cursor repulsion: particles near the pointer ray ease away from it
    raycaster.setFromCamera(ndc, camera);
    const ray = raycaster.ray;

    for (let i = 0; i < COUNT; i++) {
      const k = i * 3;
      pt.set(pos[k], pos[k + 1], pos[k + 2]);
      const d = ray.distanceToPoint(pt);
      if (d < REPULSE_RADIUS) {
        ray.closestPointToPoint(pt, closest);
        push.subVectors(pt, closest);
        if (push.lengthSq() > 1e-6) {
          const f = Math.pow(1 - d / REPULSE_RADIUS, 2) * REPULSE_STRENGTH;
          push.normalize().multiplyScalar(f);
          disp[k] += push.x;
          disp[k + 1] += push.y;
          disp[k + 2] += push.z;
        }
      }
      disp[k + 1] += kick * 0.01;

      for (let a = 0; a < 3; a++) {
        const j = k + a;
        pos[j] += vel[j] * frameMs + disp[j];
        disp[j] *= 0.9; // settle back to the ambient drift
        const bound = a === 0 ? BOUNDS.x : a === 1 ? BOUNDS.y : BOUNDS.z;
        if (pos[j] > bound) pos[j] = -bound;
        if (pos[j] < -bound) pos[j] = bound;
      }
    }
    geo.attributes.position.needsUpdate = true;

    smx += (mx - smx) * 0.03;
    smy += (my - smy) * 0.03;
    camera.position.x = smx * 0.7;
    camera.position.y = -smy * 0.45 - window.scrollY * 0.0012;
    camera.lookAt(0, camera.position.y * 0.85, 0);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
