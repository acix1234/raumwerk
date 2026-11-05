/* Raumwerk – eigene Grundriss-Karte für Home Assistant (Phase 1: 2D + Schrägansicht)
 * Typ: custom:raumwerk-card
 * Plan-Daten liegen in der Kartenkonfiguration (plan: {walls, openings, furniture, items, areas}), Einheit cm.
 * Ideen u. a. von Easy Floorplan (MIT, nicosandller) – eigener Code, keine Übernahme.
 */
const RW_VERSION = "0.21.0";
// Heatmap-Farbskalen (Wert → RGB)
const HEAT = {
  temperature: { label: "Temperatur", stops: [[16, [70, 130, 230]], [19, [80, 185, 215]], [21, [110, 200, 120]], [23.5, [245, 181, 68]], [26, [232, 100, 74]]] },
  humidity: { label: "Luftfeuchte", stops: [[30, [232, 140, 74]], [40, [245, 200, 90]], [50, [110, 200, 120]], [60, [90, 170, 230]], [70, [60, 100, 220]]] },
  co2: { label: "CO₂", stops: [[450, [110, 200, 120]], [800, [245, 200, 90]], [1200, [240, 150, 70]], [1600, [232, 80, 74]]] },
  illuminance: { label: "Helligkeit", stops: [[0, [40, 48, 110]], [10, [80, 90, 170]], [50, [170, 160, 110]], [200, [245, 205, 90]], [500, [255, 240, 170]]] },
  presence: { label: "Anwesenheit", stops: [[0, [120, 120, 120]], [1, [245, 150, 60]]] },
};
const HEAT_UNIT = { temperature: "°", humidity: " %", co2: " ppm", illuminance: " lx" };
const ON_STATES = ["on", "home", "detected", "occupied", "open"];
const WALL_ITEMS = ["radiator", "socket"];
const RAINY = ["rainy", "pouring", "lightning-rainy", "snowy-rainy", "hail"];
const TV_OFF = ["off", "standby", "unavailable", "unknown"];
const WX = { rain: ["rainy", "pouring", "lightning-rainy", "hail"], snow: ["snowy", "snowy-rainy"], fog: ["fog"], cloud: ["cloudy", "partlycloudy", "windy", "windy-variant", "exceptional"], storm: ["lightning", "lightning-rainy"] };
const WX_ICON = { sunny: "☀️", "clear-night": "🌙", partlycloudy: "⛅", cloudy: "☁️", fog: "🌫️", rainy: "🌧️", pouring: "🌧️", "lightning-rainy": "⛈️", lightning: "🌩️", snowy: "🌨️", "snowy-rainy": "🌨️", hail: "🌨️", windy: "💨", "windy-variant": "💨" };
const WX_DE = { sunny: "sonnig", "clear-night": "klar", partlycloudy: "teils bewölkt", cloudy: "bewölkt", fog: "Nebel", rainy: "Regen", pouring: "Starkregen", "lightning-rainy": "Gewitter", lightning: "Gewitter", snowy: "Schnee", "snowy-rainy": "Schneeregen", hail: "Hagel", windy: "windig", "windy-variant": "windig", exceptional: "Unwetter" };
const APP_COL = [["netflix", "#e50914"], ["youtube", "#ff2a2a"], ["prime", "#00a8e1"], ["amazon", "#00a8e1"], ["disney", "#1a4ed8"], ["spotify", "#1db954"], ["ard", "#0064a8"], ["zdf", "#fa7d19"], ["joyn", "#e6007e"], ["rtl", "#e30613"], ["apple", "#cccccc"], ["twitch", "#9146ff"], ["dazn", "#f8fc00"], ["wow", "#7ad7f0"], ["plex", "#e5a00d"]];
const DET_ICON = { person: "🧍", car: "🚗", vehicle: "🚗", animal: "🐾", pet: "🐾", dog: "🐕", cat: "🐈", package: "📦", motion: "〰️" };
// Außenflächen: Bodenfarbe 3D (dunkel/hell)
const SURF = { grass: [0x2c3a26, 0xc7d6b2], paving: [0x353330, 0xd6d0c6], gravel: [0x3d3a35, 0xcfc8ba], wood: [0x4a3c30, 0xc2a483], path: [0x4a4235, 0xe3d6b8], terrace: [0x3f3a40, 0xcfc6cc], greenhouse: [0x2d3a33, 0xd3e3da] };
// Bodenbeläge: Muster werden selbst gezeichnet (keine Bilddateien). S = Kachelgröße in cm.
const FLOORS = {
  wood: { n: "Holzdielen", c: "#a97c50", S: 240 },
  herringbone: { n: "Fischgrät (Klinker/Parkett)", c: "#d8c4a2", S: 80 },
  brick: { n: "Ziegel / Klinker", c: "#d6c296", S: 96 },
  parquet: { n: "Stäbchenparkett", c: "#b48656", S: 120 },
  laminate: { n: "Laminat", c: "#c4a173", S: 260 },
  tiles: { n: "Fliesen groß (60×60)", c: "#cdc8c0", S: 120 },
  tiles_small: { n: "Fliesen klein (30×30)", c: "#d8d5cf", S: 60 },
  stone: { n: "Naturstein", c: "#9c958a", S: 160 },
  concrete: { n: "Beton / Estrich", c: "#a29e98", S: 300 },
  carpet: { n: "Teppichboden", c: "#78716a", S: 100 },
  grass: { n: "Rasen", c: "#5f8a45", S: 200 },
  paving: { n: "Pflaster", c: "#9b958b", S: 80 },
  gravel: { n: "Kies", c: "#b3aa98", S: 100 },
  deck: { n: "Holzdeck", c: "#8d6a4a", S: 200 },
  slabs: { n: "Terrassenplatten", c: "#a8a39b", S: 160 },
  plain: { n: "einfarbig", c: "#9a948c", S: 100 },
  roof: { n: "Dachziegel", c: "#3c4045", S: 120, hide: true },
};
const SURF_FLOOR = { grass: "grass", paving: "paving", gravel: "gravel", wood: "deck", path: "paving", terrace: "slabs", greenhouse: "tiles" };
// echte Farben der Außenflächen für die 3D-Tagesszene
const SURF_REAL = { grass: "#6a8f4e", paving: "#9b958b", gravel: "#b3aa98", wood: "#8d6a4a", path: "#b5a17f", terrace: "#a9a49c", greenhouse: "#c4cbc4" };
const FLOOR_CACHE = {};
const hexRgb = (h) => { const s = String(h || "#888").replace("#", ""), n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (c) => "#" + c.map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, "0")).join("");
const shadeHex = (h, f) => rgbHex(hexRgb(h).map((x) => x * f));
function seeded(str) {
  let a = 2166136261; for (let i = 0; i < str.length; i++) a = Math.imul(a ^ str.charCodeAt(i), 16777619);
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Raum → Bodenbelag {kind, color, angle} oder null (dann einfarbig wie bisher)
function floorOf(a, dark, real) {
  let kind = a.floor || (a.outdoor ? SURF_FLOOR[a.surface || "grass"] : null);
  if (!kind || !FLOORS[kind]) return null;
  let color = a.floor_color;
  if (!color && a.outdoor && !a.floor && real && !dark) color = SURF_REAL[a.surface || "grass"];
  if (!color) color = a.outdoor && !a.floor ? "#" + (SURF[a.surface || "grass"] || SURF.grass)[dark ? 0 : 1].toString(16).padStart(6, "0") : FLOORS[kind].c;
  return { kind, color, angle: +a.floor_angle || 0, S: FLOORS[kind].S, outDefault: a.outdoor && !a.floor && !a.floor_color };
}
// Muster als Canvas (nahtlos kachelbar), zwischengespeichert
function floorCanvas(kind, color, px = 512) {
  const key = kind + "|" + color + "|" + px;
  if (FLOOR_CACHE[key]) return FLOOR_CACHE[key];
  const cv = document.createElement("canvas"); cv.width = cv.height = px;
  const g = cv.getContext("2d"), S = FLOORS[kind].S, k = px / S, R = seeded(key), base = hexRgb(color);
  const col = (f, a = 1) => `rgba(${base.map((x) => clamp(Math.round(x * f), 0, 255)).join(",")},${a})`;
  const wrapRect = (x, y, w, h) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) g.fillRect((x + dx) * k, (y + dy) * k, w * k, h * k); };
  const wrapDot = (x, y, r, ry = r, rot = 0) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.beginPath(); g.ellipse((x + dx) * k, (y + dy) * k, r * k, ry * k, rot, 0, Math.PI * 2); g.fill(); } };
  g.fillStyle = col(1); g.fillRect(0, 0, px, px);
  const planks = (pw, minL, maxL, gap, varc, grain, gapDark) => {
    const rows = Math.max(1, Math.round(S / pw)), ph = S / rows;
    for (let r = 0; r < rows; r++) {
      const n = Math.max(1, Math.round(S / ((minL + maxL) / 2))), joints = [];
      let p = R() * S;
      for (let j = 0; j < n; j++) { joints.push(p % S); p += minL + R() * (maxL - minL); }
      joints.sort((a, b) => a - b);
      for (let j = 0; j < joints.length; j++) {
        const x0 = joints[j], x1 = j + 1 < joints.length ? joints[j + 1] : joints[0] + S, y = r * ph;
        g.fillStyle = col(1 + (R() - 0.5) * varc); wrapRect(x0, y, x1 - x0, ph);
        if (grain) for (let q = 0; q < grain; q++) { g.fillStyle = col(0.82 + R() * 0.12, 0.18 + R() * 0.2); wrapRect(x0 + R() * (x1 - x0) * 0.3, y + ph * (0.1 + R() * 0.8), (x1 - x0) * (0.3 + R() * 0.6), Math.max(0.12, ph * 0.03)); }
        g.fillStyle = col(gapDark, 0.9); wrapRect(x0, y, gap, ph);
      }
      g.fillStyle = col(gapDark, 0.9); wrapRect(0, r * ph, S, gap);
    }
  };
  const grid = (ts, grout, varc, groutF, offset = 0) => {
    const n = Math.round(S / ts);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * ts + (j % 2 ? offset : 0), y = j * ts;
      g.fillStyle = col(1 + (R() - 0.5) * varc); wrapRect(x, y, ts, ts);
      for (let q = 0; q < 3; q++) { g.fillStyle = col(1 + (R() - 0.5) * varc * 1.6, 0.25); wrapDot(x + R() * ts, y + R() * ts, ts * (0.15 + R() * 0.25), ts * (0.1 + R() * 0.2), R() * 3); }
      g.fillStyle = col(groutF); wrapRect(x, y, ts, grout); wrapRect(x, y, grout, ts);
    }
  };
  const speckle = (n, rMin, rMax, fMin, fMax, a = 1) => { for (let i = 0; i < n; i++) { g.fillStyle = col(fMin + R() * (fMax - fMin), a); const r = rMin + R() * (rMax - rMin); wrapDot(R() * S, R() * S, r, r * (0.6 + R() * 0.4), R() * 3); } };
  // Fischgrät: Steine 20×5 cm (4:1), Ketten aus liegendem + stehendem Stein, Periode 40 cm
  const herring = () => {
    const W = 5, k = 4, P = 2 * k, n = S / W, gap = 0.45, tints = [[214, 160, 138], [222, 180, 120], [232, 214, 182], [200, 170, 150]];
    g.fillStyle = col(0.82); g.fillRect(0, 0, px, px);
    const brick = (x, y, w, h) => { const t = tints[Math.floor(R() * tints.length)], m = 0.25 + R() * 0.3, f = 0.9 + R() * 0.16; g.fillStyle = `rgb(${base.map((b, i) => clamp(Math.round((b + (t[i] - b) * m) * f), 0, 255)).join(",")})`; wrapRect(x * W + gap, y * W + gap, w * W - 2 * gap, h * W - 2 * gap); };
    for (let c = -P * 2; c < n + P; c += P) for (let i = -k - 1; i < n + 1; i++) { brick(c + i, i, k, 1); brick(c + i, i + 1, 1, k); }
  };
  if (kind === "herringbone") herring();
  else if (kind === "brick") {
    g.fillStyle = col(0.8); g.fillRect(0, 0, px, px);
    const bl = 24, bh = 12, mo = 1;
    for (let r = 0; r < S / bh; r++) for (let c = -1; c < S / bl + 1; c++) { g.fillStyle = col(0.9 + R() * 0.18); wrapRect(c * bl + (r % 2 ? bl / 2 : 0) + mo / 2, r * bh + mo / 2, bl - mo, bh - mo); }
    speckle(400, 0.2, 0.7, 0.75, 1.1, 0.35);
  }
  else if (kind === "roof") {
    for (let r = 0; r < S / 30; r++) for (let c = -1; c < S / 24 + 1; c++) { const x = c * 24 + (r % 2 ? 12 : 0), y = r * 30; g.fillStyle = col(0.9 + R() * 0.16); wrapRect(x + 0.4, y, 23.2, 30); g.fillStyle = col(0.62, 0.8); wrapRect(x, y + 26, 24, 4); }
  }
  else if (kind === "wood") planks(15, 90, 220, 0.3, 0.16, 4, 0.62);
  else if (kind === "parquet") planks(7, 40, 60, 0.25, 0.2, 2, 0.66);
  else if (kind === "laminate") planks(19.5, 125, 135, 0.25, 0.09, 3, 0.7);
  else if (kind === "deck") planks(14.5, 180, 220, 1.1, 0.14, 4, 0.35);
  else if (kind === "tiles") { grid(60, 0.4, 0.05, 0.6); speckle(1800, 0.1, 0.3, 0.6, 1.15, 0.5); }
  else if (kind === "tiles_small") { grid(30, 0.4, 0.05, 0.5); speckle(900, 0.08, 0.22, 0.6, 1.15, 0.5); }
  else if (kind === "slabs") grid(40, 0.9, 0.08, 0.7);
  else if (kind === "stone") { grid(40, 0.6, 0.22, 0.72, 20); speckle(160, 0.3, 1.2, 0.75, 1.2, 0.35); }
  else if (kind === "paving") {
    const rows = S / 10;
    for (let r = 0; r < rows; r++) for (let c = 0; c < S / 20; c++) { const x = c * 20 + (r % 2 ? 10 : 0), y = r * 10; g.fillStyle = col(1 + (R() - 0.5) * 0.22); wrapRect(x, y, 20, 10); g.fillStyle = col(0.62); wrapRect(x, y, 20, 0.7); wrapRect(x, y, 0.7, 10); }
  }
  else if (kind === "gravel") { speckle(2600, 0.6, 1.8, 0.7, 1.25); speckle(500, 0.4, 0.9, 0.5, 0.65, 0.6); }
  else if (kind === "grass") {
    speckle(60, 6, 18, 0.88, 1.1, 0.35);
    for (let i = 0; i < 5200; i++) { const x = R() * S, y = R() * S, a = -Math.PI / 2 + (R() - 0.5) * 1.4, l = 1.5 + R() * 3; g.strokeStyle = col(0.7 + R() * 0.6, 0.55); g.lineWidth = Math.max(1, 0.35 * k);
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.beginPath(); g.moveTo((x + dx) * k, (y + dy) * k); g.lineTo((x + dx + Math.cos(a) * l) * k, (y + dy + Math.sin(a) * l) * k); g.stroke(); } }
  }
  else if (kind === "concrete") { speckle(70, 15, 50, 0.9, 1.08, 0.25); speckle(900, 0.15, 0.6, 0.75, 1.2, 0.5); }
  else if (kind === "carpet") speckle(6000, 0.25, 0.6, 0.78, 1.2, 0.6);
  // feines Rauschen gegen „Plastik-Look“
  const id = g.getImageData(0, 0, px, px), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * (kind === "plain" ? 6 : 10); d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n, 0, 255); }
  g.putImageData(id, 0, 0);
  return (FLOOR_CACHE[key] = cv);
}
// ---------- Skin „Pixel-Abenteuer“: eigene Pixel-Grafiken (16-px-Kacheln = 64 cm) ----------
const PX_S = 64, PX_CACHE = {};
const PX_OUT = "#1c1624";
function pxCanvas(n) { const cv = document.createElement("canvas"); cv.width = cv.height = n; return cv; }
// Bodenkachel je Belag
function pixelTile(kind, color) {
  const key = "t|" + kind + "|" + color; if (PX_CACHE[key]) return PX_CACHE[key];
  const N = 16, cv = pxCanvas(N), g = cv.getContext("2d"), R = seeded(key), b = hexRgb(color);
  const C = (f, t) => { let c = b.map((x) => x * f); if (t) c = c.map((x, i) => x + (t[i] - x) * 0.35); return `rgb(${c.map((x) => clamp(Math.round(x), 0, 255)).join(",")})`; };
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(((x % N) + N) % N, ((y % N) + N) % N, 1, 1); };
  const rect = (x, y, w, h, c) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) px(x + i, y + j, c); };
  rect(0, 0, N, N, C(1));
  if (["wood", "laminate", "parquet", "deck"].includes(kind)) {
    const h = kind === "parquet" ? 2 : kind === "deck" ? 5 : 4;
    for (let y = 0, r = 0; y < N; y += h, r++) {
      rect(0, y, N, h, C([1, 0.9, 1.07, 0.95][r % 4])); rect(0, y + h - 1, N, 1, C(kind === "deck" ? 0.55 : 0.72));
      const jx = (r * 7 + 3) % N; rect(jx, y, 1, h - 1, C(0.72));
      for (let k = 0; k < 2; k++) px(Math.floor(R() * N), y + Math.floor(R() * (h - 1)), C(1.15));
    }
  } else if (kind === "tiles" || kind === "tiles_small" || kind === "slabs") {
    const t = kind === "tiles" ? 16 : 8;
    for (let x = 0; x < N; x += t) for (let y = 0; y < N; y += t) { rect(x, y, t, t, C(0.96 + R() * 0.08)); rect(x, y, t - 1, 1, C(1.12)); rect(x, y, 1, t - 1, C(1.08)); }
    for (let k = 0; k < N; k += t) { rect(k + t - 1, 0, 1, N, C(kind === "slabs" ? 0.7 : 0.62)); rect(0, k + t - 1, N, 1, C(kind === "slabs" ? 0.7 : 0.62)); }
    for (let k = 0; k < 6; k++) px(Math.floor(R() * N), Math.floor(R() * N), C(0.85));
  } else if (kind === "herringbone") {
    const tints = [[230, 150, 130], [235, 190, 110], [245, 225, 190]];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const a = Math.floor((x + y) / 4), d = Math.floor((x - y + 32) / 4), id = (x % 8 < 4) ? a : d + 50, seam = (x % 8 < 4) ? (x + y) % 4 === 3 : (x - y + 32) % 4 === 3;
      px(x, y, seam ? C(0.7) : C(0.95 + ((id * 37) % 5) * 0.03, tints[id % 3]));
    }
  } else if (kind === "brick") {
    for (let y = 0; y < N; y += 4) for (let x = 0; x < N; x += 8) { const o = (y / 4) % 2 ? 4 : 0; rect(x + o, y, 7, 3, C(0.9 + R() * 0.18)); rect(x + o, y, 7, 1, C(1.12)); }
    for (let y = 3; y < N; y += 4) rect(0, y, N, 1, C(1.3));
  } else if (kind === "grass") {
    for (let k = 0; k < 14; k++) { const x = Math.floor(R() * N), y = Math.floor(R() * N); px(x, y, C(1.3)); px(x - 1, y + 1, C(1.18)); px(x + 1, y + 1, C(1.18)); }
    for (let k = 0; k < 10; k++) px(Math.floor(R() * N), Math.floor(R() * N), C(0.8));
    if (R() < 0.6) { const x = Math.floor(R() * 14) + 1, y = Math.floor(R() * 14) + 1, fc = R() < 0.5 ? "#f05a5a" : "#f7e15a"; px(x, y, fc); px(x + 1, y, fc); px(x, y + 1, fc); px(x + 1, y + 1, fc); }
  } else if (kind === "paving" || kind === "gravel") {
    const n = kind === "gravel" ? 60 : 18;
    for (let k = 0; k < n; k++) { const x = Math.floor(R() * N), y = Math.floor(R() * N); px(x, y, C(0.82)); if (kind === "paving") px(x + 1, y, C(0.82)); px(x, y - 1, C(1.15)); }
  } else if (kind === "roof") {
    for (let y = 0; y < N; y += 4) { rect(0, y, N, 4, C(1)); rect(0, y + 3, N, 1, C(0.6)); for (let x = (y / 4) % 2 ? 2 : 6; x < N; x += 8) rect(x, y, 1, 3, C(0.7)); }
  } else {
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2 === 0 && R() < (kind === "carpet" ? 0.45 : 0.2)) px(x, y, C(kind === "carpet" ? 1.12 : 0.92));
  }
  return (PX_CACHE[key] = cv);
}
function pixelUrl(kind, color) { const k = "u|" + kind + color; return PX_CACHE[k] || (PX_CACHE[k] = pixelTile(kind, color).toDataURL("image/png")); }
// Sprite aus Rechtecken zeichnen, danach automatische dunkle Kontur
function pxSprite(key, n, draw) {
  if (PX_CACHE[key]) return PX_CACHE[key];
  const cv = pxCanvas(n), g = cv.getContext("2d"), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  draw(R, g);
  const d = g.getImageData(0, 0, n, n), a = (x, y) => x >= 0 && y >= 0 && x < n && y < n && d.data[(y * n + x) * 4 + 3] > 0, out = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) out.push([x, y]);
  out.forEach(([x, y]) => R(x, y, 1, 1, PX_OUT));
  return (PX_CACHE[key] = cv.toDataURL("image/png"));
}
const PX = {
  lamp: (on) => pxSprite("lamp" + on, 16, (R) => { R(6, 1, 4, 2, "#5b4a6b"); R(4, 3, 8, 9, on ? "#ffe37a" : "#9a96a0"); R(5, 4, 2, 6, on ? "#fff6c2" : "#c4c0c8"); R(4, 12, 8, 2, "#5b4a6b"); R(7, 14, 2, 1, "#5b4a6b"); }),
  person: (hair, shirt, f) => pxSprite(`p${hair}${shirt}${f}`, 16, (R) => {
    R(4, 1, 8, 3, hair); R(4, 4, 1, 3, hair); R(11, 4, 1, 3, hair); R(5, 4, 6, 4, "#f2c6a0"); R(6, 5, 1, 1, "#2a2030"); R(9, 5, 1, 1, "#2a2030");
    R(4, 8, 8, 4, shirt); R(3, 9, 1, 3, "#f2c6a0"); R(12, 9, 1, 3, "#f2c6a0"); R(5, 12, 6, 2, "#3c4a7a");
    if (f) { R(5, 14, 2, 1, "#3a2a2a"); R(9, 13, 2, 1, "#3a2a2a"); } else { R(5, 13, 2, 1, "#3a2a2a"); R(9, 14, 2, 1, "#3a2a2a"); }
  }),
  cat: (f) => pxSprite("cat" + f, 16, (R) => {
    R(2, 7, 9, 4, "#232026"); R(10, 4, 5, 5, "#232026"); R(10, 3, 1, 1, "#232026"); R(14, 3, 1, 1, "#232026"); R(11, 7, 3, 2, "#f4f2ee"); R(11, 5, 1, 1, "#9be36a"); R(13, 5, 1, 1, "#9be36a");
    R(1, 4, 1, 4, "#232026"); R(6, 9, 3, 2, "#f4f2ee");
    if (f) { R(3, 11, 1, 2, "#f4f2ee"); R(9, 11, 1, 2, "#f4f2ee"); } else { R(4, 11, 1, 2, "#f4f2ee"); R(8, 11, 1, 2, "#f4f2ee"); }
  }),
  tree: (c) => pxSprite("tree" + c, 32, (R) => {
    const b = hexRgb(c), C = (f) => `rgb(${b.map((x) => clamp(Math.round(x * f), 0, 255)).join(",")})`;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 15.5, y - 15.5); if (d < 14) R(x, y, 1, 1, d < 7 && x < 15 && y < 15 ? C(1.3) : (x + y) % 5 === 0 ? C(0.8) : x - y > 10 ? C(0.85) : C(1)); }
    [[9, 9], [20, 11], [12, 20], [21, 21]].forEach(([x, y]) => { R(x, y, 3, 1, C(1.4)); R(x + 1, y - 1, 1, 1, C(1.4)); });
  }),
  bush: (c) => pxSprite("bush" + c, 16, (R) => {
    const b = hexRgb(c), C = (f) => `rgb(${b.map((x) => clamp(Math.round(x * f), 0, 255)).join(",")})`;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 7) R(x, y, 1, 1, d < 3.5 && x < 8 && y < 8 ? C(1.3) : (x * y) % 7 === 0 ? C(0.8) : C(1)); }
  }),
};
// Wandoberfläche einer Wandseite: Wand-Einstellung (für eine Seite oder beide) vor Raum-Einstellung
function finishFor(w, room) {
  if (w && (w.finish || w.color) && (!w.side || w.side === room.id)) { const br = w.finish === "brick"; return { kind: br ? "brick" : "paint", col: w.color || (br ? FLOORS.brick.c : "#f3f1ec") }; }
  if (room.wall_finish === "brick") return { kind: "brick", col: room.wall_color || FLOORS.brick.c };
  if (room.wall_color) return { kind: "paint", col: room.wall_color };
  return null;
}
const needPaint = (m) => m.areas.some((a) => !a.outdoor && (a.wall_color || a.wall_finish)) || m.walls.some((w) => w.finish || w.color);
// Polygon an einer senkrechten (x) bzw. waagerechten (y) Linie abschneiden, Teil auf Seite ">" oder "<" behalten
function clipPoly(pts, axis, at, side) {
  const i = axis === "y" ? 1 : 0, inside = (q) => (side === "<" ? q[i] <= at : q[i] >= at), out = [];
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k], q = pts[(k + 1) % pts.length], pi = inside(p), qi = inside(q);
    if (pi) out.push(p);
    if (pi !== qi) { const t = (at - p[i]) / (q[i] - p[i]); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out.length >= 3 ? out : null;
}
// zweiter Boden eines Raums (Bodenwechsel an einer Linie)
function floor2Of(a, dark) {
  if (!a.floor2 || a.split_at == null || a.split_at === "") return null;
  const f = floorOf({ floor: a.floor2, floor_color: a.floor2_color, floor_angle: a.floor2_angle }, dark);
  const pts = f && clipPoly(a.points, a.split_axis === "y" ? "y" : "x", +a.split_at, a.split_side === "<" ? "<" : ">");
  return pts ? { ...f, pts } : null;
}
// für 2D: verkleinerte, abgedunkelte (Dunkelmodus) JPEG-Daten-URL
function floorUrl(kind, color, dim) {
  const key = "u|" + kind + "|" + color + "|" + dim;
  if (FLOOR_CACHE[key]) return FLOOR_CACHE[key];
  const src = floorCanvas(kind, color), cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const g = cv.getContext("2d"); g.drawImage(src, 0, 0, 256, 256);
  if (dim < 1) { g.fillStyle = `rgba(0,0,0,${1 - dim})`; g.fillRect(0, 0, 256, 256); }
  return (FLOOR_CACHE[key] = cv.toDataURL("image/jpeg", 0.85));
}
const anyOn = (h, ids) => [].concat(ids || []).some((e) => { const s = h && h.states[e]; return !!s && ON_STATES.includes(s.state); });
// Blickkegel als Punktliste (Plan-Koordinaten)
function fovPts(it) {
  const a = rad(it.angle || 0), f = rad(it.fov || 90), R = it.range || 600, n = 14, pts = [[it.x, it.y]];
  for (let k = 0; k <= n; k++) { const t = a - f / 2 + (f * k) / n; pts.push([it.x + Math.cos(t) * R, it.y + Math.sin(t) * R]); }
  return pts;
}
function heatColor(kind, n) {
  const s = HEAT[kind].stops;
  if (n <= s[0][0]) return s[0][1];
  for (let i = 1; i < s.length; i++) if (n <= s[i][0]) { const [a, ca] = s[i - 1], [b, cb] = s[i], t = (n - a) / (b - a); return ca.map((v, k) => Math.round(v + (cb[k] - v) * t)); }
  return s[s.length - 1][1];
}
const RUN_STATES = ["on", "playing", "cleaning", "running", "heat", "cool", "heating", "printing", "washing", "drying", "active", "run"];
const SVGNS = "http://www.w3.org/2000/svg";
const ICON = {
  fan: "M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z",
  light: "M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",
  camera: "M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z",
  power: "M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13",
};
const OFF_STATES = ["unavailable", "unknown"];
// three.js wird nur für die 3D-Ansicht geladen. Für Offline-Betrieb: Datei nach /config/www legen und three_url setzen.
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";
let THREE_PROMISE = null;
const PLAN_CACHE = {};
const ADDON_CACHE = {}, MODEL_CACHE = {};
const ALARM = { smoke: { i: "🔥", n: "Rauch" }, gas: { i: "💨", n: "Gas" }, water: { i: "💧", n: "Wasser" }, co: { i: "☠️", n: "Kohlenmonoxid" } };
// Farbthemen: 3D-Farben (Boden, Wand, außen, Hintergrund)
const SKIN3D = { blueprint: { floor: 0x174a7c, wall: 0xe8f1ff, out: 0x0f3a63, bg: 0x0d3359, furn: 0x2c6299 }, neon: { floor: 0x10131b, wall: 0x2be0ff, out: 0x07090d, bg: 0x05060a, furn: 0x1b2233 }, paper: { floor: 0xf4ecda, wall: 0x4a3f33, out: 0xe6d9bd, bg: 0xefe4cc, furn: 0xd8cbb0 }, mono: { floor: 0x3a3a3a, wall: 0xdddddd, out: 0x2a2a2a, bg: 0x1e1e1e, furn: 0x555555 } };
function findPlanCard(node) {
  if (!node || typeof node !== "object") return null;
  if (node.type === "custom:raumwerk-card" && node.plan) return node;
  for (const k of ["views", "sections", "cards", "card"]) {
    const v = node[k];
    for (const c of Array.isArray(v) ? v : v ? [v] : []) { const f = findPlanCard(c); if (f) return f; }
  }
  return null;
}
function loadThree(url) {
  if (!THREE_PROMISE) THREE_PROMISE = import(new URL(url, location.href).href).catch((e) => { THREE_PROMISE = null; throw e; });
  return THREE_PROMISE;
}

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const rad = (d) => (d * Math.PI) / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function centroid(pts) {
  // Flächenschwerpunkt; fällt er aus dem Polygon (L-Form), Mittelpunkt der größten Rechteck-Spalte
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    a += f; cx += (pts[j][0] + pts[i][0]) * f; cy += (pts[j][1] + pts[i][1]) * f;
  }
  if (!a) return pts[0];
  let c = [cx / (3 * a), cy / (3 * a)];
  if (!pointInPoly(c[0], c[1], pts)) {
    const xs = pts.map((p) => p[0]);
    const y = c[1], x0 = Math.min(...xs), x1 = Math.max(...xs);
    for (let k = 1; k < 40; k++) { const x = x0 + ((x1 - x0) * k) / 40; if (pointInPoly(x, y, pts)) { c = [x, y]; break; } }
  }
  return c;
}
function kelvinToRgb(k) {
  const t = k / 100; let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
  else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
  return [r, g, b].map((v) => Math.round(clamp(v, 0, 255)));
}
function stateColor(rules, st) {
  if (!rules || !st) return null;
  const s = st.state, n = parseFloat(s);
  let best = null, def = null;
  for (const r of rules) {
    if (r.state !== undefined && String(r.state) === s) return r.color;
    if (r.above !== undefined && !isNaN(n) && n > r.above && (!best || r.above > best.above)) best = r;
    if (r.below !== undefined && !isNaN(n) && n < r.below && !best) best = r;
    if (r.state === undefined && r.above === undefined && r.below === undefined) def = r;
  }
  return best ? best.color : def ? def.color : null;
}

// ---------- Möbel-Katalog ----------
// Teile: [Form, x0, x1, y0, y1, z0, z1, Farbe] – x/y als Anteil von Breite/Tiefe (−0,5 … 0,5), z als Anteil der Höhe.
// Rückseite = y −0,5 (an die Wand), Vorderseite = y +0,5. Formen: b = Quader, c = Zylinder/Ellipse, s = Kugel.
const LEGS = (t, z1, k = "wood", i = 0.05) => [[-0.5, -0.5 + t], [0.5 - t, 0.5], [-0.5, -0.5 + t], [0.5 - t, 0.5]].map((xx, j) => ["b", xx[0], xx[1], j < 2 ? -0.5 + i : 0.5 - i - t, j < 2 ? -0.5 + i + t : 0.5 - i, 0, z1, k]);
const KBASE = [["b", -0.5, 0.5, -0.5, 0.44, 0.05, 0.955, "cab"], ["b", -0.47, 0.47, -0.45, 0.4, 0, 0.05, "dark"], ["b", -0.5, 0.5, -0.5, 0.5, 0.955, 1, "top"]];
const CATALOG = {
  // Wohnen
  sofa: { n: "Sofa", c: "Wohnen", w: 220, d: 95, h: 80, p: [["b", -0.5, 0.5, -0.5, 0.5, 0.05, 0.52, "soft"], ["b", -0.5, 0.5, -0.5, -0.24, 0.52, 1, "soft"], ["b", -0.5, -0.43, -0.24, 0.5, 0.52, 0.78, "soft"], ["b", 0.43, 0.5, -0.24, 0.5, 0.52, 0.78, "soft"], ["b", -0.4, -0.01, -0.22, 0.45, 0.52, 0.6, "soft2"], ["b", 0.01, 0.4, -0.22, 0.45, 0.52, 0.6, "soft2"]] },
  armchair: { n: "Sessel", c: "Wohnen", w: 85, d: 85, h: 80, p: [["b", -0.5, 0.5, -0.5, 0.5, 0.05, 0.52, "soft"], ["b", -0.5, 0.5, -0.5, -0.25, 0.52, 1, "soft"], ["b", -0.5, -0.36, -0.25, 0.5, 0.52, 0.78, "soft"], ["b", 0.36, 0.5, -0.25, 0.5, 0.52, 0.78, "soft"], ["b", -0.34, 0.34, -0.23, 0.45, 0.52, 0.6, "soft2"]] },
  coffee_table: { n: "Couchtisch", c: "Wohnen", w: 100, d: 60, h: 40, p: [["b", -0.5, 0.5, -0.5, 0.5, 0.88, 1, "wood"], ...LEGS(0.06, 0.88)] },
  tv: { n: "Fernseher", c: "Wohnen", w: 140, d: 10, h: 80, z: 55, top: true, p: [["b", -0.5, 0.5, -0.5, 0.2, 0.02, 1, "screen"], ["b", -0.08, 0.08, -0.4, 0.5, 0, 0.08, "dark"]] },
  tv_board: { n: "Lowboard", c: "Wohnen", w: 180, d: 40, h: 50, p: [["b", -0.5, 0.5, -0.5, 0.5, 0.1, 1, "cab"], ["b", -0.48, 0.48, -0.45, 0.45, 0, 0.1, "dark"]] },
  shelf: { n: "Regal", c: "Wohnen", w: 80, d: 35, h: 180, p: [["b", -0.5, -0.46, -0.5, 0.5, 0, 1, "wood"], ["b", 0.46, 0.5, -0.5, 0.5, 0, 1, "wood"], ["b", -0.46, 0.46, -0.5, -0.44, 0, 1, "wood"], ...[0, 0.25, 0.5, 0.75, 0.98].map((z) => ["b", -0.46, 0.46, -0.44, 0.5, z, z + 0.02, "wood"])] },
  wardrobe: { n: "Kleiderschrank", c: "Schlafen", w: 200, d: 60, h: 210, p: [["b", -0.5, 0.5, -0.5, 0.47, 0, 1, "cab"], ["b", -0.495, -0.005, 0.47, 0.5, 0.02, 0.99, "cab2"], ["b", 0.005, 0.495, 0.47, 0.5, 0.02, 0.99, "cab2"]] },
  dresser: { n: "Kommode", c: "Schlafen", w: 120, d: 45, h: 85, p: [["b", -0.5, 0.5, -0.5, 0.5, 0.06, 1, "cab"], ["b", -0.47, 0.47, -0.45, 0.45, 0, 0.06, "dark"]] },
  // Schlafen
  bed: { n: "Doppelbett", c: "Schlafen", w: 180, d: 200, h: 50, p: [["b", -0.5, 0.5, -0.47, 0.5, 0, 0.7, "wood"], ["b", -0.48, 0.48, -0.45, 0.48, 0.7, 1.05, "white"], ["b", -0.5, 0.5, -0.5, -0.47, 0, 2, "wood"], ["b", -0.45, -0.03, -0.43, -0.3, 1.05, 1.3, "white2"], ["b", 0.03, 0.45, -0.43, -0.3, 1.05, 1.3, "white2"], ["b", -0.49, 0.49, -0.2, 0.49, 1.05, 1.15, "soft"]] },
  bed_single: { n: "Einzelbett", c: "Schlafen", w: 90, d: 200, h: 50, p: [["b", -0.5, 0.5, -0.47, 0.5, 0, 0.7, "wood"], ["b", -0.47, 0.47, -0.45, 0.48, 0.7, 1.05, "white"], ["b", -0.5, 0.5, -0.5, -0.47, 0, 2, "wood"], ["b", -0.4, 0.4, -0.43, -0.3, 1.05, 1.3, "white2"], ["b", -0.49, 0.49, -0.2, 0.49, 1.05, 1.15, "soft"]] },
  nightstand: { n: "Nachttisch", c: "Schlafen", w: 45, d: 40, h: 50, p: [["b", -0.5, 0.5, -0.5, 0.5, 0.15, 1, "cab"], ...LEGS(0.1, 0.15)] },
  // Essen
  table: { n: "Esstisch", c: "Essen", w: 160, d: 90, h: 75, p: [["b", -0.5, 0.5, -0.5, 0.5, 0.95, 1, "wood"], ...LEGS(0.04, 0.95, "wood", 0.04)] },
  table_round: { n: "Tisch rund", c: "Essen", w: 80, d: 80, h: 75, p: [["c", -0.5, 0.5, -0.5, 0.5, 0.95, 1, "wood"], ["c", -0.06, 0.06, -0.06, 0.06, 0, 0.95, "wood"], ["c", -0.25, 0.25, -0.25, 0.25, 0, 0.03, "wood"]] },
  chair: { n: "Stuhl", c: "Essen", w: 45, d: 50, h: 90, p: [["b", -0.5, 0.5, -0.4, 0.5, 0.47, 0.52, "wood"], ["b", -0.5, 0.5, -0.5, -0.4, 0.52, 1, "wood"], ...LEGS(0.1, 0.47, "wood", 0)] },
  bench: { n: "Bank", c: "Essen", w: 140, d: 40, h: 45, p: [["b", -0.5, 0.5, -0.5, 0.5, 0.88, 1, "wood"], ["b", -0.46, -0.4, -0.45, 0.45, 0, 0.88, "wood"], ["b", 0.4, 0.46, -0.45, 0.45, 0, 0.88, "wood"]] },
  // Küche (Module 60 cm, an die Wand mit der Rückseite)
  kitchen: { n: "Küchenzeile (Block)", c: "Küche", w: 240, d: 60, h: 90, p: KBASE },
  k_base: { n: "Unterschrank", c: "Küche", w: 60, d: 60, h: 90, p: [...KBASE, ["b", -0.47, 0.47, 0.44, 0.47, 0.75, 0.93, "cab2"]] },
  k_niche: { n: "Nische (offen, nur Arbeitsplatte)", c: "Küche", w: 60, d: 60, h: 90, p: [["b", -0.5, 0.5, -0.5, 0.5, 0.955, 1, "top"]] },
  k_sink: { n: "Spüle", c: "Küche", w: 80, d: 60, h: 90, p: [...KBASE, ["b", -0.36, 0.36, -0.3, 0.32, 0.999, 1.006, "metal"], ["c", -0.04, 0.04, -0.44, -0.36, 1, 1.35, "metal"]] },
  k_hob: { n: "Herd / Kochfeld", c: "Küche", w: 60, d: 60, h: 90, p: [...KBASE, ["b", -0.44, 0.44, -0.4, 0.42, 0.999, 1.006, "glass_dark"], ...[[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.2], [0.2, 0.2]].map(([x, y]) => ["c", x - 0.13, x + 0.13, y - 0.13, y + 0.13, 1.006, 1.01, "burner"])] },
  k_dishwasher: { n: "Geschirrspüler", c: "Küche", w: 60, d: 60, h: 90, p: [["b", -0.5, 0.5, -0.5, 0.44, 0.05, 0.955, "cab"], ["b", -0.48, 0.48, 0.44, 0.47, 0.06, 0.93, "white"], ["b", -0.5, 0.5, -0.5, 0.5, 0.955, 1, "top"]] },
  k_tall: { n: "Hochschrank", c: "Küche", w: 60, d: 60, h: 210, p: [["b", -0.5, 0.5, -0.5, 0.45, 0, 1, "cab"], ["b", -0.48, 0.48, 0.45, 0.48, 0.03, 0.99, "cab2"]] },
  k_wall: { n: "Oberschrank", c: "Küche", w: 60, d: 35, h: 70, z: 145, p: [["b", -0.5, 0.5, -0.5, 0.42, 0, 1, "cab"], ["b", -0.48, 0.48, 0.42, 0.5, 0.02, 0.98, "cab2"]] },
  worktop: { n: "Arbeitsplatte", c: "Küche", w: 120, d: 60, h: 4, z: 86, p: [["b", -0.5, 0.5, -0.5, 0.5, 0, 1, "top"]] },
  fridge: { n: "Kühlschrank", c: "Küche", w: 60, d: 65, h: 185, p: [["b", -0.5, 0.5, -0.5, 0.44, 0, 1, "white"], ["b", -0.49, 0.49, 0.44, 0.48, 0.01, 0.62, "white2"], ["b", -0.49, 0.49, 0.44, 0.48, 0.63, 0.995, "white2"]] },
  coffee: { n: "Kaffeemaschine", c: "Küche", w: 28, d: 40, h: 38, z: 90, top: true, p: [["b", -0.5, 0.5, -0.5, 0.1, 0, 1, "dark"], ["b", -0.5, 0.5, 0.1, 0.5, 0.75, 1, "dark"], ["b", -0.45, 0.45, 0.1, 0.45, 0, 0.06, "metal"], ["c", -0.15, 0.15, 0.2, 0.4, 0.06, 0.32, "white"]] },
  microwave: { n: "Mikrowelle", c: "Küche", w: 50, d: 40, h: 30, z: 90, top: true, p: [["b", -0.5, 0.5, -0.5, 0.5, 0, 1, "metal"], ["b", -0.45, 0.2, 0.48, 0.51, 0.15, 0.85, "glass_dark"]] },
  // Bad
  toilet: { n: "WC", c: "Bad", w: 38, d: 58, h: 40, p: [["b", -0.5, 0.5, -0.5, -0.28, 0.4, 2.3, "white"], ["c", -0.48, 0.48, -0.33, 0.5, 0.2, 1, "white"], ["c", -0.34, 0.34, -0.2, 0.4, 1, 1.02, "water"]] },
  shower: { n: "Dusche", c: "Bad", w: 90, d: 90, h: 200, p: [["b", -0.5, 0.5, -0.5, 0.5, 0, 0.03, "white"], ["c", -0.04, 0.04, -0.04, 0.04, 0.025, 0.035, "dark"], ["b", -0.5, 0.5, 0.48, 0.5, 0.03, 1, "glass"], ["b", 0.48, 0.5, -0.5, 0.48, 0.03, 1, "glass"], ["c", -0.12, 0.12, -0.5, -0.3, 0.97, 1, "metal"]] },
  bathtub: { n: "Badewanne", c: "Bad", w: 170, d: 75, h: 58, p: [["b", -0.5, 0.5, -0.5, 0.5, 0, 1, "white"], ["c", -0.44, 0.44, -0.38, 0.38, 0.995, 1.004, "water"]] },
  washbasin: { n: "Waschtisch", c: "Bad", w: 60, d: 45, h: 85, p: [["b", -0.5, 0.5, -0.5, 0.45, 0.35, 0.82, "cab"], ["b", -0.5, 0.5, -0.5, 0.5, 0.82, 1, "white"], ["c", -0.34, 0.34, -0.25, 0.4, 0.999, 1.006, "water"], ["c", -0.04, 0.04, -0.45, -0.32, 1, 1.25, "metal"]] },
  washer: { n: "Waschmaschine", c: "Bad", w: 60, d: 60, h: 85, p: [["b", -0.5, 0.5, -0.5, 0.48, 0, 1, "white"], ["b", -0.5, 0.5, -0.5, -0.36, 1, 1.01, "dark"], ["c", -0.3, 0.3, 0.47, 0.5, 0.2, 0.75, "glass_dark"]] },
  dryer: { n: "Trockner", c: "Bad", w: 60, d: 60, h: 85, p: [["b", -0.5, 0.5, -0.5, 0.48, 0, 1, "white"], ["b", -0.5, 0.5, -0.5, -0.36, 1, 1.01, "dark"], ["c", -0.3, 0.3, 0.47, 0.5, 0.2, 0.75, "glass"]] },
  // Büro
  desk: { n: "Schreibtisch", c: "Büro", w: 140, d: 70, h: 75, p: [["b", -0.5, 0.5, -0.5, 0.5, 0.95, 1, "wood"], ["b", -0.48, -0.44, -0.45, 0.45, 0, 0.95, "metal"], ["b", 0.44, 0.48, -0.45, 0.45, 0, 0.95, "metal"]] },
  monitor: { n: "Monitor", c: "Büro", w: 60, d: 20, h: 45, z: 75, top: true, p: [["b", -0.5, 0.5, -0.3, -0.1, 0.22, 1, "screen"], ["b", -0.05, 0.05, -0.38, -0.3, 0, 0.6, "dark"], ["b", -0.2, 0.2, -0.5, 0.2, 0, 0.04, "dark"]] },
  office_chair: { n: "Bürostuhl", c: "Büro", w: 60, d: 60, h: 110, p: [["c", -0.5, 0.5, -0.5, 0.5, 0, 0.05, "dark"], ["c", -0.05, 0.05, -0.05, 0.05, 0.05, 0.42, "metal"], ["b", -0.4, 0.4, -0.3, 0.42, 0.42, 0.48, "dark"], ["b", -0.36, 0.36, -0.42, -0.32, 0.5, 1, "dark"]] },
  pc: { n: "Computer", c: "Büro", w: 22, d: 45, h: 45, top: true, p: [["b", -0.5, 0.5, -0.5, 0.5, 0, 1, "dark"]] },
  printer3d: { n: "3D-Drucker", c: "Büro", w: 45, d: 45, h: 50, z: 90, top: true, p: [["b", -0.5, 0.5, -0.5, 0.5, 0, 0.1, "dark"], ["b", -0.5, -0.42, -0.5, 0.5, 0.1, 1, "metal"], ["b", 0.42, 0.5, -0.5, 0.5, 0.1, 1, "metal"], ["b", -0.5, 0.5, -0.1, 0, 0.92, 1, "metal"], ["b", -0.35, 0.35, -0.35, 0.35, 0.22, 0.24, "dark"]] },
  // Sonstiges
  dock: { n: "Ladestation Sauger", c: "Sonstiges", w: 35, d: 20, h: 12, top: true, p: [["b", -0.5, 0.5, -0.5, 0.5, 0, 1, "dark"]] },
  box: { n: "Sonstiges (Box)", c: "Sonstiges", w: 60, d: 60, h: 75, p: [["b", -0.5, 0.5, -0.5, 0.5, 0, 1, "cab"]] },
};
// Sonderformen mit eigener Zeichnung
const CAT_SPECIAL = { sofa_u: ["Wohnlandschaft (U)", "Wohnen", 430, 200], rug: ["Teppich", "Wohnen", 300, 200], plant: ["Pflanze", "Sonstiges", 55, 55], stairs: ["Treppe", "Sonstiges", 100, 300], pillar: ["Pfeiler", "Sonstiges", 35, 35],
  tree: ["Laubbaum", "Garten", 300, 300], conifer: ["Nadelbaum", "Garten", 180, 180], bush: ["Busch", "Garten", 110, 110], hedge: ["Hecke", "Garten", 300, 60], model: ["3D-Modell (glb/obj)", "Sonstiges", 100, 100] };
const GARDEN = ["tree", "conifer", "bush", "hedge"];
const FCOL = {
  dark: { wood: 0x5a4a3c, soft: 0x55524e, soft2: 0x615d58, white: 0xd8d4ce, white2: 0xc8c3bc, cab: 0x4d4945, cab2: 0x57524d, top: 0x6b6158, dark: 0x262422, screen: 0x151515, metal: 0x8e8b86, glass: 0x5aa0e6, glass_dark: 0x1d1c1b, water: 0x5c8fb8, burner: 0x3a3836 },
  light: { wood: 0xb08d68, soft: 0x9c958c, soft2: 0xaaa298, white: 0xfbfaf8, white2: 0xeeebe6, cab: 0xe4ddd2, cab2: 0xd6cec2, top: 0x9a8b7a, dark: 0x3b3835, screen: 0x1b1b1b, metal: 0xb9b6b0, glass: 0x9cc7ef, glass_dark: 0x2a2928, water: 0x9cc7ef, burner: 0x55524e },
};
function catOf(f) { return CATALOG[f.type] || null; }
function furnHeight(f) { const c = catOf(f); return f.height ?? (c ? c.h : 75); }
function furnZ(f) { const c = catOf(f); return f.z ?? (c && c.z) ?? 0; }
// 2D-Draufsicht aus den Teilen (lokale Koordinaten, Mittelpunkt 0/0)
function drawCat2d(grp, f, dark, mk) {
  const c = catOf(f), w = f.w, d = f.h, H = furnHeight(f), pal = FCOL[dark ? "dark" : "light"];
  const hex = (k) => "#" + (pal[k] ?? pal.cab).toString(16).padStart(6, "0");
  const parts = c.p.slice().sort((a, b) => a[6] - b[6]);
  let body = null;
  parts.forEach((q, i) => {
    const [s, x0, x1, y0, y1, , z1, k] = q;
    if (z1 * H > 230) return;
    const a = { fill: hex(k), class: "fpart" + (k === "glass" || k === "water" ? " fglass" : "") };
    const e = s === "b" ? mk("rect", { ...a, x: x0 * w, y: y0 * d, width: (x1 - x0) * w, height: (y1 - y0) * d, rx: Math.min(2, (x1 - x0) * w * 0.1) }, grp)
      : mk("ellipse", { ...a, cx: ((x0 + x1) / 2) * w, cy: ((y0 + y1) / 2) * d, rx: ((x1 - x0) / 2) * w, ry: ((y1 - y0) / 2) * d }, grp);
    if (!body) body = e;
  });
  // Vorderkante markieren
  mk("line", { x1: -w / 2 + 2, y1: d / 2, x2: w / 2 - 2, y2: d / 2, class: "ffront" }, grp);
  return body;
}
window.RaumwerkCatalog = { CATALOG, CAT_SPECIAL, FCOL, drawCat2d, furnHeight, furnZ, FLOORS, SURF_FLOOR };

class Raumwerk extends HTMLElement {
  static getStubConfig() { return { plan: { walls: [], openings: [], furniture: [], items: [], areas: [] } }; }
  static async getConfigElement() {
    if (!customElements.get("raumwerk-editor")) {
      // HACS trägt nur die Karte als Ressource ein: der Editor liegt daneben und wird bei Bedarf nachgeladen.
      try { await import(new URL("raumwerk-editor.js", import.meta.url).href); } catch (e) { throw new Error("Raumwerk: Editor konnte nicht nachgeladen werden (" + e + ")"); }
    }
    await customElements.whenDefined("raumwerk-editor");
    return document.createElement("raumwerk-editor");
  }
  setConfig(config) {
    if (!config || (!config.plan && !config.plan_source)) throw new Error("plan oder plan_source fehlt");
    this._config = { view: "tilt", wall_height: 95, icon_scale: 1, rotate_portrait: true, ...config };
    let saved = null;
    try { saved = localStorage.getItem("jg-view"); } catch (e) {}
    this._view = saved || this._config.view;
    let hs = null;
    try { hs = localStorage.getItem("jg-heat"); } catch (e) {}
    this._heat = hs !== null ? hs || null : this._config.heatmap || null;
    if (this._config.edit3d) { this._view = "3d"; this._heat = null; }
    try { this._lvl = +(localStorage.getItem("jg-level") || 0); this._roofOn = localStorage.getItem("jg-roof") === "1"; } catch (e) {}
    let so = null; try { so = localStorage.getItem("jg-out"); } catch (e) {}
    this._outOn = so !== null ? so === "1" : this._config.outdoor ?? !(window.innerWidth < 600);
    this._built = false;
    if (this._root) this._build();
  }
  getCardSize() { return 8; }

  connectedCallback() {
    if (!this._root) this._init();
    this._onResize = () => {
      const w = this.clientWidth;
      if (this._portrait() !== this._isPortrait || (w && this._bw && Math.abs(w - this._bw) / this._bw > 0.2)) this._build();
    };
    window.addEventListener("resize", this._onResize);
    if (!this._kt) this._kt = setInterval(() => this._kioskTick(), 5000);
    if (this._hass && !this._built) this._build();
    if (window.ResizeObserver && !this._ro) { this._ro = new ResizeObserver(() => this._onResize()); this._ro.observe(this); }
  }
  disconnectedCallback() {
    window.removeEventListener("resize", this._onResize);
    clearInterval(this._kt); this._kt = null; clearInterval(this._walkT);
    cancelAnimationFrame(this._vacRaf || 0); this._vacRaf = 0;
    if (this._v3) { this._dispose3d(); this._built = false; }
  }

  set hass(h) {
    this._live = h;
    if (this._tt && this._built) return; // Zeitreise: Live-Daten nur merken
    const first = !this._hass;
    this._hass = h;
    if (!this._root) this._init();
    const dark = !!(h.themes && h.themes.darkMode);
    const src = this._config && !this._config.plan && this._config.plan_source;
    if (src && !PLAN_CACHE[src]) {
      PLAN_CACHE[src] = h.callWS({ type: "lovelace/config", url_path: src })
        .then((cfg) => { const c = findPlanCard(cfg); if (!c) throw new Error("kein Plan in " + src); return c; });
      PLAN_CACHE[src].then(() => { this._built = false; if (this._hass) this.hass = this._hass; })
        .catch((e) => { this._stage && (this._stage.innerHTML = `<div class="msg">Plan aus „${this._esc(src)}“ nicht lesbar: ${this._esc(e.message || e)}</div>`); });
    }
    if (src && !this._srcPlan) {
      PLAN_CACHE[src].then((c) => { if (!this._srcPlan) { this._srcPlan = c.plan; this._srcLevels = c.levels; this._srcLevelName = c.level_name; this._built = false; this.hass = this._hass; } }).catch(() => {});
      if (!this._stage.firstChild) this._stage.innerHTML = `<div class="msg">Plan wird geladen …</div>`;
      return;
    }
    if (first || dark !== this._dark || !this._built) { this._dark = dark; this._build(); return; }
    this._update();
  }

  _portrait() { return !!this._config.rotate_portrait && window.innerHeight > window.innerWidth * 1.05; }

  _init() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.innerHTML = `<style>${STYLE}</style>
      <ha-card><div class="wrap">
        <div class="bar"><div class="seg"><button data-v="2d">2D</button><button data-v="tilt">Schräg</button><button data-v="3d">3D</button></div><button class="morb" aria-label="Mehr"><svg viewBox="0 0 24 24" width="20" height="20"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg></button><div class="opts"><select class="hb" hidden aria-label="Ansicht"></select><select class="rz" aria-label="Bereich"></select><button class="rain" hidden></button><button class="outb" title="Außenbereich ein/aus">🌳 Außen</button><button class="cine" hidden title="Kino-Modus">🎬</button><button class="ttb" title="Zeitreise">⏱</button><select class="lv" hidden aria-label="Etage"></select><button class="roofb" hidden>🏠</button></div></div>
        <div class="legend" hidden></div>
        <div class="info"><div class="wx" hidden></div><div class="ppl" hidden></div></div>
        <div class="ttbadge" hidden></div>
        <div class="alarmbar" hidden></div>
        <div class="cbub" hidden><div class="cbh"><b></b><span class="cbs"></span><button class="cbx" aria-label="Schließen">✕</button></div><div class="cbb"></div></div>
        <div class="utoast" hidden><span></span><button>Rückgängig</button></div>
        <div class="tt" hidden><div class="tth"><button class="tlive">● Live</button><button class="tplay">▶</button><button class="tsp">1 min/s</button><button class="tdays">24 h</button><span class="tlab"></span></div><div class="ttr"><div class="ttm"></div><input class="tsl" type="range"></div></div>
        <div class="stage"></div>
        <div class="panel" hidden><div class="ph"><span class="pt"></span><button class="pwv" title="Wandansicht">▦ Wände</button><button class="px" aria-label="Schließen">✕</button></div><div class="pb"></div></div>
        <div class="toast" hidden></div>
        <div class="mpop" hidden><div class="ch"><b></b><span class="cs"></span><button class="mfull" title="Details">⛶</button><button class="mx" aria-label="Schließen">✕</button></div><div class="mbody"></div></div>
        <div class="campop" hidden><div class="ch"><b></b><span class="cs"></span><button class="cfull" title="Kameradialog">⛶</button><button class="cx" aria-label="Schließen">✕</button></div><div class="cimg"><img alt=""></div><div class="cev"></div></div>
      </div></ha-card>`;
    this._stage = this._root.querySelector(".stage");
    this._panel = this._root.querySelector(".panel");
    this._root.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => this._switchView(b.dataset.v)));
    this._root.querySelector(".lv").addEventListener("change", (ev) => { this._lvl = +ev.target.value; try { localStorage.setItem("jg-level", this._lvl); } catch (e) {} this._zKeep = null; this._camKeep = null; this._build(); });
    this._root.querySelector(".cbx").addEventListener("click", () => this._ctlClose());
    this._root.querySelector(".utoast button").addEventListener("click", () => this._undo());
    this._root.querySelector(".morb").addEventListener("click", () => this._root.querySelector(".bar").classList.toggle("open"));
    this._root.querySelector(".outb").addEventListener("click", () => { this._outOn = !this._outOn; try { localStorage.setItem("jg-out", this._outOn ? "1" : "0"); } catch (e) {} this._zKeep = null; this._camKeep = null; this._root.querySelector(".bar").classList.remove("open"); this._build(); });
    this._root.querySelector(".wrap").addEventListener("pointerdown", (ev) => {
      const path = ev.composedPath();
      if (this._ctl !== undefined && !path.some((n) => n.classList && (n.classList.contains("cbub") || n.classList.contains("item") || n.classList.contains("clu")))) { const b = this._root.querySelector(".cbub"); if (!b.hidden) this._ctlClose(); }
      if (!path.some((n) => n.classList && n.classList.contains("bar"))) this._root.querySelector(".bar").classList.remove("open");
    }, true);
    this._root.querySelector(".roofb").addEventListener("click", () => { this._roofOn = !this._roofOn; try { localStorage.setItem("jg-roof", this._roofOn ? "1" : ""); } catch (e) {} this._build(); });
    this._root.querySelector(".hb").addEventListener("change", (ev) => {
      this._heat = ev.target.value || null;
      try { localStorage.setItem("jg-heat", this._heat || ""); } catch (e) {}
      this._build();
    });
    this._root.querySelector(".px").addEventListener("click", () => this._closePanel());
    this._root.querySelector(".pwv").addEventListener("click", () => { this._panelMode = this._panelMode === "walls" ? null : "walls"; this._wallI = 0; this._panelSig = null; this._renderPanel(); });
    this._root.querySelector(".rz").addEventListener("change", (ev) => this._focusArea(ev.target.value));
    this._root.querySelector(".campop .cx").addEventListener("click", () => this._camClose());
    this._root.querySelector(".mpop .mx").addEventListener("click", () => this._mediaClose());
    this._root.querySelector(".mpop .mfull").addEventListener("click", () => { const e = this._carOpen ? this._carOpen.power_switch || this._carOpen.entity : this._mediaEnt(); this._mediaClose(); if (e) this._moreInfo(e); });
    this._root.querySelector(".cine").addEventListener("click", () => this._cinemaToggle());
    this._root.querySelector(".campop .cfull").addEventListener("click", () => { const e = this._camOpen; this._camClose(); if (e) this._moreInfo(e); });
    this._root.querySelector(".rain").addEventListener("click", () => this._toastMsg(this._rainText || ""));
    this._root.querySelector(".wrap").addEventListener("pointerdown", () => this._activity(), true);
    const R = (q) => this._root.querySelector(q);
    R(".ttb").addEventListener("click", () => this._ttToggle());
    R(".tlive").addEventListener("click", () => this._ttExit());
    R(".tplay").addEventListener("click", () => this._ttPlay());
    R(".tsp").addEventListener("click", (ev) => { this._ttSp = ((this._ttSp || 0) + 1) % 3; ev.target.textContent = this._ttSpLabel(this._ttSpeeds()[this._ttSp]); });
    R(".tdays").addEventListener("click", () => { this._ttSp = 0; R(".tsp").textContent = this._ttSpLabel(this._ttDays > 1 ? 60 : 600); this._ttOpen(this._ttDays > 1 ? 1 : 7); });
    R(".tsl").addEventListener("input", (ev) => { this._ttPause(); this._ttSet(+ev.target.value); });
    R(".ttm").addEventListener("click", (ev) => { const i = ev.target.closest("i"); if (i) { this._ttPause(); this._ttSet(+i.dataset.t); } });
    this._lastAct = Date.now();
  }

  /* ---------- Kiosk: Rückkehr nach Leerlauf, Nachtdimmung ---------- */
  _activity() {
    this._lastAct = this._userAct = Date.now(); this._idleDone = false; this._camAuto = false;
    if (this._nightDim) { this._undimUntil = Date.now() + 60000; this._applyNight(); }
  }
  _applyNight() {
    const k = this._config && this._config.kiosk, card = this._root && this._root.querySelector("ha-card");
    if (!k || !k.night_dim || !card || !this._hass) return;
    let night;
    if (k.night_entity) { const s = this._hass.states[k.night_entity]; night = !!s && s.state === "on"; }
    else { const s = this._hass.states["sun.sun"]; night = !!s && s.state === "below_horizon"; }
    this._nightDim = night;
    const dim = night && !(this._undimUntil > Date.now());
    card.style.filter = dim ? `brightness(${k.night_dim})` : "";
  }
  _kioskTick() {
    if (this._ticks && this._ticks.length && (!this._lastTick || Date.now() - this._lastTick > 30000)) { this._lastTick = Date.now(); this._ticks.forEach((f) => f()); }
    const k = this._config && this._config.kiosk;
    if (!k || !this._hass) return;
    this._applyNight();
    const idle = (k.idle_return || 0) * 1000;
    if (idle && !this._idleDone && Date.now() - this._lastAct > idle) {
      this._idleDone = true;
      if (this._tt) this._ttExit();
      this._closePanel();
      if (this._view !== this._config.view) { this._view = this._config.view; this._build(); }
      else if (this._v3) this._home3d();
      else if (this._zReset) this._zReset();
      this._focusId = null; const rz = this._root.querySelector(".rz"); if (rz) rz.value = "";
    }
  }

  /* ---------- Geometrie ---------- */
  _model() {
    const p = JSON.parse(JSON.stringify(this._levelPlan()));
    p.walls = (p.walls || []).map((w) => (Array.isArray(w) ? { x1: w[0], y1: w[1], x2: w[2], y2: w[3] } : w));
    p.areas = (p.areas || []).map((a) => ({ ...a, points: a.points.map((q) => (Array.isArray(q) ? q : [q.x, q.y])) }));
    p.openings = p.openings || []; p.furniture = p.furniture || []; p.items = p.items || [];
    if (this._outOn === false && !this._config.edit3d) {
      const ind = p.areas.filter((a) => !a.outdoor), inside = (x, y) => ind.some((a) => pointInPoly(x, y, a.points) || [[12, 0], [-12, 0], [0, 12], [0, -12]].some(([dx, dy]) => pointInPoly(x + dx, y + dy, a.points)));
      if (ind.length) { p.areas = ind; p.items = p.items.filter((it) => inside(it.x, it.y)); p.furniture = p.furniture.filter((f) => inside(f.x, f.y)); }
    }
    this._isPortrait = this._portrait();
    if (this._isPortrait) {
      // 90° im Uhrzeigersinn drehen: (x,y) -> (-y, x)
      const R = (x, y) => [-y, x];
      p.walls.forEach((w) => { [w.x1, w.y1] = R(w.x1, w.y1); [w.x2, w.y2] = R(w.x2, w.y2); });
      p.areas.forEach((a) => { a.points = a.points.map((q) => R(q[0], q[1])); if (a.label) a.label = R(a.label[0], a.label[1]); });
      for (const o of [...p.openings, ...p.furniture]) { [o.x, o.y] = R(o.x, o.y); o.angle = (o.angle || 0) + 90; }
      p.items.forEach((i) => { [i.x, i.y] = R(i.x, i.y); if (i.angle != null) i.angle += 90; });
    }
    return p;
  }

  _build() {
    if (!this._hass || !this._config) return;
    if (!this._config.plan && !this._srcPlan) return;
    this._built = true;
    clearInterval(this._walkT);
    this._buildToken = (this._buildToken || 0) + 1;
    this._dispose3d();
    cancelAnimationFrame(this._vacRaf || 0); this._vacRaf = 0; this._vac = null;
    this._closePanel(true);
    const k = this._config.kiosk;
    this._root.querySelector(".bar").hidden = !!(k && k.hide_controls) || !!this._config.edit3d;
    this._root.querySelectorAll(".seg button").forEach((b) => b.classList.toggle("on", b.dataset.v === this._view));
    const m = (this._m = this._model());
    this._heatUi(m); this._roomUi(m); this._ttUi(); this._lvUi(); this._roofUi(); this._personUi();
    this._narrow = (this.clientWidth || window.innerWidth) < 600;
    const wrapEl = this._root.querySelector(".wrap"); wrapEl.className = "wrap" + (this._config.skin && this._config.skin !== "standard" ? " skin-" + this._config.skin : "") + (this._narrow ? " narrow" : "");
    const ob = this._root.querySelector(".outb"); ob.classList.toggle("on", this._outOn !== false); ob.hidden = !!this._config.edit3d || !(this._m || this._model()).areas.some((a) => a.outdoor) && this._outOn !== false;
    this._root.querySelector(".morb").classList.toggle("alert", !this._root.querySelector(".rain").hidden);
    this._ctlClose(); this._taps = []; this._clusters = [];
    if (this._view === "3d") { this._bind = {}; this._last = {}; this._build3d(m); return; }
    const tilt = this._view === "tilt";
    const C = tilt ? 0.74 : 1, DX = tilt ? -0.32 : 0, DY = tilt ? -0.66 : 0;
    const WH = this._config.wall_height;
    this._P = (x, y, z = 0) => [x + z * DX, y * C + z * DY];
    const P = this._P;

    // Ausdehnung
    let xs = [], ys = [];
    const add = (x, y, z = 0) => { const q = P(x, y, z); xs.push(q[0]); ys.push(q[1]); };
    m.walls.forEach((w) => { add(w.x1, w.y1); add(w.x2, w.y2); add(w.x1, w.y1, WH); add(w.x2, w.y2, WH); });
    m.items.forEach((i) => add(i.x, i.y));
    m.areas.filter((a) => a.outdoor).forEach((a) => a.points.forEach((q) => add(q[0], q[1])));
    const pad = 40;
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    const W = maxX - minX, H = maxY - minY;
    this._bw = this.clientWidth || (this.parentElement && this.parentElement.clientWidth) || window.innerWidth;
    this._unit = W / Math.max(300, this._bw); // Plan-Einheiten pro Bildschirm-Pixel
    this._calm = this._config.icons !== "all" && !this._config.edit3d;
    const svg = el("svg", { viewBox: `${minX} ${minY} ${W} ${H}`, preserveAspectRatio: "xMidYMid meet", class: (this._dark ? "dark" : "light") + (this._calm ? " calm" : "") + (this._config.skin && this._config.skin !== "standard" ? " skin skin-" + this._config.skin : "") });
    this._svg = svg;
    const defs = el("defs", {}, svg);
    const floorG = el("g", { transform: `matrix(1 0 0 ${C} 0 0)` }, svg); // Bodenebene in Plan-Koordinaten
    const bg = this._config.background;
    if (bg && bg.image && bg.show_in_card && !this._isPortrait)
      el("image", { href: bg.image, x: bg.x || 0, y: bg.y || 0, width: bg.width || 1000, opacity: bg.opacity ?? 0.5, preserveAspectRatio: "xMinYMin meet" }, floorG);
    const outG = el("g", { class: "outdoor" }, floorG);
    const roomsG = el("g", { class: "rooms" }, floorG);
    const heatG = el("g", { class: "heat" }, floorG);
    const trailG = el("g", { class: "vtrail" }, floorG);
    const furnG = el("g", { class: "furn" }, floorG);
    const fovG = el("g", { class: "fovs" }, floorG);
    const glowG = el("g", { class: "glows" }, floorG);
    const openG = el("g", { class: "openings" }, floorG);
    const wallG = el("g", { class: "walls" }, svg);
    const labelG = el("g", { class: "labels" }, svg);
    const iconG = el("g", { class: "icons" }, svg);
    this._clG = el("g", { class: "clusters" }, svg);
    this._bind = {}; this._ticks = []; this._detPrev = {};
    const bind = (eid, fn) => { if (!eid) return; (this._bind[eid] = this._bind[eid] || []).push(fn); };
    this._directorWatch(m, bind);
    this._wxWatch(bind);

    // Räume
    const paintRooms = needPaint(m) ? m.areas.filter((a) => !a.outdoor) : [];
    m.areas.forEach((a, ai) => {
      const cp = el("clipPath", { id: `jg-clip-${a.id}`, clipPathUnits: "userSpaceOnUse" }, defs);
      el("polygon", { points: a.points.map((q) => q.join(",")).join(" ") }, cp);
      const poly = el("polygon", { points: a.points.map((q) => q.join(",")).join(" "), class: a.outdoor ? `room out s-${a.surface || "grass"}` : "room" }, a.outdoor ? outG : roomsG);
      poly.addEventListener("click", (ev) => { if (this._suppressClick || this._magnet(ev)) return; if (a.ha_area || a.entities || !a.outdoor) this._openPanel(a); });
      this._floor2d(defs, poly, a, ai);
      const f2 = floor2Of(a, this._dark);
      if (f2) {
        const id2 = `jg-fl-${ai}b`, pt2 = el("pattern", { id: id2, patternUnits: "userSpaceOnUse", width: f2.S, height: f2.S, ...(f2.angle ? { patternTransform: `rotate(${f2.angle})` } : {}) }, defs);
        if (this._pixel()) { pt2.setAttribute("width", PX_S); pt2.setAttribute("height", PX_S); el("image", { href: pixelUrl(f2.kind, f2.color), width: PX_S, height: PX_S, preserveAspectRatio: "none", class: "pxi" }, pt2); }
        else el("image", { href: floorUrl(f2.kind, f2.color, this._dark ? 0.5 : 1), width: f2.S, height: f2.S, preserveAspectRatio: "none" }, pt2);
        el("polygon", { points: f2.pts.map((q) => q.join(",")).join(" "), fill: `url(#${id2})`, class: "floor2" }, a.outdoor ? outG : roomsG);
      }
      if (a.hide_label) return;
      const fs = 11.5 * this._unit * (this._config.label_scale || 1);
      const bx = a.points.map((q) => q[0]), by = a.points.map((q) => q[1]);
      let lx = Math.min(...bx) + 16, ly = Math.min(...by) + 16 + fs;
      if (a.label) [lx, ly] = a.label;
      else if (!pointInPoly(lx + 5, ly, a.points)) { const c = centroid(a.points); lx = c[0]; ly = c[1]; }
      const sc = P(lx, ly);
      const t = el("text", { x: sc[0], y: sc[1], class: "rlabel", "font-size": fs }, labelG);
      el("tspan", { x: sc[0], dy: 0 }, t).textContent = a.name;
      const hk = this._labelKind(a);
      if (hk) {
        const ts = el("tspan", { x: sc[0], dy: "1.2em", class: "rtemp" }, t);
        this._heatBind(bind, a, hk, (n) => { ts.textContent = this._heatTxt(hk, n); });
      }
      if (this._heat && a[this._heat]) {
        const hp = el("polygon", { points: a.points.map((q) => q.join(",")).join(" "), class: "hfill" }, heatG);
        this._heatBind(bind, a, this._heat, (n) => {
          if (isNaN(n)) { hp.style.opacity = 0; return; }
          const c = heatColor(this._heat, n); hp.style.fill = `rgb(${c})`; hp.style.opacity = this._heat === "presence" && !n ? 0.12 : "";
        });
      }
    });

    // Möbel (flach)
    m.furniture.slice().sort((a, b) => furnZ(a) + furnHeight(a) - (furnZ(b) + furnHeight(b))).forEach((f) => this._drawFurniture(furnG, f, bind));
    m.items.filter((it) => it.display === "camera").forEach((it) => {
      const fp = el("polygon", { points: fovPts(it).map((q) => q.join(",")).join(" "), class: "fov" }, fovG);
      const upd = () => { const h = this._hass; fp.classList.toggle("lit", anyOn(h, it.light)); fp.classList.toggle("alert", anyOn(h, it.motion)); };
      [it.entity, ...[].concat(it.light || []), ...[].concat(it.motion || [])].forEach((e) => bind(e, upd));
      if (it.detect) this._pinPos(it).forEach(([kind, ent, x, y]) => {
        const pg = el("g", { class: "pin", transform: `translate(${x} ${y})` }, fovG);
        el("circle", { r: 26 * this._unit / 1, class: "pind" }, pg);
        el("text", { y: 8 * this._unit, "font-size": 22 * this._unit, class: "emo" }, pg).textContent = DET_ICON[kind] || "❗";
        this._holdBind(bind, ent, (vis) => pg.classList.toggle("on", vis));
      });
    });

    // Licht-Schein, an die Raumgrenze geschnitten
    m.items.forEach((it, idx) => {
      const dom = (it.entity || "").split(".")[0];
      if (!["light", "switch"].includes(dom) || it.display) return;
      const area = m.areas.find((a) => !a.outdoor && pointInPoly(it.x, it.y, a.points)) || m.areas.find((a) => pointInPoly(it.x, it.y, a.points));
      const gid = `jg-g-${idx}`;
      const grad = el("radialGradient", { id: gid }, defs);
      const s0 = el("stop", { offset: "0%" }, grad), s1 = el("stop", { offset: "45%" }, grad), s2 = el("stop", { offset: "100%" }, grad);
      const type = it.light_type || "ceiling", R0 = it.r || 150, clip = area ? `url(#jg-clip-${area.id})` : null;
      let circ;
      if (type === "indirect" && area) circ = el("polygon", { points: area.points.map((q) => q.join(",")).join(" "), fill: `url(#${gid})`, class: "glow" }, glowG);
      else if (type === "strip") circ = el("ellipse", { cx: it.x, cy: it.y, rx: (it.length || R0 * 2) / 2 + R0 * 0.5, ry: R0 * 0.6, transform: `rotate(${it.angle || 0} ${it.x} ${it.y})`, fill: `url(#${gid})`, "clip-path": clip, class: "glow" }, glowG);
      else circ = el("circle", { cx: it.x, cy: it.y, r: type === "spot" ? R0 * 0.85 : R0, fill: `url(#${gid})`, "clip-path": clip, class: "glow" }, glowG);
      if (type === "spot") s1.setAttribute("offset", "30%");
      if (type === "indirect") { s1.setAttribute("offset", "60%"); }
      const gain = type === "indirect" ? 0.45 : type === "lamp" ? 0.8 : 1;
      bind(it.entity, (st) => {
        const on = st && st.state === "on";
        circ.style.opacity = on ? 1 : 0;
        if (!on) return;
        const [r, g, b] = this._rgb(st);
        const br = dom === "light" && st.attributes.brightness != null ? clamp(st.attributes.brightness / 255, 0.25, 1) : 1;
        s0.setAttribute("stop-color", `rgb(${r},${g},${b})`); s0.setAttribute("stop-opacity", (0.85 * br * gain).toFixed(2));
        s1.setAttribute("stop-color", `rgb(${r},${g},${b})`); s1.setAttribute("stop-opacity", (0.38 * br * gain).toFixed(2));
        s2.setAttribute("stop-color", `rgb(${r},${g},${b})`); s2.setAttribute("stop-opacity", 0);
      });
    });

    // Türen & Fenster (Bodenebene)
    m.openings.forEach((o) => this._drawOpening(openG, o, bind));
    const rainLines = {};
    m.openings.filter((o) => o.entity).forEach((o) => {
      const a = rad(o.angle || 0), dx = (Math.cos(a) * o.length) / 2, dy = (Math.sin(a) * o.length) / 2;
      rainLines[o.id] = el("line", { x1: o.x - dx, y1: o.y - dy, x2: o.x + dx, y2: o.y + dy, class: "rainw" }, openG);
    });
    this._rainWatch(m, bind, (open) => { const ids = open.map((o) => o.id); for (const k in rainLines) rainLines[k].classList.toggle("on", ids.includes(k)); });

    // Wände (mit Aussparungen), Pfeiler
    const boxes = [];
    m.walls.forEach((w) => this._wallPieces(w, m.openings, WH).forEach((b) => boxes.push(b)));
    m.furniture.filter((f) => f.type === "pillar").forEach((f) => boxes.push({ ...this._rectBox(f.x, f.y, f.w, f.h, f.angle || 0), z0: 0, z1: WH, kind: "pillar" }));
    if (tilt) {
      m.openings.filter((o) => o.type === "window").forEach((o) => {
        const sill = (o.sill ?? 0.3) * WH;
        const b = { ...this._rectBox(o.x, o.y, o.length, 3, o.angle), z0: sill, z1: WH * 0.9, kind: "glass", entity: o.entity };
        boxes.push(b);
      });
    }
    const key = (b) => { const cx = b.pts.reduce((s, q) => s + q[0], 0) / 4, cy = b.pts.reduce((s, q) => s + q[1], 0) / 4; return 0.32 * cx + 0.49 * cy; };
    if (tilt) boxes.sort((a, b) => key(a) - key(b));
    boxes.forEach((b) => {
      if (!tilt) {
        if (b.kind === "glass" || b.partial) return;
        el("polygon", { points: b.pts.map((q) => q.join(",")).join(" "), class: b.kind === "pillar" ? "pillar2d" : "wall2d" }, wallG);
        if (b.kind === "wall" && paintRooms.length) this._wallSides(b).forEach((sd) => this._paintRuns(sd.p, sd.q, sd.n, paintRooms, b.src).forEach((r) => {
          const d = 3.5, pts = [r.a, r.b, [r.b[0] - sd.n[0] * d, r.b[1] - sd.n[1] * d], [r.a[0] - sd.n[0] * d, r.a[1] - sd.n[1] * d]];
          el("polygon", { points: pts.map((q) => q.join(",")).join(" "), fill: r.col, class: "paint2d" }, wallG);
        }));
        return;
      }
      const g = el("g", { class: b.kind }, wallG);
      const n = b.pts.length;
      for (let i = 0; i < n; i++) {
        const p = b.pts[i], q = b.pts[(i + 1) % n];
        // nach außen zeigende Normale (Punkte im Uhrzeigersinn im Bild)
        const ex = q[0] - p[0], ey = q[1] - p[1];
        let nx = ey, ny = -ex;
        const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
        if (b.orient < 0) { nx = -nx; ny = -ny; }
        const vis = 0.32 * nx + 0.49 * ny * C;
        if (vis <= 0.02) continue;
        const face = [P(p[0], p[1], b.z0), P(q[0], q[1], b.z0), P(q[0], q[1], b.z1), P(p[0], p[1], b.z1)];
        el("polygon", { points: face.map((v) => v.join(",")).join(" "), class: Math.abs(nx) > Math.abs(ny) ? "side-r" : "side-d" }, g);
        if (b.kind === "wall" && paintRooms.length) this._paintRuns(p, q, [nx, ny], paintRooms, b.src).forEach((r) => {
          const fp = [P(r.a[0], r.a[1], b.z0), P(r.b[0], r.b[1], b.z0), P(r.b[0], r.b[1], b.z1), P(r.a[0], r.a[1], b.z1)];
          const sh = Math.abs(nx) > Math.abs(ny) ? 0.88 : 0.78;
          let fill = shadeHex(r.col, sh);
          if (r.kind === "brick") {
            const pid = "jg-wb-" + r.col.replace("#", "") + (sh > 0.8 ? "r" : "d");
            if (!defs.querySelector("#" + pid)) { const pt = el("pattern", { id: pid, patternUnits: "userSpaceOnUse", width: 64, height: 64 }, defs); el("image", { href: floorUrl("brick", r.col, (this._dark ? 0.8 : 1) * sh), width: 64, height: 64, preserveAspectRatio: "none" }, pt); }
            fill = `url(#${pid})`;
          }
          el("polygon", { points: fp.map((v) => v.join(",")).join(" "), fill, class: "paintf" }, g);
        });
      }
      el("polygon", { points: b.pts.map((q) => P(q[0], q[1], b.z1).join(",")).join(" "), class: "top" }, g);
      if (b.kind === "glass" && b.entity) bind(b.entity, (st) => g.classList.toggle("open", !!st && st.state === "on"));
    });

    // Symbole
    m.items.filter((it) => it.display === "car").forEach((it) => this._drawCar(furnG, it, bind));
    if (this._config.energy) this._energy2d(m, glowG, iconG, bind);
    if (this._config.weather) this._wx2d(m, defs, el("g", { class: "wxlayer" }, floorG));
    m.items.forEach((it) => this._drawItem(iconG, it, bind, trailG));
    m.items.filter((it) => it.display === "mmwave").forEach((it) => this._drawMmwave(iconG, it, bind, fovG));
    m.items.filter((it) => it.display === "alarm").forEach((it) => this._drawAlarm(iconG, it, bind, heatG));
    m.items.filter((it) => it.display === "sensor" || (it.values && it.display !== "mmwave")).forEach((it) => this._drawValues(iconG, it, bind));
    m.openings.filter((o) => o.cover).forEach((o) => this._shutter2d(openG, o, bind));
    this._personPins2d(iconG, bind);
    this._walkers2d(el("g", { class: "walkers" }, iconG));

    this._stage.innerHTML = "";
    this._stage.appendChild(svg);
    requestAnimationFrame(() => { if (this._svg === svg) { this._declutter(labelG); this._cluster(); } });
    const fv = this._fromView; this._fromView = null;
    if (fv && fv !== this._view && fv !== "3d") svg.classList.add(this._view === "2d" ? "vt-flat" : "vt-tilt");
    else if (fv === "3d") svg.classList.add("vt-in");
    this._zoom2d(svg, { x: minX, y: minY, w: W, h: H });
    this._last = {};
    this._update(true);
  }

  /* ---------- 3D-Ansicht (Three.js, wird erst bei Bedarf geladen) ---------- */
  _dispose3d() {
    const v = this._v3;
    if (!v) return;
    this._v3 = null;
    cancelAnimationFrame(v.raf || 0);
    v.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach((mm) => { if (mm.map && !mm.map._shared) mm.map.dispose(); mm.dispose(); });
    });
    (v.shared || []).forEach((t) => t.dispose());
    this._fxDispose(v);
    if (v.target) this._camKeep = { theta: v.theta, phi: v.phi, radius: v.radius, target: v.target.clone() };
    v.renderer.dispose();
    if (v.renderer.forceContextLoss) v.renderer.forceContextLoss();
  }

  async _build3d(m) {
    const token = this._buildToken;
    const wrap = document.createElement("div");
    wrap.className = "v3";
    wrap.innerHTML = `<canvas></canvas><div class="lbl3"></div><div class="msg">3D wird geladen …</div>`;
    this._stage.innerHTML = "";
    this._stage.appendChild(wrap);
    const msg = wrap.querySelector(".msg");
    let THREE;
    try { THREE = await loadThree(this._config.three_url || THREE_URL); }
    catch (e) { msg.textContent = "3D konnte nicht geladen werden (three.js nicht erreichbar). 2D und Schräg funktionieren weiter."; return; }
    if (token !== this._buildToken) return;
    msg.remove();
    const cfg = this._config;
    // Szene hell/dunkel: mit Himmel nach Tag/Nacht (echtes Tageslicht), sonst nach HA-Design
    const SK = SKIN3D[cfg.skin] || null;
    const skyOn = !cfg.edit3d && cfg.sky !== false && !SK, sun0 = this._hass.states["sun.sun"];
    const dark = skyOn && sun0 && cfg.scene_light !== "theme" ? sun0.state === "below_horizon" : this._dark;
    const low = cfg.quality === "low" || (cfg.quality !== "high" && (navigator.hardwareConcurrency || 8) <= 4);
    const RH = cfg.room_height || 260;              // echte Raumhöhe (Türen/Fenster)
    const roofOn = !!this._roofOn && !cfg.edit3d && cfg.roof !== false;
    const H3 = roofOn ? RH : Math.min(RH, cfg.wall_height_3d || 120); // Schnitthöhe der Wände („Puppenhaus“), mit Dach volle Höhe
    const canvas = wrap.querySelector("canvas"), lblLayer = wrap.querySelector(".lbl3");
    const width = Math.max(300, this.clientWidth || this._stage.clientWidth || window.innerWidth);
    // Höhe: bis zum unteren Bildschirmrand (Handy/Hochformat), sonst 0,6 × Breite, aber nie höher als der freie Platz
    const top = this._stage.getBoundingClientRect().top, avail = top > 0 && top < window.innerHeight - 200 ? window.innerHeight - top - 10 : window.innerHeight - (cfg.kiosk ? 16 : 70);
    const height = cfg.edit3d ? Math.max(260, this.clientHeight || 420) : Math.round(this._isPortrait || this._narrow ? Math.max(320, avail) : clamp(width * 0.6, 320, avail));
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: low ? "low-power" : "default" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.75));
    renderer.setSize(width, height, false);
    canvas.style.width = "100%"; canvas.style.height = height + "px";
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 10, 20000);
    const v = (this._v3 = { THREE, renderer, scene, camera, raf: 0, shared: [], walls: [], hits: [], sprites: [], labels: [], low, H3, width, height, dk: SK ? SK.bg < 0x808080 : dark, roofOn, sk: SK });
    if (SK) scene.background = new THREE.Color(SK.bg);
    this._calm = cfg.icons !== "all" && !cfg.edit3d;
    if (!low && !cfg.edit3d && (cfg.effects ?? !cfg.kiosk)) { try { this._fxInit(); } catch (e) { v.fx = null; } }
    if (v.fx) this._lampPool();

    // Farben
    const C = dark
      ? { floor: 0x34312e, wall: 0xd8d1c6, glass: 0x5aa0e6, door: 0xbdb5aa, furn: 0x4a4642, rug: 0x3d3a37, plant: 0x4f8a45, pot: 0x8a8278, lamp: 0xf2ede6, out: 0x1c1b1a }
      : { floor: 0xe9e2d8, wall: 0xfbf8f3, glass: 0x7fb6ec, door: 0xd9d1c5, furn: 0xcfc6b8, rug: 0xc9bfb0, plant: 0x5f9a52, pot: 0xb8ab98, lamp: 0x6b645c, out: 0xdcd5ca };
    if (SK) { C.wall = SK.wall; C.furn = SK.furn; C.out = SK.out; C.floor = SK.floor; }
    const lam = this._pixel() ? (c, extra = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: this._toon(THREE), ...extra })
      : this._real() ? (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...extra })
      : (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });

    // Licht der Szene – im Dunkelmodus und nachts gedämpft, damit die Lampen wirken
    const sun = this._hass.states["sun.sun"];
    const night = sun ? sun.state === "below_horizon" : false;
    const amb = (dark ? 0.55 : 1.0) * (night ? 0.7 : 1);
    v.hemi = new THREE.HemisphereLight(0xffffff, dark ? 0x403a34 : 0xb8ad9c, 1.6 * amb);
    scene.add(v.hemi);
    v.dir = new THREE.DirectionalLight(0xfff3e0, 1.1 * amb);
    v.dir.position.set(-800, 1600, 1200);
    scene.add(v.dir);
    if (this._real()) { this._realEnv(); if (v.fx) v.fx.bright.uniforms.th.value = 1.0; }

    const bind = (eid, fn) => { if (!eid) return; (this._bind[eid] = this._bind[eid] || []).push((st) => { fn(st); this._req3d(); }); };
    this._ticks = []; this._detPrev = {};
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const place = (mesh, x, y, z, angDeg = 0) => { mesh.position.set(x, y, z); mesh.rotation.y = -rad(angDeg); scene.add(mesh); return mesh; };
    const shapeOf = (pts) => { const s = new THREE.Shape(); pts.forEach((q, i) => (i ? s.lineTo(q[0], q[1]) : s.moveTo(q[0], q[1]))); return s; };
    const flatGeo = (pts) => { const g = new THREE.ShapeGeometry(shapeOf(pts)); g.rotateX(Math.PI / 2); return g; };

    // Böden (Räume) – antippbar
    let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
    m.walls.forEach((w) => { bx0 = Math.min(bx0, w.x1, w.x2); bx1 = Math.max(bx1, w.x1, w.x2); bz0 = Math.min(bz0, w.y1, w.y2); bz1 = Math.max(bz1, w.y1, w.y2); });
    m.areas.filter((a) => a.outdoor).forEach((a) => a.points.forEach((q) => { bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); bz0 = Math.min(bz0, q[1]); bz1 = Math.max(bz1, q[1]); }));
    const ground = place(new THREE.Mesh(new THREE.PlaneGeometry(bx1 - bx0 + 600, bz1 - bz0 + 600).rotateX(-Math.PI / 2), lam(C.out)), (bx0 + bx1) / 2, -3, (bz0 + bz1) / 2);
    ground.userData.kind = "ground";
    let outIdx = 0;
    m.areas.forEach((a) => {
      const fl = SK ? null : this._pixel() ? floorOf(a, false, true) || { kind: a.outdoor ? "grass" : "plain", color: a.outdoor ? "#6aa84f" : "#d8cdb8", angle: 0, S: PX_S } : floorOf(a, dark, skyOn);
      const fc = fl ? 0xffffff : SK ? (a.outdoor ? SK.out : SK.floor) : a.outdoor ? (SURF[a.surface] || SURF.grass)[dark ? 0 : 1] : C.floor;
      const mesh = new THREE.Mesh(flatGeo(a.points), lam(fc, fl ? { side: THREE.DoubleSide, map: this._floorTex(fl) } : { side: THREE.DoubleSide }));
      if (a.outdoor) mesh.position.y = -2.5 + 0.12 * (outIdx++);
      if (a.outdoor && a.surface === "greenhouse") this._greenhouse3d(a, lam, H3);
      mesh.userData = { kind: "room", area: a };
      const fms = [[mesh, fc]], f2 = SK ? null : floor2Of(a, dark);
      if (f2) {
        const m2 = new THREE.Mesh(flatGeo(f2.pts), lam(0xffffff, { side: THREE.DoubleSide, map: this._floorTex(f2) }));
        m2.position.y = mesh.position.y + 0.3; m2.userData = { kind: "room", area: a }; scene.add(m2); v.hits.push(m2); fms.push([m2, 0xffffff]);
      }
      if (this._heat && a[this._heat]) this._heatBind(bind, a, this._heat, (n) => fms.forEach(([mm, bc]) => {
        const base = new THREE.Color(bc);
        if (isNaN(n)) { mm.material.color.copy(base); return; }
        const c = heatColor(this._heat, n), k = this._heat === "presence" && !n ? 0.12 : dark ? 0.55 : 0.6;
        mm.material.color.copy(base.lerp(new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace), k));
      }));
      scene.add(mesh); v.hits.push(mesh);
    });

    // Wände, Fensterglas, Pfeiler
    const wallMat = lam(C.wall), paintRooms = needPaint(m) ? m.areas.filter((a) => !a.outdoor) : [];
    m.walls.forEach((w) => this._wallPieces(w, m.openings, RH).filter((b) => b.z0 < H3 - 1).map((b) => ({ ...b, z1: Math.min(b.z1, H3) })).forEach((b) => {
      const p = b.pts, cx = (p[0][0] + p[2][0]) / 2, cz = (p[0][1] + p[2][1]) / 2;
      const len = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]), th = Math.hypot(p[3][0] - p[0][0], p[3][1] - p[0][1]);
      const ang = (Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]) * 180) / Math.PI;
      const mesh = place(new THREE.Mesh(box(len, b.z1 - b.z0, th), wallMat.clone()), cx, (b.z0 + b.z1) / 2, cz, ang);
      if (paintRooms.length) this._paint3d(mesh, b, b.z0, b.z1, paintRooms);
      v.walls.push(mesh);
    }));
    m.furniture.filter((f) => f.type === "pillar").forEach((f) => v.walls.push(place(new THREE.Mesh(box(f.w, H3, f.h), wallMat.clone()), f.x, H3 / 2, f.y, f.angle || 0)));

    // Türen & Fenster
    m.openings.forEach((o) => { this._opening3d(o, RH, H3, C, lam, box, place, bind); this._frames3d(o, RH, H3, C, lam, place); this._shutter3d(o, RH, H3, bind); });

    // Möbel
    m.furniture.forEach((f, i) => { f._i = i; this._furniture3d(f, C, lam, box, place, bind, flatGeo); });
    if (this._real()) this._contactShadows(m);
    m.items.forEach((it, i) => (it._i = i));

    // Lichtkegel/-flächen und Symbole
    this._lights3d(m, H3, flatGeo, bind);
    m.items.filter((it) => WALL_ITEMS.includes(it.display)).forEach((it) => this._wall3d(it, lam, box, place, bind));
    m.items.filter((it) => it.display === "camera").forEach((it) => this._camera3d(it, bind, H3));
    m.items.filter((it) => it.display === "car").forEach((it) => this._car3d(it, lam, box, place, bind));
    m.items.filter((it) => it.display === "bins").forEach((it) => this._bins3d(it, lam, box, place, bind));
    if (cfg.energy) this._energy3d(m, bind);
    m.items.filter((it) => it.display === "camera" && it.detect).forEach((it) => this._pins3d(it, bind));
    m.items.filter((it) => it.display === "mmwave").forEach((it) => this._mmwave3d(it, bind));
    m.items.filter((it) => it.display === "alarm").forEach((it) => this._alarm3d(it, bind));
    m.items.filter((it) => (it.display === "sensor" || it.values) && it.display !== "mmwave").forEach((it) => this._values3d(it, lblLayer, bind));
    this._personPins3d(lblLayer, bind);
    if (roofOn) this._roof3d(m, RH, C.wall);
    this._bg3d();
    this._directorWatch(m, bind); this._wxWatch(bind);
    if (cfg.rain) {
      const spr = {};
      m.openings.filter((o) => o.entity).forEach((o) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex("glow"), color: 0xe8644a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
        sp.scale.set(Math.max(90, o.length * 1.3), 120, 1); sp.position.set(o.x, Math.min(H3, 110) * 0.7, o.y); sp.visible = false; sp.renderOrder = 4; scene.add(sp); spr[o.id] = sp;
      });
      this._rainWatch(m, bind, (open) => { const ids = open.map((o) => o.id); for (const k in spr) spr[k].visible = ids.includes(k); });
    }

    // Raumbeschriftungen (HTML über der Szene)
    m.areas.filter((a) => !a.hide_label).forEach((a) => {
      const c = a.label || centroid(a.points);
      const d = document.createElement("div");
      d.className = "rl3";
      d.innerHTML = `<b>${this._esc(a.name)}</b><span></span>`;
      lblLayer.appendChild(d);
      v.labels.push({ el: d, pos: new THREE.Vector3(c[0], 5, c[1]) });
      const hk = this._labelKind(a);
      if (hk) { const sp = d.querySelector("span"); this._heatBind(bind, a, hk, (n) => { sp.textContent = this._heatTxt(hk, n); }); }
    });

    // Kamera
    v.target = new THREE.Vector3((bx0 + bx1) / 2, 0, (bz0 + bz1) / 2);
    const tv = Math.tan(rad(camera.fov / 2)), th = tv * camera.aspect;
    const fit = Math.max((bx1 - bx0) / 2 / th, ((bz1 - bz0) / 2) * 0.85 / tv);
    v.home = { theta: this._isPortrait ? 0 : -0.2, phi: 0.62, radius: fit * 1.12 + H3, target: v.target.clone() };
    Object.assign(v, { theta: v.home.theta, phi: v.home.phi, radius: v.home.radius, rMin: 150, rMax: v.home.radius * 2.2 });
    const ob = { x0: bx0 - 300, x1: bx1 + 300, z0: bz0 - 300, z1: bz1 + 300 };
    if (!cfg.edit3d) this._sun3d(ob);
    if (cfg.weather && !cfg.edit3d) this._wx3d(scene, ob);
    if (skyOn) { ground.visible = false; this._sky3d(ob); }
    if (!cfg.edit3d) this._windowGlow3d(m, bind);
    if (this._pixel()) this._outlines3d();
    if (v.fx) this._shadows3d(ob);
    if (cfg.edit3d && this._camKeep) { const k = this._camKeep; Object.assign(v, { theta: k.theta, phi: k.phi, radius: k.radius }); v.target.copy(k.target); }
    if (cfg.edit3d) this._selRing(m, H3);
    else if (this._focusId) { const fa = m.areas.find((x) => x.id === this._focusId); if (fa) requestAnimationFrame(() => this._focus3d(fa)); }
    if (roofOn) lblLayer.style.display = "none";
    this._controls3d(canvas);
    if (this._fromView && this._fromView !== "3d") this._flyIn3d();
    this._fromView = null;
    this._last = {};
    this._update(true);
    this._req3d();
  }

  _opening3d(o, RH, H3, C, lam, box, place, bind) {
    const v = this._v3, THREE = v.THREE;
    const a = rad(o.angle || 0), u = [Math.cos(a), Math.sin(a)], L = o.length;
    const A = [o.x - (u[0] * L) / 2, o.y - (u[1] * L) / 2], B = [o.x + (u[0] * L) / 2, o.y + (u[1] * L) / 2];
    let sv = o.flipV ? 1 : -1; const sh = o.flipH ? -1 : 1;
    const parts = [];
    if (o.type === "window") {
      const sill = (o.sill ?? 0.3) * RH, top = Math.min(RH * 0.9, H3);
      if (sill >= top - 5) return;
      const mat = lam(C.glass, { transparent: true, opacity: v.fx ? 0.22 : 0.35 }); o._glassMat = mat;
      parts.push(place(new THREE.Mesh(box(L, top - sill, 3), mat), o.x, (sill + top) / 2, o.y, o.angle || 0));
      if (o.entity) bind(o.entity, (st) => { const op = !!st && st.state === "on"; mat.color.set(op ? 0xe8644a : C.glass); mat.opacity = op ? 0.6 : 0.35; });
    } else {
      const top = Math.min(o.sash === "double" ? RH * 0.84 : RH * 0.75, H3);
      const glazed = o.glazed || o.motion === "slide";
      const mat = glazed ? lam(C.glass, { transparent: true, opacity: 0.4 }) : lam(C.door);
      if (glazed) o._glassMat = mat;
      const leaves = [];
      const mkLeaf = (hinge, dir, len, rot) => {
        const g = new THREE.Group();
        g.position.set(hinge[0], 0, hinge[1]);
        const base = Math.atan2(dir[1], dir[0]);
        const leaf = new THREE.Mesh(box(len - 2, top, 4), mat);
        leaf.position.set(len / 2, top / 2, 0);
        g.add(leaf); g.rotation.y = -base; v.scene.add(g);
        leaves.push({ g, base, rot, cur: 0 }); parts.push(leaf);
      };
      if (o.motion === "slide") {
        const g = new THREE.Group(); const leaf = new THREE.Mesh(box(L / 2, top, 4), mat);
        g.add(leaf); g.position.set((A[0] + o.x) / 2, top / 2, (A[1] + o.y) / 2); g.rotation.y = -a; v.scene.add(g);
        leaves.push({ g, slide: [(u[0] * L) / 2 * 0.95, (u[1] * L) / 2 * 0.95], p0: g.position.clone(), cur: 0 }); parts.push(leaf);
      } else if (o.sash === "double") { mkLeaf(A, u, L / 2, 90 * sv); mkLeaf(B, [-u[0], -u[1]], L / 2, -90 * sv); }
      else { const hinge = sh > 0 ? A : B, dir = sh > 0 ? u : [-u[0], -u[1]]; mkLeaf(hinge, dir, L, 90 * sv * sh); }
      const apply = (lf, f) => {
        if (lf.slide) lf.g.position.set(lf.p0.x + lf.slide[0] * f, lf.p0.y, lf.p0.z + lf.slide[1] * f);
        else lf.g.rotation.y = -(lf.base + rad(lf.rot * f));
      };
      leaves.forEach((lf) => apply(lf, 0));
      if (o.entity) bind(o.entity, (st) => {
        const open = !!st && (st.state === "on" || st.state === "open");
        if (glazed) { mat.color.set(open ? 0xe8644a : C.glass); } else mat.color.set(open ? 0xe8644a : C.door);
        leaves.forEach((lf) => {
          const from = lf.cur, to = open ? 1 : 0; lf.cur = to;
          if (from === to) { apply(lf, to); return; }
          const t0 = performance.now();
          const step = (t) => { if (!this._v3) return; const k = clamp((t - t0) / 600, 0, 1); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; apply(lf, from + (to - from) * e); this._req3d(); if (k < 1) requestAnimationFrame(step); };
          requestAnimationFrame(step);
        });
      });
    }
    if (o.entity) parts.forEach((p) => { p.userData = { kind: "entity", entity: o.entity }; v.hits.push(p); });
  }

  _furniture3d(f, C, lam, box, place, bind, flatGeo) {
    const v = this._v3, THREE = v.THREE;
    if (f.type === "pillar") return;
    const a = f.angle || 0, ar = rad(a), w = f.w, d = f.h;
    const local = (lx, ly) => [f.x + Math.cos(ar) * lx - Math.sin(ar) * ly, f.y + Math.sin(ar) * lx + Math.cos(ar) * ly];
    const meshes = [];
    let tint = null, tintBase = C.plant;
    if (f.type === "rug") meshes.push(place(new THREE.Mesh(box(w, 1.5, d), lam(C.rug)), f.x, 0.75, f.y, a));
    else if (f.type === "sofa_u") {
      const mat = lam(C.furn), cw = 0.27 * w, md = 0.52 * d;
      const add = (lx, ly, bw, bd, y0, y1) => { const p = local(lx, ly); meshes.push(place(new THREE.Mesh(box(bw, y1 - y0, bd), mat), p[0], (y0 + y1) / 2, p[1], a)); };
      add(0, -d / 2 + md / 2, w - 2 * cw, md, 0, 42); add(0, -d / 2 + 9, w - 2 * cw, 18, 42, 80);
      for (const s of [-1, 1]) { add(s * (w / 2 - cw / 2), 0, cw, d, 0, 42); add(s * (w / 2 - cw / 2), -d / 2 + 9, cw, 18, 42, 80); }
    } else if (this._real() && (this._config.models || {})[f.type] && !this._config.edit3d) this._model3d({ ...f, url: this._config.models[f.type], scale: null }, meshes);
    else if (GARDEN.includes(f.type)) meshes.push(...this._garden3d(f, lam, place));
    else if (f.type === "model") this._model3d(f, meshes);
    else if (f.type === "plant") {
      meshes.push(place(new THREE.Mesh(new THREE.CylinderGeometry(14, 11, 40, 14), lam(C.pot)), f.x, 20, f.y));
      tint = lam(C.plant);
      meshes.push(place(new THREE.Mesh(new THREE.IcosahedronGeometry(w / 2, 1), tint), f.x, 40 + w * 0.7, f.y));
      if (f.entity && f.entity.startsWith("plant.")) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._emojiTex("💧"), transparent: true, depthTest: false, sizeAttenuation: false }));
        sp.position.set(f.x, 60 + w * 1.4, f.y); sp.userData = { px: 20 }; sp.renderOrder = 11; sp.visible = false; v.scene.add(sp); (v.dsprites = v.dsprites || []).push(sp);
        bind(f.entity, (st) => (sp.visible = this._thirsty(st)));
      }
    } else if (catOf(f)) {
      const c = catOf(f), H = furnHeight(f), Z = furnZ(f), cap = v.H3 + 60, pal = FCOL[v.dk ? "dark" : "light"];
      v.fmats = v.fmats || {};
      const mat = (k) => v.fmats[k] || (v.fmats[k] = this._realMat(k === "glass" ? lam(pal.glass, { transparent: true, opacity: 0.35, depthWrite: false }) : k === "water" ? lam(pal.water, { transparent: true, opacity: 0.75 }) : lam(pal[k] ?? pal.cab), k));
      c.p.forEach((q, i) => {
        const [s, x0, x1, y0, y1, z0, z1, k] = q;
        const a0 = Z + z0 * H; if (a0 >= cap) return;
        const a1 = Math.min(Z + z1 * H, cap), pw = (x1 - x0) * w, pd = (y1 - y0) * d, ph = Math.max(0.5, a1 - a0);
        const geo = s === "b" ? box(pw, ph, pd) : s === "c" ? new THREE.CylinderGeometry(0.5, 0.5, ph, 20).scale(pw, 1, pd) : new THREE.SphereGeometry(0.5, 12, 8).scale(pw, ph, pd);
        let mt = mat(k);
        if (i === 0 && f.entity && f.state_color) { mt = mt.clone(); tint = mt; tintBase = pal[k] ?? pal.cab; }
        if (k === "screen" && f.entity && !this._config.edit3d) { mt = mt.clone(); (f._screens = f._screens || []).push(mt); }
        const p = local(((x0 + x1) / 2) * w, ((y0 + y1) / 2) * d);
        meshes.push(place(new THREE.Mesh(geo, mt), p[0], (a0 + a1) / 2, p[1], a));
      });
      if (f._screens) {
        let glow = null;
        if (!v.low) {
          glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex("glow"), color: 0x7fb0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
          const gp = local(0, d / 2 + 40); glow.scale.set(w * 2, w * 1.4, 1); glow.position.set(gp[0], Z + H * 0.55, gp[1]); glow.renderOrder = 3; v.scene.add(glow);
        }
        const showPic = (url) => {
          if (!url) { f._screens.forEach((mm) => { if (mm.map) { mm.map.dispose(); mm.map = null; mm.needsUpdate = true; } }); return; }
          new THREE.TextureLoader().load(url, (tx) => { if (THREE.SRGBColorSpace) tx.colorSpace = THREE.SRGBColorSpace; f._screens.forEach((mm) => { if (mm.map) mm.map.dispose(); mm.map = tx; mm.color.set(0xffffff); mm.needsUpdate = true; }); this._req3d(); }, undefined, () => {});
        };
        let lastPic = null, camUntil = 0;
        bind(f.entity, (st) => {
          const col = this._appColor(st), on = !!col;
          f._screens.forEach((mm) => mm.emissive.set(on ? new THREE.Color(col).multiplyScalar(v.fx ? 1.5 : 0.55) : new THREE.Color(0x000000)));
          if (glow) { glow.material.opacity = on ? 0.6 : 0; if (on) glow.material.color.set(col); }
          if (Date.now() < camUntil) return;
          const pic = on && st.attributes.entity_picture ? (this._hass.hassUrl ? this._hass.hassUrl(st.attributes.entity_picture) : st.attributes.entity_picture) : null;
          if (pic !== lastPic) { lastPic = pic; showPic(pic); }
        });
        if (f.cam_on_detect) this._m.items.filter((ci) => ci.display === "camera" && ci.detect).forEach((ci) => Object.values(ci.detect).forEach((de) => {
          let prev = null;
          bind(de, (st) => {
            const now = !!st && ON_STATES.includes(st.state);
            if (prev === false && now) { camUntil = Date.now() + 30000; showPic(this._camUrl(ci.entity, false)); setTimeout(() => { camUntil = 0; lastPic = null; this._update(true); }, 30000); }
            prev = now;
          });
        }));
      }
    } else if (f.type === "stairs") {
      const n = Math.max(3, Math.round(d / 25)), RH = this._config.room_height || 260, stepH = RH / n, mat = lam(C.furn);
      for (let k = 0; k < n; k++) { const z1 = (k + 1) * stepH; if (k * stepH >= v.H3 + 40) break; const p = local(0, d / 2 - (k + 0.5) * (d / n)); meshes.push(place(new THREE.Mesh(box(w, z1, d / n), mat), p[0], z1 / 2, p[1], a)); }
    } else {
      const H = { bed: 50, sofa: 42, table: 75, desk: 75, wardrobe: 210, kitchen: 90, tv: 70 }[f.type] ?? 75;
      const mat = lam(f.type === "tv" ? 0x202020 : C.furn);
      if (f.type === "tv") meshes.push(place(new THREE.Mesh(box(w, 70, Math.min(d, 6)), mat), f.x, 95, f.y, a));
      else meshes.push(place(new THREE.Mesh(box(w, Math.min(H, v.H3 + 60), d), mat), f.x, Math.min(H, v.H3 + 60) / 2, f.y, a));
      if (f.type === "sofa") { const p = local(0, -d / 2 + 10); meshes.push(place(new THREE.Mesh(box(w, 38, 20), mat), p[0], 61, p[1], a)); }
      if (f.type === "bed") { const p = local(0, -d / 2 + 0.08 * d); meshes.push(place(new THREE.Mesh(box(w - 16, 14, 0.12 * d), lam(C.wall)), p[0], 57, p[1], a)); }
    }
    if (this._config.edit3d) {
      meshes.forEach((mm) => { mm.userData = { kind: "furn", idx: f._i }; v.hits.push(mm); });
      (v.furnMeshes = v.furnMeshes || {})[f._i] = meshes;
    } else if (f.entity) {
      meshes.forEach((mm) => { mm.userData = { kind: "entity", entity: f.entity }; v.hits.push(mm); });
      if (tint) bind(f.entity, (st) => { const c = stateColor(f.state_color, st); tint.color.set(c || tintBase); });
    }
  }

  _lightTex(kind) {
    const v = this._v3, THREE = v.THREE;
    v.tex = v.tex || {};
    if (v.tex[kind]) return v.tex[kind];
    const n = 128, cv = document.createElement("canvas"); cv.width = cv.height = n;
    const g = cv.getContext("2d");
    if (kind === "flat") { g.fillStyle = "#fff"; g.fillRect(0, 0, n, n); }
    else if (kind === "slats") { g.fillStyle = "#fff"; g.fillRect(0, 0, n, n); g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(0, n - 10, n, 10); }
    else if (kind === "icon_light" || kind === "icon_power" || kind === "icon_camera" || kind === "icon_fan") {
      g.fillStyle = "#fff"; g.beginPath(); g.arc(n / 2, n / 2, n / 2 - 4, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = "destination-out";
      g.translate(n * 0.22, n * 0.22); g.scale((n * 0.56) / 24, (n * 0.56) / 24);
      g.fill(new Path2D(kind === "icon_light" ? ICON.light : kind === "icon_camera" ? ICON.camera : kind === "icon_fan" ? ICON.fan : ICON.power));
    } else {
      const grd = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      const stops = kind === "spot" ? [[0, 1], [0.25, 0.75], [0.6, 0.18], [1, 0]] : kind === "glow" ? [[0, 0.9], [0.3, 0.35], [1, 0]] : [[0, 0.95], [0.45, 0.4], [1, 0]];
      stops.forEach(([o, al]) => grd.addColorStop(o, `rgba(255,255,255,${al})`));
      g.fillStyle = grd; g.fillRect(0, 0, n, n);
    }
    const t = new THREE.CanvasTexture(cv); t._shared = true;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    v.shared.push(t); v.tex[kind] = t;
    return t;
  }

  _lights3d(m, H3, flatGeo, bind) {
    const v = this._v3, THREE = v.THREE;
    const iconPx = 26 * (this._config.icon_scale || 1);
    m.items.forEach((it, idx) => {
      const dom = (it.entity || "").split(".")[0];
      const area = m.areas.find((a) => !a.outdoor && pointInPoly(it.x, it.y, a.points)) || m.areas.find((a) => pointInPoly(it.x, it.y, a.points));
      const type = it.light_type || "ceiling";
      const z = it.z != null ? it.z : !area || area.outdoor ? Math.max(H3 + 15, 140) : type === "lamp" ? 75 : type === "strip" ? 90 : H3 + 12;
      if (WALL_ITEMS.includes(it.display) || ["camera", "car", "bins", "meter"].includes(it.display)) return;
      if (it.display === "device" || it.display === "vacuum") { this._special3d(it, area, bind); return; }
      if (it.display === "ripple") {
        const ring = new THREE.Mesh(new THREE.RingGeometry(10, 14, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf5b544, transparent: true, opacity: 0, depthWrite: false }));
        ring.position.set(it.x, 2 + idx * 0.01, it.y); v.scene.add(ring);
        const R = (it.r || 120) * 0.6;
        bind(it.entity, (st) => { ring.userData.active = !!st && st.state === "on"; if (!ring.userData.active) ring.material.opacity = 0; this._ripplesActive(); });
        (v.ripples = v.ripples || []).push({ ring, R });
        return;
      }
      if (this._isFan(it)) { this._fan3d(it, z, bind); return; }
      if (!["light", "switch"].includes(dom)) return;
      // Lichtfläche auf dem Boden, an der Raumgrenze abgeschnitten
      const r = it.r || 150;
      const texKind = type === "spot" ? "spot" : type === "indirect" ? "flat" : "pool";
      const geo = area ? flatGeo(area.points) : new THREE.CircleGeometry(r, 32).rotateX(-Math.PI / 2).translate(it.x, 0, it.y);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      const ang = rad(it.angle || 0), ca = Math.cos(ang), sa = Math.sin(ang);
      const rx = type === "strip" ? (it.length || r * 2) / 2 + r * 0.5 : r, ry = type === "strip" ? r * 0.6 : r;
      for (let i = 0; i < pos.count; i++) {
        const dx = pos.getX(i) - it.x, dz = pos.getZ(i) - it.y;
        const lx = dx * ca + dz * sa, lz = -dx * sa + dz * ca;
        uv.setXY(i, lx / (2 * rx) + 0.5, lz / (2 * ry) + 0.5);
      }
      uv.needsUpdate = true;
      const tex = this._lightTex(texKind);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      const poolMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: v.dk ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, opacity: 0, side: THREE.DoubleSide });
      const pool = new THREE.Mesh(geo, poolMat);
      pool.position.y = 1 + idx * 0.02; pool.renderOrder = 2;
      v.scene.add(pool);
      // Leuchten am Lampenort (wirkt wie Lichthof an Wand/Decke)
      let glow = null;
      if (!v.low) {
        glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex("glow"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
        const gs = type === "spot" ? r * 0.55 : type === "strip" ? r * 1.1 : r * 0.9;
        glow.scale.set(gs, gs, 1); glow.position.set(it.x, z, it.y); glow.renderOrder = 3; v.scene.add(glow);
      }
      // Symbol (immer sichtbar, feste Pixelgröße)
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex(dom === "light" ? "icon_light" : "icon_power"), transparent: true, depthTest: false, sizeAttenuation: false }));
      icon.position.set(it.x, z, it.y); icon.renderOrder = 10;
      icon.userData = { kind: "item", item: it, px: iconPx };
      v.scene.add(icon); v.sprites.push(icon);
      const base = type === "indirect" ? 0.35 : type === "lamp" ? 0.75 : 1;
      bind(it.entity, (st) => {
        const on = !!st && st.state === "on", off = !st || OFF_STATES.includes(st.state);
        const col = on ? this._rgb(st) : null;
        const br = on && dom === "light" && st.attributes.brightness != null ? clamp(st.attributes.brightness / 255, 0.2, 1) : 1;
        poolMat.opacity = on ? base * br * (v.dk ? 0.95 : 0.8) : 0;
        if (on) poolMat.color.setRGB(col[0] / 255, col[1] / 255, col[2] / 255, THREE.SRGBColorSpace);
        if (glow) { glow.material.opacity = on ? 0.8 * br : 0; if (on) glow.material.color.copy(poolMat.color).multiplyScalar(v.fx && v.dk ? 1.9 : 1); }
        if (on) icon.material.color.copy(poolMat.color);
        else icon.material.color.set(this._dark ? 0x5a5550 : 0x8a8176);
        icon.material.opacity = off ? 0.4 : 1;
        icon.userData.calm = this._calm && !on;
        if (type !== "indirect") this._lampSet(it, z, on, col, br, idx);
      });
    });
  }

  _wall3d(it, lam, box, place, bind) {
    const v = this._v3, THREE = v.THREE, a = rad(it.angle || 0), n = [-Math.sin(a), Math.cos(a)];
    const at = (d) => [it.x + n[0] * d, it.y + n[1] * d];
    if (it.display === "radiator") {
      const L = it.length || 100, H = it.height || 60, z = it.z ?? 15, D = 8, idle = this._dark ? 0x8f8a84 : 0xf3f0eb;
      const mat = lam(idle);
      const [cx, cz] = at(D / 2 + 1);
      const mesh = place(new THREE.Mesh(box(L, H, D), mat), cx, z + H / 2, cz, it.angle || 0);
      let glow = null;
      if (!v.low) {
        glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex("glow"), color: 0xff7a3d, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
        const gp = at(30); glow.scale.set(L * 1.5, L * 1.5, 1); glow.position.set(gp[0], z + H / 2, gp[1]); glow.renderOrder = 3; v.scene.add(glow);
      }
      if (it.entity) {
        mesh.userData = { kind: "entity", entity: it.entity }; v.hits.push(mesh);
        bind(it.entity, (st) => { const h = this._heating(st); mat.color.set(h ? 0xe8744a : idle); mat.emissive.set(h ? 0x4a1600 : 0x000000); if (glow) glow.material.opacity = h ? 0.55 : 0; });
      }
      return;
    }
    const z = it.z ?? 30, w = it.count === 2 ? 16 : 8.5, [cx, cz] = at(1);
    place(new THREE.Mesh(box(w, 8.5, 1.5), lam(this._dark ? 0xd8d1c6 : 0xffffff)), cx, z, cz, it.angle || 0);
    if (!it.entity) return;
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex("icon_power"), transparent: true, depthTest: false, sizeAttenuation: false }));
    const ip = at(4); icon.position.set(ip[0], z, ip[1]); icon.renderOrder = 10;
    icon.userData = { kind: "item", item: it, px: 18 * (this._config.icon_scale || 1) };
    v.scene.add(icon); v.sprites.push(icon);
    bind(it.entity, (st) => { const on = !!st && ON_STATES.includes(st.state), off = !st || OFF_STATES.includes(st.state); icon.material.color.set(on ? 0xf5b544 : this._dark ? 0x5a5550 : 0x8a8176); icon.material.opacity = off ? 0.4 : 1; });
  }
  // Symbol in Fingernähe (Bildschirmabstand) statt exakter Treffer
  _greenhouse3d(a, lam, H3) {
    const v = this._v3, THREE = v.THREE, H = Math.min(200, H3 + 60);
    const mat = lam(0x9cc7ef, { transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const frame = lam(this._dark ? 0x8e8b86 : 0xb9b6b0);
    a.points.forEach((p, i) => {
      const q = a.points[(i + 1) % a.points.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(L, H), mat);
      pane.position.set((p[0] + q[0]) / 2, H / 2, (p[1] + q[1]) / 2); pane.rotation.y = -ang; v.scene.add(pane);
      const post = new THREE.Mesh(new THREE.BoxGeometry(4, H, 4), frame); post.position.set(p[0], H / 2, p[1]); v.scene.add(post);
    });
  }
  _camera3d(it, bind, H3) {
    const v = this._v3, THREE = v.THREE, z = it.z ?? Math.max(H3 + 20, 150);
    const shape = new THREE.Shape(); fovPts(it).forEach((q, i) => (i ? shape.lineTo(q[0], q[1]) : shape.moveTo(q[0], q[1])));
    const geo = new THREE.ShapeGeometry(shape); geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x5aa0e6, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(geo, mat); cone.position.y = 2; cone.renderOrder = 2; v.scene.add(cone);
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex("icon_camera"), transparent: true, depthTest: false, sizeAttenuation: false }));
    icon.position.set(it.x, z, it.y); icon.renderOrder = 10;
    icon.userData = { kind: "entity", entity: it.entity, px: 26 * (this._config.icon_scale || 1) };
    v.scene.add(icon); (v.dsprites = v.dsprites || []).push(icon); v.hits.push(icon);
    const upd = () => {
      const h = this._hass, st = h.states[it.entity], al = anyOn(h, it.motion), lt = anyOn(h, it.light);
      const fk = v.fx ? 0.45 : 1;
      mat.color.set(al ? 0xe8644a : lt ? 0xf5d76e : v.fx ? 0x8aa4bf : 0x5aa0e6); mat.opacity = (al ? 0.3 : lt ? 0.32 : 0.12) * fk;
      icon.material.color.set(al ? 0xe8644a : lt ? 0xf5b544 : this._dark ? 0x8a847c : 0x6b645c);
      icon.material.opacity = !st || OFF_STATES.includes(st.state) ? 0.4 : 1;
    };
    [it.entity, ...[].concat(it.light || []), ...[].concat(it.motion || [])].forEach((e) => bind(e, upd));
  }
  // ---------- Bearbeiten in 3D ----------
  // für den Editor: Bodenpunkt unter einer Bildschirmposition (Plan-Koordinaten) bzw. Mitte der Ansicht
  editGround(cx, cy) {
    const v = this._v3; if (!v) return null;
    const r = v.renderer.domElement.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
    const g = this._groundAt({ clientX: cx, clientY: cy });
    return g ? [g.x, g.z] : null;
  }
  editCenter() { const v = this._v3; return v && v.target ? [v.target.x, v.target.z] : null; }
  _groundAt(ev, h = 0) {
    const v = this._v3, THREE = v.THREE, r = v.renderer.domElement.getBoundingClientRect();
    const rc = (v.rc = v.rc || new THREE.Raycaster());
    rc.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), v.camera);
    const out = new THREE.Vector3();
    return rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), out) ? out : null;
  }
  _editPick(ev) {
    const v = this._v3, THREE = v.THREE, m = this._m, r = v.renderer.domElement.getBoundingClientRect(), vec = new THREE.Vector3();
    let best = null, bd = 22 * (this._config.icon_scale || 1);
    m.items.forEach((it, i) => {
      vec.set(it.x, this._itemH(it, m, v.H3), it.y).project(v.camera);
      if (vec.z > 1) return;
      const d = Math.hypot(ev.clientX - (r.left + ((vec.x + 1) / 2) * r.width), ev.clientY - (r.top + ((1 - vec.y) / 2) * r.height));
      if (d < bd) { bd = d; best = { k: "item", i, x: it.x, y: it.y, h: this._itemH(it, m, v.H3) }; }
    });
    const hits = this._hitAll(ev, v.hits), o = hits && hits.object;
    if (o && o.userData.kind === "furn" && (!best || bd > 11)) { const f = m.furniture[o.userData.idx]; best = { k: "furniture", i: o.userData.idx, x: f.x, y: f.y, h: hits.point.y }; }
    if (best) best.locked = !!(best.k === "item" ? m.items[best.i] : m.furniture[best.i]).locked;
    if (best && best.k === "furniture") { best.meshes = (v.furnMeshes || {})[best.i] || []; best.orig = best.meshes.map((mm) => mm.position.clone()); }
    if (best && v.ring) { const sel = this._config.edit_sel; if (!sel || sel.k !== best.k || sel.i !== best.i) this._placeRing(best.k === "item" ? m.items[best.i] : m.furniture[best.i], best.k); best.rx = v.ring.position.x; best.rz = v.ring.position.z; }
    return best;
  }
  // Höhe des Symbols in 3D (wie beim Zeichnen)
  _itemH(it, m, H3) {
    if (it.display === "radiator") return (it.z ?? 15) + (it.height || 60) / 2;
    if (it.display === "socket") return it.z ?? 30;
    if (it.display === "camera") return it.z ?? Math.max(H3 + 20, 150);
    if (it.display === "device") return it.z ?? 60;
    if (it.display === "vacuum" || it.display === "ripple") return 2;
    if (it.display === "car") return 80;
    const area = m.areas.find((a) => !a.outdoor && pointInPoly(it.x, it.y, a.points)), t = it.light_type || "ceiling";
    return it.z ?? (!area ? Math.max(H3 + 15, 140) : t === "lamp" ? 75 : t === "strip" ? 90 : H3 + 12);
  }
  _hitAll(ev, list) {
    const v = this._v3, THREE = v.THREE, r = v.renderer.domElement.getBoundingClientRect();
    const rc = (v.rc = v.rc || new THREE.Raycaster());
    rc.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), v.camera);
    const h = rc.intersectObjects(list, false);
    return h.length ? h[0] : null;
  }
  _selRing(m, H3) {
    const v = this._v3, THREE = v.THREE;
    v.ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf5b544, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }));
    v.ring.renderOrder = 20; v.ring.visible = false; v.scene.add(v.ring);
    const s = this._config.edit_sel;
    if (s && s.k) { const o = s.k === "item" ? m.items[s.i] : s.k === "furniture" ? m.furniture[s.i] : null; if (o) this._placeRing(o, s.k); }
  }
  _placeRing(o, k) {
    const v = this._v3, R = k === "furniture" ? Math.max(o.w, o.h) / 2 + 12 : 28;
    v.ring.scale.set(R, 1, R); v.ring.position.set(o.x, 2, o.y); v.ring.visible = true;
  }
  _near3d(ev, list, px) {
    const v = this._v3, r = v.renderer.domElement.getBoundingClientRect(), vec = new v.THREE.Vector3();
    let best = null, bd = px * (this._config.icon_scale || 1);
    for (const s of list) {
      if (!s.visible) continue;
      vec.copy(s.position).project(v.camera);
      if (vec.z > 1) continue;
      const d = Math.hypot(ev.clientX - (r.left + ((vec.x + 1) / 2) * r.width), ev.clientY - (r.top + ((1 - vec.y) / 2) * r.height));
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  _ripplesActive() {
    const v = this._v3;
    if (!v || !v.ripples) return;
    const any = v.ripples.some((r) => r.ring.userData.active);
    if (any && !v.ripRaf) {
      const t0 = performance.now();
      const loop = (t) => {
        if (!this._v3 || this._v3 !== v) return;
        const k = ((t - t0) % 2400) / 2400;
        let still = false;
        v.ripples.forEach((r) => { if (!r.ring.userData.active) return; still = true; const s = 0.2 + k * (r.R / 12); r.ring.scale.set(s, 1, s); r.ring.material.opacity = 0.9 * (1 - k); });
        this._render3d();
        v.ripRaf = still ? requestAnimationFrame(loop) : 0;
      };
      v.ripRaf = requestAnimationFrame(loop);
    }
  }

  _req3d() {
    const v = this._v3;
    if (!v || v.raf) return;
    v.raf = requestAnimationFrame(() => { v.raf = 0; this._render3d(); });
  }

  _render3d() {
    const v = this._v3;
    if (!v) return;
    const { THREE, camera, renderer, scene } = v;
    const sp = Math.sin(v.phi);
    camera.position.set(v.target.x + v.radius * sp * Math.sin(v.theta), v.target.y + v.radius * Math.cos(v.phi), v.target.z + v.radius * sp * Math.cos(v.theta));
    camera.lookAt(v.target);
    camera.updateMatrixWorld();
    // Symbolgröße in Pixeln konstant halten
    const P11 = camera.projectionMatrix.elements[5];
    const zin = v.home && v.radius < v.home.radius * 0.5;
    [...v.sprites, ...(v.dsprites || [])].forEach((s) => { const k = v.roofOn ? 0.0001 : ((s.userData.calm && !zin ? s.userData.px * 0.38 : s.userData.px) * 2) / (v.height * P11); s.scale.set(k, k, 1); });
    if (v.sky) v.sky.position.copy(camera.position);
    if (v.farGround) { v.farGround.position.x = camera.position.x; v.farGround.position.z = camera.position.z; }
    if (v.skyFog && scene.fog) { const dist = camera.position.distanceTo(v.target); scene.fog.near = dist + v.skyFog + 400; scene.fog.far = scene.fog.near + 5500; }
    // Wände zur Kamera hin ausblenden
    const cx = Math.sin(v.theta), cz = Math.cos(v.theta);
    const fade = this._config.walls_3d !== "solid" && !v.roofOn;
    v.walls.forEach((w) => {
      const d = (w.position.x - v.target.x) * cx + (w.position.z - v.target.z) * cz;
      const near = fade && v.H3 > 160 && d > 60 && v.phi > 0.35;
      w.material.transparent = near; w.material.opacity = near ? 0.18 : 1; w.material.depthWrite = !near;
      (w.userData.paint || []).forEach((pm) => { pm.transparent = near; pm.opacity = near ? 0.18 : 1; pm.depthWrite = !near; });
    });
    if (v.fx) this._fxRender(); else renderer.render(scene, camera);
    // Beschriftungen positionieren
    const vec = new THREE.Vector3();
    v.labels.forEach((l) => {
      vec.copy(l.pos).project(camera);
      const vis = !l.hide && vec.z < 1 && Math.abs(vec.x) < 1.1 && Math.abs(vec.y) < 1.1;
      l.el.style.display = vis ? "" : "none";
      if (vis) { l.el.style.left = ((vec.x + 1) / 2) * 100 + "%"; l.el.style.top = ((1 - vec.y) / 2) * 100 + "%"; }
    });
  }

  _pick3d(ev, list) {
    const v = this._v3, THREE = v.THREE;
    const r = v.renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    const rc = (v.rc = v.rc || new THREE.Raycaster());
    rc.setFromCamera(p, v.camera);
    const hit = rc.intersectObjects(list, false);
    return hit.length ? hit[0].object : null;
  }

  _controls3d(canvas) {
    const v = this._v3;
    const pts = new Map();
    let lamp = null, tap = null, pinch0 = null;
    canvas.style.touchAction = "none";
    const now = () => performance.now();
    const edit = !!this._config.edit3d;
    let drag = null, panMode = false;
    canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
    canvas.addEventListener("pointerdown", (ev) => {
      this._activity();
      canvas.setPointerCapture(ev.pointerId);
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pts.size === 1) {
        tap = { x: ev.clientX, y: ev.clientY, t: now() };
        // Verschieben der Ansicht: rechte/mittlere Maustaste, Umschalt – im Bearbeiten auch Ziehen auf leerer Fläche
        const rot = ev.button === 2 || ev.shiftKey;
        panMode = !edit && (ev.button === 2 || ev.button === 1 || ev.shiftKey);
        if (edit) {
          const hit = rot || ev.button === 1 ? null : this._editPick(ev);
          if (hit) { drag = { ...hit, p0: this._groundAt(ev, hit.h), moved: false }; }
          else panMode = !rot;
          return;
        }
        const s = this._near3d(ev, v.sprites, 30);
        if (s && !this._safe()) { lamp = this._lampGesture(s.userData.item, ev); return; }
      } else { lamp && lamp.cancel(); lamp = null; tap = null; }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), r: v.radius, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
    });
    canvas.addEventListener("pointermove", (ev) => {
      if (!pts.has(ev.pointerId)) return;
      const prev = pts.get(ev.pointerId), cur = { x: ev.clientX, y: ev.clientY };
      pts.set(ev.pointerId, cur);
      if (lamp) { lamp.move(ev); return; }
      if (drag && pts.size === 1) {
        const g = this._groundAt(ev, drag.h);
        if (g && drag.p0 && !drag.locked && (drag.moved || Math.hypot(cur.x - tap.x, cur.y - tap.y) > 6)) {
          drag.moved = true; tap = null;
          const dx = g.x - drag.p0.x, dz = g.z - drag.p0.z;
          (drag.meshes || []).forEach((mm, j) => { mm.position.x = drag.orig[j].x + dx; mm.position.z = drag.orig[j].z + dz; });
          if (v.ring) { v.ring.position.x = drag.rx + dx; v.ring.position.z = drag.rz + dz; v.ring.visible = true; }
          drag.d = [dx, dz];
          this._req3d();
        }
        return;
      }
      if (tap && Math.hypot(cur.x - tap.x, cur.y - tap.y) > 8) tap = null;
      if (pts.size === 1 && panMode) {
        this._pan3d(cur.x - prev.x, cur.y - prev.y);
      } else if (pts.size === 1) {
        v.theta -= (cur.x - prev.x) * 0.008;
        v.phi = clamp(v.phi - (cur.y - prev.y) * 0.006, 0.12, 1.35);
      } else if (pts.size === 2 && pinch0) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        v.radius = clamp((pinch0.r * pinch0.d) / Math.max(d, 1), v.rMin, v.rMax);
        this._pan3d(mx - pinch0.mx, my - pinch0.my); pinch0.mx = mx; pinch0.my = my;
      }
      this._req3d();
    });
    const up = (ev) => {
      if (!pts.has(ev.pointerId)) return;
      pts.delete(ev.pointerId);
      if (lamp) { lamp.end(ev); lamp = null; return; }
      if (edit) {
        const cb = this._config.on_edit;
        if (drag && drag.moved && drag.d && cb) cb({ type: "move", k: drag.k, i: drag.i, x: drag.x + drag.d[0], y: drag.y + drag.d[1] });
        else if (tap && ev.type === "pointerup" && cb) cb(drag ? { type: "select", k: drag.k, i: drag.i } : { type: "select", k: null });
        drag = null; tap = null; if (pts.size < 2) pinch0 = null; if (pts.size === 0) panMode = false;
        return;
      }
      if (pts.size < 2) pinch0 = null;
      if (pts.size === 0) panMode = false;
      if (tap && pts.size === 0 && ev.type === "pointerup" && now() - tap.t < 600 && this._safe() && !this._config.edit3d) {
        const s = this._near3d(ev, v.sprites, 30);
        if (s && s.userData.item) { tap = null; this._itemAction(s.userData.item, ev); return; }
      }
      if (tap && pts.size === 0 && ev.type === "pointerup" && now() - tap.t < 600) {
        let o = this._pick3d(ev, v.hits);
        if (!o || o.userData.kind === "room" || o.userData.kind === "ground") o = this._near3d(ev, v.dsprites || [], 30) || o;
        if (o && o.userData.kind === "entity" && String(o.userData.entity).startsWith("camera.")) { const ci = this._m.items.find((x) => x.entity === o.userData.entity); if (ci) this._camShow(ci); else this._moreInfo(o.userData.entity); }
        else if (o && o.userData.kind === "entity" && o.userData.bins) this._binsTap(o.userData.bins);
        else if (o && o.userData.media) this._mediaShow(o.userData.media);
        else if (o && o.userData.car) this._carShow(o.userData.car);
        else if (o && o.userData.kind === "entity") this._moreInfo(o.userData.entity);
        else if (o && o.userData.kind === "room") this._openPanel(o.userData.area);
      }
      tap = null;
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", (ev) => {
      ev.preventDefault(); this._activity();
      const r0 = v.radius, r1 = clamp(r0 * (1 + clamp(ev.deltaY, -200, 200) * 0.001), v.rMin, v.rMax), g = this._groundAt(ev);
      v.radius = r1;
      // zur Mausposition hin zoomen
      if (g && r1 < r0) { const k = 1 - r1 / r0; v.target.x += (g.x - v.target.x) * k; v.target.z += (g.z - v.target.z) * k; }
      this._req3d();
    }, { passive: false });
  }

  _pan3d(dx, dy) {
    const v = this._v3, k = (v.radius * 0.0016 * 900) / Math.max(300, v.height || 900);
    const rx = Math.cos(v.theta), rz = -Math.sin(v.theta), fx = Math.sin(v.theta), fz = Math.cos(v.theta);
    v.target.x -= (rx * dx + fx * dy) * k;
    v.target.z -= (rz * dx + fz * dy) * k;
  }

  _home3d() {
    const v = this._v3;
    if (!v) return;
    const from = { theta: v.theta, phi: v.phi, radius: v.radius, x: v.target.x, z: v.target.z }, h = v.home;
    const t0 = performance.now();
    const step = (t) => {
      if (this._v3 !== v) return;
      const k = clamp((t - t0) / 900, 0, 1), e = 1 - Math.pow(1 - k, 3);
      v.theta = from.theta + (h.theta - from.theta) * e; v.phi = from.phi + (h.phi - from.phi) * e; v.radius = from.radius + (h.radius - from.radius) * e;
      v.target.x = from.x + (h.target.x - from.x) * e; v.target.z = from.z + (h.target.z - from.z) * e;
      this._render3d();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _lampGesture(it, ev0) {
    // gleiche Bedienung wie in 2D: Tippen = schalten, Wischen = dimmen, Halten = Details
    const dom = (it.entity || "").split(".")[0];
    const st0 = this._hass.states[it.entity];
    const startB = st0 && st0.state === "on" && st0.attributes.brightness != null ? Math.round((st0.attributes.brightness / 255) * 100) : 0;
    let mode = null, val = 0;
    const bubble = this._bubble3d();
    const timer = setTimeout(() => { if (!mode) { mode = "long"; this._moreInfo(it.entity); } }, 550);
    return {
      move: (ev) => {
        if (mode === "long") return;
        const dx = ev.clientX - ev0.clientX, dy = ev.clientY - ev0.clientY;
        if (!mode && Math.hypot(dx, dy) > 12) {
          clearTimeout(timer);
          const modes = (st0 && st0.attributes.supported_color_modes) || [];
          mode = dom === "light" && modes.some((x) => x !== "onoff") ? "dim" : "cancel";
        }
        if (mode === "dim") { val = clamp(Math.round(startB + dx * 0.5), 1, 100); bubble.show(`${val} %`, ev); }
      },
      end: (ev) => {
        clearTimeout(timer);
        if (mode === "dim") { this._hass.callService("light", "turn_on", { entity_id: it.entity, brightness_pct: val }); setTimeout(() => bubble.hide(), 700); }
        else if (!mode && ev.type === "pointerup") this._act(it.entity, "homeassistant", "toggle", {}, it.name);
      },
      cancel: () => { clearTimeout(timer); bubble.hide(); },
    };
  }
  _bubble3d() {
    const wrap = this._stage.querySelector(".v3");
    let b = wrap.querySelector(".b3");
    if (!b) { b = document.createElement("div"); b.className = "b3"; wrap.appendChild(b); }
    return {
      show: (t, ev) => { const r = wrap.getBoundingClientRect(); b.textContent = t; b.style.left = ev.clientX - r.left + "px"; b.style.top = ev.clientY - r.top - 44 + "px"; b.classList.add("show"); },
      hide: () => b.classList.remove("show"),
    };
  }

  _rectBox(cx, cy, w, h, ang) {
    const a = rad(ang), ux = [Math.cos(a), Math.sin(a)], uy = [-Math.sin(a), Math.cos(a)];
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [cx + (ux[0] * sx * w) / 2 + (uy[0] * sy * h) / 2, cy + (ux[1] * sx * w) / 2 + (uy[1] * sy * h) / 2]);
    return { pts, orient: this._orient(pts) };
  }
  _orient(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; } return s > 0 ? 1 : -1; }

  _wallPieces(w, openings, WH) {
    const T = this._config.wall_thickness || 12;
    const p1 = [w.x1, w.y1], p2 = [w.x2, w.y2];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    if (L < 1) return [];
    const u = [(p2[0] - p1[0]) / L, (p2[1] - p1[1]) / L];
    const cuts = [];
    for (const o of openings) {
      const v = [o.x - p1[0], o.y - p1[1]];
      const t = v[0] * u[0] + v[1] * u[1];
      const dist = Math.abs(u[0] * v[1] - u[1] * v[0]);
      const a = rad(o.angle || 0);
      const par = Math.abs(Math.abs(u[0] * Math.cos(a) + u[1] * Math.sin(a)) - 1) < 0.05;
      if (dist < 9 && par && t + o.length / 2 > 1 && t - o.length / 2 < L - 1) { // Öffnung darf über mehrere Wandstücke reichen
        const lo = Math.max(0, t - o.length / 2), hi = Math.min(L, t + o.length / 2);
        if (o.type === "window") cuts.push([lo, hi, (o.sill ?? 0.3) * WH, WH * 0.9]);
        else cuts.push([lo, hi, 0, o.sash === "double" ? WH * 0.84 : WH * 0.75]);
      }
    }
    cuts.sort((a, b) => a[0] - b[0]);
    const pieces = []; let pos = 0;
    for (const [lo, hi, b, tp] of cuts) {
      if (lo > pos) pieces.push([pos, lo, 0, WH, false]);
      if (b > 0) pieces.push([lo, hi, 0, b, true]);
      if (tp < WH) pieces.push([lo, hi, tp, WH, true]);
      pos = Math.max(pos, hi);
    }
    if (pos < L) pieces.push([pos, L, 0, WH, false]);
    return pieces.filter((q) => q[1] - q[0] > 0.5).map(([s0, s1, z0, z1, partial]) => {
      const a0 = s0 - (s0 <= 0.01 ? T / 2 : 0), a1 = s1 + (s1 >= L - 0.01 ? T / 2 : 0);
      const mid = [p1[0] + (u[0] * (a0 + a1)) / 2, p1[1] + (u[1] * (a0 + a1)) / 2];
      return { ...this._rectBox(mid[0], mid[1], a1 - a0, T, (Math.atan2(u[1], u[0]) * 180) / Math.PI), z0, z1, kind: "wall", partial, src: w };
    });
  }

  _drawOpening(g, o, bind) {
    const a = rad(o.angle || 0), u = [Math.cos(a), Math.sin(a)];
    let sv = o.flipV ? 1 : -1; const sh = o.flipH ? -1 : 1;
    if (o.type === "window") {
      // Fenster öffnen in den Raum: Seite wählen, auf der ein Raum liegt
      const nx = -Math.sin(a), ny = Math.cos(a);
      const inA = (k) => this._m.areas.some((ar) => pointInPoly(o.x + nx * 30 * k, o.y + ny * 30 * k, ar.points));
      sv = inA(1) ? 1 : inA(-1) ? -1 : 1;
    }
    const L = o.length;
    const grp = el("g", { class: `opening ${o.type}` }, g);
    const A = [o.x - (u[0] * L) / 2, o.y - (u[1] * L) / 2], B = [o.x + (u[0] * L) / 2, o.y + (u[1] * L) / 2];
    if (o.type === "window") {
      el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: "glass" }, grp);
    } else {
      el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: "sill" }, grp);
    }
    const leaves = [];
    const mkLeaf = (hinge, dir, len, rot) => {
      const tip = [hinge[0] + dir[0] * len, hinge[1] + dir[1] * len];
      const lg = el("g", {}, grp);
      // Schwenkbogen (sichtbar, wenn offen)
      const r = (rot * Math.PI) / 180;
      const end = [hinge[0] + (dir[0] * Math.cos(r) - dir[1] * Math.sin(r)) * len, hinge[1] + (dir[0] * Math.sin(r) + dir[1] * Math.cos(r)) * len];
      const arc = el("path", { d: `M${tip[0]},${tip[1]} A${len},${len} 0 0 ${rot > 0 ? 1 : 0} ${end[0]},${end[1]}`, class: "arc" }, grp);
      el("line", { x1: hinge[0], y1: hinge[1], x2: tip[0], y2: tip[1], class: o.type === "window" || o.glazed ? "leaf glazed" : "leaf" }, lg);
      leaves.push({ lg, hinge, rot, arc, cur: 0 });
    };
    if (o.motion === "slide") {
      const lg = el("g", {}, grp);
      el("line", { x1: A[0], y1: A[1], x2: o.x, y2: o.y, class: "leaf glazed" }, lg);
      leaves.push({ lg, slide: [(u[0] * L) / 2 * 0.95, (u[1] * L) / 2 * 0.95], cur: 0 });
    } else if (o.sash === "double" || o.type === "window") {
      const maxRot = o.type === "window" ? 35 : 90;
      mkLeaf(A, u, L / 2, maxRot * sv);
      mkLeaf(B, [-u[0], -u[1]], L / 2, -maxRot * sv);
    } else {
      const hinge = sh > 0 ? A : B, dir = sh > 0 ? u : [-u[0], -u[1]];
      mkLeaf(hinge, dir, L, 90 * sv * sh);
    }
    const setOpen = (f) => {
      for (const lf of leaves) {
        const from = lf.cur, to = f;
        lf.cur = f;
        if (from === to) { this._applyLeaf(lf, to); continue; }
        const t0 = performance.now();
        const step = (t) => { const k = clamp((t - t0) / 450, 0, 1); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; this._applyLeaf(lf, from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      }
    };
    if (o.entity) {
      grp.classList.add("bound");
      const hit = el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: "hit" }, grp);
      hit.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(o.entity); });
      bind(o.entity, (st) => {
        const open = !!st && (st.state === "on" || st.state === "open");
        grp.classList.toggle("open", open);
        grp.classList.toggle("offline", !st || OFF_STATES.includes(st.state));
        setOpen(open ? 1 : 0);
      });
    } else this._applyLeafAll = null;
    leaves.forEach((lf) => this._applyLeaf(lf, 0));
  }
  _applyLeaf(lf, f) {
    if (lf.slide) { lf.lg.setAttribute("transform", `translate(${lf.slide[0] * f},${lf.slide[1] * f})`); return; }
    lf.lg.setAttribute("transform", `rotate(${lf.rot * f} ${lf.hinge[0]} ${lf.hinge[1]})`);
    lf.arc.style.opacity = f > 0.05 ? 0.6 * f : 0;
  }

  _drawFurniture(g, f, bind) {
    if (f.type === "pillar") return;
    const grp = el("g", { transform: `translate(${f.x} ${f.y}) rotate(${f.angle || 0})`, class: "furniture" }, g);
    const w = f.w, h = f.h, x0 = -w / 2, y0 = -h / 2;
    let body;
    if (f.type === "rug") body = el("rect", { x: x0, y: y0, width: w, height: h, rx: 8, class: "rug" }, grp);
    else if (f.type === "sofa_u") {
      const cw = 0.27 * w, md = 0.52 * h;
      const pts = [[0, 0], [w, 0], [w, h], [w - cw, h], [w - cw, md], [cw, md], [cw, h], [0, h]].map(([x, y]) => `${x0 + x},${y0 + y}`).join(" ");
      body = el("polygon", { points: pts, class: "fbody" }, grp);
      el("line", { x1: x0, y1: y0 + 0.18 * h, x2: x0 + w, y2: y0 + 0.18 * h, class: "fline" }, grp);
    } else if (this._pixel() && (GARDEN.includes(f.type) || f.type === "plant")) {
      const big = f.type === "tree" || f.type === "conifer", c = f.type === "conifer" ? "#3f8a4a" : f.type === "hedge" ? "#4f9a3c" : "#5fae46";
      if (f.type === "hedge") { for (let k = -w / 2 + h / 2; k <= w / 2 - h / 2 + 0.1; k += h * 0.8) this._pxImg(grp, PX.bush(c), k, 0, h * 1.25); }
      else this._pxImg(grp, big ? PX.tree(c) : PX.bush(c), 0, 0, Math.max(w, h) * (big ? 1 : 1.1));
      body = grp.firstChild;
      if (f.type === "plant" && f.entity && f.entity.startsWith("plant.")) { const drop = el("text", { y: -w * 0.55, "font-size": Math.max(w * 0.7, 22 * this._unit), class: "drop", transform: `rotate(${-(f.angle || 0)})` }, grp); drop.textContent = "💧"; bind(f.entity, (st) => drop.classList.toggle("on", this._thirsty(st))); }
    } else if (GARDEN.includes(f.type)) { this._garden2d(grp, f); body = grp.firstChild; }
    else if (f.type === "model") {
      body = el("rect", { x: x0, y: y0, width: w, height: h, rx: 4, class: "fmodel" }, grp);
      el("text", { y: 4, "font-size": Math.min(w, h) * 0.22, class: "fmlbl", transform: `rotate(${-(f.angle || 0)})` }, grp).textContent = f.name || "3D";
    } else if (f.type === "plant") {
      body = el("circle", { cx: 0, cy: 0, r: w / 2, class: "plant" }, grp);
      for (let k = 0; k < 6; k++) { const an = (k * Math.PI) / 3; el("ellipse", { cx: Math.cos(an) * w * 0.22, cy: Math.sin(an) * w * 0.22, rx: w * 0.2, ry: w * 0.09, transform: `rotate(${k * 60} ${Math.cos(an) * w * 0.22} ${Math.sin(an) * w * 0.22})`, class: "leafp" }, grp); }
      if (f.entity && f.entity.startsWith("plant.")) {
        const drop = el("text", { y: -w * 0.55, "font-size": Math.max(w * 0.7, 22 * this._unit), class: "drop", transform: `rotate(${-(f.angle || 0)})` }, grp);
        drop.textContent = "💧";
        bind(f.entity, (st) => drop.classList.toggle("on", this._thirsty(st)));
      }
    } else if (catOf(f)) {
      body = drawCat2d(grp, f, this._dark, el);
      if ((f.type === "tv" || f.type === "monitor") && f.entity) {
        const gid = "jg-tv-" + Math.random().toString(36).slice(2, 8), gr = el("radialGradient", { id: gid, cx: "50%", cy: "0%", r: "100%" }, grp);
        el("stop", { offset: "0%", "stop-color": "#7fb0ff", "stop-opacity": 0.55 }, gr); el("stop", { offset: "100%", "stop-color": "#7fb0ff", "stop-opacity": 0 }, gr);
        const gl = el("ellipse", { cx: 0, cy: f.h / 2 + f.w * 0.45, rx: f.w * 0.75, ry: f.w * 0.5, fill: `url(#${gid})`, class: "tvglow" }, grp);
        grp.insertBefore(gl, grp.firstChild);
        const stops = gr.querySelectorAll("stop");
        bind(f.entity, (st) => { const col = this._appColor(st); gl.classList.toggle("on", !!col); if (col) stops.forEach((x) => x.setAttribute("stop-color", col)); });
      }
      if (f.type === "k_niche" || f.type === "worktop") grp.classList.add("thin");
    } else {
      body = el("rect", { x: x0, y: y0, width: w, height: h, rx: f.type === "tv" ? 1 : 4, class: f.type === "tv" ? "fbody tv" : "fbody" }, grp);
      const ln = (x1, y1, x2, y2, c = "fline") => el("line", { x1, y1, x2, y2, class: c }, grp);
      if (f.type === "bed") {
        const pw = w > 120 ? w / 2 - 12 : w - 16;
        el("rect", { x: x0 + 8, y: y0 + 8, width: pw, height: 0.14 * h, rx: 6, class: "fdet" }, grp);
        if (w > 120) el("rect", { x: x0 + w / 2 + 4, y: y0 + 8, width: pw, height: 0.14 * h, rx: 6, class: "fdet" }, grp);
        ln(x0, y0 + 0.3 * h, x0 + w, y0 + 0.3 * h);
      } else if (f.type === "sofa") {
        ln(x0, y0 + 0.28 * h, x0 + w, y0 + 0.28 * h); ln(x0 + 0.12 * w, y0 + 0.28 * h, x0 + 0.12 * w, y0 + h); ln(x0 + 0.88 * w, y0 + 0.28 * h, x0 + 0.88 * w, y0 + h);
      } else if (f.type === "stairs") {
        const n = Math.max(3, Math.round(h / 25));
        for (let k = 1; k < n; k++) ln(x0, y0 + (h * k) / n, x0 + w, y0 + (h * k) / n);
        ln(0, y0 + h - 10, 0, y0 + 14, "fline arrow"); ln(0, y0 + 14, -10, y0 + 30, "fline arrow"); ln(0, y0 + 14, 10, y0 + 30, "fline arrow");
      } else if (f.type === "wardrobe") { ln(x0, 0, x0 + w, 0); ln(0, y0, 0, y0 + h, "fline thin"); }
      else if (f.type === "kitchen") { ln(x0 + 6, y0 + 6, x0 + w - 6, y0 + 6, "fline thin"); }
    }
    if (f.entity) {
      grp.classList.add("bound");
      grp.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(f.entity); });
      bind(f.entity, (st) => {
        const c = stateColor(f.state_color, st);
        body.style.fill = c || "";
        grp.classList.toggle("offline", !st || OFF_STATES.includes(st.state));
      });
    }
  }

  _drawItem(g, it, bind, trailG) {
    if (it.display === "car" || it.display === "sensor" || it.display === "mmwave" || it.display === "alarm") return;
    if (it.display === "bins") return this._drawBins(g, it, bind);
    if (it.display === "meter") return;
    if (it.display === "device") return this._drawDevice(g, it, bind);
    if (it.display === "vacuum") return this._drawVacuum(g, it, bind, trailG);
    if (WALL_ITEMS.includes(it.display)) return this._drawWallItem(g, it, bind);
    if (it.display === "camera") return this._drawCamera(g, it, bind);
    const P = this._P, u = this._unit * (this._config.icon_scale || 1);
    const [sx, sy] = P(it.x, it.y);
    const dom = (it.entity || "").split(".")[0];
    if (it.display === "ripple") {
      const rg = el("g", { class: "ripple", transform: `translate(${sx} ${sy})` }, g);
      const R = (it.r || 120) * 0.55;
      for (let k = 0; k < 3; k++) el("circle", { r: R, style: `animation-delay:${k * 0.8}s` }, rg);
      el("circle", { r: 6 * u, class: "dot" }, rg);
      bind(it.entity, (st) => rg.classList.toggle("active", !!st && st.state === "on"));
      return;
    }
    const r = 13 * u;
    const grp = el("g", { class: `item ${dom}`, transform: `translate(${sx} ${sy})` }, g);
    el("circle", { r: r * 1.9, class: "touch" }, grp);
    const ic = el("g", { class: "ic" }, grp);
    const disc = el("circle", { r, class: "disc" }, ic);
    const s = (r * 1.25) / 24, fan = this._isFan(it);
    const gw = fan ? el("g", { class: "fanrot" }, ic) : ic;
    el("path", { d: fan ? ICON.fan : dom === "light" ? ICON.light : ICON.power, transform: `translate(${-12 * s} ${-12 * s}) scale(${s})`, class: "glyph" }, gw);
    if (this._pixel() && !fan) { this._pxImg(ic, PX.lamp(0), 0, 0, r * 2.3, "pxi lpoff"); this._pxImg(ic, PX.lamp(1), 0, 0, r * 2.3, "pxi lpon"); }
    if (fan) bind(it.entity, (st) => { const sp = this._fanSpeed(st); gw.classList.toggle("spin", !!sp); gw.style.animationDuration = sp ? (1.6 - sp * 1.25).toFixed(2) + "s" : ""; });
    const room = this._m.areas.find((a) => !a.outdoor && pointInPoly(it.x, it.y, a.points)) || this._m.areas.find((a) => pointInPoly(it.x, it.y, a.points));
    this._taps.push({ it, grp, x: sx, y: sy, group: true, light: ["light", "switch"].includes(dom) || fan, room: room && room.id });
    const bubble = el("text", { y: -r * 1.6, class: "bubble", "font-size": 15 * u }, grp);
    bind(it.entity, (st) => {
      const on = !!st && st.state === "on";
      const off = !st || OFF_STATES.includes(st.state);
      grp.classList.toggle("on", on);
      grp.classList.toggle("offline", off);
      if (on) { const [cr, cg, cb] = this._rgb(st); disc.style.fill = `rgb(${cr},${cg},${cb})`; }
      else disc.style.fill = "";
      const c = stateColor(it.state_color, st);
      if (c) disc.style.fill = c;
    });
    this._gestures(grp, it, bubble);
  }

  /* ---------- Heatmap ---------- */
  _heatKinds() {
    const m = this._m || this._model();
    return Object.keys(HEAT).filter((k) => m.areas.some((a) => a[k]));
  }
  _cineUi() {
    const b = this._root.querySelector(".cine"), on = this._cineOn();
    b.hidden = !this._config.cinema || !!this._config.edit3d; b.classList.toggle("on", on); b.textContent = on ? "🎬 Kino aus" : "🎬";
  }
  _cineOn() { try { return localStorage.getItem("jg-cinema") === "1"; } catch (e) { return !!this._cine; } }
  _cineLights() {
    const c = this._config.cinema || {}, areas = this._m.areas.filter((a) => (c.areas || ["wohnzimmer"]).includes(a.id)), keep = [].concat(c.keep || []);
    const ids = new Set();
    this._m.items.forEach((it) => { const d = (it.entity || "").split(".")[0]; if (!it.display && ["light", "switch"].includes(d) && !keep.includes(it.entity) && areas.some((a) => pointInPoly(it.x, it.y, a.points))) ids.add(it.entity); });
    [].concat(c.extra || []).forEach((e) => ids.add(e));
    return [...ids];
  }
  async _cinemaToggle() {
    const h = this._hass, on = this._cineOn(), ids = this._cineLights();
    if (!on) {
      // Zustand vorher merken (Szene-Schnappschuss), dann aus
      try { await h.callService("scene", "create", { scene_id: "raumwerk_kino_vorher", snapshot_entities: ids }); } catch (e) {}
      await h.callService("homeassistant", "turn_off", { entity_id: ids });
      this._toastMsg(`Kino-Modus: ${ids.length} Lampen aus – Iris bleibt an. Nochmal tippen stellt alles wieder her.`);
    } else {
      try { await h.callService("scene", "turn_on", { entity_id: "scene.raumwerk_kino_vorher" }); } catch (e) {}
      this._toastMsg("Kino-Modus aus – Licht wie vorher.");
    }
    this._cine = !on; try { localStorage.setItem("jg-cinema", on ? "0" : "1"); } catch (e) {}
    this._cineUi();
  }
  _roomUi(m) {
    this._cineUi();
    const rz = this._root.querySelector(".rz"), list = m.areas.filter((a) => !a.hide_label);
    rz.hidden = this._config.room_select === false || !!this._config.edit3d || list.length < 2;
    rz.innerHTML = `<option value="">Ganzer Plan</option>` + list.map((a) => `<option value="${this._esc(a.id)}">${this._esc(a.name)}</option>`).join("");
    rz.value = this._focusId && list.some((a) => a.id === this._focusId) ? this._focusId : "";
  }
  _focusArea(id) {
    this._focusId = id || null; this._activity();
    const a = id && this._m.areas.find((x) => x.id === id);
    if (this._view === "3d") { if (a) this._focus3d(a); else this._home3d(); return; }
    if (a && this._zoomBox) this._zoomBox(a.points); else if (this._zReset) this._zReset();
  }
  _focus3d(a) {
    const v = this._v3; if (!v) return;
    const xs = a.points.map((q) => q[0]), ys = a.points.map((q) => q[1]), c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    const span = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * v.camera.aspect);
    const to = { theta: v.theta, phi: 0.75, radius: clamp(span / (2 * Math.tan(rad(v.camera.fov / 2))) / v.camera.aspect * 1.25 + v.H3, v.rMin, v.rMax), x: c[0], z: c[1] };
    const from = { theta: v.theta, phi: v.phi, radius: v.radius, x: v.target.x, z: v.target.z }, t0 = performance.now();
    const step = (t) => {
      if (this._v3 !== v) return;
      const k = clamp((t - t0) / 800, 0, 1), e = 1 - Math.pow(1 - k, 3);
      v.phi = from.phi + (to.phi - from.phi) * e; v.radius = from.radius + (to.radius - from.radius) * e;
      v.target.x = from.x + (to.x - from.x) * e; v.target.z = from.z + (to.z - from.z) * e;
      this._render3d(); if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  _toastMsg(t) {
    const el = this._root.querySelector(".toast"); if (!t) return;
    el.textContent = t; el.hidden = false; clearTimeout(this._toastT);
    this._toastT = setTimeout(() => (el.hidden = true), 5000);
  }
  // Regen + offene Fenster/Türen: ruft cb(Liste offener Öffnungen bei Regen) bei jeder Änderung auf
  _rainWatch(m, bind, cb) {
    const r = this._config.rain; if (!r) return;
    const ops = m.openings.filter((o) => o.entity);
    const calc = () => {
      const h = this._hass, sn = r.sensor && h.states[r.sensor], we = r.weather && h.states[r.weather];
      const raining = (!!sn && parseFloat(sn.state) > (r.above ?? 0)) || (!!we && RAINY.includes(we.state));
      const open = raining ? ops.filter((o) => { const st = h.states[o.entity]; return !!st && ON_STATES.includes(st.state); }) : [];
      const chip = this._root.querySelector(".rain");
      chip.hidden = !open.length;
      chip.textContent = `🌧 ${open.length} offen`;
      this._rainText = open.length ? "Es regnet – offen: " + open.map((o) => o.name || (h.states[o.entity].attributes.friendly_name || o.id)).join(", ") : "";
      cb(open);
    };
    [r.sensor, r.weather, ...ops.map((o) => o.entity)].filter(Boolean).forEach((e) => bind(e, calc));
  }
  _heatUi(m) {
    const ks = Object.keys(HEAT).filter((k) => m.areas.some((a) => a[k]));
    if (this._config.energy) ks.push("power");
    if (this._heat && !ks.includes(this._heat)) this._heat = null;
    const hb = this._root.querySelector(".hb"), lg = this._root.querySelector(".legend");
    hb.hidden = !ks.length || (this._config.heatmap_button === false);
    hb.classList.toggle("on", !!this._heat);
    hb.innerHTML = `<option value="">Ansicht: Normal</option>` + ks.map((k) => `<option value="${k}" ${k === this._heat ? "selected" : ""}>${k === "power" ? "Strom" : HEAT[k].label}</option>`).join("");
    hb.value = this._heat || "";
    lg.hidden = !this._heat;
    if (this._heat === "power") {
      lg.innerHTML = `<span class="pwrlg">⚡ –</span>`;
    } else if (this._heat === "presence") {
      lg.innerHTML = `<b class="sw" style="background:rgb(${HEAT.presence.stops[0][1]})"></b><span>frei</span><b class="sw" style="background:rgb(${HEAT.presence.stops[1][1]})"></b><span>belegt</span>`;
    } else if (this._heat) {
      const s = HEAT[this._heat].stops, lo = s[0][0], hi = s[s.length - 1][0];
      const unit = HEAT_UNIT[this._heat] || "";
      // Helligkeit: Verlauf gleichmäßig verteilen (Werte liegen logarithmisch)
      const grad = s.map(([v, c], i) => `rgb(${c}) ${(this._heat === "illuminance" ? (i / (s.length - 1)) * 100 : ((v - lo) / (hi - lo)) * 100).toFixed(0)}%`).join(",");
      lg.innerHTML = `<span>${lo}${unit}</span><i style="background:linear-gradient(90deg,${grad})"></i><span>${hi}${unit}</span>`;
    }
  }
  // Ein oder mehrere Sensoren je Raum → ein Zahlenwert (Anwesenheit: 1/0, Helligkeit: Maximum, sonst Mittelwert)
  _heatBind(bind, a, kind, cb) {
    const ids = [].concat(a[kind] || []).filter(Boolean);
    const calc = () => {
      const sts = ids.map((e) => this._hass && this._hass.states[e]).filter((s) => s && !OFF_STATES.includes(s.state));
      if (!sts.length) return cb(NaN);
      if (kind === "presence") return cb(sts.some((s) => ON_STATES.includes(s.state)) ? 1 : 0);
      const ns = sts.map((s) => parseFloat(s.state)).filter((n) => !isNaN(n));
      cb(!ns.length ? NaN : kind === "illuminance" ? Math.max(...ns) : ns.reduce((x, y) => x + y, 0) / ns.length);
    };
    ids.forEach((e) => bind(e, calc));
  }
  _labelKind(a) {
    if (this._heat && a[this._heat]) return this._heat;
    return a.temperature ? "temperature" : null;
  }
  _heatTxt(kind, n) {
    if (isNaN(n)) return "–";
    if (kind === "presence") return n ? "belegt" : "frei";
    const d = kind === "co2" || kind === "illuminance" ? 0 : 1;
    return n.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d }) + (HEAT_UNIT[kind] || "");
  }
  /* ---------- Laufende Geräte ---------- */
  _running(it, st) {
    if (it.also) return [it.entity, ...[].concat(it.also)].some((e) => { const s2 = this._hass.states[e]; return !!s2 && s2.state === "playing"; });
    if (!st || OFF_STATES.includes(st.state)) return false;
    const n = parseFloat(st.state);
    if (it.entity.startsWith("sensor.") && !isNaN(n)) return n > (it.power_on ?? 5);
    return RUN_STATES.includes(st.state);
  }
  _devText(it, st) {
    if (!st) return "";
    if (it.end) {
      const e = this._hass.states[it.end], t = e ? Date.parse(e.state) : NaN, min = Math.round((t - Date.now()) / 60000);
      if (!isNaN(min) && min > 0) return min >= 60 ? `noch ${Math.floor(min / 60)} h ${min % 60} min` : `noch ${min} min`;
    }
    if (it.texts && it.texts[st.state] != null) return it.texts[st.state];
    const n = parseFloat(st.state);
    if (it.entity.startsWith("sensor.") && !isNaN(n)) return this._fmt(st);
    if (it.also) { const ms = this._mediaState(it); if (ms) st = ms; }
    if (st.entity_id && st.entity_id.startsWith("media_player.")) {
      const a = st.attributes, t = [a.media_artist, a.media_title].filter(Boolean).join(" – ") || a.app_name || a.source;
      if (t) return t.length > 28 ? t.slice(0, 27) + "…" : t;
    }
    return this._hass.formatEntityState ? this._hass.formatEntityState(st) : st.state;
  }
  _drawCamera(g, it, bind) {
    const P = this._P, u = this._unit * (this._config.icon_scale || 1), [sx, sy] = P(it.x, it.y), r = 13 * u;
    const grp = el("g", { class: "item cam", transform: `translate(${sx} ${sy})` }, g);
    el("circle", { r: r * 1.9, class: "touch" }, grp);
    el("circle", { r: r * 1.7, class: "halo" }, grp);
    el("circle", { r, class: "disc" }, grp);
    const sc = (r * 1.2) / 24;
    el("path", { d: ICON.camera, transform: `translate(${-12 * sc} ${-12 * sc}) scale(${sc})`, class: "glyph" }, grp);
    const upd = () => {
      const h = this._hass, st = h.states[it.entity];
      grp.classList.toggle("offline", !st || OFF_STATES.includes(st.state));
      grp.classList.toggle("alert", anyOn(h, it.motion));
      grp.classList.toggle("lit", anyOn(h, it.light));
    };
    [it.entity, ...[].concat(it.light || []), ...[].concat(it.motion || [])].forEach((e) => bind(e, upd));
    grp.addEventListener("click", (ev) => { ev.stopPropagation(); if (it.entity) this._camShow(it); });
  }
  /* ---------- 2D/Schräg: Zoomen (Mausrad, zwei Finger) und Verschieben ---------- */
  _zoom2d(svg, vb0) {
    const key = this._view + (this._isPortrait ? "p" : "");
    let vb = this._zKeep && this._zKeep.key === key ? { ...this._zKeep.vb } : { ...vb0 };
    const apply = () => {
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
      this._zk = vb.w / vb0.w; this._zKeep = { key, vb: { ...vb } };
      svg.style.touchAction = this._zk < 0.999 ? "none" : "manipulation";
      svg.classList.toggle("zoomed", this._zk < 0.999); svg.classList.toggle("zin", this._zk < 0.45);
      if (!this._clRaf) this._clRaf = requestAnimationFrame(() => { this._clRaf = 0; this._cluster(); });
    };
    const toSvg = (cx, cy) => { const m = svg.getScreenCTM(); return m ? new DOMPoint(cx, cy).matrixTransform(m.inverse()) : null; };
    const zoomAt = (cx, cy, f) => {
      const p = toSvg(cx, cy); if (!p) return;
      const w = clamp(vb.w * f, vb0.w / 8, vb0.w), k = w / vb.w;
      vb = { x: p.x - (p.x - vb.x) * k, y: p.y - (p.y - vb.y) * k, w, h: vb.h * k };
      limit(); apply();
    };
    const limit = () => {
      if (vb.w >= vb0.w - 0.01) { vb = { ...vb0 }; return; }
      vb.x = clamp(vb.x, vb0.x, vb0.x + vb0.w - vb.w); vb.y = clamp(vb.y, vb0.y, vb0.y + vb0.h - vb.h);
    };
    this._zReset = () => { vb = { ...vb0 }; apply(); };
    this._zoomBox = (pts) => {
      const pp = pts.map((q) => this._P(q[0], q[1])), xs = pp.map((q) => q[0]), ys = pp.map((q) => q[1]);
      let w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
      w *= 1.3; h *= 1.3;
      const asp = vb0.w / vb0.h; if (w / h < asp) w = h * asp; else h = w / asp;
      w = clamp(w, vb0.w / 8, vb0.w); h = w / asp;
      vb = { x: (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2, w, h };
      limit(); apply();
    };
    if (this._focusId && !(this._zKeep && this._zKeep.key === key)) { const a = this._m.areas.find((x) => x.id === this._focusId); if (a) requestAnimationFrame(() => this._zoomBox(a.points)); }
    svg.addEventListener("wheel", (ev) => {
      if (vb.w >= vb0.w - 0.01 && ev.deltaY > 0) return; // ganz herausgezoomt: Seite normal scrollen lassen
      ev.preventDefault(); this._activity();
      zoomAt(ev.clientX, ev.clientY, Math.exp(clamp(ev.deltaY, -300, 300) * 0.0015));
    }, { passive: false });
    svg.addEventListener("dblclick", () => { if (this._zk < 0.999) this._zReset(); });
    const pts = new Map();
    let pan = null, pinch = null;
    svg.addEventListener("pointerdown", (ev) => {
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; pan = null;
      } else if (this._zk < 0.999 && ev.button === 0) pan = { x: ev.clientX, y: ev.clientY, moved: false, id: ev.pointerId };
    });
    svg.addEventListener("pointermove", (ev) => {
      if (!pts.has(ev.pointerId)) return;
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 0 && pinch.d > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.d / d);
        pinch.d = d; this._suppressClick = true; this._multiT = Date.now(); return;
      }
      if (!pan || pan.id !== ev.pointerId) return;
      const dx = ev.clientX - pan.x, dy = ev.clientY - pan.y;
      if (!pan.moved && Math.hypot(dx, dy) < 6) return;
      pan.moved = true; this._suppressClick = true;
      const r = svg.getBoundingClientRect(), s = Math.max(vb.w / r.width, vb.h / r.height);
      vb.x -= dx * s; vb.y -= dy * s; pan.x = ev.clientX; pan.y = ev.clientY;
      limit(); apply();
    });
    const end = (ev) => {
      pts.delete(ev.pointerId);
      if (pts.size < 2) pinch = null;
      if (pan && pan.id === ev.pointerId) { if (pan.moved) this._panEnd = Date.now(); pan = null; }
      if (!pts.size) setTimeout(() => (this._suppressClick = false), 60);
    };
    svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
    apply();
  }
  // Auto (z. B. im Carport): sichtbar, wenn erkannt; lädt = grüner Schein + Leistung
  _carState(it) {
    const h = this._hass, st = h.states[it.entity], pw = it.power && h.states[it.power];
    const here = !!st && ON_STATES.includes(st.state), n = pw ? parseFloat(pw.state) : NaN;
    const kw = pw && pw.attributes.unit_of_measurement === "kW" ? n : n / 1000;
    return { here, charging: here && !isNaN(kw) && kw * 1000 > (it.charge_min ?? 100), kw };
  }
  _drawCar(g, it, bind) {
    const L = it.length || 460, W = it.width || 185;
    const grp = el("g", { class: "car", transform: `translate(${it.x} ${it.y}) rotate(${it.angle || 0})` }, g);
    el("rect", { x: -L / 2, y: -W / 2, width: L, height: W, rx: W * 0.28, class: "cbody" }, grp);
    el("rect", { x: -L * 0.12, y: -W * 0.4, width: L * 0.42, height: W * 0.8, rx: W * 0.16, class: "croof" }, grp);
    el("rect", { x: L * 0.28, y: -W * 0.38, width: L * 0.09, height: W * 0.76, rx: 8, class: "cglass" }, grp);
    el("rect", { x: -L * 0.2, y: -W * 0.36, width: L * 0.07, height: W * 0.72, rx: 8, class: "cglass" }, grp);
    const txt = el("text", { x: 0, y: W * 0.05, class: "ctext", "font-size": 13 * this._unit, transform: ((it.angle || 0) % 360 + 360) % 360 > 90 && ((it.angle || 0) % 360 + 360) % 360 <= 270 ? "rotate(180)" : null }, grp);
    const upd = () => {
      const c = this._carState(it);
      grp.classList.toggle("here", c.here); grp.classList.toggle("charging", c.charging);
      txt.textContent = !c.here ? "frei" : c.charging ? `⚡ ${c.kw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW` : "";
    };
    [it.entity, it.power].filter(Boolean).forEach((e) => bind(e, upd));
    grp.addEventListener("click", (ev) => { ev.stopPropagation(); this._carShow(it); });
  }
  _car3d(it, lam, box, place, bind) {
    const v = this._v3, THREE = v.THREE, L = it.length || 460, W = it.width || 185, a = it.angle || 0, ar = rad(a);
    const loc = (lx, ly) => [it.x + Math.cos(ar) * lx - Math.sin(ar) * ly, it.y + Math.sin(ar) * lx + Math.cos(ar) * ly];
    const body = lam(it.color ? parseInt(String(it.color).replace("#", ""), 16) : 0x6d7d8c), dark = lam(0x1e2124), glass = lam(0x2b3a4a);
    const parts = [];
    const add = (mesh, lx, ly, y) => { const p = loc(lx, ly); parts.push(place(mesh, p[0], y, p[1], a)); };
    add(new THREE.Mesh(box(L, 62, W), body), 0, 0, 52);
    add(new THREE.Mesh(box(L * 0.5, 48, W * 0.84), glass), -L * 0.04, 0, 106);
    add(new THREE.Mesh(box(L * 0.42, 6, W * 0.82), body), -L * 0.05, 0, 132);
    for (const sx of [-0.32, 0.32]) for (const sy of [-0.5, 0.5]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(33, 33, 24, 18).rotateX(Math.PI / 2), dark); add(wh, sx * L, sy * (W - 20), 33); }
    let glow = null;
    if (!v.low) { glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex("glow"), color: 0x5fd17a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); glow.scale.set(L * 1.3, L * 1.3, 1); glow.position.set(it.x, 60, it.y); v.scene.add(glow); }
    parts.forEach((p) => { p.userData = { kind: "entity", entity: it.power_switch || it.entity, car: it }; v.hits.push(p); });
    const upd = () => { const c = this._carState(it); parts.forEach((p) => (p.visible = c.here)); if (glow) glow.material.opacity = c.charging ? 0.7 : 0; };
    [it.entity, it.power].filter(Boolean).forEach((e) => bind(e, upd));
  }
  /* ---------- Skin „Realistisch“ ---------- */
  _real() { return this._config.skin === "real"; }
  // feine Oberflächen (Holzmaserung, Stoff, gebürstetes Metall) als kachelbare Texturen
  _surfTex(kind) {
    const v = this._v3, THREE = v.THREE; v.stex = v.stex || {}; if (v.stex[kind]) return v.stex[kind];
    const n = 256, cv = document.createElement("canvas"); cv.width = cv.height = n; const g = cv.getContext("2d"), R = seeded("s" + kind);
    g.fillStyle = "#fff"; g.fillRect(0, 0, n, n);
    if (kind === "wood") { for (let i = 0; i < 90; i++) { const x = R() * n, w = 0.5 + R() * 2.5; g.fillStyle = `rgba(90,60,30,${0.05 + R() * 0.12})`; for (const dx of [-n, 0, n]) g.fillRect(x + dx, 0, w, n); } for (let i = 0; i < 6; i++) { g.strokeStyle = "rgba(80,50,20,.12)"; g.beginPath(); const x = R() * n; g.ellipse(x, R() * n, 4 + R() * 8, 18 + R() * 30, 0, 0, Math.PI * 2); g.stroke(); } }
    else if (kind === "fabric") { for (let y = 0; y < n; y += 2) { g.fillStyle = `rgba(0,0,0,${0.03 + R() * 0.05})`; g.fillRect(0, y, n, 1); } for (let x = 0; x < n; x += 2) { g.fillStyle = `rgba(0,0,0,${0.02 + R() * 0.04})`; g.fillRect(x, 0, 1, n); } for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${R() * 0.12})`; g.fillRect(R() * n, R() * n, 1, 1); } }
    else if (kind === "metal") { for (let y = 0; y < n; y++) { g.fillStyle = `rgba(0,0,0,${R() * 0.07})`; g.fillRect(0, y, n, 1); } }
    const t = new THREE.CanvasTexture(cv); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(kind === "wood" ? 1.5 : 3, kind === "wood" ? 1.5 : 3); t._shared = true; v.shared.push(t);
    return (v.stex[kind] = t);
  }
  _realMat(mt, k) {
    if (!mt || !mt.isMeshStandardMaterial) return mt;
    const P = { wood: [0.62, 0, "wood"], top: [0.5, 0, "wood"], soft: [0.97, 0, "fabric"], soft2: [0.97, 0, "fabric"], metal: [0.32, 0.85, "metal"], glass: [0.05, 0], screen: [0.18, 0.1], white: [0.35, 0], white2: [0.4, 0], cab: [0.55, 0], cab2: [0.5, 0], dark: [0.6, 0.1], water: [0.1, 0], burner: [0.3, 0.2] }[k] || [0.7, 0];
    mt.roughness = P[0]; mt.metalness = P[1]; if (P[2]) mt.map = this._surfTex(P[2]);
    return mt;
  }
  // Umgebung für Reflexionen (aus einer kleinen Licht-Szene, ohne Dateien)
  _realEnv() {
    const v = this._v3, THREE = v.THREE, es = new THREE.Scene();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), new THREE.MeshBasicMaterial({ color: v.dk ? 0x1a2235 : 0xbfd4ea, side: THREE.BackSide })); es.add(sky);
    const flo = new THREE.Mesh(new THREE.PlaneGeometry(100, 100).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: v.dk ? 0x201c18 : 0x8a7a66 })); flo.position.y = -10; es.add(flo);
    [[0, 40, 0, 30, 2, 30, 1.6], [35, 15, 10, 4, 20, 30, 1], [-35, 15, -10, 4, 20, 30, 0.7]].forEach(([x, y, z, w, h, d, k]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.9).multiplyScalar(v.dk ? k * 0.4 : k * 2) })); m.position.set(x, y, z); es.add(m); });
    const pm = new THREE.PMREMGenerator(v.renderer), rt = pm.fromScene(es, 0.04);
    v.scene.environment = rt.texture; v.scene.environmentIntensity = v.dk ? 0.18 : 0.28; v.hemi.intensity *= 0.8; v.shared.push(rt.texture); pm.dispose();
  }
  // weiche Kontaktschatten unter Möbeln
  _contactShadows(m) {
    const v = this._v3, THREE = v.THREE, tex = this._lightTex("glow");
    m.furniture.forEach((f) => {
      if (["rug", "pillar"].includes(f.type) || furnZ(f) > 5 || !(catOf(f) || ["sofa_u", "plant", "bed", "sofa", "table", "desk", "wardrobe", "kitchen"].includes(f.type) || GARDEN.includes(f.type))) return;
      const s = GARDEN.includes(f.type) ? 1.05 : 1.3, mm = new THREE.Mesh(new THREE.PlaneGeometry(f.w * s, f.h * s).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, opacity: v.dk ? 0.55 : 0.4, depthWrite: false }));
      mm.position.set(f.x, 0.6, f.y); mm.rotation.y = -rad(f.angle || 0); mm.renderOrder = 1; mm.userData.noCast = true; v.scene.add(mm);
    });
  }
  /* ---------- Skin „Pixel-Abenteuer“ ---------- */
  _pixel() { return this._config.skin === "pixel"; }
  _pxImg(parent, href, x, y, s, cls) { const im = el("image", { href, x: x - s / 2, y: y - s / 2, width: s, height: s, class: cls || "pxi", preserveAspectRatio: "none" }, parent); return im; }
  // laufende Figuren: Personen (zu Hause) und Haustiere (drinnen)
  _walkers2d(g) {
    clearInterval(this._walkT); this._walkers = [];
    if (!this._pixel() || this._config.walkers === false) return;
    const ind = this._m.areas.filter((a) => !a.outdoor); if (!ind.length) return;
    const R = Math.random, rnd = (a) => { const xs = a.points.map((q) => q[0]), ys = a.points.map((q) => q[1]); for (let k = 0; k < 40; k++) { const x = Math.min(...xs) + 30 + R() * (Math.max(...xs) - Math.min(...xs) - 60), y = Math.min(...ys) + 30 + R() * (Math.max(...ys) - Math.min(...ys) - 60); if (pointInPoly(x, y, a.points)) return [x, y]; } return centroid(a.points); };
    const S = 52, add = (frames, vis, title) => {
      const area = ind[Math.floor(R() * ind.length)], wg = el("g", { class: "walker" }, g), im = this._pxImg(wg, frames[0], 0, 0, S);
      const tt = el("title", {}, wg); tt.textContent = title;
      const w = { wg, im, frames, vis, area, pos: rnd(area), tgt: null, wait: Math.floor(R() * 20), f: 0, flip: false };
      this._walkers.push(w);
    };
    const hair = ["#6b4226", "#e0b04a", "#2a2030", "#b5462f"], shirt = ["#3b82d6", "#e0567a", "#3fae6a", "#f0a030"];
    this._personList().forEach((p, i) => add([PX.person(hair[i % 4], shirt[i % 4], 0), PX.person(hair[i % 4], shirt[i % 4], 1)], () => { const s = this._hass.states[p.entity]; return !!s && s.state === "home"; }, p.name || this._name(p.entity)));
    this._m.items.filter((it) => it.pet || /🐈|🐱|🐕|🐶/.test(it.icon || "")).forEach((it) => add([PX.cat(0), PX.cat(1)], () => { const s = this._hass.states[it.entity]; return !!s && (it.pet_state ? s.state === it.pet_state : ON_STATES.includes(s.state)); }, it.name || "Haustier"));
    const tick = () => {
      if (!this._svg || !this._svg.isConnected) return;
      this._walkers.forEach((w) => {
        const on = w.vis(); w.wg.style.display = on ? "" : "none"; if (!on) return;
        if (!w.tgt) { if (w.wait-- > 0) { w.im.setAttribute("href", w.frames[0]); } else { if (R() < 0.3) w.area = ind[Math.floor(R() * ind.length)]; w.tgt = rnd(w.area); } }
        if (w.tgt) {
          const dx = w.tgt[0] - w.pos[0], dy = w.tgt[1] - w.pos[1], d = Math.hypot(dx, dy), st = 7;
          if (d <= st) { w.pos = w.tgt; w.tgt = null; w.wait = 15 + Math.floor(R() * 40); }
          else { w.pos = [w.pos[0] + (dx / d) * st, w.pos[1] + (dy / d) * st]; w.f = (w.f + 1) % 4; w.im.setAttribute("href", w.frames[w.f < 2 ? 0 : 1]); const q0 = this._P(0, 0), q1 = this._P(dx, dy); w.flip = q1[0] - q0[0] < 0; }
        }
        const q = this._P(w.pos[0], w.pos[1]); w.wg.setAttribute("transform", `translate(${q[0]} ${q[1] - S * 0.35}) scale(${w.flip ? -1 : 1} 1)`);
      });
    };
    tick(); this._walkT = setInterval(tick, 120);
  }
  _toon(THREE) {
    if (!this._toonGrad) { const t = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; this._toonGrad = t; }
    return this._toonGrad;
  }
  _outlines3d() {
    const v = this._v3, THREE = v.THREE, om = new THREE.MeshBasicMaterial({ color: 0x1c1624, side: THREE.BackSide }), list = [];
    v.scene.traverse((o) => {
      if (!o.isMesh || !o.material || o.userData.noCast || v.walls.includes(o)) return;
      const mt = o.material; if (!mt.isMeshToonMaterial || mt.transparent || (o.userData.kind === "room" || o.userData.kind === "ground")) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const s = o.geometry.boundingBox.getSize(new THREE.Vector3()); if (Math.max(s.x, s.y, s.z) < 4) return;
      list.push([o, s]);
    });
    list.forEach(([o, s]) => { const ol = new THREE.Mesh(o.geometry, om), k = (a) => 1 + 2.4 / Math.max(a, 1.5); ol.scale.set(k(s.x), k(s.y), k(s.z)); ol.userData.noCast = true; ol.raycast = () => {}; o.add(ol); });
  }
  /* ---------- Bedienung: sicheres Schalten, Steuerblase, Rückgängig ---------- */
  _safe() { return this._config.tap_action !== "toggle"; }
  _snap(eid) {
    const s = this._hass.states[eid]; if (!s) return null;
    const a = s.attributes || {};
    return { eid, state: s.state, brightness: a.brightness, rgb: a.color_mode && ["rgb", "hs", "xy", "rgbw", "rgbww"].includes(a.color_mode) ? a.rgb_color : null, kelvin: a.color_mode === "color_temp" ? a.color_temp_kelvin : null, pct: a.percentage };
  }
  // jede Schaltaktion läuft hierüber → „Rückgängig“ möglich
  _act(eid, domain, service, data = {}, label) {
    const prev = this._snap(eid);
    this._hass.callService(domain, service, { entity_id: eid, ...data });
    if (navigator.vibrate) navigator.vibrate(15);
    if (!prev) return;
    const nm = label || this._name(eid);
    const what = service === "toggle" ? (prev.state === "on" ? "aus" : "an") : service === "turn_off" ? "aus" : data.brightness_pct != null ? data.brightness_pct + " %" : data.percentage != null ? data.percentage + " %" : "geändert";
    this._undoShow(`${nm} ${what}`, prev);
  }
  _undoShow(txt, prev) {
    const t = this._root.querySelector(".utoast");
    t.querySelector("span").textContent = txt; t.hidden = false; this._undoPrev = prev;
    clearTimeout(this._undoT); this._undoT = setTimeout(() => (t.hidden = true), 5000);
  }
  _undo() {
    const p = this._undoPrev, h = this._hass; if (!p) return;
    const dom = p.eid.split(".")[0];
    if (p.state === "off") h.callService("homeassistant", "turn_off", { entity_id: p.eid });
    else if (dom === "light") h.callService("light", "turn_on", { entity_id: p.eid, ...(p.brightness != null ? { brightness: p.brightness } : {}), ...(p.rgb ? { rgb_color: p.rgb } : p.kelvin ? { color_temp_kelvin: p.kelvin } : {}) });
    else if (dom === "fan" && p.pct != null) h.callService("fan", "set_percentage", { entity_id: p.eid, percentage: p.pct });
    else h.callService("homeassistant", "turn_on", { entity_id: p.eid });
    this._undoPrev = null; this._root.querySelector(".utoast").hidden = true;
  }
  // Tippen auf ein Symbol: nächstgelegenes Symbol gewinnt, dann Steuerblase (bzw. direkt schalten)
  _tapItem(ev, it) {
    const best = this._nearestTap(ev) || it;
    this._itemAction(best, ev);
  }
  _nearestTap(ev) {
    const svg = this._svg, ctm = svg && svg.getScreenCTM(); if (!ctm || !this._taps) return null;
    let best = null, bd = 30;
    for (const t of this._taps) {
      if (t.grp.classList.contains("clhid")) continue;
      const q = new DOMPoint(t.x, t.y).matrixTransform(ctm), d = Math.hypot(q.x - ev.clientX, q.y - ev.clientY);
      if (d < bd) { bd = d; best = t.it; }
    }
    return best;
  }
  _itemAction(it, ev) {
    if (it.display === "device") { if (this._isMedia(it)) this._mediaShow(it); else this._moreInfo(it.entity); return; }
    const dom = (it.entity || "").split(".")[0];
    if (!["light", "switch", "fan", "input_boolean"].includes(dom)) { this._moreInfo(it.entity); return; }
    if (this._safe()) this._ctlShow(it, ev.clientX, ev.clientY);
    else this._act(it.entity, "homeassistant", "toggle", {}, it.name);
  }
  _tapOk(down, ev) {
    return down && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) < 9 && performance.now() - down.t < 550 && Date.now() - (this._panEnd || 0) > 350 && Date.now() - (this._multiT || 0) > 400;
  }
  _ctlShow(it, cx, cy) {
    const box = this._root.querySelector(".cbub"), wr = this._root.querySelector(".wrap").getBoundingClientRect();
    this._ctl = it; this._ctlSig = null; box.hidden = false;
    // Geister-Klick vom selben Tippen abfangen (Blase kann unter dem Finger aufgehen)
    box.style.pointerEvents = "none"; clearTimeout(this._ctlPe); this._ctlPe = setTimeout(() => (box.style.pointerEvents = ""), 450);
    this._ctlRender();
    if (this._narrow) { box.classList.add("dock"); box.style.left = box.style.top = ""; return; }
    box.classList.remove("dock");
    const w = box.offsetWidth || 270, h = box.offsetHeight || 170;
    let x = clamp(cx - wr.left - w / 2, 8, wr.width - w - 8), y = cy - wr.top - h - 24;
    if (y < 8) y = Math.min(cy - wr.top + 26, wr.height - h - 8);
    box.style.left = x + "px"; box.style.top = Math.max(8, y) + "px";
  }
  _ctlClose() { this._ctl = null; const b = this._root && this._root.querySelector(".cbub"); if (b) b.hidden = true; }
  _ctlRender() {
    const it = this._ctl; if (!it) return;
    const h = this._hass, st = h.states[it.entity], box = this._root.querySelector(".cbub");
    if (this._ctlBusy) return;
    const a = (st && st.attributes) || {}, on = !!st && st.state === "on", dom = it.entity.split(".")[0], off = !st || OFF_STATES.includes(st.state);
    const sig = JSON.stringify([it.entity, st && st.state, a.brightness, a.rgb_color, a.percentage]);
    if (sig === this._ctlSig) return; this._ctlSig = sig;
    const modes = a.supported_color_modes || [], dim = dom === "light" && modes.some((x) => x !== "onoff"), col = modes.some((x) => ["rgb", "hs", "xy", "rgbw", "rgbww"].includes(x)), ct = modes.includes("color_temp");
    const br = on && a.brightness != null ? Math.round((a.brightness / 255) * 100) : 0;
    const fanPct = dom === "fan" && (a.supported_features & 1) ? (a.percentage ?? 0) : null;
    const c = on && dom === "light" ? this._rgb(st) : null;
    box.querySelector("b").textContent = it.name || this._name(it.entity);
    box.querySelector(".cbs").textContent = off ? "nicht erreichbar" : on ? (dim ? `an · ${br} %` : "an") : "aus";
    box.querySelector(".cbs").style.color = c ? `rgb(${c.join(",")})` : "";
    const sw = [];
    if (ct) sw.push(["k", 2700, "#ffc98a", "Warm"], ["k", 4000, "#fff1d6", "Neutral"], ["k", 6000, "#dfe9ff", "Kalt"]);
    if (col) sw.push(["c", [255, 80, 60], "#ff503c"], ["c", [255, 160, 40], "#ffa028"], ["c", [80, 220, 120], "#50dc78"], ["c", [60, 140, 255], "#3c8cff"], ["c", [170, 90, 255], "#aa5aff"]);
    box.querySelector(".cbb").innerHTML = `
      <button class="cbt ${on ? "on" : ""}" ${off ? "disabled" : ""}><span>⏻</span>${on ? "Ausschalten" : "Einschalten"}</button>
      ${dim && !off ? `<label class="cbl">Helligkeit <b>${br || 0} %</b><input class="cbr" type="range" min="1" max="100" value="${br || 50}"></label>` : ""}
      ${fanPct != null && !off ? `<label class="cbl">Stufe <b>${fanPct} %</b><input class="cbf" type="range" min="0" max="100" step="${a.percentage_step || 1}" value="${fanPct}"></label>` : ""}
      ${sw.length && !off ? `<div class="cbsw">${sw.map((s, i) => `<button data-i="${i}" style="background:${s[2]}" title="${s[3] || ""}"></button>`).join("")}</div>` : ""}
      <button class="cbd">Details ⛶</button>`;
    const B = (q) => box.querySelector(q);
    B(".cbt").onclick = () => this._act(it.entity, "homeassistant", on ? "turn_off" : "turn_on", {}, it.name);
    const slide = (inp, fn) => { if (!inp) return; const lb = inp.parentElement.querySelector("b"); inp.oninput = () => { this._ctlBusy = true; lb.textContent = inp.value + " %"; }; inp.onchange = () => { this._ctlBusy = false; fn(+inp.value); }; };
    slide(B(".cbr"), (v) => this._act(it.entity, "light", "turn_on", { brightness_pct: v }, it.name));
    slide(B(".cbf"), (v) => this._act(it.entity, "fan", "set_percentage", { percentage: v }, it.name));
    box.querySelectorAll(".cbsw button").forEach((b) => (b.onclick = () => { const s = sw[+b.dataset.i]; this._act(it.entity, "light", "turn_on", s[0] === "k" ? { color_temp_kelvin: s[1] } : { rgb_color: s[1] }, it.name); }));
    B(".cbd").onclick = () => { const e = it.entity; this._ctlClose(); this._moreInfo(e); };
  }
  // Liste für Gruppen, die sich nicht weiter aufzoomen lassen
  _ctlList(items, cx, cy) {
    const box = this._root.querySelector(".cbub"); this._ctl = null; box.hidden = false;
    box.style.pointerEvents = "none"; clearTimeout(this._ctlPe); this._ctlPe = setTimeout(() => (box.style.pointerEvents = ""), 450);
    box.querySelector("b").textContent = `${items.length} Geräte`; box.querySelector(".cbs").textContent = "";
    const h = this._hass;
    box.querySelector(".cbb").innerHTML = `<div class="cbli">${items.map((it, i) => { const s = h.states[it.entity], on = !!s && s.state === "on"; return `<div class="cbrow" data-i="${i}"><span>${this._esc(it.name || this._name(it.entity))}</span><button class="tg ${on ? "on" : ""}"><span></span></button></div>`; }).join("")}</div>`;
    box.querySelectorAll(".cbrow").forEach((r) => {
      const it = items[+r.dataset.i];
      r.querySelector(".tg").onclick = (ev) => { ev.stopPropagation(); this._act(it.entity, "homeassistant", "toggle", {}, it.name); r.querySelector(".tg").classList.toggle("on"); };
      r.onclick = () => this._ctlShow(it, cx, cy);
    });
    if (this._narrow) box.classList.add("dock"); else { const wr = this._root.querySelector(".wrap").getBoundingClientRect(); box.classList.remove("dock"); box.style.left = clamp(cx - wr.left - 135, 8, wr.width - 278) + "px"; box.style.top = clamp(cy - wr.top - 60, 8, wr.height - 300) + "px"; }
  }
  /* ---------- Gruppen statt Überlappung, Raum-Übersicht ---------- */
  _cluster() {
    const svg = this._svg, g = this._clG; if (!svg || !g || !this._taps) return;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const k = Math.hypot(ctm.a, ctm.b); g.innerHTML = ""; this._clusters = [];
    const list = this._taps.filter((t) => t.group);
    list.forEach((t) => t.grp.classList.remove("clhid"));
    if (this._config.cluster === false || !list.length) return;
    const roomMode = this._narrow && (this._zk || 1) >= 0.999 && this._config.group_rooms !== false;
    const groups = [];
    if (roomMode) {
      const by = {}; list.filter((t) => t.light && t.room).forEach((t) => (by[t.room] = by[t.room] || []).push(t));
      Object.entries(by).forEach(([rid, l]) => l.length >= 2 && groups.push({ l, room: rid }));
    } else {
      const thr = (this._calm && !svg.classList.contains("zin") ? 20 : 30) / k, par = list.map((_, i) => i), f = (i) => (par[i] === i ? i : (par[i] = f(par[i])));
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j]; if (a.room !== b.room) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < thr) par[f(i)] = f(j);
      }
      const by = {}; list.forEach((t, i) => (by[f(i)] = by[f(i)] || []).push(t));
      Object.values(by).forEach((l) => l.length >= 3 && groups.push({ l }));
    }
    groups.forEach((G) => {
      G.l.forEach((t) => t.grp.classList.add("clhid"));
      let cx = G.l.reduce((s, t) => s + t.x, 0) / G.l.length, cy = G.l.reduce((s, t) => s + t.y, 0) / G.l.length;
      if (G.room) { const a = this._m.areas.find((x) => x.id === G.room); if (a) { const c = centroid(a.points), q = this._P(c[0], c[1]); cx = q[0]; cy = q[1] + 26 / k; } }
      const r = 16 / k, cg = el("g", { class: "clu" + (G.room ? " room" : ""), transform: `translate(${cx} ${cy})` }, g);
      el("circle", { r: r * 1.9, class: "touch" }, cg);
      const bg = el("rect", { x: -r, y: -r, width: 2 * r, height: 2 * r, rx: r, class: "cld" }, cg);
      const tx = el("text", { y: r * 0.36, "font-size": r * 0.95, class: "clt" }, cg);
      const C = { G, cg, tx, bg, r, room: G.room }; this._clusters.push(C);
      let down = null;
      cg.addEventListener("pointerdown", (ev) => { down = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
      cg.addEventListener("pointerup", (ev) => {
        if (!this._tapOk(down, ev)) return; down = null;
        if (G.room) { this._focusArea(G.room); const rz = this._root.querySelector(".rz"); if (rz) rz.value = G.room; return; }
        if ((this._zk || 1) <= 0.13) { this._ctlList(G.l.map((t) => t.it), ev.clientX, ev.clientY); return; }
        const pts = G.l.map((t) => [t.it.x, t.it.y]), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), pad = 60;
        this._zoomBox([[Math.min(...xs) - pad, Math.min(...ys) - pad], [Math.max(...xs) + pad, Math.max(...ys) + pad]]);
      });
      cg.addEventListener("click", (ev) => ev.stopPropagation());
    });
    this._clusterState();
  }
  _clusterState() {
    (this._clusters || []).forEach((C) => {
      const on = C.G.l.filter((t) => { const s = this._hass.states[t.it.entity]; return t.light ? !!s && s.state === "on" : t.it.display === "device" ? this._running(t.it, s) : !!s && s.state === "on"; }).length;
      C.cg.classList.toggle("on", on > 0);
      C.tx.textContent = C.room ? (on ? `💡${on}/${C.G.l.length}` : `💡${C.G.l.length}`) : String(C.G.l.length);
      const w = Math.max(2 * C.r, C.tx.textContent.length * C.r * 0.62 + C.r * 0.9); C.bg.setAttribute("x", -w / 2); C.bg.setAttribute("width", w);
    });
  }
  // Raumnamen weichen einander aus
  _declutter(labelG) {
    const placed = [], hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    [...labelG.querySelectorAll("text.rlabel")].forEach((t) => {
      let bb; try { bb = t.getBBox(); } catch (e) { return; }
      if (!bb.width) return;
      const hh = bb.height * 0.75;
      for (const dy of [0, hh, -hh, 2 * hh, -2 * hh]) {
        const b = { x: bb.x, y: bb.y + dy, width: bb.width, height: bb.height };
        if (!placed.some((p) => hit(p, b))) { if (dy) t.setAttribute("transform", `translate(0 ${dy})`); placed.push(b); return; }
      }
      t.classList.add("crowd"); placed.push(bb);
    });
  }
  /* ---------- Etagen ---------- */
  _levels() {
    const c = this._config, base = c.plan || this._srcPlan, lv = c.levels || this._srcLevels || [];
    return [{ name: c.level_name || this._srcLevelName || "EG", plan: base }, ...lv.filter((l) => l && l.plan)];
  }
  _levelPlan() {
    const L = this._levels(); if (this._config.edit3d) return L[0].plan;
    const i = clamp(this._lvl || 0, 0, L.length - 1); return L[i].plan;
  }
  _lvUi() {
    const s = this._root.querySelector(".lv"), L = this._levels();
    s.hidden = L.length < 2 || !!this._config.edit3d;
    if (s.hidden) return;
    s.innerHTML = L.map((l, i) => `<option value="${i}" ${i === (this._lvl || 0) ? "selected" : ""}>${this._esc(l.name || "Etage " + i)}</option>`).join("");
  }
  /* ---------- Weiche Ansichtswechsel ---------- */
  _switchView(nv) {
    const prev = this._view; if (nv === prev) return;
    const go = () => { this._view = nv; try { localStorage.setItem("jg-view", nv); } catch (e) {} this._fromView = prev; this._build(); };
    const v = this._v3;
    if (prev === "3d" && v && v.target) {
      // erst von oben draufschauen, dann umschalten
      const f = { phi: v.phi, theta: v.theta }, t0 = performance.now(), tth = Math.round(v.theta / (Math.PI * 2)) * Math.PI * 2;
      const step = (t) => { if (this._v3 !== v) return; const k = clamp((t - t0) / 450, 0, 1), e = k * k * (3 - 2 * k); v.phi = f.phi + (0.02 - f.phi) * e; v.theta = f.theta + (tth - f.theta) * e; this._render3d(); if (k < 1) requestAnimationFrame(step); else go(); };
      requestAnimationFrame(step);
      return;
    }
    go();
  }
  _flyIn3d() {
    const v = this._v3; if (!v || this._config.edit3d) return;
    const to = { phi: v.phi, theta: v.theta, radius: v.radius }, t0 = performance.now();
    v.phi = 0.02; v.theta = 0; v.radius = to.radius * 1.1;
    const step = (t) => { if (this._v3 !== v) return; const k = clamp((t - t0) / 1100, 0, 1), e = 1 - Math.pow(1 - k, 3); v.phi = 0.02 + (to.phi - 0.02) * e; v.theta = to.theta * e; v.radius = to.radius * (1.1 - 0.1 * e); this._render3d(); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  /* ---------- Garten (Bäume, Büsche, Hecken) ---------- */
  _garden2d(grp, f) {
    const w = f.w, h = f.h;
    if (f.type === "hedge") { el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: Math.min(h / 2, 25), class: "hedge" }, grp); return; }
    const r = Math.min(w, h) / 2, n = f.type === "bush" ? 5 : 7;
    el("circle", { r, class: f.type === "conifer" ? "tree con" : "tree" }, grp);
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + 0.4; el("circle", { cx: Math.cos(a) * r * 0.45, cy: Math.sin(a) * r * 0.45, r: r * (0.38 + (k % 3) * 0.05), class: "tree2" }, grp); }
    if (f.type !== "bush") el("circle", { r: Math.max(4, r * 0.08), class: "trunk" }, grp);
  }
  _garden3d(f, lam, place) {
    const v = this._v3, THREE = v.THREE, w = f.w, d = f.h, R = seeded(f.id || f.type + f.x + f.y), out = [];
    const greens = v.dk ? [0x2f4d2a, 0x355a2e, 0x2a4526] : [0x4f7f3c, 0x5c8f46, 0x45733a];
    const gm = (i) => lam(greens[i % greens.length]);
    if (f.type === "hedge") {
      const H = f.height || 160;
      out.push(place(new THREE.Mesh(new THREE.BoxGeometry(w, H, d), gm(0)), f.x, H / 2, f.y, f.angle || 0));
      for (let k = 0; k < Math.max(2, Math.round(w / 60)); k++) { const s = -w / 2 + (k + 0.5) * (w / Math.max(2, Math.round(w / 60))), a = rad(f.angle || 0); const m2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), gm(k + 1)); m2.scale.set(w / Math.max(2, Math.round(w / 60)) * 0.6, 22, d * 0.62); out.push(place(m2, f.x + Math.cos(a) * s, H - 4, f.y + Math.sin(a) * s, f.angle || 0)); }
      return out;
    }
    const r = Math.min(w, d) / 2;
    if (f.type === "bush") {
      for (let k = 0; k < 5; k++) { const a = R() * Math.PI * 2, o = r * 0.35 * R(), s = r * (0.45 + R() * 0.25); const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), gm(k)); out.push(place(m, f.x + Math.cos(a) * o, s * 0.85, f.y + Math.sin(a) * o)); }
      return out;
    }
    const H = f.height || (f.type === "conifer" ? 450 : 520), trunk = lam(v.dk ? 0x3d2c20 : 0x6a4c34);
    out.push(place(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.1, H * 0.55, 10), trunk), f.x, H * 0.275, f.y));
    if (f.type === "conifer") {
      for (let k = 0; k < 3; k++) { const cr = r * (1 - k * 0.25), ch = H * 0.42; out.push(place(new THREE.Mesh(new THREE.ConeGeometry(cr, ch, 12), gm(k)), f.x, H * 0.3 + k * H * 0.2 + ch / 2, f.y)); }
    } else {
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + R(), o = r * 0.38, s = r * (0.48 + R() * 0.2); const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), gm(k)); out.push(place(m, f.x + Math.cos(a) * o, H * 0.62 + R() * H * 0.18, f.y + Math.sin(a) * o)); }
      out.push(place(new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.6, 1), gm(2)), f.x, H * 0.86, f.y));
    }
    return out;
  }
  /* ---------- 3D-Modelle (glb/gltf/obj) ---------- */
  async _addon(path) {
    const base = this._config.addons_url || "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/", three = new URL(this._config.three_url || THREE_URL, location.href).href;
    const get = async (p) => { const r = await fetch(new URL(p, base).href); if (!r.ok) throw new Error(p + ": " + r.status); return (await r.text()).replace(/from\s*['"]three['"]/g, `from '${three}'`); };
    ADDON_CACHE[path] = ADDON_CACHE[path] || (async () => {
      let src = await get(path);
      for (const m of [...src.matchAll(/from\s*['"](\.\.?\/[^'"]+)['"]/g)]) {
        const dep = new URL(m[1], new URL(path, base)).href, ds = await get(dep), url = URL.createObjectURL(new Blob([ds], { type: "text/javascript" }));
        src = src.split(m[0]).join(`from '${url}'`);
      }
      return import(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    })();
    return ADDON_CACHE[path];
  }
  _loadModel(url) {
    const key = url;
    if (!MODEL_CACHE[key]) MODEL_CACHE[key] = (async () => {
      const ext = url.split("?")[0].split(".").pop().toLowerCase();
      if (ext === "obj") { const { OBJLoader } = await this._addon("loaders/OBJLoader.js"); return new OBJLoader().loadAsync(new URL(url, location.href).href); }
      const { GLTFLoader } = await this._addon("loaders/GLTFLoader.js"); const g = await new GLTFLoader().loadAsync(new URL(url, location.href).href); return g.scene;
    })().catch((e) => { delete MODEL_CACHE[key]; throw e; });
    return MODEL_CACHE[key];
  }
  _model3d(f, meshes) {
    const v = this._v3, THREE = v.THREE;
    if (!f.url) return;
    this._loadModel(f.url).then((src) => {
      if (this._v3 !== v) return;
      const obj = src.clone(true), box0 = new THREE.Box3().setFromObject(obj), sz = box0.getSize(new THREE.Vector3());
      const s = f.scale ? +f.scale : Math.min(f.w / (sz.x || 1), f.h / (sz.z || 1));
      obj.scale.setScalar(s);
      const box1 = new THREE.Box3().setFromObject(obj), c = box1.getCenter(new THREE.Vector3());
      const g = new THREE.Group(); obj.position.set(-c.x, -box1.min.y, -c.z); g.add(obj);
      g.position.set(f.x, f.z || 0, f.y); g.rotation.y = -rad(f.angle || 0); v.scene.add(g);
      g.traverse((o) => { if (o.isMesh) { meshes.push(o); if (v.fx) { o.castShadow = o.receiveShadow = true; } if (this._config.edit3d) { o.userData = { kind: "furn", idx: f._i }; v.hits.push(o); } else if (f.entity) { o.userData = { kind: "entity", entity: f.entity }; v.hits.push(o); } } });
      this._req3d();
    }).catch((e) => { console.warn("Modell nicht ladbar:", f.url, e); });
  }
  /* ---------- Fensterrahmen, Zargen, Rollläden ---------- */
  _roomSide(o) {
    const a = rad(o.angle || 0), nx = -Math.sin(a), ny = Math.cos(a);
    const inA = (k) => this._m.areas.some((ar) => !ar.outdoor && pointInPoly(o.x + nx * 30 * k, o.y + ny * 30 * k, ar.points));
    return inA(1) ? 1 : inA(-1) ? -1 : 1;
  }
  _frames3d(o, RH, H3, C, lam, place) {
    const v = this._v3, THREE = v.THREE, a = rad(o.angle || 0), u = [Math.cos(a), Math.sin(a)], n = [-Math.sin(a), Math.cos(a)], L = o.length, T = this._config.wall_thickness || 12;
    const at = (s, d) => [o.x + u[0] * s + n[0] * d, o.y + u[1] * s + n[1] * d];
    const fm = (v.fmat = v.fmat || lam(v.dk ? 0xc9c4bc : 0xf6f4f0)), B = (w, h, dd, s, d, y) => { const p = at(s, d); place(new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), fm), p[0], y, p[1], o.angle || 0); };
    const side = this._roomSide(o);
    if (o.type === "window" || o.glazed) {
      const sill = o.type === "window" ? (o.sill ?? 0.3) * RH : 0, topR = o.type === "window" ? RH * 0.9 : o.sash === "double" ? RH * 0.84 : RH * 0.75, top = Math.min(topR, H3), h = top - sill;
      if (h < 4) return;
      B(5, h, 9, -L / 2 + 2.5, 0, sill + h / 2); B(5, h, 9, L / 2 - 2.5, 0, sill + h / 2);
      if (sill > 0) B(L, 5, 9, 0, 0, sill + 2.5);
      if (topR <= H3 + 0.5) B(L, 5, 9, 0, 0, top - 2.5);
      if (o.type === "window" && L > 110 && o.motion !== "slide") B(4, h, 7, 0, 0, sill + h / 2);
      if (o.type === "window" && sill > 25) B(L + 10, 2.5, 18, 0, side * (T / 2 + 8), sill - 1.25);
    } else {
      const top = Math.min(o.sash === "double" ? RH * 0.84 : RH * 0.75, H3);
      B(4, top, T + 4, -L / 2 + 2, 0, top / 2); B(4, top, T + 4, L / 2 - 2, 0, top / 2);
      if ((o.sash === "double" ? RH * 0.84 : RH * 0.75) <= H3) B(L, 5, T + 4, 0, 0, top + 2.5);
    }
  }
  _shutter3d(o, RH, H3, bind) {
    const v = this._v3, THREE = v.THREE; if (!o.cover || o.type !== "window") return;
    const a = rad(o.angle || 0), n = [-Math.sin(a), Math.cos(a)], side = -this._roomSide(o), T = this._config.wall_thickness || 12;
    const sill = (o.sill ?? 0.3) * RH, top = Math.min(RH * 0.9, H3), H = top - sill; if (H < 4) return;
    const tex = this._lightTex("slats"); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshLambertMaterial({ color: v.dk ? 0x7d8084 : 0x9a9da1, map: tex });
    const m = new THREE.Mesh(new THREE.BoxGeometry(o.length - 4, 1, 2), mat);
    m.position.set(o.x + n[0] * side * (T / 2 + 1.5), top, o.y + n[1] * side * (T / 2 + 1.5)); m.rotation.y = -a; m.visible = false; v.scene.add(m);
    m.userData = { kind: "entity", entity: o.cover }; v.hits.push(m);
    bind(o.cover, (st) => {
      const pos = st && st.attributes.current_position != null ? +st.attributes.current_position : st && st.state === "closed" ? 0 : 100, c = 1 - clamp(pos, 0, 100) / 100, h = H * c;
      m.visible = h > 0.5; m.scale.y = Math.max(h, 0.01); m.position.y = top - h / 2; tex.repeat.set(1, Math.max(1, h / 6));
    });
  }
  _shutter2d(g, o, bind) {
    if (!o.cover || o.type !== "window") return;
    const a = rad(o.angle || 0), u = [Math.cos(a), Math.sin(a)], n = [-Math.sin(a), Math.cos(a)], s = -this._roomSide(o), d = 9, L = o.length;
    const A = [o.x - u[0] * L / 2 + n[0] * s * d, o.y - u[1] * L / 2 + n[1] * s * d], B = [o.x + u[0] * L / 2 + n[0] * s * d, o.y + u[1] * L / 2 + n[1] * s * d];
    const ln = el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: "shutter" }, g);
    const hit = el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: "touchl" }, g);
    hit.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(o.cover); });
    bind(o.cover, (st) => {
      const pos = st && st.attributes.current_position != null ? +st.attributes.current_position : st && st.state === "closed" ? 0 : 100, c = 1 - clamp(pos, 0, 100) / 100;
      ln.style.opacity = c < 0.02 ? 0.12 : 0.25 + 0.75 * c; ln.style.strokeDasharray = c < 0.98 && c > 0.02 ? "6 4" : "";
    });
  }
  /* ---------- Ventilatoren ---------- */
  _isFan(it) { return it.display === "fan" || (it.entity || "").startsWith("fan."); }
  _fanSpeed(st) { if (!st || st.state !== "on") return 0; const p = st.attributes.percentage; return p != null ? clamp(+p / 100, 0.15, 1) : 0.6; }
  _fan3d(it, z, bind) {
    const v = this._v3, THREE = v.THREE, g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: v.dk ? 0x9c968f : 0xe8e4de });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 6, 16), mat));
    const R = (it.r || 60);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(R, 1.2, 12), mat); b.position.set(Math.cos((k * 2 * Math.PI) / 3) * R / 2, 0, Math.sin((k * 2 * Math.PI) / 3) * R / 2); b.rotation.y = -(k * 2 * Math.PI) / 3; b.rotation.x = 0.15; g.add(b); }
    g.position.set(it.x, z, it.y); v.scene.add(g);
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex("icon_fan"), transparent: true, depthTest: false, sizeAttenuation: false }));
    icon.position.set(it.x, z + 4, it.y); icon.renderOrder = 10; icon.userData = { kind: "item", item: it, px: 26 * (this._config.icon_scale || 1) };
    v.scene.add(icon); v.sprites.push(icon);
    const fan = { g, sp: 0, icon }; (v.fans = v.fans || []).push(fan);
    bind(it.entity, (st) => { fan.sp = this._fanSpeed(st); icon.material.color.set(fan.sp ? 0x7fd3e8 : this._dark ? 0x5a5550 : 0x8a8176); icon.userData.calm = this._calm && !fan.sp; this._fansActive(); });
  }
  _fansActive() {
    const v = this._v3; if (!v || !v.fans || v.fanRaf || !v.fans.some((f) => f.sp)) return;
    let last = performance.now();
    const loop = (t) => { if (this._v3 !== v) return; const dt = (t - last) / 1000; last = t; let any = false; v.fans.forEach((f) => { if (f.sp) { any = true; f.g.rotation.y -= dt * f.sp * 9; f.icon.material.rotation -= dt * f.sp * 6; } }); this._render3d(); v.fanRaf = any ? requestAnimationFrame(loop) : 0; };
    v.fanRaf = requestAnimationFrame(loop);
  }
  /* ---------- Personen ---------- */
  _personList() {
    const c = this._config.persons, h = this._hass;
    if (c === false) return [];
    const l = Array.isArray(c) ? c : Object.keys(h.states).filter((e) => e.startsWith("person."));
    return l.map((p) => (typeof p === "string" ? { entity: p } : p)).filter((p) => h.states[p.entity]);
  }
  _personUi() {
    const box = this._root.querySelector(".ppl"), l = this._personList(), h = this._hass;
    box.hidden = !l.length || !!this._config.edit3d; if (box.hidden) return;
    const sig = JSON.stringify(l.map((p) => { const s = h.states[p.entity]; return [p.entity, s.state, s.attributes.entity_picture]; }));
    if (sig === this._pplSig) return; this._pplSig = sig;
    box.innerHTML = l.map((p) => {
      const s = h.states[p.entity], home = s.state === "home", nm = p.name || s.attributes.friendly_name || p.entity, pic = s.attributes.entity_picture;
      const where = home ? "zu Hause" : s.state === "not_home" ? "unterwegs" : s.state;
      return `<button class="pp ${home ? "home" : "away"}" data-e="${this._esc(p.entity)}" title="${this._esc(nm + " · " + where)}">${pic ? `<img src="${this._esc(h.hassUrl ? h.hassUrl(pic) : pic)}" alt="">` : `<span>${this._esc(nm.slice(0, 1).toUpperCase())}</span>`}<i>${this._esc(nm.split(" ")[0])}</i></button>`;
    }).join("");
    box.querySelectorAll(".pp").forEach((b) => b.addEventListener("click", () => this._moreInfo(b.dataset.e)));
  }
  _personArea(p) {
    const h = this._hass, ps = h.states[p.entity]; if (!ps || ps.state !== "home" || !p.room) return null;
    const rs = h.states[p.room]; if (!rs) return null;
    const v = String(rs.state).toLowerCase();
    return this._m.areas.find((a) => [a.id, a.ha_area, a.name].filter(Boolean).some((x) => String(x).toLowerCase() === v)) || null;
  }
  _personPins2d(g, bind) {
    this._personList().filter((p) => p.room).forEach((p, i) => {
      const pg = el("g", { class: "ppin" }, g), r = 15 * this._unit, nm = p.name || this._hass.states[p.entity].attributes.friendly_name || "?";
      el("circle", { r, class: "ppd" }, pg); el("text", { y: r * 0.38, "font-size": r * 1.05, class: "ppt" }, pg).textContent = nm.slice(0, 1).toUpperCase();
      const upd = () => { const a = this._personArea(p); pg.style.display = a ? "" : "none"; if (!a) return; const c = a.label || centroid(a.points), q = this._P(c[0] + 40 + i * 34, c[1] - 20); pg.setAttribute("transform", `translate(${q[0]} ${q[1]})`); };
      bind(p.entity, upd); bind(p.room, upd);
      pg.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(p.entity); });
    });
  }
  _personPins3d(lblLayer, bind) {
    const v = this._v3, THREE = v.THREE;
    this._personList().filter((p) => p.room).forEach((p, i) => {
      const d = document.createElement("div"), nm = p.name || this._hass.states[p.entity].attributes.friendly_name || "?";
      d.className = "pp3"; d.textContent = nm.slice(0, 1).toUpperCase(); lblLayer.appendChild(d);
      const lb = { el: d, pos: new THREE.Vector3(), hide: true }; v.labels.push(lb);
      const upd = () => { const a = this._personArea(p); lb.hide = !a; if (a) { const c = a.label || centroid(a.points); lb.pos.set(c[0] + 40 + i * 34, 120, c[1] - 20); } };
      bind(p.entity, upd); bind(p.room, upd);
    });
  }
  /* ---------- mmWave (Zielpositionen) ---------- */
  _mmTargets(it) { return [].concat(it.targets || []).map((t) => (typeof t === "string" ? { x: t.split(",")[0].trim(), y: (t.split(",")[1] || "").trim() } : t)).filter((t) => t.x && t.y); }
  _mmPos(it, xs, ys) {
    const sx = xs && parseFloat(xs.state), sy = ys && parseFloat(ys.state);
    if (isNaN(sx) || isNaN(sy) || (sx === 0 && sy === 0)) return null;
    const k = it.unit === "cm" ? 1 : it.unit === "m" ? 100 : 0.1, a = rad(it.angle || 0), lx = (it.mirror ? -sx : sx) * k, ly = sy * k;
    return [it.x + Math.cos(a) * ly - Math.sin(a) * lx, it.y + Math.sin(a) * ly + Math.cos(a) * lx];
  }
  _drawMmwave(g, it, bind, fovG) {
    const a = rad(it.angle || 0), f = rad(it.fov || 120), R = it.range || 600, pts = [[it.x, it.y]];
    for (let k = 0; k <= 16; k++) { const t = a - f / 2 + (f * k) / 16; pts.push([it.x + Math.cos(t) * R, it.y + Math.sin(t) * R]); }
    const wedge = el("polygon", { points: pts.map((q) => q.join(",")).join(" "), class: "mmw" }, fovG);
    const P = this._P, [sx, sy] = P(it.x, it.y), u = this._unit * (this._config.icon_scale || 1);
    const sg = el("g", { class: "item mmdev", transform: `translate(${sx} ${sy})` }, g);
    el("circle", { r: 8 * u, class: "disc" }, sg); el("text", { "font-size": 9 * u, y: 3 * u, class: "emo" }, sg).textContent = "📡";
    sg.addEventListener("click", (ev) => { ev.stopPropagation(); if (it.entity) this._moreInfo(it.entity); });
    if (it.entity) bind(it.entity, (st) => wedge.classList.toggle("on", !!st && ON_STATES.includes(st.state)));
    this._mmTargets(it).forEach((t, i) => {
      const dot = el("circle", { r: 13, class: "mmt" }, fovG);
      const upd = () => { const p = this._mmPos(it, this._hass.states[t.x], this._hass.states[t.y]); dot.style.display = p ? "" : "none"; if (p) { dot.setAttribute("cx", p[0]); dot.setAttribute("cy", p[1]); } };
      bind(t.x, upd); bind(t.y, upd);
    });
  }
  _mmwave3d(it, bind) {
    const v = this._v3, THREE = v.THREE, a = rad(it.angle || 0), f = rad(it.fov || 120), R = it.range || 600;
    const sh = new THREE.Shape(); sh.moveTo(it.x, it.y); for (let k = 0; k <= 16; k++) { const t = a - f / 2 + (f * k) / 16; sh.lineTo(it.x + Math.cos(t) * R, it.y + Math.sin(t) * R); }
    const geo = new THREE.ShapeGeometry(sh); geo.rotateX(Math.PI / 2);
    const wm = new THREE.MeshBasicMaterial({ color: 0x5ec2a0, transparent: true, opacity: v.fx ? 0.05 : 0.08, depthWrite: false, side: THREE.DoubleSide });
    const w = new THREE.Mesh(geo, wm); w.position.y = 2.2; w.renderOrder = 2; v.scene.add(w);
    const mat = new THREE.MeshLambertMaterial({ color: 0x5ec2a0, emissive: 0x1f6b52, transparent: true, opacity: 0.85 });
    this._mmTargets(it).forEach((t) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(14, 120, 4, 10), mat); m.visible = false; v.scene.add(m);
      const upd = () => { const p = this._mmPos(it, this._hass.states[t.x], this._hass.states[t.y]); m.visible = !!p; if (p) m.position.set(p[0], 74, p[1]); };
      bind(t.x, upd); bind(t.y, upd);
    });
  }
  /* ---------- Mehrere Messwerte an einem Symbol ---------- */
  _valList(it) { return [].concat(it.values || []).map((x) => (typeof x === "string" ? { entity: x } : x)).filter((x) => x.entity); }
  _valText(it) {
    return this._valList(it).map((x) => { const s = this._hass.states[x.entity]; return (x.label ? x.label + " " : "") + (s ? this._fmt(s) : "–"); }).join(" · ");
  }
  _drawValues(g, it, bind) {
    const P = this._P, [sx, sy] = P(it.x, it.y), u = this._unit * (this._config.icon_scale || 1), vl = this._valList(it); if (!vl.length && it.display !== "sensor") return;
    const grp = el("g", { class: "vals" + (it.display === "sensor" ? " sensor" : ""), transform: `translate(${sx} ${sy})` }, g);
    if (it.display === "sensor") { el("circle", { r: 11 * u, class: "disc" }, grp); el("text", { "font-size": 11 * u, y: 3.8 * u, class: "emo" }, grp).textContent = it.icon || "🌡️"; }
    const off = it.display === "sensor" ? 22 * u : 26 * u;
    const bg = el("rect", { y: off - 9 * u, height: 17 * u, rx: 8.5 * u, class: "vbg" }, grp);
    const tx = el("text", { y: off + 3.6 * u, "font-size": 11 * u, class: "vtx" }, grp);
    const upd = () => { tx.textContent = this._valText(it); const w = Math.max(30 * u, tx.textContent.length * 6.2 * u + 14 * u); bg.setAttribute("x", -w / 2); bg.setAttribute("width", w); };
    vl.forEach((x) => bind(x.entity, upd)); upd();
    grp.addEventListener("click", (ev) => { ev.stopPropagation(); const e = (vl[0] || {}).entity || it.entity; if (e) this._moreInfo(e); });
  }
  _values3d(it, lblLayer, bind) {
    const v = this._v3, THREE = v.THREE, vl = this._valList(it); if (!vl.length) return;
    const d = document.createElement("div"); d.className = "val3"; lblLayer.appendChild(d);
    v.labels.push({ el: d, pos: new THREE.Vector3(it.x, (it.z ?? (it.display === "sensor" ? 120 : this._itemH(it, this._m, v.H3))) - 18, it.y) });
    const upd = () => (d.textContent = (it.display === "sensor" ? (it.icon || "🌡️") + " " : "") + this._valText(it));
    vl.forEach((x) => bind(x.entity, upd));
    d.addEventListener("click", () => this._moreInfo(vl[0].entity));
  }
  /* ---------- Warnungen (Rauch, Gas, Wasser, CO) ---------- */
  _alarmOn(st) { return !!st && ["on", "detected", "wet", "smoke", "gas", "problem", "triggered"].includes(st.state); }
  _alarmArea(it) { return this._m.areas.find((a) => !a.outdoor && pointInPoly(it.x, it.y, a.points)) || this._m.areas.find((a) => pointInPoly(it.x, it.y, a.points)); }
  _alarmSet(it, on) {
    this._alarms = this._alarms || {}; const k = it.entity + "|" + it.x + "|" + it.y;
    if (on) this._alarms[k] = it; else delete this._alarms[k];
    const bar = this._root.querySelector(".alarmbar"), l = Object.values(this._alarms);
    bar.hidden = !l.length;
    if (l.length) {
      bar.innerHTML = l.map((x) => { const A = ALARM[x.kind] || ALARM.smoke, ar = this._alarmArea(x); return `<span>${A.i} ${A.n}${ar ? " – " + this._esc(ar.name) : ""}!</span>`; }).join("");
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }
  _drawAlarm(g, it, bind, heatG) {
    const A = ALARM[it.kind] || ALARM.smoke, P = this._P, [sx, sy] = P(it.x, it.y), u = this._unit * (this._config.icon_scale || 1), ar = this._alarmArea(it);
    const zone = ar ? el("polygon", { points: ar.points.map((q) => q.join(",")).join(" "), class: "alarmz" }, heatG) : null;
    const grp = el("g", { class: "item alarm", transform: `translate(${sx} ${sy})` }, g);
    el("circle", { r: 13 * u * 1.9, class: "touch" }, grp);
    const ic = el("g", { class: "ic" }, grp); el("circle", { r: 13 * u, class: "disc" }, ic); el("text", { "font-size": 13 * u, y: 4.5 * u, class: "emo" }, ic).textContent = A.i;
    grp.addEventListener("click", (ev) => { ev.stopPropagation(); if (it.entity) this._moreInfo(it.entity); });
    bind(it.entity, (st) => { const on = this._alarmOn(st); grp.classList.toggle("on", on); grp.classList.toggle("offline", !st || OFF_STATES.includes(st.state)); if (zone) zone.classList.toggle("on", on); this._alarmSet(it, on); });
  }
  _alarm3d(it, bind) {
    const v = this._v3, THREE = v.THREE, A = ALARM[it.kind] || ALARM.smoke, ar = this._alarmArea(it), z = it.z ?? (A === ALARM.water ? 10 : v.H3 + 10);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._emojiTex(A.i), transparent: true, depthTest: false, sizeAttenuation: false }));
    sp.position.set(it.x, z, it.y); sp.renderOrder = 11; sp.userData = { kind: "entity", entity: it.entity, px: 24 * (this._config.icon_scale || 1) }; v.scene.add(sp); (v.dsprites = v.dsprites || []).push(sp); v.hits.push(sp);
    let zone = null;
    if (ar) { const s = new THREE.Shape(); ar.points.forEach((q, i) => (i ? s.lineTo(q[0], q[1]) : s.moveTo(q[0], q[1]))); const geo = new THREE.ShapeGeometry(s); geo.rotateX(Math.PI / 2); zone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); zone.position.y = 3; zone.renderOrder = 3; v.scene.add(zone); }
    const al = { zone, sp, on: false }; (v.alarms = v.alarms || []).push(al);
    bind(it.entity, (st) => { al.on = this._alarmOn(st); sp.userData.calm = this._calm && !al.on; if (!al.on && zone) zone.material.opacity = 0; this._alarmSet(it, al.on); this._alarmsActive(); });
  }
  _alarmsActive() {
    const v = this._v3; if (!v || !v.alarms || v.alarmRaf || !v.alarms.some((a) => a.on)) return;
    const loop = (t) => { if (this._v3 !== v) return; const k = 0.5 + 0.5 * Math.sin(t / 220); let any = false; v.alarms.forEach((a) => { if (!a.on) return; any = true; if (a.zone) a.zone.material.opacity = 0.15 + 0.35 * k; a.sp.userData.px = 24 + 10 * k; }); this._render3d(); v.alarmRaf = any ? requestAnimationFrame(loop) : 0; };
    v.alarmRaf = requestAnimationFrame(loop);
  }
  /* ---------- Lampenschatten (echte Punktlichter mit Schatten) ---------- */
  _lampPool() {
    const v = this._v3, THREE = v.THREE, n = clamp(this._config.lamp_shadows ?? 2, 0, 6);
    v.lampPool = []; v.lampOn = {};
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 0, 2); l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.003; l.shadow.camera.near = 5; l.shadow.camera.far = 1200;
      l.position.set(0, -500, 0); v.scene.add(l); v.lampPool.push(l);
    }
  }
  _lampSet(it, z, on, col, br, idx) {
    const v = this._v3; if (!v || !v.lampPool || !v.lampPool.length) return;
    if (on) v.lampOn[idx] = { it, z, col, br }; else delete v.lampOn[idx];
    if (v.lampRaf) return;
    v.lampRaf = requestAnimationFrame(() => {
      v.lampRaf = 0; if (this._v3 !== v) return;
      const l = Object.values(v.lampOn).sort((a, b) => b.br - a.br);
      v.lampPool.forEach((pl, i) => {
        const x = l[i]; if (!x) { pl.intensity = 0; pl.position.set(0, -500, 0); return; }
        const t = x.it.light_type || "ceiling";
        pl.position.set(x.it.x, Math.min(x.z - (t === "lamp" ? 0 : 8), v.H3 + 20), x.it.y);
        pl.color.setRGB(x.col[0] / 255, x.col[1] / 255, x.col[2] / 255, v.THREE.SRGBColorSpace);
        pl.intensity = (this._config.lamp_power || 1) * 26000 * x.br * (t === "lamp" ? 0.55 : 1) * (v.dk ? 1 : 0.5);
      });
      this._req3d();
    });
  }
  /* ---------- Dach ---------- */
  _roofParts(m) {
    const cfg = this._config.roof || {};
    if (Array.isArray(cfg.parts) && cfg.parts.length) return cfg.parts.map((p) => (Array.isArray(p) ? { x0: +p[0], y0: +p[1], x1: +p[2], y1: +p[3], ridge: p[4] } : p));
    const ind = m.areas.filter((a) => !a.outdoor && !a.no_roof); if (!ind.length) return [];
    const xs = [...new Set(ind.flatMap((a) => a.points.map((q) => Math.round(q[0]))))].sort((a, b) => a - b), ys = [...new Set(ind.flatMap((a) => a.points.map((q) => Math.round(q[1]))))].sort((a, b) => a - b);
    const nx = xs.length - 1, ny = ys.length - 1, ins = [], cov = [];
    for (let j = 0; j < ny; j++) { ins.push([]); cov.push([]); for (let i = 0; i < nx; i++) { const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2; ins[j].push(ind.some((a) => pointInPoly(cx, cy, a.points))); cov[j].push(false); } }
    const ok = (i, j) => ins[j][i] && !cov[j][i], parts = [];
    for (let guard = 0; guard < 12; guard++) {
      let best = null;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        if (!ok(i, j)) continue;
        let iMax = i; while (iMax + 1 < nx && ok(iMax + 1, j)) iMax++;
        for (let i2 = i; i2 <= iMax; i2++) {
          let j2 = j; while (j2 + 1 < ny && [...Array(i2 - i + 1).keys()].every((d) => ok(i + d, j2 + 1))) j2++;
          const area = (xs[i2 + 1] - xs[i]) * (ys[j2 + 1] - ys[j]);
          if (!best || area > best.area) best = { i, j, i2, j2, area };
        }
      }
      if (!best || best.area < 40000) break;
      for (let j = best.j; j <= best.j2; j++) for (let i = best.i; i <= best.i2; i++) cov[j][i] = true;
      parts.push({ x0: xs[best.i], y0: ys[best.j], x1: xs[best.i2 + 1], y1: ys[best.j2 + 1] });
    }
    return parts;
  }
  _roof3d(m, RH, wallCol) {
    const v = this._v3, THREE = v.THREE, cfg = this._config.roof || {}, pitch = rad(cfg.pitch || 35), o = cfg.overhang ?? 30, tn = Math.tan(pitch);
    const tex = this._floorTex({ kind: "roof", color: cfg.color || "#3c4045", angle: 0, S: 1 });
    const rm = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }), gm = new THREE.MeshLambertMaterial({ color: wallCol, side: THREE.DoubleSide });
    this._roofParts(m).forEach((p) => {
      const W = p.x1 - p.x0, D = p.y1 - p.y0, alongX = p.ridge ? p.ridge === "x" : W >= D;
      const span = (alongX ? D : W) / 2, rh = RH + span * tn, eh = RH - o * tn;
      const pos = [], uv = [], S = FLOORS.roof.S, push = (a, b, c, ua, ub, uc) => { pos.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc); };
      const slope = Math.hypot(span + o, (span + o) * tn);
      if (alongX) {
        const ym = (p.y0 + p.y1) / 2, xa = p.x0 - o, xb = p.x1 + o, L = (xb - xa) / S, s = slope / S;
        const E1 = [xa, eh, p.y0 - o], E2 = [xb, eh, p.y0 - o], E3 = [xb, eh, p.y1 + o], E4 = [xa, eh, p.y1 + o], R1 = [xa, rh, ym], R2 = [xb, rh, ym];
        push(E1, E2, R2, [0, 0], [L, 0], [L, s]); push(E1, R2, R1, [0, 0], [L, s], [0, s]);
        push(E4, R1, R2, [0, 0], [0, s], [L, s]); push(E4, R2, E3, [0, 0], [L, s], [L, 0]);
      } else {
        const xm = (p.x0 + p.x1) / 2, ya = p.y0 - o, yb = p.y1 + o, L = (yb - ya) / S, s = slope / S;
        const E1 = [p.x0 - o, eh, ya], E2 = [p.x0 - o, eh, yb], E3 = [p.x1 + o, eh, yb], E4 = [p.x1 + o, eh, ya], R1 = [xm, rh, ya], R2 = [xm, rh, yb];
        push(E1, E2, R2, [0, 0], [L, 0], [L, s]); push(E1, R2, R1, [0, 0], [L, s], [0, s]);
        push(E4, R1, R2, [0, 0], [0, s], [L, s]); push(E4, R2, E3, [0, 0], [L, s], [L, 0]);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
      const roof = new THREE.Mesh(geo, rm); roof.castShadow = roof.receiveShadow = !!v.fx; v.scene.add(roof);
      // Giebeldreiecke
      const gp = [];
      if (alongX) { const ym = (p.y0 + p.y1) / 2; for (const x of [p.x0, p.x1]) gp.push(x, RH, p.y0, x, RH, p.y1, x, rh, ym); }
      else { const xm = (p.x0 + p.x1) / 2; for (const y of [p.y0, p.y1]) gp.push(p.x0, RH, y, p.x1, RH, y, xm, rh, y); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3)); gg.computeVertexNormals();
      const gable = new THREE.Mesh(gg, gm); gable.castShadow = !!v.fx; v.scene.add(gable);
    });
  }
  _roofUi() {
    const b = this._root.querySelector(".roofb");
    b.hidden = this._view !== "3d" || this._config.roof === false || !!this._config.edit3d;
    b.classList.toggle("on", !!this._roofOn); b.title = this._roofOn ? "Dach ausblenden" : "Dach zeigen";
  }
  /* ---------- Untergrund (Bild/SVG) in 3D ---------- */
  _bg3d() {
    const v = this._v3, THREE = v.THREE, bg = this._config.background; if (!bg || !bg.image || !bg.show_in_3d) return;
    new THREE.TextureLoader().load(bg.image, (tx) => {
      if (this._v3 !== v) return;
      if (THREE.SRGBColorSpace) tx.colorSpace = THREE.SRGBColorSpace;
      const w = bg.width || 1000, h = w * (tx.image.height / tx.image.width || 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: bg.opacity ?? 0.5, depthWrite: false }));
      m.position.set((bg.x || 0) + w / 2, 1.5, (bg.y || 0) + h / 2); m.renderOrder = 1; v.scene.add(m); v.shared.push(tx); this._req3d();
    });
  }
  /* ---------- Wandansicht (Möbel pro Wand) ---------- */
  _wallView(a) {
    const m = this._m, RH = this._config.room_height || 260, pts = a.points, edges = [];
    pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L >= 40) edges.push({ p, q, L }); });
    if (!edges.length) return `<div class="empty">Keine Wände.</div>`;
    const n0 = edges.length, k = (((this._wallI || 0) % n0) + n0) % n0, e = edges[k], u = [(e.q[0] - e.p[0]) / e.L, (e.q[1] - e.p[1]) / e.L];
    let nin = [-u[1], u[0]]; const mid = [(e.p[0] + e.q[0]) / 2, (e.p[1] + e.q[1]) / 2];
    if (!pointInPoly(mid[0] + nin[0] * 20, mid[1] + nin[1] * 20, pts)) nin = [-nin[0], -nin[1]];
    const d = [-nin[0], -nin[1]], r = [-d[1], d[0]], X = (pt) => (pt[0] - mid[0]) * r[0] + (pt[1] - mid[1]) * r[1] + e.L / 2, Y = (z) => RH - z;
    const dist = (pt) => (pt[0] - e.p[0]) * nin[0] + (pt[1] - e.p[1]) * nin[1];
    const along = (pt) => Math.abs((pt[0] - e.p[0]) * nin[1] - (pt[1] - e.p[1]) * nin[0]) >= 0;
    const wall = m.walls.find((w) => { const d1 = Math.abs((w.x1 - e.p[0]) * nin[0] + (w.y1 - e.p[1]) * nin[0] * 0 + (w.y1 - e.p[1]) * nin[1]), d2 = Math.abs((w.x2 - e.p[0]) * nin[0] + (w.y2 - e.p[1]) * nin[1]); return d1 < 8 && d2 < 8; });
    const fin = finishFor(wall, a), wcol = fin ? fin.col : this._dark ? "#d9d2c7" : "#efe9df";
    const parts = [`<rect x="0" y="0" width="${e.L}" height="${RH}" fill="${wcol}" class="wvw"/>`];
    if (fin && fin.kind === "brick") parts.push(`<rect x="0" y="0" width="${e.L}" height="${RH}" fill="url(#wvbrick)"/>`);
    // Öffnungen
    m.openings.forEach((o) => {
      const oa = rad(o.angle || 0), par = Math.abs(Math.abs(u[0] * Math.cos(oa) + u[1] * Math.sin(oa)) - 1) < 0.05;
      if (!par || Math.abs(dist([o.x, o.y])) > 10) return;
      const cx = X([o.x, o.y]); if (cx < -10 || cx > e.L + 10) return;
      const z0 = o.type === "window" ? (o.sill ?? 0.3) * RH : 0, z1 = o.type === "window" ? RH * 0.9 : o.sash === "double" ? RH * 0.84 : RH * 0.75;
      parts.push(`<rect x="${cx - o.length / 2}" y="${Y(z1)}" width="${o.length}" height="${z1 - z0}" class="${o.type === "window" || o.glazed ? "wvg" : "wvd"}"/>`);
    });
    // Wandobjekte
    m.items.filter((it) => WALL_ITEMS.includes(it.display) && Math.abs(dist([it.x, it.y])) < 22).forEach((it) => {
      const cx = X([it.x, it.y]); if (cx < 0 || cx > e.L) return;
      if (it.display === "radiator") { const L = it.length || 100, H = it.height || 60, z = it.z ?? 15; parts.push(`<rect x="${cx - L / 2}" y="${Y(z + H)}" width="${L}" height="${H}" class="wvr"/>`); }
      else { const z = it.z ?? 30, w = it.count === 2 ? 16 : 8.5; parts.push(`<rect x="${cx - w / 2}" y="${Y(z + 4.5)}" width="${w}" height="9" rx="1.5" class="wvs"/>`); }
    });
    // Möbel vor der Wand (hinten zuerst)
    const furn = [];
    m.furniture.forEach((f) => {
      if (["rug", "pillar", "stairs"].includes(f.type) || !pointInPoly(f.x, f.y, pts)) return;
      const ar = rad(f.angle || 0), cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [f.x + Math.cos(ar) * sx * f.w / 2 - Math.sin(ar) * sy * f.h / 2, f.y + Math.sin(ar) * sx * f.w / 2 + Math.cos(ar) * sy * f.h / 2]);
      const dmin = Math.min(...cs.map(dist)); if (dmin > 35) return;
      const xs = cs.map(X), x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(e.L, Math.max(...xs)); if (x1 - x0 < 3) return;
      const c = catOf(f), H = f.type === "plant" ? 40 + f.w : f.type === "bed" ? 50 : furnHeight(f), z = furnZ(f), pal = FCOL[this._dark ? "dark" : "light"];
      const col = "#" + ((c ? pal[c.p[0][7]] ?? pal.cab : f.type === "plant" ? 0x4f8a45 : pal.cab).toString(16).padStart(6, "0"));
      const nm = (c && c.n) || (CAT_SPECIAL[f.type] || [f.name || f.type])[0];
      furn.push({ dmin, s: `<g class="wvf"><rect x="${x0}" y="${Y(Math.min(RH, z + H))}" width="${x1 - x0}" height="${Math.min(RH, z + H) - z}" rx="2" fill="${col}"/><text x="${(x0 + x1) / 2}" y="${Y(z + Math.min(H, RH - z) / 2) + 4}">${this._esc(f.name || nm)}</text></g>` });
    });
    furn.sort((p, q) => q.dmin - p.dmin).forEach((f) => parts.push(f.s));
    parts.push(`<line x1="-15" y1="${RH}" x2="${e.L + 15}" y2="${RH}" class="wvfl"/><text x="${e.L / 2}" y="${RH + 26}" class="wvl">${Math.round(e.L)} cm</text>`);
    const bp = fin && fin.kind === "brick" ? `<defs><pattern id="wvbrick" patternUnits="userSpaceOnUse" width="96" height="96"><image href="${floorUrl("brick", fin.col, 1)}" width="96" height="96" preserveAspectRatio="none"/></pattern></defs>` : "";
    return `<div class="wvh"><button class="wvp">‹</button><span>Wand ${k + 1} von ${n0}</span><button class="wvn">›</button></div>
      <svg class="wvsvg" viewBox="-20 -10 ${e.L + 40} ${RH + 45}">${bp}${parts.join("")}</svg>
      <p class="wvi">Blick aus dem Raum auf die Wand. Möbel bis 35 cm vor der Wand.</p>`;
  }
  /* ---------- Grafik: Böden, Wandfarben, Sonne, Himmel, Schatten, Leuchtschein ---------- */
  _floor2d(defs, poly, a, idx) {
    if (this._pixel()) {
      const f = floorOf(a, false, true) || { kind: a.outdoor ? "grass" : "plain", color: a.outdoor ? "#6aa84f" : "#d8cdb8", angle: 0 };
      const id = `jg-fl-${idx}`, pt = el("pattern", { id, patternUnits: "userSpaceOnUse", width: PX_S, height: PX_S, ...(f.angle ? { patternTransform: `rotate(${f.angle})` } : {}) }, defs);
      el("image", { href: pixelUrl(f.kind, f.color), width: PX_S, height: PX_S, preserveAspectRatio: "none", class: "pxi" }, pt);
      poly.style.fill = `url(#${id})`; return;
    }
    const f = floorOf(a, this._dark); if (!f) return;
    const id = `jg-fl-${idx}`;
    const pt = el("pattern", { id, patternUnits: "userSpaceOnUse", width: f.S, height: f.S, ...(f.angle ? { patternTransform: `rotate(${f.angle})` } : {}) }, defs);
    el("image", { href: floorUrl(f.kind, f.color, this._dark && !f.outDefault ? 0.5 : 1), width: f.S, height: f.S, preserveAspectRatio: "none" }, pt);
    poly.style.fill = `url(#${id})`;
  }
  _floorTex(f) {
    const v = this._v3, THREE = v.THREE, px = this._pixel(), key = f.kind + f.color + f.angle + "|" + f.S + (px ? "px" : "");
    v.ftex = v.ftex || {}; if (v.ftex[key]) return v.ftex[key];
    const t = new THREE.CanvasTexture(px ? pixelTile(f.kind, f.color) : floorCanvas(f.kind, f.color));
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    const S = px && f.S !== 1 ? PX_S : f.S;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / S, 1 / S); t.rotation = rad(f.angle || 0);
    if (px) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
    else t.anisotropy = Math.min(8, v.renderer.capabilities.getMaxAnisotropy ? v.renderer.capabilities.getMaxAnisotropy() : 1);
    t._shared = true; v.shared.push(t);
    return (v.ftex[key] = t);
  }
  // Abschnitte entlang einer Wandseite p→q (Normale n zeigt in den Raum) mit Wandfarbe des Raums dort
  _paintRuns(p, q, n, rooms, w) {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 2) return [];
    const u = [(q[0] - p[0]) / L, (q[1] - p[1]) / L], N = Math.max(1, Math.ceil(L / 10)), runs = [];
    let cur = null;
    for (let k = 0; k < N; k++) {
      const s = ((k + 0.5) * L) / N, x = p[0] + u[0] * s + n[0] * 8, y = p[1] + u[1] * s + n[1] * 8;
      const r = rooms.find((a) => pointInPoly(x, y, a.points)), fin = r ? finishFor(w, r) : null, key = fin ? fin.kind + fin.col : null;
      if (cur && cur.key === key) cur.s1 = ((k + 1) * L) / N; else { cur = { key, fin, s0: (k * L) / N, s1: ((k + 1) * L) / N }; runs.push(cur); }
    }
    return runs.filter((r) => r.fin).map((r) => ({ col: r.fin.col, kind: r.fin.kind, a: [p[0] + u[0] * r.s0, p[1] + u[1] * r.s0], b: [p[0] + u[0] * r.s1, p[1] + u[1] * r.s1], len: r.s1 - r.s0 }));
  }
  // beide Längsseiten eines Wandstücks (Rechteck aus _rectBox) mit nach außen zeigender Normale
  _wallSides(b) {
    const c = [(b.pts[0][0] + b.pts[2][0]) / 2, (b.pts[0][1] + b.pts[2][1]) / 2];
    return [[0, 1], [2, 3]].map(([i, j]) => {
      const p = b.pts[i], q = b.pts[j], mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], d = Math.hypot(mid[0] - c[0], mid[1] - c[1]) || 1;
      return { p, q, n: [(mid[0] - c[0]) / d, (mid[1] - c[1]) / d] };
    });
  }
  _paint3d(mesh, b, z0, z1, rooms) {
    const v = this._v3, THREE = v.THREE, out = [];
    this._wallSides(b).forEach((sd) => this._paintRuns(sd.p, sd.q, sd.n, rooms, b.src).forEach((r) => {
      if (r.len < 2) return;
      const geo = new THREE.PlaneGeometry(r.len, z1 - z0);
      let mat;
      if (r.kind === "brick") {
        const S = FLOORS.brick.S, uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * r.len) / S, (uv.getY(i) * (z1 - z0) + z0) / S);
        mat = new THREE.MeshLambertMaterial({ map: this._floorTex({ kind: "brick", color: r.col, angle: 0, S: 1 }) });
      } else mat = new THREE.MeshLambertMaterial({ color: r.col });
      const pl = new THREE.Mesh(geo, mat);
      pl.position.set((r.a[0] + r.b[0]) / 2 + sd.n[0] * 0.6, (z0 + z1) / 2, (r.a[1] + r.b[1]) / 2 + sd.n[1] * 0.6);
      pl.rotation.y = Math.atan2(sd.n[0], sd.n[1]); pl.userData.noCast = true;
      v.scene.add(pl); out.push(mat);
    }));
    if (out.length) mesh.userData.paint = out;
  }
  _sunInfo() {
    const sun = this._hass.states["sun.sun"]; if (!sun || sun.attributes.azimuth == null) return null;
    const c = this._config, north = c.north ?? (c.weather && c.weather.north) ?? 0;
    const e = sun.attributes.elevation || 0, az = rad((sun.attributes.azimuth || 0) - north), el2 = rad(Math.max(e, -10));
    return { e, dir: [Math.sin(az) * Math.cos(el2), Math.max(Math.sin(el2), 0.05), -Math.cos(az) * Math.cos(el2)], up: e > 0.5, night: sun.state === "below_horizon" };
  }
  _overcast() {
    const s2 = this._wxState(); if (!s2) return 0;
    if (s2.cond === "partlycloudy") return 0.3;
    return { cloud: 0.6, rain: 0.8, storm: 0.85, snow: 0.7, fog: 0.85 }[s2.cat] || 0;
  }
  // Sonnenstand → Richtungslicht (Richtung, Farbe, Stärke), Schatten nur bei sichtbarer Sonne
  _sun3d(ob) {
    const v = this._v3, si = this._sunInfo(); if (!si) return;
    const cx = (ob.x0 + ob.x1) / 2, cz = (ob.z0 + ob.z1) / 2, D = 6000, oc = this._overcast();
    v.dir.position.set(cx + si.dir[0] * D, si.dir[1] * D, cz + si.dir[2] * D);
    v.dir.target.position.set(cx, 0, cz); v.scene.add(v.dir.target);
    if (si.night) { v.dir.color.set(0x9fb4ff); v.dir.intensity *= 0.35; v.hemi.intensity *= 0.75; }
    else if (si.e < 12) v.dir.color.set(0xffc98a);
    if (!si.night) v.dir.intensity *= clamp(Math.sin(rad(Math.max(si.e, 0))) * 1.6 + 0.35, 0.35, 1.2) * (1 - oc * 0.6);
    v.sunUp = si.up && oc < 0.55;
  }
  _shadows3d(ob) {
    const v = this._v3, THREE = v.THREE, r = v.renderer, d = v.dir;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    d.castShadow = !!v.sunUp; d.shadow.mapSize.set(2048, 2048);
    const half = Math.hypot(ob.x1 - ob.x0, ob.z1 - ob.z0) / 2 + 100, cam = d.shadow.camera;
    Object.assign(cam, { left: -half, right: half, top: half, bottom: -half, near: 100, far: 13000 }); cam.updateProjectionMatrix();
    d.shadow.bias = -0.0004; d.shadow.normalBias = 1.5; d.shadow.radius = 2.5;
    // im Schatten etwas weniger Grundlicht, Sonne dafür kräftiger → sichtbare Schatten
    if (v.sunUp) { v.hemi.intensity *= 0.82; d.intensity *= 1.35; }
    v.scene.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mt = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!(mt.isMeshLambertMaterial || mt.isMeshStandardMaterial || mt.isMeshToonMaterial)) return;
      if (o.userData.noCast && !mt.isMeshStandardMaterial && !mt.isMeshLambertMaterial && !mt.isMeshToonMaterial) return;
      o.receiveShadow = true;
      const k = o.userData && o.userData.kind;
      if (k === "room" || k === "ground" || o.userData.noCast || (mt.transparent && mt.opacity < 0.6)) return;
      o.castShadow = true;
    });
  }
  _skyColors() {
    const si = this._sunInfo(), e = si ? si.e : 30, oc = this._overcast();
    const K = [[-90, "#03050c", "#0b1020"], [-18, "#04070f", "#0e1424"], [-10, "#0c1430", "#2b2b4a"], [-4, "#1c2a58", "#8a5560"], [0, "#2d4680", "#e08a5a"], [6, "#3d68a8", "#f2b47a"], [15, "#3a78c8", "#c3dcef"], [90, "#2a66c0", "#a8cbec"]];
    let i = 0; while (i < K.length - 2 && e > K[i + 1][0]) i++;
    const t = clamp((e - K[i][0]) / (K[i + 1][0] - K[i][0]), 0, 1), mix = (a, b, f) => hexRgb(a).map((x, j) => x + (hexRgb(b)[j] - x) * f);
    let top = mix(K[i][1], K[i + 1][1], t), hor = mix(K[i][2], K[i + 1][2], t);
    const day = clamp((e + 6) / 12, 0, 1), gT = mix("#0b0d12", "#7d8893", day), gH = mix("#1a1d24", "#b6bec5", day);
    top = top.map((x, j) => x + (gT[j] - x) * oc); hor = hor.map((x, j) => x + (gH[j] - x) * oc);
    const dim = 1;
    return { top: rgbHex(top.map((x) => x * dim)), hor: rgbHex(hor.map((x) => x * dim)), e, oc, si };
  }
  // Himmel mit Farbverlauf nach Sonnenstand/Wetter, Sterne nachts, Boden bis zum Horizont
  _sky3d(ob) {
    const v = this._v3, THREE = v.THREE, sc = this._skyColors();
    const sunDir = sc.si ? new THREE.Vector3(...sc.si.dir).normalize() : new THREE.Vector3(0, 1, 0);
    const sunVis = sc.si ? clamp((sc.e + 3) / 6, 0, 1) * (1 - sc.oc * 0.9) : 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(sc.top) }, hor: { value: new THREE.Color(sc.hor) }, sd: { value: sunDir }, sv: { value: sunVis }, sc: { value: new THREE.Color(sc.e < 8 ? 0xffb070 : 0xfff2d6) } },
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 top, hor, sc, sd; uniform float sv; varying vec3 vP;
        void main(){ vec3 d = normalize(vP); float y = d.y;
          vec3 c = y > 0.0 ? mix(hor, top, pow(clamp(y, 0.0, 1.0), 0.55)) : hor;
          float s = max(dot(d, sd), 0.0); c += sc * sv * (pow(s, 900.0) * 6.0 + pow(s, 40.0) * 0.35 + pow(s, 6.0) * 0.12);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(12000, 40, 20), mat); sky.renderOrder = -10; sky.frustumCulled = false; sky.userData.noCast = true;
    v.scene.add(sky); v.sky = sky;
    const stars = clamp((-sc.e - 6) / 8, 0, 1) * (1 - sc.oc);
    if (stars > 0.05) {
      const R = seeded("sterne"), N = 900, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const a = R() * Math.PI * 2, y = 0.08 + R() * 0.92, r = Math.sqrt(1 - y * y); pos.set([Math.cos(a) * r * 11000, y * 11000, Math.sin(a) * r * 11000], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const st = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85 * stars, depthWrite: false, fog: false }));
      st.renderOrder = -9; st.frustumCulled = false; sky.add(st);
    }
    // Boden bis zum Horizont (folgt der Kamera), Übergang per Nebel in die Horizontfarbe
    const gcol = v.dk ? 0x1f261b : 0x9aa88a;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(11500, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: gcol }));
    ground.position.y = -3.5; ground.userData.kind = "ground"; v.scene.add(ground); v.farGround = ground;
    if (!v.scene.fog) { v.scene.fog = new THREE.Fog(new THREE.Color(sc.hor), 4000, 12000); v.skyFog = Math.hypot(ob.x1 - ob.x0, ob.z1 - ob.z0) / 2; }
  }
  // Fenster (und Glastüren) glimmen nachts warm, wenn im Raum dahinter Licht an ist
  _windowGlow3d(m, bind) {
    const v = this._v3, si = this._sunInfo(); if (!si || si.e > 3) return;
    const lights = m.items.filter((it) => !it.display && ["light", "switch"].includes((it.entity || "").split(".")[0]));
    m.openings.filter((o) => o._glassMat).forEach((o) => {
      const a = rad(o.angle || 0), nx = -Math.sin(a), ny = Math.cos(a);
      const rooms = [1, -1].map((k) => m.areas.find((ar) => !ar.outdoor && pointInPoly(o.x + nx * 40 * k, o.y + ny * 40 * k, ar.points))).filter(Boolean);
      const ls = lights.filter((it) => rooms.some((r) => pointInPoly(it.x, it.y, r.points))).map((it) => it.entity);
      if (!ls.length) return;
      const mat = o._glassMat, base = mat.opacity, k = v.fx ? 0.75 : 0.55;
      const upd = () => { const on = ls.some((e) => { const s = this._hass.states[e]; return !!s && s.state === "on"; }); mat.emissive.set(on ? 0xffb35c : 0x000000); mat.emissiveIntensity = on ? k : 1; mat.opacity = on ? Math.max(base, 0.42) : base; };
      ls.forEach((e) => bind(e, upd));
    });
  }
  // Leuchtschein: eigener Bloom (Szene in HDR-Puffer, helle Teile weichzeichnen, aufaddieren) + Farbabstimmung
  _fxInit() {
    const v = this._v3, THREE = v.THREE, r = v.renderer, sz = r.getDrawingBufferSize(new THREE.Vector2());
    const mk = (w, h, o = {}) => new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type: THREE.HalfFloatType, depthBuffer: false, ...o });
    const fx = { rt: mk(sz.x, sz.y, { depthBuffer: true, samples: 4 }), lv: [] };
    for (let i = 1; i <= 3; i++) { const w = Math.round(sz.x / 2 ** i), h = Math.round(sz.y / 2 ** i); fx.lv.push({ a: mk(w, h), b: mk(w, h), w, h }); }
    const VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
    const sm = (fs, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false });
    fx.bright = sm("uniform sampler2D t; uniform float th; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(th, th + 0.45, l), 1.0); }", { t: { value: null }, th: { value: 0.82 } });
    fx.blur = sm("uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * 0.2270270270; c += (texture2D(t, vUv + d * 1.3846153846).rgb + texture2D(t, vUv - d * 1.3846153846).rgb) * 0.3162162162; c += (texture2D(t, vUv + d * 3.2307692308).rgb + texture2D(t, vUv - d * 3.2307692308).rgb) * 0.0702702703; gl_FragColor = vec4(c, 1.0); }", { t: { value: null }, d: { value: new THREE.Vector2() } });
    fx.comp = sm(`uniform sampler2D t; uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D b3; uniform float s; uniform float vig; varying vec2 vUv;
      void main(){ vec4 c = texture2D(t, vUv); vec3 b = texture2D(b1, vUv).rgb * 0.7 + texture2D(b2, vUv).rgb * 0.9 + texture2D(b3, vUv).rgb * 1.1;
        vec3 col = c.rgb + b * s; vec2 q = vUv - 0.5; col *= 1.0 - vig * dot(q, q) * 1.8;
        gl_FragColor = vec4(col, clamp(max(c.a, dot(b * s, vec3(0.4))), 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`, { t: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, s: { value: 0.85 }, vig: { value: 0.22 } });
    fx.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fx.bright); fx.quad.frustumCulled = false;
    fx.qs = new THREE.Scene(); fx.qs.add(fx.quad); fx.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    r.toneMapping = THREE[this._config.tone === "aces" ? "ACESFilmicToneMapping" : this._config.tone === "agx" ? "AgXToneMapping" : "NeutralToneMapping"] || THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = this._config.exposure || 1.05;
    v.fx = fx;
  }
  _fxRender() {
    const v = this._v3, r = v.renderer, fx = v.fx;
    const pass = (mat, target) => { fx.quad.material = mat; r.setRenderTarget(target); r.render(fx.qs, fx.cam); };
    r.setRenderTarget(fx.rt); r.render(v.scene, v.camera);
    fx.bright.uniforms.t.value = fx.rt.texture; pass(fx.bright, fx.lv[0].a);
    let src = fx.lv[0].a.texture;
    fx.lv.forEach((L) => {
      fx.blur.uniforms.t.value = src; fx.blur.uniforms.d.value.set(1 / L.w, 0); pass(fx.blur, L.b);
      fx.blur.uniforms.t.value = L.b.texture; fx.blur.uniforms.d.value.set(0, 1 / L.h); pass(fx.blur, L.a);
      src = L.a.texture;
    });
    const u = fx.comp.uniforms; u.t.value = fx.rt.texture; u.b1.value = fx.lv[0].a.texture; u.b2.value = fx.lv[1].a.texture; u.b3.value = fx.lv[2].a.texture;
    pass(fx.comp, null);
  }
  _fxDispose(v) {
    const fx = v.fx; if (!fx) return;
    fx.rt.dispose(); fx.lv.forEach((L) => { L.a.dispose(); L.b.dispose(); });
    [fx.bright, fx.blur, fx.comp].forEach((m) => m.dispose()); fx.quad.geometry.dispose();
  }
  /* ---------- Zeitreise ---------- */
  _ttUi() {
    const b = this._root.querySelector(".ttb"), c = this._config.timetravel;
    b.hidden = c === false || !!this._config.edit3d; b.classList.toggle("on", !!this._tt);
  }
  _ttToggle() { if (this._tt) this._ttExit(); else this._ttOpen(); }
  _ttMaxDays() { const c = this._config.timetravel; return (c && c.max_days) || 7; }
  async _ttOpen(days) {
    const live = this._live || this._hass; if (!live || !live.callWS) return;
    days = Math.min(days || this._ttDays || 1, this._ttMaxDays()); this._ttDays = days;
    const tok = (this._ttTok = {}), box = this._root.querySelector(".tt"), lab = box.querySelector(".tlab");
    this._ttPause();
    box.hidden = false; lab.textContent = "Lade Verlauf …";
    box.querySelector(".tdays").textContent = days > 1 ? "7 Tage" : "24 h";
    box.querySelector(".tdays").hidden = this._ttMaxDays() <= 1;
    const end = Date.now(), start = end - days * 86400000;
    const ents = Object.keys(this._bind || {}).filter((e) => live.states[e]);
    const sens = ents.filter((e) => e.startsWith("sensor.")), rest = ents.filter((e) => !e.startsWith("sensor."));
    const q = (ids, min) => ids.length ? live.callWS({ type: "history/history_during_period", start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString(), entity_ids: ids, minimal_response: min, no_attributes: min, significant_changes_only: false }) : Promise.resolve({});
    let res;
    try { res = await Promise.all([q(rest, false), q(sens, true)]); } catch (e) { if (this._ttTok === tok) lab.textContent = "Verlauf nicht lesbar"; return; }
    if (this._ttTok !== tok) return;
    const hist = {}, marks = [], det = {};
    (this._m.items || []).filter((i) => i.display === "camera").forEach((i) => Object.entries(i.detect || {}).forEach(([k, e]) => (det[e] = k)));
    for (const r of res) for (const e in r) {
      const ls = live.states[e]; let a = ls ? ls.attributes : {}, prev = null;
      hist[e] = (r[e] || []).map((x) => {
        if (x.a) a = x.a;
        const t = (x.lu || x.lc) * 1000, lc = (x.lc || x.lu) * 1000;
        const o = { t, st: { entity_id: e, state: x.s, attributes: a, last_changed: new Date(lc).toISOString(), last_updated: new Date(t).toISOString() } };
        if (e.startsWith("binary_sensor.") && x.s === "on" && prev !== "on" && prev !== null) {
          const dc = a.device_class, k = det[e];
          const kind = k ? "det" : ["door", "window", "garage_door", "opening"].includes(dc) ? "door" : ["motion", "occupancy", "presence"].includes(dc) ? "motion" : null;
          if (kind) marks.push({ t, kind, icon: k ? DET_ICON[k] || "❗" : kind === "door" ? (dc === "window" ? "🪟" : "🚪") : "🏃", name: a.friendly_name || e });
        }
        prev = x.s;
        return o;
      });
    }
    this._tt = { start, end, hist, marks, fake: null };
    this._ttUi();
    const sl = box.querySelector(".tsl"); sl.min = start; sl.max = end; sl.step = 60000;
    const mk = box.querySelector(".ttm"), sorted = marks.sort((x, y) => x.t - y.t);
    const step = Math.max(1, Math.ceil(sorted.length / 400));
    mk.innerHTML = sorted.filter((_, i) => i % step === 0).map((x) => `<i class="k-${x.kind}" style="left:${((x.t - start) / (end - start)) * 100}%" data-t="${x.t}" title="${this._esc(x.icon + " " + x.name + " · " + this._ttFmt(x.t))}"></i>`).join("");
    this._ttSet(Math.max(start, (this._ttT && this._ttT > start && this._ttT < end) ? this._ttT : end - 3600000));
  }
  _ttFmt(t) { return new Date(t).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" }); }
  _ttStateAt(arr, T) {
    let lo = 0, hi = arr.length - 1, k = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (arr[mid].t <= T) { k = mid; lo = mid + 1; } else hi = mid - 1; }
    return arr[Math.max(k, 0)].st;
  }
  _ttSet(T) {
    const tt = this._tt; if (!tt) return;
    T = Math.max(tt.start, Math.min(tt.end, T)); this._ttT = T;
    const live = this._live, states = { ...live.states };
    for (const e in tt.hist) if (tt.hist[e].length) states[e] = this._ttStateAt(tt.hist[e], T);
    const fake = { ...live, states, callService: async () => { this._toastMsg("⏱ Zeitreise – zum Schalten auf „Live“ tippen"); } };
    this._hass = fake; tt.fake = fake;
    this._update();
    const box = this._root.querySelector(".tt");
    box.querySelector(".tsl").value = T;
    box.querySelector(".tlab").textContent = this._ttFmt(T) + " Uhr";
    const bd = this._root.querySelector(".ttbadge"); bd.hidden = false; bd.textContent = "⏱ Zeitreise · " + this._ttFmt(T);
  }
  _ttSpeeds() { return this._ttDays > 1 ? [600, 3600, 14400] : [60, 300, 1200]; }
  _ttSpLabel(s) { return s < 3600 ? `${s / 60} min/s` : `${s / 3600} h/s`; }
  _ttPlay() {
    const tt = this._tt; if (!tt) return;
    if (this._ttRaf) return this._ttPause();
    if (this._ttT >= tt.end - 60000) this._ttSet(tt.start);
    const sp = this._ttSpeeds()[this._ttSp || 0];
    this._root.querySelector(".tplay").textContent = "⏸";
    let last = performance.now(), acc = 0;
    const loop = (t) => {
      if (!this._tt) return;
      const dt = Math.min(t - last, 250); last = t; acc += dt;
      const sp2 = this._ttSpeeds()[this._ttSp || 0];
      if (acc >= 120) {
        const T = this._ttT + acc * sp2; acc = 0;
        this._ttSet(T);
        if (T >= this._tt.end) { this._ttPause(); return; }
      }
      this._ttRaf = requestAnimationFrame(loop);
    };
    this._ttRaf = requestAnimationFrame(loop);
  }
  _ttPause() { cancelAnimationFrame(this._ttRaf || 0); this._ttRaf = 0; const p = this._root && this._root.querySelector(".tplay"); if (p) p.textContent = "▶"; }
  _ttExit() {
    this._ttTok = null; this._ttPause();
    const was = !!this._tt; this._tt = null;
    this._root.querySelector(".tt").hidden = true; this._root.querySelector(".ttbadge").hidden = true;
    this._ttUi();
    if (was && this._live) { this._hass = this._live; this._update(true); }
  }
  /* ---------- Wetter ---------- */
  _wxCat(cond) { for (const k of ["storm", "rain", "snow", "fog", "cloud"]) if (WX[k].includes(cond)) return k; return "clear"; }
  _wxState() {
    const c = this._config.weather; if (!c) return null;
    const w = this._hass.states[c.entity || c]; if (!w) return null;
    const sun = this._hass.states[c.sun || "sun.sun"], night = sun ? sun.state === "below_horizon" : false;
    return { cond: w.state, cat: this._wxCat(w.state), storm: WX.storm.includes(w.state), night, temp: w.attributes.temperature, sun };
  }
  _wxBadge() {
    const box = this._root.querySelector(".wx"), s2 = this._wxState();
    box.hidden = !s2 || !!this._config.edit3d; if (!s2) return;
    const r = this._config.rain && this._config.rain.sensor && this._hass.states[this._config.rain.sensor], mm = r ? parseFloat(r.state) : NaN;
    const icon = s2.night && s2.cat === "clear" ? "🌙" : WX_ICON[s2.cond] || "🌡️";
    box.innerHTML = `<span class="wi">${icon}</span><b>${s2.temp != null ? Math.round(s2.temp) + "°" : ""}</b><span>${WX_DE[s2.cond] || s2.cond}${mm > 0 ? ` · ${mm.toLocaleString("de-DE", { maximumFractionDigits: 1 })} mm/h` : ""}</span>`;
  }
  // bei Wechsel der Wetterlage (oder Tag/Nacht) neu aufbauen, sonst nur Plakette
  _wxWatch(bind) {
    const c = this._config.weather; if (!c) return;
    const chk = () => {
      this._wxBadge();
      const s2 = this._wxState(), key = s2 ? s2.cat + (s2.night ? "n" : "d") : "";
      if (this._wxKey != null && key !== this._wxKey) { this._wxKey = key; setTimeout(() => this._build(), 0); return; }
      this._wxKey = key;
    };
    [c.entity || c, c.sun || "sun.sun", this._config.rain && this._config.rain.sensor].filter(Boolean).forEach((e) => bind(e, chk));
  }
  // 2D: Regen/Schnee/Nebel/Nacht über den Außenflächen
  _wx2d(m, defs, layer) {
    const s2 = this._wxState(); if (!s2) return;
    const outs = m.areas.filter((a) => a.outdoor); if (!outs.length) return;
    const cid = "jg-wx-clip", cp = el("clipPath", { id: cid, clipPathUnits: "userSpaceOnUse" }, defs);
    outs.forEach((a) => el("polygon", { points: a.points.map((q) => q.join(",")).join(" ") }, cp));
    const xs = outs.flatMap((a) => a.points.map((q) => q[0])), ys = outs.flatMap((a) => a.points.map((q) => q[1]));
    const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    const g = el("g", { "clip-path": `url(#${cid})`, class: "wxl" }, layer);
    if (s2.night) el("rect", { ...box, fill: "#0a1430", opacity: 0.35 }, g);
    else if (s2.cat === "clear") el("rect", { ...box, fill: "#ffd27a", opacity: 0.07 }, g);
    if (s2.cat === "cloud") el("rect", { ...box, fill: "#8899aa", opacity: 0.12 }, g);
    if (s2.cat === "rain" || s2.cat === "storm" || s2.cat === "snow") {
      const snow = s2.cat === "snow", pid = "jg-wx-p", pt = el("pattern", { id: pid, patternUnits: "userSpaceOnUse", width: snow ? 70 : 40, height: snow ? 70 : 90 }, defs);
      if (snow) [[10, 12], [45, 30], [25, 55], [60, 60]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 3.5, fill: "#fff", opacity: 0.8 }, pt));
      else [[8, 10], [28, 50]].forEach(([x, y]) => el("line", { x1: x, y1: y, x2: x - 6, y2: y + 26, stroke: "#9cc7ef", "stroke-width": 2.2, opacity: 0.75 }, pt));
      el("animateTransform", { attributeName: "patternTransform", type: "translate", from: "0 0", to: snow ? "-10 70" : "-12 90", dur: snow ? "2.4s" : "0.45s", repeatCount: "indefinite" }, pt);
      el("rect", { ...box, fill: `url(#${pid})` }, g);
    }
    if (s2.cat === "fog") el("rect", { ...box, fill: "#dfe6ea", class: "wxfog" }, g);
    if (s2.storm) el("rect", { ...box, fill: "#fff", class: "wxflash" }, g);
  }
  _wx3d(scene, ob) {
    const s2 = this._wxState(), v = this._v3, THREE = v.THREE; if (!s2) return;
    const c = this._config.weather, sun = s2.sun;
    if (s2.cat === "fog") scene.fog = new THREE.Fog(this._dark ? 0x2a2e33 : 0xd9dee2, v.radius * 0.6, v.radius * 2.2);
    if (s2.cat === "cloud" || s2.cat === "rain" || s2.cat === "storm") {
      const cm = new THREE.MeshLambertMaterial({ color: s2.cat === "cloud" ? 0xe8edf2 : 0x8a96a3, transparent: true, opacity: 0.28, depthWrite: false });
      for (let k = 0; k < 7; k++) { const cl = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), cm); cl.scale.set(380 + 200 * Math.random(), 60, 260); cl.position.set(ob.x0 + Math.random() * (ob.x1 - ob.x0), 620 + Math.random() * 120, ob.z0 + Math.random() * (ob.z1 - ob.z0)); scene.add(cl); }
    }
    if ((s2.cat === "rain" || s2.cat === "storm" || s2.cat === "snow") && !v.low) {
      const snow = s2.cat === "snow", N = snow ? 900 : 1400, pos = new Float32Array(N * (snow ? 3 : 6)), sp = [];
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      for (let i = 0; i < N; i++) sp.push([ob.x0 + Math.random() * (ob.x1 - ob.x0), Math.random() * 600, ob.z0 + Math.random() * (ob.z1 - ob.z0)]);
      const obj = snow ? new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 6, transparent: true, opacity: 0.85 })) : new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9cc7ef, transparent: true, opacity: 0.55 }));
      obj.frustumCulled = false; scene.add(obj);
      v.wx = { sp, pos, geo, snow, storm: s2.storm, flash: 0 };
      this._wxLoop();
    }
  }
  _wxLoop() {
    const v = this._v3; if (!v || !v.wx || v.wxRaf) return;
    const w = v.wx, base = v.hemi.intensity;
    let last = performance.now();
    const loop = (t) => {
      if (this._v3 !== v) return;
      const dt = Math.min((t - last) / 1000, 0.1); last = t;
      const vy = w.snow ? 60 : 900;
      w.sp.forEach((p, i) => {
        p[1] -= vy * dt; if (w.snow) p[0] += Math.sin(t / 900 + i) * 8 * dt;
        if (p[1] < 0) p[1] += 600;
        if (w.snow) { w.pos[i * 3] = p[0]; w.pos[i * 3 + 1] = p[1]; w.pos[i * 3 + 2] = p[2]; }
        else { const o = i * 6; w.pos[o] = p[0]; w.pos[o + 1] = p[1]; w.pos[o + 2] = p[2]; w.pos[o + 3] = p[0] - 4; w.pos[o + 4] = p[1] - 28; w.pos[o + 5] = p[2]; }
      });
      w.geo.attributes.position.needsUpdate = true;
      if (w.storm) { if (w.flash <= 0 && Math.random() < dt / 7) w.flash = 0.12; if (w.flash > 0) w.flash -= dt; v.hemi.intensity = base * (w.flash > 0 ? 3 : 1); }
      this._render3d();
      v.wxRaf = requestAnimationFrame(loop);
    };
    v.wxRaf = requestAnimationFrame(loop);
  }
  /* ---------- Live-Bildschirme ---------- */
  _appColor(st) {
    if (!st || TV_OFF.includes(st.state)) return null;
    const n = [st.attributes.app_name, st.attributes.source, st.attributes.media_title].filter(Boolean).join(" ").toLowerCase();
    for (const [k, c] of APP_COL) if (n.includes(k)) return c;
    return "#7fb0ff";
  }
  /* ---------- Car Pro ---------- */
  _carShow(it) { this._mediaClose(); this._carOpen = it; this._root.querySelector(".mpop").hidden = false; this._carSig = null; this._carRender(); }
  _carRender() {
    const it = this._carOpen; if (!it) return;
    const h = this._hass, c = this._carState(it), pop = this._root.querySelector(".mpop"), body = pop.querySelector(".mbody");
    const sw = it.power_switch && h.states[it.power_switch];
    const vals = [].concat(it.stats || []).map((x) => { const s3 = h.states[x.entity]; return { l: x.label || (s3 && s3.attributes.friendly_name) || x.entity, v: s3 ? this._fmt(s3) : "–", e: x.entity }; });
    const sig = JSON.stringify([c, sw && sw.state, vals.map((x) => x.v)]);
    if (sig === this._carSig) return; this._carSig = sig;
    pop.querySelector("b").textContent = it.name || "Auto";
    pop.querySelector(".cs").textContent = c.here ? (c.charging ? "lädt" : "steht da") : "nicht da";
    body.innerHTML = `<div class="carbig">${c.here ? "🚗" : "🅿️"}<div><div class="mt">${c.here ? (c.charging ? `⚡ ${c.kw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW` : "Steht im Carport") : "Stellplatz frei"}</div><div class="ma">${sw ? `Wallbox ${sw.state === "on" ? "freigegeben" : "gesperrt"}` : ""}</div></div></div>
      <div class="cstats">${vals.map((x) => `<div class="cst" data-e="${this._esc(x.e)}"><span>${this._esc(x.l)}</span><b>${this._esc(x.v)}</b></div>`).join("")}</div>
      ${sw ? `<button class="cbtn ${sw.state === "on" ? "on" : ""}">${sw.state === "on" ? "Laden sperren" : "Laden freigeben"}</button>` : ""}`;
    body.querySelectorAll(".cst").forEach((d) => d.addEventListener("click", () => this._moreInfo(d.dataset.e)));
    const b2 = body.querySelector(".cbtn"); if (b2) b2.addEventListener("click", () => { h.callService("homeassistant", "toggle", { entity_id: it.power_switch }); if (navigator.vibrate) navigator.vibrate(15); });
  }
  /* ---------- Energy Pro ---------- */
  // Verbraucher mit Leistungsmessung: Geräte-Items (W/kW), Auto-Ladeleistung, Möbel mit Leistungssensor, energy.devices
  _powerList(m) {
    const h = this._hass, isW = (e) => { const s2 = e && h.states[e]; const u = s2 && s2.attributes.unit_of_measurement; return u === "W" || u === "kW"; };
    const out = [];
    m.items.forEach((it) => { if (it.display === "device" && isW(it.entity)) out.push({ e: it.entity, x: it.x, y: it.y, n: it.name }); if (it.display === "car" && isW(it.power)) out.push({ e: it.power, x: it.x, y: it.y, n: "Wallbox" }); });
    m.furniture.forEach((f) => { if (isW(f.entity)) out.push({ e: f.entity, x: f.x, y: f.y, n: f.name || f.type }); });
    [].concat((this._config.energy || {}).devices || []).forEach((d) => out.push({ e: d.entity, x: d.x, y: d.y, n: d.name }));
    const seen = new Set(); return out.filter((d) => (seen.has(d.e) ? false : (seen.add(d.e), true)));
  }
  _watts(e) { const s2 = this._hass.states[e]; if (!s2) return NaN; const n = parseFloat(s2.state); return s2.attributes.unit_of_measurement === "kW" ? n * 1000 : n; }
  _fmtW(w) { return isNaN(w) ? "–" : w >= 1000 ? `${(w / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} kW` : `${Math.round(w)} W`; }
  _energyLegend() {
    const c = this._config.energy || {}, lg = this._root.querySelector(".pwrlg"); if (!lg) return;
    const t = c.today && this._hass.states[c.today];
    lg.textContent = `⚡ ${this._fmtW(this._watts(c.total))}${t ? ` · heute ${parseFloat(t.state).toLocaleString("de-DE", { maximumFractionDigits: 1 })} ${t.attributes.unit_of_measurement || "kWh"}` : ""}`;
  }
  _energy2d(m, glowG, iconG, bind) {
    const c = this._config.energy, mi = m.items.find((i) => i.display === "meter"), mp = mi ? [mi.x, mi.y] : c.meter, on = this._heat === "power", P = this._P, u = this._unit;
    if (!mp) return;
    // Zähler-Symbol (immer)
    const [sx, sy] = P(mp[0], mp[1]), mg = el("g", { class: "item dev meter", transform: `translate(${sx} ${sy})` }, iconG);
    el("circle", { r: 13 * u * 1.9, class: "touch" }, mg); el("circle", { r: 13 * u, class: "disc" }, mg);
    el("text", { class: "emo", "font-size": 13 * u * 1.05, y: 13 * u * 0.37 }, mg).textContent = "⚡";
    const mv = el("text", { class: "dval", y: 13 * u * 2.35, "font-size": 10.5 * u }, mg);
    const updM = () => { mv.textContent = this._fmtW(this._watts(c.total)); this._energyLegend(); };
    [c.total, c.today].filter(Boolean).forEach((e) => bind(e, updM));
    mg.addEventListener("click", (ev) => { ev.stopPropagation(); if (c.total) this._moreInfo(c.total); });
    if (!on) return;
    this._powerList(m).forEach((d) => {
      const cx = (mp[0] + d.x) / 2 + (d.y - mp[1]) * 0.18, cy = (mp[1] + d.y) / 2 - (d.x - mp[0]) * 0.18;
      const path = `M${mp[0]},${mp[1]} Q${cx},${cy} ${d.x},${d.y}`;
      el("path", { d: path, class: "flowbg" }, glowG);
      const fl = el("path", { d: path, class: "flow" }, glowG);
      const lbl = el("text", { x: cx * 0.5 + (mp[0] + d.x) * 0.25, y: cy * 0.5 + (mp[1] + d.y) * 0.25, class: "flowt", "font-size": 10 * u }, glowG);
      bind(d.e, () => {
        const w = this._watts(d.e), act = !isNaN(w) && w > 2;
        fl.classList.toggle("on", act);
        fl.style.strokeWidth = act ? (2 + Math.log10(Math.max(w, 1)) * 3).toFixed(1) : "";
        fl.style.animationDuration = act ? `${clamp(6 / Math.log10(w + 10), 0.5, 4).toFixed(2)}s` : "";
        lbl.textContent = act ? this._fmtW(w) : "";
      });
    });
  }
  _energy3d(m, bind) {
    const c = this._config.energy, v = this._v3, THREE = v.THREE, mi = m.items.find((i) => i.display === "meter"), mp = mi ? [mi.x, mi.y] : c.meter; if (!mp) return;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._emojiTex("⚡"), transparent: true, depthTest: false, sizeAttenuation: false }));
    sp.position.set(mp[0], 60, mp[1]); sp.renderOrder = 10; sp.userData = { kind: "entity", entity: c.total, px: 24 }; v.scene.add(sp); (v.dsprites = v.dsprites || []).push(sp); v.hits.push(sp);
    [c.total, c.today].filter(Boolean).forEach((e) => bind(e, () => this._energyLegend()));
    if (this._heat !== "power") return;
    v.flows = [];
    this._powerList(m).forEach((d) => {
      const cx = (mp[0] + d.x) / 2 + (d.y - mp[1]) * 0.18, cz = (mp[1] + d.y) / 2 - (d.x - mp[0]) * 0.18;
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(mp[0], 20, mp[1]), new THREE.Vector3(cx, 70, cz), new THREE.Vector3(d.x, 20, d.y));
      const mat = new THREE.MeshBasicMaterial({ color: 0xf5b544, transparent: true, opacity: 0.15, depthWrite: false });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 2.5, 6, false), mat); v.scene.add(tube);
      const dots = []; for (let k = 0; k < 4; k++) { const dm = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd27a })); dm.visible = false; v.scene.add(dm); dots.push(dm); }
      const f = { curve, dots, speed: 0, mat }; v.flows.push(f);
      bind(d.e, () => { const w = this._watts(d.e), act = !isNaN(w) && w > 2; f.speed = act ? clamp(Math.log10(w + 10) * 0.12, 0.08, 0.6) : 0; mat.opacity = act ? 0.35 : 0.08; dots.forEach((dm) => (dm.visible = act)); this._flowsActive(); });
    });
  }
  _flowsActive() {
    const v = this._v3; if (!v || !v.flows || v.flowRaf || !v.flows.some((f) => f.speed)) return;
    const loop = (t) => {
      if (this._v3 !== v) return;
      v.flows.forEach((f) => { if (!f.speed) return; f.dots.forEach((dm, k) => { const p = ((t / 1000) * f.speed + k / f.dots.length) % 1; dm.position.copy(f.curve.getPoint(p)); }); });
      this._render3d(); v.flowRaf = v.flows.some((f) => f.speed) ? requestAnimationFrame(loop) : 0;
    };
    v.flowRaf = requestAnimationFrame(loop);
  }
  /* ---------- Sound & Cinema ---------- */
  _isMedia(it) { return (it.entity || "").startsWith("media_player.") || !!it.also; }
  _mediaState(it) {
    const sts = [it.entity, ...[].concat(it.also || [])].map((e) => this._hass.states[e]).filter(Boolean);
    return sts.find((x) => x.state === "playing") || sts.find((x) => x.state === "paused") || sts[0] || null;
  }
  _mediaEnt() { const s2 = this._mediaOpen && this._mediaState(this._mediaOpen); return s2 && s2.entity_id; }
  _mediaShow(it) { this._carOpen = null; this._mediaOpen = it; this._camClose && this._root.querySelector(".campop") && this._camClose(); this._root.querySelector(".mpop").hidden = false; this._mediaSig = null; this._mediaRender(); }
  _mediaClose() { this._mediaOpen = null; this._carOpen = null; this._root.querySelector(".mpop").hidden = true; }
  _mediaRender() {
    const it = this._mediaOpen; if (!it) return;
    const st = this._mediaState(it), pop = this._root.querySelector(".mpop"), body = pop.querySelector(".mbody");
    const a = (st && st.attributes) || {}, sig = st ? [st.entity_id, st.state, a.media_title, a.media_artist, a.entity_picture, Math.round((a.volume_level || 0) * 100)].join("|") : "";
    if (sig === this._mediaSig) return; this._mediaSig = sig;
    pop.querySelector("b").textContent = it.name || a.friendly_name || it.entity;
    pop.querySelector(".cs").textContent = st ? ({ playing: "spielt", paused: "pausiert", idle: "bereit", off: "aus" }[st.state] || st.state) : "";
    const pic = a.entity_picture ? (this._hass.hassUrl ? this._hass.hassUrl(a.entity_picture) : a.entity_picture) : null;
    const vol = a.volume_level != null ? Math.round(a.volume_level * 100) : null;
    body.innerHTML = `<div class="mrow"><div class="mcov">${pic ? `<img src="${this._esc(pic)}" alt="">` : "🎵"}</div><div class="mtxt"><div class="mt">${this._esc(a.media_title || (st && st.state === "playing" ? "Läuft" : "Nichts läuft"))}</div><div class="ma">${this._esc([a.media_artist, a.media_album_name].filter(Boolean).join(" · ") || a.app_name || a.source || "")}</div>${st && st.entity_id !== it.entity ? `<div class="ma">über ${this._esc(a.friendly_name || st.entity_id)}</div>` : ""}</div></div>
      <div class="mctl"><button data-m="media_previous_track">⏮</button><button data-m="media_play_pause" class="big">${st && st.state === "playing" ? "⏸" : "▶"}</button><button data-m="media_next_track">⏭</button></div>
      ${vol != null ? `<label class="mvol">🔈<input type="range" min="0" max="100" value="${vol}">🔊</label>` : ""}`;
    body.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => { if (st) this._hass.callService("media_player", b.dataset.m, { entity_id: st.entity_id }); }));
    const r = body.querySelector("input[type=range]");
    if (r) r.addEventListener("change", () => this._hass.callService("media_player", "volume_set", { entity_id: st.entity_id, volume_level: +r.value / 100 }));
  }
  _beatsActive() {
    const v = this._v3; if (!v || !v.beats) return;
    if (v.beats.some((b) => b.on) && !v.beatRaf) {
      const loop = (t) => {
        if (this._v3 !== v) return;
        let any = false;
        v.beats.forEach((b) => { if (!b.on) return; any = true; const k = 0.5 + 0.5 * Math.pow(Math.abs(Math.sin(t / 260)), 3); b.glow.scale.set(90 + 70 * k, 90 + 70 * k, 1); b.glow.material.opacity = 0.45 + 0.4 * k; });
        this._render3d();
        v.beatRaf = any ? requestAnimationFrame(loop) : 0;
      };
      v.beatRaf = requestAnimationFrame(loop);
    }
  }
  /* ---------- Haushalt ---------- */
  _thirsty(st) {
    if (!st) return false;
    const a = st.attributes || {}, ms = String(a.moisture_status || "").toLowerCase();
    return ms === "low" || ms === "niedrig" || [].concat(a.problems || []).some((p) => /moisture.*low|feuchte.*niedrig/i.test(String(p)));
  }
  // nächste Abholung aus waste_collection_schedule (Attribute JJJJ-MM-TT) oder Zustand
  _binNext(e) {
    const st = this._hass.states[e]; if (!st) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ds = Object.keys(st.attributes || {}).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).map((k) => new Date(k + "T00:00:00")).filter((d) => d >= today).sort((a, b) => a - b);
    if (!ds.length) return null;
    const d = ds[0], days = Math.round((d - today) / 86400000);
    return { date: d, days, label: days === 0 ? "heute" : days === 1 ? "morgen" : d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" }) };
  }
  _binsState(it) {
    const h = this._hass, done = it.done && h.states[it.done] && h.states[it.done].state === "on", hour = new Date().getHours();
    const list = (it.bins || []).map((b) => ({ ...b, next: this._binNext(b.entity) }));
    const due = list.filter((b) => b.next && (b.next.days === 1 || (b.next.days === 0 && hour < 12)));
    return { list, due, done };
  }
  _binsTap(it) {
    const s = this._binsState(it);
    if (s.due.length && it.done) { this._hass.callService("homeassistant", "toggle", { entity_id: it.done }); if (navigator.vibrate) navigator.vibrate(15); }
    this._toastMsg(s.list.filter((b) => b.next).sort((a, b) => a.next.days - b.next.days).map((b) => `${b.name}: ${b.next.label}`).join(" · ") + (s.due.length && it.done ? (s.done ? " – als nicht rausgestellt markiert" : " – als rausgestellt markiert ✓") : ""));
  }
  _drawBins(g, it, bind) {
    const P = this._P, u = this._unit * (this._config.icon_scale || 1), [sx, sy] = P(it.x, it.y), bw = 15 * u, gap = 5 * u, n = (it.bins || []).length;
    const grp = el("g", { class: "bins", transform: `translate(${sx} ${sy})` }, g);
    el("rect", { x: -((bw + gap) * n) / 2 - 6 * u, y: -22 * u, width: (bw + gap) * n + 12 * u, height: 50 * u, class: "touch" }, grp);
    const cells = (it.bins || []).map((b, i) => {
      const cx = -((bw + gap) * n) / 2 + gap / 2 + i * (bw + gap) + bw / 2, c = el("g", { transform: `translate(${cx} 0)`, class: "bin" }, grp);
      el("rect", { x: -bw / 2, y: -bw * 0.75, width: bw, height: bw * 1.3, rx: 2.5 * u, fill: b.color || "#6b645c", class: "bbody" }, c);
      el("rect", { x: -bw / 2 - 1.5 * u, y: -bw * 0.95, width: bw + 3 * u, height: 4 * u, rx: 1.5 * u, fill: b.color || "#6b645c", class: "blid" }, c);
      return { b, c, t: el("text", { y: bw * 1.05, "font-size": 8.5 * u, class: "blbl" }, c) };
    });
    const status = el("text", { y: -bw * 1.35, "font-size": 10.5 * u, class: "bstat" }, grp);
    const upd = () => {
      const s = this._binsState(it);
      cells.forEach((x) => { const nx = this._binNext(x.b.entity); x.t.textContent = nx ? (nx.days <= 1 ? nx.label : nx.date.toLocaleDateString("de-DE", { weekday: "short" })) : "–"; x.c.classList.toggle("due", s.due.some((d) => d.entity === x.b.entity)); });
      grp.classList.toggle("due", !!s.due.length && !s.done); grp.classList.toggle("done", !!s.due.length && s.done);
      status.textContent = s.due.length ? (s.done ? "✓ rausgestellt" : "🗑 rausstellen!") : "";
    };
    [...(it.bins || []).map((b) => b.entity), it.done].forEach((e) => bind(e, upd)); this._ticks.push(upd);
    grp.addEventListener("click", (ev) => { ev.stopPropagation(); this._binsTap(it); });
  }
  _bins3d(it, lam, box, place, bind) {
    const v = this._v3, THREE = v.THREE, n = (it.bins || []).length, ar = rad(it.angle || 0), W = 62, parts = [];
    (it.bins || []).forEach((b, i) => {
      const off = (i - (n - 1) / 2) * (W + 10), x = it.x + Math.cos(ar) * off, y = it.y + Math.sin(ar) * off;
      const col = parseInt(String(b.color || "#6b645c").replace("#", ""), 16), mat = lam(col);
      const body = place(new THREE.Mesh(box(W, 100, 70), mat), x, 50, y, it.angle || 0), lid = place(new THREE.Mesh(box(W + 6, 6, 76), mat), x, 103, y, it.angle || 0);
      parts.push({ b, meshes: [body, lid], mat });
    });
    let glow = null;
    if (!v.low) { glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex("glow"), color: 0xf5b544, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); glow.scale.set(n * 110, 160, 1); glow.position.set(it.x, 80, it.y); v.scene.add(glow); }
    parts.forEach((p) => p.meshes.forEach((mm) => { mm.userData = { kind: "entity", entity: p.b.entity, bins: it }; v.hits.push(mm); }));
    const upd = () => { const s = this._binsState(it); parts.forEach((p) => p.mat.emissive.set(s.due.some((d) => d.entity === p.b.entity) && !s.done ? 0x3a2a00 : 0x000000)); if (glow) glow.material.opacity = s.due.length && !s.done ? 0.6 : 0; };
    [...(it.bins || []).map((b) => b.entity), it.done].forEach((e) => bind(e, upd)); this._ticks.push(upd);
  }
  /* ---------- Kamera-Cockpit ---------- */
  _pinPos(it) {
    const a = rad(it.angle || 0), f = rad(it.fov || 90), R = (it.range || 600) * 0.55, kinds = Object.keys(it.detect || {});
    return kinds.map((k, i) => { const t = a + (kinds.length > 1 ? (i / (kinds.length - 1) - 0.5) * f * 0.6 : 0); return [k, it.detect[k], it.x + Math.cos(t) * R, it.y + Math.sin(t) * R]; });
  }
  // sichtbar solange an + 60 s danach
  _holdBind(bind, ent, cb) {
    let timer = null;
    bind(ent, (st) => {
      const on = !!st && ON_STATES.includes(st.state);
      clearTimeout(timer);
      if (on) cb(true); else timer = setTimeout(() => cb(false), (this._config.pin_hold ?? 60) * 1000);
    });
  }
  _pins3d(it, bind) {
    const v = this._v3, THREE = v.THREE;
    this._pinPos(it).forEach(([kind, ent, x, y]) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._emojiTex(DET_ICON[kind] || "❗"), transparent: true, depthTest: false, sizeAttenuation: false }));
      sp.position.set(x, 40, y); sp.renderOrder = 12; sp.visible = false; sp.userData = { kind: "entity", entity: it.entity, px: 24 }; v.scene.add(sp); (v.dsprites = v.dsprites || []).push(sp); v.hits.push(sp);
      this._holdBind(bind, ent, (vis) => { sp.visible = vis; this._req3d(); });
    });
  }
  _camUrl(eid, stream) {
    const st = this._hass.states[eid], tok = st && st.attributes.access_token, path = `/api/${stream ? "camera_proxy_stream" : "camera_proxy"}/${eid}?token=${tok}${stream ? "" : "&t=" + Date.now()}`;
    return this._hass.hassUrl ? this._hass.hassUrl(path) : path;
  }
  async _camShow(it, auto) {
    const pop = this._root.querySelector(".campop"), img = pop.querySelector("img"), st = this._hass.states[it.entity];
    this._camOpen = it.entity; this._camAuto = !!auto;
    pop.querySelector("b").textContent = it.name || (st && st.attributes.friendly_name) || it.entity;
    pop.querySelector(".cs").textContent = auto ? "Erkennung" : "";
    pop.hidden = false;
    clearInterval(this._camSnap); img.onerror = null;
    if (!st || !st.attributes.access_token) { img.removeAttribute("src"); }
    else {
      img.onerror = () => { img.onerror = null; const snap = () => (img.src = this._camUrl(it.entity, false)); snap(); this._camSnap = setInterval(snap, 2000); };
      img.src = this._camUrl(it.entity, true);
    }
    const ev = pop.querySelector(".cev"); ev.textContent = "Verlauf wird geladen …";
    const ents = Object.entries(it.detect || {});
    if (!ents.length) { ev.textContent = ""; return; }
    try {
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(Date.now() - 86400000).toISOString(), entity_ids: ents.map((x) => x[1]), minimal_response: true, no_attributes: true });
      const list = [];
      ents.forEach(([k, e]) => { let prev = null; (res[e] || []).forEach((r) => { const s = r.s, t = (r.lu || r.lc) * 1000; if (s === "on" && prev !== "on") list.push({ k, t }); prev = s; }); });
      list.sort((a, b) => b.t - a.t);
      ev.innerHTML = list.length ? `<span class="evh">Letzte 24 h:</span> ` + list.slice(0, 12).map((x) => `<span class="evi">${DET_ICON[x.k] || "❗"} ${new Date(x.t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>`).join("") : "Keine Erkennungen in den letzten 24 h.";
    } catch (e) { ev.textContent = ""; }
  }
  _camClose() {
    const pop = this._root.querySelector(".campop"), img = pop.querySelector("img");
    clearInterval(this._camSnap); img.onerror = null; img.removeAttribute("src"); pop.hidden = true; this._camOpen = null;
  }
  // „Regie“: bei Erkennung automatisch zur Kamera, nach `return` s ohne Bedienung zurück
  _directorWatch(m, bind) {
    const d = this._config.director; if (!d || this._config.edit3d) return;
    m.items.filter((it) => it.display === "camera").forEach((it) => {
      [...Object.values(it.detect || {}), ...[].concat(it.motion || [])].forEach((e) => bind(e, (st) => {
        if (this._tt) return;
        const on = !!st && ON_STATES.includes(st.state), was = this._detPrev[e];
        this._detPrev[e] = on;
        if (!on || was !== false) return; // nur echte Wechsel aus → an (nicht beim Aufbau)
        if (Date.now() - (this._userAct || 0) < 15000 && !this._camAuto) return; // jemand bedient gerade
        this._camShow(it, true);
        const pts = fovPts(it);
        if (this._view === "3d") this._focus3d({ points: pts }); else if (this._zoomBox) this._zoomBox(pts);
        clearTimeout(this._dirT);
        this._dirT = setTimeout(() => { if (this._camAuto && this._camOpen) { this._camClose(); if (this._view === "3d") this._home3d(); else if (this._zReset) this._zReset(); } }, ((d === true ? 30 : d.return) || 30) * 1000);
      }));
    });
  }
  _heating(st) {
    if (!st || OFF_STATES.includes(st.state) || st.state === "off") return false;
    const ac = st.attributes.hvac_action;
    return ac ? ac === "heating" : st.state === "heat" || st.state === "on";
  }
  _drawWallItem(g, it, bind) {
    const P = this._P, u = this._unit * (this._config.icon_scale || 1), a = rad(it.angle || 0);
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const W = (s, d) => P(it.x + ux * s + nx * d, it.y + uy * s + ny * d);
    const poly = (pts, cls, par) => el("polygon", { points: pts.map((q) => q.join(",")).join(" "), class: cls }, par);
    if (it.display === "radiator") {
      const L = it.length || 100, D = 9;
      const grp = el("g", { class: "witem radi" }, g);
      const body = [W(-L / 2, 1), W(L / 2, 1), W(L / 2, D + 1), W(-L / 2, D + 1)];
      poly(body, "rglow", grp); poly(body, "rad", grp);
      const n = Math.max(3, Math.round(L / 12));
      for (let k = 1; k < n; k++) { const sx = -L / 2 + (L * k) / n, p1 = W(sx, 2.5), p2 = W(sx, D - 0.5); el("line", { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], class: "fin" }, grp); }
      const m = Math.max(D + 2, 16 * u), e = 6 * u;
      poly([W(-L / 2 - e, -m * 0.3), W(L / 2 + e, -m * 0.3), W(L / 2 + e, m), W(-L / 2 - e, m)], "touch", grp);
      if (it.entity) bind(it.entity, (st) => { grp.classList.toggle("heat", this._heating(st)); grp.classList.toggle("offline", !st || OFF_STATES.includes(st.state)); });
      grp.addEventListener("click", (ev) => { ev.stopPropagation(); if (it.entity) this._moreInfo(it.entity); });
      return;
    }
    // Steckdose: kleines Symbol direkt an der Wand
    const r = 7.5 * u, [sx, sy] = W(0, r + 1);
    const dom = (it.entity || "").split(".")[0];
    const grp = el("g", { class: "witem sock" + (it.entity ? "" : " plain"), transform: `translate(${sx} ${sy}) rotate(${(it.angle || 0)})` }, g);
    el("circle", { r: r * 3, class: "touch" }, grp);
    el("rect", { x: -r * (it.count === 2 ? 1.9 : 1), y: -r, width: r * (it.count === 2 ? 3.8 : 2), height: r * 2, rx: r * 0.45, class: "disc" }, grp);
    (it.count === 2 ? [-r * 0.9, r * 0.9] : [0]).forEach((cx) => { el("circle", { cx: cx - r * 0.33, r: r * 0.18, class: "pin" }, grp); el("circle", { cx: cx + r * 0.33, r: r * 0.18, class: "pin" }, grp); });
    if (!it.entity) return;
    const bubble = el("text", { y: -r * 2, class: "bubble", "font-size": 15 * u }, grp);
    bind(it.entity, (st) => { grp.classList.toggle("on", !!st && ON_STATES.includes(st.state)); grp.classList.toggle("offline", !st || OFF_STATES.includes(st.state)); });
    if (["switch", "light", "input_boolean", "fan"].includes(dom)) this._gestures(grp, it, bubble);
    else grp.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(it.entity); });
  }
  // Tipp auf den Raum knapp neben einem Symbol → das Symbol ist gemeint
  _magnet(ev) {
    if (!this._svg || !this._m || !this._P) return false;
    const ctm = this._svg.getScreenCTM();
    if (!ctm) return false;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    let best = null, bd = (this._safe() ? 20 : 34) * (this._config.icon_scale || 1);
    for (const it of this._m.items) {
      if (!it.entity || it.display === "ripple" || it.display === "vacuum") continue;
      if (this._taps && this._taps.some((t) => t.it === it && t.grp.classList.contains("clhid"))) continue;
      const q = this._P(it.x, it.y), d = Math.hypot(q[0] - p.x, q[1] - p.y) / (this._unit * (this._zk || 1));
      if (d < bd) { bd = d; best = it; }
    }
    if (!best) return false;
    const dom = best.entity.split(".")[0];
    if (["light", "switch", "input_boolean", "fan"].includes(dom) && best.display !== "device" && best.display !== "radiator") this._itemAction(best, ev);
    else this._moreInfo(best.entity);
    return true;
  }
  _drawDevice(g, it, bind) {
    const P = this._P, u = this._unit * (this._config.icon_scale || 1), [sx, sy] = P(it.x, it.y), r = 13 * u;
    const grp = el("g", { class: "item dev", transform: `translate(${sx} ${sy})` }, g);
    const droom = this._m.areas.find((a) => !a.outdoor && pointInPoly(it.x, it.y, a.points));
    this._taps.push({ it, grp, x: sx, y: sy, group: true, light: false, room: droom && droom.id });
    el("circle", { r: r * 1.9, class: "touch" }, grp);
    el("circle", { r: r * 1.7, class: "halo" }, grp);
    const ic = el("g", { class: "ic" }, grp);
    el("circle", { r, class: "disc" }, ic);
    el("text", { class: "emo", "font-size": r * 1.05, y: r * 0.37 }, ic).textContent = it.icon || "🔌";
    const val = el("text", { class: "dval", y: r * 2.35, "font-size": 10.5 * u }, grp);
    const upd = () => {
      const st = this._hass.states[it.entity], run = this._running(it, st);
      if (this._pixel() && it._wasRun && !run && !this._tt) this._toastMsg(`▶ ${it.name || "Das Gerät"} ist fertig!`);
      it._wasRun = run;
      grp.classList.toggle("run", run);
      grp.classList.toggle("offline", !st || OFF_STATES.includes(st.state));
      val.textContent = run || (it.texts && st && it.texts[st.state] != null) ? this._devText(it, st) : "";
    };
    const media = this._isMedia(it);
    bind(it.entity, upd); if (it.end) { bind(it.end, upd); this._ticks.push(upd); }
    if (media) { [].concat(it.also || []).forEach((e) => bind(e, upd)); bind(it.entity, () => grp.classList.toggle("music", !!this._mediaState(it) && this._mediaState(it).state === "playing")); [].concat(it.also || []).forEach((e) => bind(e, () => grp.classList.toggle("music", !!this._mediaState(it) && this._mediaState(it).state === "playing"))); }
    grp.addEventListener("click", (ev) => { ev.stopPropagation(); if (media) this._mediaShow(it); else this._moreInfo(it.entity); });
  }
  /* ---------- Saugroboter ---------- */
  // Die Integration liefert nur den aktuellen Raum, keine Koordinaten:
  // der Roboter fährt deshalb eine angedeutete Bahn im gemeldeten Raum.
  _vacArea(it) {
    const m = this._m, sensor = it.room_sensor && this._hass.states[it.room_sensor];
    const name = sensor && sensor.state, map = it.rooms || {};
    if (!name || OFF_STATES.includes(name)) return null;
    const id = map[name];
    return m.areas.find((a) => id && (a.id === id || a.ha_area === id)) || m.areas.find((a) => a.name.toLowerCase() === String(name).toLowerCase()) || null;
  }
  _vacPath(a) {
    const xs = a.points.map((q) => q[0]), ys = a.points.map((q) => q[1]);
    const x0 = Math.min(...xs) + 25, x1 = Math.max(...xs) - 25, y0 = Math.min(...ys) + 25, y1 = Math.max(...ys) - 25;
    const pts = []; let dir = 1;
    for (let y = y0; y <= y1; y += 40) {
      const runs = []; let start = null;
      for (let x = x0; x <= x1 + 0.1; x += 10) {
        const ins = pointInPoly(x, y, a.points);
        if (ins && start == null) start = x;
        if ((!ins || x + 10 > x1 + 0.1) && start != null) { runs.push([start, ins ? x : x - 10]); start = null; }
      }
      (dir > 0 ? runs : runs.reverse()).forEach(([p, q]) => { if (dir > 0) pts.push([p, y], [q, y]); else pts.push([q, y], [p, y]); });
      dir = -dir;
    }
    return pts.length ? pts : [centroid(a.points)];
  }
  _vacStart(it) {
    if (!this._vac) this._vac = { it, pos: [it.x, it.y], path: [], idx: 0, trail: [], area: null, t: 0 };
    return this._vac;
  }
  _vacUpdate() {
    const v = this._vac; if (!v) return;
    const st = this._hass.states[v.it.entity], s = st ? st.state : "unavailable";
    v.mode = s === "cleaning" ? "clean" : s === "returning" ? "return" : s === "paused" || s === "idle" || s === "error" ? "stop" : "dock";
    if (v.mode === "clean") {
      const a = this._vacArea(v.it) || this._m.areas.find((x) => pointInPoly(v.pos[0], v.pos[1], x.points));
      if (a && a !== v.area) { v.area = a; v.path = this._vacPath(a); v.idx = 0; if (!pointInPoly(v.pos[0], v.pos[1], a.points)) { v.pos = [...v.path[0]]; v.trail = []; } }
    } else if (v.mode === "return") { v.area = null; v.path = [[v.it.x, v.it.y]]; v.idx = 0; }
    else if (v.mode === "dock") { v.pos = [v.it.x, v.it.y]; v.trail = []; v.area = null; }
    v.label = s === "cleaning" ? `Saugt${v.area ? " · " + v.area.name : ""}` : s === "returning" ? "Fährt zurück" : s === "error" ? "Fehler" : s === "paused" ? "Pause" : "";
    this._vacDraw();
    if ((v.mode === "clean" || v.mode === "return") && !this._vacRaf) {
      v.t = 0;
      const loop = (t) => {
        if (this._vac !== v) return;
        const dt = v.t ? Math.min(0.1, (t - v.t) / 1000) : 0; v.t = t;
        let step = (this._config.vacuum_speed || 45) * dt;
        while (step > 0 && v.path.length) {
          const tg = v.path[v.idx % v.path.length], dx = tg[0] - v.pos[0], dy = tg[1] - v.pos[1], d = Math.hypot(dx, dy);
          if (d <= step) { v.pos = [...tg]; step -= d; v.idx++; if (v.mode === "return" && v.idx >= v.path.length) { v.path = []; break; } if (v.idx >= v.path.length) v.idx = 0; }
          else { v.pos = [v.pos[0] + (dx / d) * step, v.pos[1] + (dy / d) * step]; v.heading = Math.atan2(dy, dx); step = 0; }
        }
        const last = v.trail[v.trail.length - 1];
        if (v.mode === "clean" && (!last || Math.hypot(last[0] - v.pos[0], last[1] - v.pos[1]) > 8)) { v.trail.push([...v.pos]); if (v.trail.length > 600) v.trail.shift(); }
        this._vacDraw();
        this._vacRaf = v.mode === "clean" || (v.mode === "return" && v.path.length) ? requestAnimationFrame(loop) : 0;
      };
      this._vacRaf = requestAnimationFrame(loop);
    }
  }
  _vacDraw() {
    const v = this._vac; if (!v) return;
    if (v.g) {
      const [sx, sy] = this._P(v.pos[0], v.pos[1]);
      v.g.setAttribute("transform", `translate(${sx} ${sy})`);
      v.g.classList.toggle("run", v.mode === "clean" || v.mode === "return");
      v.lbl.textContent = v.label || "";
      if (v.tr) v.tr.setAttribute("points", v.trail.map((q) => q.join(",")).join(" "));
    }
    if (v.mesh) { v.mesh.position.set(v.pos[0], 6, v.pos[1]); if (v.heading != null) v.mesh.rotation.y = -v.heading; this._req3d(); }
  }
  _drawVacuum(g, it, bind, trailG) {
    const u = this._unit * (this._config.icon_scale || 1), R = Math.max(17.5, 10 * u);
    const v = this._vacStart(it);
    v.g = el("g", { class: "item vac" }, g);
    el("circle", { r: R * 1.6, class: "touch" }, v.g);
    el("circle", { r: R * 1.5, class: "halo" }, v.g);
    el("circle", { r: R, class: "vbody" }, v.g);
    el("circle", { r: R * 0.32, class: "vtop" }, v.g);
    v.lbl = el("text", { class: "dval", y: R * 2.4, "font-size": 10.5 * u }, v.g);
    v.tr = trailG ? el("polyline", { class: "trail", "stroke-width": 30 }, trailG) : null;
    v.g.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(it.entity); });
    bind(it.entity, () => this._vacUpdate());
    if (it.room_sensor) bind(it.room_sensor, () => this._vacUpdate());
  }
  _emojiTex(txt, ring) {
    const v = this._v3, THREE = v.THREE, key = "emo_" + txt;
    v.tex = v.tex || {};
    if (v.tex[key]) return v.tex[key];
    const n = 128, cv = document.createElement("canvas"); cv.width = cv.height = n;
    const g = cv.getContext("2d");
    g.fillStyle = "#fff"; g.beginPath(); g.arc(n / 2, n / 2, n / 2 - 4, 0, Math.PI * 2); g.fill();
    g.font = `${n * 0.52}px "Segoe UI Emoji","Noto Color Emoji","Apple Color Emoji",sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(txt, n / 2, n / 2 + n * 0.03);
    const t = new THREE.CanvasTexture(cv); t._shared = true;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    v.shared.push(t); v.tex[key] = t;
    return t;
  }
  _special3d(it, area, bind) {
    const v = this._v3, THREE = v.THREE;
    if (it.display === "vacuum") {
      const vac = this._vacStart(it);
      const grp = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(17.5, 17.5, 9, 28), new THREE.MeshLambertMaterial({ color: this._dark ? 0x2b2a29 : 0x3a3836 }));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 3, 18), new THREE.MeshLambertMaterial({ color: 0xf5b544 }));
      top.position.set(7, 6, 0);
      grp.add(body, top); v.scene.add(grp);
      body.userData = top.userData = { kind: "entity", entity: it.entity }; v.hits.push(body, top);
      vac.mesh = grp;
      bind(it.entity, () => this._vacUpdate());
      if (it.room_sensor) bind(it.room_sensor, () => this._vacUpdate());
      return;
    }
    const z = it.z != null ? it.z : 60;
    const mat = new THREE.SpriteMaterial({ map: this._emojiTex(it.icon || "🔌"), transparent: true, depthTest: false, sizeAttenuation: false });
    const sp = new THREE.Sprite(mat); sp.position.set(it.x, z, it.y); sp.renderOrder = 10;
    sp.userData = { kind: "entity", entity: it.entity, px: 24 * (this._config.icon_scale || 1) };
    v.scene.add(sp); (v.dsprites = v.dsprites || []).push(sp); v.hits.push(sp);
    let glow = null;
    if (!v.low) {
      glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._lightTex("glow"), color: 0xf5b544, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      glow.scale.set(110, 110, 1); glow.position.set(it.x, z, it.y); glow.renderOrder = 3; v.scene.add(glow);
    }
    const media = this._isMedia(it), beat = media && glow ? { glow, on: false } : null;
    if (beat) (v.beats = v.beats || []).push(beat);
    const upd3 = () => {
      const st = this._hass.states[it.entity], run = this._running(it, st), off = !st || OFF_STATES.includes(st.state);
      mat.color.set(run ? 0xf5b544 : this._dark ? 0x8a847c : 0xbdb5aa);
      mat.opacity = off ? 0.45 : 1;
      sp.userData.calm = this._calm && !run;
      if (glow) { glow.material.opacity = run ? 0.75 : 0; glow.material.color.set(0xf5b544).multiplyScalar(v.fx ? 1.7 : 1); }
      if (beat) { beat.on = run; this._beatsActive(); }
    };
    [it.entity, ...[].concat(it.also || [])].forEach((e) => bind(e, upd3));
    if (media) sp.userData.media = it;
  }

  _gestures(grp, it, bubble) {
    const dom = (it.entity || "").split(".")[0];
    let down = null, timer = null, mode = null, startB = 0, val = 0;
    if (this._safe()) {
      // sicher: Ziehen verschiebt immer den Plan, Tippen öffnet die Steuerblase, Halten = Details
      let sd = null, lt = null;
      grp.addEventListener("pointerdown", (ev) => { sd = { x: ev.clientX, y: ev.clientY, t: performance.now() }; clearTimeout(lt); lt = setTimeout(() => { if (sd) { sd = null; this._moreInfo(it.entity); } }, 600); });
      grp.addEventListener("pointermove", (ev) => { if (sd && Math.hypot(ev.clientX - sd.x, ev.clientY - sd.y) > 9) { clearTimeout(lt); sd = null; } });
      grp.addEventListener("pointerup", (ev) => { clearTimeout(lt); if (this._tapOk(sd, ev)) { ev.stopPropagation(); this._tapItem(ev, it); } sd = null; });
      grp.addEventListener("pointercancel", () => { clearTimeout(lt); sd = null; });
      grp.addEventListener("click", (ev) => ev.stopPropagation());
      return;
    }
    grp.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      down = { x: ev.clientX, y: ev.clientY }; mode = null;
      grp.setPointerCapture(ev.pointerId);
      const st = this._hass.states[it.entity];
      startB = st && st.state === "on" && st.attributes.brightness != null ? Math.round((st.attributes.brightness / 255) * 100) : 0;
      clearTimeout(timer);
      timer = setTimeout(() => { if (!mode) { mode = "long"; this._moreInfo(it.entity); } }, 550);
    });
    grp.addEventListener("pointermove", (ev) => {
      if (!down || mode === "long") return;
      const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
      if (!mode && Math.hypot(dx, dy) > 12) {
        clearTimeout(timer);
        const st = this._hass.states[it.entity];
        const modes = (st && st.attributes.supported_color_modes) || [];
        mode = dom === "light" && modes.some((m) => m !== "onoff") ? "dim" : "cancel";
      }
      if (mode === "dim") {
        val = clamp(Math.round(startB + dx * 0.5), 1, 100);
        bubble.textContent = `${val} %`; bubble.classList.add("show");
      }
    });
    const end = (ev) => {
      if (!down) return;
      clearTimeout(timer);
      if (mode === "dim") { this._hass.callService("light", "turn_on", { entity_id: it.entity, brightness_pct: val }); setTimeout(() => bubble.classList.remove("show"), 700); }
      else if (!mode && ev.type === "pointerup") this._act(it.entity, "homeassistant", "toggle", {}, it.name);
      down = null;
      this._suppressClick = true; setTimeout(() => (this._suppressClick = false), 50);
    };
    grp.addEventListener("pointerup", end);
    grp.addEventListener("pointercancel", end);
    grp.addEventListener("click", (ev) => ev.stopPropagation());
  }

  _rgb(st) {
    const a = st.attributes || {};
    if (Array.isArray(a.rgb_color)) return a.rgb_color;
    if (a.color_temp_kelvin) return kelvinToRgb(a.color_temp_kelvin);
    if (a.color_temp) return kelvinToRgb(1e6 / a.color_temp);
    return [255, 197, 107];
  }
  _fmt(st) {
    if (!st || OFF_STATES.includes(st.state)) return "–";
    const n = parseFloat(st.state);
    if (isNaN(n)) return this._hass.formatEntityState ? this._hass.formatEntityState(st) : st.state;
    return `${n.toLocaleString("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}${st.attributes.unit_of_measurement === "°C" ? "°" : " " + (st.attributes.unit_of_measurement || "")}`;
  }

  _update(force) {
    if (!this._bind) return;
    const s = this._hass.states;
    for (const eid in this._bind) {
      const st = s[eid];
      if (!force && this._last[eid] === st) continue;
      this._last[eid] = st;
      this._bind[eid].forEach((fn) => fn(st));
    }
    if (this._panelArea && !this._panel.hidden) this._renderPanel();
    if (this._mediaOpen) this._mediaRender();
    if (this._carOpen) this._carRender();
    this._personUi();
    if (this._ctl) this._ctlRender();
    if (this._clusters && this._clusters.length) this._clusterState();
    if (this._config.kiosk && this._config.kiosk.night_dim) this._applyNight();
  }

  _moreInfo(eid) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: eid }, bubbles: true, composed: true }));
  }

  /* ---------- Raum-Panel ---------- */
  _areaEntities(areaId) {
    const h = this._hass, out = [];
    if (!h.entities) return out;
    for (const eid in h.entities) {
      const e = h.entities[eid];
      if (e.hidden || e.entity_category) continue;
      const dev = e.device_id && h.devices ? h.devices[e.device_id] : null;
      const area = e.area_id || (dev && dev.area_id);
      if (area === areaId && h.states[eid]) out.push(eid);
    }
    const order = ["light", "switch", "climate", "media_player", "cover", "fan", "vacuum", "binary_sensor", "sensor", "plant"];
    const rank = (eid) => { const i = order.indexOf(eid.split(".")[0]); return i < 0 ? 99 : i; };
    return out.sort((a, b) => rank(a) - rank(b) || this._name(a).localeCompare(this._name(b)));
  }
  _name(eid) {
    const st = this._hass.states[eid];
    return (st && st.attributes.friendly_name) || eid;
  }
  _openPanel(a) { this._panelArea = a; this._panel.hidden = false; this._renderPanel(); }
  _closePanel(silent) { this._panelArea = null; if (this._panel) this._panel.hidden = true; }
  _renderPanel() {
    const a = this._panelArea, h = this._hass;
    this._root.querySelector(".pt").textContent = a.name;
    const pb = this._root.querySelector(".pb"), wb = this._root.querySelector(".pwv");
    wb.hidden = !!a.outdoor; wb.classList.toggle("on", this._panelMode === "walls");
    if (this._panelMode === "walls" && !a.outdoor) {
      const key = "w" + a.id + (this._wallI || 0);
      if (this._panelSig === key && pb.childElementCount) return;
      this._panelSig = key; pb.innerHTML = this._wallView(a);
      const nb = (d) => () => { this._wallI = (this._wallI || 0) + d; this._renderPanel(); };
      pb.querySelector(".wvp") && (pb.querySelector(".wvp").onclick = nb(-1)); pb.querySelector(".wvn") && (pb.querySelector(".wvn").onclick = nb(1));
      return;
    }
    const ids = a.entities ? [].concat(a.entities).filter((e) => h.states[e]) : this._areaEntities(a.ha_area || a.id);
    const sig = ids.map((e) => e + (h.states[e] && h.states[e].state)).join("|");
    if (sig === this._panelSig && pb.childElementCount) return;
    this._panelSig = sig;
    if (!ids.length) { pb.innerHTML = `<div class="empty">Keine Geräte in diesem Bereich.</div>`; return; }
    const toggles = ["light", "switch", "fan", "input_boolean"];
    pb.innerHTML = "";
    for (const eid of ids) {
      const st = h.states[eid], dom = eid.split(".")[0];
      const row = document.createElement("div");
      row.className = "row" + (st.state === "on" ? " on" : "") + (OFF_STATES.includes(st.state) ? " offline" : "");
      const nm = this._name(eid).replace(new RegExp("^" + a.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*", "i"), "") || this._name(eid);
      let right;
      if (toggles.includes(dom) && !OFF_STATES.includes(st.state)) {
        right = `<button class="tg ${st.state === "on" ? "on" : ""}" aria-label="Schalten"><span></span></button>`;
      } else if (dom === "climate") {
        const cur = st.attributes.current_temperature, tgt = st.attributes.temperature;
        right = `<span class="val">${cur != null ? cur + "°" : ""}${tgt != null ? ` → ${tgt}°` : ""}</span>`;
      } else {
        right = `<span class="val">${this._esc(dom === "sensor" ? this._fmt(st) : h.formatEntityState ? h.formatEntityState(st) : st.state)}</span>`;
      }
      row.innerHTML = `<span class="nm">${this._esc(nm)}</span>${right}`;
      row.addEventListener("click", (ev) => {
        if (ev.target.closest(".tg")) { this._act(eid, "homeassistant", "toggle"); return; }
        this._moreInfo(eid);
      });
      pb.appendChild(row);
    }
  }
  _esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
}

const STYLE = `
:host{display:block}
ha-card{overflow:hidden;background:var(--ha-card-background,var(--card-background-color));border-radius:var(--ha-card-border-radius,22px)}
.wrap{position:relative}
.bar{position:absolute;top:10px;right:10px;z-index:2}
.seg{display:flex;background:var(--secondary-background-color,rgba(127,127,127,.15));border-radius:999px;padding:3px;gap:2px}
.seg button{border:0;background:none;color:var(--secondary-text-color);font:600 12px/1 var(--paper-font-body1_-_font-family,system-ui);padding:7px 12px;border-radius:999px;cursor:pointer}
.seg button.on{background:var(--jg-accent,#f5b544);color:#1f1b16}
.stage svg{display:block;width:100%;height:auto;max-height:calc(100vh - 80px);touch-action:manipulation;user-select:none;-webkit-user-select:none}
.stage svg.zoomed{cursor:grab}.stage svg.zoomed:active{cursor:grabbing}
svg{--floor:#2a2826;--floor2:#262422;--wall:#d9d2c7;--wtop:#efe9df;--wr:#b9b1a6;--wd:#a49c91;--txt:#f2ede6;--txt2:#a5a19c;--disc:#3a3734;--glyph:#c9c3bb;--acc:#f5b544;--warn:#f0a24a;--err:#e8644a;--glass:#5aa0e6;--furn:#3b3835;--furnl:#4a4642}
svg.light{--floor:#ebe5dc;--floor2:#e6dfd5;--wall:#5e554b;--wtop:#6f665b;--wr:#8a8176;--wd:#7c7368;--txt:#1f1b16;--txt2:#6b645c;--disc:#ffffff;--glyph:#6b645c;--furn:#d9d1c5;--furnl:#c8bfb2}
.room{fill:var(--floor);stroke:none;cursor:pointer;transition:fill .2s}
.room.out.s-grass{fill:#24301f}.room.out.s-paving{fill:#2d2c2a}.room.out.s-gravel{fill:#34312c}.room.out.s-wood{fill:#3a3027}.room.out.s-path{fill:#3d372d}.room.out.s-terrace{fill:#353037}.room.out.s-greenhouse{fill:#22302a;stroke:var(--glass);stroke-width:3;stroke-opacity:.7}
svg.light .room.out.s-grass{fill:#d3dfc2}svg.light .room.out.s-paving{fill:#ddd8cf}svg.light .room.out.s-gravel{fill:#d6cfc2}svg.light .room.out.s-wood{fill:#cdb594}svg.light .room.out.s-path{fill:#e6dbc2}svg.light .room.out.s-terrace{fill:#d8ced5}svg.light .room.out.s-greenhouse{fill:#dce9e1}
.fov{fill:var(--glass);fill-opacity:.1;stroke:var(--glass);stroke-opacity:.35;stroke-width:1.5;pointer-events:none;transition:fill .4s}
.fov.lit{fill:#f5d76e;fill-opacity:.28;stroke:#f5d76e}.fov.alert{fill:var(--err);fill-opacity:.3;stroke:var(--err);animation:jgblink 1.4s ease-in-out infinite}
@keyframes jgblink{0%,100%{fill-opacity:.12}50%{fill-opacity:.38}}
.cam .halo{fill:var(--acc);opacity:0;transform-box:fill-box;transform-origin:center}.cam.lit .disc{fill:var(--acc)}.cam.alert .disc{fill:var(--err)}.cam.alert .halo{fill:var(--err);animation:jgpulse 1.4s ease-in-out infinite}
.room:hover{fill:var(--floor2)}
svg.dark .glows{mix-blend-mode:screen}
.glow{transition:opacity .5s;pointer-events:none}
.rug{fill:var(--furn);opacity:.5}
.fbody{fill:var(--furn);stroke:var(--furnl);stroke-width:2}
.fline{stroke:var(--furnl);stroke-width:2}.fline.thin{stroke-width:1}.fline.arrow{stroke:var(--txt2)}.fdet{fill:var(--furnl)}.fbody.tv{fill:#111}
.plant{fill:#3d6b3d}.leafp{fill:#5f9a52}
.furniture{pointer-events:none}.furniture.bound{pointer-events:auto;cursor:pointer}
.furniture.offline{opacity:.45}
.wall2d{fill:var(--wall)}.pillar2d{fill:var(--wall)}
.wall .top,.pillar .top{fill:var(--wtop)}.wall .side-r,.pillar .side-r{fill:var(--wr)}.wall .side-d,.pillar .side-d{fill:var(--wd)}
.glass polygon{fill:var(--glass);opacity:.5}.glass.open polygon{fill:var(--err);opacity:.55}
.opening line{stroke-linecap:round}
.opening .glass{stroke:var(--glass);stroke-width:5;opacity:.8}
.opening .sill{stroke:var(--floor);stroke-width:12}
.opening .leaf{stroke:var(--txt2);stroke-width:4}
.opening .leaf.glazed{stroke:var(--glass);stroke-width:5}
.opening .arc{fill:none;stroke:var(--txt2);stroke-width:2;stroke-dasharray:6 6;opacity:0;transition:opacity .3s}
.opening.open .leaf,.opening.open .glass{stroke:var(--err)}
.opening.open .arc{stroke:var(--err)}
.opening.offline{opacity:.4}
.opening .hit{stroke:transparent;stroke-width:40;cursor:pointer}
.walls{pointer-events:none}
.rlabel{fill:var(--txt);font-family:var(--paper-font-body1_-_font-family,system-ui);font-weight:600;text-anchor:start;pointer-events:none;paint-order:stroke;stroke:var(--floor);stroke-width:3px;stroke-linejoin:round}
.rtemp{fill:var(--txt2);font-weight:500;font-size:.85em}
.labels{pointer-events:none}
.item{cursor:pointer;touch-action:none}
.item .touch{fill:transparent}
.item .disc{fill:var(--disc);stroke:var(--txt2);stroke-opacity:.35;stroke-width:1.5;transition:fill .3s}
.item .glyph{fill:var(--glyph);pointer-events:none}
.item.on .disc{stroke:none}
.item.on .glyph{fill:#1f1b16}
.item.offline{opacity:.4}
.item.offline .disc{stroke-dasharray:3 3;stroke-opacity:.8}
.bubble{fill:var(--txt);font-weight:700;text-anchor:middle;opacity:0;transition:opacity .2s;paint-order:stroke;stroke:var(--floor);stroke-width:4px;pointer-events:none}
.bubble.show{opacity:1}
.ripple{pointer-events:none;opacity:0;transition:opacity .4s}
.ripple.active{opacity:1}
.ripple circle{fill:none;stroke:var(--acc);stroke-width:3;transform-box:fill-box;transform-origin:center;animation:jgrip 2.4s ease-out infinite;opacity:0}
.ripple .dot{fill:var(--acc);stroke:none;animation:none;opacity:1}
@keyframes jgrip{0%{transform:scale(.15);opacity:.9}100%{transform:scale(1);opacity:0}}
@media (prefers-reduced-motion:reduce){.ripple circle{animation:none;opacity:.5}}
.panel[hidden],.toast[hidden],.bar[hidden]{display:none!important}
.v3{position:relative;overflow:hidden}
.v3 canvas{display:block;width:100%;touch-action:none}
.msg{padding:60px 20px;text-align:center;color:var(--secondary-text-color);font:500 14px var(--paper-font-body1_-_font-family,system-ui)}
.lbl3{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.rl3{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;font:600 12px/1.25 var(--paper-font-body1_-_font-family,system-ui);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.85);white-space:nowrap}
.rl3 span{font-weight:500;opacity:.85;font-size:11px}
.b3{position:absolute;transform:translateX(-50%);padding:4px 10px;border-radius:999px;background:rgba(20,19,18,.85);color:#fff;font:700 13px var(--paper-font-body1_-_font-family,system-ui);opacity:0;transition:opacity .2s;pointer-events:none}
.b3.show{opacity:1}
.panel{position:absolute;top:0;right:0;bottom:0;width:min(340px,88%);background:var(--ha-card-background,var(--card-background-color,#1f1e1d));border-left:1px solid var(--divider-color,rgba(127,127,127,.2));z-index:3;display:flex;flex-direction:column;box-shadow:-12px 0 30px rgba(0,0,0,.25);animation:jgin .2s ease-out}
@keyframes jgin{from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1}}
.ph{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 10px;font:700 18px/1.2 var(--paper-font-body1_-_font-family,system-ui);color:var(--primary-text-color)}
.px{border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--primary-text-color);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px}
.pb{overflow:auto;padding:0 10px 14px}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 8px;border-radius:12px;cursor:pointer;color:var(--primary-text-color);font:500 14px/1.3 var(--paper-font-body1_-_font-family,system-ui)}
.row:hover{background:var(--secondary-background-color,rgba(127,127,127,.1))}
.row.offline{opacity:.45}
.nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.val{color:var(--secondary-text-color);white-space:nowrap}
.tg{flex:none;width:42px;height:24px;border-radius:12px;border:0;background:var(--disabled-color,#666);position:relative;cursor:pointer;transition:background .2s}
.tg span{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s}
.tg.on{background:var(--jg-accent,#f5b544)}.tg.on span{transform:translateX(18px)}
.empty{color:var(--secondary-text-color);padding:12px 8px}
.bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end;max-width:calc(100% - 20px)}
.rz{border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color);font:600 12px/1 var(--paper-font-body1_-_font-family,system-ui);padding:9px 12px;border-radius:999px;cursor:pointer;-webkit-appearance:none;appearance:none;max-width:150px}
.rz[hidden],.rain[hidden],.campop[hidden],.mpop[hidden],.cine[hidden]{display:none!important}
.cine{border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color);font:600 12px/1 var(--paper-font-body1_-_font-family,system-ui);padding:9px 12px;border-radius:999px;cursor:pointer}.cine.on{background:#6c4bd1;color:#fff}
.mpop{position:absolute;right:12px;top:56px;z-index:4;width:min(360px,calc(100% - 24px));background:rgba(20,19,18,.94);color:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.45);font:500 12px/1.35 var(--paper-font-body1_-_font-family,system-ui)}
.mpop .ch{display:flex;align-items:center;gap:8px;padding:8px 10px}.mpop .ch b{font-size:14px}.mpop .cs{flex:1;color:#aaa}
.mpop button{border:0;background:rgba(255,255,255,.12);color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px}
.mpop .mbody{padding:0 12px 12px}.mrow{display:flex;gap:12px;align-items:center}.mcov{width:72px;height:72px;border-radius:10px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;font-size:28px;overflow:hidden;flex:none}.mcov img{width:100%;height:100%;object-fit:cover}
.mt{font-size:14px;font-weight:700}.ma{color:#bbb;margin-top:2px}
.mctl{display:flex;justify-content:center;gap:14px;margin:12px 0 6px}.mctl button{width:40px;height:40px;font-size:16px}.mctl button.big{width:52px;height:52px;background:var(--acc,#f5b544);color:#1f1b16;font-size:20px}
.wx{position:static;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:rgba(20,19,18,.6);color:#fff;font:600 12px var(--paper-font-body1_-_font-family,system-ui);pointer-events:none}.wx .wi{font-size:16px}.wx b{font-size:14px}.wx[hidden]{display:none}

.wxfog{opacity:.22;animation:jgfog 9s ease-in-out infinite}@keyframes jgfog{0%,100%{opacity:.16}50%{opacity:.3}}
.wxflash{opacity:0;animation:jgflash 7s linear infinite}@keyframes jgflash{0%,93%,95.5%,100%{opacity:0}94%{opacity:.35}96.5%{opacity:.2}}
.wxl{pointer-events:none}
.carbig{display:flex;gap:12px;align-items:center;font-size:40px}.carbig .mt{font-size:15px}.carbig .ma{font-size:13px}
.cstats{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}.cst{background:rgba(255,255,255,.08);border-radius:10px;padding:6px 8px;cursor:pointer;display:flex;flex-direction:column}.cst span{color:#bbb;font-size:11px}.cst b{font-size:14px}
.mpop .cbtn{width:100%;height:auto;border-radius:10px;padding:10px;font:700 13px var(--paper-font-body1_-_font-family,system-ui);background:#5fd17a;color:#11301b}.mpop .cbtn.on{background:rgba(255,255,255,.14);color:#fff}
.flowbg{fill:none;stroke:var(--acc);stroke-opacity:.08;stroke-width:3;pointer-events:none}
.flow{fill:none;stroke:var(--acc);stroke-opacity:0;stroke-dasharray:6 16;stroke-linecap:round;pointer-events:none;animation:jgflow 1.5s linear infinite}.flow.on{stroke-opacity:.9}
@keyframes jgflow{to{stroke-dashoffset:-44}}
.flowt{fill:var(--acc);text-anchor:middle;font-weight:700;paint-order:stroke;stroke:var(--floor);stroke-width:3px;pointer-events:none}
.meter .disc{fill:var(--acc)}
.mvol{display:flex;align-items:center;gap:8px}.mvol input{flex:1;accent-color:#f5b544}
.dev.music .halo{animation:jgbeat .52s ease-in-out infinite alternate}
@keyframes jgbeat{from{opacity:.15;transform:scale(.85)}to{opacity:.6;transform:scale(1.25)}}
.campop{position:absolute;right:12px;top:56px;z-index:4;width:min(440px,calc(100% - 24px));background:rgba(20,19,18,.94);color:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.45);font:500 12px/1.35 var(--paper-font-body1_-_font-family,system-ui)}
.campop .ch{display:flex;align-items:center;gap:8px;padding:8px 10px}.campop .ch b{font-size:14px}.campop .cs{flex:1;color:#e8644a;font-weight:700}
.campop button{border:0;background:rgba(255,255,255,.12);color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer}
.campop .cimg{background:#000;aspect-ratio:16/9}.campop img{display:block;width:100%;height:100%;object-fit:contain}
.campop .cev{padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.campop .evh{color:#aaa}.campop .evi{background:rgba(255,255,255,.1);border-radius:999px;padding:2px 8px}
.pin{opacity:0;transition:opacity .4s;pointer-events:none}.pin.on{opacity:1}.pin .pind{fill:var(--err);fill-opacity:.85;stroke:#fff;stroke-width:2}
.drop{text-anchor:middle;opacity:0;pointer-events:none}.drop.on{animation:jgblink3 1.4s ease-in-out infinite}
.bins{cursor:pointer}.bins .touch{fill:transparent}.bins .bbody,.bins .blid{stroke:rgba(0,0,0,.35);stroke-width:1}
.bins .blbl{fill:var(--txt2);text-anchor:middle;font-weight:600;paint-order:stroke;stroke:var(--floor);stroke-width:3px}
.bins .bin.due .blbl{fill:var(--acc)}.bins.due .bin.due{animation:jgblink3 1.6s ease-in-out infinite}
.bins .bstat{fill:var(--acc);text-anchor:middle;font-weight:700;paint-order:stroke;stroke:var(--floor);stroke-width:3px}.bins.done .bstat{fill:#5fd17a}
@media (max-width:600px){.bar{position:static;max-width:none;justify-content:center;padding:8px 8px 4px}}.rz option{color:#1f1b16;background:#fff}
.rain{border:0;background:var(--err,#e8644a);color:#fff;font:700 12px/1 var(--paper-font-body1_-_font-family,system-ui);padding:9px 12px;border-radius:999px;cursor:pointer;animation:jgblink2 1.4s ease-in-out infinite}
@keyframes jgblink2{0%,100%{opacity:1}50%{opacity:.55}}
.ttb{border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color);font:600 12px/1 var(--paper-font-body1_-_font-family,system-ui);padding:9px 12px;border-radius:999px;cursor:pointer}.ttb.on{background:#2f7de1;color:#fff}.ttb[hidden]{display:none}
.tt{position:absolute;left:10px;right:10px;bottom:10px;z-index:3;padding:8px 12px 8px;border-radius:14px;background:rgba(20,19,18,.9);color:#fff;font:600 12px var(--paper-font-body1_-_font-family,system-ui);box-shadow:0 4px 18px rgba(0,0,0,.35)}.tt[hidden]{display:none}
.tth{display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap}.tth button{border:0;background:rgba(255,255,255,.13);color:#fff;font:inherit;padding:8px 12px;border-radius:999px;cursor:pointer}.tth .tlive{background:#e8644a}.tth button[hidden]{display:none}
.tlab{margin-left:auto;font-size:14px}
.ttr{position:relative;height:34px}.ttm{position:absolute;left:8px;right:8px;top:0;height:12px}
.ttm i{position:absolute;top:0;width:4px;height:12px;border-radius:2px;transform:translateX(-2px);cursor:pointer;background:#9aa}.ttm i.k-door{background:#f0a040}.ttm i.k-motion{background:#5ec27a}.ttm i.k-det{background:#e8644a;height:14px}
.tsl{position:absolute;left:0;right:0;bottom:0;width:100%;margin:0;accent-color:#2f7de1}
.ttbadge{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:3;padding:7px 14px;border-radius:999px;background:#2f7de1;color:#fff;font:700 13px var(--paper-font-body1_-_font-family,system-ui);pointer-events:none;white-space:nowrap}.ttbadge[hidden]{display:none}
@media (max-width:600px){.ttbadge{top:auto;bottom:118px}}
.tt:not([hidden])~.toast{bottom:104px}
.item .ic{transition:transform .25s ease}
svg.calm .item:not(.on):not(.run) .ic{transform:scale(.36)}
svg.calm .item:not(.on):not(.run) .ic .glyph,svg.calm .item.dev:not(.run) .ic .emo{opacity:0}
svg.calm.zin .item .ic{transform:none}svg.calm.zin .item .ic .glyph,svg.calm.zin .item.dev .ic .emo{opacity:1}
.paint2d{pointer-events:none}.floor2{pointer-events:none}.paintf{pointer-events:none}
.lv{border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color);font:600 12px/1 var(--paper-font-body1_-_font-family,system-ui);padding:8px 10px;border-radius:999px}.lv[hidden]{display:none}
.roofb{border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color);font:600 12px/1 var(--paper-font-body1_-_font-family,system-ui);padding:8px 11px;border-radius:999px;cursor:pointer}.roofb.on{background:#c0553a;color:#fff}.roofb[hidden]{display:none}
.ppl{display:flex;gap:6px}.ppl[hidden]{display:none}
.pp{display:flex;align-items:center;gap:6px;border:0;padding:3px 10px 3px 3px;border-radius:999px;background:rgba(20,19,18,.6);color:#fff;font:600 12px var(--paper-font-body1_-_font-family,system-ui);cursor:pointer}
.pp img,.pp span{width:26px;height:26px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#6c6560;box-shadow:0 0 0 2px #5ec27a}.pp.away img,.pp.away span{box-shadow:0 0 0 2px #8a847c;filter:grayscale(1);opacity:.7}.pp.away i{opacity:.6}.pp i{font-style:normal}

.ppd{fill:#2f7de1;stroke:#fff;stroke-width:2}.ppt{fill:#fff;text-anchor:middle;font-weight:700;pointer-events:none}.ppin{cursor:pointer}
.pp3{position:absolute;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;background:#2f7de1;border:2px solid #fff;color:#fff;font:700 13px/22px var(--paper-font-body1_-_font-family,system-ui);text-align:center;pointer-events:none}
.alarmbar{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:4;display:flex;gap:10px;padding:9px 16px;border-radius:999px;background:#d93025;color:#fff;font:800 14px var(--paper-font-body1_-_font-family,system-ui);box-shadow:0 0 0 0 rgba(217,48,37,.6);animation:jgal 1s ease-in-out infinite}.alarmbar[hidden]{display:none}
@keyframes jgal{50%{box-shadow:0 0 0 12px rgba(217,48,37,0)}}
.alarmz{fill:#ff3b30;opacity:0;pointer-events:none}.alarmz.on{animation:jgalz 1s ease-in-out infinite}@keyframes jgalz{0%,100%{opacity:.12}50%{opacity:.45}}
.item.alarm.on .disc{fill:#d93025}.item.alarm.on .ic{animation:jgpulse .8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes jgpulse{50%{transform:scale(1.35)}}
.fanrot{transform-box:fill-box;transform-origin:center}.fanrot.spin{animation:jgspin 1s linear infinite}@keyframes jgspin{to{transform:rotate(360deg)}}
.item.fan.on .disc,.item.on .fanrot~.disc{fill:#7fd3e8}
.mmw{fill:#5ec2a0;opacity:.06;pointer-events:none}.mmw.on{opacity:.12}.mmt{fill:#5ec2a0;stroke:#fff;stroke-width:3;pointer-events:none;transition:cx .5s,cy .5s}
.vals{cursor:pointer}.vbg{fill:rgba(20,19,18,.72)}.vtx{fill:#fff;text-anchor:middle;font-weight:600;font-family:var(--paper-font-body1_-_font-family,system-ui)}svg.light .vbg{fill:rgba(255,255,255,.9)}svg.light .vtx{fill:#1f1b16}
.val3{position:absolute;transform:translate(-50%,-50%);padding:3px 9px;border-radius:999px;background:rgba(20,19,18,.72);color:#fff;font:600 11px var(--paper-font-body1_-_font-family,system-ui);white-space:nowrap;cursor:pointer}
.shutter{stroke:#8d9093;stroke-width:6;stroke-linecap:round;pointer-events:none}.touchl{stroke:transparent;stroke-width:24;cursor:pointer}
.tree{fill:#3f6b34}.tree.con{fill:#2f5530}.tree2{fill:#4f8240;opacity:.85}.trunk{fill:#6a4c34}.hedge{fill:#365f2f;stroke:#2a4a25;stroke-width:3}
svg.light .tree{fill:#7fa868}svg.light .tree2{fill:#93bb7a}svg.light .hedge{fill:#6e9a5c}
.fmodel{fill:var(--furn);stroke:var(--acc);stroke-width:2;stroke-dasharray:8 5}.fmlbl{fill:var(--txt2);text-anchor:middle;pointer-events:none}
.pwv{margin-left:auto;margin-right:8px;border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color);font:600 12px var(--paper-font-body1_-_font-family,system-ui);padding:6px 10px;border-radius:999px;cursor:pointer}.pwv.on{background:var(--jg-accent,#f5b544);color:#1f1b16}.pwv[hidden]{display:none}
.wvh{display:flex;align-items:center;justify-content:space-between;margin:4px 0 8px;color:var(--primary-text-color);font:600 13px var(--paper-font-body1_-_font-family,system-ui)}.wvh button{border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:inherit;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer}
.wvsvg{width:100%;height:auto;display:block}.wvw{stroke:rgba(0,0,0,.25);stroke-width:1}.wvg{fill:#9cc7ef;stroke:#f4f2ee;stroke-width:4}.wvd{fill:#6b5a48;stroke:#f4f2ee;stroke-width:4}.wvr{fill:#f3f0eb;stroke:#9a948c;stroke-width:1.5}.wvs{fill:#fff;stroke:#9a948c}
.wvf rect{stroke:rgba(0,0,0,.35);stroke-width:1.5}.wvf text{fill:#fff;font:600 11px var(--paper-font-body1_-_font-family,system-ui);text-anchor:middle;paint-order:stroke;stroke:rgba(0,0,0,.6);stroke-width:3px}.wvfl{stroke:var(--secondary-text-color,#888);stroke-width:2}.wvl{fill:var(--secondary-text-color,#888);font:600 13px var(--paper-font-body1_-_font-family,system-ui);text-anchor:middle}.wvi{font:11px var(--paper-font-body1_-_font-family,system-ui);color:var(--secondary-text-color);margin:6px 2px}
svg.vt-flat{animation:jgvtf .55s ease-out}svg.vt-tilt{animation:jgvtt .55s ease-out}svg.vt-in{animation:jgvti .45s ease-out}
@keyframes jgvtf{from{transform:perspective(1400px) rotateX(24deg) scale(.97);opacity:.35}}@keyframes jgvtt{from{transform:perspective(1400px) rotateX(-18deg) scale(.98);opacity:.35}}@keyframes jgvti{from{opacity:0;transform:scale(1.03)}}
.wrap.skin-blueprint{background:#0d3359}.wrap.skin-neon{background:#05060a}.wrap.skin-paper{background:#efe4cc}.wrap.skin-mono{background:#1e1e1e}
svg.skin-blueprint{--floor:#174a7c;--wall:#e8f1ff;--wtop:#ffffff;--wr:#b8cde8;--wd:#9fb8d8;--txt:#fff;--txt2:#cfe0ff;--disc:#1f5a94;--glyph:#e8f1ff;--furn:#2c6299;--furnl:#3a74b0}
svg.skin-blueprint .room{fill:#174a7c!important;stroke:#7fb0e8;stroke-width:1.5}svg.skin-blueprint .room.out{fill:#0f3a63!important}svg.skin-blueprint .floor2{display:none}svg.skin-blueprint .fpart{fill:#2c6299!important;stroke:#cfe0ff;stroke-width:1}
svg.skin-neon{--floor:#10131b;--wall:#2be0ff;--wtop:#7ff0ff;--wr:#18a9c4;--wd:#118aa1;--txt:#d8f7ff;--txt2:#7fd8ea;--disc:#141a26;--glyph:#2be0ff;--furn:#1b2233;--furnl:#252e44}
svg.skin-neon .room{fill:#10131b!important}svg.skin-neon .room.out{fill:#07090d!important}svg.skin-neon .floor2{display:none}svg.skin-neon .wall2d,svg.skin-neon .walls .top{filter:drop-shadow(0 0 6px #2be0ff)}svg.skin-neon .fpart{fill:#1b2233!important;stroke:#ff3fd2;stroke-width:1.2}
svg.skin-paper{--floor:#f4ecda;--wall:#4a3f33;--wtop:#5a4e40;--wr:#7a6c5c;--wd:#6b5e4f;--txt:#3b3127;--txt2:#7a6c5c;--disc:#fffaf0;--glyph:#4a3f33;--furn:#e2d5ba;--furnl:#d6c7a8}
svg.skin-paper .room{fill:#f7f0e2!important;stroke:#c9b998;stroke-width:1}svg.skin-paper .room.out{fill:#e8dcc3!important}svg.skin-paper .floor2{display:none}svg.skin-paper .fpart{fill:#e9dec6!important;stroke:#8a7a62;stroke-width:1}
svg.skin-mono{--floor:#3a3a3a;--wall:#e6e6e6;--wtop:#f2f2f2;--wr:#bdbdbd;--wd:#a8a8a8;--txt:#f2f2f2;--txt2:#bdbdbd;--disc:#4a4a4a;--glyph:#dddddd;--furn:#555;--furnl:#666}
svg.skin-mono .room{fill:#3a3a3a!important}svg.skin-mono .room.out{fill:#2a2a2a!important}svg.skin-mono .floor2{display:none}svg.skin-mono .fpart{fill:#555!important}
.info{position:absolute;left:12px;top:10px;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:6px;pointer-events:none}.info .ppl{pointer-events:auto}
.morb{display:none;border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color);height:34px;min-width:48px;padding:0 14px;border-radius:999px;cursor:pointer;position:relative;align-items:center;justify-content:center}.morb svg{fill:currentColor;display:block}.morb.alert::after{content:"";position:absolute;top:4px;right:6px;width:8px;height:8px;border-radius:50%;background:var(--err,#e8644a)}
.opts{display:contents}.outb{border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color);font:600 12px/1 var(--paper-font-body1_-_font-family,system-ui);padding:9px 12px;border-radius:999px;cursor:pointer;opacity:.6}.outb.on{opacity:1}.outb[hidden]{display:none}
.wrap.narrow .morb{display:flex}
.wrap.narrow .bar{position:relative;flex-wrap:nowrap;justify-content:center;padding:8px 8px 4px;max-width:none}
.wrap.narrow .opts{display:none;position:absolute;top:46px;right:8px;z-index:6;flex-direction:column;align-items:stretch;gap:6px;padding:10px;min-width:200px;border-radius:16px;background:var(--ha-card-background,var(--card-background-color,#1f1e1d));box-shadow:0 10px 30px rgba(0,0,0,.45)}
.wrap.narrow .bar.open .opts{display:flex}.wrap.narrow .opts>*{width:100%;text-align:left}.wrap.narrow .opts>[hidden]{display:none}
.wrap.narrow .info{position:static;flex-direction:row;flex-wrap:wrap;justify-content:center;margin:0 0 4px}.wrap.narrow .info .wx,.wrap.narrow .info .ppl{margin:0;position:static}
.wrap.narrow svg:not(.zin) .dval{display:none}
.wrap.narrow .panel{top:auto;left:0;right:0;bottom:0;width:auto;max-height:72%;border-left:0;border-radius:20px 20px 0 0;box-shadow:0 -12px 30px rgba(0,0,0,.35);animation:jgup .22s ease-out}
.wrap.narrow .panel .ph::before{content:"";position:absolute;left:50%;top:6px;width:40px;height:4px;border-radius:2px;background:var(--divider-color,rgba(127,127,127,.4));transform:translateX(-50%)}.wrap.narrow .panel .ph{position:relative}
@keyframes jgup{from{transform:translateY(40%);opacity:.3}}
.cbub{position:absolute;z-index:7;width:270px;padding:12px;border-radius:18px;background:var(--ha-card-background,var(--card-background-color,#1f1e1d));color:var(--primary-text-color,#f2ede6);box-shadow:0 12px 34px rgba(0,0,0,.5);font:500 13px var(--paper-font-body1_-_font-family,system-ui);animation:jgin .15s ease-out}.cbub[hidden]{display:none}
.cbub.dock{left:8px!important;right:8px;bottom:8px;top:auto!important;width:auto;border-radius:20px}
.cbh{display:flex;align-items:center;gap:8px;margin-bottom:10px}.cbh b{font-size:15px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cbs{font-size:12px;color:var(--secondary-text-color)}.cbx{border:0;background:none;color:var(--secondary-text-color);font-size:16px;cursor:pointer;padding:4px}
.cbt{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;border:0;border-radius:14px;background:var(--secondary-background-color,rgba(127,127,127,.18));color:inherit;font:700 15px inherit;cursor:pointer}.cbt span{font-size:18px}.cbt.on{background:var(--jg-accent,#f5b544);color:#1f1b16}.cbt:disabled{opacity:.4}
.cbl{display:block;margin:12px 2px 0;font-size:12px;color:var(--secondary-text-color)}.cbl b{float:right;color:var(--primary-text-color)}.cbl input{width:100%;height:32px;margin-top:2px;accent-color:var(--jg-accent,#f5b544)}
.cbsw{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.cbsw button{width:32px;height:32px;border-radius:50%;border:2px solid rgba(255,255,255,.25);cursor:pointer}
.cbd{margin-top:12px;width:100%;border:0;background:none;color:var(--secondary-text-color);font:600 12px inherit;padding:6px;cursor:pointer;text-align:right}
.cbli{max-height:260px;overflow:auto}.cbrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 4px;border-bottom:1px solid var(--divider-color,rgba(127,127,127,.15));cursor:pointer}
.utoast{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:8;display:flex;align-items:center;gap:12px;padding:8px 8px 8px 16px;border-radius:999px;background:rgba(20,19,18,.92);color:#fff;font:600 13px var(--paper-font-body1_-_font-family,system-ui);box-shadow:0 8px 24px rgba(0,0,0,.4);white-space:nowrap}.utoast[hidden]{display:none}.utoast button{border:0;border-radius:999px;background:var(--jg-accent,#f5b544);color:#1f1b16;font:700 12px inherit;padding:8px 12px;cursor:pointer}
.cbub:not([hidden]).dock~.utoast{bottom:auto;top:10px}
.item.clhid{display:none}.clu{cursor:pointer}.clu .touch{fill:transparent;stroke:none}.cld{fill:var(--disc);stroke:var(--txt2);stroke-width:1.5}.clu.on .cld{fill:var(--acc);stroke:#fff}.clt{fill:var(--txt);text-anchor:middle;font-weight:800;pointer-events:none;font-family:var(--paper-font-body1_-_font-family,system-ui)}.clu.on .clt{fill:#1f1b16}
.clu.room .cld{fill:rgba(20,19,18,.7)}.clu.room.on .cld{fill:var(--acc)}
text.rlabel.crowd{opacity:.55}
.wrap.skin-pixel{background:#3f7a33}
svg.skin-pixel{--wall:#3b2f4f;--wtop:#f3e6c8;--wr:#c9b089;--wd:#a98f6c;--txt:#ffffff;--txt2:#fff3c4;--disc:#f3e6c8;--glyph:#3b2f4f;--furn:#6f8fc4;--furnl:#8fb0dd;--acc:#ffd23f}
svg.skin-pixel .pxi{image-rendering:pixelated;image-rendering:crisp-edges}
svg.skin-pixel .wall2d,svg.skin-pixel .pillar2d{fill:#3b2f4f;stroke:#1c1624;stroke-width:2}
svg.skin-pixel .walls polygon{stroke:#1c1624;stroke-width:1.6;stroke-linejoin:miter}
svg.skin-pixel .furn{filter:saturate(1.5) contrast(1.12) brightness(1.08)}svg.skin-pixel .fpart{stroke:#1c1624;stroke-width:2.2;rx:0;ry:0}
svg.skin-pixel .rlabel{font-family:"Courier New",ui-monospace,monospace;font-weight:800;fill:#fff;paint-order:stroke;stroke:#1c1624;stroke-width:3.5px;letter-spacing:.5px}
svg.skin-pixel .item .disc{stroke:#1c1624;stroke-width:2}svg.skin-pixel .item.light .disc,svg.skin-pixel .item.switch .disc,svg.skin-pixel .item.light .glyph,svg.skin-pixel .item.switch .glyph{opacity:0}
svg.skin-pixel .lpon{display:none}svg.skin-pixel .item.on .lpon{display:inline}svg.skin-pixel .item.on .lpoff{display:none}
svg.skin-pixel .room.out{stroke:none}svg.skin-pixel .glass,svg.skin-pixel .leaf.glazed{stroke:#5ec8ff}
.walker{pointer-events:none}.walker image{image-rendering:pixelated}
.wrap.skin-pixel .toast,.wrap.skin-pixel .utoast,.wrap.skin-pixel .alarmbar{border-radius:4px;background:#fdfbf3;color:#1c1624;border:4px double #1c1624;font-family:"Courier New",ui-monospace,monospace;font-weight:800;box-shadow:0 4px 0 #1c1624}
.wrap.skin-pixel .toast::after{content:" ▼";animation:jgblink 1s steps(2) infinite}@keyframes jgblink{50%{opacity:0}}
.wrap.skin-pixel .alarmbar{background:#ffe1e1}.wrap.skin-pixel .cbub{border-radius:6px;border:4px double #1c1624;background:#fdfbf3;color:#1c1624;font-family:"Courier New",ui-monospace,monospace}.wrap.skin-pixel .cbt{border-radius:4px;border:3px solid #1c1624}.wrap.skin-pixel .cbt.on{background:#ffd23f}
.wrap.skin-pixel .seg,.wrap.skin-pixel .seg button,.wrap.skin-pixel .bar button,.wrap.skin-pixel .bar select{border-radius:6px;font-family:"Courier New",ui-monospace,monospace;font-weight:800}
svg.skin-real .furn{filter:drop-shadow(0 6px 5px rgba(0,0,0,.45)) drop-shadow(0 1px 1px rgba(0,0,0,.35))}svg.skin-real .walls{filter:drop-shadow(0 4px 4px rgba(0,0,0,.5))}
svg.skin-real .fpart{stroke:rgba(0,0,0,.18);stroke-width:.8}
.toast{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:3;max-width:90%;padding:9px 14px;border-radius:12px;background:rgba(20,19,18,.88);color:#fff;font:600 13px/1.35 var(--paper-font-body1_-_font-family,system-ui);text-align:center}
.rainw{stroke:var(--err);stroke-width:14;stroke-linecap:round;opacity:0;pointer-events:none}
.rainw.on{animation:jgblink3 1.2s ease-in-out infinite}
@keyframes jgblink3{0%,100%{opacity:.15}50%{opacity:.85}}
.tvglow{opacity:0;transition:opacity .6s;pointer-events:none}.tvglow.on{opacity:1;animation:jgtv 3.2s ease-in-out infinite}
@keyframes jgtv{0%,100%{opacity:.85}40%{opacity:1}60%{opacity:.7}}
.car{cursor:pointer}.car .cbody{fill:none;stroke:var(--txt2);stroke-width:2;stroke-dasharray:8 6;opacity:.5}
.car .croof,.car .cglass{display:none}.car.here .croof,.car.here .cglass{display:block}
.car.here .cbody{fill:#6d7d8c;stroke:#3d4752;stroke-dasharray:none;opacity:1}.car.here .croof{fill:#5d6c7a}.car.here .cglass{fill:#2b3a4a}
.car.charging .cbody{stroke:#5fd17a;stroke-width:6;animation:jgblink3 1.8s ease-in-out infinite}
.ctext{fill:var(--txt);text-anchor:middle;font-weight:700;paint-order:stroke;stroke:var(--floor);stroke-width:3px;pointer-events:none}
.hb{border:0;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color);font:600 12px/1 var(--paper-font-body1_-_font-family,system-ui);padding:9px 12px;border-radius:999px;cursor:pointer;-webkit-appearance:none;appearance:none;max-width:150px}
.hb option{color:#1f1b16;background:#fff}
.legend .sw{display:block;width:12px;height:12px;border-radius:3px}
.fpart{stroke:var(--txt2);stroke-opacity:.38;stroke-width:.8}.fpart.fglass{fill-opacity:.45}
.ffront{stroke:var(--acc);stroke-opacity:.5;stroke-width:1.6;stroke-dasharray:4 3}
.furniture.thin .fpart{fill-opacity:.32}
.witem{cursor:pointer}.witem .touch{fill:transparent}.witem.offline{opacity:.5}.sock.plain{pointer-events:none}
.radi .rad{fill:var(--furnl);stroke:var(--txt2);stroke-width:.8;stroke-opacity:.5;transition:fill .4s}
.radi .fin{stroke:var(--txt2);stroke-opacity:.4;stroke-width:.7;pointer-events:none}
.radi .rglow{fill:none;stroke:#ff7a3d;stroke-width:12;stroke-linejoin:round;opacity:0;transition:opacity .5s;pointer-events:none}
.radi.heat .rad{fill:#e8744a}.radi.heat .rglow{opacity:.28}
.sock .disc{fill:var(--disc);stroke:var(--txt2);stroke-opacity:.55;stroke-width:1;transition:fill .3s}
.sock .pin{fill:var(--txt2);pointer-events:none}
.sock.on .disc{fill:var(--acc);stroke:none}.sock.on .pin{fill:#1f1b16}
.hb.on{background:var(--jg-accent,#f5b544);color:#1f1b16}
.hb[hidden],.legend[hidden]{display:none!important}
.legend{position:absolute;left:12px;bottom:10px;z-index:2;display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:rgba(20,19,18,.6);color:#fff;font:600 11px var(--paper-font-body1_-_font-family,system-ui);pointer-events:none}
.legend i{display:block;width:90px;height:8px;border-radius:4px}
.hfill{opacity:.42;pointer-events:none;transition:fill .6s,opacity .6s}
svg.light .hfill{opacity:.5}
.dev .halo,.vac .halo{fill:var(--acc);opacity:0;transform-box:fill-box;transform-origin:center}
.dev.run .halo,.vac.run .halo{animation:jgpulse 1.8s ease-in-out infinite}
.dev.run .disc{fill:var(--acc);stroke:none}
.emo{text-anchor:middle;pointer-events:none}
.dval{fill:var(--txt);text-anchor:middle;font-weight:700;paint-order:stroke;stroke:var(--floor);stroke-width:3px;pointer-events:none}
.vbody{fill:#2b2a29;stroke:var(--txt2);stroke-width:2}
svg.light .vbody{fill:#3a3836}
.vtop{fill:var(--acc)}
.trail{fill:none;stroke:var(--acc);stroke-opacity:.13;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
@keyframes jgpulse{0%,100%{opacity:.12;transform:scale(.8)}50%{opacity:.45;transform:scale(1.1)}}
@media (prefers-reduced-motion:reduce){.dev.run .halo,.vac.run .halo{animation:none;opacity:.3}}
`;

if (!customElements.get("raumwerk-card")) customElements.define("raumwerk-card", Raumwerk);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "raumwerk-card"))
  window.customCards.push({ type: "raumwerk-card", name: "Raumwerk", description: "Eigener Grundriss (2D/Schräg) mit Licht, Türen, Sensoren und Raum-Panel" });
console.info(`%c RAUMWERK %c ${RW_VERSION} `, "background:#f5b544;color:#1f1b16;font-weight:700", "background:#1f1e1d;color:#f5b544");
