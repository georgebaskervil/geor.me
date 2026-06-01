import { Controller } from "@hotwired/stimulus"
import { application } from "./application"
import { loadWebLLM } from "../utils/loadWebLLM"

MODEL_ID = "SmolLM2-360M-Instruct-q4f16_1-MLC"

export default class extends Controller
  @targets = ["userInput", "chatDisplay", "sendButton", "loadingIndicator"]

  connect: ->
    @modelLoaded = false
    @initStarted = false
    @messages = [
      { role: "system", content: "You are a helpful assistant." }
    ]
    @onDistractionToggle = @handleDistractionMode.bind(@)
    document.addEventListener "distractionmode:toggle", @onDistractionToggle
    if @hasLoadingIndicatorTarget
      @loadingIndicatorTarget.textContent = "Loading model…"
      @loadingIndicatorTarget.style.display = "block"
    if @hasSendButtonTarget
      @sendButtonTarget.disabled = true
    # Toggle fires before this deferred controller connects; start load if windows are already open.
    @initIfDistractionModeVisible()

  disconnect: ->
    document.removeEventListener "distractionmode:toggle", @onDistractionToggle

  handleDistractionMode: (event) ->
    return unless event.detail?.enabled
    @initEngine()

  initIfDistractionModeVisible: ->
    scope = document.getElementById("distractionmode-scope")
    return unless scope
    dm = application.getControllerForElementAndIdentifier(scope, "distractionmode")
    @initEngine() if dm?.areWindowsVisible

  initEngine: ->
    return if @initStarted
    @initStarted = true

    unless navigator.gpu?
      @showLoadError "WebGPU is not available. Use Chrome or Edge with WebGPU enabled."
      return

    @setLoadingMessage "Loading model…"

    loadWebLLM().then(({ CreateMLCEngine }) =>
      CreateMLCEngine(
        MODEL_ID,
        {
          initProgressCallback: (report) =>
            text = report.text ? "Loading model…"
            if report.progress?
              @setLoadingMessage "#{text} (#{Math.round(report.progress * 100)}%)"
            else
              @setLoadingMessage text
        },
      )
    ).then((engine) =>
      @engine = engine
      @modelLoaded = true
      @hideLoading()
      if @hasSendButtonTarget
        @sendButtonTarget.disabled = false
    ).catch((err) =>
      console.error err
      @showLoadError "Failed to load model: #{err?.message ? err}"
    )

  sendMessage: (ev) ->
    ev.preventDefault()
    unless @modelLoaded
      alert "Model is still loading. Please wait a moment."
      return

    userContent = @userInputTarget.value.trim()
    return unless userContent.length > 0

    @appendMessage "user", userContent
    @messages.push { role: "user", content: userContent }
    @userInputTarget.value = ""
    if @hasSendButtonTarget
      @sendButtonTarget.disabled = true

    assistantEl = @appendMessage "assistant", ""
    @streamReply(assistantEl)

  streamReply: (assistantEl) ->
    fullReply = ""
    @engine.chat.completions.create({
      messages: @messages
      stream: true
      max_tokens: 500
      temperature: 0.7
    }).then((chunks) =>
      pump = =>
        chunks.next().then(({ done, value }) =>
          if done
            @messages.push { role: "assistant", content: fullReply }
            if @hasSendButtonTarget
              @sendButtonTarget.disabled = false
            return
          delta = value?.choices?[0]?.delta?.content ? ""
          if delta.length > 0
            fullReply += delta
            assistantEl.textContent = fullReply
            @scrollChatToBottom()
          pump()
        ).catch((err) =>
          console.error err
          assistantEl.textContent = "Error: #{err?.message ? err}"
          if @hasSendButtonTarget
            @sendButtonTarget.disabled = false
        )
      pump()
    ).catch((err) =>
      console.error err
      assistantEl.textContent = "Error: #{err?.message ? err}"
      if @hasSendButtonTarget
        @sendButtonTarget.disabled = false
    )

  appendMessage: (role, content) ->
    el = document.createElement("div")
    el.className = "#{role}-message"
    el.textContent = content
    @chatDisplayTarget.appendChild(el)
    @scrollChatToBottom()
    el

  scrollChatToBottom: ->
    container = @chatDisplayTarget.closest(".deepseek-chat-app")
    if container?
      container.scrollTop = container.scrollHeight

  setLoadingMessage: (text) ->
    return unless @hasLoadingIndicatorTarget
    @loadingIndicatorTarget.textContent = text
    @loadingIndicatorTarget.style.display = "block"

  hideLoading: ->
    return unless @hasLoadingIndicatorTarget
    @loadingIndicatorTarget.style.display = "none"

  showLoadError: (text) ->
    @initStarted = false
    if @hasLoadingIndicatorTarget
      @loadingIndicatorTarget.textContent = text
      @loadingIndicatorTarget.style.display = "block"
    if @hasSendButtonTarget
      @sendButtonTarget.disabled = true
