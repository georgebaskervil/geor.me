# frozen_string_literal: true

class ProxyController < ApplicationController
  skip_forgery_protection only: [ :georlist ]

  require "net/http"
  require "uri"

  def georlist
    remote_url = "https://github.com/georgebaskervil/georlist/releases/download/blocklist/adguard-blocklist.txt"
    body = fetch_with_redirects(remote_url)

    if body
      render plain: body, content_type: "text/plain", layout: false
    else
      head :service_unavailable
    end
  end

  private

  # Fetch content with redirect following. For Range requests, follows redirects
  # first then makes a fresh Range request to the final URL (S3 requires this).
  def fetch_with_redirects(url, range: nil, limit: 10)
    raise ArgumentError, "Too many redirects" if limit <= 0

    final_url = resolve_redirects(url, limit)
    return nil unless final_url

    uri = URI.parse(final_url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = 10
    http.read_timeout = 10

    request = Net::HTTP::Get.new(uri)
    request["Range"] = range if range
    request["User-Agent"] = "Geor.me Proxy Bot"

    response = http.request(request)

    response.body if response.is_a?(Net::HTTPSuccess) || response.is_a?(Net::HTTPPartialContent)
  rescue StandardError => e
    Rails.logger.error "Proxy fetch error: #{e.message}"
    nil
  end

  # Follow redirects to get the final URL (without Range header)
  def resolve_redirects(url, limit)
    raise ArgumentError, "Too many redirects" if limit <= 0

    uri = URI.parse(url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = 10
    http.read_timeout = 10

    request = Net::HTTP::Head.new(uri)
    request["User-Agent"] = "Geor.me Proxy Bot"

    response = http.request(request)

    case response
    when Net::HTTPSuccess
      url
    when Net::HTTPRedirection
      location = response["location"]
      resolve_redirects(location, limit - 1)
    end
  rescue StandardError => e
    Rails.logger.error "Proxy resolve error: #{e.message}"
    nil
  end
end
