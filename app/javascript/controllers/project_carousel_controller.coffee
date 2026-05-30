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
    @slideMediaTemplates = []
    @carouselInView = false
    @scrollEndTimer = null

    return unless @hasSlidesTarget and @slideTargets.length > 0

    @boundHandleTouchStart = @handleTouchStart.bind(@)
    @boundHandleTouchEnd = @handleTouchEnd.bind(@)
    @boundHandlePageWheel = @handlePageWheel.bind(@)
    @cacheSlideMedia()
    @initializeCarousel()
    @setupEventListeners()
    @setupVisibilityObserver()
    @bindPageScrollListener()

  disconnect: ->
    @pauseAllVideos()
    @stopAutoAdvance()
    @removeEventListeners()
    @teardownVisibilityObserver()
    @unbindPageScrollListener()
    clearTimeout(@scrollEndTimer) if @scrollEndTimer

  cacheSlideMedia: ->
    for slide, index in @slideTargets
      media = slide.querySelector(".carousel-embed-container, .video-container")
      if media
        template = media.cloneNode(true)
        @resetEmbedHosts(template)
        @slideMediaTemplates[index] = template
        media.remove()

  resetEmbedHosts: (root) ->
    for host in root.querySelectorAll("[data-controller~='robustext-embed']")
      host.replaceChildren()

  mountSlideMedia: (index) ->
    slide = @slideTargets[index]
    return unless slide
    return if slide.querySelector(".carousel-embed-container, .video-container")
    template = @slideMediaTemplates[index]
    return unless template
    slide.appendChild(template.cloneNode(true))

  unmountSlideMedia: (index) ->
    slide = @slideTargets[index]
    return unless slide
    media = slide.querySelector(".carousel-embed-container, .video-container")
    return unless media
    media.remove()

  syncSlideMedia: (activeIndex) ->
    return unless @carouselInView
    for slide, index in @slideTargets
      if index is activeIndex
        @mountSlideMedia(index)
      else
        @unmountSlideMedia(index)

  unmountAllSlideMedia: ->
    for index in [0...@slideTargets.length]
      @unmountSlideMedia(index)

  setupVisibilityObserver: ->
    @visibilityObserver = new IntersectionObserver (entries) =>
      for entry in entries
        if entry.isIntersecting
          @carouselInView = true
          @syncSlideMedia(@currentSlideValue)
          @startAutoAdvance()
        else
          @carouselInView = false
          @stopAutoAdvance()
          @pauseAllVideos()
          @unmountAllSlideMedia()
    , { threshold: 0.1 }
    @visibilityObserver.observe(@element)

  bindPageScrollListener: ->
    @pageScrollEl = document.getElementById("crt-content")
    @pageScrollEl?.addEventListener("wheel", @boundHandlePageWheel, { passive: true })

  unbindPageScrollListener: ->
    @pageScrollEl?.removeEventListener("wheel", @boundHandlePageWheel)
    @pageScrollEl = null

  handlePageWheel: ->
    @element.classList.add("is-user-scrolling")
    @pauseAutoAdvance()
    clearTimeout(@scrollEndTimer) if @scrollEndTimer
    @scrollEndTimer = setTimeout =>
      @element.classList.remove("is-user-scrolling")
      @startAutoAdvance() if @carouselInView
    , 150

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
    @syncSlideMedia(index)
    for slide in @slideTargets
      slide.classList.remove('active')
    for indicator in @indicatorTargets
      indicator.classList.remove('active')
    if @slideTargets[index]
      @slideTargets[index].classList.add('active')
      @playActiveSlideVideo(index) if @carouselInView
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
    return unless @carouselInView
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
