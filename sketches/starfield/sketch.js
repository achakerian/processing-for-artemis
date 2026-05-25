// Starfield — drifting stars that lean toward the cursor.
// The pipeline's hello-world for Processing for Artemis.

const STAR_COUNT = 600;
const BACK_HOTSPOT = { x: 16, y: 16, w: 96, h: 28 };

const stars = [];

class Star {
  constructor() { this.reset(true); }

  reset(initial) {
    this.x = random(-width, width);
    this.y = random(-height, height);
    this.z = initial ? random(width) : width;
    this.speed = random(1.5, 4.5);
  }

  update() {
    this.z -= this.speed;
    if (this.z < 1) this.reset(false);
  }

  draw(cx, cy) {
    const k = 128 / this.z;
    const sx = (this.x + cx * this.z) * k + width / 2;
    const sy = (this.y + cy * this.z) * k + height / 2;
    if (sx < 0 || sx > width || sy < 0 || sy > height) return;
    const r = map(this.z, 0, width, 2.4, 0.3);
    const a = map(this.z, 0, width, 255, 60);
    fill(231, 236, 243, a);
    circle(sx, sy, r);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  textFont("system-ui, -apple-system, sans-serif");
  for (let i = 0; i < STAR_COUNT; i++) stars.push(new Star());
}

function draw() {
  background(5, 6, 10);

  const cx = (mouseX - width / 2) * 0.0008;
  const cy = (mouseY - height / 2) * 0.0008;

  for (const s of stars) {
    s.update();
    s.draw(cx, cy);
  }

  drawBackLink();
  cursor(inBackHotspot(mouseX, mouseY) ? "pointer" : "default");
}

function drawBackLink() {
  const hovered = inBackHotspot(mouseX, mouseY);
  fill(231, 236, 243, hovered ? 240 : 170);
  textSize(14);
  text("← Gallery", BACK_HOTSPOT.x + 6, BACK_HOTSPOT.y + 19);
}

function inBackHotspot(mx, my) {
  return (
    mx >= BACK_HOTSPOT.x &&
    mx <= BACK_HOTSPOT.x + BACK_HOTSPOT.w &&
    my >= BACK_HOTSPOT.y &&
    my <= BACK_HOTSPOT.y + BACK_HOTSPOT.h
  );
}

function mousePressed() {
  if (inBackHotspot(mouseX, mouseY)) {
    window.location.href = "../../";
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
