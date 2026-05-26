// sketch.js — Solar Wind entry point.
//
// State machine: overview → zoomingIn → zoomed → zoomingOut → overview.
// Camera lerps scale + translate during transitions so the world flies
// smoothly toward the chosen planet. Zoom-specific overlays (Earth's
// dipole + aurora, or a stub label panel) draw on top of the world.

const TRANSITION_DURATION = 0.6;
const AUTO_FIRE_INTERVAL = 15.0;
const AUTO_FIRE_RESET_AFTER_TAP = 25.0;

let viewState = "overview";
let zoomTarget = null;
let transitionT = 1;

const cam = { scale: 1, tx: 0, ty: 0 };
let backHotspot = { x: 0, y: 0, w: 0, h: 0 };
let sunHint = { fade: 1.0 };
let idleTimer = AUTO_FIRE_INTERVAL;
let lastFrameMs = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  textFont("system-ui, -apple-system, sans-serif");
  buildSystem();
  updateBackHotspot();
  lastFrameMs = millis();
}

function updateBackHotspot() {
  const s = uiScale();
  backHotspot = { x: 16 * s, y: 16 * s, w: 220 * s, h: 44 * s };
}

function computeCameraForZoom() {
  const targetR = min(width, height) * 0.18;
  const s = targetR / zoomTarget.visualRadius;
  return {
    scale: s,
    tx: width / 2 - zoomTarget.x * s,
    ty: height / 2 - zoomTarget.y * s,
  };
}

function draw() {
  const now = millis();
  const dt = min((now - lastFrameMs) / 1000, 0.05);
  lastFrameMs = now;

  background(5, 6, 10);

  // Advance transitions.
  if (viewState === "zoomingIn" || viewState === "zoomingOut") {
    transitionT = min(1, transitionT + dt / TRANSITION_DURATION);
    if (transitionT >= 1) {
      if (viewState === "zoomingIn") viewState = "zoomed";
      else {
        viewState = "overview";
        zoomTarget = null;
      }
    }
  }

  // Idle auto-fire (overview only).
  if (viewState === "overview") {
    idleTimer -= dt;
    if (idleTimer <= 0) {
      fireFlare();
      idleTimer = AUTO_FIRE_INTERVAL;
    }
  }

  // Camera.
  if (viewState === "overview") {
    cam.scale = 1;
    cam.tx = 0;
    cam.ty = 0;
  } else {
    const target = computeCameraForZoom();
    if (viewState === "zoomed") {
      cam.scale = target.scale;
      cam.tx = target.tx;
      cam.ty = target.ty;
    } else {
      const eased = easeInOutCubic(transitionT);
      const from = viewState === "zoomingIn"
        ? { scale: 1, tx: 0, ty: 0 }
        : target;
      const to = viewState === "zoomingIn"
        ? target
        : { scale: 1, tx: 0, ty: 0 };
      cam.scale = lerp(from.scale, to.scale, eased);
      cam.tx = lerp(from.tx, to.tx, eased);
      cam.ty = lerp(from.ty, to.ty, eased);
    }
  }

  // Render the world under the camera.
  const paused = viewState !== "overview";
  push();
  translate(cam.tx, cam.ty);
  scale(cam.scale);
  drawOverview(dt, paused, cam.scale);
  pop();

  // Zoom-specific overlay (only at full zoom).
  if (viewState === "zoomed" && zoomTarget) {
    const screenX = zoomTarget.x * cam.scale + cam.tx;
    const screenY = zoomTarget.y * cam.scale + cam.ty;
    const screenR = zoomTarget.visualRadius * cam.scale;
    if (zoomTarget.data.name === "Earth") {
      drawEarthZoom(dt, screenX, screenY, screenR);
    } else {
      drawStubZoom(zoomTarget);
    }
    drawBackHotspot();
  }

  // Tap-the-sun hint, only in overview, only until first interaction.
  if (viewState === "overview" && sunHint.fade > 0.01) {
    drawSunHint();
  }
}

function drawSunHint() {
  const s = uiScale();
  fill(231, 236, 243, 200 * sunHint.fade);
  noStroke();
  textSize(15 * s);
  textAlign(CENTER, BASELINE);
  text(
    "Tap the sun to fire a flare · Tap a planet to zoom in",
    width / 2,
    height - 28 * s
  );
  textAlign(LEFT, BASELINE);
}

function drawBackHotspot() {
  const s = uiScale();
  const hovered = pointInRect(mouseX, mouseY, backHotspot);
  fill(231, 236, 243, hovered ? 240 : 190);
  noStroke();
  textSize(16 * s);
  text("← Solar system", backHotspot.x + 8 * s, backHotspot.y + 28 * s);
}

function handleTap(px, py) {
  if (viewState === "zoomingIn" || viewState === "zoomingOut") return;

  if (viewState === "zoomed") {
    if (pointInRect(px, py, backHotspot)) {
      viewState = "zoomingOut";
      transitionT = 0;
    }
    return;
  }

  // overview: dim the hint after first tap
  sunHint.fade = max(0, sunHint.fade - 0.5);

  // Tap the sun?
  if (dist(px, py, overview.sunX, overview.sunY) <= overview.sunRadius * 1.6) {
    fireFlare();
    idleTimer = AUTO_FIRE_RESET_AFTER_TAP;
    return;
  }

  // Tap a planet?
  for (const p of overview.planets) {
    if (p.contains(px, py)) {
      zoomTarget = p;
      viewState = "zoomingIn";
      transitionT = 0;
      if (p.data.name === "Earth") resetZoom();
      return;
    }
  }
}

function mousePressed() {
  handleTap(mouseX, mouseY);
}

function touchStarted() {
  const p = touches && touches.length > 0 ? touches[0] : { x: mouseX, y: mouseY };
  handleTap(p.x, p.y);
  return false;
}

// Fade the sun-hint back in if no one has interacted for a while.
setInterval(() => {
  if (viewState === "overview" && idleTimer < AUTO_FIRE_INTERVAL - 5) {
    sunHint.fade = min(1, sunHint.fade + 0.2);
  }
}, 5000);

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildSystem();
  updateBackHotspot();
}
