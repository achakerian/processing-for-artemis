// views.js — overview (whole solar system) and zoom (Earth or stub) renderers.
//
// Overview owns the sun, planets, orbit rings, and any in-flight flares.
// Zoom is screen-coord-only: dipole field lines plus a particle stream from
// the sun-side edge. Particles bounce off or energise against the field;
// no aurora. Stub zoom is a labeled planet view for planets whose full
// behaviour is deferred to Phase 2.

const overview = {
  sun: null,
  planets: [],
  flares: [],
  sunX: 0,
  sunY: 0,
  sunRadius: 0,
  flareTimer: 15.0,
};

const zoom = {
  particles: [],
  spawnTimer: 0,
  burstTimer: 6,
  bombardment: 0,     // 0..1, recent particle-hit pressure on the field
  compression: 1,     // 1 = nominal, < 1 = field shrunk toward Earth
};
const COMPRESSION_MAX = 0.45;   // bombardment=1 → r0 shrinks to (1-0.45)·R0

function buildSystem() {
  overview.sunX = width / 2;
  overview.sunY = height / 2;
  overview.sunRadius = min(width, height) * 0.035;

  if (overview.planets.length === 0) {
    for (const data of PLANETS) overview.planets.push(new Planet(data));
  }

  const s = uiScale();
  const innerR = overview.sunRadius * 2.6;
  const outerR = min(width, height) * 0.46;
  const minAU = 0.39;
  const maxAU = 30.1;
  const baseUnit = min(width, height) * 0.011;

  for (let i = 0; i < PLANETS.length; i++) {
    const data = PLANETS[i];
    const t = (log(data.au) - log(minAU)) / (log(maxAU) - log(minAU));
    const orbitR = innerR + t * (outerR - innerR);
    // Mercury fastest, Neptune slowest. Compressed Kepler.
    const angSpeed = 0.45 / pow(data.au, 0.55);
    // exponent 0.3 keeps gas giants visibly bigger than rocky planets
    // without letting Jupiter and Saturn touch on a log-compressed grid
    const visR = max(pow(data.realRadius, 0.3) * baseUnit, 4 * s);
    overview.planets[i].layout(orbitR, angSpeed, visR);
  }

  if (!overview.sun) overview.sun = new Sun();
}

function drawOverview(dt, paused, scale) {
  // Orbit rings — only visible at overview scale, fading out as we zoom in.
  const ringAlpha = constrain(map(scale, 1, 2.5, 35, 0), 0, 35);
  if (ringAlpha > 1) {
    noFill();
    stroke(120, 170, 220, ringAlpha);
    strokeWeight(1 / scale);
    for (const p of overview.planets) {
      ellipse(overview.sunX, overview.sunY, p.orbitRadius * 2, p.orbitRadius * 2);
    }
  }

  if (!paused) overview.sun.update(dt);
  overview.sun.draw(overview.sunX, overview.sunY, overview.sunRadius);

  for (const p of overview.planets) {
    p.update(dt, overview.sunX, overview.sunY, paused);
    p.draw();
  }

  if (!paused) {
    for (const f of overview.flares) f.update(dt, overview.planets);
    overview.flares = overview.flares.filter((f) => !f.isDead());
  }
  for (const f of overview.flares) f.draw();
}

function fireFlare() {
  const speed = min(width, height) * 0.18;
  const count = constrain(floor(min(width, height) * 0.8), 240, 1400);
  overview.flares.push(new Flare(
    overview.sunX, overview.sunY, overview.sunRadius,
    count, speed
  ));
}

function resetZoom() {
  zoom.particles = [];
  zoom.spawnTimer = 0;
  zoom.burstTimer = 6;
  zoom.bombardment = 0;
  zoom.compression = 1;
}

function drawEarthZoom(dt, earthX, earthY, earthR) {
  // Bombardment decays each frame; compression follows it directly.
  zoom.bombardment = max(0, zoom.bombardment - dt * 0.9);
  zoom.compression = 1 - COMPRESSION_MAX * zoom.bombardment;

  // Sun glow on the left edge (stylized: sun is always "to the left" in zoom).
  noStroke();
  for (let i = 6; i > 0; i--) {
    fill(255, 200, 100, 10 / i);
    rect(0, 0, width * 0.08 * i, height);
  }

  drawMagnetopause(earthX, earthY, earthR);
  drawDipoleField(earthX, earthY, earthR);

  // Ambient spawn from the left edge.
  const spawnInterval = 0.022 / max(1, uiScale() * 0.7);
  const driftSpeed = max(180, min(width, height) * 0.25);
  zoom.spawnTimer -= dt;
  while (zoom.spawnTimer < 0) {
    const y = random(height);
    zoom.particles.push(new ZoomParticle(
      -10, y, driftSpeed, random(-driftSpeed * 0.05, driftSpeed * 0.05),
      earthX, earthY, earthR
    ));
    zoom.spawnTimer += spawnInterval;
  }

  // Periodic CME burst — a dense, fast cloud that compresses the field on impact.
  zoom.burstTimer -= dt;
  if (zoom.burstTimer <= 0) {
    const burstN = floor(constrain(60 + min(width, height) * 0.04, 60, 180));
    for (let i = 0; i < burstN; i++) {
      const y = constrain(earthY + randomGaussian() * height * 0.18, 0, height);
      zoom.particles.push(new ZoomParticle(
        -10, y,
        driftSpeed * random(1.4, 1.8),
        random(-driftSpeed * 0.08, driftSpeed * 0.08),
        earthX, earthY, earthR
      ));
    }
    zoom.burstTimer = random(7, 14);
  }

  // Update particles; each interaction with the field adds to bombardment.
  let hits = 0;
  for (const p of zoom.particles) {
    if (p.update(dt)) hits++;
  }
  if (hits > 0) zoom.bombardment = min(1, zoom.bombardment + 0.012 * hits);
  zoom.particles = zoom.particles.filter((p) => p.alive && !p.isOffscreen());

  for (const p of zoom.particles) p.draw();

  // Earth body — drawn over particles so they don't show inside the planet.
  noStroke();
  fill(50, 90, 150);
  circle(earthX, earthY, earthR * 2);
  fill(80, 140, 200);
  circle(earthX, earthY, earthR * 1.92);
  // continents hint
  fill(70, 160, 120, 200);
  push();
  translate(earthX, earthY);
  rotate(0.4);
  ellipse(-earthR * 0.3, -earthR * 0.15, earthR * 0.9, earthR * 0.5);
  ellipse(earthR * 0.25, earthR * 0.2, earthR * 0.7, earthR * 0.55);
  ellipse(earthR * 0.55, -earthR * 0.4, earthR * 0.4, earthR * 0.3);
  pop();
}

// Asymmetric magnetosphere matching the textbook/Sci-Am magnetopause image:
// dayside (sun-side, left in our view) compressed; nightside stretched into
// a long teardrop magnetotail.
//
// Magnetopause uses the Shue model: r(θ) = r₀ · (2/(1+cos θ))^α
//   θ measured from the sun-Earth line (θ=0 at the subsolar point).
//   r₀ is the subsolar standoff distance.
//   α controls how strongly the tail flares.
// Inner dipole field lines are drawn as deformed loops: stretched on the
// nightside, compressed on the dayside.

const SHUE_R0 = 4.0;       // subsolar standoff in Earth radii (visually scaled)
const SHUE_ALPHA = 0.58;
const TAIL_CAP_R = 22;     // cap tail extent at this many Earth radii

function shueBoundaryR(theta, R) {
  const cosT = cos(theta);
  const c = zoom.compression;
  if (cosT < -0.96) return R * TAIL_CAP_R * c;
  return R * SHUE_R0 * c * pow(2 / (1 + cosT), SHUE_ALPHA);
}

function drawMagnetopause(earthX, earthY, R) {
  noFill();
  // Glow brighter and thicker when the field is being bombarded.
  const baseAlpha = 110;
  const pulse = 90 * zoom.bombardment;
  stroke(150, 210, 255, baseAlpha + pulse);
  strokeWeight((2.2 + zoom.bombardment * 1.5) * uiScale());
  // Sun is at -x. θ from sun direction: θ=0 → particle on sunward side.
  // Map to screen coords: x_screen = -r cos θ, y_screen = r sin θ.
  beginShape();
  for (let theta = -PI * 0.93; theta <= PI * 0.93; theta += 0.03) {
    const r = shueBoundaryR(theta, R);
    const x = -r * cos(theta);
    const y = r * sin(theta);
    vertex(earthX + x, earthY + y);
  }
  endShape();
}

function drawDipoleField(cx, cy, R) {
  noFill();
  stroke(140, 210, 255, 75);
  strokeWeight(1.2 * uiScale());
  const equatorialRs = [1.25, 1.7, 2.4, 3.3];
  for (const Req of equatorialRs) {
    // Right half = nightside (stretched away from sun)
    beginShape();
    for (let theta = 0.08; theta < PI - 0.08; theta += 0.04) {
      const baseR = R * Req * sin(theta) * sin(theta);
      let bx = baseR * sin(theta);
      const by = -baseR * cos(theta);
      // stretch grows with x distance from Earth (cubic-ish for visible tail)
      const stretch = 1 + 0.55 * pow(bx / R, 1.4);
      bx *= stretch;
      vertex(cx + bx, cy + by);
    }
    endShape();
    // Left half = dayside (compressed toward sun; shrinks further under bombardment)
    beginShape();
    for (let theta = 0.08; theta < PI - 0.08; theta += 0.04) {
      const baseR = R * Req * sin(theta) * sin(theta);
      let bx = -baseR * sin(theta);
      const by = -baseR * cos(theta);
      const dist = -bx / R;
      const compress = max(0.55, 1 - 0.35 * pow(dist, 0.9));
      bx *= compress * zoom.compression;
      vertex(cx + bx, cy + by);
    }
    endShape();
  }

  // Pair of "open" field lines stretched into the magnetotail lobes —
  // these mark the boundary between closed inner field and the tail.
  stroke(150, 200, 240, 60);
  strokeWeight(1 * uiScale());
  for (const tailY of [-R * 1.6, R * 1.6]) {
    beginShape();
    vertex(cx, cy + tailY * 0.4);
    for (let t = 0; t < 1; t += 0.05) {
      const tx = R * (0.5 + t * 18);
      const ty = tailY * (1 + t * 0.6);
      vertex(cx + tx, cy + ty);
    }
    endShape();
  }
}

function drawStubZoom(planet) {
  const s = uiScale();
  const cx = width / 2;
  const cy = height * 0.42;
  const r = min(width, height) * 0.16;

  // Dim background slightly so the focus is clear.
  noStroke();
  fill(5, 6, 10, 220);
  rect(0, 0, width, height);

  // Planet body
  fill(planet.data.color[0], planet.data.color[1], planet.data.color[2]);
  circle(cx, cy, r * 2);
  if (planet.data.name === "Saturn") {
    noFill();
    stroke(220, 200, 160, 220);
    strokeWeight(2.2 * s);
    ellipse(cx, cy, r * 5, r * 1.4);
    noStroke();
  }

  // Text
  fill(231, 236, 243);
  textAlign(CENTER, BASELINE);
  textSize(40 * s);
  textStyle(BOLD);
  text(planet.data.name, cx, cy + r + 60 * s);

  fill(180, 195, 220);
  textSize(16 * s);
  textStyle(NORMAL);
  text(planet.data.stubText, cx, cy + r + 100 * s, width * 0.78);

  fill(77, 134, 255, 200);
  textSize(13 * s);
  textStyle(ITALIC);
  text("Full simulation coming in Phase 2.", cx, height - 48 * s);

  textAlign(LEFT, BASELINE);
  textStyle(NORMAL);
}
