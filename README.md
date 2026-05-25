# Processing for Artemis

A growing collection of interactive [p5.js](https://p5js.org/) sketches designed for an astronomy open night — built for visitor interaction and engagement.

**Live gallery:** https://achakerian.github.io/processing-for-artemis/

## Philosophy

Everything in this project — including the gallery itself — is built from the primitives Processing teaches: **variables, conditionals, loops, arrays, functions, classes, and event handlers**. No CSS files, no JSON data files, no image assets. Each sketch and the gallery that hosts them are generative all the way down.

## Sketches

| Sketch | Description |
| --- | --- |
| [`starfield`](sketches/starfield/) | Drifting stars that lean toward your cursor. |

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
