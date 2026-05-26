// sketch.js — Asteroid Impact entry point.
//
// State machine:
//   intro      → planets orbit slowly, user can drag to aim
//   aiming     → pointer is held, arrow follows pointer
//   live       → asteroid + ghost cloud are simulating, year counter runs
//   done       → year 50 reached, banner + reset button shown
//
// Time is in years throughout (see system.js / physics.js). Real-time dt is
// multiplied by `timeScaleYearsPerSec` to get year-time per frame.

const VEL_SCALE = 10;          // px/yr per pixel of drag
const MAX_VEL = 1800;          // px/yr — cap so a user can't go absurdly fast
const TOTAL_YEARS = 50;
const INTRO_YR_PER_SEC = 0.45;
const LIVE_YR_PER_SEC = 2.4;
const TIME_RAMP_DURATION = 0.6;   // real seconds for time-scale to ramp

let phase = "intro";
let simYears = 0;              // ever-advancing year clock (for planet/comet)
let elapsedYears = 0;          // years since launch (resets each launch)
let mainAsteroid = null;
let ghosts = [];
let stats = newStats();
let aimStart = null;
let aimCurrent = null;
let draggingSlider = false;
let massIdx = 5;
let timeScale = INTRO_YR_PER_SEC;
let targetTimeScale = INTRO_YR_PER_SEC;
let lastFrameMs = 0;

function newStats() {
  return { hits: 0, sun: 0, otherPlanet: 0, escape: 0, orbiting: 0, completed: 0 };
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  textFont("system-ui, -apple-system, sans-serif");
  buildSystem();
  // Stagger planets so we don't start with everyone in a line.
  simYears = random(0, 80);
  updateSystem(simYears);
  lastFrameMs = millis();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildSystem();
  // After a resize the world is fresh — drop any in-flight bodies, restart.
  resetSimulation();
}

function resetSimulation() {
  mainAsteroid = null;
  ghosts = [];
  stats = newStats();
  elapsedYears = 0;
  phase = "intro";
  aimStart = null;
  aimCurrent = null;
  targetTimeScale = INTRO_YR_PER_SEC;
  if (system.comet) system.comet.resetTrail();
}

function draw() {
  const now = millis();
  const dtReal = Math.min((now - lastFrameMs) / 1000, 0.05);
  lastFrameMs = now;

  // Ramp the time scale toward its target so the launch acceleration is smooth.
  const ramp = dtReal / TIME_RAMP_DURATION;
  if (timeScale < targetTimeScale) timeScale = Math.min(targetTimeScale, timeScale + (LIVE_YR_PER_SEC - INTRO_YR_PER_SEC) * ramp);
  else if (timeScale > targetTimeScale) timeScale = Math.max(targetTimeScale, timeScale - (LIVE_YR_PER_SEC - INTRO_YR_PER_SEC) * ramp);

  let dtYears = Math.min(dtReal * timeScale, MAX_DT_YR);

  // Hold time during aiming so trajectory targeting isn't a moving puzzle.
  if (phase === "aiming") dtYears = 0;
  // Freeze entirely when done so the final tableau is readable.
  if (phase === "done") dtYears = 0;

  simYears += dtYears;
  if (phase === "live") {
    elapsedYears += dtYears;
    if (elapsedYears >= TOTAL_YEARS) {
      finishSimulation();
    }
  }

  // Update planet + comet positions for this frame.
  updateSystem(simYears);
  system.sun.update(dtYears);
  if (system.comet && phase !== "done" && phase !== "aiming") {
    if (frameCount % 3 === 0) system.comet.recordTrail();
  }

  // Step asteroid + ghosts.
  if (phase === "live" && dtYears > 0) {
    if (mainAsteroid) mainAsteroid.step(dtYears, elapsedYears);
    for (const g of ghosts) g.step(dtYears);
    accumulateStats();
  }

  render();
}

function render() {
  background(5, 6, 10);

  drawOrbitRings();

  // Sun and planets
  system.sun.draw(system.sun.x, system.sun.y, system.sun.radius);
  for (const p of system.planets) p.draw();

  // Comet
  if (system.comet) system.comet.draw(system.sun.x, system.sun.y);

  // Ghosts under the main asteroid so it stays visually dominant.
  for (const g of ghosts) g.draw();
  if (mainAsteroid) mainAsteroid.draw();
  if (mainAsteroid && phase === "live") drawAsteroidVelocityTag(mainAsteroid);

  drawAimingArrow(aimStart, aimCurrent);

  // HUD
  drawBackHotspot(mouseX, mouseY);
  drawTitle();
  drawCometLabel();
  drawMassSlider(mouseX, mouseY, massIdx, phase === "intro");
  drawInstructions(phase);
  drawYearBadge(elapsedYears, TOTAL_YEARS, phase);
  drawProbabilityPanel(stats, phase);

  if (phase === "done") {
    drawResultBanner(mainAsteroid, stats);
    drawResetButton(mouseX, mouseY, phase);
  }

  // Cursor feedback
  const hovering = pointInRect(mouseX, mouseY, hud.back)
    || (phase === "done" && pointInRect(mouseX, mouseY, hud.reset))
    || (phase === "intro" && pointInRect(mouseX, mouseY, sliderHitRect()));
  cursor(hovering ? "pointer" : (phase === "intro" ? "crosshair" : "default"));
}

function drawCometLabel() {
  if (!system.comet) return;
  const s = uiScale();
  const c = system.comet;
  // Only label when comet is fairly visible (not lost in the sun glare or
  // off-screen).
  if (c.distFromSun < system.sun.radius * 3) return;
  if (c.x < 0 || c.x > width || c.y < 0 || c.y > height) return;
  noStroke();
  fill(200, 220, 255, 160);
  textSize(11 * s);
  textAlign(LEFT, BASELINE);
  text("Halley-like comet · 70 yr orbit", c.x + 10 * s, c.y - 8 * s);
}

function accumulateStats() {
  let completed = 0;
  let hits = 0, sun = 0, otherPlanet = 0, escape = 0, orbiting = 0;
  for (const g of ghosts) {
    if (!g.alive) {
      completed++;
      if (g.outcome === "Earth") hits++;
      else if (g.outcome === "sun") sun++;
      else if (g.outcome === "escape") escape++;
      else if (g.outcome) otherPlanet++;
    }
  }
  // If 50 years have elapsed, any still-alive ghosts are "orbiting" — still
  // out there, not a hit. We count them as completed misses.
  if (phase !== "live") {
    for (const g of ghosts) {
      if (g.alive) { completed++; orbiting++; }
    }
  }
  stats = { hits, sun, otherPlanet, escape, orbiting, completed };
}

function finishSimulation() {
  phase = "done";
  targetTimeScale = INTRO_YR_PER_SEC;
  // If the main asteroid is still flying at year 50, record it as orbiting.
  if (mainAsteroid && mainAsteroid.alive) {
    mainAsteroid.outcome = null;
    mainAsteroid.outcomeYear = TOTAL_YEARS;
  }
  accumulateStats();
}

function launchAsteroid(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 6) return;

  const speed = Math.min(MAX_VEL, len * VEL_SCALE);
  const nx = dx / len, ny = dy / len;

  const vx = nx * speed;
  const vy = ny * speed;

  mainAsteroid = new Asteroid(start.x, start.y, vx, vy, massIdx);
  ghosts = spawnGhosts(start.x, start.y, vx, vy, massIdx);
  elapsedYears = 0;
  stats = newStats();
  phase = "live";
  targetTimeScale = LIVE_YR_PER_SEC;
}

// ---- Pointer handling -----------------------------------------------------

function pointerDown(px, py) {
  // Back hotspot has priority everywhere.
  if (pointInRect(px, py, hud.back)) {
    window.location.href = "../../";
    return;
  }
  if (phase === "done") {
    if (pointInRect(px, py, hud.reset)) {
      resetSimulation();
      return;
    }
    return;
  }
  if (phase !== "intro") return;

  // Slider check first
  if (pointInRect(px, py, sliderHitRect())) {
    draggingSlider = true;
    const v = sliderHandlePointer(px, py, massIdx);
    if (v != null) massIdx = v;
    return;
  }

  // Don't start an aim from inside the sun (would spawn inside).
  if (Math.hypot(px - system.sun.x, py - system.sun.y) < system.sun.radius * 1.2) return;

  aimStart = { x: px, y: py };
  aimCurrent = { x: px, y: py };
}

function pointerMove(px, py) {
  if (draggingSlider) {
    const v = sliderHandlePointer(px, py, massIdx);
    if (v != null) massIdx = v;
    return;
  }
  if (aimStart) aimCurrent = { x: px, y: py };
}

function pointerUp(px, py) {
  if (draggingSlider) {
    draggingSlider = false;
    return;
  }
  if (aimStart && aimCurrent) {
    launchAsteroid(aimStart, aimCurrent);
  }
  aimStart = null;
  aimCurrent = null;
}

function mousePressed() { pointerDown(mouseX, mouseY); }
function mouseDragged() { pointerMove(mouseX, mouseY); }
function mouseReleased() { pointerUp(mouseX, mouseY); }

function touchStarted() {
  const t = touches && touches.length > 0 ? touches[0] : { x: mouseX, y: mouseY };
  pointerDown(t.x, t.y);
  return false;
}
function touchMoved() {
  const t = touches && touches.length > 0 ? touches[0] : { x: mouseX, y: mouseY };
  pointerMove(t.x, t.y);
  return false;
}
function touchEnded() {
  // touches[] is already empty here; mouseX/Y still hold the last position.
  pointerUp(mouseX, mouseY);
  return false;
}
