// physics.js — gravity integration + Monte Carlo runner.
//
// Time and acceleration are in year-units (matches `system.js`). On each
// frame we advance `simYears` by `dt_real * timeScale`. Asteroids and
// ghosts integrate against the *current* planet positions, with substeps
// for stability near close approaches.
//
// Real Newtonian gravity is mass-independent: a heavy asteroid follows the
// same trajectory as a light one. To give the mass slider gameplay weight
// we couple it to the *uncertainty* of the launch — heavier rocks are
// tracked more precisely, so their Monte Carlo cloud spreads less. The
// underlying physics for the visible asteroid is the same in either case.

const SUBSTEPS_PER_FRAME = 6;
const MAX_DT_YR = 0.04;       // cap so big frame drops don't tunnel
const GHOST_COUNT = 36;       // Monte Carlo trials per launch
const ESCAPE_RADIUS_MULT = 1.35;

function gravityAt(x, y) {
  const sun = system.sun;
  let ax = 0, ay = 0;

  let dx = sun.x - x, dy = sun.y - y;
  let r2 = dx * dx + dy * dy;
  const sunSoft = sun.radius * sun.radius * 0.04;
  r2 = Math.max(r2, sunSoft);
  let r = Math.sqrt(r2);
  ax += sun.GM * dx / (r2 * r);
  ay += sun.GM * dy / (r2 * r);

  for (const p of system.planets) {
    dx = p.x - x; dy = p.y - y;
    r2 = dx * dx + dy * dy;
    const soft = p.visualRadius * p.visualRadius * 0.06;
    r2 = Math.max(r2, soft);
    r = Math.sqrt(r2);
    ax += p.GM * dx / (r2 * r);
    ay += p.GM * dy / (r2 * r);
  }
  return [ax, ay];
}

// Velocity Verlet step. Planet positions are treated as frozen for the
// substep — fine because planet motion within one substep is tiny.
function verletStep(body, dt) {
  const [ax, ay] = gravityAt(body.x, body.y);
  const nx = body.x + body.vx * dt + 0.5 * ax * dt * dt;
  const ny = body.y + body.vy * dt + 0.5 * ay * dt * dt;
  const [ax2, ay2] = gravityAt(nx, ny);
  body.vx += 0.5 * (ax + ax2) * dt;
  body.vy += 0.5 * (ay + ay2) * dt;
  body.x = nx;
  body.y = ny;
}

function escapeRadius() {
  return Math.max(width, height) * ESCAPE_RADIUS_MULT;
}

// Returns null, "sun", "Earth", "Mars", ..., or "escape".
function collisionWith(body) {
  const sun = system.sun;
  if (Math.hypot(body.x - sun.x, body.y - sun.y) < sun.radius * 1.05) return "sun";
  for (const p of system.planets) {
    if (Math.hypot(body.x - p.x, body.y - p.y) < p.captureRadius) return p.data.name;
  }
  const cx = sun.x, cy = sun.y;
  if (Math.hypot(body.x - cx, body.y - cy) > escapeRadius()) return "escape";
  return null;
}

class Asteroid {
  constructor(x, y, vx, vy, massIdx) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.massIdx = massIdx;       // 1..10
    this.alive = true;
    this.outcome = null;          // null while alive
    this.outcomeYear = null;
    this.trail = [];              // recent positions
    this.maxTrail = 220;
  }
  step(dtYears, currentYear) {
    if (!this.alive) return;
    const sub = SUBSTEPS_PER_FRAME;
    const dt = dtYears / sub;
    for (let i = 0; i < sub; i++) {
      verletStep(this, dt);
      const hit = collisionWith(this);
      if (hit) {
        this.alive = false;
        this.outcome = hit;
        this.outcomeYear = currentYear + (i + 1) * dt;
        return;
      }
    }
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();
  }
  visualRadius() {
    return (1.6 + 0.35 * this.massIdx) * uiScale();
  }
  draw() {
    if (!this.alive) return;
    const r = this.visualRadius();
    // Trail
    noFill();
    for (let i = 1; i < this.trail.length; i++) {
      const t = i / this.trail.length;
      stroke(255, 180, 120, 14 + 110 * t);
      strokeWeight(0.6 + 1.2 * t);
      line(this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y);
    }
    // Body — rocky brown with bright leading edge
    noStroke();
    fill(60, 40, 30, 230);
    circle(this.x, this.y, r * 2);
    fill(180, 140, 110);
    circle(this.x, this.y, r * 1.4);
    fill(240, 220, 200);
    circle(this.x, this.y, r * 0.6);
  }
}

// Ghosts are stripped-down asteroids for Monte Carlo. No trail rendering
// per-frame — we draw them as fading dots so the cloud reads as a swarm.
class Ghost {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.alive = true;
    this.outcome = null;
    this.fade = 1.0;
  }
  step(dtYears) {
    if (!this.alive) {
      this.fade = Math.max(0, this.fade - dtYears * 0.6);
      return;
    }
    const sub = SUBSTEPS_PER_FRAME;
    const dt = dtYears / sub;
    for (let i = 0; i < sub; i++) {
      verletStep(this, dt);
      const hit = collisionWith(this);
      if (hit) {
        this.alive = false;
        this.outcome = hit;
        return;
      }
    }
  }
  draw() {
    const a = this.outcome === "Earth"
      ? 200 * this.fade
      : (this.alive ? 80 : 50 * this.fade);
    if (a <= 1) return;
    noStroke();
    if (this.outcome === "Earth") fill(120, 220, 160, a);
    else if (this.outcome) fill(180, 110, 90, a);
    else fill(220, 200, 180, a);
    circle(this.x, this.y, (this.alive ? 1.6 : 2.4) * uiScale());
  }
}

// Spawn ghosts as perturbed copies of a launch. Heavier mass → tighter cloud.
function spawnGhosts(x, y, vx, vy, massIdx) {
  const speed = Math.hypot(vx, vy);
  // Spread inversely with sqrt(mass). massIdx 10 → 0.6% spread, 1 → ~6%.
  const rel = 0.06 / Math.sqrt(Math.max(1, massIdx));
  const angSpread = 0.04 / Math.sqrt(Math.max(1, massIdx));   // radians
  const ghosts = [];
  for (let i = 0; i < GHOST_COUNT; i++) {
    const dv = speed * rel * gaussian();
    const da = angSpread * gaussian();
    const dir = Math.atan2(vy, vx) + da;
    const s2 = speed + dv;
    ghosts.push(new Ghost(x, y, Math.cos(dir) * s2, Math.sin(dir) * s2));
  }
  return ghosts;
}
