/**
 * super-hover — vendored from https://github.com/danielpetho/super-hover
 *
 * MIT License
 * Copyright (c) 2026 Daniel Petho
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const DEFAULT_SELECTOR = "[data-super-hover]";
const DEFAULT_ACTIVE = "data-super-hover-active";
const DEFAULT_ENTER_EVENT = "superhoverenter";
const DEFAULT_LEAVE_EVENT = "superhoverleave";
const DEFAULT_MOVE_EVENT = "superhovermove";
const DEFAULT_POINTER_TYPES = ["mouse", "pen"];
const DOCUMENT_NODE = 9;

function getScopeDocument(root) {
  if (!root) return document;
  if (root.nodeType === DOCUMENT_NODE) return root;
  return root.ownerDocument ?? document;
}

function rootContains(root, el) {
  if (!root) return true;
  if (root.nodeType === DOCUMENT_NODE) {
    const html = root.documentElement;
    return html ? html.contains(el) : false;
  }
  return root.contains(el);
}

export function createSuperHover(options = {}) {
  const selector = options.selector ?? DEFAULT_SELECTOR;
  const activeAttribute = options.activeAttribute ?? DEFAULT_ACTIVE;
  const enterEventType = options.enterEventType ?? DEFAULT_ENTER_EVENT;
  const leaveEventType = options.leaveEventType ?? DEFAULT_LEAVE_EVENT;
  const moveEventName =
    options.moveEventType === false ? null : (options.moveEventType ?? DEFAULT_MOVE_EVENT);
  const root = options.root;
  const scopeDoc = getScopeDocument(root);
  const scopeWin = scopeDoc.defaultView ?? window;
  const allowedPointerTypes = new Set(options.pointerTypes ?? [...DEFAULT_POINTER_TYPES]);

  let running = options.enabled ?? true;
  let destroyed = false;
  let lastX = 0, lastY = 0;
  let hasPointer = false;
  let current = null;
  let rafId = 0, pending = false;

  function cancelPendingFrame() {
    if (rafId !== 0) { scopeWin.cancelAnimationFrame(rafId); rafId = 0; pending = false; }
  }

  function deactivate(prev, next) {
    prev.removeAttribute(activeAttribute);
    prev.dispatchEvent(new CustomEvent(leaveEventType, {
      bubbles: true, cancelable: false,
      detail: { x: lastX, y: lastY, previous: prev, current: next },
    }));
  }

  function clearActive() {
    if (!current) return;
    const prev = current; current = null; deactivate(prev, null);
  }

  function resolveTarget() {
    if (!running || !hasPointer) return null;
    const hit = scopeDoc.elementFromPoint(lastX, lastY);
    if (!hit) return null;
    const el = hit.closest(selector);
    if (!el || !rootContains(root, el)) return null;
    return el;
  }

  function apply() {
    if (destroyed || !running) { clearActive(); return; }
    const next = resolveTarget();
    if (next === current) return;
    const previousElement = current;
    if (current) { const prev = current; current = null; deactivate(prev, next); }
    current = next;
    if (current) {
      current.setAttribute(activeAttribute, "");
      current.dispatchEvent(new CustomEvent(enterEventType, {
        bubbles: true, cancelable: false,
        detail: { x: lastX, y: lastY, previous: previousElement, current },
      }));
    }
  }

  function schedule() {
    if (destroyed || pending) return;
    pending = true;
    rafId = scopeWin.requestAnimationFrame(() => {
      rafId = 0; pending = false;
      if (destroyed) return;
      if (!running || !hasPointer) { clearActive(); return; }
      apply();
      if (moveEventName !== null && current !== null) {
        current.dispatchEvent(new CustomEvent(moveEventName, {
          bubbles: true, cancelable: false,
          detail: { x: lastX, y: lastY, current },
        }));
      }
    });
  }

  function onPointerMove(e) {
    if (destroyed || !allowedPointerTypes.has(e.pointerType)) return;
    lastX = e.clientX; lastY = e.clientY; hasPointer = true;
    if (running) schedule();
  }

  function onPointerLeaveDocument() { hasPointer = false; schedule(); }
  function onPointerOut(e) { if (!e.relatedTarget) onPointerLeaveDocument(); }
  function onVisibilityChange() {
    if (scopeDoc.visibilityState === "hidden") { hasPointer = false; schedule(); }
  }

  scopeWin.addEventListener("pointermove", onPointerMove, { passive: true });
  scopeDoc.addEventListener("scroll", schedule, { capture: true, passive: true });
  scopeWin.addEventListener("resize", schedule, { passive: true });
  scopeWin.addEventListener("blur", onPointerLeaveDocument);
  scopeDoc.addEventListener("pointerleave", onPointerLeaveDocument);
  scopeDoc.addEventListener("pointercancel", onPointerLeaveDocument);
  scopeDoc.addEventListener("pointerout", onPointerOut);
  scopeDoc.addEventListener("visibilitychange", onVisibilityChange);

  schedule();

  return {
    pause()   { if (!destroyed) { running = false; cancelPendingFrame(); clearActive(); } },
    resume()  { if (!destroyed) { running = true; schedule(); } },
    refresh() { if (!destroyed) schedule(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      scopeWin.removeEventListener("pointermove", onPointerMove);
      scopeDoc.removeEventListener("scroll", schedule, { capture: true });
      scopeWin.removeEventListener("resize", schedule);
      scopeWin.removeEventListener("blur", onPointerLeaveDocument);
      scopeDoc.removeEventListener("pointerleave", onPointerLeaveDocument);
      scopeDoc.removeEventListener("pointercancel", onPointerLeaveDocument);
      scopeDoc.removeEventListener("pointerout", onPointerOut);
      scopeDoc.removeEventListener("visibilitychange", onVisibilityChange);
      cancelPendingFrame(); hasPointer = false; clearActive();
    },
  };
}