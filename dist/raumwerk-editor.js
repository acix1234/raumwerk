/* Raumwerk – visueller Editor (Karten-Editor in HA, Phase 3)
 * Wird von custom:raumwerk-card über getConfigElement() geladen.
 */
const RWE_VERSION = "0.19.0";
let RaumwerkEditorClip = null;
const NS = "http://www.w3.org/2000/svg";
const FURN = {
  bed: ["Bett", 180, 200], sofa: ["Sofa", 220, 95], sofa_u: ["Wohnlandschaft (U)", 430, 200], table: ["Tisch", 160, 90],
  table_round: ["Tisch rund", 80, 80], desk: ["Schreibtisch", 140, 70], wardrobe: ["Schrank", 200, 60], kitchen: ["Küchenzeile", 240, 60],
  stairs: ["Treppe", 100, 300], tv: ["Fernseher", 140, 10], rug: ["Teppich", 300, 200], plant: ["Pflanze", 55, 55], pillar: ["Pfeiler", 35, 35], box: ["Sonstiges", 60, 60],
};
// Möbelliste aus dem Katalog der Karte (Fallback: obige Liste)
let _FL = null;
function FL() {
  if (_FL) return _FL;
  const K = window.RaumwerkCatalog;
  if (!K) return Object.fromEntries(Object.entries(FURN).map(([k, v]) => [k, [...v, "Möbel"]]));
  _FL = {};
  for (const [k, c] of Object.entries(K.CATALOG)) _FL[k] = [c.n, c.w, c.d, c.c];
  for (const [k, c] of Object.entries(K.CAT_SPECIAL)) _FL[k] = [c[0], c[2], c[3], c[1]];
  for (const k of Object.keys(FURN)) if (!_FL[k]) _FL[k] = [...FURN[k], "Sonstiges"];
  return _FL;
}
function furnOpts(cur) {
  const groups = {};
  for (const [k, v] of Object.entries(FL())) (groups[v[3]] = groups[v[3]] || []).push([k, v[0]]);
  return Object.entries(groups).map(([g, l]) => `<optgroup label="${g}">${l.map(([k, n]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${n}</option>`).join("")}</optgroup>`).join("");
}
const catE = (t) => window.RaumwerkCatalog && window.RaumwerkCatalog.CATALOG[t];
const LTYPES = { ceiling: "Deckenlicht", spot: "Spot", lamp: "Steh-/Tischlampe", strip: "LED-Streifen", indirect: "Indirekt (ganzer Raum)" };
const TOOLS = [["select", "Auswahl"], ["wall", "Wand"], ["door", "Tür"], ["window", "Fenster"], ["area", "Raum"], ["light", "Lampe"], ["sensor", "Sensor"], ["device", "Gerät"], ["radiator", "Heizkörper"], ["socket", "Steckdose"], ["camera", "Kamera"], ["furniture", "Möbel"]];
const SURFN = { grass: "Rasen", paving: "Pflaster", gravel: "Kies", wood: "Holzdeck", path: "Weg", terrace: "Terrasse", greenhouse: "Gewächshaus" };
const WALLI = ["radiator", "socket"];
function pip(x, y, pts) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; }
  return ins;
}
// Tür-Geometrie wie in der Karte: flipV = öffnet zur +n-Seite, flipH = Bänder am Ende B
function doorLeaves(o) {
  const a = ((o.angle || 0) * Math.PI) / 180, u = [Math.cos(a), Math.sin(a)], L = o.length, s = o.flipV ? 1 : -1, sh = o.flipH ? -1 : 1;
  const A = [o.x - (u[0] * L) / 2, o.y - (u[1] * L) / 2], B = [o.x + (u[0] * L) / 2, o.y + (u[1] * L) / 2], n = [-u[1] * s, u[0] * s];
  const lv = o.sash === "double" ? [[A, u, L / 2], [B, [-u[0], -u[1]], L / 2]] : [[sh > 0 ? A : B, sh > 0 ? u : [-u[0], -u[1]], L]];
  return lv.map(([h, d, len]) => ({ h, tip: [h[0] + d[0] * len, h[1] + d[1] * len], open: [h[0] + n[0] * len, h[1] + n[1] * len], len, sweep: d[0] * n[1] - d[1] * n[0] > 0 ? 1 : 0 }));
}
const mk = (tag, a = {}, p) => { const e = document.createElementNS(NS, tag); for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const r1 = (v) => Math.round(v * 10) / 10;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function projSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
  const q = [a[0] + t * dx, a[1] + t * dy];
  return { q, t, d: dist(p, q), ang: (Math.atan2(dy, dx) * 180) / Math.PI };
}

class RaumwerkEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    if (!this._plan || !this._self) {
      const lv = this._lvl && config.levels && config.levels[this._lvl - 1] ? this._lvl : 0; this._lvl = lv; this._basePlan = config.plan;
      this._plan = this._norm(lv ? config.levels[lv - 1].plan : config.plan);
      this._undo = []; this._redo = [];
    }
    this._self = false;
    if (this._root) this._render();
  }
  set hass(h) { const first = !this._hass; this._hass = h; if (!this._root) this._init(); else if (first) this._render(); if (this._c3) this._c3.hass = h; }

  _norm(plan) {
    const p = JSON.parse(JSON.stringify(plan || { walls: [], openings: [], furniture: [], items: [], areas: [] }));
    p.walls = (p.walls || []).map((w) => (Array.isArray(w) ? { x1: w[0], y1: w[1], x2: w[2], y2: w[3] } : w));
    ["openings", "furniture", "items", "areas"].forEach((k) => (p[k] = p[k] || []));
    p.areas.forEach((a) => (a.points = a.points.map((q) => (Array.isArray(q) ? q : [q.x, q.y]))));
    return p;
  }
  _out() {
    const p = JSON.parse(JSON.stringify(this._plan));
    p.walls = p.walls.map((w) => { const { x1, y1, x2, y2, ...rest } = w; return Object.keys(rest).length ? { x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2), ...rest } : [r1(x1), r1(y1), r1(x2), r1(y2)]; });
    return p;
  }
  _lvNames() { return [this._config.level_name || "EG", ...(this._config.levels || []).map((l, i) => l.name || "Etage " + (i + 1))]; }
  _cfgOut() {
    const c = { ...this._config }, lv = this._lvl || 0;
    if (lv && c.levels && c.levels[lv - 1]) { c.levels = c.levels.map((l, i) => (i === lv - 1 ? { ...l, plan: this._out() } : l)); c.plan = this._basePlan || c.plan; }
    else c.plan = this._out();
    return c;
  }
  _switchLevel(i) {
    const c = this._cfgOut(); this._config = c; this._self = true;
    this._lvl = i; this._basePlan = c.plan;
    this._plan = this._norm(i ? c.levels[i - 1].plan : c.plan); this._undo = []; this._redo = []; this._sel = null;
    this._render(); this._sync3d(true);
  }
  _renameLevel(n) {
    const c = this._cfgOut(), lv = this._lvl || 0;
    if (!lv) c.level_name = n || "EG"; else c.levels = c.levels.map((l, i) => (i === lv - 1 ? { ...l, name: n || "Etage " + lv } : l));
    this._config = c; this._self = true;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true })); this._render();
  }
  _addLevel() {
    const c = this._cfgOut(), base = this._norm(c.plan), outer = base.walls.filter((w) => { const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2, a = Math.atan2(w.y2 - w.y1, w.x2 - w.x1), nx = -Math.sin(a) * 30, ny = Math.cos(a) * 30; const ins = (x, y) => base.areas.some((r) => !r.outdoor && pip(x, y, r.points)); return ins(mx + nx, my + ny) !== ins(mx - nx, my - ny); });
    const np = { walls: outer.map((w) => [w.x1, w.y1, w.x2, w.y2]), openings: [], furniture: [], items: [], areas: [] };
    c.levels = [...(c.levels || []), { name: (c.levels || []).length ? "Etage " + ((c.levels || []).length + 1) : "OG", plan: np }];
    this._config = c; this._self = true;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true }));
    this._switchLevel(c.levels.length);
  }
  _delLevel() {
    const lv = this._lvl || 0; if (!lv || !confirm("Etage „" + this._lvNames()[lv] + "“ löschen?")) return;
    const c = this._cfgOut(); c.levels = c.levels.filter((_, i) => i !== lv - 1); if (!c.levels.length) delete c.levels;
    this._config = c; this._self = true; this._lvl = 0;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true }));
    this._plan = this._norm(c.plan); this._render(); this._sync3d(true);
  }
  _commit() {
    this._self = true;
    const cfg = this._cfgOut();
    this._config = cfg;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
    this._sync3d(true);
  }
  /* ---------- 3D-Ansicht im Editor ---------- */
  _sync3d(force) {
    const box = this._root && this._root.querySelector(".p3");
    if (!box) return;
    if (!this._show3d) { box.hidden = true; if (this._c3) { this._c3.remove(); this._c3 = null; } return; }
    box.hidden = false;
    const sk = JSON.stringify(this._sel || null);
    if (!force && this._c3 && sk === this._lastSel3) return;
    this._lastSel3 = sk;
    if (!customElements.get("raumwerk-card")) { box.innerHTML = '<p class="note">Die Karte ist noch nicht geladen.</p>'; return; }
    if (!this._c3) { box.innerHTML = ""; this._c3 = document.createElement("raumwerk-card"); box.appendChild(this._c3); }
    const cfg = { ...this._config, plan: this._out(), levels: undefined, view: "3d", edit3d: true, rotate_portrait: false, kiosk: null, heatmap_button: false, edit_sel: this._sel && (this._sel.k === "furniture" || this._sel.k === "item") ? this._sel : null, on_edit: (e) => this._on3d(e) };
    delete cfg.plan_source;
    this._c3.setConfig(cfg);
    if (this._hass) this._c3.hass = this._hass;
  }
  _on3d(e) {
    if (e.type === "select") { this._sel = e.k ? { k: e.k, i: e.i } : null; this._render(); return; }
    const P = this._plan;
    this._sel = { k: e.k, i: e.i };
    if ((e.k === "item" ? P.items[e.i] : P.furniture[e.i]).locked) { this._render(); this._flash("Fixiert – zum Verschieben erst „Fixiert“ abhaken."); return; }
    this._change(() => {
      if (e.k === "item") {
        const it = P.items[e.i];
        if (WALLI.includes(it.display)) this._wallSnap([e.x, e.y], it); else { it.x = this._g(e.x); it.y = this._g(e.y); }
      } else {
        const f = P.furniture[e.i];
        f.x = this._g(e.x); f.y = this._g(e.y);
        this._afterFurnMove(f);
      }
    });
  }
  // Nach dem Verschieben: Kleingeräte auf das Möbel darunter stellen, große Möbel mit dem Rücken an die Wand
  _afterFurnMove(f) {
    const c = catE(f.type);
    if (!c) return;
    if (c.top) { this._autoStack(f); return; }
    if (this._wsnap === false || c.z) return;
    const w = this._nearestWall([f.x, f.y]);
    if (!w) return;
    const T = (this._config.wall_thickness || 12) / 2;
    const a = (w.ang * Math.PI) / 180;
    let nx = -Math.sin(a), ny = Math.cos(a);
    if ((f.x - w.q[0]) * nx + (f.y - w.q[1]) * ny < 0) { nx = -nx; ny = -ny; }
    const gap = w.d - T - f.h / 2;
    if (w.t <= 0.001 || w.t >= 0.999 || gap > 25 || gap < -f.h / 2) return;
    f.angle = Math.round(((Math.atan2(-nx, ny) * 180) / Math.PI + 360) % 360);
    f.x = Math.round((w.q[0] + nx * (T + f.h / 2)) * 10) / 10; f.y = Math.round((w.q[1] + ny * (T + f.h / 2)) * 10) / 10;
  }
  _snapshot() { this._undo.push(JSON.stringify(this._plan)); if (this._undo.length > 60) this._undo.shift(); this._redo = []; }
  _doUndo() { if (!this._undo.length) return; this._redo.push(JSON.stringify(this._plan)); this._plan = JSON.parse(this._undo.pop()); this._sel = null; this._commit(); this._render(); }
  _doRedo() { if (!this._redo.length) return; this._undo.push(JSON.stringify(this._plan)); this._plan = JSON.parse(this._redo.pop()); this._sel = null; this._commit(); this._render(); }
  _change(fn) { this._snapshot(); fn(); this._commit(); this._render(); }

  _init() {
    this._root = this._home = this.attachShadow({ mode: "open" });
    this._tool = "select"; this._sel = null; this._grid = 5; this._furnType = "bed";
    this._root.innerHTML = `<style>${ESTYLE}</style>
      <div class="ed">
        <div class="tb"></div>
        <div class="main">
          <div class="cv"><div class="c2"><svg></svg></div><div class="p3" hidden></div><div class="hint"></div></div>
          <div class="props"></div>
        </div>
      </div>`;
    this._svg = this._root.querySelector("svg");
    this._hint = this._root.querySelector(".hint");
    this._bindCanvas();
    this._onKey = (ev) => this._key(ev);
    window.addEventListener("keydown", this._onKey, true);
    this._ed = this._root.querySelector(".ed");
    this._onFs = () => { if (!this._fsEl() && this._fs === "api") this._setFs(false); };
    document.addEventListener("fullscreenchange", this._onFs);
    document.addEventListener("webkitfullscreenchange", this._onFs);
    this._ro = new ResizeObserver(() => { const w = this._svg.clientWidth; if (w && w !== this._lastW) { this._lastW = w; this._render(); } });
    this._ro.observe(this._svg);
    this._render();
  }
  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKey, true);
    document.removeEventListener("fullscreenchange", this._onFs);
    document.removeEventListener("webkitfullscreenchange", this._onFs);
    if (this._fs) this._setFs(false);
  }
  /* ---------- Vollbild ---------- */
  _fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
  _toggleFs() { this._setFs(!this._fs); }
  _setFs(on) {
    const ed = this._ed;
    if (on) {
      // ganzes Browserfenster: Editor in eine eigene Ebene direkt unter <body> verschieben
      // (im HA-Dialog würde position:fixed nur den Dialog füllen)
      // Der HA-Kartendialog ist ein modales <dialog> in der obersten Ebene – darüber kommt nur ein weiteres modales <dialog>.
      if (!this._fsHost) {
        const dlg = (this._fsDlg = document.createElement("dialog"));
        dlg.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;overflow:hidden;z-index:2147483000";
        dlg.addEventListener("cancel", (e) => { e.preventDefault(); this._setFs(false); });
        this._fsHost = document.createElement("div");
        this._fsHost.style.cssText = "position:absolute;inset:0";
        dlg.appendChild(this._fsHost);
        const sr = this._fsHost.attachShadow({ mode: "open" });
        sr.innerHTML = `<style>${ESTYLE}</style>`;
      }
      document.body.appendChild(this._fsDlg);
      try { if (this._fsDlg.showModal) this._fsDlg.showModal(); else this._fsDlg.setAttribute("open", ""); } catch (e) { this._fsDlg.setAttribute("open", ""); }
      this._fsHost.shadowRoot.appendChild(ed);
      this._root = this._fsHost.shadowRoot;
      this._fs = "css"; ed.classList.add("fs");
    } else {
      this._fs = null; ed.classList.remove("fs");
      if (this._fsHost) { this._home.appendChild(ed); try { this._fsDlg.close(); } catch (e) {} this._fsDlg.remove(); }
      this._root = this._home;
    }
    this._vb = null;
    requestAnimationFrame(() => this._render());
  }

  /* ---------- Werkzeugleiste ---------- */
  _toolbar() {
    const tb = this._root.querySelector(".tb");
    const ro = !!(this._config && this._config.plan_source && !this._config.plan);
    if (ro) { tb.innerHTML = ""; return ro; }
    tb.innerHTML = TOOLS.map(([k, n]) => `<button class="t ${this._tool === k ? "on" : ""}" data-t="${k}">${n}</button>`).join("") +
      (this._tool === "furniture" ? `<select class="ft">${furnOpts(this._furnType)}</select>` : "") +
      `<span class="sp"></span>
       <button data-a="undo" title="Rückgängig (Strg+Z)" ${this._undo.length ? "" : "disabled"}>↶</button>
       <button data-a="redo" title="Wiederholen (Strg+Y)" ${this._redo.length ? "" : "disabled"}>↷</button>
       <button data-a="fit" title="Ganzen Plan zeigen">⤢</button>
       <span class="vm">${[["2d", "2D"], ["split", "2D + 3D"], ["3d", "3D"]].map(([k, n]) => `<button data-vm="${k}" class="${(this._vmode || "2d") === k ? "on" : ""}">${n}</button>`).join("")}</span>
       <label class="gr"><input type="checkbox" data-a="wsnap" ${this._wsnap === false ? "" : "checked"}> an Wand</label>
       <button data-a="fs" class="fsb" title="Editor auf das ganze Browserfenster vergrößern">${this._fs ? "✕ Fenster verlassen" : "⛶ Ganzes Fenster"}</button>
       <label class="gr">Raster <select data-a="grid">${[1, 5, 10, 25].map((g) => `<option ${g === this._grid ? "selected" : ""}>${g}</option>`).join("")}</select> cm</label>`;
    tb.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { this._tool = b.dataset.t; this._draft = null; this._render(); }));
    const ft = tb.querySelector(".ft"); if (ft) ft.addEventListener("change", () => (this._furnType = ft.value));
    tb.querySelector('[data-a="undo"]').onclick = () => this._doUndo();
    tb.querySelector('[data-a="redo"]').onclick = () => this._doRedo();
    tb.querySelector('[data-a="fit"]').onclick = () => { this._vb = null; this._render(); };
    tb.querySelector('[data-a="fs"]').onclick = () => this._toggleFs();
    tb.querySelectorAll("[data-vm]").forEach((b) => (b.onclick = () => {
      this._vmode = b.dataset.vm; this._show3d = this._vmode !== "2d"; this._vb = null;
      this._root.querySelector(".cv").classList.toggle("only3", this._vmode === "3d");
      if (this._show3d && !this._fs) this._setFs(true);
      if (this._c3) { this._c3.remove(); this._c3 = null; }
      this._render(); this._sync3d(true);
    }));
    tb.querySelector('[data-a="wsnap"]').onchange = (e) => (this._wsnap = e.target.checked);
    tb.querySelector('[data-a="grid"]').onchange = (e) => (this._grid = +e.target.value);
    return false;
  }

  /* ---------- Zeichnen ---------- */
  _bounds() {
    const xs = [], ys = [];
    this._plan.walls.forEach((w) => { xs.push(w.x1, w.x2); ys.push(w.y1, w.y2); });
    this._plan.items.forEach((i) => { xs.push(i.x); ys.push(i.y); });
    this._plan.areas.forEach((a) => a.points.forEach((q) => { xs.push(q[0]); ys.push(q[1]); }));
    const bg = this._config.background;
    if (bg && bg.image) { xs.push(bg.x || 0, (bg.x || 0) + (bg.width || 1000)); ys.push(bg.y || 0); }
    if (!xs.length) return { x: -100, y: -100, w: 1200, h: 800 };
    const x0 = Math.min(...xs) - 80, y0 = Math.min(...ys) - 80;
    return { x: x0, y: y0, w: Math.max(...xs) + 80 - x0, h: Math.max(...ys) + 80 - y0 };
  }
  _render() {
    if (!this._root || !this._plan) return;
    const ro = this._toolbar();
    const svg = this._svg, P = this._plan;
    if (!this._vb) this._vb = this._bounds();
    svg.setAttribute("viewBox", `${this._vb.x} ${this._vb.y} ${this._vb.w} ${this._vb.h}`);
    svg.innerHTML = "";
    const u = this._vb.w / Math.max(300, svg.clientWidth || 800); // Planeinheiten pro Pixel
    this._u = u;
    const bg = this._config.background;
    if (bg && bg.image) mk("image", { href: bg.image, x: bg.x || 0, y: bg.y || 0, width: bg.width || 1000, opacity: bg.opacity ?? 0.5, preserveAspectRatio: "xMinYMin meet" }, svg);
    // Raster
    const gs = this._vb.w > 3000 ? 100 : 50;
    const gg = mk("g", { class: "grid" }, svg);
    for (let x = Math.ceil(this._vb.x / gs) * gs; x < this._vb.x + this._vb.w; x += gs) mk("line", { x1: x, y1: this._vb.y, x2: x, y2: this._vb.y + this._vb.h, "stroke-width": u }, gg);
    for (let y = Math.ceil(this._vb.y / gs) * gs; y < this._vb.y + this._vb.h; y += gs) mk("line", { x1: this._vb.x, y1: y, x2: this._vb.x + this._vb.w, y2: y, "stroke-width": u }, gg);
    const is = (k, i) => this._sel && this._sel.k === k && this._sel.i === i;
    // Räume
    P.areas.forEach((a, i) => {
      const g = mk("g", { class: "area" + (a.outdoor ? " out s-" + (a.surface || "grass") : "") + (is("area", i) ? " sel" : "") + (a.locked ? " lk" : ""), "data-k": "area", "data-i": i }, svg);
      const ap = mk("polygon", { points: a.points.map((q) => q.join(",")).join(" ") }, g);
      const FLc = (window.RaumwerkCatalog || {}).FLOORS || {};
      if (a.floor_color || (a.floor && FLc[a.floor])) { ap.style.fill = a.floor_color || FLc[a.floor].c; ap.style.fillOpacity = 0.35; }
      if (a.wall_color) { ap.style.stroke = a.wall_color; ap.style.strokeWidth = 5 * u; }
      if (a.floor2 && a.split_at != null && a.split_at !== "") {
        const xs = a.points.map((q) => q[0]), ys = a.points.map((q) => q[1]), at = +a.split_at;
        const ln = a.split_axis === "y" ? { x1: Math.min(...xs), y1: at, x2: Math.max(...xs), y2: at } : { x1: at, y1: Math.min(...ys), x2: at, y2: Math.max(...ys) };
        mk("line", { ...ln, stroke: "#f5b544", "stroke-width": 3 * u, "stroke-dasharray": `${8 * u} ${6 * u}`, "pointer-events": "none" }, g);
      }
      const c = a.label || a.points.reduce((s, q) => [s[0] + q[0] / a.points.length, s[1] + q[1] / a.points.length], [0, 0]);
      mk("text", { x: c[0], y: c[1], "font-size": 13 * u, class: "lbl" }, g).textContent = a.name || "Raum";
    });
    // Möbel
    const K = window.RaumwerkCatalog, topOf = (f) => (K ? K.furnZ(f) + K.furnHeight(f) : 0);
    P.furniture.map((f, i) => [f, i]).sort((a, b) => topOf(a[0]) - topOf(b[0])).forEach(([f, i]) => {
      const g = mk("g", { class: "furn" + (is("furniture", i) ? " sel" : "") + (f.locked ? " lk" : ""), "data-k": "furniture", "data-i": i, transform: `translate(${f.x} ${f.y}) rotate(${f.angle || 0})` }, svg);
      if (catE(f.type)) { window.RaumwerkCatalog.drawCat2d(g, f, this._dark(), mk); if (f.type === "k_niche" || f.type === "worktop") g.classList.add("thin"); }
      else if (f.type === "table_round" || f.type === "plant") mk("ellipse", { rx: f.w / 2, ry: f.h / 2, class: "fb" }, g);
      else mk("rect", { x: -f.w / 2, y: -f.h / 2, width: f.w, height: f.h, class: "fb" }, g);
      if (f.type === "stairs") { const n = Math.max(3, Math.round(f.h / 25)); for (let k = 1; k < n; k++) mk("line", { x1: -f.w / 2, x2: f.w / 2, y1: -f.h / 2 + (f.h * k) / n, y2: -f.h / 2 + (f.h * k) / n, class: "det" }, g); }
      mk("text", { y: 4 * u, "font-size": 10 * u, class: "lbl small", transform: (((f.angle || 0) % 360 + 360) % 360 > 90 && ((f.angle || 0) % 360 + 360) % 360 <= 270) ? "rotate(180)" : null }, g).textContent = catE(f.type) && !is("furniture", i) ? "" : (FL()[f.type] || [f.type])[0];
    });
    // Wände
    P.walls.forEach((w, i) => {
      const g = mk("g", { class: "wall" + (is("wall", i) ? " sel" : "") + (w.locked ? " lk" : ""), "data-k": "wall", "data-i": i }, svg);
      mk("line", { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, "stroke-width": this._config.wall_thickness || 12 }, g);
      mk("line", { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, "stroke-width": 30, class: "hitl" }, g);
      if (is("wall", i)) [[w.x1, w.y1, 1], [w.x2, w.y2, 2]].forEach(([x, y, e]) => mk("circle", { cx: x, cy: y, r: 7 * u, class: "hdl", "data-k": "wall", "data-i": i, "data-h": e }, svg));
    });
    // Öffnungen
    P.openings.forEach((o, i) => {
      const a = (o.angle || 0) * Math.PI / 180, dx = Math.cos(a) * o.length / 2, dy = Math.sin(a) * o.length / 2;
      const g = mk("g", { class: "open " + o.type + (is("opening", i) ? " sel" : "") + (o.locked ? " lk" : ""), "data-k": "opening", "data-i": i }, svg);
      mk("line", { x1: o.x - dx, y1: o.y - dy, x2: o.x + dx, y2: o.y + dy, "stroke-width": 10 }, g);
      mk("line", { x1: o.x - dx, y1: o.y - dy, x2: o.x + dx, y2: o.y + dy, "stroke-width": 34, class: "hitl" }, g);
      if (o.entity) mk("circle", { cx: o.x, cy: o.y, r: 4 * u, class: "dot" }, g);
      if (o.type === "door" && o.motion !== "slide") doorLeaves(o).forEach((l) => {
        mk("line", { x1: l.h[0], y1: l.h[1], x2: l.open[0], y2: l.open[1], class: "swl" }, g);
        mk("path", { d: `M${l.tip[0]},${l.tip[1]} A${l.len},${l.len} 0 0 ${l.sweep} ${l.open[0]},${l.open[1]}`, class: "swing" }, g);
      });
    });
    // Lampen & Sensoren
    P.items.forEach((it, i) => {
      if (it.display === "meter") {
        const g = mk("g", { class: "item dev" + (is("item", i) ? " sel" : "") + (it.locked ? " lk" : ""), "data-k": "item", "data-i": i }, svg);
        mk("circle", { cx: it.x, cy: it.y, r: 11 * u }, g); mk("text", { x: it.x, y: it.y + 4 * u, "font-size": 11 * u, class: "lbl ic" }, g).textContent = "⚡";
        return;
      }
      if (it.display === "bins") {
        const g = mk("g", { class: "item bins" + (is("item", i) ? " sel" : "") + (it.locked ? " lk" : ""), "data-k": "item", "data-i": i }, svg);
        (it.bins || [{}]).forEach((b, j, arr) => mk("rect", { x: it.x - (arr.length * 18) / 2 + j * 18, y: it.y - 10, width: 15, height: 20, rx: 3, fill: b.color || "#888" }, g));
        mk("circle", { cx: it.x, cy: it.y, r: 16 * u, class: "hitc" }, g);
        return;
      }
      if (it.display === "car") {
        const L = it.length || 460, W = it.width || 185;
        const g = mk("g", { class: "item car" + (is("item", i) ? " sel" : "") + (it.locked ? " lk" : ""), "data-k": "item", "data-i": i, transform: `translate(${it.x} ${it.y}) rotate(${it.angle || 0})` }, svg);
        mk("rect", { x: -L / 2, y: -W / 2, width: L, height: W, rx: W * 0.28 }, g);
        mk("text", { x: 0, y: 4 * u, "font-size": 12 * u, class: "lbl" }, g).textContent = "🚗 Auto";
        return;
      }
      if (it.display === "camera") {
        const a = ((it.angle || 0) * Math.PI) / 180, f = ((it.fov || 90) * Math.PI) / 180, R = it.range || 600, pts = [[it.x, it.y]];
        for (let k = 0; k <= 12; k++) { const t = a - f / 2 + (f * k) / 12; pts.push([it.x + Math.cos(t) * R, it.y + Math.sin(t) * R]); }
        const g = mk("g", { class: "item cam" + (is("item", i) ? " sel" : "") + (it.locked ? " lk" : "") + (it.entity && this._hass && !this._hass.states[it.entity] ? " bad" : ""), "data-k": "item", "data-i": i }, svg);
        mk("polygon", { points: pts.map((q) => q.join(",")).join(" "), class: "fov" }, g);
        mk("circle", { cx: it.x, cy: it.y, r: 11 * u }, g);
        mk("text", { x: it.x, y: it.y + 4 * u, "font-size": 11 * u, class: "lbl ic" }, g).textContent = "📷";
        return;
      }
      if (WALLI.includes(it.display)) {
        const rad = it.display === "radiator", L = it.length || 100;
        const g = mk("g", { class: "witem " + it.display + (is("item", i) ? " sel" : "") + (it.locked ? " lk" : "") + (it.entity && this._hass && !this._hass.states[it.entity] ? " bad" : ""), "data-k": "item", "data-i": i, transform: `translate(${it.x} ${it.y}) rotate(${it.angle || 0})` }, svg);
        if (rad) mk("rect", { x: -L / 2, y: 0, width: L, height: 9 }, g);
        else mk("rect", { x: -(it.count === 2 ? 8 : 4.5), y: 0, width: it.count === 2 ? 16 : 9, height: 5 }, g);
        mk("circle", { cx: 0, cy: 4, r: 12 * u, class: "hitc" }, g);
        if (!rad) { const an = ((it.angle || 0) * Math.PI) / 180; mk("text", { x: it.x - Math.sin(an) * 16 * u, y: it.y + Math.cos(an) * 16 * u + 3.5 * u, "font-size": 10 * u, class: "lbl small" }, svg).textContent = (it.z ?? 30) + " cm"; }
        return;
      }
      if (["fan", "sensor", "mmwave", "alarm"].includes(it.display)) {
        const g = mk("g", { class: "item dev" + (is("item", i) ? " sel" : "") + (it.locked ? " lk" : ""), "data-k": "item", "data-i": i }, svg);
        if (it.display === "mmwave") { const a = ((it.angle || 0) * Math.PI) / 180, f = ((it.fov || 120) * Math.PI) / 180, R = it.range || 600, pts = [[it.x, it.y]]; for (let k = 0; k <= 12; k++) { const t = a - f / 2 + (f * k) / 12; pts.push([it.x + Math.cos(t) * R, it.y + Math.sin(t) * R]); } mk("polygon", { points: pts.map((q) => q.join(",")).join(" "), class: "fov" }, g); }
        mk("circle", { cx: it.x, cy: it.y, r: 11 * u }, g);
        mk("text", { x: it.x, y: it.y + 4 * u, "font-size": 11 * u, class: "lbl ic" }, g).textContent = it.display === "fan" ? "🌀" : it.display === "sensor" ? it.icon || "🌡️" : it.display === "mmwave" ? "📡" : ({ smoke: "🔥", gas: "💨", water: "💧", co: "☠️" }[it.kind] || "🔥");
        return;
      }
      const dev = it.display === "device" || it.display === "vacuum";
      const sensor = !dev && (!/^(light|switch)\./.test(it.entity || "light.x") || it.display === "ripple");
      const g = mk("g", { class: "item" + (sensor ? " sensor" : "") + (dev ? " dev" : "") + (is("item", i) ? " sel" : "") + (it.locked ? " lk" : "") + (it.entity && this._hass && !this._hass.states[it.entity] ? " bad" : ""), "data-k": "item", "data-i": i }, svg);
      if (!sensor && !dev && is("item", i)) mk("circle", { cx: it.x, cy: it.y, r: it.r || 150, class: "rad" }, g);
      mk("circle", { cx: it.x, cy: it.y, r: 11 * u }, g);
      mk("text", { x: it.x, y: it.y + 4 * u, "font-size": 11 * u, class: "lbl ic" }, g).textContent = it.display === "vacuum" ? "🤖" : dev ? (it.icon || "🔌") : sensor ? "S" : (it.entity || "").startsWith("switch.") ? "⏻" : "L";
    });
    // Raum-Eckpunkte
    if (this._sel && this._sel.k === "area") P.areas[this._sel.i].points.forEach((q, j) => mk("circle", { cx: q[0], cy: q[1], r: 7 * u, class: "hdl", "data-k": "area", "data-i": this._sel.i, "data-h": j }, svg));
    // Entwurf (Wand/Raum)
    if (this._draft) {
      const d = this._draft;
      if (d.type === "wall" && d.cur) mk("line", { x1: d.start[0], y1: d.start[1], x2: d.cur[0], y2: d.cur[1], class: "draft", "stroke-width": 12 }, svg);
      if (d.type === "area") mk("polyline", { points: [...d.pts, d.cur || d.pts[d.pts.length - 1]].map((q) => q.join(",")).join(" "), class: "draft area" }, svg);
      if (d.cur) mk("circle", { cx: d.cur[0], cy: d.cur[1], r: 5 * u, class: "snapdot" }, svg);
    }
    this._hint.textContent = ro ? "" : {
      select: this._show3d ? "3D: antippen = auswählen, Objekt ziehen = verschieben, leere Fläche ziehen = Ansicht verschieben, rechte Maustaste/Umschalt ziehen = drehen, Mausrad = Zoom zur Maus · R = Objekt drehen" : "Antippen = auswählen · ziehen = verschieben · leere Fläche ziehen = Ansicht verschieben · Mausrad = Zoom · R = drehen",
      wall: "Klick = Wandanfang, weitere Klicks = nächste Wand · Esc/Doppelklick = fertig · rastet rechtwinklig und an Ecken ein",
      door: "Klick an eine Wand setzt eine Tür", window: "Klick an eine Wand setzt ein Fenster",
      area: "Ecken anklicken (rasten an Wandecken ein) · ersten Punkt erneut anklicken oder Doppelklick = Raum schließen",
      light: "Klick setzt eine Lampe – Entität unten wählen", sensor: "Klick setzt einen Sensor (Bewegung/Anwesenheit) – Entität unten wählen", device: "Klick setzt ein Gerät (z. B. Steckdose mit Leistungsmessung) oder den Saugroboter",
      furniture: "Möbeltyp wählen, dann Klick setzt es",
      camera: "Klick setzt eine Kamera – Blickrichtung, Winkel und Reichweite unten einstellen",
      radiator: "Klick an die Wand (auf der Raumseite) setzt einen Heizkörper – das Thermostat des Raums wird vorgeschlagen",
      socket: "Klick an die Wand (auf der Raumseite) setzt eine Steckdose – Höhe unten einstellen",
    }[this._tool];
    this._props(ro);
    this._sync3d(false);
  }

  /* ---------- Eigenschaften ---------- */
  _entOpts(domains) {
    const ids = Object.keys((this._hass && this._hass.states) || {}).filter((e) => !domains || domains.includes(e.split(".")[0])).sort();
    return ids.map((e) => `<option value="${e}">${this._esc((this._hass.states[e].attributes.friendly_name) || "")}</option>`).join("");
  }
  _esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  _props(ro) {
    const box = this._root.querySelector(".props");
    if (ro) { box.innerHTML = `<p class="note">Diese Karte liest ihren Plan aus dem Dashboard <b>${this._esc(this._config.plan_source)}</b>. Bearbeite den Plan dort – Änderungen erscheinen hier nach dem Neuladen.</p>`; return; }
    const s = this._sel, P = this._plan;
    if (this._ptab === "cat") return this._catalog(box);
    const f = (lbl, key, val, type = "text", extra = "") => `<label>${lbl}<input data-f="${key}" type="${type}" value="${this._esc(val ?? "")}" ${extra}></label>`;
    const cb = (lbl, key, val) => `<label class="cb"><input data-f="${key}" type="checkbox" ${val ? "checked" : ""}> ${lbl}</label>`;
    const sel = (lbl, key, val, opts) => `<label>${lbl}<select data-f="${key}">${Object.entries(opts).map(([k, v]) => `<option value="${k}" ${String(val ?? "") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>`;
    const ent = (lbl, key, val, domains) => `<label>${lbl}<input data-f="${key}" list="dl-${key}" value="${this._esc(val ?? "")}" placeholder="Entität suchen …"><datalist id="dl-${key}">${this._entOpts(domains)}</datalist></label>`;
    let html = "", title = "";
    if (!s) {
      const bg = this._config.background || {};
      title = "Plan";
      html = `<p class="note">Element antippen, um es zu bearbeiten. Tastatur: Entf = löschen, Strg+Z/Y, Strg+D = duplizieren, Strg+C/X/V = kopieren/ausschneiden/einfügen (an der Maus), Pfeile = verschieben (Umschalt = 10×).</p>
        <h4>Hintergrundbild zum Nachzeichnen</h4>
        ${f("Bild-URL (z. B. /local/grundriss.png)", "bg.image", bg.image)}
        <div class="row">${f("X", "bg.x", bg.x ?? 0, "number")}${f("Y", "bg.y", bg.y ?? 0, "number")}${f("Breite (cm)", "bg.width", bg.width ?? 1000, "number")}${f("Deckkraft", "bg.opacity", bg.opacity ?? 0.5, "number", 'step="0.1" min="0" max="1"')}</div>
        <div class="row">${cb("auch in der Karte anzeigen", "bg.show_in_card", bg.show_in_card)}${cb("auch in 3D (Untergrund)", "bg.show_in_3d", bg.show_in_3d)}</div>
        <p class="note">Bild oder SVG als Untergrund, z. B. /local/grundriss.svg.</p>
        <h4>Darstellung</h4>
        <div class="row">${sel("Effekte 3D (Schatten, Leuchten)", "cfg.effects", this._config.effects == null ? "" : String(this._config.effects), { "": "automatisch (aus im Kiosk)", true: "an", false: "aus" })}${sel("Symbole", "cfg.icons", this._config.icons || "", { "": "ruhig (aus = Punkt)", all: "alle groß" })}</div>
        <div class="row">${sel("Himmel & Tageslicht 3D", "cfg.sky", this._config.sky === false ? "false" : "", { "": "an", false: "aus" })}${sel("Szene hell/dunkel", "cfg.scene_light", this._config.scene_light || "", { "": "nach Tageszeit", theme: "nach HA-Design" })}</div>
        <div class="row">${sel("Tippen auf Lampe", "cfg.tap_action", this._config.tap_action || "", { "": "Steuerblase (sicher)", toggle: "sofort schalten" })}${sel("Außenbereich beim Start", "cfg.outdoor", this._config.outdoor == null ? "" : String(this._config.outdoor), { "": "automatisch (Handy aus)", true: "an", false: "aus" })}${sel("Enge Symbole gruppieren", "cfg.cluster", this._config.cluster === false ? "false" : "", { "": "ja", false: "nein" })}</div>
        <div class="row">${sel("Farbthema", "cfg.skin", this._config.skin || "", { "": "Standard", real: "Realistisch", pixel: "Pixel-Abenteuer", blueprint: "Blaupause", neon: "Neon", paper: "Papier", mono: "Schwarz-Weiß" })}${sel("Lampenschatten (3D, Effekte)", "cfg.lamp_shadows", this._config.lamp_shadows == null ? "" : String(this._config.lamp_shadows), { "": "2 Lampen", 0: "aus", 1: "1", 3: "3", 4: "4", 6: "6" })}</div>
        <div class="row">${sel("Dach-Knopf 3D", "cfg.roof", this._config.roof === false ? "false" : "", { "": "an", false: "aus" })}${f("Dachneigung °", "roof.pitch", (this._config.roof || {}).pitch ?? 35, "number")}${this._clr("Dachfarbe", "roof.color", (this._config.roof || {}).color, "#3c4045")}</div>
        <div class="row">${sel("Sonnenlicht durch Fenster", "cfg.sunlight", this._config.sunlight === false ? "false" : "", { "": "an", false: "aus" })}${sel("Sonnenstudie ☀", "cfg.sun_study", this._config.sun_study === false ? "false" : "", { "": "an", false: "aus" })}${sel("Licht-Pinsel 🖌", "cfg.brush", this._config.brush === false ? "false" : "", { "": "an", false: "aus" })}</div>
        ${f("Personen (leer = alle, - = keine; person.x oder person.x=Raumsensor, mit ;)", "cfg_persons", this._config.persons === false ? "-" : Array.isArray(this._config.persons) ? this._config.persons.map((p) => (typeof p === "string" ? p : p.entity + (p.room ? "=" + p.room : ""))).join("; ") : "")}
        ${this._config.skin === "real" ? f("Realistisch: 3D-Modelle je Möbeltyp (z. B. sofa=/local/modelle/sofa.glb; bed=/local/modelle/bett.glb)", "cfg_models", Object.entries(this._config.models || {}).map(([k, v]) => k + "=" + v).join("; ")) : ""}
        <h4>Etagen</h4>
        <div class="row">${sel("Bearbeite Etage", "_lvl", String(this._lvl || 0), Object.fromEntries(this._lvNames().map((n, i) => [String(i), n])))}${f("Name dieser Etage", "_lvname", this._lvNames()[this._lvl || 0])}<button data-a="addlv">+ Etage</button>${this._lvl ? `<button data-a="dellv" class="danger">Etage löschen</button>` : ""}</div>
        <p class="note">Jede Etage ist ein eigener Plan. In der Karte erscheint ein Etagen-Umschalter, sobald es mehr als eine gibt. Neue Etagen übernehmen die Außenwände.</p>
        <p class="note">Zählung: ${P.walls.length} Wände · ${P.openings.length} Türen/Fenster · ${P.areas.length} Räume · ${P.items.length} Lampen/Sensoren · ${P.furniture.length} Möbel</p>`;
    } else {
      const o = s.k === "wall" ? P.walls[s.i] : s.k === "opening" ? P.openings[s.i] : s.k === "furniture" ? P.furniture[s.i] : s.k === "item" ? P.items[s.i] : P.areas[s.i];
      if (!o) { this._sel = null; return this._props(); }
      if (s.k === "wall") {
        title = "Wand";
        html = `<div class="row">${f("x1", "x1", r1(o.x1), "number")}${f("y1", "y1", r1(o.y1), "number")}${f("x2", "x2", r1(o.x2), "number")}${f("y2", "y2", r1(o.y2), "number")}</div><p class="note">Länge ${Math.round(dist([o.x1, o.y1], [o.x2, o.y2]))} cm</p>
          ${this._wallFinishProps(o, sel)}`;
      } else if (s.k === "opening") {
        title = o.type === "window" ? "Fenster" : "Tür";
        html = `<div class="row">${sel("Art", "type", o.type, { door: "Tür", window: "Fenster" })}${f("Breite (cm)", "length", o.length, "number")}${o.type === "window" ? f("Brüstungshöhe (cm)", "sill_cm", Math.round((o.sill ?? 0.3) * (this._config.room_height || 260)), "number", 'step="5" min="0" max="190"') : ""}</div>
          ${ent("Kontaktsensor", "entity", o.entity, ["binary_sensor", "cover", "lock"])}
          ${o.type === "window" ? ent("Rollladen (cover, optional)", "cover", o.cover, ["cover"]) : ""}
          ${f("Name", "name", o.name)}
          ${o.type === "door" ? this._doorProps(o, sel, cb) : ""}`;
      } else if (s.k === "furniture") {
        title = (FL()[o.type] || [o.type])[0];
        const ce = catE(o.type), K = window.RaumwerkCatalog;
        html = `<div class="row"><label>Typ<select data-f="type">${furnOpts(o.type)}</select></label>${f("Breite (cm)", "w", o.w, "number")}${f("Tiefe (cm)", "h", o.h, "number")}${f("Winkel °", "angle", o.angle || 0, "number")}<button data-a="rot">↻ 90°</button></div>
          ${ce ? `<div class="row">${f("Höhe (cm)", "height", K.furnHeight(o), "number")}${f("Höhe über Boden (cm)", "z", K.furnZ(o), "number")}<button data-a="stack" title="Auf das Möbel darunter stellen (z. B. Drucker auf die Arbeitsplatte)">⤒ auf Möbel darunter</button></div>
          <p class="note">Gestrichelte Kante = Vorderseite. Die Rückseite gehört an die Wand. Kleingeräte (Monitor, Kaffeemaschine, Drucker …) stellen sich beim Absetzen automatisch auf das Möbel darunter.</p>` : ""}
          ${o.type === "model" ? `<div class="row">${f("Modell-URL (.glb/.gltf/.obj, z. B. /local/modelle/sofa.glb)", "url", o.url)}${f("Skalierung (leer = in Breite×Tiefe einpassen)", "scale", o.scale ?? "", "number", 'step="0.01"')}${f("Höhe über Boden (cm)", "z", o.z ?? 0, "number")}</div><p class="note">Datei nach /homeassistant/www/… legen. Der Loader wird beim ersten Modell aus dem Internet (jsDelivr) nachgeladen.</p>` : ""}
          ${["tree", "conifer", "hedge"].includes(o.type) ? f("Höhe (cm)", "height", o.height ?? (o.type === "hedge" ? 160 : o.type === "conifer" ? 450 : 520), "number") : ""}
          ${ent("Entität (optional, z. B. Pflanze)", "entity", o.entity)}`;
      } else if (s.k === "item") {
        const sensor = o.display === "ripple";
        title = o.display === "vacuum" ? "Saugroboter" : o.display === "device" ? "Gerät" : sensor ? "Sensor" : "Lampe";
        if (o.display === "meter") {
          title = "Stromzähler";
          html = `<p class="note">Startpunkt der Stromflüsse (Ansicht „Strom“). Leistung und Tagesverbrauch kommen aus der Kartenoption <code>energy</code> (total/today).</p>`;
        } else if (o.display === "bins") {
          title = "Mülltonnen";
          html = `${ent("„Rausgestellt“-Schalter (input_boolean, optional)", "done", o.done, ["input_boolean"])}
            ${f("Tonnen: Sensor=Name=Farbe, durch ; getrennt", "bins_txt", (o.bins || []).map((b) => `${b.entity}=${b.name || ""}=${b.color || ""}`).join("; "))}
            <div class="row">${f("Winkel °", "angle", o.angle || 0, "number")}</div>
            <p class="note">Sensoren aus „Waste Collection Schedule“. Am Vortag der Abholung (und am Abholtag bis 12 Uhr) blinken die Tonnen; Antippen setzt „rausgestellt“.</p>`;
        } else if (o.display === "car") {
          title = "Auto";
          html = `${ent("Auto erkannt (z. B. Kamera-Erkennung)", "entity", o.entity, ["binary_sensor", "device_tracker", "person"])}
            <div class="row">${ent("Ladeleistung (W/kW, optional)", "power", o.power, ["sensor"])}${ent("Wallbox-Schalter (optional)", "power_switch", o.power_switch, ["switch"])}</div>
            <div class="row">${f("Länge (cm)", "length", o.length ?? 460, "number")}${f("Breite (cm)", "width", o.width ?? 185, "number")}${f("Winkel °", "angle", o.angle || 0, "number")}${f("Farbe (#rrggbb)", "color", o.color || "")}</div>
            <p class="note">Ohne erkanntes Auto zeigt der Plan einen gestrichelten freien Stellplatz. Lädt es (über 100 W), leuchtet es grün mit Leistung. Antippen öffnet die Wallbox bzw. die Erkennung.</p>`;
        } else if (o.display === "fan") {
          title = "Ventilator";
          html = `${ent("Ventilator (fan, switch …)", "entity", o.entity, ["fan", "switch", "input_boolean"])}<div class="row">${f("Name", "name", o.name)}${f("Flügel-Radius 3D (cm)", "r", o.r ?? 60, "number")}${f("Höhe in 3D (cm)", "z", o.z ?? "", "number")}</div>
            <p class="note">Dreht sich, solange er läuft – bei fan-Entitäten je nach Geschwindigkeit (Prozent).</p>`;
        } else if (o.display === "sensor") {
          title = "Messwerte";
          html = `<div class="row">${f("Symbol (Emoji)", "icon", o.icon || "🌡️")}${f("Höhe in 3D (cm)", "z", o.z ?? "", "number")}</div>
            ${f("Werte: Sensor oder Sensor=Beschriftung, mit ; getrennt", "values_txt", [].concat(o.values || []).map((x) => (typeof x === "string" ? x : x.entity + (x.label ? "=" + x.label : ""))).join("; "), "text", 'list="dl-values"')}<datalist id="dl-values">${this._entOpts(["sensor"])}</datalist>
            <p class="note">Z. B. Temperatur, Luftfeuchte und CO₂ in einer Pille: <code>sensor.temp; sensor.feuchte=rF; sensor.co2</code>.</p>`;
        } else if (o.display === "mmwave") {
          title = "mmWave-Sensor";
          html = `${ent("Anwesenheit (optional)", "entity", o.entity, ["binary_sensor"])}
            <div class="row">${f("Blickrichtung °", "angle", o.angle || 0, "number")}<button data-a="rot45">↻ 45°</button>${f("Öffnungswinkel °", "fov", o.fov ?? 120, "number")}${f("Reichweite (cm)", "range", o.range ?? 600, "number")}</div>
            ${f("Ziele: X-Sensor,Y-Sensor; … (z. B. LD2450 target_1_x,target_1_y)", "targets_txt", [].concat(o.targets || []).map((t) => (typeof t === "string" ? t : t.x + "," + t.y)).join("; "))}
            <div class="row">${sel("Einheit der Sensoren", "unit", o.unit || "", { "": "mm", cm: "cm", m: "m" })}${cb("Seiten spiegeln", "mirror", o.mirror)}</div>
            <p class="note">X = seitlich, Y = Abstand nach vorn. Punkte bewegen sich im Plan mit; 0/0 oder „nicht verfügbar“ = kein Ziel.</p>`;
        } else if (o.display === "alarm") {
          title = "Melder";
          html = `<div class="row">${sel("Art", "kind", o.kind || "smoke", { smoke: "Rauch", gas: "Gas", water: "Wasser", co: "Kohlenmonoxid" })}${f("Höhe in 3D (cm)", "z", o.z ?? "", "number")}</div>${ent("Melder (binary_sensor)", "entity", o.entity, ["binary_sensor"])}
            <p class="note">Bei Alarm: roter Hinweis oben, der Raum blinkt rot (2D und 3D).</p>`;
        } else if (o.display === "camera") {
          title = "Kamera";
          html = `<div class="row">${ent("Kamera", "entity", o.entity, ["camera"])}${f("Name", "name", o.name)}</div>
            <div class="row">${f("Blickrichtung °", "angle", o.angle || 0, "number")}<button data-a="rot45">↻ 45°</button>${f("Öffnungswinkel °", "fov", o.fov ?? 90, "number")}${f("Reichweite (cm)", "range", o.range ?? 600, "number")}</div>
            <div class="row">${ent("Erkennung (Person/Bewegung, mehrere mit Komma)", "motion", [].concat(o.motion || []).join(", "), ["binary_sensor"])}${ent("Scheinwerfer (optional)", "light", [].concat(o.light || []).join(", "), ["light", "switch"])}</div>
            <div class="row">${["person", "car", "animal"].map((k) => ent({ person: "Erkennung Person", car: "Erkennung Fahrzeug", animal: "Erkennung Tier" }[k], "det_" + k, (o.detect || {})[k], ["binary_sensor"])).join("")}</div>
            <p class="note">Blickkegel: blau = ruhig, gelb = Scheinwerfer an, rot blinkend = Erkennung. Antippen in der Karte öffnet das Kamerabild. Richtung 0° = rechts, 90° = unten, 180° = links, 270° = oben.</p>`;
        } else if (WALLI.includes(o.display)) {
          title = o.display === "radiator" ? "Heizkörper" : "Steckdose";
          html = o.display === "radiator"
            ? `${ent("Thermostat", "entity", o.entity, ["climate"])}<div class="row">${f("Länge (cm)", "length", o.length ?? 100, "number")}${f("Höhe (cm)", "height", o.height ?? 60, "number")}${f("Abstand zum Boden (cm)", "z", o.z ?? 15, "number")}</div>
              <p class="note">Leuchtet orange, solange das Thermostat heizt. Hängt an der Wand – beim Ziehen rastet er an der nächsten Wand ein.</p>`
            : `${ent("Schaltbare Steckdose (optional)", "entity", o.entity, ["switch", "light", "input_boolean"])}<div class="row">${f("Höhe über Boden (cm)", "z", o.z ?? 30, "number")}${sel("Ausführung", "count", String(o.count || 1), { 1: "Einfach", 2: "Doppelt" })}</div>
              <p class="note">Üblich: Steckdose 30 cm, über der Arbeitsplatte 105–115 cm, Lichtschalter 105 cm. Ohne Entität nur zur Planung sichtbar.</p>`;
        } else if (o.display === "device" || o.display === "vacuum") {
          html = `<div class="row">${sel("Art", "display", o.display, { device: "Gerät", vacuum: "Saugroboter" })}${f("Name", "name", o.name)}</div>`;
          if (o.display === "vacuum") html += `${ent("Saugroboter", "entity", o.entity, ["vacuum"])}${ent("Sensor „aktueller Raum“", "room_sensor", o.room_sensor, ["sensor"])}
            ${f("Raum-Zuordnung (Robotername = Raum-ID, durch Komma getrennt)", "rooms_txt", Object.entries(o.rooms || {}).map(([k, v]) => `${k}=${v}`).join(", "))}
            <p class="note">Die Position des Symbols ist die Ladestation. Raum-IDs: ${P.areas.map((a) => this._esc(a.id)).join(", ")}</p>`;
          else html += `${ent("Entität (Leistung in W, Schalter, Mediaplayer …)", "entity", o.entity)}
            <div class="row">${f("Symbol (Emoji)", "icon", o.icon || "🔌")}${f("Läuft ab (W)", "power_on", o.power_on ?? 5, "number")}${f("Höhe in 3D (cm)", "z", o.z ?? "", "number")}</div>
            ${ent("Endzeit-Sensor (optional, zeigt Restzeit)", "end", o.end, ["sensor"])}
            ${ent("Weitere Player (z. B. Spotify, mit Komma)", "also", [].concat(o.also || []).join(", "), ["media_player"])}
            <p class="note">Bei Leistungssensoren gilt das Gerät ab dem Schwellwert als „läuft“, sonst bei Zustand an/läuft/spielt.</p>`;
        } else html = sensor ? `${ent("Bewegungs-/Anwesenheitssensor", "entity", o.entity, ["binary_sensor", "person", "device_tracker"])}${f("Wellen-Radius (cm)", "r", o.r ?? 120, "number")}`
          : `${ent("Lampe / Schalter", "entity", o.entity, ["light", "switch", "input_boolean", "fan"])}
            <div class="row">${f("Name", "name", o.name)}${sel("Lichttyp", "light_type", o.light_type || "ceiling", LTYPES)}${f("Lichtradius (cm)", "r", o.r ?? 150, "number")}</div>
            ${o.light_type === "strip" ? `<div class="row">${f("Streifenlänge (cm)", "length", o.length ?? 200, "number")}${f("Winkel °", "angle", o.angle || 0, "number")}</div>` : ""}
            ${f("Höhe in 3D (cm, leer = automatisch)", "z", o.z ?? "", "number")}`;
        if (o.entity && h_missing(this._hass, o.entity)) html = `<p class="warn">Entität „${this._esc(o.entity)}“ gibt es nicht.</p>` + html;
      } else if (s.k === "area") {
        title = "Raum";
        const areas = Object.fromEntries([["", "– kein HA-Bereich –"], ...Object.values((this._hass && this._hass.areas) || {}).map((a) => [a.area_id, a.name])]);
        html = `<div class="row">${f("Name", "name", o.name)}${sel("HA-Bereich", "ha_area", o.ha_area || "", areas)}</div>
          ${f("Nur diese Entitäten im Raum-Fenster (optional, mit Komma)", "entities", [].concat(o.entities || []).join(", "))}
          <div class="row">${cb("Außenbereich (Garten, Carport …)", "outdoor", o.outdoor)}${o.outdoor ? sel("Boden", "surface", o.surface || "grass", SURFN) + cb("Name ausblenden", "hide_label", o.hide_label) : ""}</div>
          ${this._floorProps(o, sel)}
          ${ent("Temperatursensor", "temperature", o.temperature, ["sensor"])}
          <div class="row">${ent("Luftfeuchte-Sensor", "humidity", o.humidity, ["sensor"])}${ent("CO₂-Sensor", "co2", o.co2, ["sensor"])}</div>
          <div class="row">${ent("Helligkeitssensor (lx, mehrere mit Komma)", "illuminance", [].concat(o.illuminance || []).join(", "), ["sensor"])}${ent("Anwesenheit (mehrere mit Komma)", "presence", [].concat(o.presence || []).join(", "), ["binary_sensor", "person", "device_tracker"])}</div>
          <p class="note">${o.points.length} Ecken. Eckpunkt ziehen zum Anpassen. Beschriftung: ${o.label ? `fest (${o.label.map(Math.round).join(", ")}) <button data-a="unlabel">automatisch</button>` : "automatisch"}</p>`;
      }
      html += `<div class="acts">${cb("Fixiert (nicht verschiebbar)", "locked", o.locked)}<span class="sp"></span><button data-a="dup">Duplizieren</button><button data-a="del" class="danger">Löschen</button></div>`;
    }
    box.innerHTML = this._tabs() + `<h3>${title}</h3>${html}`;
    this._bindTabs(box);
    box.querySelectorAll("[data-f]").forEach((inp) => inp.addEventListener("change", () => this._setField(inp)));
    const a = (n, fn) => { const b = box.querySelector(`[data-a="${n}"]`); if (b) b.onclick = fn; };
    a("del", () => this._delete()); a("dup", () => this._duplicate());
    a("rot", () => this._change(() => { const o = P.furniture[s.i]; o.angle = ((o.angle || 0) + 90) % 360; }));
    a("rot45", () => this._change(() => { const o = P.items[s.i]; o.angle = (((o.angle || 0) + 45) % 360); }));
    a("stack", () => this._change(() => { const o = P.furniture[s.i], z = this._stackZ(o); if (z > 0) o.z = z; else o.z = 0; }));
    a("unlabel", () => this._change(() => delete P.areas[s.i].label));
    ["floor_color", "wall_color", "floor2_color"].forEach((k) => a("clr_" + k, () => this._change(() => delete P.areas[s.i][k])));
    a("clr_roof.color", () => { const r = { ...(this._config.roof || {}) }; delete r.color; this._self = true; this._config = { ...this._config, roof: r }; this._commit(); this._render(); });
    a("addlv", () => this._addLevel()); a("dellv", () => this._delLevel());
    a("clr_color", () => this._change(() => delete P.walls[s.i].color));
    a("swing", () => this._change(() => { const o = P.openings[s.i], st = (o.flipV ? 2 : 0) + (o.flipH ? 1 : 0), nx = (st + 1) % 4; if (nx & 2) o.flipV = true; else delete o.flipV; if (nx & 1) o.flipH = true; else delete o.flipH; }));
  }
  _dark() { return !!(this._hass && this._hass.themes && this._hass.themes.darkMode); }
  _clr(lbl, key, val, d) { return `<label>${lbl}<span class="clr"><input data-f="${key}" type="color" value="${this._esc(val || d)}">${val ? `<button data-a="clr_${key}" title="zurücksetzen">✕</button>` : `<i>Standard</i>`}</span></label>`; }
  _wallFinishProps(o, sel) {
    const a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), nx = -Math.sin(a), ny = Math.cos(a), mx = (o.x1 + o.x2) / 2, my = (o.y1 + o.y2) / 2;
    const side = (k) => this._plan.areas.find((r) => !r.outdoor && pip(mx + nx * 30 * k, my + ny * 30 * k, r.points));
    const opts = { "": "beide Seiten" };
    [side(1), side(-1)].filter(Boolean).forEach((r) => (opts[r.id] = "nur " + (r.name || r.id)));
    return `<h4>Oberfläche</h4><div class="row">${sel("Art", "finish", o.finish || "", { "": "wie der Raum", paint: "Farbe", brick: "Ziegel" })}${o.finish ? this._clr("Farbe", "color", o.color, o.finish === "brick" ? "#d6c296" : "#f3f1ec") + sel("Gilt für", "side", o.side || "", opts) : ""}</div>
      <p class="note">Z. B. eine farbige Wand im Schlafzimmer: Art „Farbe“, Farbe wählen, „nur Schlafzimmer“.</p>`;
  }
  _floorProps(o, sel) {
    const K = window.RaumwerkCatalog || {}, FL = K.FLOORS || {};
    const opts = { "": o.outdoor ? "automatisch (nach Boden)" : "einfarbig (Standard)", ...Object.fromEntries(Object.entries(FL).filter(([, v]) => !v.hide).map(([k, v]) => [k, v.n])) };
    const kind = o.floor || (o.outdoor && K.SURF_FLOOR ? K.SURF_FLOOR[o.surface || "grass"] : "");
    const def = (FL[kind] && FL[kind].c) || "#a0968a";
    const clr = (lbl, key, val, d) => `<label>${lbl}<span class="clr"><input data-f="${key}" type="color" value="${this._esc(val || d)}">${val ? `<button data-a="clr_${key}" title="zurücksetzen">✕</button>` : `<i>Standard</i>`}</span></label>`;
    const opts2 = { "": "– kein zweiter Boden –", ...Object.fromEntries(Object.entries(FL).filter(([, v]) => !v.hide).map(([k, v]) => [k, v.n])) };
    const k2 = o.floor2, def2 = (FL[k2] && FL[k2].c) || "#a0968a";
    return `<div class="row">${sel(o.outdoor ? "Belag (Muster)" : "Bodenbelag", "floor", o.floor || "", opts)}${kind ? clr("Bodenfarbe", "floor_color", o.floor_color, def) : ""}${kind ? sel("Verlegung", "floor_angle", String(o.floor_angle || ""), { "": "0°", 90: "90° gedreht", 45: "45° diagonal" }) : ""}</div>
      <div class="row">${sel("Zweiter Boden (Bodenwechsel)", "floor2", o.floor2 || "", opts2)}${k2 ? clr("Farbe", "floor2_color", o.floor2_color, def2) + sel("Verlegung", "floor2_angle", String(o.floor2_angle || ""), { "": "0°", 90: "90°", 45: "45°" }) : ""}</div>
      ${k2 ? `<div class="row">${sel("Wechsel an", "split_axis", o.split_axis || "x", { x: "senkrechter Linie (X)", y: "waagerechter Linie (Y)" })}${`<label>Position (cm)<input data-f="split_at" type="number" value="${this._esc(o.split_at ?? "")}"></label>`}${sel("Zweiter Boden liegt", "split_side", o.split_side || ">", (o.split_axis || "x") === "x" ? { ">": "rechts davon", "<": "links davon" } : { ">": "darunter", "<": "darüber" })}</div>` : ""}
      ${o.outdoor ? "" : `<div class="row">${sel("Wände", "wall_finish", o.wall_finish || "", { "": "Farbe", brick: "Ziegel" })}${clr(o.wall_finish === "brick" ? "Ziegelfarbe" : "Wandfarbe (innen)", "wall_color", o.wall_color, o.wall_finish === "brick" ? "#d6c296" : "#efe9df")}</div>`}`;
  }
  // Oberkante des höchsten Möbels unter dem Mittelpunkt von f (0 = Boden)
  _stackZ(f) {
    const K = window.RaumwerkCatalog; if (!K) return 0;
    let best = 0;
    for (const g of this._plan.furniture) {
      if (g === f || !K.CATALOG[g.type]) continue;
      const a = (-(g.angle || 0) * Math.PI) / 180, dx = f.x - g.x, dy = f.y - g.y;
      const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= g.w / 2 && Math.abs(ly) <= g.h / 2) { const top = K.furnZ(g) + K.furnHeight(g); if (top > best && top < 200) best = top; }
    }
    return Math.round(best);
  }
  _autoStack(f) { const z = this._stackZ(f); if (z > 0) f.z = z; else f.z = 0; }
  _sideRooms(o) {
    const a = ((o.angle || 0) * Math.PI) / 180, nx = -Math.sin(a), ny = Math.cos(a);
    const at = (k) => { const ar = this._plan.areas.find((r) => pip(o.x + nx * 30 * k, o.y + ny * 30 * k, r.points)); return ar ? ar.name || ar.id : null; };
    return { 1: at(1), "-1": at(-1) };
  }
  _doorProps(o, sel, cb) {
    const sr = this._sideRooms(o), s = o.flipV ? 1 : -1, left = (o.flipH ? -1 : 1) === s;
    const side = sel("Öffnet in", "_side", String(s), { 1: sr[1] || "Außen", "-1": sr["-1"] || "Außen" });
    const din = o.sash === "double" ? "" : sel("Anschlag (Bänder)", "_din", left ? "l" : "r", { l: "links (DIN links)", r: "rechts (DIN rechts)" });
    return `<div class="row">${side}${din}<button data-a="swing" title="Alle Varianten durchschalten">↻ Variante</button></div>
      <p class="note">Gestrichelt = so geht die Tür auf. DIN links/rechts: Seite der Bänder, wenn du in dem Raum stehst, in den die Tür aufgeht.</p>
      <div class="row">${cb("Zweiflügelig", "sash", o.sash === "double")}${cb("Schiebetür", "motion", o.motion === "slide")}${cb("Verglast", "glazed", o.glazed)}</div>`;
  }
  _setDoor(o, s, left) {
    if (s > 0) o.flipV = true; else delete o.flipV;
    if ((left ? s : -s) < 0) o.flipH = true; else delete o.flipH;
  }
  _wallSnap(p, it) {
    const w = this._nearestWall(p);
    if (!w || w.d > 80) return false;
    const a = (w.ang * Math.PI) / 180, nx = -Math.sin(a), ny = Math.cos(a);
    const side = (p[0] - w.q[0]) * nx + (p[1] - w.q[1]) * ny >= 0 ? 1 : -1, T = (this._config.wall_thickness || 12) / 2;
    it.x = r1(w.q[0] + nx * side * T); it.y = r1(w.q[1] + ny * side * T); it.angle = r1(side > 0 ? w.ang : w.ang + 180);
    return true;
  }
  _guessClimate(it) {
    const h = this._hass; if (!h || !h.entities) return "";
    const a = ((it.angle || 0) * Math.PI) / 180, px = it.x - Math.sin(a) * 40, py = it.y + Math.cos(a) * 40;
    const ar = this._plan.areas.find((r) => pip(px, py, r.points));
    if (!ar || !ar.ha_area) return "";
    const ids = Object.keys(h.states).filter((e) => e.startsWith("climate.")).filter((e) => { const en = h.entities[e]; if (!en) return false; const dv = en.device_id && h.devices && h.devices[en.device_id]; return (en.area_id || (dv && dv.area_id)) === ar.ha_area; });
    const used = new Set(this._plan.items.map((i) => i.entity));
    const free = ids.filter((e) => !used.has(e));
    return free.length ? free[0] : "";
  }
  /* ---------- Katalog (Ziehen und Ablegen) ---------- */
  _tabs() { return `<div class="ptabs"><button data-pt="props" class="${this._ptab !== "cat" ? "on" : ""}">Eigenschaften</button><button data-pt="cat" class="${this._ptab === "cat" ? "on" : ""}">Katalog</button></div>`; }
  _bindTabs(box) { box.querySelectorAll("[data-pt]").forEach((b) => (b.onclick = () => { this._ptab = b.dataset.pt; this._props(); })); }
  _catEntries() {
    const out = [];
    for (const [k, v] of Object.entries(FL())) out.push({ kind: "furn", type: k, name: v[0], group: v[3] });
    out.push({ kind: "item", type: "light", name: "Lampe", group: "Technik" }, { kind: "item", type: "radiator", name: "Heizkörper", group: "Technik" },
      { kind: "item", type: "socket", name: "Steckdose", group: "Technik" }, { kind: "item", type: "camera", name: "Kamera", group: "Technik" }, { kind: "item", type: "car", name: "Auto / Stellplatz", group: "Technik" }, { kind: "item", type: "bins", name: "Mülltonnen", group: "Technik" }, { kind: "item", type: "meter", name: "Stromzähler", group: "Technik" },
      { kind: "item", type: "device", name: "Gerät (Leistung)", group: "Technik" }, { kind: "item", type: "fan", name: "Ventilator", group: "Technik" },
      { kind: "item", type: "sensor", name: "Messwerte (mehrere)", group: "Technik" }, { kind: "item", type: "mmwave", name: "mmWave-Sensor", group: "Technik" }, { kind: "item", type: "alarm", name: "Rauch/Gas/Wasser-Melder", group: "Technik" });
    return out;
  }
  _catalog(box) {
    const q = (this._catQ || "").toLowerCase(), groups = {};
    this._catEntries().filter((e) => !q || e.name.toLowerCase().includes(q)).forEach((e) => (groups[e.group] = groups[e.group] || []).push(e));
    box.innerHTML = this._tabs() + `<input class="catq" placeholder="Suchen …" value="${this._esc(this._catQ || "")}">
      <p class="note">${this._show3d ? "Ziehen in die 3D- oder 2D-Ansicht · Antippen = in die Mitte der 3D-Ansicht" : "Ziehen in den Plan · Antippen = Werkzeug wählen, dann in den Plan klicken"}</p>` +
      Object.entries(groups).map(([g, l]) => `<h4>${g}</h4><div class="cgrid">${l.map((e) => `<div class="ctile" data-ck="${e.kind}" data-ct="${e.type}" title="${this._esc(e.name)}"><svg class="cth"></svg><span>${this._esc(e.name)}</span></div>`).join("")}</div>`).join("");
    this._bindTabs(box);
    const qi = box.querySelector(".catq");
    qi.oninput = () => { this._catQ = qi.value; const pos = qi.selectionStart; this._catalog(box); const n = box.querySelector(".catq"); n.focus(); n.setSelectionRange(pos, pos); };
    const K = window.RaumwerkCatalog;
    box.querySelectorAll(".ctile").forEach((t) => {
      const sv = t.querySelector("svg"), kind = t.dataset.ck, type = t.dataset.ct;
      if (kind === "furn") {
        const d = FL()[type], w = d[1], h = d[2], m = Math.max(w, h) * 0.6;
        sv.setAttribute("viewBox", `${-w / 2 - m * 0.1} ${-h / 2 - m * 0.1} ${w + m * 0.2} ${h + m * 0.2}`);
        if (K && K.CATALOG[type]) K.drawCat2d(sv, { type, w, h, angle: 0 }, this._dark(), mk);
        else mk("rect", { x: -w / 2, y: -h / 2, width: w, height: h, class: "fb" }, sv);
      } else {
        sv.setAttribute("viewBox", "-12 -12 24 24");
        mk("text", { x: 0, y: 6, "font-size": 16, "text-anchor": "middle" }, sv).textContent = { light: "💡", radiator: "♨️", socket: "🔌", camera: "📷", device: "⚡", car: "🚗", bins: "🗑️", meter: "🔋" }[type];
      }
      t.addEventListener("pointerdown", (ev) => this._catDrag(ev, t, kind, type));
    });
  }
  _catDrag(ev, tile, kind, type) {
    ev.preventDefault();
    const sx = ev.clientX, sy = ev.clientY;
    let ghost = null;
    const move = (e) => {
      if (!ghost && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) {
        ghost = tile.cloneNode(true); ghost.classList.add("ghost");
        this._root.querySelector(".ed").appendChild(ghost);
      }
      if (ghost) { ghost.style.left = e.clientX - 34 + "px"; ghost.style.top = e.clientY - 34 + "px"; }
    };
    const up = (e) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      if (ghost) { ghost.remove(); this._dropCat(kind, type, e.clientX, e.clientY); }
      else this._dropCat(kind, type, null, null);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  _dropCat(kind, type, cx, cy) {
    let p = null;
    if (cx != null) {
      if (this._c3 && this._c3.editGround) p = this._c3.editGround(cx, cy);
      if (!p && !this._root.querySelector(".cv").classList.contains("only3")) {
        const r = this._svg.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) p = this._pt({ clientX: cx, clientY: cy });
      }
      if (!p) { this._flash("Bitte in die 2D- oder 3D-Ansicht ziehen."); return; }
    } else if (this._c3 && this._c3.editCenter) p = this._c3.editCenter();
    if (!p) { // ohne 3D: Werkzeug wählen
      if (kind === "furn") { this._furnType = type; this._tool = "furniture"; } else this._tool = type === "light" ? "light" : type;
      this._ptab = "props"; this._render(); return;
    }
    const P = this._plan, q = [this._g(p[0]), this._g(p[1])];
    if (kind === "furn") {
      const d = FL()[type], nf = { id: `${type}_${Date.now().toString(36)}`, type, x: q[0], y: q[1], w: d[1], h: d[2], angle: 0 };
      this._afterFurnMove(nf);
      this._change(() => P.furniture.push(nf));
      this._sel = { k: "furniture", i: P.furniture.length - 1 };
    } else {
      let it;
      if (type === "light") it = { entity: "", x: q[0], y: q[1], r: 150 };
      else if (type === "camera") it = { display: "camera", entity: "", x: q[0], y: q[1], angle: 0, fov: 90, range: 600 };
      else if (type === "car") it = { display: "car", entity: "", x: q[0], y: q[1], angle: 90 };
      else if (type === "bins") it = { display: "bins", x: q[0], y: q[1], bins: [] };
      else if (type === "meter") { if (P.items.some((x) => x.display === "meter")) { this._flash("Es gibt schon einen Stromzähler."); return; } it = { display: "meter", x: q[0], y: q[1] }; }
      else if (type === "device") it = { entity: "", display: "device", icon: "🔌", power_on: 5, x: q[0], y: q[1] };
      else if (type === "fan") it = { entity: "", display: "fan", x: q[0], y: q[1], r: 60 };
      else if (type === "sensor") it = { display: "sensor", icon: "🌡️", values: [], x: q[0], y: q[1] };
      else if (type === "mmwave") it = { display: "mmwave", entity: "", x: q[0], y: q[1], angle: 0, fov: 120, range: 600, targets: [] };
      else if (type === "alarm") it = { display: "alarm", kind: "smoke", entity: "", x: q[0], y: q[1] };
      else {
        it = type === "radiator" ? { display: "radiator", entity: "", length: 100, height: 60, z: 15 } : { display: "socket", entity: "", z: 30 };
        if (!this._wallSnap(q, it)) { this._flash("Heizkörper und Steckdosen bitte nahe an eine Wand ziehen."); return; }
        if (type === "radiator") it.entity = this._guessClimate(it);
      }
      this._change(() => P.items.push(it));
      this._sel = { k: "item", i: P.items.length - 1 };
    }
    this._ptab = "props"; this._render(); this._sync3d(true);
  }
  _setField(inp) {
    const key = inp.dataset.f, s = this._sel, P = this._plan;
    let val = inp.type === "checkbox" ? inp.checked : inp.type === "number" ? (inp.value === "" ? null : +inp.value) : inp.value.trim();
    if (key.startsWith("roof.")) {
      const r = { ...(this._config.roof || {}) }, k = key.slice(5);
      if (val === "" || val === null) delete r[k]; else r[k] = val;
      this._self = true; this._config = { ...this._config, roof: r };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfgOut() }, bubbles: true, composed: true }));
      this._render(); return;
    }
    if (key === "cfg_persons") {
      const c = { ...this._config }, t = String(val || "").trim();
      if (!t) delete c.persons; else if (t === "-") c.persons = false; else c.persons = t.split(";").map((x) => x.trim()).filter(Boolean).map((x) => { const [e, r] = x.split("=").map((y) => y.trim()); return r ? { entity: e, room: r } : e; });
      this._self = true; this._config = c;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfgOut() }, bubbles: true, composed: true }));
      this._render(); return;
    }
    if (key === "cfg_models") {
      const c = { ...this._config }, mo = {};
      String(val || "").split(";").map((x) => x.trim()).filter((x) => x.includes("=")).forEach((x) => { const [k, ...r] = x.split("="); mo[k.trim()] = r.join("=").trim(); });
      if (Object.keys(mo).length) c.models = mo; else delete c.models;
      this._self = true; this._config = c;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfgOut() }, bubbles: true, composed: true }));
      this._render(); return;
    }
    if (key === "_lvl") { this._switchLevel(+val); return; }
    if (key === "_lvname") { this._renameLevel(val); return; }
    if (key.startsWith("cfg.")) {
      const k = key.slice(4), c = { ...this._config };
      if (val === "" || val === null) delete c[k]; else c[k] = val === "true" ? true : val === "false" ? false : /^\d+$/.test(val) ? +val : val;
      this._self = true; this._config = c;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfgOut() }, bubbles: true, composed: true }));
      this._render();
      return;
    }
    if (key.startsWith("bg.")) {
      const k = key.slice(3);
      const bg = { ...(this._config.background || {}) };
      if (val === "" || val === null) delete bg[k]; else bg[k] = val;
      this._self = true;
      this._config = { ...this._config, background: bg };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfgOut() }, bubbles: true, composed: true }));
      this._render();
      return;
    }
    const o = s.k === "wall" ? P.walls[s.i] : s.k === "opening" ? P.openings[s.i] : s.k === "furniture" ? P.furniture[s.i] : s.k === "item" ? P.items[s.i] : P.areas[s.i];
    this._change(() => {
      if (key === "rooms_txt") { const r = {}; String(val || "").split(",").forEach((x) => { const [k, v] = x.split("=").map((y) => y && y.trim()); if (k && v) r[k] = v; }); o.rooms = r; return; }
      if (key === "sill_cm") { const RH = this._config.room_height || 260; o.sill = Math.round(Math.min(Math.max(val ?? 78, 0), RH * 0.75) / RH * 100) / 100; return; }
      if (key.startsWith("det_")) { o.detect = { ...(o.detect || {}) }; if (val) o.detect[key.slice(4)] = val; else delete o.detect[key.slice(4)]; if (!Object.keys(o.detect).length) delete o.detect; return; }
      if (key === "values_txt") { o.values = String(val || "").split(";").map((x) => x.trim()).filter(Boolean).map((x) => { const [e, l] = x.split("=").map((y) => y.trim()); return l ? { entity: e, label: l } : e; }); return; }
      if (key === "targets_txt") { o.targets = String(val || "").split(";").map((x) => x.trim()).filter((x) => x.includes(",")); return; }
      if (key === "bins_txt") { o.bins = String(val || "").split(";").map((x) => x.trim()).filter(Boolean).map((x) => { const [entity, name, color] = x.split("=").map((y) => (y || "").trim()); return { entity, name: name || entity, ...(color ? { color } : {}) }; }); return; }
      if (key === "_side") { const left = (o.flipH ? -1 : 1) === (o.flipV ? 1 : -1); this._setDoor(o, +val, left); return; }
      if (key === "_din") { this._setDoor(o, o.flipV ? 1 : -1, val === "l"); return; }
      if (key === "presence" || key === "illuminance" || key === "motion" || key === "light" || key === "entities" || key === "also") { const l = String(val || "").split(",").map((x) => x.trim()).filter(Boolean); if (!l.length) delete o[key]; else o[key] = l.length > 1 ? l : l[0]; return; }
      if (key === "count") { if (+val === 2) o.count = 2; else delete o.count; return; }
      if (key === "sash") val = val ? "double" : null;
      if (key === "motion") val = val ? "slide" : null;
      if (val === "" || val === null || val === false) delete o[key]; else o[key] = val;
      if (s.k === "furniture" && key === "type" && FL()[val]) { o.w = FL()[val][1]; o.h = FL()[val][2]; delete o.height; delete o.z; if (catE(val) && catE(val).top) this._autoStack(o); }
    });
  }

  /* ---------- Bedienung Zeichenfläche ---------- */
  _pt(ev) {
    const m = this._svg.getScreenCTM();
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  }
  _g(v) { const g = this._grid || 1; return Math.round(v / g) * g; }
  _corners() { const c = []; this._plan.walls.forEach((w) => c.push([w.x1, w.y1], [w.x2, w.y2])); return c; }
  _snapPoint(p, from) {
    const tol = 14 * this._u;
    let best = null;
    for (const c of this._corners()) { const d = dist(p, c); if (d < tol && (!best || d < best.d)) best = { q: c, d }; }
    if (best) return [...best.q];
    let q = [this._g(p[0]), this._g(p[1])];
    if (from) { // rechtwinklig einrasten
      const dx = q[0] - from[0], dy = q[1] - from[1];
      if (Math.abs(dx) > Math.abs(dy) * 4) q[1] = from[1]; else if (Math.abs(dy) > Math.abs(dx) * 4) q[0] = from[0];
    }
    return q;
  }
  _nearestWall(p) {
    let best = null;
    this._plan.walls.forEach((w, i) => { const r = projSeg(p, [w.x1, w.y1], [w.x2, w.y2]); if (!best || r.d < best.d) best = { ...r, i }; });
    return best;
  }
  _hit(ev) {
    const t = ev.target.closest && ev.target.closest("[data-k]");
    if (!t) return null;
    return { k: t.dataset.k, i: +t.dataset.i, h: t.dataset.h != null ? (t.dataset.k === "area" ? +t.dataset.h : +t.dataset.h) : null };
  }
  _bindCanvas() {
    const svg = this._svg;
    svg.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const p = this._pt(ev), k = ev.deltaY > 0 ? 1.15 : 1 / 1.15, vb = this._vb;
      this._vb = { x: p[0] - (p[0] - vb.x) * k, y: p[1] - (p[1] - vb.y) * k, w: vb.w * k, h: vb.h * k };
      this._render();
    }, { passive: false });
    svg.addEventListener("dblclick", () => this._finishDraft());
    svg.addEventListener("contextmenu", (ev) => { if (this._draft) { ev.preventDefault(); this._finishDraft(); } });
    svg.addEventListener("pointerdown", (ev) => {
      if (ev.button === 2) return;
      if (this._config.plan_source && !this._config.plan) return;
      const p = this._pt(ev), P = this._plan, tool = this._tool;
      svg.setPointerCapture(ev.pointerId);
      if (tool === "select") {
        const h = this._hit(ev);
        if (!h) { this._sel = null; this._drag = { pan: true, sx: ev.clientX, sy: ev.clientY, vb: { ...this._vb } }; this._render(); return; }
        this._sel = { k: h.k, i: h.i };
        const o = h.k === "wall" ? P.walls[h.i] : h.k === "opening" ? P.openings[h.i] : h.k === "furniture" ? P.furniture[h.i] : h.k === "item" ? P.items[h.i] : P.areas[h.i];
        this._drag = o.locked ? null : { h, start: p, orig: JSON.stringify(P), moved: false };
        this._render();
        return;
      }
      if (tool === "wall") {
        const q = this._snapPoint(p, this._draft && this._draft.start);
        if (!this._draft) { this._draft = { type: "wall", start: q, cur: q }; this._render(); return; }
        if (dist(q, this._draft.start) > 5) { const st = this._draft.start; this._change(() => P.walls.push({ x1: st[0], y1: st[1], x2: q[0], y2: q[1] })); this._sel = null; }
        this._draft = { type: "wall", start: q, cur: q }; this._render(); return;
      }
      if (tool === "area") {
        const q = this._snapPoint(p);
        if (!this._draft) { this._draft = { type: "area", pts: [q], cur: q }; this._render(); return; }
        if (this._draft.pts.length >= 3 && dist(q, this._draft.pts[0]) < 16 * this._u) return this._finishDraft();
        this._draft.pts.push(q); this._render(); return;
      }
      if (tool === "door" || tool === "window") {
        const w = this._nearestWall(p);
        if (!w || w.d > 60) { this._flash("Bitte näher an eine Wand klicken."); return; }
        const L = tool === "door" ? 85 : 100;
        const no = { id: `${tool}_${Date.now().toString(36)}`, type: tool, x: r1(w.q[0]), y: r1(w.q[1]), length: L, angle: r1(w.ang), ...(tool === "window" ? { sill: 0.3 } : {}) };
        if (tool === "door") { const sr = this._sideRooms(no); if (sr[1] && !sr["-1"]) no.flipV = true; }
        this._change(() => P.openings.push(no));
        this._sel = { k: "opening", i: P.openings.length - 1 }; this._tool = "select"; this._render(); return;
      }
      if (WALLI.includes(tool)) {
        const it = tool === "radiator" ? { display: "radiator", entity: "", length: 100, height: 60, z: 15 } : { display: "socket", entity: "", z: 30 };
        if (!this._wallSnap(p, it)) { this._flash("Bitte näher an eine Wand klicken."); return; }
        if (tool === "radiator") it.entity = this._guessClimate(it);
        this._change(() => P.items.push(it));
        this._sel = { k: "item", i: P.items.length - 1 }; this._tool = "select"; this._render(); return;
      }
      if (tool === "camera") {
        const q = [this._g(p[0]), this._g(p[1])];
        this._change(() => P.items.push({ display: "camera", entity: "", x: q[0], y: q[1], angle: 0, fov: 90, range: 600 }));
        this._sel = { k: "item", i: P.items.length - 1 }; this._tool = "select"; this._render(); return;
      }
      if (tool === "device") {
        const q = [this._g(p[0]), this._g(p[1])];
        this._change(() => P.items.push({ entity: "", display: "device", icon: "🔌", power_on: 5, x: q[0], y: q[1] }));
        this._sel = { k: "item", i: P.items.length - 1 }; this._tool = "select"; this._render(); return;
      }
      if (tool === "light" || tool === "sensor") {
        const q = [this._g(p[0]), this._g(p[1])];
        this._change(() => P.items.push(tool === "light" ? { entity: "", x: q[0], y: q[1], r: 150 } : { entity: "", x: q[0], y: q[1], display: "ripple", r: 120 }));
        this._sel = { k: "item", i: P.items.length - 1 }; this._tool = "select"; this._render();
        const inp = this._root.querySelector('.props [data-f="entity"]'); if (inp) inp.focus();
        return;
      }
      if (tool === "furniture") {
        const t = this._furnType, d = FL()[t];
        const nf = { id: `${t}_${Date.now().toString(36)}`, type: t, x: this._g(p[0]), y: this._g(p[1]), w: d[1], h: d[2], angle: 0 };
        if (catE(t) && catE(t).top) this._autoStack(nf);
        this._change(() => P.furniture.push(nf));
        this._sel = { k: "furniture", i: P.furniture.length - 1 }; this._tool = "select"; this._render(); return;
      }
    });
    svg.addEventListener("pointermove", (ev) => {
      const p = this._pt(ev); this._mouse = p;
      if (this._draft) { this._draft.cur = this._snapPoint(p, this._draft.type === "wall" ? this._draft.start : null); this._render(); return; }
      const d = this._drag;
      if (!d) return;
      if (d.pan) { const k = this._vb.w / this._svg.clientWidth; this._vb = { ...d.vb, x: d.vb.x - (ev.clientX - d.sx) * k, y: d.vb.y - (ev.clientY - d.sy) * k }; this._render(); return; }
      const P = this._plan, O = JSON.parse(d.orig), h = d.h;
      const dx = this._g(p[0] - d.start[0]), dy = this._g(p[1] - d.start[1]);
      if (!d.moved && Math.hypot(p[0] - d.start[0], p[1] - d.start[1]) < 4 * this._u) return;
      d.moved = true;
      if (h.k === "wall") {
        const w0 = O.walls[h.i];
        if (h.h) { // Endpunkt ziehen – verbundene Ecken wandern mit
          const old = h.h === 1 ? [w0.x1, w0.y1] : [w0.x2, w0.y2];
          const other = h.h === 1 ? [w0.x2, w0.y2] : [w0.x1, w0.y1];
          const q = this._snapPoint(p, other);
          P.walls.forEach((w, j) => {
            const ow = O.walls[j];
            if (ow.locked && j !== h.i) return; // fixierte Nachbarwände bleiben stehen
            if (dist([ow.x1, ow.y1], old) < 1) { w.x1 = q[0]; w.y1 = q[1]; }
            if (dist([ow.x2, ow.y2], old) < 1) { w.x2 = q[0]; w.y2 = q[1]; }
          });
        } else { const w = P.walls[h.i]; w.x1 = w0.x1 + dx; w.y1 = w0.y1 + dy; w.x2 = w0.x2 + dx; w.y2 = w0.y2 + dy; }
      } else if (h.k === "opening") {
        const nw = this._nearestWall(p); const o = P.openings[h.i];
        if (nw && nw.d < 80) { o.x = r1(nw.q[0]); o.y = r1(nw.q[1]); o.angle = r1(nw.ang); }
      } else if (h.k === "area") {
        const a = P.areas[h.i], a0 = O.areas[h.i];
        if (h.h != null) a.points[h.h] = this._snapPoint(p);
        else { a.points = a0.points.map((q) => [q[0] + dx, q[1] + dy]); if (a0.label) a.label = [a0.label[0] + dx, a0.label[1] + dy]; }
      } else if (h.k === "item" && WALLI.includes(P.items[h.i].display)) {
        this._wallSnap(p, P.items[h.i]);
      } else {
        const arr = h.k === "item" ? "items" : "furniture";
        P[arr][h.i].x = O[arr][h.i].x + dx; P[arr][h.i].y = O[arr][h.i].y + dy;
      }
      this._render();
    });
    const up = () => {
      const d = this._drag; this._drag = null;
      if (d && d.moved) {
        if (d.h && d.h.k === "furniture") { const o = this._plan.furniture[d.h.i]; if (o) this._afterFurnMove(o); }
        this._undo.push(d.orig); this._redo = []; this._commit(); this._render();
      }
    };
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
  }
  _finishDraft() {
    const d = this._draft; this._draft = null;
    if (d && d.type === "area" && d.pts.length >= 3) {
      const n = this._plan.areas.length + 1;
      this._change(() => this._plan.areas.push({ id: `raum_${Date.now().toString(36)}`, name: `Raum ${n}`, points: d.pts }));
      this._sel = { k: "area", i: this._plan.areas.length - 1 }; this._tool = "select";
    }
    this._render();
  }
  _flash(t) { this._hint.textContent = t; this._hint.classList.add("warn"); setTimeout(() => this._hint.classList.remove("warn"), 1500); }
  _arr(k) { return { wall: "walls", opening: "openings", furniture: "furniture", item: "items", area: "areas" }[k]; }
  _delete() { const s = this._sel; if (!s) return; this._change(() => this._plan[this._arr(s.k)].splice(s.i, 1)); this._sel = null; this._render(); }
  _duplicate() {
    const s = this._sel; if (!s) return;
    const arr = this._plan[this._arr(s.k)], c = JSON.parse(JSON.stringify(arr[s.i]));
    delete c.locked;
    if (c.id) c.id = c.id.replace(/_[a-z0-9]+$/, "") + "_" + Date.now().toString(36);
    if (s.k === "wall") { c.x1 += 30; c.x2 += 30; c.y1 += 30; c.y2 += 30; }
    else if (s.k === "area") c.points = c.points.map((q) => [q[0] + 30, q[1] + 30]);
    else if (s.k === "item" && WALLI.includes(c.display)) { const a = ((c.angle || 0) * Math.PI) / 180, d = (c.length || 10) + 10; c.x = r1(c.x + Math.cos(a) * d); c.y = r1(c.y + Math.sin(a) * d); }
    else if (s.k !== "opening") { c.x += 30; c.y += 30; }
    this._change(() => arr.push(c));
    this._sel = { k: s.k, i: arr.length - 1 }; this._render();
  }
  // Zwischenablage: auch zwischen Karten/Tabs (localStorage)
  _copy() {
    const s = this._sel; if (!s) return;
    const clip = { k: s.k, o: JSON.parse(JSON.stringify(this._plan[this._arr(s.k)][s.i])) };
    RaumwerkEditorClip = clip;
    try { localStorage.setItem("jg-clip", JSON.stringify(clip)); } catch (e) {}
    this._toast && this._toast("Kopiert – Strg+V fügt ein");
  }
  _paste() {
    let clip = RaumwerkEditorClip;
    try { const t = localStorage.getItem("jg-clip"); if (t) clip = JSON.parse(t); } catch (e) {}
    if (!clip || !clip.o) return;
    const k = clip.k, arr = this._plan[this._arr(k)], c = JSON.parse(JSON.stringify(clip.o));
    delete c.locked;
    if (c.id) c.id = String(c.id).replace(/_[a-z0-9]+$/, "") + "_" + Date.now().toString(36);
    // an die Mausposition, sonst 40 cm versetzt
    const ref = k === "wall" ? [(c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2] : k === "area" ? c.points.reduce((a, q) => [a[0] + q[0] / c.points.length, a[1] + q[1] / c.points.length], [0, 0]) : [c.x, c.y];
    const to = this._mouse || [ref[0] + 40, ref[1] + 40], dx = this._g(to[0] - ref[0]), dy = this._g(to[1] - ref[1]);
    if (k === "wall") { c.x1 += dx; c.x2 += dx; c.y1 += dy; c.y2 += dy; }
    else if (k === "area") { c.points = c.points.map((q) => [q[0] + dx, q[1] + dy]); delete c.label; c.id = (c.id || "raum") + "_" + Date.now().toString(36); }
    else { c.x = r1(c.x + dx); c.y = r1(c.y + dy); }
    this._change(() => arr.push(c));
    this._sel = { k, i: arr.length - 1 }; this._render();
  }
  _key(ev) {
    if (!this.isConnected) return;
    const path = ev.composedPath ? ev.composedPath() : [];
    if (path.some((n) => n.tagName === "INPUT" || n.tagName === "SELECT" || n.tagName === "TEXTAREA")) return;
    if (!path.includes(this) && !this.matches(":hover") && !this._fs) return;
    const c = ev.ctrlKey || ev.metaKey;
    if (c && ev.key.toLowerCase() === "z") { ev.preventDefault(); ev.shiftKey ? this._doRedo() : this._doUndo(); }
    else if (c && ev.key.toLowerCase() === "y") { ev.preventDefault(); this._doRedo(); }
    else if (c && ev.key.toLowerCase() === "d") { ev.preventDefault(); this._duplicate(); }
    else if (c && ev.key.toLowerCase() === "c" && this._sel) { ev.preventDefault(); this._copy(); }
    else if (c && ev.key.toLowerCase() === "x" && this._sel) { ev.preventDefault(); this._copy(); this._delete(); }
    else if (c && ev.key.toLowerCase() === "v") { ev.preventDefault(); this._paste(); }
    else if ((ev.key === "r" || ev.key === "R") && !c && this._sel && (this._sel.k === "furniture" || (this._sel.k === "item" && ["camera", "car"].includes(this._plan.items[this._sel.i].display)))) {
      ev.preventDefault();
      const o = this._plan[this._arr(this._sel.k)][this._sel.i], st = ev.shiftKey ? 15 : this._sel.k === "item" ? 45 : 90;
      if (!o.locked) this._change(() => { o.angle = (((o.angle || 0) + st) % 360 + 360) % 360; });
    }
    else if (ev.key === "Escape" && this._fs === "css" && !this._draft && !this._sel) { ev.preventDefault(); ev.stopImmediatePropagation(); this._setFs(false); }
    else if (ev.key === "Escape") { if (this._fs) { ev.preventDefault(); ev.stopImmediatePropagation(); } this._draft = null; this._sel = null; this._render(); }
    else if ((ev.key === "Delete" || ev.key === "Backspace") && this._sel) { ev.preventDefault(); this._delete(); }
    else if (ev.key.startsWith("Arrow") && this._sel) {
      ev.preventDefault();
      const st = ev.shiftKey ? 10 : 1, dx = ev.key === "ArrowLeft" ? -st : ev.key === "ArrowRight" ? st : 0, dy = ev.key === "ArrowUp" ? -st : ev.key === "ArrowDown" ? st : 0;
      const s = this._sel, o = this._plan[this._arr(s.k)][s.i];
      if (o.locked) return;
      this._change(() => {
        if (s.k === "wall") { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; }
        else if (s.k === "area") o.points = o.points.map((q) => [q[0] + dx, q[1] + dy]);
        else { o.x += dx; o.y += dy; }
      });
    }
  }
}
function h_missing(h, eid) { return h && h.states && !h.states[eid]; }

const ESTYLE = `
:host{display:block}
.ed{font:14px/1.4 var(--paper-font-body1_-_font-family,system-ui);color:var(--primary-text-color,#2b2724)}
.tb{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:6px}
.tb button,.props button{border:1px solid var(--divider-color,#ccc);background:var(--card-background-color,#fff);color:var(--primary-text-color,#2b2724);border-radius:8px;padding:6px 10px;cursor:pointer;font:inherit}
.tb button.on{background:var(--primary-color,#f5b544);color:var(--text-primary-color,#fff);border-color:transparent}
.tb button:disabled{opacity:.4;cursor:default}
.tb select,.props select,.props input{font:inherit;padding:5px 6px;border:1px solid var(--divider-color,#ccc);border-radius:6px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#2b2724)}
.sp{flex:1}
.gr{font-size:12px;color:var(--secondary-text-color,#6b645c)}
.cv{position:relative;border:1px solid var(--divider-color,#ccc);border-radius:12px;overflow:hidden;background:var(--secondary-background-color,#f4f1ec)}
svg{display:block;width:100%;height:min(62vh,640px);touch-action:none;user-select:none;cursor:crosshair}
.cv{display:flex;position:relative}.cv.only3 .c2{display:none!important}
.vm{display:inline-flex;border:1px solid var(--divider-color,#ccc);border-radius:8px;overflow:hidden}.tb .vm button{border:0;border-radius:0;margin:0}.tb .vm button+button{border-left:1px solid var(--divider-color,#ccc)}.c2{position:relative;flex:1;min-width:0}.p3{flex:1;min-width:0;border-left:1px solid var(--divider-color,#ccc);position:relative}.p3[hidden]{display:none}
.p3 raumwerk{display:block;height:100%}
.ed.fs .c2{display:flex}
.hint{position:absolute;left:8px;bottom:6px;right:8px;font-size:11.5px;color:var(--secondary-text-color,#6b645c);pointer-events:none;background:color-mix(in srgb,var(--card-background-color,#fff) 80%,transparent);padding:2px 6px;border-radius:6px}
.hint.warn{color:#e8644a;font-weight:600}
.grid line{stroke:var(--divider-color,#ddd);opacity:.6}
.area polygon{fill:rgba(245,181,68,.10);stroke:rgba(245,181,68,.45);stroke-width:2;cursor:move}
.area.out polygon{fill:rgba(110,160,90,.14);stroke:rgba(110,160,90,.6);stroke-dasharray:10 6}
.area.out.s-paving polygon,.area.out.s-gravel polygon{fill:rgba(140,135,125,.16);stroke:rgba(140,135,125,.7)}
.area.out.s-path polygon{fill:rgba(220,190,120,.2);stroke:rgba(200,160,80,.7)}.area.out.s-terrace polygon{fill:rgba(150,110,170,.18);stroke:rgba(150,110,170,.7)}
.area.out.s-greenhouse polygon{fill:rgba(90,160,230,.12);stroke:#5aa0e6}
.item.cam .fov{fill:rgba(90,160,230,.12);stroke:#5aa0e6;stroke-width:1;stroke-dasharray:6 5;pointer-events:none}
.item.cam circle{fill:#3b6fa8}
.item.bins rect{stroke:#333;stroke-width:1;cursor:move}.item.bins .hitc{fill:transparent}.item.bins.sel rect{stroke:#e8644a;stroke-width:2.5}
.item.car rect{fill:rgba(109,125,140,.35);stroke:#6d7d8c;stroke-width:2;cursor:move}.item.car.sel rect{stroke:#e8644a;stroke-width:3}
.area.sel polygon{fill:rgba(245,181,68,.22);stroke:#f5b544;stroke-width:3}
.lbl{fill:var(--secondary-text-color,#6b645c);text-anchor:middle;pointer-events:none;font-weight:600}
.lbl.small{font-weight:500}
.lbl.ic{fill:#fff;font-weight:700}
.furn .fb{fill:rgba(127,127,127,.18);stroke:var(--secondary-text-color,#6b645c);stroke-width:1.5;cursor:move}
.furn .fpart{stroke:var(--secondary-text-color,#6b645c);stroke-opacity:.6;stroke-width:.8;cursor:move}.furn .fglass{fill-opacity:.45}
.furn.thin .fpart{fill-opacity:.3}
.furn .ffront{stroke:#c98512;stroke-width:1.6;stroke-dasharray:4 3;pointer-events:none}
.furn.sel .fpart{stroke:#f5b544;stroke-opacity:1;stroke-width:2}
.furn .det{stroke:var(--secondary-text-color,#6b645c);stroke-width:1}
.furn.sel .fb{stroke:#f5b544;stroke-width:3}
.wall line{stroke:var(--primary-text-color,#2b2724);stroke-linecap:square;cursor:move}
.wall .hitl,.open .hitl{stroke:transparent}
.wall.sel line:first-child{stroke:#f5b544}
.open line:first-child{stroke:#5aa0e6;stroke-linecap:butt}
.open.door line:first-child{stroke:#c98512}
.open.sel line:first-child{stroke:#e8644a}
.open .dot{fill:#fff;stroke:#333}
.open .swing{fill:none;stroke:#c98512;stroke-width:1.5;stroke-dasharray:5 4;pointer-events:none}
.open .swl{stroke:#c98512;stroke-width:2.5;pointer-events:none}
.open.sel .swing,.open.sel .swl{stroke:#e8644a}
.witem rect{fill:#d9d2c7;stroke:#7c7368;stroke-width:1;cursor:move}
.witem.radiator rect{fill:#f0a888;stroke:#c2582f}
.witem .hitc{fill:transparent;cursor:move}
.witem.sel rect{stroke:#e8644a;stroke-width:2.5}
.witem.bad rect{fill:#e8644a}
.item circle{fill:#c98512;stroke:#fff;stroke-width:1.5;cursor:move}
.item.sensor circle{fill:#5aa0e6}
.item.dev circle{fill:#8a6fd1}
.item .rad{fill:rgba(245,181,68,.12);stroke:rgba(245,181,68,.6);stroke-dasharray:6 6;pointer-events:none}
.item.sel circle:not(.rad){stroke:#e8644a;stroke-width:3}
.item.bad circle{fill:#e8644a}
.lk{opacity:.75}.lk *{stroke-dasharray:4 3}
.hdl{fill:#fff;stroke:#e8644a;stroke-width:2;cursor:grab}
.draft{stroke:#e8644a;fill:none;opacity:.8}
.draft.area{stroke-width:3;stroke-dasharray:8 6}
.snapdot{fill:#e8644a}
.props{margin-top:10px}
.fsb{font-weight:600}
.ed.fs{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;padding:10px;box-sizing:border-box;background:var(--primary-background-color,var(--card-background-color,#1c1b1a))}
.ed.fs .main{flex:1;min-height:0;display:flex;gap:12px}
.ed.fs .cv{flex:1;min-width:0;display:flex}
@media (orientation:portrait){.ed.fs .cv{flex-direction:column}.p3{border-left:0;border-top:1px solid var(--divider-color,#ccc)}}
.ed.fs svg{height:auto;flex:1}
.ed.fs .props{margin-top:0;width:340px;flex:none;overflow:auto;padding-right:4px}
@media (max-width:800px),(orientation:portrait){.ed.fs .main{flex-direction:column}.ed.fs .props{width:auto;max-height:38vh}}
.props h3{margin:0 0 6px;font-size:15px}
.ptabs{display:flex;gap:4px;margin-bottom:8px}.ptabs button{flex:1}.ptabs button.on{background:var(--primary-color,#f5b544);color:var(--text-primary-color,#fff);border-color:transparent}
.catq{width:100%;box-sizing:border-box;margin-bottom:4px}
.cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px}
.ctile{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;border:1px solid var(--divider-color,#ccc);border-radius:10px;cursor:grab;user-select:none;touch-action:none;background:var(--card-background-color,#fff);font-size:11px;text-align:center;line-height:1.15;color:var(--primary-text-color,#2b2724)}
.ctile:hover{border-color:var(--primary-color,#f5b544)}
.ctile svg{width:52px;height:40px;pointer-events:none}.ctile span{pointer-events:none}
.ctile .fpart{stroke:var(--secondary-text-color,#6b645c);stroke-opacity:.5;stroke-width:1}.ctile .ffront{stroke:#c98512;stroke-width:2;stroke-dasharray:4 3}
.ctile.ghost{position:fixed;z-index:2147483600;width:68px;pointer-events:none;opacity:.85;box-shadow:0 6px 18px rgba(0,0,0,.35)}
.props h4{margin:10px 0 4px;font-size:13px}
.props label{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--secondary-text-color,#6b645c);margin:4px 0;flex:1;min-width:120px}
.props .clr{display:flex;align-items:center;gap:6px}.props .clr input{width:46px;height:30px;padding:2px}.props .clr button{border:0;background:none;cursor:pointer;color:inherit}.props .clr i{font-size:11px}
.props label.cb{flex-direction:row;align-items:center;gap:6px;min-width:0;flex:none;margin-right:12px;color:var(--primary-text-color,#2b2724)}
.props label input,.props label select{color:var(--primary-text-color,#2b2724)}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}
.acts{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px}
.danger{color:#e8644a!important;border-color:#e8644a!important}
.note{font-size:12px;color:var(--secondary-text-color,#6b645c);margin:4px 0}
.warn{color:#e8644a;font-size:12px}
`;
if (!customElements.get("raumwerk-editor")) customElements.define("raumwerk-editor", RaumwerkEditor);
console.info(`%c RAUMWERK-EDITOR %c ${RWE_VERSION} `, "background:#5aa0e6;color:#fff;font-weight:700", "background:#1f1e1d;color:#5aa0e6");
