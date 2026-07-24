/**
 * Capability gate for optional chrome (CRT barrel, Lenis, cursor, oneko).
 *
 * Controllers read globalThis.__georCapabilities (booleans).
 * HTML classes: geor-no-crt-barrel | geor-no-lenis | geor-no-cursor | geor-no-oneko
 *
 * - CRT barrel: static SVG feDisplacementMap — gated only on SVG support, not reduced-motion.
 * - Lenis: needs rAF; off for prefers-reduced-motion; off on phone/tablet UIs
 *   (syncTouch:false only skips touch smoothing; Lenis still owns the scroll container
 *   and fights native momentum on touch). Hybrid laptops keep Lenis.
 */

/** @typedef {{
 *   crtBarrel: boolean,
 *   lenis: boolean,
 *   customCursor: boolean,
 *   oneko: boolean,
 *   viewTransitions: boolean,
 * }} GeorCapabilities */

/** @type {GeorCapabilities} */
const defaults = {
  crtBarrel: true,
  lenis: true,
  customCursor: true,
  oneko: true,
  viewTransitions: true,
};

function mq(query) {
  try {
    return globalThis.matchMedia?.(query)?.matches === true;
  } catch {
    return false;
  }
}

/**
 * CRT barrel is an SVG feDisplacementMap filter applied to an SVG group.
 * Presence of the SVG filter interface is the real requirement — not CSS
 * filter:url() support (many engines report false for fragment urls).
 */
function supportsSvgDisplacementMap() {
  return typeof SVGFEDisplacementMapElement !== "undefined";
}

function supportsRequestAnimationFrame() {
  return typeof globalThis.requestAnimationFrame === "function";
}

/**
 * Primary pointer is touch-like (phone/tablet), not a hybrid laptop with a mouse.
 * Coarse alone is true on many Windows touch laptops that still have a fine pointer.
 */
function isTouchPrimaryUi() {
  const canHover = mq("(hover: hover)");
  const finePointer = mq("(any-pointer: fine)");
  if (canHover || finePointer) return false;
  return mq("(pointer: coarse)") || mq("(any-pointer: coarse)");
}

/**
 * @returns {GeorCapabilities}
 */
export function detectCapabilities() {
  /** @type {GeorCapabilities} */
  const flags = { ...defaults };

  const reducedMotion = mq("(prefers-reduced-motion: reduce)");
  const touchPrimary = isTouchPrimaryUi();

  if (!supportsRequestAnimationFrame()) {
    flags.lenis = false;
  }

  if (!supportsSvgDisplacementMap()) {
    flags.crtBarrel = false;
  }

  // Smooth wheel is motion; honour OS preference. CRT warp is not animated.
  if (reducedMotion) {
    flags.lenis = false;
  }

  // Phones/tablets: native scroll + system cursor (no Lenis transform container).
  if (touchPrimary) {
    flags.lenis = false;
    flags.customCursor = false;
    flags.oneko = false;
  }

  flags.viewTransitions =
    typeof document !== "undefined" && "startViewTransition" in document;

  return flags;
}

function applyDomFlags(flags) {
  const root = document.documentElement;
  root.classList.toggle("geor-no-crt-barrel", !flags.crtBarrel);
  root.classList.toggle("geor-no-lenis", !flags.lenis);
  root.classList.toggle("geor-no-cursor", !flags.customCursor);
  root.classList.toggle("geor-no-oneko", !flags.oneko);

  root.dataset.georCrtBarrel = flags.crtBarrel ? "on" : "off";
  root.dataset.georLenis = flags.lenis ? "on" : "off";
  root.dataset.georCursor = flags.customCursor ? "on" : "off";
  root.dataset.georOneko = flags.oneko ? "on" : "off";

  if (!flags.crtBarrel) {
    document.querySelectorAll("svg g[filter]").forEach((g) => {
      const f = g.getAttribute("filter") || "";
      if (f.includes("barrel") || f.includes("#barrel")) {
        g.removeAttribute("filter");
      }
    });
  }

  if (!flags.lenis) {
    const wrapper = document.getElementById("crt-content");
    if (wrapper) {
      wrapper.style.overflow = "auto";
      wrapper.style.overflowX = "hidden";
    }
  }
}

/**
 * @param {keyof GeorCapabilities} name
 */
export function isCapabilityEnabled(name) {
  const caps = globalThis.__georCapabilities;
  if (!caps) return true;
  return caps[name] !== false;
}

export function installCapabilities() {
  if (globalThis.__georCapabilitiesInstalled) {
    return globalThis.__georCapabilities;
  }
  globalThis.__georCapabilitiesInstalled = true;

  const flags = detectCapabilities();
  globalThis.__georCapabilities = flags;

  const apply = () => {
    applyDomFlags(flags);
  };

  if (document.documentElement) {
    document.documentElement.classList.toggle("geor-no-crt-barrel", !flags.crtBarrel);
    document.documentElement.classList.toggle("geor-no-lenis", !flags.lenis);
    document.documentElement.classList.toggle("geor-no-cursor", !flags.customCursor);
    document.documentElement.classList.toggle("geor-no-oneko", !flags.oneko);
  }

  if (document.body) {
    apply();
  } else {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  }

  document.addEventListener("turbo:load", () => applyDomFlags(flags));

  return flags;
}

installCapabilities();
