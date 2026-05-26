# Processing for Artemis

A growing collection of interactive [p5.js](https://p5js.org/) sketches designed for an astronomy open night — built for visitor interaction and engagement.

**Live gallery:** https://achakerian.github.io/processing-for-artemis/

## Philosophy

Everything in this project — including the gallery itself — is built from the primitives Processing teaches: **variables, conditionals, loops, arrays, functions, classes, and event handlers**. No CSS files, no JSON data files, no image assets. Each sketch and the gallery that hosts them are generative all the way down.

## Built for any screen

Sketches are designed to look right on a phone, a laptop, **and a 4K wall display** — useful since the gallery is meant to be projected or shown on a TV at the open night.

- Every size (text, cards, padding, hit zones, even star counts) derives from a single `uiScale()` helper: `constrain(min(width, height) / 900, 0.75, 4.0)`. One multiplier, everything follows.
- The gallery uses **hybrid card sizing** — cards grow up to a 520px design-width cap, then more columns are added. On 4K you get a few huge readable cards; on a laptop, a normal grid; on a phone, one full-width card.
- **Touch + mouse are treated the same.** Each sketch implements `mousePressed` and `touchStarted`, so the same code works on a touchscreen kiosk and a regular monitor. Back-link hit zones are at least 44pt × `uiScale` for finger targets.
- Star counts and similar density-based parameters scale with screen area (clamped) so a 4K display gets richer visuals without melting the GPU.

When adding a sketch, route every magic number through `uiScale()` so the new sketch inherits this behavior automatically.

## Sketches

| Sketch | Description |
| --- | --- |
| [`starfield`](sketches/starfield/) | Drifting stars that lean toward your cursor. |
| [`solar-wind`](sketches/solar-wind/) | Tap the sun to fire a flare; tap a planet to zoom in. Earth's magnetosphere is fully simulated in Phase 1; other planets show a teaser stub. |

## How the pipeline works

- **`index.html`** — minimal boilerplate that loads p5.js and `gallery.js`.
- **`gallery.js`** — a p5 sketch. It owns a `sketches` array (one entry per sketch: slug, title, description, and a `drawPreview` function), builds a `Card` for each, draws them in a grid, and routes clicks via `mousePressed` to the right sketch URL.
- **`sketches/<slug>/`** — each sketch has its own `index.html` (same minimal boilerplate) and `sketch.js`. Sketches draw their own "← Gallery" hit zone and handle navigation themselves.

## Adding a new sketch

1. Create the sketch folder:
   ```
   sketches/<your-slug>/
     index.html      # copy starfield's, change the <title>
     sketch.js       # your p5.js code; include a back hit-zone like starfield does
   ```
2. Add an entry to the `sketches` array in `gallery.js`:
   ```js
   {
     slug: "your-slug",
     title: "Your Title",
     description: "One short sentence.",
     seed: 42,
     drawPreview(g, w, h) {
       // draw the card thumbnail using g (a p5.Graphics buffer)
     },
   },
   ```
3. Commit and push:
   ```bash
   git add . && git commit -m "Add <sketch name>" && git push
   ```
4. GitHub Pages rebuilds in ~1 minute. Done.

## Local preview

p5.js needs to be served over HTTP (not opened as `file://`). From the repo root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## License

MIT — see [`LICENSE`](LICENSE).
