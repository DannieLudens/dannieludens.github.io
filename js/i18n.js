// Loads text from i18n/<lang>.json and fills every element marked with data-i18n.
// Missing keys in a language fall back to the default language (English).
(function () {
  const STORAGE_KEY = "portfolio-lang";
  let strings = {};
  let fallback = {};
  let current = "en";

  // Reads a nested key such as "hero.role" from an object
  function lookup(obj, key) {
    return key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  // Returns the text for a key in the current language, or the fallback
  function t(key) {
    const value = lookup(strings, key);
    return value !== undefined ? value : lookup(fallback, key);
  }

  async function loadJson(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error("Could not load " + path);
    return res.json();
  }

  // Fills static text in the page
  function apply(root) {
    (root || document).querySelectorAll("[data-i18n]").forEach((el) => {
      const value = t(el.dataset.i18n);
      if (typeof value === "string") el.textContent = value;
    });
    (root || document).querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const value = t(el.dataset.i18nAria);
      if (typeof value === "string") el.setAttribute("aria-label", value);
    });
  }

  function savedLanguage() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function saveLanguage(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage blocked: ignore */ }
  }

  // Picks saved language, then browser language, then the default
  function pickLanguage(available, defaultLang) {
    const saved = savedLanguage();
    if (saved && available.includes(saved)) return saved;
    const browser = (navigator.language || "").slice(0, 2);
    if (available.includes(browser)) return browser;
    return defaultLang;
  }

  async function init(config) {
    const available = config.languages || ["en"];
    const defaultLang = config.defaultLanguage || "en";
    fallback = await loadJson("i18n/" + defaultLang + ".json");
    await setLanguage(pickLanguage(available, defaultLang), defaultLang, false);
  }

  async function setLanguage(lang, defaultLang, remember) {
    strings = lang === (defaultLang || "en") ? fallback : await loadJson("i18n/" + lang + ".json");
    current = lang;
    document.documentElement.lang = lang;
    if (remember) saveLanguage(lang);
    const title = t("meta.title");
    if (title) document.title = title;
    apply();
  }

  window.I18N = { init, t, apply, setLanguage, get current() { return current; } };
})();
