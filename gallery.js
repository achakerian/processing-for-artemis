// gallery.js — the gallery IS a p5 sketch.
// Add a new sketch by adding an entry to `sketches` below (slug + title +
// description + a drawPreview function). No data files, no CSS, no thumbnails.

const sketches = [
  {
    slug: "starfield",
    title: "Starfield",
    description: "Drifting stars that lean toward your cursor.",
    seed: 1,
    drawPreview(g, w, h) {
      g.background(5, 6, 10);
      g.noStroke();
      for (let i = 0; i < 140; i++) {
        const r = g.random(0.4, 2.4);
        const a = g.random(60, 230);
        g.fill(231, 236, 243, a);
        g.circle(g.random(w), g.random(h), r);
      }
    },
  },
];

class Card {
  constructor(sketch, x, y, w, h) {
    this.sketch = sketch;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.thumbH = Math.floor(h * 0.62);
    this.thumb = createGraphics(w, this.thumbH);
    this.thumb.randomSeed(sketch.seed);
    sketch.drawPreview(this.thumb, w, this.thumbH);
    this.hovered = false;
  }

  contains(mx, my) {
    return (
      mx >= this.x && mx <= this.x + this.w &&
      my >= this.y && my <= this.y + this.h
    );
  }

  draw() {
    push();
    translate(this.x, this.y);

    noStroke();
    fill(13, 16, 24);
    rect(0, 0, this.w, this.h, 10);

    image(this.thumb, 0, 0);

    fill(231, 236, 243);
    textSize(16);
    textStyle(BOLD);
    text(this.sketch.title, 14, this.thumbH + 26);

    fill(138, 147, 166);
    textSize(13);
    textStyle(NORMAL);
    text(this.sketch.description, 14, this.thumbH + 48, this.w - 28);

    if (this.hovered) {
      noFill();
      stroke(108, 184, 255);
      strokeWeight(1);
      rect(0.5, 0.5, this.w - 1, this.h - 1, 10);
    }

    pop();
  }
}

const PADDING = 32;
const GAP = 20;
const HEADER_H = 170;
const CARD_W = 280;
const CARD_H = 240;

let cards = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("system-ui, -apple-system, sans-serif");
  buildCards();
}

function buildCards() {
  cards = [];
  const cols = Math.max(
    1,
    Math.floor((width - PADDING * 2 + GAP) / (CARD_W + GAP))
  );
  const gridW = cols * CARD_W + (cols - 1) * GAP;
  const offsetX = Math.floor((width - gridW) / 2);

  for (let i = 0; i < sketches.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = offsetX + col * (CARD_W + GAP);
    const y = HEADER_H + row * (CARD_H + GAP);
    cards.push(new Card(sketches[i], x, y, CARD_W, CARD_H));
  }
}

function draw() {
  background(5, 6, 10);
  drawHeader();

  let anyHover = false;
  for (const c of cards) {
    c.hovered = c.contains(mouseX, mouseY);
    if (c.hovered) anyHover = true;
    c.draw();
  }
  cursor(anyHover ? "pointer" : "default");
}

function drawHeader() {
  const leftX = cards.length > 0 ? cards[0].x : PADDING;

  noStroke();
  fill(231, 236, 243);
  textSize(42);
  textStyle(BOLD);
  text("Processing for Artemis", leftX, 76);

  fill(138, 147, 166);
  textSize(15);
  textStyle(NORMAL);
  text(
    "Interactive p5.js sketches built for astronomy open night — click a card to explore.",
    leftX,
    108,
    width - leftX - PADDING
  );
}

function mousePressed() {
  for (const c of cards) {
    if (c.contains(mouseX, mouseY)) {
      window.location.href = `sketches/${c.sketch.slug}/`;
      return;
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildCards();
}
