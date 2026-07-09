/*!
 * Tilt controller (Stimulus)
 *
 * 3D mouse-follow tilt + dynamic glow effect for cards/images.
 *
 * The core tilt math (center-based rotate3d + log(distance) angle + moving glow radial-gradient)
 * is based on the "3D hover tilt" demo by Mark Miro:
 *   https://codepen.io/markmiro/pen/wbqMPa
 *
 * MIT License
 *
 * Copyright (c) 2026 by Mark Miro
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
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Tilt controller (Stimulus)
 *
 * Applies a 3D mouse-follow tilt + dynamic glow to a card element.
 * Designed to be generic so it can be used on images or other content.
 *
 * Usage (recommended — controller on the card, ancestor provides perspective):
 *   <div class="my-scene" style="perspective: 1500px">
 *     <div data-controller="tilt" class="my-card">
 *       <img src="...">
 *       <!-- .glow is created if missing -->
 *     </div>
 *   </div>
 *
 * Usage (auto-wrap an image; controller creates card + glow):
 *   <img data-controller="tilt" data-tilt-perspective-value="1500px" src="..." width="300" height="300">
 *
 * Values:
 *   perspective — if provided, ensures a parent has perspective (wraps or sets on immediate parent).
 *   scale — default 1.07
 *   sensitivity — divisor for rotation axes (default 100)
 *   angleFactor — multiplier on log(distance) degrees (default 2)
 *
 * Optimizations (shared engine):
 * - Shared activeCards Map + visibleCards Set (global)
 * - Single global passive pointermove + single RAF loop
 * - IntersectionObserver (threshold 0.1) to gate updates to visible cards
 * - Cached bounds + half sizes + per-card params on enter
 * - will-change only while active
 * - pointerenter/pointerleave per card
 * - Direct string concat in the hot path
 * - One schedule/RAF decision at the top level
 */
import { Controller } from "@hotwired/stimulus";

// === Shared optimized tilt engine ===

const activeCards = new Map(); // cardElement -> { bounds, glow, halfW, halfH, scale, sensitivity, angleFactor }
const visibleCards = new Set();

let mouseX = 0;
let mouseY = 0;
let rafId = null;

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const card = entry.target;
    if (entry.isIntersecting) {
      visibleCards.add(card);
    } else {
      visibleCards.delete(card);
      if (activeCards.has(card)) {
        const data = activeCards.get(card);
        activeCards.delete(card);
        card.style.willChange = '';
        card.style.transform = '';
        if (data?.glow) data.glow.style.backgroundImage = '';
      }
    }
  }
}, { threshold: 0.1 });

function scheduleUpdate() {
  if (!rafId && activeCards.size > 0) {
    rafId = requestAnimationFrame(updateCards);
  }
}

function updateCards() {
  rafId = null;
  for (const [card, data] of activeCards) {
    const { bounds, glow, halfW, halfH, scale, sensitivity, angleFactor } = data;

    const centerX = mouseX - bounds.x - halfW;
    const centerY = mouseY - bounds.y - halfH;

    const distance = Math.hypot(centerX, centerY);
    const angle = distance > 1 ? Math.log(distance) * angleFactor : 0;

    card.style.transform =
      'scale3d(' + scale + ',' + scale + ',' + scale + ') rotate3d(' +
      (centerY / sensitivity) + ',' +
      (-centerX / sensitivity) + ',0,' +
      angle + 'deg)';

    if (glow) {
      const gx = centerX * 2 + halfW;
      const gy = centerY * 2 + halfH;
      glow.style.backgroundImage =
        'radial-gradient(circle at ' + gx + 'px ' + gy + 'px, #ffffff55, #0000000f)';
    }
  }
}

function onPointerMove(e) {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (!rafId && activeCards.size > 0) {
    rafId = requestAnimationFrame(updateCards);
  }
}

document.addEventListener('pointermove', onPointerMove, { passive: true });

function registerTiltCard(card, glow, params = {}) {
  if (!card || card._tiltCleanup) return;

  const scale = params.scale ?? 1.07;
  const sensitivity = params.sensitivity ?? 100;
  const angleFactor = params.angleFactor ?? 2;

  observer.observe(card);

  // Seed visibility synchronously for elements already in view (e.g. homepage pfp at load).
  const r = card.getBoundingClientRect();
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const inView = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  if (inView && r.width > 0 && r.height > 0) {
    visibleCards.add(card);
  }

  const onEnter = () => {
    if (!visibleCards.has(card)) return;

    const bounds = card.getBoundingClientRect();
    activeCards.set(card, {
      bounds,
      glow,
      halfW: bounds.width / 2,
      halfH: bounds.height / 2,
      scale,
      sensitivity,
      angleFactor,
    });

    card.style.willChange = 'transform';
    scheduleUpdate();
  };

  const onLeave = () => {
    activeCards.delete(card);
    card.style.willChange = '';
    card.style.transform = '';
    if (glow) glow.style.backgroundImage = '';
  };

  card.addEventListener('pointerenter', onEnter);
  card.addEventListener('pointerleave', onLeave);

  card._tiltCleanup = () => {
    observer.unobserve(card);
    card.removeEventListener('pointerenter', onEnter);
    card.removeEventListener('pointerleave', onLeave);
    activeCards.delete(card);
    visibleCards.delete(card);
    card.style.willChange = '';
    card.style.transform = '';
    if (glow) glow.style.backgroundImage = '';
    delete card._tiltCleanup;
  };
}

function unregisterTiltCard(card) {
  if (card && card._tiltCleanup) card._tiltCleanup();
}

export default class extends Controller {
  static values = {
    perspective: String,
    scale: { type: Number, default: 1.07 },
    sensitivity: { type: Number, default: 100 },
    angleFactor: { type: Number, default: 2 },
  };

  connect() {
    if (this._initialized) return;
    this._initialized = true;

    this._card = null;
    this._glow = null;

    this._setupCardAndGlow();
    this._ensurePerspective();

    if (this._card) {
      registerTiltCard(this._card, this._glow, {
        scale: this.scaleValue,
        sensitivity: this.sensitivityValue,
        angleFactor: this.angleFactorValue,
      });
    }
  }

  disconnect() {
    if (this._card) {
      unregisterTiltCard(this._card);
    }
    this._card = null;
    this._glow = null;
  }

  _setupCardAndGlow() {
    const el = this.element;

    if (el.tagName === "IMG" || el.tagName === "VIDEO" || el.tagName === "PICTURE") {
      const media = el;

      const card = document.createElement("div");
      card.classList.add("tilt-card");

      const mw = media.getAttribute("width");
      const mh = media.getAttribute("height");
      if (mw) card.style.width = `${mw}px`;
      if (mh) card.style.height = `${mh}px`;
      if (media.style.width) card.style.width = media.style.width;
      if (media.style.height) card.style.height = media.style.height;

      media.parentNode.insertBefore(card, media);
      card.appendChild(media);

      const glow = document.createElement("div");
      glow.classList.add("glow", "tilt-glow");
      card.appendChild(glow);

      media.style.pointerEvents = "none";

      // Propagate data-super-hover to the generated tilt surface so that the always-running
      // super-hover (selector "*") or default selector can stamp [data-super-hover-active]
      // on the card for lift/hover styles (box-shadow etc). The hit will land on the card
      // because children (img, glow) have pointer-events:none.
      if (media.hasAttribute("data-super-hover")) {
        card.setAttribute("data-super-hover", "");
        media.removeAttribute("data-super-hover");
      }

      this._card = card;
      this._glow = glow;
      this._media = media;
      return;
    }

    this._card = el;

    let glow = el.querySelector(":scope > .glow, :scope > .tilt-glow");
    if (!glow) {
      glow = document.createElement("div");
      glow.classList.add("glow", "tilt-glow");
      el.appendChild(glow);
    }
    this._glow = glow;
  }

  _ensurePerspective() {
    const p = this.perspectiveValue;
    if (!p || !this._card) return;

    let node = this._card.parentElement;
    while (node && node !== document.body) {
      const cs = getComputedStyle(node);
      if (cs.perspective && cs.perspective !== "none") return;
      node = node.parentElement;
    }

    const parent = this._card.parentElement;
    if (parent) {
      const cs = getComputedStyle(parent);
      if (!cs.perspective || cs.perspective === "none") {
        if (!parent.style.perspective) parent.style.perspective = p;
      }
    }
  }
}
