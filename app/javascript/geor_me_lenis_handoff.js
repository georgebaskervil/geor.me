// geor.me scrolls inside #crt-content (SVG foreignObject), not the document.
// Extension-injected Lenis defaults to window scroll; patch Lenis when the CDN script loads.
(function installGeorMeScrollHandoff() {
  if (window.__georMeScrollHandoffInstalled) return;
  window.__georMeScrollHandoffInstalled = true;

  const TAG = "[geor.me/scroll]";
  const SCROLL_ROOT_ID = "crt-content";

  function scrollRoot() {
    return document.getElementById(SCROLL_ROOT_ID);
  }

  function patchLenisConstructor() {
    const NativeLenis = window.Lenis;
    if (typeof NativeLenis !== "function" || NativeLenis.__georMeCrtPatched) {
      return;
    }

    function LenisWithCrtWrapper(options) {
      const root = scrollRoot();
      if (root) {
        options = { ...options, wrapper: root, content: root };
        console.debug(TAG, "Lenis wrapper set to", root);
      }
      const instance = new NativeLenis(options);
      window.lenis = instance;
      return instance;
    }

    LenisWithCrtWrapper.prototype = NativeLenis.prototype;
    Object.assign(LenisWithCrtWrapper, NativeLenis);
    LenisWithCrtWrapper.__georMeCrtPatched = true;
    window.Lenis = LenisWithCrtWrapper;
  }

  function patchScriptAppend(target) {
    const origAppendChild = target.appendChild.bind(target);

    target.appendChild = function (node) {
      const result = origAppendChild(node);

      if (
        node?.tagName === "SCRIPT" &&
        node.src &&
        /lenis/i.test(node.src) &&
        !node.dataset.georMeScrollPatch
      ) {
        node.dataset.georMeScrollPatch = "1";
        node.addEventListener(
          "load",
          () => {
            patchLenisConstructor();
          },
          { once: true },
        );
      }

      return result;
    };
  }

  if (!window.__georMeLenisPatchEarly) {
    patchScriptAppend(document.head);
  }

  function isExtensionFooter(node) {
    return (
      node?.nodeType === Node.ELEMENT_NODE &&
      node.tagName === "DIV" &&
      node.querySelector?.('a[href="https://geor.me/licensing"]')
    );
  }

  function adoptExtensionFooter() {
    const slot = document.getElementById("geor-me-extension-footer-slot");
    if (!slot) return;

    for (const node of document.body.children) {
      if (node === slot || node.id === "geor-me-extension-footer-slot") continue;
      if (!isExtensionFooter(node)) continue;
      if (node.parentElement === slot) continue;

      slot.appendChild(node);
      slot.removeAttribute("aria-hidden");
      document.documentElement.classList.add("geor-me-extension-footer");
      console.debug(TAG, "adopted extension footer into slot");
      break;
    }
  }

  function watchExtensionFooter() {
    adoptExtensionFooter();
    const observer = new MutationObserver(adoptExtensionFooter);
    observer.observe(document.body, { childList: true });
  }

  if (document.body) {
    watchExtensionFooter();
  } else {
    document.addEventListener("DOMContentLoaded", watchExtensionFooter, {
      once: true,
    });
  }

  document.documentElement.classList.add("geor-me-crt-scroll");
  document.documentElement.dataset.georMeScrollRoot = `#${SCROLL_ROOT_ID}`;
})();
