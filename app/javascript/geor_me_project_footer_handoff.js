// Zaraz (and similar tools) append the project footer to document.body.
// The CRT frame is position:fixed full-viewport, so an in-flow body child
// lands mid-page (or under the SVG). Pin injects to the viewport bottom.
(function installGeorMeProjectFooterHandoff() {
  if (globalThis.__georMeProjectFooterHandoffInstalled) return;
  globalThis.__georMeProjectFooterHandoffInstalled = true;

  const TAG = "[geor.me/footer]";
  const FOOTER_ID = "geor-me-project-footer";

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

  function pinFooter(el) {
    if (!el || el.dataset.georMeFooterPinned === "1") return;

    // Force viewport-bottom placement above CRT (z-index 1) and scanlines (9999).
    el.style.setProperty("position", "fixed", "important");
    el.style.setProperty("bottom", "0", "important");
    el.style.setProperty("left", "0", "important");
    el.style.setProperty("right", "0", "important");
    el.style.setProperty("top", "auto", "important");
    el.style.setProperty("z-index", "10000", "important");
    el.style.setProperty("margin-top", "0", "important");
    el.style.setProperty("width", "100%", "important");
    el.style.setProperty("box-sizing", "border-box", "important");

    if (el.parentElement !== document.body) {
      document.body.append(el);
    } else if (el !== document.body.lastElementChild) {
      document.body.append(el);
    }

    if (!el.id) el.id = FOOTER_ID;
    el.dataset.georMeFooterPinned = "1";
    document.documentElement.classList.add("geor-me-project-footer-pinned");
    console.debug(TAG, "pinned Zaraz/project footer to viewport bottom");
  }

  function adoptInjectedFooters() {
    if (!document.body) return;

    const byId = document.getElementById(FOOTER_ID);
    if (byId) {
      pinFooter(byId);
      return;
    }

    for (const node of document.body.children) {
      if (isProjectFooter(node)) {
        pinFooter(node);
        return;
      }
    }
  }

  function watch() {
    adoptInjectedFooters();
    const observer = new MutationObserver(adoptInjectedFooters);
    observer.observe(document.body, { childList: true });
  }

  if (document.body) {
    watch();
  } else {
    document.addEventListener("DOMContentLoaded", watch, { once: true });
  }
})();
