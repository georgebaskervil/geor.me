import { Controller } from "@hotwired/stimulus"

export default class HeadingHighlightController extends Controller
  connect: ->
    @highlightCurrentPage()

  highlightCurrentPage: ->
    currentPath = window.location.pathname
    links = @element.querySelectorAll('a')
    
    for link in links
      href = link.getAttribute('href')
      link.classList.remove('text-accent')
      
      if @isCurrentPath(href, currentPath)
        link.classList.add('text-accent')

  isCurrentPath: (href, currentPath) ->
    href = href.replace(/^\/|\/$/g, '')
    currentPath = currentPath.replace(/^\/|\/$/g, '')
    href == currentPath or currentPath.startsWith(href + '/')

  disconnect: ->
