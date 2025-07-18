import { Controller } from "@hotwired/stimulus"

export default class WaveformController extends Controller
  STORAGE_KEY = 'waveform-state'
  AUDIO_STORAGE_KEY = 'waveform-audio-data'

  connect: ->
    @c = null # Make this an instance variable for access across methods
    @filename = null # Store the filename
    
    # Load saved state
    @loadStateFromStorage()
    
    # Try to load cached audio data
    @loadAudioFromStorage()
    
    # Add event handlers for saving state
    @saveHandler = @saveStateToStorage.bind(this)
    
    # Turbo-specific events
    document.addEventListener('turbo:before-visit', @saveHandler)
    document.addEventListener('turbo:before-cache', @saveHandler)
    
    # Standard browser events
    window.addEventListener('beforeunload', @saveHandler)
    window.addEventListener('pagehide', @saveHandler)
    document.addEventListener('visibilitychange', @handleVisibilityChange.bind(this))
    
    document.getElementById("fileInput")?.addEventListener "change", (n) =>
      file = n.target.files?[0]
      if file
        @filename = file.name # Store the filename
        reader = new FileReader()
        reader.onload = (e) =>
          audioContext = new (window.AudioContext or window.webkitAudioContext)
          if e.target?.result
            # Remove previous audio cache when new file is loaded
            @clearAudioFromStorage()
            
            # Save new audio file to localStorage
            @saveAudioToStorage(e.target.result)
            
            audioContext.decodeAudioData e.target.result, (buffer) =>
              @c = buffer
              alert "Audio file loaded successfully."
              @displayFileName() # Display the filename
              
              # Automatically render waveform with saved time values
              @renderWaveformWithSavedValues()
            , ->
              alert "Error decoding audio data."
        reader.readAsArrayBuffer file
      else
        alert "Please upload a .wav file."

    document.getElementById("drawButton")?.addEventListener "click", =>
      @renderWaveformWithSavedValues()
  
  # Display the currently loaded filename
  displayFileName: ->
    fileNameDisplay = document.getElementById("fileNameDisplay")
    if fileNameDisplay && @filename
      fileNameDisplay.textContent = "Loaded file: #{@filename}"
      fileNameDisplay.style.display = "block"
  
  renderWaveformWithSavedValues: ->
    startTimeEl = document.getElementById("startTime")
    endTimeEl = document.getElementById("endTime")
    return unless startTimeEl and endTimeEl
    startTime = parseFloat startTimeEl.value
    endTime = parseFloat endTimeEl.value
    
    # Save state whenever draw is clicked
    @saveStateToStorage()
    
    if @c
      @drawWaveform(@c, startTime, endTime)
    else
      alert "Please load an audio file first."
        
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
    startTimeEl = document.getElementById("startTime")
    endTimeEl = document.getElementById("endTime")
    
    return unless startTimeEl and endTimeEl
    
    state = {
      startTime: startTimeEl.value,
      endTime: endTimeEl.value,
      filename: @filename # Save the filename too
    }
    
    try
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    catch e
      console.error("Failed to save waveform state to localStorage", e)

  loadStateFromStorage: ->
    try
      savedState = localStorage.getItem(STORAGE_KEY)
      if savedState
        state = JSON.parse(savedState)
        @setStateValues(state)
    catch e
      console.error("Failed to load waveform state from localStorage", e)

  setStateValues: (state) ->
    startTimeEl = document.getElementById("startTime")
    endTimeEl = document.getElementById("endTime")
    
    return unless startTimeEl and endTimeEl
    
    if state.startTime?
      startTimeEl.value = state.startTime
      
    if state.endTime?
      endTimeEl.value = state.endTime
      
    if state.filename?
      @filename = state.filename
      @displayFileName()

  # New methods for audio caching
  saveAudioToStorage: (audioData) ->
    try
      # Convert ArrayBuffer to Base64 string for storage
      arrayBufferView = new Uint8Array(audioData)
      blob = new Blob([arrayBufferView], {type: 'audio/wav'})
      
      reader = new FileReader()
      reader.onload = (e) =>
        base64data = e.target.result
        try
          localStorage.setItem(AUDIO_STORAGE_KEY, base64data)
        catch storageError
          console.error("Failed to save audio to localStorage - likely exceeded quota", storageError)
          # Silently fail - the app will still work without caching
      
      reader.readAsDataURL(blob)
    catch e
      console.error("Failed to encode audio data for storage", e)

  loadAudioFromStorage: ->
    try
      savedAudioData = localStorage.getItem(AUDIO_STORAGE_KEY)
      if savedAudioData
        # Convert Base64 string back to ArrayBuffer
        fetch(savedAudioData)
          .then (response) -> response.arrayBuffer()
          .then (arrayBuffer) => 
            audioContext = new (window.AudioContext or window.webkitAudioContext)
            audioContext.decodeAudioData arrayBuffer, (buffer) =>
              @c = buffer
              console.log "Cached audio loaded successfully"
              
              # Automatically render waveform with saved time values
              @renderWaveformWithSavedValues()
            , (error) ->
              console.error "Error decoding cached audio data:", error
          .catch (error) -> 
            console.error "Error processing cached audio:", error
    catch e
      console.error("Failed to load audio from localStorage", e)

  clearAudioFromStorage: ->
    try
      localStorage.removeItem(AUDIO_STORAGE_KEY)
    catch e
      console.error("Failed to clear audio from localStorage", e)

  drawWaveform: (buffer, start, end) ->
    canvas = document.getElementById "canvas"
    return unless canvas
    ctx = canvas.getContext "2d"
    return unless ctx
    
    width = canvas.width
    height = canvas.height
    sampleRate = buffer.sampleRate
    startSample = Math.floor start * sampleRate
    endSample = Math.floor end * sampleRate
    channelData = buffer.getChannelData(0).slice(startSample, endSample)

    ctx.clearRect 0, 0, width, height
    ctx.beginPath()
    ctx.strokeStyle = "#D6D6D6"
    
    samplesPerPixel = Math.ceil channelData.length / width
    midHeight = height / 2
    for x in [0...width]
      chunk = channelData.slice(x * samplesPerPixel, (x + 1) * samplesPerPixel)
      min = Math.min chunk...
      max = Math.max chunk...
      ctx.moveTo x, (1 + min) * midHeight
      ctx.lineTo x, (1 + max) * midHeight

    ctx.stroke()