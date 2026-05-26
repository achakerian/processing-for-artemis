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
    description: "Solar flares meet Earth's magnetic shield — bounce or aurora.",
    seed: 13,
    drawPreview(g, w, h) {
      g.background(5, 6, 10);
      g.noStroke();
      const k = w / 280;

      // starfield
      const starCount = (w * h) / 14000;
      for (let i = 0; i < starCount; i++) {
        g.fill(231, 236, 243, g.random(50, 180));
        g.circle(g.random(w), g.random(h), g.random(0.4, 1.6) * k);
      }

      // sun (left)
      const sx = w * 0.18;
      const sy = h * 0.5;
      const sr = 12 * k;
      for (let i = 4; i > 0; i--) {
        g.fill(255, 180, 90, 22 / i);
        g.circle(sx, sy, sr * 2 * (1 + i * 0.32));
      }
      g.fill(255, 210, 90);
      g.circle(sx, sy, sr * 2);
      g.fill(255, 240, 200);
      g.circle(sx, sy, sr * 1.4);

      // earth (right)
      const ex = w * 0.78;
      const ey = h * 0.5;
      const er = sr / 3;
      // asymmetric magnetopause (teardrop)
      g.noFill();
      g.stroke(140, 210, 255, 45);
      g.strokeWeight(1 * k);
      g.beginShape();
      for (let a = 0; a < Math.PI * 2 + 0.01; a += 0.06) {
        const c = Math.cos(a);
        const t = (c + 1) / 2;
        const R = er * (2.6 + (5.5 - 2.6) * t);
        g.vertex(ex + Math.cos(a) * R, ey + Math.sin(a) * R);
      }
      g.endShape();

      // dipole field lines (asymmetric)
      const Lvals = [1.3, 1.8, 2.4, 3.0];
      g.stroke(140, 215, 255, 110);
      g.strokeWeight(1 * k);
      for (const L of Lvals) {
        for (const side of [-1, 1]) {
          g.beginShape();
          for (let theta = 0.08; theta < Math.PI - 0.08; theta += 0.05) {
            const rr = er * L * Math.sin(theta) * Math.sin(theta);
            let dx = side * rr * Math.sin(theta);
            const dy = -rr * Math.cos(theta);
            const dxR = dx / er;
            dx *= dxR < 0 ? 0.7 : 1 + 1.1 * (1 - Math.exp(-dxR / 2.8));
            g.vertex(ex + dx, ey + dy);
          }
          g.endShape();
        }
      }

      // flare streak from sun toward earth + a few energised particles at the pole
      g.stroke(255, 200, 120, 130);
      g.strokeWeight(0.8 * k);
      for (let i = 0; i < 12; i++) {
        const t = g.random(0.15, 0.65);
        const px = sx + (ex - sx) * t + g.random(-4, 4) * k;
        const py = sy + g.random(-er * 1.8, er * 1.8);
        g.line(px - 4 * k, py, px + 4 * k, py);
      }
      g.noStroke();
      g.fill(255, 230, 150, 220);
      for (let i = 0; i < 8; i++) {
        g.circle(
          sx + (ex - sx) * g.random(0.2, 0.6),
          sy + g.random(-er * 1.5, er * 1.5),
          1.5 * k
        );
      }

      // aurora glow at north pole of earth
      g.noFill();
      for (let i = 0; i < 3; i++) {
        g.stroke(120, 255 - i * 25, 180, 150 - i * 35);
        g.strokeWeight((3 + i * 1.5) * k);
        const aw = er * (1.0 + i * 0.2);
        const ah = er * (0.45 + i * 0.12);
        g.arc(ex, ey - er * 0.85, aw, ah, 0, Math.PI);
      }

      // earth body on top
      g.noStroke();
      g.fill(45, 80, 140);
      g.circle(ex, ey, er * 2);
      g.fill(78, 135, 195);
      g.circle(ex, ey, er * 1.92);
      g.fill(70, 160, 120, 200);
      g.ellipse(ex - er * 0.25, ey - er * 0.1, er * 0.85, er * 0.5);
      g.ellipse(ex + er * 0.2, ey + er * 0.25, er * 0.6, er * 0.45);
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
const CARD_ASPECT = 7 / 6;       // height / width
const PADDING = 32;
const GAP = 20;
const HEADER_TOP = 76;
const HEADER_GAP = 110;          // distance from top of canvas to first card row

const REPO_URL = "https://github.com/achakerian/processing-for-artemis";
const REPO_LABEL = "github.com/achakerian/processing-for-artemis";

let cards = [];
let layout = null;
let repoLinkBounds = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("system-ui, -apple-system, sans-serif");
  buildCards();
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

  const cardH = cardW / CARD_ASPECT;
  const gridW = cols * cardW + (cols - 1) * gap;
  const offsetX = Math.floor((width - gridW) / 2);
  const headerH = HEADER_GAP * s + 32 * s;

  return { s, padding, gap, cardW, cardH, cols, offsetX, headerH };
}

function buildCards() {
  layout = computeLayout();
  cards = [];
  for (let i = 0; i < sketches.length; i++) {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    const x = layout.offsetX + col * (layout.cardW + layout.gap);
    const y = layout.headerH + row * (layout.cardH + layout.gap);
    cards.push(new Card(sketches[i], x, y, layout.cardW, layout.cardH));
  }
}

class Card {
  constructor(sketch, x, y, w, h) {
    this.sketch = sketch;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.thumbH = Math.floor(h * 0.62);
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

  drawHeader(s);

  let anyHover = false;
  for (const c of cards) {
    c.hovered = c.contains(mouseX, mouseY);
    if (c.hovered) anyHover = true;
    c.draw(s);
  }
  cursor(anyHover || pointerInRepoLink(mouseX, mouseY) ? "pointer" : "default");
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
  const hovered = pointerInRepoLink(mouseX, mouseY);
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
  navigateFromPointer(mouseX, mouseY);
}

function touchStarted() {
  if (touches && touches.length > 0) {
    navigateFromPointer(touches[0].x, touches[0].y);
  } else {
    navigateFromPointer(mouseX, mouseY);
  }
  return false; // prevent default scroll/zoom on touch
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildCards();
}
