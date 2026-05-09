# frozen_string_literal: true

class ProxyController < ApplicationController
  skip_forgery_protection only: [ :umami_script, :georlist ]

  require "net/http"
  require "uri"

  def umami_script
    remote_url = "https://cloud.umami.is/script.js"
    uri = URI.parse(remote_url)
    res = Net::HTTP.get_response(uri)

    if res.is_a?(Net::HTTPSuccess)
      render plain: res.body, content_type: res.content_type, layout: false
    else
      head res.code
    end
  end

  def georlist
    remote_url = "https://github.com/georgebaskervil/georlist/releases/download/blocklist/adguard-blocklist.txt"
    uri = URI.parse(remote_url)
    res = Net::HTTP.get_response(uri)

    if res.is_a?(Net::HTTPSuccess)
      render plain: res.body, content_type: "text/plain", layout: false
    else
      head res.code
    end
  end
end
