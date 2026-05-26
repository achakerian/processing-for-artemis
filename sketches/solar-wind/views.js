// views.js — overview (whole solar system) and zoom (Earth or stub) renderers.
//
// Overview owns the sun, planets, orbit rings, and any in-flight flares.
// Zoom is screen-coord-only: dipole field lines, particle stream from the
// sun-side edge, aurora ribbons at the poles. Stub zoom is a labeled planet
// view for planets whose full physics is deferred to Phase 2.

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
  ribbons: [],
  spawnTimer: 0,
};

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
    const visR = max(pow(data.realRadius, 0.4) * baseUnit, 4 * s);
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
  zoom.ribbons = [];
  zoom.spawnTimer = 0;
}

function drawEarthZoom(dt, earthX, earthY, earthR) {
  // Sun glow on the left edge (stylized: sun is always "to the left" in zoom).
  noStroke();
  for (let i = 6; i > 0; i--) {
    fill(255, 200, 100, 10 / i);
    rect(0, 0, width * 0.08 * i, height);
  }

  drawDipoleField(earthX, earthY, earthR);

  // Spawn particles from the left edge, drifting right toward Earth.
  const spawnInterval = 0.018 / max(1, uiScale() * 0.7);
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

  for (const p of zoom.particles) p.update(dt);
  for (const p of zoom.particles) {
    if (p.triggeredAurora) {
      const isNorth = p.y < earthY;
      zoom.ribbons.push(new AuroraRibbon(p.x, p.y, isNorth));
      p.triggeredAurora = false; // consume once
    }
  }
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

  // Aurora ribbons on top of everything.
  for (const r of zoom.ribbons) r.update(dt);
  for (const r of zoom.ribbons) r.draw();
  zoom.ribbons = zoom.ribbons.filter((r) => !r.isDead());
}

function drawDipoleField(cx, cy, R) {
  noFill();
  stroke(140, 210, 255, 70);
  strokeWeight(1.1 * uiScale());
  const equatorialRs = [1.25, 1.7, 2.4, 3.5, 5.0, 7.0];
  for (const Req of equatorialRs) {
    // right half
    beginShape();
    for (let theta = 0.08; theta < PI - 0.08; theta += 0.05) {
      const r = R * Req * sin(theta) * sin(theta);
      const x = r * sin(theta);
      const y = -r * cos(theta);
      vertex(cx + x, cy + y);
    }
    endShape();
    // left half
    beginShape();
    for (let theta = 0.08; theta < PI - 0.08; theta += 0.05) {
      const r = R * Req * sin(theta) * sin(theta);
      const x = -r * sin(theta);
      const y = -r * cos(theta);
      vertex(cx + x, cy + y);
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
