import { Controller } from "@hotwired/stimulus"
import { useHotkeys } from "stimulus-use/hotkeys"

export default class extends Controller

  @targets = []

  connect: ->
    useHotkeys this,
      hotkeys:
        h: handler: @goHome
        p: handler: @goPosts
        i: handler: @goImages
        c: handler: @goContact
        e: handler: @goEcelecticonApps
        m: handler: @goMiscellaneous
        l: handler: @goLegal
      filter: (event) ->
        event.target.tagName not in ["INPUT", "TEXTAREA"] and not event.ctrlKey and not event.altKey

  goHome: (event) ->
    event.preventDefault()
    if globalThis.location.pathname isnt "/"
      globalThis.Turbo.visit "/"

  goPosts: (event) ->
    event.preventDefault()
    if globalThis.location.pathname isnt "/posts"
      globalThis.Turbo.visit "/posts"

  goImages: (event) ->
    event.preventDefault()
    if globalThis.location.pathname isnt "/images"
      globalThis.Turbo.visit "/images"

  goContact: (event) ->
    event.preventDefault()
    if globalThis.location.pathname isnt "/contact"
      globalThis.Turbo.visit "/contact"

  goEcelecticonApps: (event) ->
    event.preventDefault()
    if globalThis.location.pathname isnt "/eclecticonapps"
      globalThis.Turbo.visit "/eclecticonapps"

  goMiscellaneous: (event) ->
    event.preventDefault()
    if globalThis.location.pathname isnt "/miscellaneous"
      globalThis.Turbo.visit "/miscellaneous"

  goLegal: (event) ->
    event.preventDefault()
    if globalThis.location.pathname isnt "/legal"
      globalThis.Turbo.visit "/legal"