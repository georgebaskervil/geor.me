import { Controller } from "@hotwired/stimulus"

export default class extends Controller
  STORAGE_KEY = 'oneko-state'

  connect: =>
    @running = false
    @requestId = undefined
    @nekoEl = @element
    
    # Bind methods for event listeners
    @saveNekoState = @saveNekoState.bind(@)
    @loadNekoState = @loadNekoState.bind(@)
    @handleVisibilityChange = @handleVisibilityChange.bind(@)
    
    # Add event listeners for state preservation
    document.addEventListener('turbo:before-visit', @saveNekoState)
    document.addEventListener('turbo:load', @loadNekoState)
    window.addEventListener('beforeunload', @saveNekoState)
    window.addEventListener('pagehide', @saveNekoState)
    document.addEventListener('visibilitychange', @handleVisibilityChange)
    
    # Load saved state first
    @loadNekoState()
    
    # Start oneko automatically (not just in distraction mode)
    @startNeko()

  disconnect: =>
    # Save state before disconnecting
    @saveNekoState()
    
    # Clean up event listeners
    document.removeEventListener('turbo:before-visit', @saveNekoState)
    document.removeEventListener('turbo:load', @loadNekoState)
    window.removeEventListener('beforeunload', @saveNekoState)
    window.removeEventListener('pagehide', @saveNekoState)
    document.removeEventListener('visibilitychange', @handleVisibilityChange)
    
    # Remove click event listener if element exists
    @nekoEl?.removeEventListener('click', @explodeHearts)
    
    # Cancel animation
    cancelAnimationFrame @requestId if @requestId

  startNeko: =>
    return if @running
    isReducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)")?.matches
    return if isReducedMotion
    @running = true
    @nekoEl.classList.remove "oneko-hidden"
    @initNeko()
    @loop()

  stopNeko: =>
    @running = false
    @nekoEl.classList.add "oneko-hidden"
    cancelAnimationFrame @requestId if @requestId
    @requestId = undefined

  handleVisibilityChange: =>
    if document.visibilityState == 'hidden'
      @saveNekoState()

  # Saves oneko state to localStorage
  saveNekoState: =>
    return unless @running # Only save if oneko is running
    
    nekoState = {
      nekoPosX: @nekoPosX
      nekoPosY: @nekoPosY
      mousePosX: @mousePosX
      mousePosY: @mousePosY
      idleTime: @idleTime
      idleAnimation: @idleAnimation
      idleAnimationFrame: @idleAnimationFrame
      frameCount: @frameCount
      running: @running
      timestamp: Date.now()
    }
    
    try
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nekoState))
    catch e
      console.error("Failed to save oneko state to localStorage", e)
    
  # Loads oneko state from localStorage
  loadNekoState: =>
    try
      savedState = localStorage.getItem(STORAGE_KEY)
      return unless savedState
      
      state = JSON.parse(savedState)
      
      # Get the timestamp of the saved state
      timestamp = state.timestamp || 0
      currentTime = Date.now()
      timeDifference = currentTime - timestamp
      
      # If the saved state is recent (less than 2 seconds old), use it
      # This likely means we're navigating between pages on the site
      if timeDifference < 2000 and state.running
        # Use the saved state
        @nekoPosX = state.nekoPosX || 32
        @nekoPosY = state.nekoPosY || 32
        @mousePosX = state.mousePosX || 0
        @mousePosY = state.mousePosY || 0
        @idleTime = state.idleTime || 0
        @idleAnimation = state.idleAnimation
        @idleAnimationFrame = state.idleAnimationFrame || 0
        @frameCount = state.frameCount || 0
        
        # Apply position if oneko element exists
        if @nekoEl
          @nekoEl.style.left = "#{@nekoPosX - 16}px"
          @nekoEl.style.top = "#{@nekoPosY - 16}px"
    catch e
      console.error("Failed to load oneko state from localStorage", e)

  initNeko: =>
    # Only initialize values that weren't loaded from saved state
    @nekoPosX = 32 unless @nekoPosX?
    @nekoPosY = 32 unless @nekoPosY?
    @mousePosX = 0 unless @mousePosX?
    @mousePosY = 0 unless @mousePosY?
    @frameCount = 0 unless @frameCount?
    @idleTime = 0 unless @idleTime?
    @idleAnimation = null unless @idleAnimation?
    @idleAnimationFrame = 0 unless @idleAnimationFrame?
    @lastFrameTimestamp = undefined
    @nekoSpeed = 10
    @spriteSets =
      idle: [[-3, -3]]
      alert: [[-7, -3]]
      scratchSelf: [[-5, 0], [-6, 0], [-7, 0]]
      scratchWallN: [[0, 0], [0, -1]]
      scratchWallS: [[-7, -1], [-6, -2]]
      scratchWallE: [[-2, -2], [-2, -3]]
      scratchWallW: [[-4, 0], [-4, -1]]
      tired: [[-3, -2]]
      sleeping: [[-2, 0], [-2, -1]]
      N: [[-1, -2], [-1, -3]]
      NE: [[0, -2], [0, -3]]
      E: [[-3, 0], [-3, -1]]
      SE: [[-5, -1], [-5, -2]]
      S: [[-6, -3], [-7, -2]]
      SW: [[-5, -3], [-6, -1]]
      W: [[-4, -2], [-4, -3]]
      NW: [[-1, 0], [-1, -1]]

    @nekoEl.id = "oneko"
    @nekoEl.ariaHidden = true
    
    Object.assign @nekoEl.style,
      left: "#{@nekoPosX - 16}px"
      top: "#{@nekoPosY - 16}px"
    
    # Add click event for heart explosion
    @nekoEl.addEventListener "click", @explodeHearts
    
    document.addEventListener "mousemove", (event) =>
      @mousePosX = event.clientX
      @mousePosY = event.clientY

  loop: (timestamp) =>
    return unless @running
    # Safety check - stop if neko element is removed from DOM
    return unless @nekoEl.isConnected
    @lastFrameTimestamp = timestamp unless @lastFrameTimestamp
    if timestamp - @lastFrameTimestamp > 100
      @lastFrameTimestamp = timestamp
      @updateNeko()
    @requestId = globalThis.requestAnimationFrame @loop

  updateNeko: =>
    diffX = @nekoPosX - @mousePosX
    diffY = @nekoPosY - @mousePosY
    distance = Math.hypot diffX, diffY
    if distance < @nekoSpeed or distance < 48
      @idle()
      return
    @idleAnimation = null
    @idleAnimationFrame = 0
    if @idleTime > 1
      @setSprite "alert", 0
      @idleTime = Math.min @idleTime, 7
      @idleTime--
      return
    direction = ""
    direction = "N" if diffY / distance > 0.5
    direction += "S" if diffY / distance < -0.5
    direction += "W" if diffX / distance > 0.5
    direction += "E" if diffX / distance < -0.5
    @setSprite direction, @frameCount++
    @nekoPosX -= (diffX / distance) * @nekoSpeed
    @nekoPosY -= (diffY / distance) * @nekoSpeed
    @nekoPosX = Math.min Math.max(16, @nekoPosX), window.innerWidth - 16
    @nekoPosY = Math.min Math.max(16, @nekoPosY), window.innerHeight - 16
    @nekoEl.style.left = "#{@nekoPosX - 16}px"
    @nekoEl.style.top = "#{@nekoPosY - 16}px"
    
    # Throttled save - only save state occasionally to avoid performance issues
    @lastSaveTime = 0 unless @lastSaveTime?
    currentTime = Date.now()
    if currentTime - @lastSaveTime > 1000 # Save every 1 second
      @saveNekoState()
      @lastSaveTime = currentTime

  idle: =>
    @idleTime++
    if @idleTime > 10 and Math.floor(Math.random() * 200) is 0 and not @idleAnimation
      availableAnims = ["sleeping", "scratchSelf"]
      availableAnims.push "scratchWallW" if @nekoPosX < 32
      availableAnims.push "scratchWallN" if @nekoPosY < 32
      availableAnims.push "scratchWallE" if @nekoPosX > window.innerWidth - 32
      availableAnims.push "scratchWallS" if @nekoPosY > window.innerHeight - 32
      @idleAnimation = availableAnims[Math.floor(Math.random() * availableAnims.length)]
    switch @idleAnimation
      when "sleeping"
        if @idleAnimationFrame < 8
          @setSprite "tired", 0
        else
          @setSprite "sleeping", Math.floor(@idleAnimationFrame / 4)
        @resetIdleAnimation() if @idleAnimationFrame > 192
      when "scratchWallN", "scratchWallS", "scratchWallE", "scratchWallW", "scratchSelf"
        @setSprite @idleAnimation, @idleAnimationFrame
        @resetIdleAnimation() if @idleAnimationFrame > 9
      else
        @setSprite "idle", 0
        return
    @idleAnimationFrame++

  setSprite: (name, frameNumber) =>
    sprite = @spriteSets[name][frameNumber % @spriteSets[name].length]
    @nekoEl.style.backgroundPosition = "#{sprite[0] * 32}px #{sprite[1] * 32}px"

  resetIdleAnimation: =>
    @idleAnimation = undefined
    @idleAnimationFrame = 0

  # Heart explosion effect when neko is clicked
  explodeHearts: =>
    parent = @nekoEl.parentElement
    rect = @nekoEl.getBoundingClientRect()
    scrollLeft = window.scrollX || document.documentElement.scrollLeft
    scrollTop = window.scrollY || document.documentElement.scrollTop
    centerX = rect.left + rect.width / 2 + scrollLeft
    centerY = rect.top + rect.height / 2 + scrollTop

    for i in [0...10]
      heart = document.createElement('div')
      heart.className = 'heart'
      # Use custom SVG heart instead of text emoji
      heart.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><path fill="#ac4955" d="M35.885 11.833c0-5.45-4.418-9.868-9.867-9.868-3.308 0-6.227 1.633-8.018 4.129-1.791-2.496-4.71-4.129-8.017-4.129-5.45 0-9.868 4.417-9.868 9.868 0 .772.098 1.52.266 2.241C1.751 22.587 11.216 31.568 18 34.034c6.783-2.466 16.249-11.447 17.617-19.959.17-.721.268-1.469.268-2.242z" /></svg>'
      offsetX = (Math.random() - 0.5) * 50
      offsetY = (Math.random() - 0.5) * 50
      heart.style.left = "#{centerX + offsetX - 16}px"
      heart.style.top = "#{centerY + offsetY - 16}px"
      heart.style.transform = "translate(-50%, -50%) rotate(#{Math.random() * 360}deg)"
      parent.appendChild(heart)

      setTimeout =>
        parent.removeChild(heart) if heart.parentElement
      , 1000
