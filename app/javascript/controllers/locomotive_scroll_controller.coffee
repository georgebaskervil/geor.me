import { Controller } from "@hotwired/stimulus"
import LocomotiveScroll from "locomotive-scroll"

export default class extends Controller
  connect: ->
    @scrollInstances = []
    document.querySelectorAll('[data-scroll-container]').forEach (el) =>
      try
        scroll = new LocomotiveScroll
          el: el
          smooth: true
          smartphone:
            smooth: true
          tablet:
            smooth: true
        @scrollInstances.push(scroll)
      catch error
        console.error "Failed to initialize Locomotive Scroll for", el, ":", error

  disconnect: ->
    @scrollInstances.forEach (scroll) -> scroll.destroy()
    @scrollInstances = []

  resume: ->
    @scrollInstances.forEach (scroll) -> scroll.start()

  destroyIfNeeded: (event) ->
    if @scrollInstances.length > 0 and (!event or event.target.controller isnt "Turbo.FrameController")
      @scrollInstances.forEach (scroll) -> scroll.destroy()
      @scrollInstances = []

  handleTurboLoad: ->
    if @scrollInstances.length > 0
      @scrollInstances.forEach (scroll) -> scroll.start()
    else
      @scrollInstances = []
      document.querySelectorAll('[data-scroll-container]').forEach (el) =>
        try
          scroll = new LocomotiveScroll
            el: el
            gestureDirection: vertical
            smooth: true
            tablet:
              smooth: false
            smartphone:
              smooth: false
            resetNativeScroll: true
          @scrollInstances.push(scroll)
        catch error
          console.error "Failed to initialize Locomotive Scroll for", el, ":", error

  handleTurboRender: ->
    if @scrollInstances.length is 0
      document.querySelectorAll('[data-scroll-container]').forEach (el) =>
        try
          scroll = new LocomotiveScroll
            el: el
            smooth: true
            smartphone:
              smooth: true
            tablet:
              smooth: true
          @scrollInstances.push(scroll)
        catch error
          console.error "Failed to initialize Locomotive Scroll for", el, ":", error

  setupEventListeners: ->
    document.addEventListener "turbo:load", @handleTurboLoad
    document.addEventListener "turbo:before-cache", @destroyIfNeeded
    document.addEventListener "turbo:before-render", @destroyIfNeeded
    document.addEventListener "turbo:render", @handleTurboRender
    window.addEventListener "beforeunload", @destroy

  removeEventListeners: ->
    document.removeEventListener "turbo:load", @handleTurboLoad
    document.removeEventListener "turbo:before-cache", @destroyIfNeeded
    document.removeEventListener "turbo:before-render", @destroyIfNeeded
    document.removeEventListener "turbo:render", @handleTurboRender
    window.removeEventListener "beforeunload", @destroy
