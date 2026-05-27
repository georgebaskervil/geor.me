import { Controller } from "@hotwired/stimulus"
import Lenis from "lenis"

export default class extends Controller
  connect: ->
    # Block extension-injected Lenis (checks window._lenisInitialised before loading CDN).
    window._lenisInitialised = true
    @_init()

    @_onBeforeCache = => @_destroy()
    @_onBeforeRender = => @_destroy()
    @_onLoad = => @_init() unless @lenis

    document.addEventListener "turbo:before-cache", @_onBeforeCache
    document.addEventListener "turbo:before-render", @_onBeforeRender
    document.addEventListener "turbo:load", @_onLoad

  disconnect: ->
    @_destroy()
    document.removeEventListener "turbo:before-cache", @_onBeforeCache
    document.removeEventListener "turbo:before-render", @_onBeforeRender
    document.removeEventListener "turbo:load", @_onLoad

  _init: ->
    wrapper = document.getElementById("crt-content")
    return unless wrapper
    return if @lenis

    @lenis = new Lenis
      wrapper: wrapper
      content: wrapper
      autoRaf: true
      duration: 1.2
      easing: (t) -> Math.min(1, 1.001 - Math.pow(2, -10 * t))
      orientation: "vertical"
      gestureOrientation: "vertical"
      smoothWheel: true
      smoothTouch: false
      touchMultiplier: 2

    window.lenis = @lenis

  _destroy: ->
    if @lenis
      @lenis.destroy()
      @lenis = null
      window.lenis = null
