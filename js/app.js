// Renders the portfolio from data/site.json, data/projects.json and the i18n files.
// Routing: #<project-id> opens a project page; any other hash scrolls to that section.
(function () {
  const t = (key) => window.I18N.t(key);
  let site = {};
  let projects = [];

  // ---------- helpers ----------

  // Creates an element with optional class, text and attributes
  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.class) node.className = opts.class;
    if (opts.text !== undefined) setText(node, opts.text);
    if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => v !== null && v !== undefined && node.setAttribute(k, v));
    children.forEach((child) => child && node.appendChild(child));
    return node;
  }

  // Sets text and marks unfinished copy (starting with "TODO") so it is easy to spot
  function setText(node, value) {
    const text = value === undefined || value === null ? "" : String(value);
    node.textContent = text;
    if (text.startsWith("TODO")) node.classList.add("todo");
  }

  async function loadJson(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error("Could not load " + path);
    return res.json();
  }

  // Text for one project field, e.g. c("mohan", "pitch")
  function c(id, field) {
    return t("content." + id + "." + field);
  }

  function isPreview() {
    return location.search.includes("preview") || site.showDrafts;
  }

  function visibleProjects() {
    return projects.filter((p) => isPreview() || !p.draft);
  }

  // Unfinished text ("TODO ...") shows only in preview; the live site skips it
  function ready(value) {
    if (isPreview()) return true;
    if (typeof value === "string") return value.trim() !== "" && !value.startsWith("TODO");
    if (value && typeof value === "object" && !Array.isArray(value)) return Object.values(value).every(ready);
    return value !== undefined && value !== null;
  }

  // Builds the Play / Code / Video / Live buttons that have a link
  function projectLinks(p, includeOpen) {
    const wrap = el("div", { class: "actions" });
    if (includeOpen) {
      wrap.appendChild(el("a", { class: "button button--primary", text: t("projects.open"), attrs: { href: "#" + p.id } }));
    }
    const kinds = [["play", "projects.play"], ["itch", "projects.itch"], ["live", "projects.live"], ["web", "projects.web"], ["video", "projects.video"], ["code", "projects.code"]];
    kinds.forEach(([kind, label]) => {
      const url = p.links && p.links[kind];
      if (url) wrap.appendChild(el("a", { class: "button", text: t(label), attrs: { href: url, rel: "noopener" } }));
    });
    // Extra links with their own label (e.g. two prototypes of the same project)
    (p.extraLinks || []).forEach((x) => {
      if (x.url) wrap.appendChild(el("a", { class: "button", text: t(x.label), attrs: { href: x.url, rel: "noopener" } }));
    });
    return wrap;
  }

  function factsList(p, fields) {
    const dl = el("dl", { class: "facts" });
    fields.filter(([, value]) => ready(value)).forEach(([labelKey, value]) => {
      dl.appendChild(el("div", {}, [el("dt", { text: t(labelKey) }), el("dd", { text: value })]));
    });
    return dl;
  }

  function platformTags(p) {
    const ul = el("ul", { class: "tags", attrs: { "aria-label": "Platform" } });
    (p.platform || []).forEach((k) => ul.appendChild(el("li", { text: t("projects.platform." + k) })));
    return ul;
  }

  // ---------- home ----------

  function renderProjectList() {
    const list = document.getElementById("project-list");
    list.replaceChildren();
    visibleProjects().forEach((p) => {
      const title = c(p.id, "title");
      const media = el("a", { class: "row__media", attrs: { href: "#" + p.id, tabindex: "-1", "aria-hidden": "true" } }, [
        el("img", { attrs: { src: p.cover, alt: "", loading: "lazy", width: "1600", height: "1000" } }),
        platformTags(p)
      ]);
      const heading = el("h3", { class: "row__title" }, [el("a", { text: title, attrs: { href: "#" + p.id } })]);
      const info = el("div", { class: "row__info" }, [
        heading,
        el("p", { class: "row__subtitle", text: c(p.id, "subtitle") }),
        el("p", { class: "row__pitch", text: c(p.id, "pitch") }),
        factsList(p, [
          ["projects.role", c(p.id, "role")],
          ["projects.when", c(p.id, "when")],
          ["projects.builtWith", p.tech.join(", ")]
        ]),
        projectLinks(p, true)
      ]);
      const item = el("li", { class: "row" + (p.draft ? " row--draft" : ""), attrs: { id: "card-" + p.id } }, [media, info]);
      if (p.draft) info.prepend(el("p", { class: "draft-note", text: t("projects.draft") }));
      list.appendChild(item);
    });
  }

  // Bug reports in the format QA teams use (title, steps, expected, actual, severity, evidence)
  function renderQa() {
    const section = document.getElementById("qa");
    const navItem = document.getElementById("nav-qa");
    const preview = location.search.includes("preview") || site.showDrafts;
    const show = !site.qaDraft || preview;
    section.hidden = !show;
    navItem.hidden = !show;
    if (!show) return;
    const f = (k) => t("qa.fields." + k);
    const box = document.getElementById("qa-reports");
    box.replaceChildren(...(t("qa.reports") || []).map((r) => {
      const steps = el("ol", { class: "report__steps" }, (r.steps || []).map((s) => el("li", { text: s })));
      const row = (key, node) => el("div", { class: "report__row" }, [el("dt", { text: f(key) }), node]);
      const dl = el("dl", { class: "report__fields" }, [
        row("game", el("dd", { text: r.game })),
        row("environment", el("dd", { text: r.environment })),
        row("build", el("dd", { text: r.build })),
        row("steps", el("dd", {}, [steps])),
        row("expected", el("dd", { text: r.expected })),
        row("actual", el("dd", { text: r.actual })),
        row("severity", el("dd", { text: r.severity })),
        row("evidence", r.evidenceSrc
          ? el("dd", {}, [el("img", { attrs: { src: r.evidenceSrc, alt: r.evidence, loading: "lazy" } })])
          : el("dd", { text: r.evidence }))
      ]);
      return el("article", { class: "report" }, [el("h3", { class: "report__title", text: r.title }), dl]);
    }));
    if (site.qaDraft) box.prepend(el("p", { class: "draft-note", text: t("qa.draft") }));
  }

  function renderAbout() {
    const body = document.getElementById("about-body");
    body.replaceChildren(...(t("about.body") || []).map((p) => el("p", { text: p })));
    const facts = document.getElementById("about-facts");
    facts.replaceChildren(...(t("about.facts") || []).map((f) => el("div", {}, [el("dt", { text: f.label }), el("dd", { text: f.value })])));
  }

  function renderResume() {
    ["experience", "education"].forEach((kind) => {
      const ol = document.getElementById("resume-" + kind);
      ol.replaceChildren(...(t("resume.items." + kind) || []).map((item) =>
        el("li", {}, [
          el("p", { class: "timeline__when", text: item.when }),
          el("h4", { class: "timeline__title", text: item.title }),
          el("p", { class: "timeline__org", text: item.org }),
          item.detail ? el("p", { class: "timeline__detail", text: item.detail }) : null
        ])
      ));
    });
    // Resume PDF per language (resume.pdf in i18n), falling back to data/site.json
    const pdf = t("resume.pdf") || site.resumePdf;
    ["resume-link", "resume-link-hero"].forEach((id) => {
      const a = document.getElementById(id);
      if (!a) return;
      a.hidden = !pdf;
      if (pdf) a.setAttribute("href", pdf);
    });
  }

  function renderContact() {
    const email = site.contact.email;
    const a = document.getElementById("contact-email");
    a.textContent = email;
    a.href = "mailto:" + email;
    const ul = document.getElementById("contact-links");
    ul.replaceChildren();
    [["linkedin", "contact.linkedin"], ["github", "contact.github"], ["itch", "contact.itch"]].forEach(([k, label]) => {
      const url = site.contact[k];
      if (url) ul.appendChild(el("li", {}, [el("a", { text: t(label), attrs: { href: url, rel: "me noopener" } })]));
    });
    const btn = document.getElementById("copy-email");
    btn.onclick = async () => {
      const status = document.getElementById("copy-status");
      try {
        await navigator.clipboard.writeText(email);
        status.textContent = t("contact.copied");
      } catch (e) {
        status.textContent = email;
      }
    };
  }

  function renderLanguageSwitch() {
    const box = document.getElementById("lang-switch");
    const langs = site.languages || ["en"];
    if (langs.length < 2) { box.hidden = true; return; }
    box.hidden = false;
    box.querySelectorAll("button").forEach((b) => b.remove());
    langs.forEach((lang) => {
      const b = el("button", { class: "lang__option", text: lang.toUpperCase(), attrs: { type: "button", lang, "aria-pressed": String(lang === window.I18N.current) } });
      b.onclick = async () => {
        await window.I18N.setLanguage(lang, site.defaultLanguage, true);
        renderAll();
      };
      box.appendChild(b);
    });
  }

  // ---------- project page ----------

  function renderMedia(item, altText) {
    if (item.type === "video") {
      return el("video", { attrs: { src: item.src, controls: "", preload: "metadata", poster: item.poster || null, "aria-label": altText } });
    }
    if (item.type === "youtube") {
      return el("iframe", { attrs: { src: item.src, title: altText, loading: "lazy", allowfullscreen: "", allow: "fullscreen; picture-in-picture" } });
    }
    return el("img", { attrs: { src: item.src, alt: altText, loading: "lazy", width: "1600", height: "1000" } });
  }

  function galleryFrame(p, item, alt, extra) {
    const media = renderMedia(item, alt || c(p.id, "title"));
    if (item.ratio) media.style.aspectRatio = item.ratio;
    const cls = ["frame", item.portrait ? "frame--portrait" : "", extra || ""].filter(Boolean).join(" ");
    return el("figure", { class: cls }, [media]);
  }

  // First item is the main piece; the rest go in a scrollable carousel; items marked "end" close the gallery
  function renderGallery(p, alts) {
    const items = (p.gallery.length ? p.gallery : [{ type: "image", src: p.cover }]).map((item, i) => ({ item, alt: alts[i] }));
    const [first, ...rest] = items;
    const middle = rest.filter((x) => !x.item.end);
    const end = rest.filter((x) => x.item.end);
    const section = el("section", { class: "project__gallery", attrs: { "aria-label": t("projects.gallery") } });
    section.appendChild(galleryFrame(p, first.item, first.alt, "frame--featured"));
    if (middle.length === 1) section.appendChild(galleryFrame(p, middle[0].item, middle[0].alt));
    if (middle.length > 1) section.appendChild(renderCarousel(p, middle));
    end.forEach((x) => section.appendChild(galleryFrame(p, x.item, x.alt, "frame--end")));
    return section;
  }

  function renderCarousel(p, list) {
    const track = el("ul", { class: "carousel__track", attrs: { tabindex: "0", "aria-label": t("projects.carousel") } });
    list.forEach((x, i) => {
      const li = el("li", { class: "carousel__slide", attrs: { "aria-label": (i + 1) + " / " + list.length } }, [galleryFrame(p, x.item, x.alt)]);
      track.appendChild(li);
    });
    const prev = el("button", { class: "carousel__btn", text: "\u2190", attrs: { type: "button", "aria-label": t("projects.carouselPrev") } });
    const next = el("button", { class: "carousel__btn", text: "\u2192", attrs: { type: "button", "aria-label": t("projects.carouselNext") } });
    const step = (dir) => {
      const slide = track.querySelector(".carousel__slide");
      const amount = slide ? slide.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
      track.scrollBy({ left: dir * amount, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
    prev.onclick = () => step(-1);
    next.onclick = () => step(1);
    const update = () => {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    requestAnimationFrame(update);
    // Only one clip plays at a time
    track.addEventListener("play", (e) => track.querySelectorAll("video").forEach((v) => { if (v !== e.target) v.pause(); }), true);
    return el("div", { class: "carousel", attrs: { role: "region", "aria-roledescription": "carousel", "aria-label": t("projects.carousel") } }, [
      track,
      el("div", { class: "carousel__controls" }, [prev, next])
    ]);
  }

  // Click-to-load playable build: nothing is downloaded (and no camera is requested) until the visitor asks
  function renderEmbed(p) {
    if (!p.embed) return null;
    const box = el("div", { class: "embed__frame" });
    const start = el("button", { class: "embed__start", attrs: { type: "button" } }, [
      el("span", { class: "embed__icon", text: "\u25B6", attrs: { "aria-hidden": "true" } }),
      el("span", { text: c(p.id, "embed.button") }),
      el("span", { class: "embed__size", text: c(p.id, "embed.size") })
    ]);
    start.onclick = () => {
      const frame = el("iframe", { attrs: {
        src: p.embed.url,
        title: t("projects.embedTitle").replace("{title}", c(p.id, "title")),
        allow: p.embed.allow || "fullscreen",
        allowfullscreen: ""
      } });
      box.replaceChildren(frame);
      frame.focus(); // keyboard shortcuts work right away
    };
    box.appendChild(start);
    const full = el("a", { class: "button", text: t("projects.embedFull"), attrs: { href: p.embed.url, target: "_blank", rel: "noopener" } });
    return el("section", { class: "embed", attrs: { "aria-labelledby": "embed-heading" } }, [
      el("div", { class: "embed__head" }, [el("h2", { text: t("projects.embedHeading"), attrs: { id: "embed-heading" } }), full]),
      box,
      el("p", { class: "embed__note", text: c(p.id, "embed.note") })
    ]);
  }

  // Credits with a link, e.g. "Course taught by professor <a>Name</a>."
  function renderCredits(p) {
    return (c(p.id, "credits") || []).filter((cr) => cr && cr.name).map((cr) =>
      el("p", { class: "project__credit" }, [
        document.createTextNode(cr.before || ""),
        cr.url ? el("a", { text: cr.name, attrs: { href: cr.url, rel: "noopener" } }) : document.createTextNode(cr.name),
        document.createTextNode(cr.after || "")
      ])
    );
  }

  function renderProject(p) {
    const view = document.getElementById("project-view");
    const list = visibleProjects();
    const index = list.indexOf(p);
    const alts = c(p.id, "gallery") || [];

    const header = el("header", { class: "project__header" }, [
      el("a", { class: "project__back", text: t("projects.back"), attrs: { href: "#projects" } }),
      el("h1", { class: "project__title", text: c(p.id, "title"), attrs: { tabindex: "-1", id: "project-title" } }),
      el("p", { class: "project__subtitle", text: c(p.id, "subtitle") }),
      el("p", { class: "project__pitch", text: c(p.id, "pitch") }),
      projectLinks(p, false)
    ]);

    const facts = factsList(p, [
      ["projects.role", c(p.id, "role")],
      ["projects.team", c(p.id, "team")],
      ["projects.when", c(p.id, "when")],
      ["projects.builtWith", p.tech.join(", ")]
    ]);
    facts.classList.add("project__facts");

    const gallery = renderGallery(p, alts);

    const did = el("ul", { class: "project__did" });
    (c(p.id, "did") || []).filter(ready).forEach((line) => did.appendChild(el("li", { text: line })));

    const challenges = el("div", { class: "project__challenges" });
    const challengeList = (c(p.id, "challenges") || []).filter(ready);
    challengeList.forEach((ch) => {
      challenges.appendChild(el("div", { class: "challenge" }, [el("h3", { text: ch.title }), el("p", { text: ch.body })]));
    });

    // AI disclosure: what the AI did and what I did (optional per project)
    const aiLines = (c(p.id, "ai") || []).filter(ready);
    const ai = aiLines.length
      ? el("section", { class: "project__ai" }, [el("h2", { text: t("projects.ai") }), ...aiLines.map((line) => el("p", { text: line }))])
      : null;

    const body = el("div", { class: "project__body" }, [
      ready(c(p.id, "context")) ? el("section", {}, [el("h2", { text: t("projects.context") }), el("p", { text: c(p.id, "context") }), ...renderCredits(p)]) : null,
      did.childElementCount ? el("section", {}, [el("h2", { text: t("projects.did") }), did]) : null,
      challengeList.length ? el("section", {}, [el("h2", { text: t("projects.challenges") }), challenges]) : null,
      ai
    ]);

    const pager = el("nav", { class: "pager", attrs: { "aria-label": "Projects" } });
    const prev = list[index - 1];
    const next = list[index + 1];
    if (prev) pager.appendChild(el("a", { class: "pager__prev", attrs: { href: "#" + prev.id } }, [el("span", { text: t("projects.prev") }), el("strong", { text: c(prev.id, "title") })]));
    if (next) pager.appendChild(el("a", { class: "pager__next", attrs: { href: "#" + next.id } }, [el("span", { text: t("projects.next") }), el("strong", { text: c(next.id, "title") })]));

    view.replaceChildren(...[header, facts, renderEmbed(p), gallery, body, pager].filter(Boolean));
    if (p.draft) header.prepend(el("p", { class: "draft-note", text: t("projects.draft") }));
  }

  // ---------- routing ----------

  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    const home = document.getElementById("home-view");
    const view = document.getElementById("project-view");
    const project = visibleProjects().find((p) => p.id === id);

    if (project) {
      renderProject(project);
      home.hidden = true;
      view.hidden = false;
      document.title = c(project.id, "title") + " | " + t("hero.name");
      window.scrollTo(0, 0);
      document.getElementById("project-title").focus({ preventScroll: true });
      return;
    }

    const wasOnProject = !view.hidden;
    view.hidden = true;
    home.hidden = false;
    document.title = t("meta.title");
    const target = id && document.getElementById(id);
    if (target) {
      target.scrollIntoView();
      if (wasOnProject) target.querySelector("h2")?.focus?.();
    } else if (wasOnProject) {
      window.scrollTo(0, 0);
    }
  }

  // Light / dark mode: saved choice wins, otherwise follow the system
  function currentTheme() { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function renderThemeToggle() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const label = currentTheme() === "dark" ? t("nav.themeToLight") : t("nav.themeToDark");
    btn.setAttribute("aria-label", label);
    btn.title = label;
    btn.onclick = () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("portfolio-theme", next); } catch (e) { /* storage blocked: ignore */ }
      renderThemeToggle();
    };
  }

  function renderAll() {
    window.I18N.apply();
    renderLanguageSwitch();
    renderThemeToggle();
    renderProjectList();
    renderQa();
    renderAbout();
    renderResume();
    renderContact();
    route();
  }

  async function start() {
    try {
      site = await loadJson("data/site.json");
      projects = await loadJson("data/projects.json");
      await window.I18N.init(site);
      renderAll();
      if (window.FlowField) window.FlowField.mount(document.getElementById("flow-field"), document.querySelector(".hero__caption"));
      document.documentElement.classList.add("is-ready");
      window.addEventListener("hashchange", route);
    } catch (err) {
      console.error(err);
      document.getElementById("main").prepend(el("p", { class: "load-error", text: "The portfolio content could not load. If you opened index.html straight from your disk, run a local server instead (see README)." }));
    }
  }

  start();
})();
