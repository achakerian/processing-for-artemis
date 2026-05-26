// util.js — shared helpers for the Asteroid Impact sketch.

function uiScale() {
  return constrain(min(width, height) / 900, 0.75, 4.0);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

// Standard normal sample via Box-Muller.
function gaussian() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Unicode superscripts for compact scientific notation.
const SUPERSCRIPTS = {
  "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","-":"⁻"
};
function toSuper(n) {
  return String(n).split("").map((c) => SUPERSCRIPTS[c] || c).join("");
}

// Physical-unit constants — the log-scaled screen maps 1 AU → Earth's screen
// orbit radius, so we can quote velocities in fractions of c.
const AU_IN_METERS = 1.496e11;
const SEC_PER_YEAR = 3.1557e7;
const SPEED_OF_LIGHT_MS = 2.998e8;

// Convert screen px/year to fraction of the speed of light.
function pxPerYearToFractionC(pxPerYr, pxPerAu) {
  if (!pxPerAu || pxPerAu <= 0) return 0;
  const mPerSec = (pxPerYr / pxPerAu) * AU_IN_METERS / SEC_PER_YEAR;
  return mPerSec / SPEED_OF_LIGHT_MS;
}

// Format a lightspeed fraction. Small values fall back to scientific notation.
function formatLightspeed(fracC) {
  if (!isFinite(fracC) || fracC <= 0) return "0 c";
  if (fracC >= 0.01) return `${(fracC * 100).toFixed(2)}% c`;
  if (fracC >= 1e-4) return `${(fracC * 100).toFixed(3)}% c`;
  const exp = Math.floor(Math.log10(fracC));
  const mantissa = fracC / Math.pow(10, exp);
  return `${mantissa.toFixed(2)} × 10${toSuper(exp)} c`;
}

// Newton solve for Kepler's equation E - e·sin(E) = M.
function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 6; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    E -= f / fp;
  }
  return E;
}
