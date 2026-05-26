// gallery.js — the gallery IS a p5 sketch.
// Add a new sketch by adding an entry to `sketches` below (slug + title +
// description + a drawPreview function). No data files, no CSS, no thumbnails.
//
// Responsive: every size derives from uiScale() so the same code looks right
// from a phone to a 4K wall display. Cards grow up to MAX_CARD_W, then more
// columns are added. Mouse and touch are both handled.

// Sketches live here. Add an entry below and create sketches/<slug>/index.html + sketch.js alongside this folder.
const sketches = [];

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
  if (cards.length === 0) drawEmptyState(s);
  pop();

  if (maxScroll > 0) drawScrollIndicator(s);

  cursor(anyHover || pointerInRepoLink(mouseX, worldMouseY) ? "pointer" : "default");
}

function drawEmptyState(s) {
  const cx = width / 2;
  const cy = layout.headerH + (height - layout.headerH) / 2 - 24 * s;
  noStroke();
  textAlign(CENTER, CENTER);
  fill(231, 236, 243, 220);
  textStyle(BOLD);
  textSize(22 * s);
  text("No sketches yet.", cx, cy);
  textStyle(NORMAL);
  fill(138, 147, 166, 220);
  textSize(14 * s);
  text(
    "Add an entry to the sketches array in gallery.js, then create sketches/<slug>/ alongside this folder.",
    cx, cy + 40 * s, min(width * 0.7, 560 * s)
  );
  textAlign(LEFT, BASELINE);
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
