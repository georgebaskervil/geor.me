import { Controller } from "@hotwired/stimulus"

export default class extends Controller
  @targets = ["editR", "sliderR", "editG", "sliderG", "editB", "sliderB", "squareBox", "inverseBox"]

  STORAGE_KEY = 'coloursquare-state'

  connect: ->
    @loadStateFromStorage()
    @updateColor()
    
    # Add event handlers for saving state
    @saveHandler = @saveStateToStorage.bind(this)
    
    # Turbo-specific events
    document.addEventListener('turbo:before-visit', @saveHandler)
    document.addEventListener('turbo:before-cache', @saveHandler)
    
    # Standard browser events
    window.addEventListener('beforeunload', @saveHandler)
    window.addEventListener('pagehide', @saveHandler)
    document.addEventListener('visibilitychange', @handleVisibilityChange.bind(this))

  disconnect: ->
    # Clean up all event listeners
    document.removeEventListener('turbo:before-visit', @saveHandler)
    document.removeEventListener('turbo:before-cache', @saveHandler)
    window.removeEventListener('beforeunload', @saveHandler)
    window.removeEventListener('pagehide', @saveHandler)
    document.removeEventListener('visibilitychange', @handleVisibilityChange.bind(this))
    
  handleVisibilityChange: ->
    if document.visibilityState == 'hidden'
      @saveStateToStorage()
      
  saveStateToStorage: ->
    state = {
      r: @editRTarget.value,
      g: @editGTarget.value,
      b: @editBTarget.value
    }
    try
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    catch e
      console.error("Failed to save coloursquare state to localStorage", e)

  loadStateFromStorage: ->
    try
      savedState = localStorage.getItem(STORAGE_KEY)
      if savedState
        state = JSON.parse(savedState)
        @setStateValues(state)
    catch e
      console.error("Failed to load coloursquare state from localStorage", e)

  setStateValues: (state) ->
    if state.r?
      @editRTarget.value = state.r
      @sliderRTarget.value = state.r
      
    if state.g?
      @editGTarget.value = state.g
      @sliderGTarget.value = state.g
      
    if state.b?
      @editBTarget.value = state.b
      @sliderBTarget.value = state.b

  updateFromEdit: (event) ->
    @clampInput(event.target)
    @syncSlidersAndColor()
    @saveStateToStorage()

  updateFromSlider: ->
    @syncEdits()
    @updateColor()
    @saveStateToStorage()

  syncEdits: ->
    @editRTarget.value = @sliderRTarget.value
    @editGTarget.value = @sliderGTarget.value
    @editBTarget.value = @sliderBTarget.value

  syncSliders: ->
    @sliderRTarget.value = @editRTarget.value
    @sliderGTarget.value = @editGTarget.value
    @sliderBTarget.value = @editBTarget.value

  syncSlidersAndColor: ->
    @syncSliders()
    @updateColor()

  clampInput: (el) ->
    val = parseInt(el.value, 10)
    val = isNaN(val) ? 0 : val
    el.value = Math.min(255, Math.max(0, val))

  updateColor: ->
    r = parseInt(@editRTarget.value) || 0
    g = parseInt(@editGTarget.value) || 0
    b = parseInt(@editBTarget.value) || 0
    color = "rgb(#{r}, #{g}, #{b})"
    invColor = "rgb(#{255 - r}, #{255 - g}, #{255 - b})"
    @squareBoxTarget.style.backgroundColor = color
    @inverseBoxTarget.style.backgroundColor = invColor