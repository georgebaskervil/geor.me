import { Controller } from "@hotwired/stimulus"

# Utility function for linear interpolation.
# @param {number} start - Starting value.
# @param {number} end - Ending value.
# @param {number} amt - Interpolation factor between 0 and 1.
# @returns {number} - Interpolated value.
lerp = (start, end, amt) ->
  (1 - amt) * start + amt * end

export default class extends Controller
  connect: ->
    @circle = @element.querySelector(".custom-cursor-circle")
    
    # Bind methods
    @handleMouseMove = @handleMouseMove.bind(@)
    @animateCursor = @animateCursor.bind(@)
    @handleMouseDown = @handleMouseDown.bind(@)
    @handleMouseUp = @handleMouseUp.bind(@)
    @saveCursorState = @saveCursorState.bind(@)
    @loadCursorState = @loadCursorState.bind(@)
    @finishInitialization = @finishInitialization.bind(@)
    
    # Track initialization state
    @isInitializing = true
    @hasUserMovedMouse = false

    # Add event listeners
    globalThis.addEventListener("mousemove", @handleMouseMove)
    globalThis.addEventListener("mousedown", @handleMouseDown)
    globalThis.addEventListener("mouseup", @handleMouseUp)
    document.addEventListener("turbo:before-visit", @saveCursorState)
    document.addEventListener("turbo:load", @loadCursorState)

    # Set default values (a reasonable but arbitrary position)
    @isShrinking = false
    @circleX = window.innerWidth / 2
    @circleY = window.innerHeight / 2
    @targetX = @circleX
    @targetY = @circleY
    
    # Apply no-transition class during initialization
    @circle?.classList.add("no-transition")
    
    # Load saved state (position and shrink state)
    @loadCursorState()
    
    # Start animation loop
    requestAnimationFrame(@animateCursor)

  disconnect: ->
    # Clear the timeout if it exists
    if @initTimeout
      clearTimeout(@initTimeout)
      @initTimeout = null
      
    # Save state before disconnecting
    @saveCursorState()
    
    # Remove event listeners
    globalThis.removeEventListener("mousemove", @handleMouseMove)
    globalThis.removeEventListener("mousedown", @handleMouseDown)
    globalThis.removeEventListener("mouseup", @handleMouseUp)
    document.removeEventListener("turbo:before-visit", @saveCursorState)
    document.removeEventListener("turbo:load", @loadCursorState)
    
  # Finish initialization immediately using current position data
  finishInitialization: ->
    if @isInitializing
      # Set position with no transition
      @circle?.style.setProperty("--translate-x", "#{@circleX}px")
      @circle?.style.setProperty("--translate-y", "#{@circleY}px")
      
      # Force browser to apply position before making visible
      window.getComputedStyle(@circle).opacity
      
      # Make visible with no transition
      @isInitializing = false
      @circle?.classList.remove("initializing")
      
      # Remove no-transition class immediately
      @circle?.classList.remove("no-transition")

  # Handles mouse movement by updating CSS variables for the circle's position.
  # @param {MouseEvent} event - The mousemove event object.
  handleMouseMove: (event) ->
    # Update the flag - user has moved mouse
    @hasUserMovedMouse = true
    
    prefersReducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
    if prefersReducedMotion
      @circle?.style.display = "none"
      return
    else
      @circle?.style.display = "block"

    # Get current mouse position
    x = event.clientX
    y = event.clientY
    
    # If initializing, immediately finish initialization at current position
    if @isInitializing
      @targetX = x
      @targetY = y
      @circleX = x
      @circleY = y
      
      # Ensure no transition for initial positioning
      @circle?.classList.add("no-transition")
      @finishInitialization()
    else
      # Normal behavior after initialization
      @targetX = x
      @targetY = y

  # Animates the circle to follow the target position with easing.
  animateCursor: ->
    # Only animate if we're not initializing and have a mouse position
    if !@isInitializing
      # Only animate when cursor is visible (after initialization)
      deltaX = @targetX - @circleX
      deltaY = @targetY - @circleY
      distance = Math.hypot(deltaX, deltaY)
      threshold = 0.1

      if distance > threshold
        # Enable will-change when actively animating
        @circle?.style.setProperty("will-change", "transform")
        
        easingAmount = 0.2
        @circleX = lerp(@circleX, @targetX, easingAmount)
        @circleY = lerp(@circleY, @targetY, easingAmount)
        
        # Update position
        @circle?.style.setProperty("--translate-x", "#{@circleX}px")
        @circle?.style.setProperty("--translate-y", "#{@circleY}px")
      else
        # Static position - remove will-change optimization
        @circle?.style.setProperty("will-change", "auto")
        @circleX = @targetX
        @circleY = @targetY
        
        # Update position
        @circle?.style.setProperty("--translate-x", "#{@circleX}px")
        @circle?.style.setProperty("--translate-y", "#{@circleY}px")

    requestAnimationFrame(@animateCursor)

  # Handles mouse down events by adding the shrink class to the circle.
  handleMouseDown: (event) ->
    if event.button is 0 and @circle and not @isShrinking
      @isShrinking = true
      @circle.classList.add("shrink")

  # Handles mouse up events by removing the shrink class from the circle.
  handleMouseUp: (event) ->
    if event.button is 0 and @circle and @isShrinking
      @circle.classList.remove("shrink")
      @isShrinking = false
      
  # Saves cursor state to localStorage when page changes
  saveCursorState: ->
    cursorState = {
      circleX: @circleX
      circleY: @circleY
      targetX: @targetX
      targetY: @targetY
      isShrinking: @isShrinking
      timestamp: Date.now()
    }
    localStorage.setItem('cursorState', JSON.stringify(cursorState))
    
  # Loads cursor state from localStorage
  loadCursorState: ->
    savedState = localStorage.getItem('cursorState')
    
    if savedState
      state = JSON.parse(savedState)
      
      # Get the timestamp of the saved state
      timestamp = state.timestamp || 0
      currentTime = Date.now()
      timeDifference = currentTime - timestamp
      
      # If the saved state is recent (less than 2 seconds old), use it
      # This likely means we're navigating between pages on the site
      if timeDifference < 2000
        # Use the saved position
        @circleX = state.circleX
        @circleY = state.circleY
        @targetX = state.targetX
        @targetY = state.targetY
        @isShrinking = state.isShrinking
        
        # Apply position immediately
        @circle?.style.setProperty("--translate-x", "#{@circleX}px")
        @circle?.style.setProperty("--translate-y", "#{@circleY}px")
        
        # Make cursor visible immediately for smooth page transitions
        @finishInitialization()
      else
        # State is old, just load the shrink state and wait for mouse move
        @isShrinking = state.isShrinking
    
    # Apply shrinking state if needed
    if @isShrinking
      @circle?.classList.add("shrink")
    else
      @circle?.classList.remove("shrink")