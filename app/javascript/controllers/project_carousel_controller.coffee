import { Controller } from "@hotwired/stimulus"

export default class extends Controller
  @targets: [
    "slides"
    "slide"
    "indicator"
    "video"
  ]

  @values:
    currentSlide: Number
    totalSlides: Number
    autoAdvanceInterval: Number

  connect: ->
    @currentSlideValue = 0
    @totalSlidesValue = @slideTargets.length
    @autoAdvanceIntervalValue = 8000
    @touchStartX = 0
    @touchEndX = 0
    
    return unless @hasSlidesTarget and @slideTargets.length > 0
    
    @boundHandleTouchStart = @handleTouchStart.bind(@)
    @boundHandleTouchEnd = @handleTouchEnd.bind(@)
    @initializeCarousel()
    @setupEventListeners()
    @startAutoAdvance()
    @setupVisibilityObserver()

  disconnect: ->
    @pauseAllVideos()
    @stopAutoAdvance()
    @removeEventListeners()
    @teardownVisibilityObserver()

  setupVisibilityObserver: ->
    @visibilityObserver = new IntersectionObserver (entries) =>
      for entry in entries
        if entry.isIntersecting
          @startAutoAdvance()
        else
          @stopAutoAdvance()
    , { threshold: 0.1 }
    @visibilityObserver.observe(@element)

  teardownVisibilityObserver: ->
    @visibilityObserver?.disconnect()

  initializeCarousel: ->
    @showSlide(0)

  setupEventListeners: ->
    @slidesTarget.addEventListener 'touchstart', @boundHandleTouchStart, { passive: true }
    @slidesTarget.addEventListener 'touchend', @boundHandleTouchEnd, { passive: true }

  removeEventListeners: ->
    @slidesTarget.removeEventListener 'touchstart', @boundHandleTouchStart
    @slidesTarget.removeEventListener 'touchend', @boundHandleTouchEnd

  showSlide: (index) ->
    @pauseAllVideos()
    for slide in @slideTargets
      slide.classList.remove('active')
    for indicator in @indicatorTargets
      indicator.classList.remove('active')
    if @slideTargets[index]
      @slideTargets[index].classList.add('active')
      @playActiveSlideVideo(index)
    if @indicatorTargets[index]
      @indicatorTargets[index].classList.add('active')
    transform = "translateX(-#{index * 100}%)"
    @slidesTarget.style.transform = transform
    @currentSlideValue = index

  pauseAllVideos: ->
    if @hasVideoTarget
      for video in @videoTargets
        try
          video.pause() if video.readyState >= 2
        catch error
          # ignore

  playActiveSlideVideo: (slideIndex) ->
    if @hasVideoTarget
      activeSlide = @slideTargets[slideIndex]
      if activeSlide
        video = activeSlide.querySelector('[data-project-carousel-target="video"]')
        if video
          try
            video.play().catch (error) ->
              # ignore
          catch error
            # ignore

  nextSlide: ->
    next = (@currentSlideValue + 1) % @totalSlidesValue
    @showSlide(next)

  previousSlide: ->
    previous = (@currentSlideValue - 1 + @totalSlidesValue) % @totalSlidesValue
    @showSlide(previous)

  next: (event) ->
    event.preventDefault()
    @nextSlide()

  previous: (event) ->
    event.preventDefault()
    @previousSlide()

  goToSlide: (event) ->
    event.preventDefault()
    index = parseInt(event.currentTarget.dataset.slide)
    @showSlide(index) if index >= 0 and index < @totalSlidesValue

  handleTouchStart: (event) ->
    @touchStartX = event.touches[0].clientX

  handleTouchEnd: (event) ->
    @touchEndX = event.changedTouches[0].clientX
    @handleSwipe()

  handleSwipe: ->
    swipeThreshold = 50
    diff = @touchStartX - @touchEndX
    if Math.abs(diff) > swipeThreshold
      if diff > 0
        @nextSlide()
      else
        @previousSlide()

  startAutoAdvance: ->
    return if @autoAdvanceTimer
    @autoAdvanceTimer = setInterval =>
      @nextSlide()
    , @autoAdvanceIntervalValue

  stopAutoAdvance: ->
    if @autoAdvanceTimer
      clearInterval(@autoAdvanceTimer)
      @autoAdvanceTimer = null

  pauseAutoAdvance: ->
    @stopAutoAdvance()

  resumeAutoAdvance: ->
    @startAutoAdvance()
