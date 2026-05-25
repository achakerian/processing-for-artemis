// Starfield — drifting stars that lean toward the cursor.
// The pipeline's hello-world for Processing for Artemis.
//
// Responsive: star count scales with screen area, sizes and the back-link
// hit zone scale with viewport. Touch and mouse both navigate back.

const STAR_DENSITY = 1 / 3200; // stars per pixel of screen area
const MIN_STARS = 250;
const MAX_STARS = 2400;

let stars = [];
let backHotspot = { x: 0, y: 0, w: 0, h: 0 };

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

  draw(cx, cy, sizeScale) {
    const k = 128 / this.z;
    const sx = (this.x + cx * this.z) * k + width / 2;
    const sy = (this.y + cy * this.z) * k + height / 2;
    if (sx < 0 || sx > width || sy < 0 || sy > height) return;
    const r = map(this.z, 0, width, 2.4, 0.3) * sizeScale;
    const a = map(this.z, 0, width, 255, 60);
    fill(231, 236, 243, a);
    circle(sx, sy, r);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  textFont("system-ui, -apple-system, sans-serif");
  rebuildStars();
  updateBackHotspot();
}

function uiScale() {
  return constrain(min(width, height) / 900, 0.75, 4.0);
}

function rebuildStars() {
  const target = constrain(
    Math.floor(width * height * STAR_DENSITY),
    MIN_STARS,
    MAX_STARS
  );
  stars = [];
  for (let i = 0; i < target; i++) stars.push(new Star());
}

function updateBackHotspot() {
  const s = uiScale();
  backHotspot = {
    x: 16 * s,
    y: 16 * s,
    w: 140 * s,
    h: 44 * s,
  };
}

function draw() {
  background(5, 6, 10);

  const s = uiScale();
  const cx = (mouseX - width / 2) * 0.0008;
  const cy = (mouseY - height / 2) * 0.0008;

  for (const st of stars) {
    st.update();
    st.draw(cx, cy, s);
  }

  drawBackLink(s);
  cursor(inBackHotspot(mouseX, mouseY) ? "pointer" : "default");
}

function drawBackLink(s) {
  const hovered = inBackHotspot(mouseX, mouseY);
  fill(231, 236, 243, hovered ? 240 : 170);
  textSize(16 * s);
  text("← Gallery", backHotspot.x + 8 * s, backHotspot.y + 28 * s);
}

function inBackHotspot(mx, my) {
  return (
    mx >= backHotspot.x &&
    mx <= backHotspot.x + backHotspot.w &&
    my >= backHotspot.y &&
    my <= backHotspot.y + backHotspot.h
  );
}

function navigateIfBack(px, py) {
  if (inBackHotspot(px, py)) {
    window.location.href = "../../";
    return true;
  }
  return false;
}

function mousePressed() {
  navigateIfBack(mouseX, mouseY);
}

function touchStarted() {
  const p = touches && touches.length > 0 ? touches[0] : { x: mouseX, y: mouseY };
  navigateIfBack(p.x, p.y);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  rebuildStars();
  updateBackHotspot();
}
