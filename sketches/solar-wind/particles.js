// particles.js — solar wind particles.
//
// Same model everywhere: a particle either bounces off a planet's magnetic
// field, energises against it (color change + fade out), or escapes into
// deep space if it never meets a field. No capture, no orbital trapping,
// no aurora.

const ENERGIZE_PROB = 0.28;
const ENERGIZE_FADE = 1.4;   // 1/seconds — full fade in ~0.7s

class Particle {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.alive = true;
    this.energized = false;
    this.energizeLife = 1.0;
  }
  update(dt, planets) {
    if (this.energized) {
      this.energizeLife -= dt * ENERGIZE_FADE;
      if (this.energizeLife <= 0) {
        this.alive = false;
        return;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }

    for (const p of planets) {
      if (p.data.fieldStrength === 0) continue;
      const dx = this.x - p.x;
      const dy = this.y - p.y;
      const d = sqrt(dx * dx + dy * dy);
      if (d < p.visualRadius * 0.9) {
        // Got through any field and hit the surface itself.
        this.energized = true;
        this.energizeLife = 1.0;
        return;
      }
      const sphereR = p.visualRadius * (2.5 + sqrt(p.data.fieldStrength) * 1.5);
      if (d < sphereR) {
        const nx = dx / d;
        const ny = dy / d;
        const vDotN = this.vx * nx + this.vy * ny;
        if (vDotN < 0) {
          if (random() < ENERGIZE_PROB) {
            this.energized = true;
            this.energizeLife = 1.0;
          } else {
            // Bounce: reflect velocity along outward normal, then nudge
            // just outside the sphere so we don't immediately re-trigger.
            this.vx -= 2 * vDotN * nx;
            this.vy -= 2 * vDotN * ny;
            const push = sphereR - d + 1;
            this.x += nx * push;
            this.y += ny * push;
          }
          return;
        }
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  draw() {
    noStroke();
    if (this.energized) {
      const alpha = constrain(this.energizeLife, 0, 1);
      fill(160, 220, 255, alpha * 240);
      circle(this.x, this.y, 2.5 * uiScale());
      fill(160, 220, 255, alpha * 80);
      circle(this.x, this.y, 5 * uiScale());
    } else {
      fill(255, 230, 180, 200);
      circle(this.x, this.y, 1.8 * uiScale());
    }
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

// ZoomParticle — same rules as Particle, with a single Earth-sized field
// to bounce against. The Earth's field boundary is sized to match the
// outermost visible dipole field line so the bounce reads visually.
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
    this.energized = false;
    this.energizeLife = 1.0;
  }
  // Returns true if the particle interacted with the field this frame
  // (so the caller can accumulate bombardment pressure on the magnetopause).
  update(dt) {
    if (this.energized) {
      this.energizeLife -= dt * ENERGIZE_FADE;
      if (this.energizeLife <= 0) {
        this.alive = false;
        return false;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return false;
    }

    const dx = this.x - this.earthX;
    const dy = this.y - this.earthY;
    const d = sqrt(dx * dx + dy * dy);

    if (d < this.earthR * 1.05) {
      this.energized = true;
      this.energizeLife = 1.0;
      return true;
    }

    // Boundary uses the Shue magnetopause shape — compressed on the
    // sunward side (left in our view), stretched into a long teardrop
    // tail on the nightside (right). θ measured from sun direction.
    const theta = atan2(dy, -dx);
    const boundR = shueBoundaryR(theta, this.earthR);

    if (d < boundR) {
      const nx = dx / d;
      const ny = dy / d;
      const vDotN = this.vx * nx + this.vy * ny;
      if (vDotN < 0) {
        if (random() < ENERGIZE_PROB) {
          this.energized = true;
          this.energizeLife = 1.0;
          return true;
        }
        this.vx -= 2 * vDotN * nx;
        this.vy -= 2 * vDotN * ny;
        const push = boundR - d + 1;
        this.x += nx * push;
        this.y += ny * push;
        return true;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    return false;
  }
  draw() {
    noStroke();
    if (this.energized) {
      const alpha = constrain(this.energizeLife, 0, 1);
      fill(160, 220, 255, alpha * 240);
      circle(this.x, this.y, 3 * uiScale());
      fill(160, 220, 255, alpha * 90);
      circle(this.x, this.y, 6 * uiScale());
    } else {
      fill(255, 230, 180, 200);
      circle(this.x, this.y, 2 * uiScale());
    }
  }
  isOffscreen() {
    const m = 100;
    return this.x < -m || this.x > width + m || this.y < -m || this.y > height + m;
  }
}

