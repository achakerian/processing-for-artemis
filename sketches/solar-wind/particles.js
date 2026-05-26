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
      const sphereR = p.visualRadius * (3 + p.data.fieldStrength * 2.2);
      if (d < sphereR) {
        const perpX = -dy / d;
        const perpY = dx / d;
        const cross = this.vx * dy - this.vy * dx;
        const side = signOf(cross);
        const strength = (1 - d / sphereR) * p.data.fieldStrength * 60 * dt;
        this.vx += perpX * side * strength;
        this.vy += perpY * side * strength;
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
    const fieldR = this.earthR * 5;

    if (d < this.earthR * 1.05) {
      this.alive = false;
      return;
    }

    if (d < fieldR) {
      // small chance per frame to be captured onto a field line
      if (d < this.earthR * 3 && random() < 0.04) {
        this.captured = true;
        this.poleTarget = dy < 0
          ? { x: this.earthX + random(-this.earthR * 0.15, this.earthR * 0.15), y: this.earthY - this.earthR }
          : { x: this.earthX + random(-this.earthR * 0.15, this.earthR * 0.15), y: this.earthY + this.earthR };
        return;
      }
      // perpendicular deflection — push the particle around the field
      const perpX = -dy / d;
      const perpY = dx / d;
      const cross = this.vx * dy - this.vy * dx;
      const side = signOf(cross);
      const strength = (1 - d / fieldR) * 240 * dt;
      this.vx += perpX * side * strength;
      this.vy += perpY * side * strength;
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

class AuroraRibbon {
  constructor(x, y, isNorth) {
    this.segments = [];
    const dir = isNorth ? -1 : 1;
    const s = uiScale();
    let cx = x;
    let cy = y;
    for (let i = 0; i < 10; i++) {
      this.segments.push({ x: cx, y: cy });
      cx += random(-5, 5) * s;
      cy += dir * (4 + random(0, 6)) * s;
    }
    this.life = 1.0;
  }
  update(dt) {
    this.life -= dt * 0.85;
  }
  draw() {
    const alpha = constrain(this.life, 0, 1) * 220;
    strokeWeight(2.8 * uiScale());
    noFill();
    for (let i = 0; i < this.segments.length - 1; i++) {
      const t = i / (this.segments.length - 1);
      stroke(
        lerp(70, 180, t),
        lerp(255, 90, t),
        lerp(140, 230, t),
        alpha
      );
      const a = this.segments[i];
      const b = this.segments[i + 1];
      line(a.x, a.y, b.x, b.y);
    }
  }
  isDead() {
    return this.life <= 0;
  }
}
