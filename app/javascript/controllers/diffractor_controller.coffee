import { Controller } from "@hotwired/stimulus"
import Plotly from "plotly.js-dist"

export default class extends Controller
  @targets = ["plot", "wavelength", "slitCount", "slitWidth", "slitSpacing"]
  @values = {
    wavelength: Number,
    slitCount: Number,
    slitWidth: Number,
    slitSpacing: Number,
    isDB: Boolean
  }

  connect: ->
    @defaults()
    @update()

  defaults: ->
    @wavelengthValue = 650 # Red light (nm)
    @slitCountValue = 10
    @slitWidthValue = 1
    @slitSpacingValue = 3
    @isDBValue = false
    @c = 2.998e8 # Speed of light
    @maxSlits = 100
    @maxSpacing = 20
    @maxWidth = 5

  update: ->
    lambda = @wavelengthValue * 1e-9
    k = 2 * Math.PI / lambda
    w = @slitWidthValue * lambda
    s = @slitSpacingValue * lambda

    theta = @linspace(-Math.PI/2, Math.PI/2, 1000)
    Is = theta.map((t) -> Math.pow(@sinN(0.5 * k * s * Math.sin(t), @slitCountValue), 2))
    Iw = theta.map((t) -> Math.pow(@sinc(0.5 * k * w * Math.sin(t)), 2))
    I = Is.map((val, i) -> val * Iw[i])

    data = [{
      x: theta.map((t) -> t * 180 / Math.PI),
      y: if @isDBValue then @dBm(I) else I,
      type: 'scatter',
      mode: 'lines',
      name: 'Diffraction Pattern'
    }]

    layout = {
      title: "Grating Fraunhofer Far Field Diffraction",
      xaxis: {
        title: "θ°",
        range: [-90, 90]
      },
      yaxis: {
        title: if @isDBValue then "Normalized wave power (dBm)" else "Normalized wave power",
        range: if @isDBValue then [-60, 0] else [0, 1]
      }
    }

    Plotly.newPlot(@plotTarget, data, layout)

  sinc: (x) ->
    return 1 if x is 0
    Math.sin(x) / x

  sinN: (x, N) ->
    return N if x is 0
    Math.sin(N * x) / (N * Math.sin(x))

  dBm: (values) ->
    max = Math.max(...values)
    values.map (x) ->
      return null if x <= 0
      10 * Math.log10(x) - 10 * Math.log10(max)

  linspace: (start, stop, num) ->
    step = (stop - start) / (num - 1)
    Array.from({length: num}, (_, i) -> start + step * i)

  toggleDB: ->
    @isDBValue = !@isDBValue
    @update()