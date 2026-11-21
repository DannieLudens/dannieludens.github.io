# Daniel Ardila · Portfolio

Personal portfolio of Daniel Ardila, Unity developer (games, AR and VR).
Live site: https://dannieludens.github.io

Plain HTML, CSS and JavaScript. No build step: GitHub Pages serves the files as they are.

## Structure

```
index.html            Page skeleton (home + project page)
css/styles.css        All styles
js/i18n.js            Loads text from i18n/<lang>.json
js/app.js             Renders projects, about, resume, contact and the project pages
data/site.json        Settings: languages, contact links, resume PDF, drafts
data/projects.json    Projects in display order: links, images, tech, draft flag
i18n/en.json          Every text on the site, in English (main language)
i18n/es.json          Spanish version (empty for now, falls back to English)
assets/img/projects/  Covers and screenshots
assets/cv/            Resume PDF
```

## Run it locally

The site loads its text with `fetch`, so opening `index.html` straight from disk does not work. Start a local server in the folder:

```
python -m http.server 8000
```

Then open http://localhost:8000. (VS Code's Live Server extension also works.)

Add `?preview` to the address (http://localhost:8000/?preview) to see draft projects.

## Common changes

**Add or edit a project**
1. Add an entry to `data/projects.json`. The order of the list is the order on the site.
2. Add its texts under `content.<id>` in `i18n/en.json`, copying an existing project.
3. Put its images in `assets/img/projects/` and reference them in `cover` and `gallery`.
4. Fill in `links` (`play`, `live`, `video`, `code`). Links left as `null` don't show a button.
5. Keep `"draft": true` until it's ready. Drafts are hidden on the live site.

Gallery items can be `{ "type": "image" }`, `{ "type": "video" }` (an .mp4 in the repo) or `{ "type": "youtube", "src": "https://www.youtube-nocookie.com/embed/<id>" }`.

**AI disclosure:** each project can have an `ai` list in `i18n/en.json` (`content.<id>.ai`). It shows as a "How I used AI" section on the project page: say what the AI did and what you did.

**QA section:** bug reports live under `qa.reports` in `i18n/en.json`. Add `"evidenceSrc": "assets/img/qa/<file>.png"` to show a screenshot. The section stays hidden while `"qaDraft": true` in `data/site.json`.

**Resume PDF:** put the file in `assets/cv/` and set `"resumePdf": "assets/cv/Daniel-Ardila-CV.pdf"` in `data/site.json`. While it is `null`, the download buttons stay hidden.

**Find unfinished text:** search the repo for `TODO`. Unfinished text is highlighted with a dashed outline on the page.

**Turn on Spanish:** translate `i18n/es.json` with the same structure as `en.json`, then set `"languages": ["en", "es"]` in `data/site.json`. The EN/ES switch appears in the header. Keys missing in Spanish fall back to English.

**Future 3D hero:** the `#hero-scene` figure in `index.html` holds a static SVG. A Three.js scene can replace it by mounting a canvas into that element from a new `js/scene.js` module, without touching the rest of the site.

## Publish on GitHub Pages

1. Create a public repository named `dannieludens.github.io`.
2. Upload these files to the root of the `main` branch.
3. In the repository, go to Settings > Pages and set Source to "Deploy from a branch", branch `main`, folder `/ (root)`.
4. After a minute or two the site is live at https://dannieludens.github.io.
