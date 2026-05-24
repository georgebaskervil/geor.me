import { Controller } from "@hotwired/stimulus"
import Lenis from "lenis"

export default class extends Controller
  connect: ->
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

    @lenis = new Lenis
      wrapper: wrapper
      autoRaf: true
      duration: 1.2
      easing: (t) -> Math.min(1, 1.001 - Math.pow(2, -10 * t))
      orientation: 'vertical'
      gestureOrientation: 'vertical'
      smoothWheel: true
      syncTouch: false
      touchMultiplier: 2

  _destroy: ->
    if @lenis
      @lenis.destroy()
      @lenis = null
