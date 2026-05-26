// sketch.js — Magnetosphere
//
// Static sun (left) and Earth (right) at log-compressed sizes & distance.
// Realistic-ish dipole field lines around Earth, asymmetric: compressed on
// the sun-facing side, stretched into a magnetotail downstream.
//
// Tap the sun (or wait — flares auto-fire) to launch a burst of charged
// particles. On reaching the magnetopause, each particle either:
//   - ENERGISES (becomes an aurora photon, brightens, fades out). Probability
//     scales with magnetic latitude — most likely at the poles, least at the
//     equator. Energised particles also light up the auroral oval.
//   - BOUNCES specularly off the magnetopause and flies into deep space.
//     Once it leaves the screen, it's removed from the dataset.
//
// When particles strike the field, nearby field lines briefly brighten and
// wobble, then settle back.

const AUTO_FLARE_INTERVAL = 9.0;
const INITIAL_CALM = 4.0;

const ENERGIZE_BASE = 0.08;
const ENERGIZE_POLE = 0.70;
const ENERGIZE_FADE = 1.4;

let sunPos, earthPos;
let sunR, earthR;
let stars = [];

let fieldLines = [];
let auroraN = 0;
let auroraS = 0;
let bowShockPressure = 0;

let flares = [];
let flareTimer = INITIAL_CALM;

let backHotspot = null;
let sunHintFade = 1;
let lastMs = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  textFont("system-ui, -apple-system, sans-serif");
  buildScene();
  lastMs = millis();
}

function uiScale() {
  return constrain(min(width, height) / 900, 0.75, 4.0);
}

function buildScene() {
  const s = uiScale();

  // Log-compressed: real sun/Earth radius ratio is ~109×, real distance is
  // ~215 sun-radii. On screen we use ~3× radius ratio and ~5 sun-radii of
  // distance so both bodies are clearly visible and the magnetosphere has
  // room to breathe.
  sunR = min(width, height) * 0.085;
  earthR = sunR / 3.0;
  sunPos = { x: width * 0.16, y: height * 0.5 };
  earthPos = { x: width * 0.82, y: height * 0.5 };

  stars = [];
  for (let i = 0; i < 260; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      r: random(0.3, 1.7),
      a: random(50, 200),
    });
  }

  // L-shell values: equatorial extent of each dipole field line in Earth radii.
  fieldLines = [];
  const Lvals = [1.25, 1.55, 1.9, 2.3, 2.8, 3.4];
  for (const L of Lvals) {
    fieldLines.push({
      L,
      wobble: 0,
      wobblePhase: random(TWO_PI),
    });
  }

  backHotspot = { x: 16 * s, y: 16 * s, w: 200 * s, h: 44 * s };
}

function draw() {
  const now = millis();
  const dt = min((now - lastMs) / 1000, 0.05);
  lastMs = now;

  background(5, 6, 10);

  drawStars();

  flareTimer -= dt;
  if (flareTimer <= 0) {
    fireFlare();
    flareTimer = AUTO_FLARE_INTERVAL;
  }

  drawSun(sunPos.x, sunPos.y, sunR);

  drawMagnetopause();
  drawFieldLines();

  // Particles update + draw between field and earth so they read clearly.
  for (const f of flares) f.update(dt);
  flares = flares.filter((f) => !f.dead);
  for (const f of flares) f.draw();

  drawEarth(earthPos.x, earthPos.y, earthR);
  drawAurora();

  // Decay state
  auroraN = max(0, auroraN - dt * 0.45);
  auroraS = max(0, auroraS - dt * 0.45);
  bowShockPressure = max(0, bowShockPressure - dt * 0.9);
  for (const fl of fieldLines) {
    fl.wobble = max(0, fl.wobble - dt * 0.6);
    fl.wobblePhase += dt * 6;
  }

  drawBackHotspot();
  drawHint();
}

function drawStars() {
  noStroke();
  for (const st of stars) {
    fill(231, 236, 243, st.a);
    circle(st.x, st.y, st.r);
  }
}

function drawSun(cx, cy, r) {
  const t = millis() / 1000;
  noStroke();
  for (let i = 6; i > 0; i--) {
    const wob = 0.05 * sin(t * 0.5 + i);
    fill(255, 180, 90, 22 / i);
    circle(cx, cy, r * 2 * (1 + i * 0.32 + wob));
  }
  fill(255, 210, 90);
  circle(cx, cy, r * 2);
  fill(255, 240, 200);
  circle(cx, cy, r * 1.4);
  fill(255, 245, 210, 140);
  for (let i = 0; i < 5; i++) {
    const a = t * 0.7 + i * 1.7;
    circle(cx + cos(a) * r * 0.55, cy + sin(a) * r * 0.55, r * 0.13);
  }
}

function drawEarth(cx, cy, r) {
  noStroke();
  fill(45, 80, 140);
  circle(cx, cy, r * 2);
  fill(78, 135, 195);
  circle(cx, cy, r * 1.92);
  fill(70, 160, 120, 210);
  push();
  translate(cx, cy);
  rotate(0.4);
  ellipse(-r * 0.3, -r * 0.15, r * 0.9, r * 0.5);
  ellipse(r * 0.25, r * 0.2, r * 0.7, r * 0.55);
  ellipse(r * 0.55, -r * 0.4, r * 0.4, r * 0.3);
  pop();
  // night-side terminator: slight darkening on the side opposite the sun.
  // sun is to the left, so the right side of Earth is night.
  noFill();
  for (let i = 0; i < 8; i++) {
    stroke(5, 6, 10, 28 - i * 3);
    strokeWeight(1);
    arc(cx, cy, r * 2 - i * 0.6, r * 2 - i * 0.6, -HALF_PI, HALF_PI);
  }
  noStroke();
}

// ---- magnetic field ----

// In our layout the sun is to the LEFT of Earth, so:
//   particle dx < 0  → sun-facing side  → magnetopause is COMPRESSED here
//   particle dx > 0  → night side       → magnetotail STRETCHES here
// Magnetopause shrinks under bombardment, dayside more than the tail —
// matching the actual response of Earth's magnetosphere to a CME impact.
// bowShockPressure (0..1) drives both the geometric compression here and
// the bright pulse in drawMagnetopause.
function magnetopauseRadius(ang) {
  const c = cos(ang);            // -1 at sun side, +1 at tail
  const t = (c + 1) / 2;         // 0 sun side, 1 tail
  const bs = bowShockPressure;
  const sun_side = 2.6 * earthR * (1 - 0.55 * bs);   // strong dayside crush
  const tail = 5.5 * earthR * (1 - 0.10 * bs);       // tail mostly holds
  return lerp(sun_side, tail, t);
}

// Asymmetry multiplier for drawn field lines. The sun-facing side also
// shrinks under bombardment so field lines visibly compress with the
// magnetopause they live inside of.
function asymmetryFactor(dxR) {
  if (dxR < 0) return 0.7 * (1 - 0.5 * bowShockPressure);
  return 1 + 1.1 * (1 - exp(-dxR / 2.8));
}

function drawMagnetopause() {
  const cx = earthPos.x;
  const cy = earthPos.y;
  const baseAlpha = 30 + bowShockPressure * 110;

  // Bow shock: a teardrop boundary opening downstream.
  noFill();
  stroke(140, 210, 255, baseAlpha);
  strokeWeight((1.0 + bowShockPressure * 1.6) * uiScale());
  beginShape();
  for (let ang = 0; ang < TWO_PI + 0.01; ang += 0.04) {
    const R = magnetopauseRadius(ang);
    const x = cx + cos(ang) * R;
    const y = cy + sin(ang) * R;
    vertex(x, y);
  }
  endShape();

  // Optional inner faint outline (the magnetopause proper, slightly inside)
  stroke(140, 210, 255, baseAlpha * 0.6);
  strokeWeight(0.8 * uiScale());
  beginShape();
  for (let ang = 0; ang < TWO_PI + 0.01; ang += 0.06) {
    const R = magnetopauseRadius(ang) * 0.88;
    vertex(cx + cos(ang) * R, cy + sin(ang) * R);
  }
  endShape();
}

function drawFieldLines() {
  const cx = earthPos.x;
  const cy = earthPos.y;
  const R = earthR;

  for (const fl of fieldLines) {
    const wobAmp = fl.wobble * R * 0.22;
    const alpha = 60 + fl.wobble * 130;
    stroke(140, 215, 255, alpha);
    strokeWeight((0.9 + fl.wobble * 1.3) * uiScale());
    noFill();

    // side = -1 → sun-facing half (compressed)
    // side = +1 → tail half (stretched)
    for (const side of [-1, 1]) {
      beginShape();
      for (let theta = 0.06; theta < PI - 0.06; theta += 0.035) {
        const r = R * fl.L * sin(theta) * sin(theta);
        let dx = side * r * sin(theta);
        const dy = -r * cos(theta);
        dx *= asymmetryFactor(dx / R);
        const wob = wobAmp * sin(fl.wobblePhase + theta * 4 + side);
        vertex(cx + dx, cy + dy + wob);
      }
      endShape();
    }
  }
}

// ---- aurora ----

function drawAurora() {
  const cx = earthPos.x;
  const cy = earthPos.y;
  if (auroraN > 0.01) drawAuroraArc(cx, cy, -1, auroraN);
  if (auroraS > 0.01) drawAuroraArc(cx, cy, +1, auroraS);
}

function drawAuroraArc(cx, cy, sgn, intensity) {
  const a = constrain(intensity, 0, 1);
  push();
  translate(cx, cy + sgn * earthR * 0.85);
  noFill();
  for (let i = 0; i < 4; i++) {
    stroke(120, 255 - i * 25, 180 - i * 18, a * (200 - i * 38));
    strokeWeight((4 + i * 2) * uiScale());
    const w = earthR * (1.0 + i * 0.2);
    const h = earthR * (0.45 + i * 0.12);
    // sgn=-1: above earth → draw the lower half of the local ellipse
    // sgn=+1: below earth → draw the upper half
    const start = sgn > 0 ? PI : 0;
    const end = sgn > 0 ? TWO_PI : PI;
    arc(0, 0, w, h, start, end);
  }
  pop();
}

// ---- particles ----

class Particle {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.alive = true;
    this.energized = false;
    this.life = 1.0;
    this.trailX = x;
    this.trailY = y;
  }
  update(dt) {
    if (this.energized) {
      this.life -= dt * ENERGIZE_FADE;
      if (this.life <= 0) { this.alive = false; return; }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }

    this.trailX = this.x;
    this.trailY = this.y;

    const dx = this.x - earthPos.x;
    const dy = this.y - earthPos.y;
    const d = sqrt(dx * dx + dy * dy);
    const ang = atan2(dy, dx);
    const Rmp = magnetopauseRadius(ang);

    // Direct hit on the planet itself — guaranteed aurora.
    if (d < earthR * 1.05) {
      this.energized = true;
      this.life = 1.0;
      bumpAurora(dy);
      bumpFieldNear(d);
      return;
    }

    if (d < Rmp) {
      const nx = dx / d;
      const ny = dy / d;
      const vDotN = this.vx * nx + this.vy * ny;
      if (vDotN < 0) {
        // Magnetic latitude: 0 at the equator (dy=0), 1 at the poles (dx=0).
        const lat = abs(dy) / max(d, 1e-6);
        const eProb = lerp(ENERGIZE_BASE, ENERGIZE_POLE, lat * lat);
        bumpFieldNear(d);
        bowShockPressure = min(1, bowShockPressure + 0.05);
        if (random() < eProb) {
          this.energized = true;
          this.life = 1.0;
          bumpAurora(dy);
        } else {
          // specular reflect, then nudge just outside the boundary so we
          // don't immediately re-trigger.
          this.vx -= 2 * vDotN * nx;
          this.vy -= 2 * vDotN * ny;
          const push = Rmp - d + 1;
          this.x += nx * push;
          this.y += ny * push;
        }
        return;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  draw() {
    noStroke();
    const s = uiScale();
    if (this.energized) {
      const a = constrain(this.life, 0, 1);
      fill(160, 230, 255, a * 240);
      circle(this.x, this.y, 3.2 * s);
      fill(160, 230, 255, a * 80);
      circle(this.x, this.y, 7 * s);
    } else {
      stroke(255, 200, 120, 35);
      strokeWeight(1.2 * s);
      line(this.trailX, this.trailY, this.x, this.y);
      noStroke();
      fill(255, 230, 150, 110);
      circle(this.x, this.y, 1.7 * s);
      fill(255, 180, 90, 45);
      circle(this.x, this.y, 4 * s);
    }
  }
  isOffscreen() {
    const m = 80;
    return this.x < -m || this.x > width + m || this.y < -m || this.y > height + m;
  }
}

function bumpAurora(dy) {
  // dy negative → particle above earth → north pole
  if (dy < 0) auroraN = min(1, auroraN + 0.07);
  else auroraS = min(1, auroraS + 0.07);
}

function bumpFieldNear(d) {
  for (const fl of fieldLines) {
    const flR = earthR * fl.L;
    const proximity = 1 / (1 + abs(d - flR) / earthR);
    fl.wobble = min(1, fl.wobble + 0.10 * proximity);
  }
}

class Flare {
  constructor(originX, originY, originR) {
    this.particles = [];
    this.dead = false;
    const speed = max(220, min(width, height) * 0.30);
    const count = constrain(floor(min(width, height) * 0.55), 180, 900);
    const aimAng = atan2(earthPos.y - originY, earthPos.x - originX);
    const spread = 0.45;     // ±26° cone
    for (let i = 0; i < count; i++) {
      const a = aimAng + (random() - 0.5) * 2 * spread;
      const v = speed * random(0.7, 1.15);
      this.particles.push(new Particle(
        originX + cos(a) * originR,
        originY + sin(a) * originR,
        cos(a) * v,
        sin(a) * v
      ));
    }
  }
  update(dt) {
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => p.alive && !p.isOffscreen());
    if (this.particles.length === 0) this.dead = true;
  }
  draw() {
    for (const p of this.particles) p.draw();
  }
}

function fireFlare() {
  flares.push(new Flare(sunPos.x, sunPos.y, sunR));
}

// ---- UI ----

function drawBackHotspot() {
  const s = uiScale();
  const hov = pointInRect(mouseX, mouseY, backHotspot);
  noStroke();
  fill(231, 236, 243, hov ? 240 : 190);
  textSize(16 * s);
  text("← Gallery", backHotspot.x + 8 * s, backHotspot.y + 28 * s);
  cursor(hov || pointInSunHotspot(mouseX, mouseY) ? "pointer" : "default");
}

function drawHint() {
  const s = uiScale();
  noStroke();
  fill(180, 195, 220, 200 * sunHintFade);
  textSize(14 * s);
  textAlign(CENTER, BASELINE);
  text("Tap the sun to fire a flare  ·  sizes & distance log-compressed",
    width / 2, height - 22 * s);
  textAlign(LEFT, BASELINE);
}

function pointInRect(px, py, r) {
  return r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
function pointInSunHotspot(px, py) {
  return dist(px, py, sunPos.x, sunPos.y) <= sunR * 1.5;
}

function handleTap(px, py) {
  if (pointInRect(px, py, backHotspot)) {
    window.location.href = "../../";
    return;
  }
  if (pointInSunHotspot(px, py)) {
    fireFlare();
    flareTimer = AUTO_FLARE_INTERVAL;
    sunHintFade = max(0, sunHintFade - 0.5);
  }
}
function mousePressed() { handleTap(mouseX, mouseY); }
function touchStarted() {
  const p = touches && touches.length > 0 ? touches[0] : { x: mouseX, y: mouseY };
  handleTap(p.x, p.y);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildScene();
}
