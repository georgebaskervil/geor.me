import { Controller } from "@hotwired/stimulus"

ONEKO_STORAGE_KEY = "oneko-state"

export default class extends Controller
  connect: =>
    @running = false
    @requestId = undefined
    @staticIdleTimer = undefined
    @currentSpriteKey = null
    @nekoEl = @element

    @saveNekoState = @saveNekoState.bind(@)
    @loadNekoState = @loadNekoState.bind(@)
    @handleVisibilityChange = @handleVisibilityChange.bind(@)
    @onMouseMove = @onMouseMove.bind(@)

    document.addEventListener("turbo:before-visit", @saveNekoState)
    document.addEventListener("turbo:before-cache", @saveNekoState)
    window.addEventListener("beforeunload", @saveNekoState)
    window.addEventListener("pagehide", @saveNekoState)
    document.addEventListener("visibilitychange", @handleVisibilityChange)

    @loadNekoState()
    @startNeko()

  disconnect: =>
    @saveNekoState()
    @stopHeartGC()

    document.removeEventListener("turbo:before-visit", @saveNekoState)
    document.removeEventListener("turbo:before-cache", @saveNekoState)
    window.removeEventListener("beforeunload", @saveNekoState)
    window.removeEventListener("pagehide", @saveNekoState)
    document.removeEventListener("visibilitychange", @handleVisibilityChange)
    document.removeEventListener("mousemove", @onMouseMove)

    @nekoEl?.removeEventListener("click", @explodeHearts)

    cancelAnimationFrame @requestId if @requestId
    @stopStaticIdleWatch()

  startNeko: =>
    return if @running
    @running = true
    @nekoEl.classList.remove "oneko-hidden"
    @initNeko()
    @scheduleLoop()

  stopNeko: =>
    @running = false
    @nekoEl.classList.add "oneko-hidden"
    cancelAnimationFrame @requestId if @requestId
    @requestId = undefined
    @stopStaticIdleWatch()

  handleVisibilityChange: =>
    if document.visibilityState == 'hidden'
      @saveNekoState()

  saveNekoState: =>
    return unless @running

    nekoState = {
      nekoPosX: @nekoPosX
      nekoPosY: @nekoPosY
      mousePosX: @mousePosX
      mousePosY: @mousePosY
      idleTime: @idleTime
      idleAnimation: @idleAnimation
      idleAnimationFrame: @idleAnimationFrame
      frameCount: @frameCount
      backgroundPosition: @nekoEl?.style.backgroundPosition
      running: @running
      timestamp: Date.now()
    }

    try
      localStorage.setItem(ONEKO_STORAGE_KEY, JSON.stringify(nekoState))
    catch e
      console.error("Failed to save oneko state to localStorage", e)

  loadNekoState: =>
    try
      savedState = localStorage.getItem(ONEKO_STORAGE_KEY)
      return unless savedState

      state = JSON.parse(savedState)
      return unless state.running

      @nekoPosX = state.nekoPosX ? 32
      @nekoPosY = state.nekoPosY ? 32
      @mousePosX = state.mousePosX ? 0
      @mousePosY = state.mousePosY ? 0
      @idleTime = state.idleTime ? 0
      @idleAnimation = state.idleAnimation
      @idleAnimationFrame = state.idleAnimationFrame ? 0
      @frameCount = state.frameCount ? 0

      if @nekoEl
        @nekoEl.style.left = "#{@nekoPosX - 16}px"
        @nekoEl.style.top = "#{@nekoPosY - 16}px"
        if state.backgroundPosition
          @nekoEl.style.backgroundPosition = state.backgroundPosition
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
    
    @nekoEl.addEventListener "click", @explodeHearts

    document.removeEventListener "mousemove", @onMouseMove
    document.addEventListener "mousemove", @onMouseMove

  onMouseMove: (event) =>
    @mousePosX = event.clientX
    @mousePosY = event.clientY
    @stopStaticIdleWatch()
    @scheduleLoop()

  scheduleLoop: =>
    return unless @running
    return if @requestId?
    @requestId = globalThis.requestAnimationFrame @loop

  stopLoop: =>
    cancelAnimationFrame @requestId if @requestId
    @requestId = undefined

  needsAnimation: =>
    diffX = @nekoPosX - @mousePosX
    diffY = @nekoPosY - @mousePosY
    distance = Math.hypot diffX, diffY
    return true if distance >= 48
    return true if @idleAnimation?
    return true if @idleTime > 1 and @idleTime <= 7
    return false

  stopStaticIdleWatch: =>
    clearInterval @staticIdleTimer if @staticIdleTimer
    @staticIdleTimer = undefined

  startStaticIdleWatch: =>
    return if @staticIdleTimer
    @resetToIdlePose()
    @staticIdleTimer = setInterval (=>
      return unless @running
      @idleTime++
      if @idleTime > 10 and Math.floor(Math.random() * 200) is 0 and not @idleAnimation
        @pickIdleAnimation()
        @stopStaticIdleWatch()
        @scheduleLoop()
    ), 100

  pickIdleAnimation: =>
    availableAnims = ["sleeping", "scratchSelf"]
    availableAnims.push "scratchWallW" if @nekoPosX < 32
    availableAnims.push "scratchWallN" if @nekoPosY < 32
    availableAnims.push "scratchWallE" if @nekoPosX > window.innerWidth - 32
    availableAnims.push "scratchWallS" if @nekoPosY > window.innerHeight - 32
    @idleAnimation = availableAnims[Math.floor(Math.random() * availableAnims.length)]
    @idleAnimationFrame = 0

  loop: (timestamp) =>
    @requestId = undefined
    return unless @running
    return unless @nekoEl.isConnected
    @lastFrameTimestamp = timestamp unless @lastFrameTimestamp
    if timestamp - @lastFrameTimestamp > 100
      @lastFrameTimestamp = timestamp
      @updateNeko()
    if @needsAnimation()
      @scheduleLoop()
    else
      @startStaticIdleWatch()

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
      @pickIdleAnimation()
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
    key = "#{name}-#{frameNumber % @spriteSets[name].length}"
    return if @currentSpriteKey is key
    @currentSpriteKey = key
    sprite = @spriteSets[name][frameNumber % @spriteSets[name].length]
    @nekoEl.style.backgroundPosition = "#{sprite[0] * 32}px #{sprite[1] * 32}px"

  resetIdleAnimation: =>
    @idleAnimation = undefined
    @idleAnimationFrame = 0

  resetToIdlePose: =>
    @idleTime = 0
    @idleAnimation = null
    @idleAnimationFrame = 0
    @frameCount = 0
    @currentSpriteKey = null
    @setSprite "idle", 0 if @nekoEl?

  # Heart explosion effect when neko is clicked
  explodeHearts: =>
    parent = @nekoEl.parentElement
    rect = @nekoEl.getBoundingClientRect()
    # Viewport coords — hearts live inside .crt-shell (not document scroll).
    centerX = rect.left + rect.width / 2
    centerY = rect.top + rect.height / 2

    for i in [0...20]
      heart = document.createElement('div')
      heart.className = 'heart'
      heart.dataset.createdAt = Date.now()
      heart.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><path fill="#aea2c3" d="M35.885 11.833c0-5.45-4.418-9.868-9.867-9.868-3.308 0-6.227 1.633-8.018 4.129-1.791-2.496-4.71-4.129-8.017-4.129-5.45 0-9.868 4.417-9.868 9.868 0 .772.098 1.52.266 2.241C1.751 22.587 11.216 31.568 18 34.034c6.783-2.466 16.249-11.447 17.617-19.959.17-.721.268-1.469.268-2.242z" /></svg>'
      offsetX = (Math.random() - 0.5) * 100
      offsetY = (Math.random() - 0.5) * 100
      heart.style.left = "#{centerX + offsetX}px"
      heart.style.top = "#{centerY + offsetY}px"
      #heart.style.setProperty "--heart-rotate", "#{Math.random() * 90}deg"
      parent.appendChild(heart)

      removeHeart = ->
        heart.remove() if heart.isConnected

      heart.addEventListener "animationend", (event) ->
        return unless event.animationName is "heart-burst"
        removeHeart()
      , once: true

      # Fallback when animation is reduced or animationend does not fire
      setTimeout removeHeart, 1050

    @startHeartGC()
    @stopStaticIdleWatch()
    @scheduleLoop()

  startHeartGC: =>
    return if @heartGCInterval
    @heartGCInterval = setInterval (=> @collectStrayHearts()), 2000

  stopHeartGC: =>
    clearInterval @heartGCInterval if @heartGCInterval
    @heartGCInterval = undefined

  collectStrayHearts: =>
    parent = @nekoEl?.parentElement
    return @stopHeartGC() unless parent

    hearts = parent.querySelectorAll('.heart')
    unless hearts.length
      @stopHeartGC()
      return

    now = Date.now()
    hearts.forEach (heart) =>
      age = now - parseInt(heart.dataset.createdAt or '0', 10)
      animations = if heart.getAnimations?() then heart.getAnimations() else []
      isAnimating = animations.some (a) -> a.playState is 'running'
      heart.remove() if not isAnimating or age > 1500
