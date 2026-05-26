// util.js — shared helpers for the Solar Wind sketch.

function uiScale() {
  return constrain(min(width, height) / 900, 0.75, 4.0);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function signOf(n) {
  return n >= 0 ? 1 : -1;
}
