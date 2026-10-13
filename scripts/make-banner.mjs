// Builds profile/banner.svg — dark navy hero with the logo in white, a 96-well test-plate motif,
// and repo chips. All text is converted to vector paths (fontkit + Manrope), so it renders the
// same on every machine. Run inside the MGPL workspace:  node org-profile/scripts/make-banner.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as fontkit from "fontkit";

const here = dirname(fileURLToPath(import.meta.url));
const ws = join(here, "..", "..");
const fontsDir = join(ws, "report-kit", "assets", "report-fonts");
const font = (w) => fontkit.openSync(join(fontsDir, `manrope-${w}.woff`));
const F = { 500: font(500), 600: font(600), 700: font(700), 800: font(800) };

const NAVY = "#14264A", DEEP = "#0C1A35", SAFFRON = "#C2410C", GOLD = "#E9A23B", MIST = "#C8D0E0", WHITE = "#FFFFFF";

// fontkit (react-pdf's font engine): shaping with kerning, and glyph outlines without opentype.js's NaN points
function measure(str, size, weight, spacing = 0) {
  const f = F[weight];
  const run = f.layout(str);
  return run.positions.reduce((a, p) => a + p.xAdvance, 0) * (size / f.unitsPerEm) + spacing * (run.glyphs.length - 1);
}
/** text → <path> (outlines in font units, flipped and scaled into place) */
function text(str, { x, y, size, weight = 800, fill = WHITE, spacing = 0, anchor = "start", opacity }) {
  const f = F[weight];
  const s = size / f.unitsPerEm;
  const run = f.layout(str);
  let cx = anchor === "middle" ? x - measure(str, size, weight, spacing) / 2 : x;
  let d = "";
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i];
    const ox = cx + p.xOffset * s, oy = y - p.yOffset * s;
    d += g.path.mapPoints((px, py) => [ox + px * s, oy - py * s]).toSVG();
    cx += p.xAdvance * s + spacing;
  });
  if (d.includes("NaN")) throw new Error(`NaN in outline for "${str}"`);
  return `<path fill="${fill}"${opacity ? ` opacity="${opacity}"` : ""} d="${d}"/>`;
}
/** rounded chip with label */
function chip(label, x, y, { fill = "rgba(255,255,255,0.08)", stroke = "rgba(255,255,255,0.22)", color = WHITE, dot } = {}) {
  const size = 15, padX = 16, h = 34;
  const w = measure(label, size, 700) + padX * 2 + (dot ? 16 : 0);
  return {
    w,
    svg: `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="17" fill="${fill}" stroke="${stroke}"/>` +
      (dot ? `<circle cx="${x + padX + 4}" cy="${y + h / 2}" r="4.5" fill="${dot}"/>` : "") +
      text(label, { x: x + padX + (dot ? 16 : 0), y: y + 22.5, size, weight: 700, fill: color }),
  };
}

// logo recoloured for a dark background
const logo = readFileSync(join(ws, "report-kit", "assets", "report-assets", "logo.svg"), "utf8")
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "")
  .replace(/<title>[\s\S]*?<\/title>/, "")
  .replace(/#14264A/gi, WHITE)
  .replace(/#675F54/gi, MIST);

const W = 1280, H = 420;

// 96-well plate (8 × 12) whose lit wells form a rising chart — the org keeps growing
const plateX = 905, plateY = 66, pitch = 26, r = 9;
const heights = [1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 8];
let wells = "";
for (let row = 0; row < 8; row++)
  for (let col = 0; col < 12; col++) {
    const cx = plateX + col * pitch, cy = plateY + row * pitch;
    const top = 8 - heights[col];
    const fill = row === top ? SAFFRON : row > top ? GOLD : null;
    const op = row > top ? (0.45 + 0.55 * (col / 11)).toFixed(2) : null;
    wells += fill
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${op && op !== "1.00" ? ` opacity="${op}"` : ""}/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>`;
  }
const plateW = 11 * pitch + 2 * r + 28, plateH = 7 * pitch + 2 * r + 28;
const rowLabels = "ABCDEFGH".split("").map((L, i) => text(L, { x: plateX - 30, y: plateY + i * pitch + 5, size: 11, weight: 700, fill: MIST, opacity: 0.55 })).join("");
const colLabels = Array.from({ length: 12 }, (_, i) => text(String(i + 1), { x: plateX + i * pitch, y: plateY - 18, size: 11, weight: 700, fill: MIST, anchor: "middle", opacity: 0.55 })).join("");

// principle chips — deliberately not repo names, so the banner stays true as the org grows
let cx = 96;
const chips = [
  ["Public repos", GOLD],
  ["Typed APIs", GOLD],
  ["Headless by design", "#7DD3FC"],
  ["Runs anywhere", "#7DD3FC"],
  ["AI-agent ready", "#A7F3D0"],
]
  .map(([label, dot]) => {
    const c = chip(label, cx, 340, { dot });
    cx += c.w + 10;
    return c.svg;
  })
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="MGPL Diagnostics — building the future of diagnostic software, in public">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="${DEEP}"/></linearGradient>
    <radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${SAFFRON}" stop-opacity="0.45"/><stop offset="1" stop-color="${SAFFRON}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${GOLD}" stop-opacity="0.28"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#FFFFFF" opacity="0.06"/></pattern>
    <linearGradient id="bar" x1="0" x2="1"><stop offset="0" stop-color="${SAFFRON}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>
    <clipPath id="round"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#dots)"/>
    <circle cx="1040" cy="380" r="330" fill="url(#glowA)"/>
    <circle cx="140" cy="-40" r="260" fill="url(#glowB)"/>

    <svg x="84" y="42" width="300" height="126" viewBox="60 68 920 388">${logo}</svg>

    ${text("Building the future", { x: 96, y: 222, size: 48, weight: 800 })}
    ${text("of diagnostic software.", { x: 96, y: 278, size: 48, weight: 800, fill: GOLD })}
    ${text("A growing family of public, modular repos for modern pathology labs.", { x: 98, y: 314, size: 17, weight: 600, fill: MIST, opacity: 0.85 })}
    ${chips}

    <g>
      <rect x="${plateX - 46}" y="${plateY - 40}" width="${plateW + 32}" height="${plateH + 26}" rx="22" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.14)"/>
      ${colLabels}${rowLabels}${wells}
    </g>
    ${text("BUILT IN PUBLIC", { x: plateX + 143, y: 322, size: 13, weight: 800, fill: GOLD, spacing: 3, anchor: "middle" })}
    ${text("Maa Gayatri Path Lab  ·  Arang, Raipur", { x: plateX + 143, y: 348, size: 14, weight: 600, fill: MIST, anchor: "middle", opacity: 0.75 })}

    <rect y="${H - 8}" width="${W}" height="8" fill="url(#bar)"/>
  </g>
</svg>
`;
writeFileSync(join(here, "..", "profile", "banner.svg"), svg);
console.log(`profile/banner.svg  ${(svg.length / 1024).toFixed(0)} KB`);
