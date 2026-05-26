// gallery.js — the gallery IS a p5 sketch.
// Add a new sketch by adding an entry to `sketches` below (slug + title +
// description + a drawPreview function). No data files, no CSS, no thumbnails.
//
// Responsive: every size derives from uiScale() so the same code looks right
// from a phone to a 4K wall display. Cards grow up to MAX_CARD_W, then more
// columns are added. Mouse and touch are both handled.

const sketches = [
  {
    slug: "starfield",
    title: "Starfield",
    description: "Drifting stars that lean toward your cursor.",
    seed: 1,
    drawPreview(g, w, h) {
      g.background(5, 6, 10);
      g.noStroke();
      const density = (w * h) / 18000;
      for (let i = 0; i < density; i++) {
        const r = g.random(0.4, 2.4) * (g.width / 280);
        const a = g.random(60, 230);
        g.fill(231, 236, 243, a);
        g.circle(g.random(w), g.random(h), r);
      }
    },
  },
  {
    slug: "magnetosphere",
    title: "Magnetosphere",
    description: "Earth's magnetic shield, alive — solar wind, substorms, the auroral oval.",
    seed: 13,
    drawPreview(g, w, h) {
      g.background(4, 5, 9);
      g.noStroke();
      const k = w / 280;

      const starCount = (w * h) / 14000;
      for (let i = 0; i < starCount; i++) {
        g.fill(231, 236, 243, g.random(40, 180));
        g.circle(g.random(w), g.random(h), g.random(0.4, 1.6) * k);
      }

      // wind streaks from the left
      g.stroke(255, 225, 170, 65);
      g.strokeWeight(0.7 * k);
      for (let i = 0; i < 14; i++) {
        const sy = g.random(h);
        const sx = g.random(0, w * 0.45);
        g.line(sx, sy, sx + 18 * k, sy);
      }

      const ex = w * 0.36;
      const ey = h * 0.56;
      const er = 18 * k;

      // magnetosheath (warm shell between bow shock and magnetopause)
      const N = 60;
      const outer = [];
      const inner = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const c = Math.cos(a);
        const t = (c + 1) / 2;
        const mp = er * (2.5 + (6.5 - 2.5) * t);
        const bs = er * (3.4 + (8.5 - 3.4) * t);
        outer.push([ex + Math.cos(a) * bs, ey + Math.sin(a) * bs]);
        inner.push([ex + Math.cos(a) * mp, ey + Math.sin(a) * mp]);
      }
      const passes = [
        [255, 110, 90, 55],
        [255, 160, 110, 35],
        [255, 200, 150, 22],
      ];
      for (const p of passes) {
        g.fill(p[0], p[1], p[2], p[3]);
        g.noStroke();
        g.beginShape();
        for (const pt of outer) g.vertex(pt[0], pt[1]);
        g.beginContour();
        for (let i = inner.length - 1; i >= 0; i--) g.vertex(inner[i][0], inner[i][1]);
        g.endContour();
        g.endShape(g.CLOSE);
      }

      g.noFill();
      g.stroke(170, 225, 255, 110);
      g.strokeWeight(1 * k);
      g.beginShape();
      for (const pt of outer) g.vertex(pt[0], pt[1]);
      g.endShape(g.CLOSE);

      // plasma sheet down the tail
      g.stroke(220, 150, 255, 160);
      g.strokeWeight(1.4 * k);
      g.line(ex + er * 1.6, ey, w + 5, ey);

      // closed dipole field lines
      g.stroke(140, 215, 255, 130);
      g.strokeWeight(0.9 * k);
      for (const L of [1.5, 2.0, 2.7]) {
        for (const side of [-1, 1]) {
          const xScale = side === -1 ? 0.85 : 1.6;
          g.noFill();
          g.beginShape();
          for (let lam = -Math.PI / 2 + 0.05; lam <= Math.PI / 2 - 0.05; lam += 0.06) {
            const r = L * Math.cos(lam) * Math.cos(lam);
            const dx = side * r * Math.cos(lam) * xScale * er;
            const dy = -r * Math.sin(lam) * er;
            g.vertex(ex + dx, ey + dy);
          }
          g.endShape();
        }
      }

      // open polar field lines into the tail (both lobes)
      g.stroke(150, 200, 255, 130);
      g.strokeWeight(1 * k);
      for (const sgn of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const tailLen = (4.5 + i * 2) * er;
          const sx = ex - Math.cos(1.4) * er * 1.02;
          const sy = ey + sgn * Math.sin(1.4) * er * 1.02;
          const c1x = ex + er * 0.6, c1y = ey + sgn * er * 1.6;
          const c2x = ex + er * 2.2, c2y = ey + sgn * er * 0.9;
          const exX = ex + tailLen, exY = ey + sgn * er * 0.4;
          g.noFill();
          g.beginShape();
          for (let u = 0; u <= 1.001; u += 0.05) {
            const um = 1 - u;
            const px = um*um*um*sx + 3*um*um*u*c1x + 3*um*u*u*c2x + u*u*u*exX;
            const py = um*um*um*sy + 3*um*um*u*c1y + 3*um*u*u*c2y + u*u*u*exY;
            g.vertex(px, py);
          }
          g.endShape();
        }
      }

      // aurora ovals at both poles (green→red→violet)
      const ovalLayers = [
        [120, 255, 150, 230, 4.5],
        [255, 110, 130, 130, 2.8],
        [180, 100, 255, 80,  2.2],
      ];
      for (const sgn of [-1, 1]) {
        for (const L of ovalLayers) {
          g.noFill();
          g.stroke(L[0], L[1], L[2], L[3]);
          g.strokeWeight(L[4] * k * 0.6);
          g.arc(ex, ey + sgn * er * 0.78, er * 1.15, er * 0.35,
                sgn > 0 ? Math.PI : 0, sgn > 0 ? Math.PI * 2 : Math.PI);
        }
      }

      // atmosphere limb
      g.noFill();
      for (let i = 0; i < 5; i++) {
        g.stroke(80, 160, 230, 60 - i * 10);
        g.strokeWeight(1 + i * 0.6);
        g.circle(ex, ey, er * 2 + i * 3 * k);
      }

      // earth: night base, lit left hemisphere
      g.noStroke();
      g.fill(10, 18, 38);
      g.circle(ex, ey, er * 2);
      g.fill(78, 135, 195, 250);
      g.arc(ex, ey, er * 2 * 0.96, er * 2 * 0.96, Math.PI / 2, Math.PI / 2 + Math.PI);
      g.fill(72, 158, 118, 220);
      g.push();
      g.translate(ex, ey);
      g.rotate(0.32);
      g.ellipse(-er * 0.55, -er * 0.15, er * 0.65, er * 0.38);
      g.ellipse(-er * 0.3, er * 0.32, er * 0.5, er * 0.35);
      g.pop();
      // night-side city lights
      g.fill(255, 210, 140, 200);
      for (let i = 0; i < 8; i++) {
        const ang = i * 0.87 + 0.4;
        const rad = er * (0.4 + (i * 0.13) % 0.45);
        const x = ex + Math.cos(ang) * rad;
        const y = ey + Math.sin(ang) * rad;
        if (x - ex > er * 0.05) g.circle(x, y, 1.2 * k);
      }
    },
  },
  {
    slug: "asteroid-impact",
    title: "Asteroid Impact Probability",
    description: "Fling an asteroid through a log-scaled solar system. Track its odds of hitting Earth in 50 cycles.",
    seed: 23,
    drawPreview(g, w, h) {
      g.background(5, 6, 10);
      g.noStroke();
      const cx = w / 2;
      const cy = h / 2;
      const k = w / 280;

      // sun
      for (let i = 4; i > 0; i--) {
        g.fill(255, 180, 90, 22 / i);
        g.circle(cx, cy, 14 * k * (1 + i * 0.35));
      }
      g.fill(255, 210, 90);
      g.circle(cx, cy, 12 * k);
      g.fill(255, 240, 200);
      g.circle(cx, cy, 9 * k);

      // log-spaced orbits + planets
      const radii = [20, 30, 42, 54, 76, 94, 114, 132];
      const sizes = [2.0, 3.0, 3.2, 2.5, 6.4, 5.6, 4.2, 4.2];
      const cols = [
        [180, 175, 170], [220, 190, 130], [80, 140, 200], [200, 110, 80],
        [220, 190, 150], [220, 200, 160], [170, 220, 230], [80, 110, 220],
      ];
      g.noFill();
      g.stroke(120, 170, 220, 35);
      g.strokeWeight(1);
      for (let i = 0; i < radii.length; i++) {
        g.circle(cx, cy, radii[i] * k * 2);
      }
      g.noStroke();
      const angles = [];
      for (let i = 0; i < radii.length; i++) {
        const a = g.random(0, Math.PI * 2);
        angles.push(a);
        const r = radii[i] * k;
        const sz = sizes[i] * k;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        g.fill(cols[i][0], cols[i][1], cols[i][2]);
        g.circle(px, py, sz);
      }

      // Halley-like comet path (faint tilted ellipse)
      g.noFill();
      g.stroke(200, 150, 220, 55);
      g.strokeWeight(1);
      g.push();
      g.translate(cx, cy);
      g.rotate(-0.4);
      const cometA = 75 * k;
      const cometB = 30 * k;
      g.ellipse(-cometA * 0.45, 0, cometA * 2, cometB * 2);
      g.pop();

      // asteroid curving in toward Earth (3rd orbit)
      const earthR = radii[2] * k;
      const earthAngle = angles[2];
      const ex = cx + Math.cos(earthAngle) * earthR;
      const ey = cy + Math.sin(earthAngle) * earthR;
      const startX = w - 18 * k;
      const startY = 18 * k;
      const ctrl1X = cx + 90 * k;
      const ctrl1Y = cy - 30 * k;
      const ctrl2X = ex + 50 * k;
      const ctrl2Y = ey - 28 * k;

      // glow trail
      for (let i = 6; i > 0; i--) {
        g.stroke(255, 170, 110, 12 * i);
        g.strokeWeight(0.5 * k * i);
        g.noFill();
        g.bezier(startX, startY, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, ex, ey);
      }
      g.stroke(255, 220, 170, 220);
      g.strokeWeight(1.4 * k);
      g.noFill();
      g.bezier(startX, startY, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, ex, ey);

      // asteroid head
      g.noStroke();
      g.fill(255, 220, 180);
      g.circle(startX, startY, 3 * k);

      // impact halo on Earth
      g.noFill();
      g.stroke(120, 220, 160, 220);
      g.strokeWeight(1.2 * k);
      g.circle(ex, ey, sizes[2] * k * 2.6);
    },
  },
  {
    slug: "solar-wind",
    title: "Solar Wind",
    description: "Tap the sun. Tap a planet. Watch space weather happen.",
    seed: 7,
    drawPreview(g, w, h) {
      g.background(5, 6, 10);
      g.noStroke();
      const cx = w / 2;
      const cy = h / 2;
      const k = w / 280;

      // sun corona
      for (let i = 4; i > 0; i--) {
        g.fill(255, 180, 90, 22 / i);
        g.circle(cx, cy, 18 * k * (1 + i * 0.35));
      }
      g.fill(255, 210, 90);
      g.circle(cx, cy, 16 * k);
      g.fill(255, 240, 200);
      g.circle(cx, cy, 12 * k);

      // orbit rings + planets (compressed log scale)
      const radii = [22, 32, 44, 58, 80, 100, 122, 142];
      const sizes = [2.2, 3.3, 3.4, 2.7, 7, 6, 4.5, 4.5];
      const cols = [
        [180, 175, 170], [220, 190, 130], [80, 140, 200], [200, 110, 80],
        [220, 190, 150], [220, 200, 160], [170, 220, 230], [80, 110, 220],
      ];

      g.noFill();
      g.stroke(120, 170, 220, 45);
      g.strokeWeight(1);
      for (let i = 0; i < radii.length; i++) {
        g.circle(cx, cy, radii[i] * k * 2);
      }

      g.noStroke();
      for (let i = 0; i < radii.length; i++) {
        const r = radii[i] * k;
        const sz = sizes[i] * k;
        const angle = g.random(0, Math.PI * 2);
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        g.fill(cols[i][0], cols[i][1], cols[i][2]);
        g.circle(px, py, sz);
        if (i === 5) {
          g.noFill();
          g.stroke(220, 200, 160, 200);
          g.strokeWeight(0.8);
          g.ellipse(px, py, sz * 2.5, sz * 0.8);
          g.noStroke();
        }
      }
    },
  },
];

// --- Layout constants (in design pixels; multiply by uiScale at use) ---
const BASE_CARD_W = 280;
const MAX_CARD_W = 520;
// Card height is computed from the thumb (proportional to width) plus a
// text band sized just for title + up to two lines of description. Fixed
// aspect ratios leave way too much empty space on bigger screens.
const THUMB_RATIO = 0.50;        // thumb height = cardW × this
const TEXT_BAND = 96;            // design pixels for title + 2-line desc + padding
const PADDING = 32;
const GAP = 20;
const HEADER_TOP = 76;
const HEADER_GAP = 110;          // distance from top of canvas to first card row

const REPO_URL = "https://github.com/achakerian/processing-for-artemis";
const REPO_LABEL = "github.com/achakerian/processing-for-artemis";

let cards = [];
let layout = null;
let repoLinkBounds = null;

// --- Scrolling ---
let scrollY = 0;
let maxScroll = 0;
let touchAnchorY = null;
let touchAnchorScrollY = 0;
let touchDragDistance = 0;
const TOUCH_DRAG_THRESHOLD = 10;
const SCROLL_BOTTOM_PADDING = 32;

// --- Animated background: drifting starfield + occasional comet events ---
const BG_STAR_DENSITY = 1 / 3200;       // stars per pixel of viewport
const BG_STAR_MIN = 220;
const BG_STAR_MAX = 1500;
const COMET_INTERVAL_MIN = 12;
const COMET_INTERVAL_MAX = 28;
const COMET_TRAIL_LEN = 55;
let bgStars = [];
let comets = [];
let cometTimer = 4;                     // first comet ~4s after load
let bgLastMs = 0;

class BgStar {
  constructor() { this.reset(true); }
  reset(initial) {
    this.x = random(-width, width);
    this.y = random(-height, height);
    this.z = initial ? random(width) : width;
    this.speed = random(0.4, 1.8);
  }
}

class Comet {
  constructor() {
    // Origin on a random edge; aim across the canvas
    const edge = floor(random(4));
    let x, y;
    if (edge === 0)      { x = random(width);   y = -30; }
    else if (edge === 1) { x = width + 30;       y = random(height); }
    else if (edge === 2) { x = random(width);    y = height + 30; }
    else                 { x = -30;              y = random(height); }
    const tx = random(width);
    const ty = random(height);
    const angle = atan2(ty - y, tx - x);
    const speed = random(280, 520);
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;
    this.trail = [{ x, y }];
    this.alive = true;
  }
  update(dt) {
    const head = this.trail[0];
    const nx = head.x + this.vx * dt;
    const ny = head.y + this.vy * dt;
    this.trail.unshift({ x: nx, y: ny });
    if (this.trail.length > COMET_TRAIL_LEN) this.trail.pop();
    if (nx < -120 || nx > width + 120 || ny < -120 || ny > height + 120) {
      this.alive = false;
    }
  }
  draw(s) {
    noFill();
    for (let i = 1; i < this.trail.length; i++) {
      const t = 1 - i / this.trail.length;
      const a = this.trail[i - 1];
      const b = this.trail[i];
      stroke(200, 230, 255, t * 200);
      strokeWeight(t * 2.2 * s);
      line(a.x, a.y, b.x, b.y);
    }
    noStroke();
    const h = this.trail[0];
    fill(255, 250, 230, 90);
    circle(h.x, h.y, 9 * s);
    fill(255, 250, 230, 240);
    circle(h.x, h.y, 3.6 * s);
  }
}

function buildBgStars() {
  bgStars = [];
  const n = constrain(
    floor(width * height * BG_STAR_DENSITY),
    BG_STAR_MIN,
    BG_STAR_MAX
  );
  for (let i = 0; i < n; i++) bgStars.push(new BgStar());
}

function drawBackground(dt, s) {
  // Drifting starfield with subtle cursor parallax
  const cx = (mouseX - width / 2) * 0.0008;
  const cy = (mouseY - height / 2) * 0.0008;
  noStroke();
  for (const st of bgStars) {
    st.z -= st.speed;
    if (st.z < 1) st.reset(false);
    const k = 128 / st.z;
    const sx = (st.x + cx * st.z) * k + width / 2;
    const sy = (st.y + cy * st.z) * k + height / 2;
    if (sx < 0 || sx > width || sy < 0 || sy > height) continue;
    const r = map(st.z, 0, width, 2.0, 0.3) * s;
    const a = map(st.z, 0, width, 230, 50);
    fill(231, 236, 243, a);
    circle(sx, sy, r);
  }

  // Occasional comet event
  cometTimer -= dt;
  if (cometTimer <= 0) {
    comets.push(new Comet());
    cometTimer = random(COMET_INTERVAL_MIN, COMET_INTERVAL_MAX);
  }
  for (const c of comets) c.update(dt);
  comets = comets.filter((c) => c.alive);
  for (const c of comets) c.draw(s);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("system-ui, -apple-system, sans-serif");
  buildCards();
  buildBgStars();
  bgLastMs = millis();
}

function uiScale() {
  // Reference: a 1440x900 laptop. min() so portrait phones don't blow up,
  // landscape ultrawides don't either.
  return constrain(min(width, height) / 900, 0.75, 4.0);
}

function computeLayout() {
  const s = uiScale();
  const padding = PADDING * s;
  const gap = GAP * s;
  const maxCardW = MAX_CARD_W * s;
  const available = width - padding * 2;

  // How many MAX-sized cards fit? At least 1.
  let cols = Math.max(1, Math.floor((available + gap) / (maxCardW + gap)));
  // Card width = max-cap, unless even one card overflows (small screens).
  let cardW = Math.min(maxCardW, available);
  if (cols >= 2) cardW = maxCardW;
  cardW = Math.max(BASE_CARD_W * 0.7 * s, cardW);

  const thumbH = Math.floor(cardW * THUMB_RATIO);
  const textH = Math.floor(TEXT_BAND * s);
  const cardH = thumbH + textH;
  const gridW = cols * cardW + (cols - 1) * gap;
  const offsetX = Math.floor((width - gridW) / 2);
  const headerH = HEADER_GAP * s + 32 * s;

  return { s, padding, gap, cardW, cardH, thumbH, cols, offsetX, headerH };
}

function buildCards() {
  layout = computeLayout();
  cards = [];
  for (let i = 0; i < sketches.length; i++) {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    const x = layout.offsetX + col * (layout.cardW + layout.gap);
    const y = layout.headerH + row * (layout.cardH + layout.gap);
    cards.push(
      new Card(sketches[i], x, y, layout.cardW, layout.cardH, layout.thumbH)
    );
  }
}

class Card {
  constructor(sketch, x, y, w, h, thumbH) {
    this.sketch = sketch;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.thumbH = thumbH;
    this.thumb = createGraphics(Math.floor(w), this.thumbH);
    this.thumb.randomSeed(sketch.seed);
    sketch.drawPreview(this.thumb, Math.floor(w), this.thumbH);
    this.hovered = false;
  }

  contains(mx, my) {
    return (
      mx >= this.x && mx <= this.x + this.w &&
      my >= this.y && my <= this.y + this.h
    );
  }

  draw(s) {
    push();
    translate(this.x, this.y);

    const radius = 10 * s;

    noStroke();
    fill(13, 16, 24);
    rect(0, 0, this.w, this.h, radius);

    image(this.thumb, 0, 0);

    fill(231, 236, 243);
    textSize(18 * s);
    textStyle(BOLD);
    text(this.sketch.title, 14 * s, this.thumbH + 28 * s);

    fill(138, 147, 166);
    textSize(14 * s);
    textStyle(NORMAL);
    text(
      this.sketch.description,
      14 * s,
      this.thumbH + 52 * s,
      this.w - 28 * s
    );

    if (this.hovered) {
      noFill();
      stroke(NASA_BLUE[0], NASA_BLUE[1], NASA_BLUE[2]);
      strokeWeight(1.5 * s);
      rect(0.5, 0.5, this.w - 1, this.h - 1, radius);
    }

    pop();
  }
}

function draw() {
  background(5, 6, 10);
  const s = layout.s;

  // Animated background — starfield + occasional comets, drawn in screen
  // coords so they sit behind the (scrolling) cards.
  const now = millis();
  const dt = bgLastMs === 0 ? 0.016 : min((now - bgLastMs) / 1000, 0.05);
  bgLastMs = now;
  drawBackground(dt, s);

  // Compute scroll extent from last card's bottom edge.
  const lastBottom =
    cards.length > 0
      ? cards[cards.length - 1].y + cards[cards.length - 1].h
      : layout.headerH;
  maxScroll = max(0, lastBottom + SCROLL_BOTTOM_PADDING * s - height);
  scrollY = constrain(scrollY, 0, maxScroll);

  // World pointer Y for hit detection inside the scrolled region.
  const worldMouseY = mouseY + scrollY;

  push();
  translate(0, -scrollY);
  drawHeader(s);

  let anyHover = false;
  for (const c of cards) {
    c.hovered = c.contains(mouseX, worldMouseY);
    if (c.hovered) anyHover = true;
    c.draw(s);
  }
  pop();

  if (maxScroll > 0) drawScrollIndicator(s);

  cursor(anyHover || pointerInRepoLink(mouseX, worldMouseY) ? "pointer" : "default");
}

function drawScrollIndicator(s) {
  const w = 4 * s;
  const trackH = height - 24 * s;
  const trackX = width - 10 * s;
  const trackY = 12 * s;
  noStroke();
  fill(231, 236, 243, 28);
  rect(trackX, trackY, w, trackH, w / 2);
  const totalContent = height + maxScroll;
  const thumbH = max(30 * s, (height / totalContent) * trackH);
  const thumbY = trackY + (scrollY / maxScroll) * (trackH - thumbH);
  fill(231, 236, 243, 110);
  rect(trackX, thumbY, w, thumbH, w / 2);
}

// NASA-inspired palette
const NASA_BLUE = [77, 134, 255];   // bright "insignia blue" tuned for dark bg
const NASA_RED  = [252, 61, 33];    // NASA mission red
const TEXT_FG   = [231, 236, 243];
const TEXT_DIM  = [138, 147, 166];

function drawHeader(s) {
  const leftX = cards.length > 0 ? cards[0].x : PADDING * s;

  noStroke();

  // Title: "Processing for" in white, "Artemis" in NASA red (nod to the program).
  textSize(44 * s);
  textStyle(BOLD);
  const titleLead = "Processing for ";
  const titleAccent = "Artemis";
  fill(...TEXT_FG);
  text(titleLead, leftX, HEADER_TOP * s);
  const titleLeadW = textWidth(titleLead);
  fill(...NASA_RED);
  text(titleAccent, leftX + titleLeadW, HEADER_TOP * s);

  // Subhead: "The code is free to use and develop @ <repo>"
  textSize(16 * s);
  textStyle(NORMAL);
  const linkLineY = (HEADER_TOP + 30) * s;
  const lead = "The code is free to use and develop @ ";
  const leadW = textWidth(lead);
  const linkW = textWidth(REPO_LABEL);
  const availableW = width - leftX - PADDING * s;
  const oneLine = leadW + linkW + 8 * s <= availableW;

  let linkX, linkY;
  fill(...TEXT_DIM);
  if (oneLine) {
    text(lead, leftX, linkLineY);
    linkX = leftX + leadW;
    linkY = linkLineY;
  } else {
    text(lead, leftX, linkLineY);
    linkX = leftX;
    linkY = linkLineY + 22 * s;
  }

  const padX = 4 * s;
  const padY = 4 * s;
  repoLinkBounds = {
    x: linkX - padX,
    y: linkY - 16 * s,
    w: linkW + padX * 2,
    h: 24 * s + padY,
  };
  const hovered = pointerInRepoLink(mouseX, mouseY + scrollY);
  textStyle(BOLD);
  fill(NASA_BLUE[0], NASA_BLUE[1], NASA_BLUE[2], hovered ? 255 : 230);
  text(REPO_LABEL, linkX, linkY);
  textStyle(NORMAL);
  if (hovered) {
    stroke(NASA_BLUE[0], NASA_BLUE[1], NASA_BLUE[2], 230);
    strokeWeight(1.2 * s);
    line(linkX, linkY + 3 * s, linkX + linkW, linkY + 3 * s);
    noStroke();
  }
}

function pointerInRepoLink(px, py) {
  if (!repoLinkBounds) return false;
  const b = repoLinkBounds;
  return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
}

function navigateFromPointer(px, py) {
  if (pointerInRepoLink(px, py)) {
    window.open(REPO_URL, "_blank", "noopener");
    return true;
  }
  for (const c of cards) {
    if (c.contains(px, py)) {
      window.location.href = `sketches/${c.sketch.slug}/`;
      return true;
    }
  }
  return false;
}

function mousePressed() {
  navigateFromPointer(mouseX, mouseY + scrollY);
}

function mouseWheel(event) {
  if (maxScroll <= 0) return;
  scrollY = constrain(scrollY + event.delta, 0, maxScroll);
  return false; // prevent the browser from scrolling the page
}

// Touch is unified across drag-to-scroll and tap-to-navigate: if the finger
// moves more than TOUCH_DRAG_THRESHOLD before lifting, it's a scroll;
// otherwise it's a tap.
function touchStarted() {
  if (touches && touches.length > 0) {
    touchAnchorY = touches[0].y;
    touchAnchorScrollY = scrollY;
    touchDragDistance = 0;
  }
  return false;
}

function touchMoved() {
  if (touches && touches.length > 0 && touchAnchorY !== null) {
    const dy = touchAnchorY - touches[0].y;
    touchDragDistance = max(touchDragDistance, abs(dy));
    scrollY = constrain(touchAnchorScrollY + dy, 0, maxScroll);
  }
  return false;
}

function touchEnded() {
  if (touchAnchorY !== null && touchDragDistance < TOUCH_DRAG_THRESHOLD) {
    navigateFromPointer(mouseX, mouseY + scrollY);
  }
  touchAnchorY = null;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildCards();
  buildBgStars();
  scrollY = 0; // reset scroll after layout change so we don't leave the user mid-page
}
