// Parked dev tool — light/bright palette explorer. NOT loaded by the site.
// To preview: add <script src="docs/theme-lab.js"></script> before </body> in
// index.html, serve locally, then remove the line again. See docs/theme-options.md.
(function () {
  const PALETTES = [
    { id: "current", name: "Warm Cream (current)", vars: {
      "--bg": "#f7efcf", "--card-border": "#d7c783", "--card-border-soft": "#e8dcaa",
      "--fg": "#1f211b", "--muted": "#6f653b", "--accent": "#9d0006", "--hover": "#620004" } },
    { id: "linen", name: "A · Bright Linen", vars: {
      "--bg": "#fbf6ea", "--card-border": "#e6d9ac", "--card-border-soft": "#f1e8ca",
      "--fg": "#262620", "--muted": "#857849", "--accent": "#b5321a", "--hover": "#8f2512" } },
    { id: "porcelain", name: "B · Cool Porcelain", vars: {
      "--bg": "#f6f7f9", "--card-border": "#dbe0e7", "--card-border-soft": "#e9edf1",
      "--fg": "#1d2126", "--muted": "#616c7a", "--accent": "#c0331e", "--hover": "#99260f" } },
    { id: "ivory", name: "C · Sunlit Ivory", vars: {
      "--bg": "#fdfbf4", "--card-border": "#ecdfbe", "--card-border-soft": "#f5edd6",
      "--fg": "#23221c", "--muted": "#8c7d4e", "--accent": "#e0431c", "--hover": "#b8320f" } },
    { id: "mist", name: "D · Cloud White", vars: {
      "--bg": "#fcfcfb", "--card-border": "#e4e2da", "--card-border-soft": "#efeee8",
      "--fg": "#22231d", "--muted": "#7c7358", "--accent": "#cc3b16", "--hover": "#a52d0e" } },
    { id: "tangerine", name: "E · Tangerine", vars: {
      "--bg": "#fff7ee", "--card-border": "#f3d9b8", "--card-border-soft": "#f9e9d4",
      "--fg": "#241f1a", "--muted": "#8a6d4a", "--accent": "#ea580c", "--hover": "#c2410c" } },
    { id: "coral", name: "F · Electric Coral", vars: {
      "--bg": "#fff4f3", "--card-border": "#f6cfcb", "--card-border-soft": "#fbe3e0",
      "--fg": "#241a1b", "--muted": "#916a6a", "--accent": "#fb2c48", "--hover": "#d61233" } },
    { id: "emerald", name: "G · Emerald (single)", vars: {
      "--bg": "#f1fbf6", "--card-border": "#c3e6d3", "--card-border-soft": "#ddf1e6",
      "--fg": "#12211a", "--muted": "#5f7d6c", "--accent": "#059669", "--hover": "#047857" } },
    { id: "emerald-amber", name: "G1 · Emerald + Amber", vars: {
      "--bg": "#f1fbf6", "--card-border": "#c3e6d3", "--card-border-soft": "#ddf1e6",
      "--fg": "#12211a", "--muted": "#5f7d6c", "--accent": "#059669", "--hover": "#047857",
      "--accent2": "#f59e0b" } },
    { id: "emerald-coral", name: "G2 · Emerald + Coral", vars: {
      "--bg": "#f1fbf6", "--card-border": "#c3e6d3", "--card-border-soft": "#ddf1e6",
      "--fg": "#12211a", "--muted": "#5f7d6c", "--accent": "#059669", "--hover": "#047857",
      "--accent2": "#f43f5e" } },
    { id: "emerald-sky", name: "G3 · Emerald + Sky", vars: {
      "--bg": "#f1fbf6", "--card-border": "#c3e6d3", "--card-border-soft": "#ddf1e6",
      "--fg": "#12211a", "--muted": "#5f7d6c", "--accent": "#059669", "--hover": "#047857",
      "--accent2": "#0ea5e9" } },
    { id: "cobalt", name: "H · Cobalt", vars: {
      "--bg": "#f3f7ff", "--card-border": "#cadcf5", "--card-border-soft": "#e1ebfb",
      "--fg": "#171d29", "--muted": "#5c6c88", "--accent": "#2563eb", "--hover": "#1d4ed8" } },
    { id: "fuchsia", name: "I · Fuchsia", vars: {
      "--bg": "#fdf3fa", "--card-border": "#efcbe3", "--card-border-soft": "#f7e1f0",
      "--fg": "#241a22", "--muted": "#886179", "--accent": "#db2777", "--hover": "#be185d" } },
  ];

  const root = document.documentElement;
  const panel = document.createElement("div");
  panel.id = "theme-lab";

  // every var any palette can set — cleared before each apply so values like
  // --accent2 never linger when switching to a palette that omits them
  const ALL_KEYS = Array.from(new Set(PALETTES.flatMap((p) => Object.keys(p.vars))));

  function apply(p) {
    ALL_KEYS.forEach((k) => {
      if (k in p.vars) root.style.setProperty(k, p.vars[k]);
      else root.style.removeProperty(k);
    });
    try { localStorage.setItem("themePreview", p.id); } catch (e) {}
    panel.querySelectorAll("button").forEach((b) =>
      b.classList.toggle("active", b.dataset.id === p.id));
  }

  const title = document.createElement("p");
  title.textContent = "Theme preview";
  panel.appendChild(title);

  PALETTES.forEach((p) => {
    const b = document.createElement("button");
    b.dataset.id = p.id;
    b.innerHTML =
      '<span class="sw" style="background:' + p.vars["--bg"] +
      ";border-color:" + p.vars["--card-border"] + '"></span>' +
      '<span class="dot" style="background:' + p.vars["--accent"] + '"></span>' +
      (p.vars["--accent2"]
        ? '<span class="dot" style="background:' + p.vars["--accent2"] + '"></span>'
        : "") +
      '<span class="nm">' + p.name + "</span>";
    b.addEventListener("click", () => apply(p));
    panel.appendChild(b);
  });

  const css = document.createElement("style");
  css.textContent =
    "#theme-lab{position:fixed;right:16px;bottom:16px;z-index:9999;" +
    "background:rgba(22,22,17,.92);color:#f4eecf;backdrop-filter:blur(8px);" +
    "border:1px solid rgba(255,255,255,.15);border-radius:11px;padding:11px;" +
    "font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;" +
    "box-shadow:0 12px 34px rgba(0,0,0,.34);display:flex;flex-direction:column;gap:3px;min-width:196px;" +
    "max-height:82vh;overflow-y:auto}" +
    "#theme-lab p{margin:0 0 5px;opacity:.55;letter-spacing:.12em;text-transform:uppercase;font-size:10px}" +
    "#theme-lab button{display:flex;align-items:center;gap:9px;background:transparent;" +
    "border:1px solid transparent;border-radius:7px;color:inherit;font:inherit;text-align:left;" +
    "padding:6px 8px;cursor:pointer;transition:background .15s,border-color .15s}" +
    "#theme-lab button:hover{background:rgba(255,255,255,.08)}" +
    "#theme-lab button.active{border-color:rgba(255,255,255,.4);background:rgba(255,255,255,.13)}" +
    "#theme-lab .sw{width:15px;height:15px;border-radius:4px;border:1px solid;flex:0 0 auto}" +
    "#theme-lab .dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto;margin-left:-5px}" +
    "#theme-lab .nm{white-space:nowrap}";
  document.head.appendChild(css);
  document.body.appendChild(panel);

  let saved = null;
  try { saved = localStorage.getItem("themePreview"); } catch (e) {}
  apply(PALETTES.find((p) => p.id === saved) || PALETTES[0]);
})();
