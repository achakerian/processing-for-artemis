// sketch.js — Magnetosphere
//
// Cinematic, Earth-centric visualization of the geospace environment.
// Every visible element corresponds to a real physical structure:
//
//   - Solar wind: continuous golden streaklines flowing from the sun-ward
//     edge of the canvas, deflecting around the magnetosphere.
//   - Bow shock: parabolic cyan boundary upstream of Earth where the
//     supersonic solar wind first slows.
//   - Magnetosheath: warm orange-pink luminous shell between bow shock
//     and magnetopause — compressed, heated plasma.
//   - Magnetopause: the inner boundary where solar-wind pressure balances
//     Earth's magnetic pressure.
//   - Closed dayside field lines: dipole loops compressed by the wind.
//   - Open polar field lines: connect polar caps to the interplanetary
//     field and stretch downstream into the magnetotail.
//   - Plasma sheet: the bright equatorial thread in the magnetotail.
//   - Field-aligned tracer particles: stream along the field lines,
//     precipitating into the polar cap when they reach the pole-end.
//   - Auroral oval: a ring at ~67° magnetic latitude with discrete
//     flickering arcs. Side view + top-down inset.
//   - Day/night Earth: lit hemisphere (sunward side), city lights and
//     atmospheric limb on the night side.
//
// State machine drives the time evolution:
//   STEADY → INCOMING (CME approaches) → LOADING (tail stretches,
//   magnetosheath brightens) → SUBSTORM (reconnection X-point flashes
//   in the tail, particle jets fire poleward) → RECOVERY → STEADY.
//
// No user interaction beyond the Gallery back link — the system lives
// on its own.

const STATE = {
  STEADY: "steady",
  INCOMING: "incoming",
  LOADING: "loading",
  SUBSTORM: "substorm",
  RECOVERY: "recovery",
};

let earthPos, earthR;
let inset;
let backHotspot;

let stars = [];
let windStreaks = [];
let fieldLines = [];

let state = STATE.STEADY;
let stateTimer = 0;

let cme = null;
let cmePressure = 0;       // 0..1 dynamic pressure on the magnetopause
let tailStretch = 0;        // 0..1 magnetotail elongation
let substormFlash = 0;      // 0..1 flash at the X-point
let substormJets = [];      // particle jets returning from X-point toward poles

let auroraN = 0.18;
let auroraS = 0.18;

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
  const m = min(width, height);
  const s = uiScale();

  earthR = constrain(m * 0.14, 60, 240);
  earthPos = { x: width * 0.30, y: height * 0.55 };

  inset = {
    cx: width - m * 0.16,
    cy: m * 0.18,
    r: constrain(m * 0.105, 50, 130),
  };

  backHotspot = { x: 16 * s, y: 16 * s, w: 200 * s, h: 44 * s };

  stars = [];
  for (let i = 0; i < 320; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      r: random(0.3, 1.7),
      a: random(40, 200),
      tw: random(TWO_PI),
      twSpeed: random(0.4, 1.4),
    });
  }

  windStreaks = [];
  for (let i = 0; i < 16; i++) {
    windStreaks.push(newWindStreak(random(-width * 0.3, width)));
  }

  fieldLines = [];
  // Closed dayside dipole loops (sun-facing)
  for (const L of [1.4, 1.85, 2.4, 3.1, 4.0]) {
    fieldLines.push({ L, type: "closed-day", tracers: makeTracers(3, +1) });
  }
  // Closed nightside loops (inner tail, before reconnection region)
  for (const L of [1.4, 1.85, 2.4, 3.1]) {
    fieldLines.push({ L, type: "closed-night", tracers: makeTracers(3, -1) });
  }
  // Open polar-cap field lines extending into the tail (both lobes)
  for (const L of [4.0, 5.5, 7.5]) {
    fieldLines.push({ L, type: "open-north", tracers: makeTracers(5, +1) });
    fieldLines.push({ L, type: "open-south", tracers: makeTracers(5, +1) });
  }

  state = STATE.STEADY;
  stateTimer = random(8, 11);
  cme = null;
  cmePressure = 0.08;
  tailStretch = 0;
  substormFlash = 0;
  substormJets = [];
  auroraN = 0.2;
  auroraS = 0.2;
}

function newWindStreak(startX) {
  return {
    x: startX,
    y: random(height),
    speed: random(70, 130),
    len: random(50, 130),
    a: random(25, 75),
  };
}

function makeTracers(n, dir) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      u: random(0, 1),
      speed: random(0.07, 0.16),
      dir, // +1 = forward along param (pole → tail or N → S), -1 = reverse
    });
  }
  return arr;
}

function draw() {
  const now = millis();
  const dt = min((now - lastMs) / 1000, 0.05);
  lastMs = now;

  background(4, 5, 9);

  updateState(dt);
  updateWind(dt);
  updateCME(dt);
  updateSubstormJets(dt);

  drawStars(dt);
  drawWindStreaks();
  drawPlasmaSheet();
  drawMagnetosheath();
  drawBowShock();
  drawFieldLines(dt);
  if (cme) drawCME();
  if (substormFlash > 0.02) drawSubstormFlash();
  drawSubstormJets();
  drawEarth();
  drawAurora();
  drawInset();
  drawBackHotspot();
  drawCaption();
}

// ---------- state machine ----------

function updateState(dt) {
  stateTimer -= dt;
  if (stateTimer <= 0) advanceState();

  const targets = {
    [STATE.STEADY]:   { pressure: 0.10, stretch: 0.00 },
    [STATE.INCOMING]: { pressure: 0.55, stretch: 0.15 },
    [STATE.LOADING]:  { pressure: 1.00, stretch: 1.00 },
    [STATE.SUBSTORM]: { pressure: 0.85, stretch: 0.00 },
    [STATE.RECOVERY]: { pressure: 0.45, stretch: 0.20 },
  };
  const t = targets[state];
  cmePressure = lerp(cmePressure, t.pressure, dt * 1.4);
  // Tail snaps fast on substorm onset, otherwise eases.
  const stretchRate = state === STATE.SUBSTORM ? 7.0 : 0.9;
  tailStretch = lerp(tailStretch, t.stretch, dt * stretchRate);

  substormFlash = max(0, substormFlash - dt * 1.6);

  const baseAurora = 0.16 + cmePressure * 0.18;
  auroraN = max(baseAurora, auroraN - dt * 0.35);
  auroraS = max(baseAurora, auroraS - dt * 0.35);
}

function advanceState() {
  if (state === STATE.STEADY) {
    state = STATE.INCOMING;
    stateTimer = random(5, 7);
    spawnCME();
  } else if (state === STATE.INCOMING) {
    state = STATE.LOADING;
    stateTimer = random(5.5, 7.5);
    cme = null;
  } else if (state === STATE.LOADING) {
    state = STATE.SUBSTORM;
    stateTimer = 1.6;
    substormFlash = 1.0;
    fireSubstormJets();
    auroraN = 1.0;
    auroraS = 0.95;
  } else if (state === STATE.SUBSTORM) {
    state = STATE.RECOVERY;
    stateTimer = random(9, 12);
  } else {
    state = STATE.RECOVERY ? STATE.STEADY : STATE.STEADY;
    state = STATE.STEADY;
    stateTimer = random(9, 13);
  }
}

// ---------- solar wind streaks ----------

function updateWind(dt) {
  for (const w of windStreaks) {
    const dx = w.x - earthPos.x;
    const dy = w.y - earthPos.y;
    const d = sqrt(dx * dx + dy * dy);
    // Deflect around bow shock: when close, push perpendicular to radial.
    const r = bowShockR(atan2(dy, dx)) * 1.05;
    let speed = w.speed * (1 + cmePressure * 0.3);
    if (d < r) {
      // inside sheath region: slow + sweep tangentially
      const tangSign = dy >= 0 ? 1 : -1;
      w.x += speed * dt * 0.5;
      w.y += speed * dt * 0.45 * tangSign;
    } else {
      w.x += speed * dt;
      // mild deflection ahead of the shock
      const ahead = max(0, 1 - (d - r) / (earthR * 4));
      w.y += ahead * 40 * dt * Math.sign(dy || 0.001);
    }
    if (w.x > width + 100) {
      Object.assign(w, newWindStreak(-100));
    }
  }
}

function drawWindStreaks() {
  const boost = 1 + cmePressure * 0.6;
  for (const w of windStreaks) {
    stroke(255, 225, 170, w.a * boost);
    strokeWeight(0.8 * uiScale());
    line(w.x - w.len, w.y, w.x, w.y);
  }
  noStroke();
}

// ---------- magnetopause / bow shock geometry ----------
// Sun is to the LEFT (off-screen). Dayside = left of Earth (a≈π), tail = right (a≈0).
// We use the Shue (1997) magnetopause model:
//   r(θ) = r0 · (2 / (1 + cos θ))^α
// where θ is the angle from the sun-Earth line. r0 is dayside standoff; α
// controls the tail flaring. Converting to our angle convention (a measured
// from +x = tail direction) gives:  cos(θ) = -cos(a).
// The tail is capped to a finite length that grows with tailStretch.
function shueR(a, r0, alpha) {
  // Smoothly clamp the denom away from zero so the tail extends finitely but
  // without a hard corner: at a=0 (tail axis) we want a large but bounded r,
  // and the rest of the curve should be smooth Shue.
  const denom = max(1 - cos(a), 0.18);
  return r0 * Math.pow(2 / denom, alpha);
}

function magnetopauseR(a) {
  const r0 = 1.85 * earthR * (1 - 0.30 * cmePressure);
  return shueR(a, r0, 0.38 + tailStretch * 0.08);
}

function bowShockR(a) {
  const r0 = 2.35 * earthR * (1 - 0.26 * cmePressure);
  return shueR(a, r0, 0.40 + tailStretch * 0.08);
}

function drawMagnetosheath() {
  // Soft warm halo hugging the magnetopause — physically this is where the
  // shocked solar-wind plasma piles up densest just outside the boundary.
  // Drawn as a small set of fat, low-alpha strokes that blur into a single
  // glow rather than reading as concentric rings.
  const N = 90;
  const s = uiScale();
  const press = cmePressure;
  const passes = [
    { rf: 1.005, sw: 2.2 * s,  rgb: [255, 140, 110], a: 38 + press * 85 },
    { rf: 1.035, sw: 8   * s,  rgb: [255, 170, 130], a: 18 + press * 45 },
    { rf: 1.085, sw: 16  * s,  rgb: [255, 190, 150], a: 9  + press * 22 },
  ];
  noFill();
  for (const p of passes) {
    if (p.a < 2) continue;
    stroke(p.rgb[0], p.rgb[1], p.rgb[2], p.a);
    strokeWeight(p.sw);
    beginShape();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TWO_PI;
      const mr = magnetopauseR(a) * p.rf;
      vertex(earthPos.x + cos(a) * mr, earthPos.y + sin(a) * mr);
    }
    endShape(CLOSE);
  }
  noStroke();
}

function drawBowShock() {
  noFill();
  stroke(170, 225, 255, 55 + cmePressure * 100);
  strokeWeight((1.0 + cmePressure * 1.5) * uiScale());
  beginShape();
  for (let a = 0; a < TWO_PI + 0.01; a += 0.035) {
    const r = bowShockR(a);
    vertex(earthPos.x + cos(a) * r, earthPos.y + sin(a) * r);
  }
  endShape(CLOSE);
}

function drawPlasmaSheet() {
  // The bright equatorial filament running down the tail.
  const startX = earthPos.x + earthR * 1.6;
  const endX = earthPos.x + earthR * (12 + tailStretch * 8);
  const y = earthPos.y;
  // soft gradient via stacked passes
  for (let i = 5; i >= 1; i--) {
    stroke(150, 80, 220, 10 + tailStretch * 8);
    strokeWeight(earthR * 0.12 * (i / 5));
    line(startX, y, endX, y);
  }
  stroke(220, 150, 255, 90 + tailStretch * 100);
  strokeWeight(1.5 * uiScale());
  line(startX, y, endX, y);
  noStroke();
}

// ---------- field lines ----------

function fieldLinePoints(line) {
  const pts = [];
  const Re = earthR;
  const cx = earthPos.x;
  const cy = earthPos.y;

  if (line.type === "closed-day" || line.type === "closed-night") {
    const side = line.type === "closed-day" ? -1 : 1;
    const xScale = side === -1
      ? (1 - 0.30 * cmePressure)
      : (1 + 0.95 * tailStretch);
    // Closed loops: dipole r = L * cos²(lambda), lambda in [-π/2, π/2]
    for (let lam = -PI / 2 + 0.04; lam <= PI / 2 - 0.04; lam += 0.05) {
      const r = line.L * cos(lam) * cos(lam);
      const dx = side * r * cos(lam) * xScale;
      const dy = -r * sin(lam);
      pts.push({ x: cx + dx * Re, y: cy + dy * Re });
    }
  } else if (line.type === "open-north" || line.type === "open-south") {
    const sgn = line.type === "open-north" ? -1 : 1; // -1 = top of screen
    const tailLen = line.L * (1.4 + tailStretch * 1.4);
    const lobeOffset = sgn * (0.32 + tailStretch * 0.15);

    // Anchor on the polar-cap edge (~80° magnetic latitude on the day side)
    const lat = 1.40;
    const startX = cx - cos(lat) * Re * 1.02;
    const startY = cy + sgn * sin(lat) * Re * 1.02;
    // Control points pull the line up & tailward
    const c1X = cx + Re * 0.6;
    const c1Y = cy + sgn * Re * 1.6;
    const c2X = cx + Re * (2.0 + tailStretch * 1.5);
    const c2Y = cy + sgn * Re * 0.9;
    const endX = cx + tailLen * Re;
    const endY = cy + lobeOffset * Re;

    // cubic bezier
    for (let u = 0; u <= 1.001; u += 0.04) {
      const um = 1 - u;
      const px = um * um * um * startX
               + 3 * um * um * u * c1X
               + 3 * um * u * u * c2X
               + u * u * u * endX;
      const py = um * um * um * startY
               + 3 * um * um * u * c1Y
               + 3 * um * u * u * c2Y
               + u * u * u * endY;
      pts.push({ x: px, y: py });
    }
  }
  return pts;
}

function drawFieldLines(dt) {
  noFill();
  for (const line of fieldLines) {
    const pts = fieldLinePoints(line);
    if (pts.length < 2) continue;

    const isOpen = line.type.startsWith("open");
    const base = isOpen ? 85 : 75;
    const tint = isOpen
      ? [150, 200, 255, base + cmePressure * 60]
      : [140, 215, 255, base];
    stroke(tint[0], tint[1], tint[2], tint[3]);
    strokeWeight(uiScale() * (isOpen ? 1.0 : 0.9));
    beginShape();
    for (const p of pts) vertex(p.x, p.y);
    endShape();

    // Tracer beads
    for (const tr of line.tracers) {
      tr.u += tr.speed * tr.dir * dt;
      if (tr.u > 1) {
        tr.u = 0;
        if (line.type === "open-north" || line.type === "closed-day")
          auroraN = min(1, auroraN + 0.02);
        else
          auroraS = min(1, auroraS + 0.02);
      } else if (tr.u < 0) {
        tr.u = 1;
      }
      const fi = tr.u * (pts.length - 1);
      const idx = constrain(floor(fi), 0, pts.length - 2);
      const f = fi - idx;
      const x = lerp(pts[idx].x, pts[idx + 1].x, f);
      const y = lerp(pts[idx].y, pts[idx + 1].y, f);
      noStroke();
      const c = isOpen ? [190, 235, 255] : [170, 230, 255];
      fill(c[0], c[1], c[2], 235);
      circle(x, y, 2.2 * uiScale());
      fill(c[0], c[1], c[2], 70);
      circle(x, y, 5.5 * uiScale());
    }
  }
}

// ---------- CME ----------

function spawnCME() {
  cme = {
    x: -width * 0.18,
    y: earthPos.y + random(-earthR * 0.4, earthR * 0.4),
    r: earthR * 1.4,
    speed: 0,
    twist: random(0, TWO_PI),
  };
  // travel distance / time so we arrive when stateTimer hits 0
  const dist = (earthPos.x - bowShockR(PI) * 1.05) - cme.x;
  cme.speed = dist / (stateTimer + 0.01);
}

function updateCME(dt) {
  if (!cme) return;
  cme.x += cme.speed * dt;
  cme.r += earthR * 0.35 * dt; // expanding cloud
  cme.twist += dt * 0.8;
}

function drawCME() {
  const cx = cme.x;
  const cy = cme.y;
  const R = cme.r;
  // Cavity (dark magnetic flux rope) — large bubble
  noStroke();
  for (let i = 4; i >= 1; i--) {
    fill(80, 30, 110, 22 + i * 6);
    ellipse(cx - R * 0.1, cy, R * 2.0 * (i / 4), R * 1.4 * (i / 4));
  }
  // Twisted flux rope hint: a few helical loops
  noFill();
  stroke(200, 140, 230, 130);
  strokeWeight(1.1 * uiScale());
  for (let i = 0; i < 4; i++) {
    const phase = cme.twist + i * 0.7;
    push();
    translate(cx, cy);
    rotate(phase);
    ellipse(0, 0, R * 1.7, R * 0.7);
    pop();
  }
  // Trailing core (bright filament from prominence eruption)
  noStroke();
  fill(255, 130, 200, 200);
  ellipse(cx - R * 0.7, cy, R * 0.45, R * 0.4);
  fill(255, 200, 220, 230);
  ellipse(cx - R * 0.72, cy, R * 0.22, R * 0.22);
  // Leading shock front (bright arc on the right side, facing Earth)
  stroke(255, 230, 200, 200);
  strokeWeight(2.6 * uiScale());
  noFill();
  arc(cx, cy, R * 2.05, R * 1.55, -PI / 2.6, PI / 2.6);
  stroke(255, 200, 150, 90);
  strokeWeight(5 * uiScale());
  arc(cx, cy, R * 2.15, R * 1.6, -PI / 2.6, PI / 2.6);
  noStroke();
}

// ---------- substorm ----------

function fireSubstormJets() {
  substormJets = [];
  const xpX = earthPos.x + earthR * 6.5; // reconnection X-point in the tail
  const xpY = earthPos.y;
  const count = 28;
  for (let i = 0; i < count; i++) {
    const goesNorth = i % 2 === 0;
    const targetY = earthPos.y + (goesNorth ? -earthR * 0.85 : earthR * 0.85);
    substormJets.push({
      x: xpX + random(-earthR * 0.3, earthR * 0.3),
      y: xpY + random(-earthR * 0.2, earthR * 0.2),
      targetX: earthPos.x + random(-earthR * 0.1, earthR * 0.4),
      targetY,
      life: 1.0,
      speed: random(0.7, 1.2),
      goesNorth,
    });
  }
}

function updateSubstormJets(dt) {
  for (const j of substormJets) {
    const dx = j.targetX - j.x;
    const dy = j.targetY - j.y;
    j.x += dx * dt * 2.4 * j.speed;
    j.y += dy * dt * 2.4 * j.speed;
    j.life -= dt * 0.55;
    if (j.life < 0.05 || (abs(dx) < 4 && abs(dy) < 4)) {
      j.life = 0;
      if (j.goesNorth) auroraN = min(1, auroraN + 0.04);
      else auroraS = min(1, auroraS + 0.04);
    }
  }
  substormJets = substormJets.filter((j) => j.life > 0.04);
}

function drawSubstormJets() {
  noStroke();
  const s = uiScale();
  for (const j of substormJets) {
    const a = constrain(j.life, 0, 1);
    fill(255, 180, 240, a * 230);
    circle(j.x, j.y, 3 * s);
    fill(255, 180, 240, a * 80);
    circle(j.x, j.y, 7 * s);
  }
}

function drawSubstormFlash() {
  const a = substormFlash;
  const xpX = earthPos.x + earthR * 6.5;
  const xpY = earthPos.y;
  noStroke();
  for (let i = 5; i >= 1; i--) {
    fill(255, 200, 255, a * (60 / i));
    circle(xpX, xpY, earthR * (1.6 + i * 0.55));
  }
  fill(255, 235, 255, a * 240);
  circle(xpX, xpY, earthR * 0.5);
  // X-shaped reconnection cross
  stroke(255, 220, 255, a * 220);
  strokeWeight(2 * uiScale());
  const L = earthR * 1.6;
  line(xpX - L * 0.7, xpY - L * 0.5, xpX + L * 0.7, xpY + L * 0.5);
  line(xpX - L * 0.7, xpY + L * 0.5, xpX + L * 0.7, xpY - L * 0.5);
  noStroke();
}

// ---------- Earth ----------

function drawEarth() {
  const cx = earthPos.x;
  const cy = earthPos.y;
  const r = earthR;

  // Atmosphere limb (drawn before the planet so it haloes the disc)
  noFill();
  for (let i = 0; i < 7; i++) {
    stroke(80, 160, 230, 70 - i * 9);
    strokeWeight(1.5 + i * 0.7);
    circle(cx, cy, r * 2 + i * 5 * uiScale());
  }
  noStroke();

  // Night side base
  fill(10, 18, 38);
  circle(cx, cy, r * 2);

  // Lit hemisphere: sun is off-screen LEFT, so the dayside is the LEFT half.
  // One solid fill (no banding), then a soft terminator graduation drawn as
  // a vertical strip of thin rectangles fading from day to night.
  fill(78, 135, 195);
  arc(cx, cy, r * 2 * 0.97, r * 2 * 0.97, HALF_PI, HALF_PI + PI);

  // Continents — placed roughly on the lit hemisphere
  fill(72, 158, 118, 220);
  push();
  translate(cx, cy);
  rotate(0.32);
  ellipse(-r * 0.55, -r * 0.15, r * 0.65, r * 0.38);
  ellipse(-r * 0.3, r * 0.32, r * 0.5, r * 0.35);
  ellipse(-r * 0.75, r * 0.2, r * 0.25, r * 0.22);
  ellipse(-r * 0.18, -r * 0.45, r * 0.3, r * 0.22);
  pop();

  // Night-side city lights — twinkling
  for (let i = 0; i < 26; i++) {
    const ang = i * 0.871 + 0.4;
    const rad = r * (0.35 + ((i * 0.137) % 0.55));
    const x = cx + cos(ang) * rad;
    const y = cy + sin(ang) * rad;
    // night side: x > cx
    if (x - cx > r * 0.05) {
      const tw = 0.45 + 0.55 * sin(millis() * 0.004 + i * 1.3);
      fill(255, 210, 140, 140 * tw);
      circle(x, y, 1.6 * uiScale());
    }
  }

  // Terminator soft fade — slight darkening on the night side limb
  noFill();
  for (let i = 0; i < 5; i++) {
    stroke(5, 6, 10, 28 - i * 5);
    strokeWeight(2);
    arc(cx, cy, r * 2 - i * 1.2, r * 2 - i * 1.2, -HALF_PI, HALF_PI);
  }
  noStroke();
}

// ---------- aurora ----------

function drawAurora() {
  drawAuroraOval(-1, auroraN); // north (top)
  drawAuroraOval(+1, auroraS); // south (bottom)
}

function drawAuroraOval(sgn, intensity) {
  if (intensity < 0.05) return;
  const cx = earthPos.x;
  const cy = earthPos.y + sgn * earthR * 0.78;

  push();
  translate(cx, cy);

  // Glow band at the polar limb, layered for an altitude gradient:
  //   low altitude  → green (557.7 nm O I)
  //   mid altitude  → red   (630.0 nm O I)
  //   high          → violet (N₂⁺ blue–violet)
  const layers = [
    { dy: 0,                     w: earthR * 1.18, h: earthR * 0.42, rgb: [110, 255, 140], sw: 7,   aScale: 1.0 },
    { dy: sgn * earthR * 0.08,   w: earthR * 1.26, h: earthR * 0.40, rgb: [170, 255, 180], sw: 4.5, aScale: 0.85 },
    { dy: sgn * earthR * 0.17,   w: earthR * 1.36, h: earthR * 0.38, rgb: [255, 90, 120],  sw: 3.6, aScale: 0.65 },
    { dy: sgn * earthR * 0.26,   w: earthR * 1.46, h: earthR * 0.36, rgb: [180, 100, 255], sw: 2.6, aScale: 0.40 },
  ];
  for (const L of layers) {
    noFill();
    stroke(L.rgb[0], L.rgb[1], L.rgb[2], intensity * L.aScale * 230);
    strokeWeight(L.sw * uiScale());
    const start = sgn > 0 ? PI : 0;
    const end   = sgn > 0 ? TWO_PI : PI;
    arc(0, L.dy, L.w, L.h, start, end);
  }

  // Discrete auroral curtains (rays) hanging from the high-altitude band
  // down toward the upper atmosphere. They flicker.
  const rayCount = 13;
  for (let i = 0; i < rayCount; i++) {
    const t = (i + 0.5) / rayCount;
    const xTop = lerp(-earthR * 0.62, earthR * 0.62, t);
    const flick = 0.4 + 0.6 * sin(millis() * 0.011 + i * 1.7 + (sgn > 0 ? 2.1 : 0));
    const a = intensity * flick * 0.95;
    if (a < 0.06) continue;
    // top = high altitude (away from Earth in local +sgn·y direction)
    // bot = lower altitude (closer to Earth)
    const yTopL = sgn * earthR * 0.32;
    const yBotL = sgn * earthR * 0.08;
    const xBot = xTop * 0.6;
    // green base
    stroke(150, 255, 170, a * 230);
    strokeWeight(1.6 * uiScale());
    line(xTop, yTopL, xBot, yBotL);
    // red mid stroke offset upward
    stroke(255, 110, 130, a * 150);
    strokeWeight(1.1 * uiScale());
    line(xTop, yTopL + sgn * earthR * 0.04, xBot, yBotL + sgn * earthR * 0.02);
    // violet tip
    stroke(200, 120, 240, a * 90);
    strokeWeight(0.9 * uiScale());
    line(xTop, yTopL + sgn * earthR * 0.08, xBot, yBotL + sgn * earthR * 0.04);
  }
  pop();
}

// ---------- inset (top-down polar cap) ----------

function drawInset() {
  const cx = inset.cx;
  const cy = inset.cy;
  const r = inset.r;
  const s = uiScale();

  // Panel background
  noStroke();
  fill(10, 14, 22, 200);
  rect(cx - r * 1.35, cy - r * 1.45, r * 2.7, r * 2.75, 8);

  // Label
  fill(190, 205, 225, 220);
  textSize(11 * s);
  textAlign(CENTER, BASELINE);
  text("North polar cap (top-down)", cx, cy - r * 1.2);

  // Earth disc viewed from above the north pole
  fill(35, 70, 130);
  circle(cx, cy, r * 1.45);
  fill(78, 135, 195);
  circle(cx, cy, r * 1.38);
  // simplified continents at this view
  fill(70, 160, 120, 200);
  ellipse(cx - r * 0.18, cy - r * 0.08, r * 0.42, r * 0.26);
  ellipse(cx + r * 0.22, cy + r * 0.12, r * 0.32, r * 0.24);
  ellipse(cx + r * 0.05, cy - r * 0.3, r * 0.22, r * 0.16);

  // The auroral oval — a ring at ~67° magnetic latitude, offset toward
  // the magnetic midnight side (right of the inset = tailward).
  const ovalRx = r * 0.80;
  const ovalRy = r * 0.72;
  const midnightOffset = r * (0.08 + cmePressure * 0.04);
  push();
  translate(cx + midnightOffset, cy);
  noFill();
  // Glow halo
  for (let i = 4; i >= 1; i--) {
    stroke(120, 255, 180, auroraN * (200 - i * 35));
    strokeWeight((1.4 + i * 1.6) * s);
    ellipse(0, 0, ovalRx * 2, ovalRy * 2);
  }
  // High-altitude reddish ring slightly outside
  stroke(255, 110, 140, auroraN * 110);
  strokeWeight(2 * s);
  ellipse(0, 0, ovalRx * 2.18, ovalRy * 2.18);
  // Discrete arcs (flicker)
  const arcs = 18;
  for (let i = 0; i < arcs; i++) {
    const ang = (i / arcs) * TWO_PI;
    const flick = 0.4 + 0.6 * sin(millis() * 0.013 + i * 1.27);
    const a = auroraN * flick * 0.7;
    if (a < 0.1) continue;
    const x = cos(ang) * ovalRx;
    const y = sin(ang) * ovalRy;
    noStroke();
    fill(180, 255, 200, a * 230);
    circle(x, y, 2.0 * s);
    fill(180, 255, 200, a * 80);
    circle(x, y, 4.5 * s);
  }
  pop();

  // Direction labels
  fill(170, 185, 210, 170);
  textSize(9 * s);
  textAlign(LEFT, CENTER);
  text("☼ sun", cx - r * 1.28, cy);
  textAlign(RIGHT, CENTER);
  text("tail ↦", cx + r * 1.28, cy);
  textAlign(LEFT, BASELINE);
}

// ---------- background stars ----------

function drawStars(dt) {
  noStroke();
  for (const st of stars) {
    st.tw += dt * st.twSpeed;
    const a = st.a * (0.65 + 0.35 * sin(st.tw));
    fill(231, 236, 243, a);
    circle(st.x, st.y, st.r);
  }
}

// ---------- UI overlays ----------

function drawBackHotspot() {
  const s = uiScale();
  const hov = pointInRect(mouseX, mouseY, backHotspot);
  noStroke();
  fill(231, 236, 243, hov ? 240 : 190);
  textSize(16 * s);
  text("← Gallery", backHotspot.x + 8 * s, backHotspot.y + 28 * s);
  cursor(hov ? "pointer" : "default");
}

function drawCaption() {
  const s = uiScale();
  const labels = {
    [STATE.STEADY]:   "Quiet — solar wind flows past · magnetosphere in equilibrium",
    [STATE.INCOMING]: "A CME is incoming — coronal mass ejection inbound from the sun",
    [STATE.LOADING]:  "Magnetotail loading — energy storing as field lines stretch downstream",
    [STATE.SUBSTORM]: "SUBSTORM — magnetic reconnection in the tail · particle jets fire poleward",
    [STATE.RECOVERY]: "Aurora ablaze — energetic particles precipitating into the upper atmosphere",
  };
  noStroke();
  fill(210, 220, 240, 230);
  textSize(14 * s);
  textAlign(CENTER, BASELINE);
  text(labels[state], width / 2, height - 22 * s);
  textAlign(LEFT, BASELINE);
}

function pointInRect(px, py, r) {
  return r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function mousePressed() {
  if (pointInRect(mouseX, mouseY, backHotspot)) window.location.href = "../../";
}
function touchStarted() {
  const p = touches && touches.length > 0 ? touches[0] : { x: mouseX, y: mouseY };
  if (pointInRect(p.x, p.y, backHotspot)) window.location.href = "../../";
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildScene();
}
