/*!
 * images_lightbox_controller.js
 *
 * Fullscreen lightbox for /images using Three.js + zoom-blur shader + GSAP.
 * Replicates the provided demo behavior:
 * - Dual-plane crossfade driven by wheel / upper-lower clicks / arrow keys
 * - Mouse position drives blur center
 * - GSAP intro animation on open
 * - Left click (primary) on grid opens lightbox at that image
 * - Right click on grid opens the high-res lossless link
 *
 * Three setup is local (no external useThree). Shader adapted from glfx.js.
 * GSAP is excluded from Babel (closure-elimination/faster.js) so its plugin harness stays intact.
 */

import { Controller } from "@hotwired/stimulus";
import * as THREE from "three";
import { gsap } from "gsap";

// --- math helpers (matching demo) ---
function lerp(a, b, x) {
  return a + x * (b - a);
}

function lerpv2(v1, v2, amount) {
  v1.x = lerp(v1.x, v2.x, amount);
  v1.y = lerp(v1.y, v2.y, amount);
}

// --- minimal three bootstrap equivalent to the demo's useThree({canvas, mouse_move:true}) ---
// Provides renderer, orthographic camera, scene, normalized mouse (-1..1), size info, and resize cbs.
function createThree(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: false,
  });

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  const scene = new THREE.Scene();

  const state = {
    renderer,
    camera,
    scene,
    size: { width: 1, height: 1, wWidth: 2, wHeight: 2, ratio: 1 },
    mouse: new THREE.Vector2(0, 0),
    _resizeCbs: [],
    onAfterResize(cb) {
      if (typeof cb === "function") this._resizeCbs.push(cb);
    },
  };

  function updateSize() {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    renderer.setSize(w, h);

    const ratio = w / h;
    camera.left = -ratio;
    camera.right = ratio;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();

    state.size.width = w;
    state.size.height = h;
    state.size.ratio = ratio;
    state.size.wWidth = ratio * 2;
    state.size.wHeight = 2;

    state._resizeCbs.forEach((fn) => fn());
  }

  window.addEventListener("resize", updateSize, { passive: true });
  updateSize();

  // Pointer -> NDC mouse (-1..1), Y flipped for typical NDC
  function onPointerMove(e) {
    const ww = state.size.width || 1;
    const hh = state.size.height || 1;
    const x = (e.clientX / ww) * 2 - 1;
    const y = -(e.clientY / hh) * 2 + 1;
    state.mouse.set(x, y);
  }
  document.addEventListener("pointermove", onPointerMove, { passive: true });

  state.dispose = () => {
    window.removeEventListener("resize", updateSize);
    document.removeEventListener("pointermove", onPointerMove);
  };

  return state;
}

// --- ZoomBlurImage factory (core of the effect) ---
function ZoomBlurImage({ three }) {
  let geometry, material, mesh;

  const uMap = { value: null };
  const uCenter = { value: new THREE.Vector2(0.5, 0.5) };
  const uStrength = { value: -1 };
  const uUVOffset = { value: new THREE.Vector2(0, 0) };
  const uUVScale = { value: new THREE.Vector2(1, 1) };

  init();

  return { geometry, material, mesh, uCenter, uStrength, setMap, resize };

  function init() {
    geometry = new THREE.PlaneGeometry(1, 1);

    material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        map: uMap,
        center: uCenter,
        strength: uStrength,
        uvOffset: uUVOffset,
        uvScale: uUVScale,
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      // adapted from https://github.com/evanw/glfx.js
      fragmentShader: `
        uniform sampler2D map;
        uniform vec2 center;
        uniform float strength;
        uniform vec2 uvOffset;
        uniform vec2 uvScale;
        varying vec2 vUv;

        float random(vec3 scale, float seed) {
          return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
        }

        void main() {
          vec2 tUv = vUv * uvScale + uvOffset;
          if (abs(strength) > 0.001) {
            vec4 color = vec4(0.0);
            float total = 0.0;
            vec2 toCenter = center * uvScale + uvOffset - tUv;

            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);

            for (float t = 0.0; t <= 20.0; t++) {
              float percent = (t + offset) / 20.0;
              float weight = 2.0 * (percent - percent * percent);
              vec4 texel = texture2D(map, tUv + toCenter * percent * strength);

              texel.rgb *= texel.a;

              color += texel * weight;
              total += weight;
            }

            gl_FragColor = color / total;

            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;
            gl_FragColor.a = 1.0 - abs(strength);
          } else {
            gl_FragColor = texture2D(map, tUv);
          }
        }
      `,
    });

    mesh = new THREE.Mesh(geometry, material);
  }

  function setMap(value) {
    uMap.value = value;
    resize();
  }

  function resize() {
    if (!uMap.value || !uMap.value.image) return;
    mesh.scale.set(three.size.wWidth, three.size.wHeight, 1);

    const iWidth = uMap.value.image.width;
    const iHeight = uMap.value.image.height;
    const iRatio = iWidth / iHeight;

    uUVOffset.value.set(0, 0);
    uUVScale.value.set(1, 1);

    if (iRatio > three.size.ratio) {
      uUVScale.value.x = three.size.ratio / iRatio;
      uUVOffset.value.x = (1 - uUVScale.value.x) / 2;
    } else {
      uUVScale.value.y = iRatio / three.size.ratio;
      uUVOffset.value.y = (1 - uUVScale.value.y) / 2;
    }
  }
}

// --- Stimulus controller ---
export default class extends Controller {
  connect() {
    this.images = []; // [{preview, highres}]
    this.imageItems = []; // internal with .texture
    this.progress = 0;
    this.targetProgress = 0;
    this.isOpen = false;
    this.raf = null;
    // Bound once so requestAnimationFrame / transforms never lose controller `this`
    // (class-field arrows get rewritten to `_refN` by Million/Babel and can set raf on undefined).
    this._tick = this._tick.bind(this);

    this.parseImageData();

    if (!this.images.length) return;

    this.grid = this.element.querySelector(".images-grid");
    if (this.grid) {
      this.onGridClick = this.onGridClick.bind(this);
      this.onContextMenu = this.onContextMenu.bind(this);
      this.grid.addEventListener("click", this.onGridClick, true);
      this.grid.addEventListener("contextmenu", this.onContextMenu);
    }

    // Preload textures early for instant open
    this.loadAllTextures();
  }

  disconnect() {
    if (this.grid) {
      this.grid.removeEventListener("click", this.onGridClick, true);
      this.grid.removeEventListener("contextmenu", this.onContextMenu);
    }
    this.close({ removeOverlay: false });
    if (this.onFullscreenChange) {
      document.removeEventListener("fullscreenchange", this.onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", this.onFullscreenChange);
      this.onFullscreenChange = null;
    }
    if (this.lightboxEl && this.lightboxEl.parentNode) {
      this.lightboxEl.parentNode.removeChild(this.lightboxEl);
      this.lightboxEl = null;
      this.canvas = null;
    }
    if (this.three && typeof this.three.dispose === "function") {
      this.three.dispose();
    }
    this.three = null;
    this.image1 = null;
    this.image2 = null;
  }

  parseImageData() {
    // Primary source: server-rendered JSON blob
    const script = document.getElementById("lightbox-images-data");
    if (script && script.textContent) {
      try {
        const arr = JSON.parse(script.textContent);
        if (Array.isArray(arr) && arr.length) {
          this.images = arr.map((x) => ({ preview: x.preview, highres: x.highres }));
        }
      } catch (e) {
        // fall through to DOM scan
      }
    }

    // Fallback: derive from current DOM (preview src + link href)
    if (!this.images.length) {
      const cards = this.element.querySelectorAll(".tilt-card");
      this.images = Array.from(cards).map((card) => {
        const href = card.getAttribute("href") || "";
        const img = card.querySelector("img");
        const src = img ? img.getAttribute("src") || "" : "";
        return { preview: src, highres: href };
      });
    }

    this.imageItems = this.images.map((it) => ({
      preview: it.preview,
      highres: it.highres,
      texture: null,
    }));
  }

  loadAllTextures() {
    if (this._texturesPromise) return this._texturesPromise;

    const loader = new THREE.TextureLoader();
    this._texturesPromise = Promise.all(
      this.imageItems.map(
        (item) =>
          new Promise((resolve) => {
            if (!item.preview) {
              item.texture = null;
              resolve(null);
              return;
            }
            loader.load(
              item.preview,
              (tex) => {
                item.texture = tex;
                resolve(tex);
              },
              undefined,
              () => {
                item.texture = null;
                resolve(null);
              }
            );
          })
      )
    );
    return this._texturesPromise;
  }

  getTexture(idx) {
    const n = this.imageItems.length || 1;
    const i = ((idx % n) + n) % n;
    return this.imageItems[i] ? this.imageItems[i].texture : null;
  }

  onGridClick(e) {
    const card = e.target.closest(".tilt-card");
    if (!card || !this.grid || !this.grid.contains(card)) return;
    // Primary button (left click)
    if (e.button !== 0 && typeof e.button !== "undefined") return;
    e.preventDefault();
    const idx = this.getCardIndex(card);
    this.open(idx >= 0 ? idx : 0);
  }

  onContextMenu(e) {
    const card = e.target.closest(".tilt-card");
    if (!card || !this.grid || !this.grid.contains(card)) return;
    // Right click -> open the high-res link (as requested)
    e.preventDefault();
    const href = card.getAttribute("href");
    if (href) {
      window.location.href = href;
    }
  }

  getCardIndex(card) {
    if (card && card.dataset && card.dataset.index != null) {
      const n = parseInt(card.dataset.index, 10);
      if (!Number.isNaN(n)) return n;
    }
    if (!this.grid) return -1;
    const cards = Array.from(this.grid.querySelectorAll(".tilt-card"));
    return cards.indexOf(card);
  }

  open(startIndex = 0) {
    if (!this.images.length) return;

    if (!this.lightboxEl) this.createOverlay();
    this.lightboxEl.style.display = "block";
    document.body.style.overflow = "hidden";
    this.isOpen = true;

    const n = this.images.length;
    const start = ((startIndex % n) + n) % n;

    this.enterFullscreen();

    this.loadAllTextures().then(() => {
      if (!this.isOpen) return;
      this.initThreeScene();
      this.startAt(start);
      this.startLoop();
      this.addInputListeners();
    });
  }

  createOverlay() {
    const el = document.createElement("div");
    el.className = "lightbox-overlay";
    el.innerHTML = `<canvas class="lightbox-canvas" aria-hidden="true"></canvas>`;
    document.body.appendChild(el);
    this.lightboxEl = el;
    this.canvas = el.querySelector("canvas");

    // Browser exit-fullscreen (Esc in some browsers / UI chrome) should close the lightbox.
    this.onFullscreenChange = this.onFullscreenChange.bind(this);
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", this.onFullscreenChange);
  }

  enterFullscreen() {
    const el = this.lightboxEl;
    if (!el) return;
    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;
    if (!req) return;
    try {
      const result = req.call(el);
      if (result && typeof result.catch === "function") {
        result.catch(() => {
          // User gesture may have been spent or FS denied; overlay still works fixed fullscreen-style.
        });
      }
    } catch (_e) {
      // ignore
    }
  }

  exitFullscreen() {
    const doc = document;
    const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!fsEl) return;
    // Only exit if we own fullscreen (overlay is the fullscreen element).
    if (this.lightboxEl && fsEl !== this.lightboxEl) return;
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
    if (!exit) return;
    try {
      const result = exit.call(doc);
      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }
    } catch (_e) {
      // ignore
    }
  }

  onFullscreenChange() {
    if (!this.isOpen) return;
    const doc = document;
    const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
    // User left fullscreen via browser chrome / Esc — close the lightbox.
    if (!fsEl) {
      this.close({ skipFullscreenExit: true });
    }
  }

  close(opts = {}) {
    const { removeOverlay = false, skipFullscreenExit = false } = opts;
    if (!this.isOpen && !removeOverlay) {
      // still allow cleanup paths
    }
    this.isOpen = false;
    this.stopLoop();
    this.removeInputListeners();

    if (!skipFullscreenExit) this.exitFullscreen();

    if (this.lightboxEl) {
      this.lightboxEl.style.display = "none";
      if (removeOverlay && this.lightboxEl.parentNode) {
        this.lightboxEl.parentNode.removeChild(this.lightboxEl);
        this.lightboxEl = null;
        this.canvas = null;
      }
    }
    document.body.style.overflow = "";
  }

  initThreeScene() {
    if (this.three) return;

    this.three = createThree(this.canvas);
    this.scene = this.three.scene;

    this.image1 = ZoomBlurImage({ three: this.three });
    this.scene.add(this.image1.mesh);

    this.image2 = ZoomBlurImage({ three: this.three });
    this.scene.add(this.image2.mesh);

    this.three.onAfterResize(() => {
      this.image1?.resize();
      this.image2?.resize();
    });
  }

  startAt(index) {
    this.progress = index;
    this.targetProgress = index;

    const i = index % this.imageItems.length;
    const j = (i + 1) % this.imageItems.length;

    const tex1 = this.getTexture(i);
    const tex2 = this.getTexture(j);

    if (tex1 && this.image1) this.image1.setMap(tex1);
    if (tex2 && this.image2) this.image2.setMap(tex2);

    this.setImagesProgress(0);

    if (this.image1) {
      this.image1.uStrength.value = -2;
      gsap.fromTo(
        this.image1.uStrength,
        { value: -2 },
        { value: 0, duration: 1.6, ease: "power2.out" }
      );
    }
  }

  setTargetProgress(value) {
    this.targetProgress = value;
    if (this.targetProgress < 0) {
      const n = this.imageItems.length || 1;
      this.progress += n;
      this.targetProgress += n;
    }
  }

  navNext() {
    if (Number.isInteger(this.targetProgress)) {
      this.setTargetProgress(this.targetProgress + 1);
    } else {
      this.setTargetProgress(Math.ceil(this.targetProgress));
    }
  }

  navPrevious() {
    if (Number.isInteger(this.targetProgress)) {
      this.setTargetProgress(this.targetProgress - 1);
    } else {
      this.setTargetProgress(Math.floor(this.targetProgress));
    }
  }

  updateProgress() {
    const progress1 = lerp(this.progress, this.targetProgress, 0.05);
    const pdiff = progress1 - this.progress;
    if (pdiff === 0) return;

    const p0 = this.progress % 1;
    const p1 = progress1 % 1;

    if ((pdiff > 0 && p1 < p0) || (pdiff < 0 && p0 < p1)) {
      const n = this.imageItems.length || 1;
      const i = Math.floor(progress1) % n;
      const j = (i + 1) % n;
      const t1 = this.getTexture(i);
      const t2 = this.getTexture(j);
      if (t1) this.image1?.setMap(t1);
      if (t2) this.image2?.setMap(t2);
    }

    this.progress = progress1;
    this.setImagesProgress(this.progress % 1);
  }

  setImagesProgress(p) {
    if (this.image1) this.image1.uStrength.value = p;
    if (this.image2) this.image2.uStrength.value = -1 + p;
  }

  startLoop() {
    if (this.raf != null) return;
    this.raf = requestAnimationFrame(this._tick);
  }

  stopLoop() {
    if (this.raf != null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  // Regular prototype method + bind in connect (not a class field). Safer under Million/Babel.
  _tick() {
    this.raf = null;
    if (!this.isOpen || !this.three || !this.image1 || !this.image2) return;

    this.raf = requestAnimationFrame(this._tick);

    const { renderer, camera, mouse } = this.three;

    const center = mouse.clone().divideScalar(2).addScalar(0.5);
    lerpv2(this.image1.uCenter.value, center, 0.1);
    lerpv2(this.image2.uCenter.value, center, 0.1);

    this.updateProgress();

    renderer.render(this.scene, camera);
  }

  addInputListeners() {
    this.removeInputListeners();

    this.wheelHandler = (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      const step = e.deltaY > 0 ? 1 / 20 : -1 / 20;
      this.setTargetProgress(this.targetProgress + step);
    };
    window.addEventListener("wheel", this.wheelHandler, { passive: false });

    this.clickHandler = (e) => {
      if (!this.isOpen || !this.canvas) return;
      // Only navigate when clicking the lightbox surface (not page underneath).
      if (this.lightboxEl && !this.lightboxEl.contains(e.target)) return;
      const rect = this.canvas.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) this.navPrevious();
      else this.navNext();
    };
    window.addEventListener("click", this.clickHandler);

    this.keyHandler = (e) => {
      if (!this.isOpen) return;
      // Close only via Escape (no close button).
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        this.close();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") this.navPrevious();
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") this.navNext();
    };
    window.addEventListener("keydown", this.keyHandler);
  }

  removeInputListeners() {
    if (this.wheelHandler) {
      window.removeEventListener("wheel", this.wheelHandler, { passive: false });
    }
    if (this.clickHandler) {
      window.removeEventListener("click", this.clickHandler);
    }
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
    }
    this.wheelHandler = null;
    this.clickHandler = null;
    this.keyHandler = null;
  }
}
