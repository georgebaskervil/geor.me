class ProxyController < ApplicationController
  skip_forgery_protection only: [ :umami_script ]

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
end
