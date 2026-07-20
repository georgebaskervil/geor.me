import { Controller } from "@hotwired/stimulus"
import Lenis from "lenis"

VELOCITY_EPSILON = 0.01
SCROLL_EPSILON = 0.5

export default class extends Controller
  connect: ->
    window._lenisInitialised = true
    @_init()
    @_wrapperEl = @_wrapper()

    @_onBeforeCache = => @_destroy()
    @_onLoad = =>
      @_init() unless @lenis
      @lenis?.resize()
      @_updateFooterVisibility()
      @_kickLenisRaf()

    @_onResize = =>
      @lenis?.resize()
      @_updateFooterVisibility()
      @_kickLenisRaf()
    @_onLenisScroll = =>
      @_updateFooterVisibility()
      @_kickLenisRaf()
    @_onWrapperScroll = => @_updateFooterVisibility()
    @_onWrapperWheel = => @_kickLenisRaf()

    document.addEventListener "turbo:before-cache", @_onBeforeCache
    document.addEventListener "turbo:load", @_onLoad
    window.addEventListener "resize", @_onResize
    @_wrapperEl?.addEventListener "scroll", @_onWrapperScroll, { passive: true }
    @_wrapperEl?.addEventListener "wheel", @_onWrapperWheel, { passive: true }
    @_wrapperEl?.addEventListener "touchstart", @_onWrapperWheel, { passive: true }

  disconnect: ->
    @_destroy()
    document.removeEventListener "turbo:before-cache", @_onBeforeCache
    document.removeEventListener "turbo:load", @_onLoad
    window.removeEventListener "resize", @_onResize
    @_wrapperEl?.removeEventListener "scroll", @_onWrapperScroll
    @_wrapperEl?.removeEventListener "wheel", @_onWrapperWheel
    @_wrapperEl?.removeEventListener "touchstart", @_onWrapperWheel

  _wrapper: ->
    document.getElementById("crt-content")

  _init: ->
    wrapper = @_wrapper()
    content = @element
    return unless wrapper? and content?
    return if @lenis

    # Capability gate: native overflow scroll when Lenis is unsupported / disabled.
    if globalThis.__georCapabilities?.lenis is false
      window._lenisInitialised = true
      wrapper.style.overflow = "auto"
      wrapper.style.overflowX = "hidden"
      document.documentElement.classList.add("geor-no-lenis")
      return

    savedScroll = wrapper.scrollTop or 0

    @lenis = new Lenis
      wrapper: wrapper
      content: content
      eventsTarget: wrapper
      autoRaf: false
      lerp: 0.15
      easing: (t) -> Math.min(1, 1.001 - Math.pow(2, -10 * t))
      orientation: "vertical"
      gestureOrientation: "vertical"
      smoothWheel: true
      syncTouch: false
      wheelMultiplier: 1
      allowNestedScroll: true
      prevent: (node) => @_preventSmoothScroll(node)

    window.lenis = @lenis
    @lenis.on "scroll", @_onLenisScroll
    @_updateFooterVisibility()
    @lenis.resize()
    @lenis.scrollTo(savedScroll, { immediate: true }) if savedScroll > 0
    @_kickLenisRaf()

  _kickLenisRaf: ->
    return if @lenisRafId?
    @lenisRafId = requestAnimationFrame @_runLenisRaf

  _stopLenisRaf: ->
    return unless @lenisRafId?
    cancelAnimationFrame @lenisRafId
    @lenisRafId = null

  _runLenisRaf: (time) =>
    @lenisRafId = null
    return unless @lenis?
    @lenis.raf(time)
    @_kickLenisRaf() if @_lenisNeedsRaf()

  _lenisNeedsRaf: ->
    return false unless @lenis?
    return true if @lenis.animate?.isRunning
    return true if @lenis.isScrolling is "smooth"
    return true if Math.abs(@lenis.velocity) > VELOCITY_EPSILON
    return true if Math.abs(@lenis.targetScroll - @lenis.animatedScroll) > SCROLL_EPSILON
    false

  _preventSmoothScroll: (node) ->
    return true if node.closest?("[data-lenis-prevent]")
    return true if node.closest?(".drawer-content-container")
    return true if node.closest?(".floating-window")
    false

  _destroy: ->
    @_stopLenisRaf()
    if @lenis
      @lenis.off?("scroll", @_onLenisScroll)
      @lenis.destroy()
      @lenis = null
      window.lenis = null
    document.documentElement.classList.remove("lenis-at-end")

  _updateFooterVisibility: ->
    wrapper = @_wrapperEl or @_wrapper()
    return unless wrapper?

    # Direct wrapper measurement is more reliable than Lenis progress in this SVG/foreignObject layout.
    distanceFromBottom = wrapper.scrollHeight - (wrapper.scrollTop + wrapper.clientHeight)
    nearBottom = distanceFromBottom <= 24

    if nearBottom
      document.documentElement.classList.add("lenis-at-end")
    else
      document.documentElement.classList.remove("lenis-at-end")
