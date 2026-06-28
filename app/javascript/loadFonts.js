import xanhRegularUrl from "../fonts/XanhMono-Regular-latin.woff2?url";
import xanhItalicUrl from "../fonts/XanhMono-Italic-latin.woff2?url";
import pixelifyUrl from "../fonts/PixelifySans-latin.woff2?url";

const SITE_FONT = '"Xanh Mono", monospace';
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

export function applySiteFont() {
  setFontFamily(siteFontTargets(), SITE_FONT);
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
  if (!siteFontPromise) {
    siteFontPromise = loadFontFaces([
      new FontFace("Xanh Mono", `url(${xanhRegularUrl})`, {
        weight: "400",
        style: "normal",
        display: "swap",
      }),
      new FontFace("Xanh Mono", `url(${xanhItalicUrl})`, {
        weight: "400",
        style: "italic",
        display: "swap",
      }),
    ])
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
