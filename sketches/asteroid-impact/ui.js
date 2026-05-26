// ui.js — controls (mass slider, reset/launch buttons) and HUD overlays.
//
// Sliders/buttons live as plain rectangles drawn onto the canvas — no DOM —
// so they scale with the canvas across phone/tablet/desktop. Hit-testing is
// just rect-contains on pointer events forwarded from sketch.js.

const MASS_LABELS = [
  "House",
  "City block",
  "Football field",
  "Small mountain",
  "Tunguska 1908",
  "Barringer crater",
  "Apophis",
  "Chicxulub",
  "Vesta-class",
  "Dwarf planet",
];
const MASS_DESCRIPTIONS = [
  "~10 m · ~10⁶ kg",
  "~50 m · ~10⁸ kg",
  "~100 m · ~10⁹ kg",
  "~300 m · ~10¹⁰ kg",
  "~600 m · ~10¹¹ kg",
  "~1 km · ~10¹² kg",
  "~2 km · ~10¹³ kg",
  "~10 km · ~10¹⁵ kg",
  "~100 km · ~10¹⁸ kg",
  "~500 km · ~10²⁰ kg",
];

// Hit regions filled in by drawUI on every frame so they track resizes.
const hud = {
  back: { x: 0, y: 0, w: 0, h: 0 },
  slider: { x: 0, y: 0, w: 0, h: 0, knobX: 0 },
  reset: { x: 0, y: 0, w: 0, h: 0 },
};

function drawBackHotspot(mx, my) {
  const s = uiScale();
  hud.back = { x: 16 * s, y: 16 * s, w: 220 * s, h: 44 * s };
  const hovered = pointInRect(mx, my, hud.back);
  noStroke();
  fill(231, 236, 243, hovered ? 240 : 190);
  textSize(16 * s);
  textAlign(LEFT, BASELINE);
  text("← Gallery", hud.back.x + 8 * s, hud.back.y + 28 * s);
}

function drawTitle() {
  const s = uiScale();
  noStroke();
  fill(231, 236, 243);
  textAlign(CENTER, BASELINE);
  textSize(20 * s);
  textStyle(BOLD);
  text("Asteroid Impact Probability", width / 2, 36 * s);
  textStyle(NORMAL);
  textSize(13 * s);
  fill(138, 147, 166);
  text("50 cycles · log-scaled solar system", width / 2, 56 * s);
  textAlign(LEFT, BASELINE);
}

function drawMassSlider(mx, my, value, interactive) {
  const s = uiScale();
  const w = clamp(width * 0.34, 220 * s, 460 * s);
  const h = 6 * s;
  const x = 24 * s;
  const y = height - 80 * s;
  hud.slider = { x, y, w, h, knobX: x + (w * (value - 1)) / 9 };

  noStroke();
  fill(231, 236, 243, 220);
  textSize(12 * s);
  textAlign(LEFT, BASELINE);
  text("ASTEROID MASS", x, y - 26 * s);

  // Track
  fill(40, 50, 70);
  rect(x, y, w, h, h / 2);
  // Fill up to knob
  fill(77, 134, 255, 220);
  rect(x, y, hud.slider.knobX - x, h, h / 2);

  // Knob
  const knobR = 12 * s;
  const hovered = interactive && Math.hypot(mx - hud.slider.knobX, my - (y + h / 2)) < knobR * 1.4;
  fill(hovered ? 200 : 150, hovered ? 220 : 180, 255);
  circle(hud.slider.knobX, y + h / 2, knobR * 2);
  fill(5, 6, 10);
  circle(hud.slider.knobX, y + h / 2, knobR * 0.6);

  // Label + description
  fill(231, 236, 243);
  textSize(15 * s);
  textStyle(BOLD);
  text(MASS_LABELS[value - 1], x, y + 32 * s);
  textStyle(NORMAL);
  textSize(12 * s);
  fill(138, 147, 166);
  text(MASS_DESCRIPTIONS[value - 1], x, y + 50 * s);
}

function drawInstructions(phase) {
  if (phase !== "intro") return;
  const s = uiScale();
  noStroke();
  fill(231, 236, 243, 220);
  textAlign(CENTER, BASELINE);
  textSize(15 * s);
  text("Drag from anywhere outside the sun to aim your asteroid.",
       width / 2, height - 32 * s);
  textSize(12 * s);
  fill(138, 147, 166);
  text("Longer drag → faster launch. Release to fire.",
       width / 2, height - 14 * s);
  textAlign(LEFT, BASELINE);
}

function drawAimingArrow(start, current) {
  if (!start || !current) return;
  const s = uiScale();
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;

  stroke(255, 220, 160, 200);
  strokeWeight(2 * s);
  line(start.x, start.y, current.x, current.y);
  // Arrow head
  const a = Math.atan2(dy, dx);
  const ah = 10 * s;
  noStroke();
  fill(255, 220, 160);
  push();
  translate(current.x, current.y);
  rotate(a);
  triangle(0, 0, -ah, ah * 0.6, -ah, -ah * 0.6);
  pop();

  // Start point indicator
  noStroke();
  fill(255, 230, 200);
  circle(start.x, start.y, 5 * s);

  // Velocity readout — in fractions of c, given screen→AU mapping.
  fill(231, 236, 243, 220);
  textSize(11 * s);
  textAlign(LEFT, BASELINE);
  const pxPerYr = Math.min(MAX_VEL, len * VEL_SCALE);
  const fracC = pxPerYearToFractionC(pxPerYr, system.orbitR["Earth"]);
  text(`v ≈ ${formatLightspeed(fracC)}`, current.x + 12 * s, current.y - 8 * s);
}

// Draw a velocity tag pinned to the live asteroid, in % c.
function drawAsteroidVelocityTag(asteroid) {
  if (!asteroid || !asteroid.alive) return;
  const s = uiScale();
  const speed = Math.hypot(asteroid.vx, asteroid.vy);
  const fracC = pxPerYearToFractionC(speed, system.orbitR["Earth"]);
  const label = formatLightspeed(fracC);
  // Offset above-right of the asteroid. Clamp inside the screen edges.
  let lx = asteroid.x + 10 * s;
  let ly = asteroid.y - 10 * s;
  textSize(11 * s);
  textAlign(LEFT, BASELINE);
  const w = textWidth(label) + 12 * s;
  if (lx + w > width - 8 * s) lx = asteroid.x - w - 4 * s;
  if (ly < 16 * s) ly = asteroid.y + 22 * s;

  noStroke();
  fill(5, 6, 10, 180);
  rect(lx - 4 * s, ly - 12 * s, w, 16 * s, 4 * s);
  fill(255, 220, 170);
  text(label, lx + 2 * s, ly);
}

function drawYearBadge(elapsedYears, totalYears, phase) {
  if (phase === "intro") return;
  const s = uiScale();
  const cx = width / 2;
  const cy = 96 * s;
  noStroke();
  fill(13, 16, 24, 220);
  rectMode(CENTER);
  rect(cx, cy, 220 * s, 50 * s, 8 * s);
  rectMode(CORNER);
  fill(231, 236, 243);
  textAlign(CENTER, CENTER);
  textSize(22 * s);
  textStyle(BOLD);
  text(`YEAR ${elapsedYears.toFixed(1)} / ${totalYears}`, cx, cy);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}

function drawProbabilityPanel(stats, phase) {
  if (phase === "intro") return;
  const s = uiScale();
  const panelW = clamp(width * 0.28, 220 * s, 360 * s);
  const x = width - panelW - 24 * s;
  const y = height - 130 * s;

  noStroke();
  fill(13, 16, 24, 220);
  rect(x, y, panelW, 110 * s, 8 * s);

  fill(138, 147, 166);
  textSize(11 * s);
  textAlign(LEFT, BASELINE);
  text("PROBABILITY OF EARTH IMPACT", x + 14 * s, y + 22 * s);

  const total = Math.max(1, stats.completed);
  const pct = (100 * stats.hits) / Math.max(1, stats.completed);
  const pctText = stats.completed > 0 ? pct.toFixed(0) + "%" : "—";
  const big = stats.hits > 0 ? [120, 220, 160] : [231, 236, 243];
  fill(big[0], big[1], big[2]);
  textSize(40 * s);
  textStyle(BOLD);
  text(pctText, x + 14 * s, y + 64 * s);
  textStyle(NORMAL);

  fill(138, 147, 166);
  textSize(12 * s);
  text(`from ${GHOST_COUNT} trial trajectories`, x + 14 * s, y + 86 * s);

  // Outcome breakdown
  textSize(11 * s);
  let cx = x + 14 * s, cy = y + 102 * s;
  fill(120, 220, 160);
  text(`hits ${stats.hits}`, cx, cy);
  cx += 64 * s;
  fill(200, 160, 120);
  text(`other ${stats.otherPlanet}`, cx, cy);
  cx += 76 * s;
  fill(255, 180, 120);
  text(`sun ${stats.sun}`, cx, cy);
  cx += 56 * s;
  fill(138, 160, 200);
  text(`gone ${stats.escape + stats.orbiting}`, cx, cy);
}

function drawResetButton(mx, my, phase) {
  if (phase !== "done") return null;
  const s = uiScale();
  const w = 220 * s, h = 48 * s;
  const x = width / 2 - w / 2;
  const y = height / 2 + 80 * s;
  hud.reset = { x, y, w, h };

  const hovered = pointInRect(mx, my, hud.reset);
  noStroke();
  fill(hovered ? 99 : 77, hovered ? 154 : 134, 255);
  rect(x, y, w, h, 10 * s);
  fill(5, 6, 10);
  textAlign(CENTER, CENTER);
  textSize(16 * s);
  textStyle(BOLD);
  text("LAUNCH ANOTHER", x + w / 2, y + h / 2);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}

function drawResultBanner(asteroid, stats) {
  const s = uiScale();
  const cx = width / 2;
  const cy = height / 2 - 30 * s;

  noStroke();
  fill(5, 6, 10, 200);
  rect(0, cy - 60 * s, width, 160 * s);

  let headline = "50 years elapsed";
  let detail = "Your asteroid stayed in orbit — no impact.";
  let color = [231, 236, 243];

  if (asteroid && asteroid.outcome === "Earth") {
    headline = "DIRECT HIT";
    detail = `Your asteroid struck Earth at year ${asteroid.outcomeYear.toFixed(1)}.`;
    color = [120, 220, 160];
  } else if (asteroid && asteroid.outcome === "sun") {
    headline = "SOLAR IMPACT";
    detail = `Your asteroid fell into the sun at year ${asteroid.outcomeYear.toFixed(1)}.`;
    color = [255, 200, 130];
  } else if (asteroid && asteroid.outcome === "escape") {
    headline = "ESCAPED";
    detail = `Your asteroid left the solar system at year ${asteroid.outcomeYear.toFixed(1)}.`;
    color = [138, 160, 200];
  } else if (asteroid && asteroid.outcome) {
    headline = `CAPTURED BY ${asteroid.outcome.toUpperCase()}`;
    detail = `Your asteroid hit ${asteroid.outcome} at year ${asteroid.outcomeYear.toFixed(1)}.`;
    color = [220, 180, 140];
  }

  fill(color[0], color[1], color[2]);
  textAlign(CENTER, BASELINE);
  textSize(34 * s);
  textStyle(BOLD);
  text(headline, cx, cy);
  textStyle(NORMAL);
  textSize(14 * s);
  fill(231, 236, 243);
  text(detail, cx, cy + 26 * s);

  const total = Math.max(1, stats.completed);
  const pct = (100 * stats.hits) / total;
  textSize(12 * s);
  fill(138, 147, 166);
  text(`Monte Carlo estimate: ${pct.toFixed(0)}% impact probability over 50 cycles`,
       cx, cy + 48 * s);
  textAlign(LEFT, BASELINE);
}

function sliderHitRect() {
  const s = uiScale();
  return {
    x: hud.slider.x - 18 * s,
    y: hud.slider.y - 22 * s,
    w: hud.slider.w + 36 * s,
    h: 56 * s,
  };
}

function sliderHandlePointer(mx, my, currentValue) {
  if (!pointInRect(mx, my, sliderHitRect())) return null;
  const t = clamp((mx - hud.slider.x) / hud.slider.w, 0, 1);
  return Math.round(1 + t * 9);
}
