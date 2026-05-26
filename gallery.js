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
