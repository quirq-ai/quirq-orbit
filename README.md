# quirq-orbit

The quirq site: an outcome-based software agency. Orbiting dot-pattern globes are the navigation (Work, Solutions, Process, Research, Notes), each opening a slide-in panel with a list and detail view. Plain HTML, CSS and JS with Three.js from a CDN. No build step. Sibling of `xo-orbit`.

## Run

```bash
python3 serve.py 8497
```

Then open http://localhost:8497. (`serve.py` is a static server with caching off.)

## Where things live

| File | What |
| --- | --- |
| `js/content.js` | All copy, links and section items. |
| `css/style.css` | Theme tokens at the top (ink, spectrum, section colors, fonts). |
| `js/scene.js` | The 3D scene: globes, orbit, starfield, camera fly-to. |
| `js/icons.js` | Globe icon masks (including the quirq mark) and UI icons. |
| `js/main.js` | Hero, routing (`#work`, `#work/<slug>`), panel, modal, contact window. |

## Work items

Work has three categories: `delivery`, `repo` and `example`. A delivery with a `checks` array gets a checklist thumbnail and a "What done means" block on its detail page:

```js
{
  slug: 'order-tracking', cat: 'delivery',
  title: 'Order tracking online', tag: 'Delivery · E-commerce', year: '2026', kind: 'Fixed price',
  stack: ['Storefront', 'Email'],
  summary: 'One line for the card.',
  checks: ['Customers find an order with its number and email', 'Works on phones'],
  body: ['Paragraphs for the detail page.'],
  repo: '', demo: '', image: '',
}
```

Items with `placeholder: true` show a note on their detail page. The three deliveries are samples, not client work.

## Work: repositories

`js/repos.js` lists every public, non-archived repo in github.com/quirq-ai, grouped and described like quirq.dev (from `quirq-ai/website/quirq.projects.json`), with a phase (Thought, Prototype, Built, Shipping, In use) read from each repo's code, CI, deploy config and people. READMEs are rendered by GitHub and saved to `assets/readmes/`, loaded when a repo is opened. Private repos are never included. To refresh (needs a signed-in `gh`):

```bash
python3 tools/import-quirq/repos.py js
```

### Screenshots and clips

Each repo page is a showcase: a browser-framed clip of the live app with a "Play" card beside it (like ximmersion's showcase pages), the README's screenshots as a strip, then phase, facts and the README. Apps whose headers allow embedding play inside the page ("Play it here"); the rest open in a new tab. Work opens on the "Try it live" tab.

Posters and clips in `assets/work/` are recorded from the live apps with local headless Chrome and ffmpeg (no packages needed). Re-record, then regenerate so the data picks them up:

```bash
cd tools/import-quirq && node capture.mjs ../../assets/work --from ../../js/repos.js && cd ../.. && python3 tools/import-quirq/repos.py js
```

## Research and Notes content

`js/research.js` and `js/writing.js` are generated from quirq.ai/research and quirq.ai/writing (text, tables, charts and cover images). Do not edit them by hand. To refresh:

```bash
cd tools/import-quirq && ./fetch.sh && python3 gen.py ../../js
```

News items link out to xo.builders. The Levanto study video streams from quirq.ai.
