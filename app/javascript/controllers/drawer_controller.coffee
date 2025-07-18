import { Controller } from "@hotwired/stimulus"
import { useHotkeys } from "stimulus-use/hotkeys"

export default class extends Controller
  @targets: ["icon", "content"]

  connect: ->
    useHotkeys @,
      hotkeys:
        d:
          handler: @singleKeyHandler.bind(@)
      filter: @filter

  singleKeyHandler: ->
    @element.querySelector(".drawer").classList.toggle("drawer-expanded")
    @iconTarget.classList.toggle("rotated")
    @contentTarget.classList.toggle("visible")

  toggle: ->
    @element.querySelector(".drawer").classList.toggle("drawer-expanded")
    @iconTarget.classList.toggle("rotated")
    @contentTarget.classList.toggle("visible")
