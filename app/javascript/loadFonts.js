import pixelifyUrl from "../fonts/PixelifySans-latin.woff2?url";

const SITE_FONT = '"Waiting for the Sunrise", cursive';
const DISTRACTION_FONT = '"Pixelify Sans", sans-serif';

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

loadSiteFont();

document.addEventListener("turbo:load", () => {
  if (document.documentElement.dataset.siteFontLoaded) applySiteFont();
  if (document.documentElement.dataset.distractionFontLoaded) {
    applyDistractionFont();
  }
});
