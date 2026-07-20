/**
 * Cross-browser capability gate.
 *
 * Unsupported features are turned off; site content keeps working.
 * When anything is disabled, a one-time alert() explains what dropped.
 *
 * Controllers read globalThis.__georCapabilities (booleans).
 * HTML classes: geor-no-crt-barrel | geor-no-lenis | geor-no-cursor | geor-no-oneko
 */

const ALERT_SESSION_KEY = "geor.me:capability-alert-v1";

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

function supportsSvgFilterUrl() {
  try {
    if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
      // url(#id) support is enough signal for feDisplacementMap pipelines.
      if (CSS.supports("filter", "url(#geor-cap-probe)")) return true;
      if (CSS.supports("filter", "url('#geor-cap-probe')")) return true;
    }
  } catch {
    /* fall through */
  }
  // Older engines: presence of the SVG filter interface.
  return typeof SVGFEDisplacementMapElement !== "undefined";
}

function supportsRequestAnimationFrame() {
  return typeof globalThis.requestAnimationFrame === "function";
}

/**
 * @returns {{ flags: GeorCapabilities, disabledLabels: string[] }}
 */
export function detectCapabilities() {
  /** @type {GeorCapabilities} */
  const flags = { ...defaults };
  /** @type {string[]} */
  const disabledLabels = [];

  const reducedMotion = mq("(prefers-reduced-motion: reduce)");
  const coarsePointer = mq("(pointer: coarse)");
  const noHover = !mq("(hover: hover)");
  const touchPrimary = coarsePointer || (noHover && mq("(any-pointer: coarse)"));

  if (!supportsRequestAnimationFrame()) {
    flags.lenis = false;
    flags.crtBarrel = false;
    disabledLabels.push("smooth scrolling (Lenis)", "CRT barrel warp");
  }

  if (reducedMotion) {
    if (flags.crtBarrel) {
      flags.crtBarrel = false;
      disabledLabels.push("CRT barrel warp");
    }
    if (flags.lenis) {
      flags.lenis = false;
      disabledLabels.push("smooth scrolling (Lenis)");
    }
  }

  if (!supportsSvgFilterUrl()) {
    if (flags.crtBarrel) {
      flags.crtBarrel = false;
      disabledLabels.push("CRT barrel warp");
    }
  }

  // Touch / coarse UIs: native scroll + system cursor work better than toys.
  if (touchPrimary) {
    if (flags.customCursor) {
      flags.customCursor = false;
      disabledLabels.push("custom cursor");
    }
    if (flags.oneko) {
      flags.oneko = false;
      disabledLabels.push("oneko cat");
    }
    if (flags.lenis) {
      flags.lenis = false;
      disabledLabels.push("smooth scrolling (Lenis)");
    }
  } else if (noHover && flags.customCursor) {
    flags.customCursor = false;
    disabledLabels.push("custom cursor");
  }

  flags.viewTransitions = typeof document !== "undefined" && "startViewTransition" in document;
  // View transitions already no-op silently — do not alert.

  // Dedupe labels (reduced motion + no rAF can double-add).
  const unique = [...new Set(disabledLabels)];

  return { flags, disabledLabels: unique };
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

  // Drop SVG filter attribute so paint never depends on feDisplacementMap.
  if (!flags.crtBarrel) {
    document.querySelectorAll("svg g[filter]").forEach((g) => {
      const f = g.getAttribute("filter") || "";
      if (f.includes("barrel") || f.includes("#barrel")) {
        g.removeAttribute("filter");
      }
    });
  }

  // Native scroll when Lenis is off.
  if (!flags.lenis) {
    const wrapper = document.getElementById("crt-content");
    if (wrapper) {
      wrapper.style.overflow = "auto";
      wrapper.style.overflowX = "hidden";
    }
    // Mark so extension userscripts / Zaraz locomotive still skip.
    globalThis._lenisInitialised = true;
  }
}

function buildAlertMessage(disabledLabels) {
  const lines = disabledLabels.map((label) => `• ${label}`);
  return (
    "Some features are not supported in this browser or on this device and have been turned off:\n\n" +
    `${lines.join("\n")}\n\n` +
    "The rest of the site should still work."
  );
}

function maybeAlert(disabledLabels) {
  if (!disabledLabels.length) return;
  try {
    if (sessionStorage.getItem(ALERT_SESSION_KEY) === "1") return;
    sessionStorage.setItem(ALERT_SESSION_KEY, "1");
  } catch {
    // Private mode / blocked storage — still alert once this page load.
    if (globalThis.__georCapabilityAlerted) return;
    globalThis.__georCapabilityAlerted = true;
  }

  // Defer so first paint / Turbo boot aren't blocked mid-parse.
  const show = () => {
    try {
      globalThis.alert(buildAlertMessage(disabledLabels));
    } catch {
      /* ignore */
    }
  };

  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(() => setTimeout(show, 0));
  } else {
    setTimeout(show, 0);
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

  const { flags, disabledLabels } = detectCapabilities();
  globalThis.__georCapabilities = flags;

  const apply = () => {
    applyDomFlags(flags);
    maybeAlert(disabledLabels);
  };

  if (document.documentElement) {
    // Classes as early as possible (before body if still parsing).
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

  // Re-apply after Turbo morph / full render (classes stick on <html>).
  document.addEventListener("turbo:load", () => applyDomFlags(flags));

  return flags;
}

installCapabilities();
