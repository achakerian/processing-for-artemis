// particles.js — solar wind particles, flares, and aurora ribbons.
//
// Particle/Flare: overview view. Particles travel in straight lines from the
// sun, deflect when they enter a planet's magnetic "interaction sphere".
//
// ZoomParticle: Earth zoom view. Stronger dipole deflection. A small fraction
// gets "captured" onto a field line and slides to the nearest pole, where it
// triggers an AuroraRibbon.

class Particle {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.alive = true;
  }
  update(dt, planets) {
    for (const p of planets) {
      if (p.data.fieldStrength === 0) continue;
      const dx = this.x - p.x;
      const dy = this.y - p.y;
      const d = sqrt(dx * dx + dy * dy);
      if (d < p.visualRadius * 0.85) {
        this.alive = false;
        return;
      }
      // Interaction sphere grows with sqrt(fieldStrength), not linearly,
      // so Jupiter's sphere stays sane instead of swallowing half the screen.
      const sphereR = p.visualRadius * (2.5 + sqrt(p.data.fieldStrength) * 1.5);
      if (d < sphereR) {
        const dnorm = 1 - d / sphereR;
        // Perpendicular curve (deflection around the field) ...
        const perpX = -dy / d;
        const perpY = dx / d;
        const cross = this.vx * dy - this.vy * dx;
        const side = signOf(cross);
        const perpStrength = dnorm * p.data.fieldStrength * 40 * dt;
        // ... plus a radial outward push so particles can't get trapped
        // in a fake circular orbit. Without this, perpendicular force alone
        // mimics centripetal force and particles loop forever.
        const radialOutX = dx / d;
        const radialOutY = dy / d;
        const radialStrength = dnorm * p.data.fieldStrength * 28 * dt;
        this.vx += perpX * side * perpStrength + radialOutX * radialStrength;
        this.vy += perpY * side * perpStrength + radialOutY * radialStrength;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  draw() {
    noStroke();
    fill(255, 230, 180, 200);
    circle(this.x, this.y, 1.8 * uiScale());
  }
  isOffscreen() {
    const m = 80;
    return this.x < -m || this.x > width + m || this.y < -m || this.y > height + m;
  }
}

class Flare {
  constructor(sunX, sunY, sunR, count, speed) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TWO_PI + random(-0.04, 0.04);
      const v = speed * random(0.85, 1.15);
      this.particles.push(new Particle(
        sunX + cos(angle) * sunR,
        sunY + sin(angle) * sunR,
        cos(angle) * v,
        sin(angle) * v
      ));
    }
  }
  update(dt, planets) {
    for (const p of this.particles) p.update(dt, planets);
    this.particles = this.particles.filter((p) => p.alive && !p.isOffscreen());
  }
  draw() {
    for (const p of this.particles) p.draw();
  }
  isDead() {
    return this.particles.length === 0;
  }
}

class ZoomParticle {
  constructor(x, y, vx, vy, earthX, earthY, earthR) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.earthX = earthX;
    this.earthY = earthY;
    this.earthR = earthR;
    this.alive = true;
    this.captured = false;
    this.poleTarget = null;
    this.triggeredAurora = false;
  }
  update(dt) {
    if (this.captured) {
      const dx = this.poleTarget.x - this.x;
      const dy = this.poleTarget.y - this.y;
      const d = sqrt(dx * dx + dy * dy);
      if (d < this.earthR * 0.18) {
        this.alive = false;
        this.triggeredAurora = true;
        return;
      }
      const speed = this.earthR * 4;
      this.x += (dx / d) * speed * dt;
      this.y += (dy / d) * speed * dt;
      return;
    }

    const dx = this.x - this.earthX;
    const dy = this.y - this.earthY;
    const d = sqrt(dx * dx + dy * dy);
    // Match the outermost visible dipole field line so particles deflect
    // *around* the field, not through it.
    const fieldR = this.earthR * 7;

    if (d < this.earthR * 1.05) {
      this.alive = false;
      return;
    }

    if (d < fieldR) {
      // Capture only happens in the polar cusp region — the openings near
      // the magnetic poles where field lines connect to interplanetary
      // space. Particles arriving on the equatorial dayside get deflected
      // away; only those threading near the cusps funnel down to aurora.
      const angle = atan2(dy, dx);
      const absAngle = abs(angle);
      const inPolarCusp = absAngle > PI / 3 && absAngle < (2 * PI) / 3;
      if (inPolarCusp && d < this.earthR * 2.8 && random() < 0.018) {
        this.captured = true;
        this.poleTarget = dy < 0
          ? { x: this.earthX + random(-this.earthR * 0.12, this.earthR * 0.12), y: this.earthY - this.earthR * 0.95 }
          : { x: this.earthX + random(-this.earthR * 0.12, this.earthR * 0.12), y: this.earthY + this.earthR * 0.95 };
        return;
      }
      // Deflection: perpendicular curve + radial outward push, both with
      // quadratic falloff. Strong enough to keep particles outside the
      // visible field-line envelope.
      const dnorm = 1 - d / fieldR;
      const fall = dnorm * dnorm;
      const perpX = -dy / d;
      const perpY = dx / d;
      const cross = this.vx * dy - this.vy * dx;
      const side = signOf(cross);
      const radialOutX = dx / d;
      const radialOutY = dy / d;
      const perpStrength = fall * 1500 * dt;
      const radialStrength = fall * 600 * dt;
      this.vx += perpX * side * perpStrength + radialOutX * radialStrength;
      this.vy += perpY * side * perpStrength + radialOutY * radialStrength;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  draw() {
    noStroke();
    if (this.captured) {
      fill(150, 220, 255, 220);
    } else {
      fill(255, 230, 180, 200);
    }
    circle(this.x, this.y, 2.2 * uiScale());
  }
  isOffscreen() {
    const m = 100;
    return this.x < -m || this.x > width + m || this.y < -m || this.y > height + m;
  }
}

// AuroraRibbon — a vertical "curtain" column in the aurora borealis idiom:
// green base (oxygen 557.7nm at low altitude), shading up through
// yellow-green and red (oxygen 630nm + nitrogen) into violet at the tip,
// with a subtle horizontal wobble that drifts over the column's lifetime.
class AuroraRibbon {
  constructor(x, y, isNorth) {
    this.x = x;
    this.y = y;
    this.isNorth = isNorth;
    this.life = 1.0;
    this.maxLife = random(1.6, 2.4);
    this.baseWidth = random(4, 9) * uiScale();
    this.height = random(80, 170) * uiScale();
    this.wobbleSeed = random(1000);
    this.wobbleAmp = random(0.4, 1.1);
  }
  update(dt) {
    this.life -= dt / this.maxLife;
  }
  draw() {
    if (this.life <= 0) return;
    const dir = this.isNorth ? -1 : 1;
    const lifeT = constrain(this.life, 0, 1);
    // Soft envelope: fades in fast, lingers, fades out
    const envelope = lifeT < 0.9 ? lifeT / 0.9 : 1;
    const phase = (1 - this.life) * 3;

    noStroke();
    const SEGMENTS = 18;
    const segH = this.height / SEGMENTS;
    for (let i = 0; i < SEGMENTS; i++) {
      const t = i / (SEGMENTS - 1);
      const yPos = this.y + dir * this.height * t;
      const wobble =
        (noise(this.wobbleSeed + t * 2.5 + phase) - 0.5) *
        this.baseWidth * 2.5 * this.wobbleAmp;
      const xPos = this.x + wobble;

      let cr, cg, cb;
      if (t < 0.45) {
        const tt = t / 0.45;
        cr = lerp(60, 130, tt);
        cg = lerp(255, 230, tt);
        cb = lerp(120, 90, tt);
      } else if (t < 0.78) {
        const tt = (t - 0.45) / 0.33;
        cr = lerp(130, 210, tt);
        cg = lerp(230, 110, tt);
        cb = lerp(90, 110, tt);
      } else {
        const tt = (t - 0.78) / 0.22;
        cr = lerp(210, 170, tt);
        cg = lerp(110, 50, tt);
        cb = lerp(110, 200, tt);
      }

      const segAlpha = envelope * pow(1 - t * 0.85, 1.2) * 230;
      const w = this.baseWidth * (1 + t * 0.3);

      fill(cr, cg, cb, segAlpha);
      ellipse(xPos, yPos, w * 1.7, segH * 2);
    }
  }
  isDead() {
    return this.life <= 0;
  }
}
