import { Controller } from "@hotwired/stimulus"
import Plotly from 'plotly.js-dist'

export default class extends Controller
  @targets = [
    "ph", "pth", "ptnh", "plot", "results", "error", "validResults",
    "pht", "pnotht", "phnott", "pnothnott", "pt", "pnott"
  ]
  
  STORAGE_KEY = 'bayesometer-state'

  connect: ->
    @plotInitialized = false
    @plotTarget.classList.add 'loading'
    @loadStateFromStorage()
    @updateAll()
    @plotInitialized = true
    
    # More comprehensive event handling
    @saveHandler = this.saveStateToStorage.bind(this)
    
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
      
  inputChanged: ->
    @updateAll()
    
  saveStateToStorage: ->
    state = {
      ph: @phTarget.value,
      pth: @pthTarget.value,
      ptnh: @ptnhTarget.value
    }
    try
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    catch e
      console.error("Failed to save state to localStorage", e)
      
  loadStateFromStorage: ->
    try
      savedState = localStorage.getItem(STORAGE_KEY)
      if savedState
        state = JSON.parse(savedState)
        @setInputValues(state)
    catch e
      console.error("Failed to load state from localStorage", e)
      
  setInputValues: (state) ->
    @phTarget.value = state.ph if state.ph?
    @pthTarget.value = state.pth if state.pth?
    @ptnhTarget.value = state.ptnh if state.ptnh?

  updateAll: ->
    ph = parseFloat @phTarget.value
    pth = parseFloat @pthTarget.value
    ptnh = parseFloat @ptnhTarget.value

    pnoth = 1 - ph
    pt = ph * pth + pnoth * ptnh
    pht = (ph * pth) / pt

    return unless @updateResults(ph, pth, ptnh, pht)
    @updatePlot ph, pth, ptnh, pht

  updateResults: (ph, pth, ptnh, pht) ->
    # Validate input numbers
    if [ph, pth, ptnh].some (val) -> isNaN(val) or val < 0 or val > 1
      @showError()
      return false

    pnoth = 1 - ph
    pt = ph * pth + pnoth * ptnh
    pnot_t = 1 - pt
    return @showError() if pnot_t == 0  # avoid division by zero
    ph_not_t = (ph * (1 - pth)) / pnot_t
    return @showError() unless isFinite(ph_not_t)

    pnot_ht = 1 - pht
    pnot_h_not_t = 1 - ph_not_t

    @hideError()
    @updateDisplay pht, pnot_ht, ph_not_t, pnot_h_not_t, pt, pnot_t
    true

  updateDisplay: (pht, pnot_ht, ph_not_t, pnot_h_not_t, pt, pnot_t) ->
    @phtTarget.textContent = pht.toFixed 3
    @pnothtTarget.textContent = pnot_ht.toFixed 3
    @phnottTarget.textContent = ph_not_t.toFixed 3
    @pnothnottTarget.textContent = pnot_h_not_t.toFixed 3
    @ptTarget.textContent = pt.toFixed 3
    @pnottTarget.textContent = pnot_t.toFixed 3

  showError: ->
    @errorTarget.style.display = "block"
    @validResultsTarget.style.display = "none"
    false

  hideError: ->
    @errorTarget.style.display = "none"
    @validResultsTarget.style.display = "block"

  updatePlot: (ph, pth, ptnh, pht) ->
    n = 100
    xVals = (i / n for i in [0...n])
    yVals = (i / n for i in [0...n])
    zVals = (for i in [0...n]
      (for j in [0...n]
        local_ph = xVals[i]
        local_pth = yVals[j]
        1 / (((1 - local_ph) * (1 - local_pth) / (local_ph * local_pth)) + 1)
      )
    )

    data = [
      {
        type: 'surface'
        x: xVals
        y: yVals
        z: zVals
        colorscale: 'Viridis'
        showscale: false
      },
      {
        type: 'scatter3d'
        x: [ph]
        y: [pth]
        z: [pht]
        mode: 'markers'
        marker: { size: 8, color: 'red' }
        name: 'Current'
      }
    ]

    baseLayout = @getBaseLayout()
    layout = Object.assign {}, baseLayout,
      autosize: true
      scene: Object.assign {}, baseLayout.scene,
        domain:
          x: [0, 1]
          y: [0, 1]
        camera:
          up: { x: 0, y: 0, z: 1 }
          center: { x: 0, y: 0, z: 0 }
          eye: { x: 1.5, y: 1.5, z: 1.5 }

    config = { displayModeBar: false, responsive: true }

    if @plotInitialized
      Plotly.react @plotTarget, data, layout, config
    else
      Plotly.newPlot @plotTarget, data, layout, config

    @plotTarget.classList.remove 'loading'

  getBaseLayout: ->
    {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: {
        color: '#c0caf5',
        family: '"Space Mono", monospace'
      },
      margin: {
        t: 40,
        r: 40,
        l: 40,
        b: 40
      },
      showlegend: false,
      scene: {
        xaxis: {
          title: 'P(H)',
          range: [0, 1]
        },
        yaxis: {
          title: 'P(T|H)',
          range: [0, 1]
        },
        zaxis: {
          title: 'P(H|T)',
          range: [0, 1]
        }
      }
    }