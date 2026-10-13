// Builds profile/avatar.svg + profile/avatar.png (1024 × 1024) — the organisation's profile picture.
// The logo's drop icon in white on the banner's navy gradient. GitHub has no API for org avatars:
// upload avatar.png at github.com/organizations/mgpl-diagnostics/settings/profile.
// Run inside the MGPL workspace:  node org-profile/scripts/make-avatar.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const here = dirname(fileURLToPath(import.meta.url));
const ws = join(here, "..", "..");
const NAVY = "#14264A", DEEP = "#0C1A35", SAFFRON = "#C2410C", GOLD = "#E9A23B", WHITE = "#FFFFFF";

// the logo's <g id="icon"> (drop + lotus + dot), drop recoloured white
const logo = readFileSync(join(ws, "report-kit", "assets", "report-assets", "logo.svg"), "utf8");
const icon = logo.match(/<g id="icon">([\s\S]*?)<\/g>/)[1].replace(/#14264A/gi, WHITE);

// icon bounds in logo units: x 84–316, y 92–432 (centre 200, 262)
const S = 1024, scale = 1.9, cx = 200, cy = 262;
const tx = S / 2 - cx * scale, ty = S / 2 - cy * scale;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" role="img" aria-label="MGPL Diagnostics">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="${DEEP}"/></linearGradient>
    <radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${SAFFRON}" stop-opacity="0.42"/><stop offset="1" stop-color="${SAFFRON}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${GOLD}" stop-opacity="0.22"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <circle cx="${S * 0.82}" cy="${S * 0.9}" r="${S * 0.55}" fill="url(#glowA)"/>
  <circle cx="${S * 0.12}" cy="${S * 0.05}" r="${S * 0.45}" fill="url(#glowB)"/>
  <g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${scale})">${icon}</g>
</svg>
`;
const out = join(here, "..", "profile");
writeFileSync(join(out, "avatar.svg"), svg);
writeFileSync(join(out, "avatar.png"), new Resvg(svg, { fitTo: { mode: "width", value: S } }).render().asPng());
console.log("profile/avatar.svg + profile/avatar.png (1024 × 1024)");
