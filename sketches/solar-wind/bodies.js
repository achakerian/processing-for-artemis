// bodies.js — the sun, planets, and the data table that drives them.

const PLANETS = [
  { name: "Mercury", au: 0.39, realRadius: 0.38, color: [180, 175, 170], fieldStrength: 0.15,
    stubText: "Tiny iron core, weak global magnetic field. NASA's MESSENGER mapped it in 2011." },
  { name: "Venus",   au: 0.72, realRadius: 0.95, color: [220, 190, 130], fieldStrength: 0,
    stubText: "No global magnetic field. The solar wind induces a weak field at the top of the atmosphere instead." },
  { name: "Earth",   au: 1.00, realRadius: 1.00, color: [80, 140, 200],  fieldStrength: 1.0,
    stubText: "" },
  { name: "Mars",    au: 1.52, realRadius: 0.53, color: [200, 110, 80],  fieldStrength: 0,
    stubText: "Global magnetic field died around 4 billion years ago. The solar wind has been stripping its atmosphere ever since." },
  { name: "Jupiter", au: 5.20, realRadius: 11.2, color: [220, 190, 150], fieldStrength: 4.5,
    stubText: "The strongest magnetosphere of any planet — about 20,000 times Earth's. Its auroras dwarf ours." },
  { name: "Saturn",  au: 9.58, realRadius: 9.45, color: [220, 200, 160], fieldStrength: 3.0,
    stubText: "Magnetic field nearly aligned with its rotation axis — rare among planets and still not fully understood." },
  { name: "Uranus",  au: 19.2, realRadius: 4.01, color: [170, 220, 230], fieldStrength: 1.2,
    stubText: "Magnetic axis tilted 60° from the rotation axis. The whole magnetosphere tumbles every 17-hour day." },
  { name: "Neptune", au: 30.1, realRadius: 3.88, color: [80, 110, 220],  fieldStrength: 1.0,
    stubText: "Magnetic axis tilted 47° and offset from the planet's centre — the weirdest magnetosphere in the solar system." },
];

class Sun {
  constructor() {
    this.phase = 0;
  }
  update(dt) {
    this.phase += dt * 0.4;
  }
  draw(cx, cy, r) {
    noStroke();
    // soft corona layers
    for (let i = 6; i > 0; i--) {
      const wobble = noise(this.phase + i) * 0.07;
      fill(255, 180, 90, 18 / i);
      circle(cx, cy, r * 2 * (1 + i * 0.28 + wobble));
    }
    // hot body
    fill(255, 210, 90);
    circle(cx, cy, r * 2);
    fill(255, 240, 200);
    circle(cx, cy, r * 1.4);
  }
}

class Planet {
  constructor(data) {
    this.data = data;
    this.orbitRadius = 0;
    this.angularSpeed = 0;
    this.visualRadius = 0;
    this.angle = random(TWO_PI);
    this.x = 0;
    this.y = 0;
  }
  layout(orbitRadius, angularSpeed, visualRadius) {
    this.orbitRadius = orbitRadius;
    this.angularSpeed = angularSpeed;
    this.visualRadius = visualRadius;
  }
  update(dt, cx, cy, paused) {
    if (!paused) this.angle += this.angularSpeed * dt;
    this.x = cx + cos(this.angle) * this.orbitRadius;
    this.y = cy + sin(this.angle) * this.orbitRadius;
  }
  hitRadius() {
    return max(this.visualRadius * 1.6, 26 * uiScale());
  }
  draw() {
    noStroke();
    const c = this.data.color;
    fill(c[0], c[1], c[2]);
    circle(this.x, this.y, this.visualRadius * 2);
    if (this.data.name === "Saturn") {
      noFill();
      stroke(220, 200, 160, 200);
      strokeWeight(1.3 * uiScale());
      ellipse(this.x, this.y, this.visualRadius * 5, this.visualRadius * 1.4);
      noStroke();
    }
  }
  contains(px, py) {
    return dist(px, py, this.x, this.y) <= this.hitRadius();
  }
}
