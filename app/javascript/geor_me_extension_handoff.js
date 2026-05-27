// Adopt extension-injected project footer into a fixed slot above the CRT frame.
(function installGeorMeExtensionHandoff() {
  if (window.__georMeExtensionHandoffInstalled) return;
  window.__georMeExtensionHandoffInstalled = true;

  const TAG = "[geor.me/extension]";

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
})();
