import { Controller } from "@hotwired/stimulus"
import { Wllama, LoggerWithoutDebug } from "@wllama/wllama/esm/index.js"
import multiThreadWllama from "@wllama/wllama/esm/multi-thread/wllama.wasm?url"
import singleThreadWllama from "@wllama/wllama/esm/single-thread/wllama.wasm?url"

export default class extends Controller
  @targets = ["userInput", "chatDisplay", "sendButton", "loadingIndicator"]

  connect: ->
    @modelLoaded = false
    @messages = [
      { role: "system", content: "You are a helpful assistant." }
    ]
    document.addEventListener "distractionmode:toggle", @handleDistractionMode.bind(@)
    # Optionally show the loading indicator immediately
    if @hasLoadingIndicatorTarget
      @loadingIndicatorTarget.textContent = "Loading model, please wait..."
      @loadingIndicatorTarget.style.display = "block"
    # Disable the send button until load completes
    if @hasSendButtonTarget
      @sendButtonTarget.disabled = true

  disconnect: ->
    document.removeEventListener "distractionmode:toggle", @handleDistractionMode.bind(@)

  handleDistractionMode: ->
    @initWllama()

  initWllama: ->
    # Point to the files hosted at r2.geor.me
    fullPart1Url = "https://r2.geor.me/browserdeepseek-00001-of-00004.gguf"
    fullPart2Url = "https://r2.geor.me/browserdeepseek-00002-of-00004.gguf"
    fullPart3Url = "https://r2.geor.me/browserdeepseek-00003-of-00004.gguf"
    fullPart4Url = "https://r2.geor.me/browserdeepseek-00004-of-00004.gguf"

    @instance = new Wllama(
      {
        "single-thread/wllama.wasm": singleThreadWllama,
        "multi-thread/wllama.wasm": multiThreadWllama
      },
      {
        parallelDownloads: 4,
        logger: LoggerWithoutDebug,
      },
    )
    @instance.loadModelFromUrl(fullPart1Url, fullPart2Url, fullPart3Url, fullPart4Url,
      {
        n_ctx: 1024,
      }
    ).then =>
      @modelLoaded = true
      if @hasLoadingIndicatorTarget
        @loadingIndicatorTarget.style.display = "none"
      if @hasSendButtonTarget
        @sendButtonTarget.disabled = false

  sendMessage: (ev) ->
    ev.preventDefault()
    unless @modelLoaded
      alert "Model is still loading. Please wait a moment."
      return

    userContent = @userInputTarget.value.trim()
    return unless userContent.length > 0

    @messages.push({ role: "user", content: userContent })
    @userInputTarget.value = ""

    @instance.createChatCompletion(@messages,
      nPredict: 500,
      sampling:
        temp: 0.7
        top_p: 0.9
        top_k: 40
    ).then (reply) =>
      @messages.push({ role: "assistant", content: reply })
      @renderChat(reply)

  transformChatMLToHTML: (chatml) ->
    # Example: turn <think> tags into .thinking-message divs, etc.
    chatml
      .replace(/<think>/g, '<div class="thinking-message">')
      .replace(/<\/think>/g, '</div>')
      .replace(/<assistant>/g, '<div class="assistant-message">')
      .replace(/<\/assistant>/g, '</div>')
      .replace(/<user>/g, '<div class="user-message">')
      .replace(/<\/user>/g, '</div>')

  renderChat: (assistantReply) ->
    htmlContent = @transformChatMLToHTML(assistantReply)
    @chatDisplayTarget.insertAdjacentHTML("beforeend", htmlContent)