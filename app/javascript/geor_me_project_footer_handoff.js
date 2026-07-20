// First-party footer lives in Lenis content. This only dedupes/reparents
// legacy Zaraz (or similar) injects that land on document.body outside the CRT.
(function installGeorMeProjectFooterHandoff() {
  if (globalThis.__georMeProjectFooterHandoffInstalled) return;
  globalThis.__georMeProjectFooterHandoffInstalled = true;

  const TAG = "[geor.me/footer]";
  const FOOTER_ID = "geor-me-project-footer";

  function getLenis() {
    return globalThis.lenis || null;
  }

  function getLenisContent(lenis) {
    if (lenis?.content instanceof Element) return lenis.content;
    return (
      document.querySelector('.crt-scroll-content[data-controller~="lenis"]') ||
      document.querySelector(".crt-scroll-content")
    );
  }

  function isProjectFooter(node) {
    if (node?.nodeType !== Node.ELEMENT_NODE || node.tagName !== "DIV") {
      return false;
    }
    if (node.id === FOOTER_ID) return true;
    if (node.classList?.contains("geor-me-project-footer")) return true;
    return Boolean(
      node.querySelector?.(
        'a[href*="compliance.geor.me/books/georme-compliance-documentation"]',
      ),
    );
  }

  function clearFixedPinStyles(el) {
    for (const prop of [
      "position",
      "bottom",
      "left",
      "right",
      "top",
      "z-index",
      "margin-top",
      "width",
    ]) {
      if (el.style.getPropertyValue(prop)) el.style.removeProperty(prop);
    }
  }

  function adoptFooter(el) {
    if (!el) return;

    const lenis = getLenis();
    const content = getLenisContent(lenis);

    if (!el.id) el.id = FOOTER_ID;
    el.classList?.add("geor-me-project-footer");

    if (!content) {
      el.dataset.georMeFooterMount = el.dataset.georMeFooterMount || "pending";
      return;
    }

    clearFixedPinStyles(el);

    if (el.parentElement !== content) {
      content.appendChild(el);
    } else if (el !== content.lastElementChild) {
      content.appendChild(el);
    }

    el.dataset.georMeFooterMount = "lenis-content";
    el.dataset.georMeFooterPinned = "0";
    document.documentElement.classList.remove("geor-me-project-footer-pinned");

    try {
      lenis?.resize?.();
    } catch {
      /* ignore */
    }
  }

  function allFooterCandidates() {
    const found = [];
    const seen = new Set();
    const push = (node) => {
      if (!node || seen.has(node) || !isProjectFooter(node)) return;
      seen.add(node);
      found.push(node);
    };

    push(document.getElementById(FOOTER_ID));
    document.querySelectorAll(".geor-me-project-footer").forEach(push);
    // Body-level injects without the class (older Zaraz HTML)
    for (const node of document.body?.children || []) push(node);

    return found;
  }

  function adoptInjectedFooters() {
    if (!document.body) return;

    const candidates = allFooterCandidates();
    if (candidates.length === 0) return;

    const content = getLenisContent(getLenis());
    // Prefer first-party (already in Lenis content / server-rendered).
    const keep =
      candidates.find((el) => content?.contains(el)) ||
      candidates.find((el) => el.id === FOOTER_ID) ||
      candidates[0];

    for (const el of candidates) {
      if (el === keep) continue;
      el.remove();
      console.debug(TAG, "removed duplicate project footer");
    }

    adoptFooter(keep);
  }

  function watch() {
    adoptInjectedFooters();
    const observer = new MutationObserver(adoptInjectedFooters);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("turbo:load", adoptInjectedFooters);

    const started = Date.now();
    const poll = setInterval(() => {
      adoptInjectedFooters();
      if (getLenis() || Date.now() - started > 5000) clearInterval(poll);
    }, 100);
  }

  if (document.body) {
    watch();
  } else {
    document.addEventListener("DOMContentLoaded", watch, { once: true });
  }
})();
