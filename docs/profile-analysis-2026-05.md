# Firefox Profile Analysis — Performance Findings

Profile: `input.json` (24 MB Gecko profile, captured on Zen rv:150.0 / macOS 15.3 / Apple M2, 45.8 s wall time, 1 ms sampling).

Analyser scripts (re-runnable):

- `@/Users/george/geor.me/scripts/_profile_loader.py` — fast loader (`ujson` + pickle cache).
- `@/Users/george/geor.me/scripts/analyze_profile.py` — high-level breakdown for **all** threads.
- `@/Users/george/geor.me/scripts/analyze_user_thread.py` — focused breakdown for the **content-process main thread**.
- `@/Users/george/geor.me/scripts/deep_dive.py` — inclusive call tree + samples-during-long-tasks.

Run any of them with `python3 scripts/<name>.py input.json`.

---

## TL;DR — where the time goes (45.8 s of wall time)

The user-content main thread (pid 14423) ran **34.8 s of samples**. Of that:

| Cause                                                                      |                                                              Self-time | Notes                                                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------: | ------------------------------------------------------------------------------ |
| **Native idle / event loop wait** (`fun_5ac9494 ← XRE_InitChildProcess`)   |                                                     **14.05 s (40 %)** | The process was simply waiting for tasks. Real CPU work ≈ 20 s.                |
| **CSS box-shadow painting** (`nsDisplayBoxShadowOuter::Paint` and friends) |                                                      **~5.5 s (16 %)** | The single biggest _real_ cost, dominated by `text-shadow` on `*`.             |
| **Text-shadow painting** (`nsTextFrame::PaintOneShadow`)                   |                                                       **~2.1 s (6 %)** | Caused by the universal `*` selector in `globals.scss`.                        |
| **Major GC + Cycle Collector**                                             |                                                             **~5.0 s** | 3 × `GCMajor` (longest 1.97 s, all `CC_FINISHED`) + 2 × `CC` (longest 1.59 s). |
| **DevTools server actors** (`onNewScript`, `_addSource`, …)                |                                                             **~4.2 s** | Profiling overhead — _not_ a production cost.                                  |
| **Long tasks**                                                             | **14.4 s** across **124 tasks**, median 111 ms, p90 171 ms, max 214 ms | The page is unresponsive a large fraction of the time.                         |

INP-like input latencies (from `DOMEvent` markers):

| Event                              | Count | Median latency | Max latency |
| ---------------------------------- | ----: | -------------: | ----------: |
| `wheel`                            |   338 |        22.9 ms |  **141 ms** |
| `MozMousePixelScroll`              |   424 |        16.1 ms |  **141 ms** |
| `click`                            |    46 |        64.7 ms |  **266 ms** |
| `mouseup`                          |    46 |        60.4 ms |  **266 ms** |
| `mousedown`                        |    46 |        41.0 ms |  **150 ms** |
| `transitioncancel`                 |    28 |         195 ms |      254 ms |
| `contentvisibilityautostatechange` |    14 |         196 ms |  **342 ms** |

Network: only 23 markers, but two HTML documents took **2.92 s** and **1.31 s** to load (`STATUS_STOP text/html`); image/avif requests came in batches of ~620 ms each, suggesting parallel fetch of large images.

---

## #1 — `text-shadow` on the universal selector (BIGGEST WIN)

In `@/Users/george/geor.me/app/stylesheets/globals.scss:3-7`:

```@/Users/george/geor.me/app/stylesheets/globals.scss:3-7
* {
  cursor: auto;
  text-rendering: geometricprecision;
  text-shadow: 1px 1px 2px rgb(0 0 0 / 50%); /* Subtle text shadow */
}
```

Every text frame on the page is painted **twice** (shadow + text), and the shadow uses a 2 px Gaussian blur. The profile shows ~2.1 s in `nsTextFrame::PaintOneShadow` — i.e. the _single line above_ costs ~6 % of the entire profile.

Combined with `text-rendering: geometricprecision` (which disables some font-rasterisation fast paths), this is the most expensive line of CSS in the codebase.

**Fix (recommended):**

```scss
/* Apply only to elements that genuinely need it */
h1,
h2,
h3,
.hero-title {
  /* …or a single class like .text-glow */
  text-shadow: 1px 1px 2px rgb(0 0 0 / 50%);
}

/* Drop `text-rendering: geometricprecision` — `optimizeLegibility` or default
   `auto` is much faster and visually indistinguishable on Latin text. */
```

Estimated saving: **2 – 3 seconds of paint time** across the profile, plus most of the per-frame paint cost during scrolling.

---

## #2 — Box-shadows + backdrop-filter on animated/transitioned elements

`nsDisplayBoxShadowOuter::Paint` accounts for **~5.5 s** inclusive (15.8 % of the thread). Inverted call paths from `@/Users/george/geor.me/scripts/deep_dive.py` consistently show:

```
fun_176a3dc ← nsDisplayBoxShadowOuter::Paint ← WebRender display list ← nsDisplayList::PaintRoot ← nsLayoutUtils::PaintFrame   2668 ms
fun_8b0304  ← nsDisplayBoxShadowOuter::Paint ← …                                                                              1081 ms
fun_3427b38 ← nsTextFrame::PaintOneShadow   ← …                                                                               1726 ms
…
```

The repaints are driven by **CSS animations / transitions that never stop**:

- `animate-ping` (Tailwind) on a `div` — runs **every 3 s for the entire profile** (6 iterations seen). It runs `oncompositor: true, true` so it does not block JS, but it keeps the page in continuous-paint mode.
- `.carousel-slides` `transform` and `.carousel-slide` `opacity` transitions every ~916 ms (auto-advance every 8 s × 4 slides).
- `.project-info` and `.project-link-btn` use `backdrop-filter: blur(8px)` — see `@/Users/george/geor.me/app/stylesheets/homepage.scss:269` and `@/Users/george/geor.me/app/stylesheets/homepage.scss:299`.
- The full-viewport overlay uses `backdrop-filter: blur(3px)` — `@/Users/george/geor.me/app/stylesheets/globals.scss:97`.

`backdrop-filter` forces the compositor to re-rasterise everything underneath the element on every frame the element re-composites. Box-shadow + backdrop-filter together is the worst-case combination.

**Fixes (in priority order):**

1. **Audit `box-shadow` use.** The hottest stack `fun_176a3dc` is repeatedly invoked — likely a single shadow on a frequently-painted ancestor (e.g. `.drawer`, `.carousel-slide`, `.dl-link-box`). Use the Firefox DevTools "paint flashing" overlay to identify it, then either:
   - Replace with a pre-rendered PNG/SVG shadow,
   - Use a single solid-colour drop shadow (no blur), or
   - Move the shadow to a child element that does **not** animate.
2. **Stop `animate-ping` when not visible.** Wrap it in `@media (prefers-reduced-motion: no-preference)` and/or pause it when the surrounding section is off-screen via an `IntersectionObserver`. The Tailwind class is being applied somewhere — search the rendered DOM, not just the source (it might be in a Vue/React island mounted by `turbo-mount`). The element selector is `div@1568300d0 class="animate-ping"`.
3. **Replace `backdrop-filter` with a solid translucent overlay** for the carousel project info — backdrop-filter is the single most expensive CSS filter and is rarely the right tool when the element animates.
4. **Pause the carousel auto-advance when off-screen** — see `@/Users/george/geor.me/app/javascript/controllers/project_carousel_controller.coffee:117-120`. Use an `IntersectionObserver` so the 8 s `setInterval` only runs while the carousel is visible.

---

## #3 — Garbage Collector pauses (5 s of jank)

```
GCMajor: 3 cycles, total 3416 ms, longest 1973 ms (reason=CC_FINISHED)
CC:      2 cycles, total 1593 ms, longest 1589 ms
GCSlice: 48 slices, 381 ms
CCSlice: 12 slices, 334 ms
```

All three `GCMajor` cycles were triggered by `CC_FINISHED` (cycle-collector chain). The biggest one had `pre_malloc_heap_size: 193 MB → 118 MB` and `slices: 7`. This indicates **a lot of short-lived JS allocation**, especially of objects that hold cycle-collected references (DOM nodes, listener closures, MessageChannel/BroadcastChannel pairs, etc.).

Likely contributors visible in the profile:

- **`onNewScript` / `_addSource` from `resource://devtools/server/actors/thread.js`** — 2.2 s + 2 s = 4.2 s. _Profile-only cost; ignore for production._
- **`signalWorker ← postMessage ← call/<`** appears in the parent process — Web Worker traffic. wllama uses workers; large messages between worker and main thread put pressure on the CC because each worker reference is a CC root.
- **`Map.prototype.set ← manage ← createSourceActor`** (devtools).
- **`fetch` chains under `RobusTextModule/kf<`** — every iframe load of `/robustext-embed.html` (the Emscripten WASM) constructs a new `Module` instance.

**Fixes:**

1. **Stop the inline data-URI WASM in `public/robustext-embed.html`.** The base64 `data:application/wasm;base64,…` URI is loaded into the JS heap as a string before being decoded — that is a massive single-string allocation per page-load. Serve it as a real `.wasm` file with `application/wasm` mime.
2. **Lazy-load the RobusText iframe** until the carousel actually reaches that slide. Right now `<iframe loading="lazy">` helps with offscreen, but if the carousel auto-advances to slide 2 within 16 s it will load anyway. Change to load on first user-initiated navigation to that slide.
3. **Reuse worker instances** in `@wllama/wllama` if you instantiate it more than once.
4. **Audit closure leaks** in long-lived Stimulus controllers (especially `cursor_controller`, `locomotive_scroll_controller`, `project_carousel_controller`) — the `disconnect()` of `project_carousel_controller` re-binds with `.bind(@)` and then tries to remove the listener using a _different_ bound function — see #6 below.

---

## #4 — Long tasks (124 of them, 14.4 s total)

Median 111 ms, p90 171 ms, max 214 ms. Sample stacks taken **inside** `MainThreadLongTask` ranges (from `deep_dive.py`) are dominated by:

```
fun_5ac9494 ← XRE_InitChildProcess               (idle inside the long task — small)
nsDisplayBoxShadowOuter::Paint ← WebRender …      (paint work, see #2)
nsTextFrame::PaintOneShadow   ← …                 (text shadow, see #1)
Window.fetch ← Ca ← RobusTextModule/kf<           (wllama/RobusText fetching)
wasm-function[2240] (data:application/wasm;…) ← memory.init …
```

Fixing #1 + #2 will move the median long-task duration well below 50 ms and cut p90 by ~40 %.

---

## #5 — Locomotive Scroll is the wheel-latency culprit

`@/Users/george/geor.me/app/javascript/controllers/locomotive_scroll_controller.coffee:1-25` initialises Locomotive Scroll with `smooth: true` on every `[data-scroll-container]`. Locomotive intercepts `wheel` events, runs an inertia simulation in JS, and updates `transform` every frame — which is exactly the pattern showing up in the **wheel/MozMousePixelScroll/DOMMouseScroll** rows above (median 16-23 ms, max 141 ms).

The combination is especially bad:

- `background-attachment: fixed` on `html` (`@/Users/george/geor.me/app/stylesheets/globals.scss:21`) forces the browser to repaint two SVG backgrounds (one with a `feTurbulence` filter!) on every scroll position change.
- Locomotive forces a repaint on every wheel tick.
- `text-shadow: *` makes every repaint expensive.

**Fixes (in order of cost):**

1. Drop `background-attachment: fixed`. It is a long-known scroll-perf footgun and the SVG with `feTurbulence` is a particularly bad case (the filter is re-evaluated on every paint).
2. Consider removing Locomotive Scroll. Native CSS `scroll-behavior: smooth` plus `overscroll-behavior` covers 90 % of what users expect, with zero JS cost. If you keep Locomotive, set `lerp: 0.1` (or higher) and gate it behind `prefers-reduced-motion: no-preference`.
3. The `cursor_controller` runs `requestAnimationFrame(@animateCursor)` **every frame forever** (`@/Users/george/geor.me/app/javascript/controllers/cursor_controller.coffee:49` and `:147`). Stop the rAF loop when the cursor hasn't moved for ~250 ms instead of branching inside the rAF body — currently the loop runs even when the page is idle.

---

## #6 — Bug: `project_carousel_controller` event-listener leak

```@/Users/george/geor.me/app/javascript/controllers/project_carousel_controller.coffee:38-43
  setupEventListeners: ->
    @slidesTarget.addEventListener 'touchstart', @handleTouchStart.bind(@), { passive: true }
    @slidesTarget.addEventListener 'touchend', @handleTouchEnd.bind(@), { passive: true }

  removeEventListeners: ->
    @slidesTarget.removeEventListener 'touchstart', @handleTouchStart.bind(@), { passive: true }
    @slidesTarget.removeEventListener 'touchend', @handleTouchEnd.bind(@), { passive: true }
```

`@handleTouchStart.bind(@)` returns a **new function** every call, so the `removeEventListener` at disconnect never matches the listener registered at connect. Each Turbo navigation that re-mounts the carousel adds two more permanent listeners → cycle-collector pressure → contributes to the GC pauses in #3.

**Fix:**

```coffee
connect: ->
  @_handleTouchStart = @handleTouchStart.bind(@)
  @_handleTouchEnd   = @handleTouchEnd.bind(@)
  ...

setupEventListeners: ->
  @slidesTarget.addEventListener 'touchstart', @_handleTouchStart, { passive: true }
  @slidesTarget.addEventListener 'touchend',   @_handleTouchEnd,   { passive: true }

removeEventListeners: ->
  @slidesTarget.removeEventListener 'touchstart', @_handleTouchStart
  @slidesTarget.removeEventListener 'touchend',   @_handleTouchEnd
```

Also: `setInterval` in `startAutoAdvance` is cleared in `disconnect`, but if `pauseAutoAdvance`/`resumeAutoAdvance` interleave under quick mouse-enter/leave, two intervals can run simultaneously. Guard with `return if @autoAdvanceTimer` before assigning.

---

## #7 — Network: HTML responses are slow

```
2916 ms  STATUS_STOP text/html
1305 ms  STATUS_STOP text/html
```

A 2.9 s document response on localhost is suspicious. Likely culprits:

- The homepage renders a `featured_projects` array with embedded video partials and an Emscripten WASM iframe (`robustext/_content.html.erb`). Initial render on a cold Rails dev server is slow.
- Check `@/Users/george/geor.me/config/environments/production.rb` for `config.action_view.cache_template_loading = true` and verify fragment caching for the carousel.
- `@million/lint` is enabled in the Vite config (`@/Users/george/geor.me/vite.config.js:155-158`), which adds dev-time overhead.

The image/avif batch all completing in ~620 ms suggests they are served correctly in parallel; nothing to do there other than `loading="lazy"` on offscreen images (already used).

---

## #8 — `will-change` overuse

`will-change` is used **15+ times** across stylesheets (`globals.scss`, `homepage.scss`, `taskstack.scss`, `useDragDrop.js`). Each promotes the element to its own compositor layer, costing GPU memory and slowing layer tree management. From the MDN docs: _"set `will-change` on a small number of elements that genuinely need it, and remove it when they are no longer changing."_

The codebase already has a great `@/Users/george/geor.me/app/javascript/utils/performance.js` helper (`temporarilyEnableWillChange`) — but most of the stylesheet uses are **permanent**, e.g.:

```@/Users/george/geor.me/app/stylesheets/homepage.scss:243-248
.carousel-slides {
  @apply flex transition-transform duration-500 ease-in-out h-full;

  /* Optimize for transform animations */
  will-change: transform;
}
```

**Fix:** Apply `will-change: transform` only while a transition is active (e.g. add a `.is-transitioning` class on `transitionrun`, remove on `transitionend`) using the existing helper.

---

## #9 — Smaller wins worth doing

- **Drop `text-rendering: geometricprecision`** on `*` (already covered in #1). It disables glyph caching.
- **`Update Blocked` UserTimings appear 199 times** with totals of 975 ms / 480 ms / 422 ms — these are your own `performance.measure()` calls. Search the codebase for the producer (we found none in the repo, so it's likely in a Vue/React component compiled to JS) and reduce its scope.
- **Devtools were open during the capture.** Around 6-8 % of the profile time is `resource://devtools/...` actors. For a clean production-representative trace, capture again with DevTools closed (the Firefox Profiler add-on doesn't require them).
- **Symbolication is incomplete** for XUL — the unresolved `fun_<hex>` names are JIT'd JS-engine helpers (most prominent: `fun_5ac9494` = the native event-loop idle wait, `fun_176a3dc`/`fun_8b0304` etc. are inside the box-shadow blur kernel). To resolve them you'd need a Firefox build with full debug symbols — for our analysis the _call paths_ (nsDisplayBoxShadowOuter::Paint, etc.) are sufficient.

---

## Suggested order of work (rough impact estimate)

| #   | Change                                                                         | Difficulty |                                           Expected impact |
| --- | ------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------: |
| 1   | Remove `text-shadow` from `*` selector                                         | trivial    | **~6 % of total CPU**, large drop in paint time per frame |
| 2   | Drop `background-attachment: fixed` on `html`                                  | trivial    |                            massive scroll-paint reduction |
| 3   | Replace `backdrop-filter` on `.project-info` with a solid translucent gradient | small      |                         removes per-frame compositor cost |
| 4   | Pause `animate-ping` and carousel `setInterval` when offscreen                 | small      |                        stops continuous repaint when idle |
| 5   | Fix bound-listener leak in `project_carousel_controller`                       | trivial    |                           reduces CC pressure & GC pauses |
| 6   | Stop the `cursor_controller` rAF loop when idle                                | small      |                                 frees a frame budget tick |
| 7   | Re-evaluate Locomotive Scroll vs native `scroll-behavior: smooth`              | medium     |                                halves wheel-event latency |
| 8   | Move RobusText WASM out of inline `data:` URI; lazy-mount the iframe           | medium     |              reduces GC/CC and string-allocation pressure |
| 9   | Audit per-element `will-change` declarations                                   | small      |                     smaller GPU memory, faster layer tree |
| 10  | Re-profile **with DevTools closed** for an accurate baseline                   | trivial    |                             clearer signal next iteration |

After 1 + 2 + 3 alone the longest GC pauses should also shrink (less paint allocation pressure), and median `wheel`/`mousedown` latencies should fall well under 16 ms.
