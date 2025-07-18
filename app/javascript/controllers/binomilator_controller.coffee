import { Controller } from "@hotwired/stimulus"
import Plotly from "plotly.js-dist"

export default class extends Controller
  @targets: ["n", "p", "x", "plot", "results"]
  @values:
    nMax:
      type: Number
      default: 100
    yMax:
      type: Number
      default: 0.2

  STORAGE_KEY = 'binomilator-state'

  connect: ->
    @factCache = {}  # initialize cache for factorial results
    @plotTarget.classList.add 'loading'
    @loadStateFromStorage()
    @initializeOutputs() # Call after loading state
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

  loadStateFromStorage: ->
    try
      savedState = localStorage.getItem(STORAGE_KEY)
      if savedState
        state = JSON.parse(savedState)
        @setStateValues(state)
      else
        # Initialize default values
        @n = parseInt(@nTarget.value)
        @p = parseFloat(@pTarget.value)
        @x = parseInt(@xTarget.value)
        @showPoisson = false
        @showNormal = false
    catch e
      console.error("Failed to load state from localStorage", e)
      # Initialize default values
      @n = parseInt(@nTarget.value)
      @p = parseFloat(@pTarget.value)
      @x = parseInt(@xTarget.value)
      @showPoisson = false
      @showNormal = false

  setStateValues: (state) ->
    if state.n?
      @nTarget.value = state.n
      @n = parseInt(state.n)
    else
      @n = parseInt(@nTarget.value)

    if state.p?
      @pTarget.value = state.p
      @p = parseFloat(state.p)
    else
      @p = parseFloat(@pTarget.value)

    if state.x?
      @xTarget.value = state.x
      @x = parseInt(state.x)
    else
      @x = parseInt(@xTarget.value)

    @showPoisson = state.showPoisson ? false
    @showNormal = state.showNormal ? false
    
    # Remove this call to avoid the error
    # @initializeOutputs()

  saveStateToStorage: ->
    state = {
      n: @n,
      p: @p,
      x: @x,
      showPoisson: @showPoisson,
      showNormal: @showNormal
    }
    try
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    catch e
      console.error("Failed to save state to localStorage", e)

  initializeOutputs: ->
    outputs = @element.querySelectorAll 'output'
    # Add defensive checks to make sure elements exist
    if outputs && outputs.length > 0
      outputs[0].textContent = @nTarget.value if outputs[0]
      outputs[1].textContent = @pTarget.value if outputs.length > 1 && outputs[1]

  inputChanged: (event) ->
    output = @element.querySelector "output[for='#{event?.target?.id}']"
    if output?
      output.textContent = event.target.value

    @n = parseInt(@nTarget.value) or 1
    @p = Math.max(0, Math.min(1, parseFloat(@pTarget.value) or 0))
    @x = parseInt(@xTarget.value) or 0

    @nTarget.value = @n
    @pTarget.value = @p
    @xTarget.value = @x

    @updateAll()

  updateAll: ->
    @calculateProbabilities()
    @updatePlot()

  updatePlot: ->
    data = @getPlotData()
    layout = @getPlotLayout()

    if @plotInitialized
      Plotly.react @plotTarget, data, layout, displayModeBar: false
    else
      Plotly.newPlot @plotTarget, data, layout, displayModeBar: false

    @plotTarget.classList.remove 'loading'

  getPlotData: ->
    xValues = (i for i in [0..@n])
    yValues = ( @binomialPMF(k, @n, @p) for k in xValues )

    data = [
      type: 'bar'
      x: xValues
      y: yValues
      name: 'Binomial'
      marker:
        color: '#7aa2f7'
    ]

    xProb = @binomialPMF(@x, @n, @p)
    data.push
      type: 'scatter'
      x: [@x, @x]
      y: [0, xProb]
      mode: 'lines'
      name: "x = #{@x}"
      line:
        color: '#f7768e'
        width: 2
        dash: 'dash'

    if @showPoisson
      lambda = @n * @p
      poissonY = ( Math.exp(-lambda) * Math.pow(lambda, k) / @factorial(k) for k in xValues )
      data.push
        type: 'scatter'
        x: xValues
        y: poissonY
        name: 'Poisson'
        line:
          color: '#9ece6a'

    if @showNormal
      mean = @n * @p
      std = Math.sqrt(@n * @p * (1 - @p))
      normalY = ( (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((val - mean) / std, 2)) for val in xValues )
      data.push
        type: 'scatter'
        x: xValues
        y: normalY
        name: 'Normal'
        line:
          color: '#bb9af7'

    data

  getPlotLayout: ->
    paper_bgcolor: 'rgba(0,0,0,0)'
    plot_bgcolor: 'rgba(0,0,0,0)'
    font:
      color: '#c0caf5'
      family: '"Space Mono", monospace'
    margin:
      t: 40
      r: 40
      l: 60
      b: 60
    showlegend: true
    xaxis:
      title: 'Number of Successes (k)'
      gridcolor: '#1a1b26'
      zeroline: false
    yaxis:
      title: 'Probability'
      gridcolor: '#1a1b26'
      zeroline: false

  togglePoisson: ->
    @showPoisson = not @showPoisson
    @updatePlot()

  toggleNormal: ->
    @showNormal = not @showNormal
    @updatePlot()

  calculateProbabilities: ->
    mean = @n * @p
    std = Math.sqrt(@n * @p * (1 - @p))
    prob = @binomialPMF(@x, @n, @p)
    cumProb = @binomialCDF(@x, @n, @p)

    @resultsTarget.innerHTML = """
      <h3>Results:</h3>
      <p>P(X = #{@x}) = #{prob.toFixed(4)}</p>
      <p>P(X ≤ #{@x}) = #{cumProb.toFixed(4)}</p>
      <p>E(X) = #{mean.toFixed(4)}</p>
      <p>σ = #{std.toFixed(4)}</p>
    """

  binomialPMF: (k, n, p) ->
    return 0 if k < 0 or k > n
    @nChooseK(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k)

  binomialCDF: (k, n, p) ->
    sum = 0
    for i in [0..k]
      sum += @binomialPMF(i, n, p)
    sum

  nChooseK: (n, k) ->
    @factorial(n) / (@factorial(k) * @factorial(n - k))

  factorial: (val) ->
    return 0 if val < 0
    return 1 if val is 0
    # return cached result if available
    return @factCache[val] if @factCache[val]?
    result = 1
    for i in [1..val]
      result *= i
    @factCache[val] = result
    result
