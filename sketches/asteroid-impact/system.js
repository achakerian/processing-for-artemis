// system.js — sun, planets, comet, and the log-scaled solar system layout.
//
// All distances and sizes are log-compressed so Mercury through Neptune fit
// on screen. Gravity below works in this scaled space, so planet masses are
// game-tuned (heavier-than-real) to give visible deflections.
//
// Time is measured in years. One simulated year is whatever real-time slice
// `TIME_SCALE_YR_PER_SEC` says it is — physics uses year-time throughout.

const PLANETS = [
  // GMrel = scaled gravitational parameter relative to sun (game-tuned).
  { name: "Mercury", au: 0.39, realRadius: 0.38, color: [180, 175, 170], GMrel: 0.00003,  period: 0.24 },
  { name: "Venus",   au: 0.72, realRadius: 0.95, color: [220, 190, 130], GMrel: 0.00040,  period: 0.62 },
  { name: "Earth",   au: 1.00, realRadius: 1.00, color: [80, 140, 200],  GMrel: 0.00050,  period: 1.00 },
  { name: "Mars",    au: 1.52, realRadius: 0.53, color: [200, 110, 80],  GMrel: 0.00006,  period: 1.88 },
  { name: "Jupiter", au: 5.20, realRadius: 11.2, color: [220, 190, 150], GMrel: 0.03000,  period: 11.86 },
  { name: "Saturn",  au: 9.58, realRadius: 9.45, color: [220, 200, 160], GMrel: 0.01000,  period: 29.46 },
  { name: "Uranus",  au: 19.2, realRadius: 4.01, color: [170, 220, 230], GMrel: 0.00200,  period: 84.01 },
  { name: "Neptune", au: 30.1, realRadius: 3.88, color: [80, 110, 220],  GMrel: 0.00250,  period: 164.8 },
];

const SUN_GM_REF = 4.0e6;   // px^3/yr^2 — chosen so a 150 px Earth orbit closes in 1 year
const EARTH_NAME = "Earth";

const system = {
  sun: { x: 0, y: 0, radius: 0, GM: 0 },
  planets: [],
  comet: null,
  orbitR: {},        // name → orbit radius in px (for layout / debug)
  earth: null,
};

class Planet {
  constructor(data) {
    this.data = data;
    this.orbitR = 0;
    this.angSpeed = 0;
    this.visualRadius = 0;
    this.phase = random(TWO_PI);
    this.GM = 0;
    this.x = 0;
    this.y = 0;
  }
  layout(orbitR, visualRadius, sunGM) {
    this.orbitR = orbitR;
    this.angSpeed = TWO_PI / this.data.period;   // rad / year
    this.visualRadius = visualRadius;
    this.GM = sunGM * this.data.GMrel;
  }
  // Capture cross-section. Generous so well-aimed asteroids actually hit Earth.
  get captureRadius() {
    return Math.max(this.visualRadius * 2.6, 14 * uiScale());
  }
  positionAt(simYears, cx, cy) {
    const a = this.phase + this.angSpeed * simYears;
    this.x = cx + Math.cos(a) * this.orbitR;
    this.y = cy + Math.sin(a) * this.orbitR;
  }
  draw() {
    noStroke();
    const c = this.data.color;
    fill(c[0], c[1], c[2]);
    circle(this.x, this.y, this.visualRadius * 2);
    if (this.data.name === "Saturn") {
      noFill();
      stroke(220, 200, 160, 200);
      strokeWeight(1.3 * uiScale());
      ellipse(this.x, this.y, this.visualRadius * 5, this.visualRadius * 1.4);
      noStroke();
    }
    if (this.data.name === EARTH_NAME) {
      // Subtle blue halo so Earth reads as the target.
      noFill();
      stroke(120, 190, 255, 110);
      strokeWeight(1.4 * uiScale());
      circle(this.x, this.y, this.captureRadius * 2);
      noStroke();
    }
  }
}

class Comet {
  constructor(period, e, tilt, peri, aph) {
    this.period = period;
    this.tilt = tilt;
    this.a = (peri + aph) / 2;
    this.e = clamp((aph - peri) / (aph + peri), 0.01, 0.985);
    this.b = this.a * Math.sqrt(1 - this.e * this.e);
    this.x = 0; this.y = 0;
    this.distFromSun = this.a;
    this.trail = [];
  }
  positionAt(simYears, cx, cy) {
    const M = TWO_PI * ((simYears % this.period) / this.period);
    const E = solveKepler(M, this.e);
    const xo = this.a * (Math.cos(E) - this.e);
    const yo = this.b * Math.sin(E);
    const ct = Math.cos(this.tilt), st = Math.sin(this.tilt);
    this.x = cx + xo * ct - yo * st;
    this.y = cy + xo * st + yo * ct;
    this.distFromSun = Math.hypot(this.x - cx, this.y - cy);
  }
  recordTrail() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 36) this.trail.shift();
  }
  resetTrail() {
    this.trail = [];
  }
  drawOrbitPath(cx, cy) {
    noFill();
    stroke(200, 150, 220, 35);
    strokeWeight(1);
    beginShape();
    for (let t = 0; t <= TWO_PI + 0.05; t += 0.06) {
      const xo = this.a * (Math.cos(t) - this.e);
      const yo = this.b * Math.sin(t);
      const ct = Math.cos(this.tilt), st = Math.sin(this.tilt);
      vertex(cx + xo * ct - yo * st, cy + xo * st + yo * ct);
    }
    endShape();
  }
  draw(sunX, sunY) {
    const s = uiScale();
    // Tail away from sun, length scales with closeness.
    const dx = this.x - sunX, dy = this.y - sunY;
    const d = Math.hypot(dx, dy);
    const nx = dx / (d || 1), ny = dy / (d || 1);
    const tailLen = clamp(180 / Math.max(d * 0.06, 1), 4, 90) * s;
    if (tailLen > 6) {
      noFill();
      for (let i = 6; i > 0; i--) {
        stroke(200, 220, 255, 18 * i);
        strokeWeight((i * 0.5) * s);
        line(this.x, this.y, this.x + nx * tailLen * (i / 6), this.y + ny * tailLen * (i / 6));
      }
    }
    // Trail (positions over recent years) — faint dust.
    noStroke();
    for (let i = 0; i < this.trail.length; i++) {
      const t = i / this.trail.length;
      fill(220, 210, 240, 20 + 80 * t);
      const r = (0.8 + 1.4 * t) * s;
      circle(this.trail[i].x, this.trail[i].y, r);
    }
    // Body
    fill(255, 240, 220);
    circle(this.x, this.y, 3.4 * s);
    fill(255, 255, 255, 200);
    circle(this.x, this.y, 1.8 * s);
  }
}

class Sun {
  constructor() { this.phase = 0; }
  update(dtYears) { this.phase += dtYears * 1.6; }
  draw(cx, cy, r) {
    noStroke();
    for (let i = 6; i > 0; i--) {
      const wobble = noise(this.phase + i) * 0.07;
      fill(255, 180, 90, 18 / i);
      circle(cx, cy, r * 2 * (1 + i * 0.28 + wobble));
    }
    fill(255, 210, 90);
    circle(cx, cy, r * 2);
    fill(255, 240, 200);
    circle(cx, cy, r * 1.4);
  }
}

function buildSystem() {
  const cx = width / 2;
  const cy = height / 2;
  system.sun = new Sun();
  system.sun.x = cx;
  system.sun.y = cy;
  system.sun.radius = min(width, height) * 0.032;

  const s = uiScale();
  const innerR = system.sun.radius * 2.8;
  const outerR = min(width, height) * 0.46;
  const minAU = 0.39, maxAU = 30.1;
  const baseUnit = min(width, height) * 0.011;

  // Calibrate sun GM to the screen so Earth orbits stably.
  // For circular orbit at r_e: GM = (2π)^2 · r_e^3  (in px^3/yr^2)
  // We layout Earth first, then derive GM.
  const earthT = (Math.log(1.0) - Math.log(minAU)) / (Math.log(maxAU) - Math.log(minAU));
  const earthOrbitR = innerR + earthT * (outerR - innerR);
  const sunGM = (TWO_PI * TWO_PI) * Math.pow(earthOrbitR, 3);
  system.sun.GM = sunGM;

  system.planets = [];
  for (const data of PLANETS) {
    const p = new Planet(data);
    const t = (Math.log(data.au) - Math.log(minAU)) / (Math.log(maxAU) - Math.log(minAU));
    const orbitR = innerR + t * (outerR - innerR);
    const visR = max(Math.pow(data.realRadius, 0.32) * baseUnit, 4 * s);
    p.layout(orbitR, visR, sunGM);
    system.planets.push(p);
    system.orbitR[data.name] = orbitR;
    if (data.name === EARTH_NAME) system.earth = p;
  }

  // Comet: highly eccentric, ~70 year period. Perihelion inside Earth orbit,
  // aphelion at the edge of the visible system.
  const peri = innerR * 1.05;
  const aph = outerR * 0.96;
  system.comet = new Comet(70, 0.84, -0.55, peri, aph);
}

function updateSystem(simYears) {
  const cx = system.sun.x, cy = system.sun.y;
  for (const p of system.planets) p.positionAt(simYears, cx, cy);
  if (system.comet) system.comet.positionAt(simYears, cx, cy);
}

function drawOrbitRings() {
  noFill();
  stroke(120, 170, 220, 30);
  strokeWeight(1);
  for (const p of system.planets) {
    ellipse(system.sun.x, system.sun.y, p.orbitR * 2, p.orbitR * 2);
  }
  if (system.comet) system.comet.drawOrbitPath(system.sun.x, system.sun.y);
}
