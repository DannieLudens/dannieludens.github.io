# Daniel Ardila · Portfolio

Personal portfolio of Daniel Ardila, Unity developer (games, AR and VR).
Live site: https://dannieludens.github.io

Plain HTML, CSS and JavaScript. No build step: GitHub Pages serves the files as they are.

## Structure

```
index.html            Page skeleton (home + project page), logo SVG symbols
css/styles.css        All styles
js/i18n.js            Loads text from i18n/<lang>.json
js/app.js             Renders projects, about, resume, contact, project pages, theme toggle
js/flowfield.js       Generative flow field in the hero
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
4. Fill in `links` (`play`, `itch`, `live`, `web`, `video`, `code`). Links left as `null` don't show a button.
5. Keep `"draft": true` until it's ready. Drafts are hidden on the live site.

Gallery items can be `{ "type": "image" }`, `{ "type": "video" }` (an .mp4 in the repo) or `{ "type": "youtube", "src": "https://www.youtube-nocookie.com/embed/<id>" }`.

**AI disclosure:** each project can have an `ai` list in `i18n/en.json` (`content.<id>.ai`). It shows as a "How I used AI" section on the project page: say what the AI did and what you did.

**QA section:** bug reports live under `qa.reports` in `i18n/en.json`. Add `"evidenceSrc": "assets/img/qa/<file>.png"` to show a screenshot. The section stays hidden while `"qaDraft": true` in `data/site.json`.

**Resume PDF:** one file per language in `assets/cv/` (`Daniel-Ardila-CV-EN.pdf`, `Daniel-Ardila-CV-ES.pdf`), set as `resume.pdf` in each `i18n/<lang>.json`. `resumePdf` in `data/site.json` is the fallback; with no path at all the download buttons stay hidden.

**Playable build inside the page:** add `"embed": { "url": "...", "allow": "autoplay; fullscreen" }` to the project in `data/projects.json` and its texts under `content.<id>.embed` (`button`, `size`, `note`). The game loads only when the visitor clicks. For itch.io games, use the link from Distribute > Embed game.

**Find unfinished text:** search the repo for `TODO`. Unfinished text is highlighted with a dashed outline on the page.

**Turn on Spanish:** translate `i18n/es.json` with the same structure as `en.json`, then set `"languages": ["en", "es"]` in `data/site.json`. The EN/ES switch appears in the header. Keys missing in Spanish fall back to English.

**Brand ("Navegante"):** colors, fonts and the logo come from Daniel's design system (Figma: "Diseño y cultura" board and "Navegante – Ficha técnica del logo"). Color roles for light and dark mode live at the top of `css/styles.css`; every pair passes WCAG AA. The logo is inline in `index.html` as two SVG symbols (`#logo` full, `#logo-small` simplified for small sizes) and as files in `assets/img/brand/`.

**Light and dark mode:** the toggle in the header saves the choice in the browser; with no saved choice the site follows the system setting.

**Hero flow field:** `js/flowfield.js` draws the generative piece in a canvas (Perlin noise, 60-30-10 colors). It pauses off screen and shows a still image when the visitor has "reduce motion" turned on. A future Three.js scene can mount in the same `.hero__canvas` element.

## Publish on GitHub Pages

1. Create a public repository named `dannieludens.github.io`.
2. Upload these files to the root of the `main` branch.
3. In the repository, go to Settings > Pages and set Source to "Deploy from a branch", branch `main`, folder `/ (root)`.
4. After a minute or two the site is live at https://dannieludens.github.io.
