import pixelifyUrl from "../fonts/PixelifySans-latin.woff2?url";
import nablaUrl from "../fonts/Nabla-latin.woff2?url";

// Twemoji Color is loaded with emoji unicode-range only; keep it at end of stacks.
const SITE_FONT =
  '"Waiting for the Sunrise", cursive, "Twemoji Color", system-ui, sans-serif';
const DISTRACTION_FONT =
  '"Pixelify Sans", sans-serif, "Twemoji Color", system-ui';
const FOOTER_FONT =
  'Nabla, system-ui, -apple-system, sans-serif, "Twemoji Color"';
const TWEMOJI_SRC =
  "https://twemoji.libreverse.io/TwitterColorEmoji-SVGinOT.ttf";

function siteFontTargets() {
  return [
    document.documentElement,
    document.body,
    document.querySelector(".crt-shell"),
    document.getElementById("crt-content"),
  ];
}

function setFontFamily(elements, stack) {
  for (const el of elements) {
    if (!el) continue;
    el.style.setProperty("font-family", stack, "important");
  }
}

function setFontSize(elements, size) {
  for (const el of elements) {
    if (!el) continue;
    el.style.setProperty("font-size", size, "important");
  }
}

function setLetterSpacing(elements, spacing) {
  for (const el of elements) {
    if (!el) continue;
    el.style.setProperty("letter-spacing", spacing, "important");
  }
}

export function applySiteFont() {
  const targets = siteFontTargets();
  setFontFamily(targets, SITE_FONT);
  // Force the increased base size onto CRT layers (Safari foreignObject does not inherit rem from html).
  setFontSize(targets, "22px");
  // Add a smidge of extra letter-spacing site-wide (especially for the handwriting font).
  setLetterSpacing(targets, "0.5px");
}

export function applyDistractionFont() {
  setFontFamily(
    document.querySelectorAll("#distractionmode-scope .floating-window.window98"),
    DISTRACTION_FONT,
  );
}

export function applyFooterFont() {
  setFontFamily(
    document.querySelectorAll("#geor-me-project-footer, .geor-me-project-footer"),
    FOOTER_FONT,
  );
}

async function loadFontFaces(faces) {
  const loaded = await Promise.all(
    faces.map((face) => face.load().then((font) => document.fonts.add(font))),
  );
  await document.fonts.ready;
  return loaded;
}

let siteFontPromise;

export function loadSiteFont() {
  // Waiting for the Sunrise is loaded via the Google Fonts <link> in the layout <head>.
  // We still force-apply via JS to .crt-shell / #crt-content (Safari does not inherit
  // web fonts from <html> inside SVG <foreignObject>). Wait for document.fonts.ready
  // so the variable font is swapped in before we set the family.
  if (!siteFontPromise) {
    siteFontPromise = document.fonts.ready
      .then(() => {
        document.documentElement.dataset.siteFontLoaded = "1";
        applySiteFont();
        return true;
      })
      .catch(() => {
        applySiteFont();
        return false;
      });
  }
  return siteFontPromise;
} 

let distractionFontPromise;

export function loadDistractionFont() {
  if (!distractionFontPromise) {
    distractionFontPromise = loadFontFaces([
      new FontFace("Pixelify Sans", `url(${pixelifyUrl})`, {
        weight: "400 700",
        style: "normal",
        display: "swap",
      }),
    ])
      .then(() => {
        document.documentElement.dataset.distractionFontLoaded = "1";
        applyDistractionFont();
        return true;
      })
      .catch(() => {
        applyDistractionFont();
        return false;
      });
  }

  return distractionFontPromise;
}

let nablaFontPromise;

export function loadNablaFont() {
  if (!nablaFontPromise) {
    nablaFontPromise = loadFontFaces([
      new FontFace("Nabla", `url(${nablaUrl})`, {
        weight: "400",
        style: "normal",
        display: "swap",
      }),
    ])
      .then(() => {
        document.documentElement.dataset.nablaFontLoaded = "1";
        applyFooterFont();
        return true;
      })
      .catch(() => {
        applyFooterFont();
        return false;
      });
  }
  return nablaFontPromise;
}

function injectTwemojiFont() {
  if (document.getElementById("twemoji-color-font")) return;

  // Only register the face — do not override body { font-family }.
  // Site/footer stacks already append "Twemoji Color" for emoji codepoints.
  const style = document.createElement("style");
  style.id = "twemoji-color-font";
  style.textContent =
    "@font-face{" +
    "font-family:'Twemoji Color';" +
    `src:url('${TWEMOJI_SRC}') format('truetype');` +
    "font-display:swap;" +
    "unicode-range:U+1F000-1FAFF,U+2600-27BF,U+2190-21FF,U+2B00-2BFF,U+FE00-FE0F,U+1F1E6-1F1FF,U+200D,U+20E3,U+E0020-E007F;" +
    "}";
  (document.head || document.documentElement).appendChild(style);
}

loadSiteFont();
loadNablaFont();
injectTwemojiFont();

document.addEventListener("turbo:load", () => {
  if (document.documentElement.dataset.siteFontLoaded) applySiteFont();
  if (document.documentElement.dataset.distractionFontLoaded) {
    applyDistractionFont();
  }
  if (document.documentElement.dataset.nablaFontLoaded) applyFooterFont();
  injectTwemojiFont();
});
