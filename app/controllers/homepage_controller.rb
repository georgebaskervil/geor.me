# frozen_string_literal: true

class HomepageController < ApplicationController
  helper_method :fetch_georlist_preview

  def index
  end

  def fetch_georlist_preview
    Rails.cache.fetch("georlist_preview", expires_in: 1.hour) do
      url = "https://github.com/georgebaskervil/georlist/releases/download/blocklist/adguard-blocklist.txt"
      body = fetch_with_redirects(url, range: "bytes=0-4095")
      body ? body.lines.first(20).join : "Preview unavailable"
    end
  end

  private

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
    request["User-Agent"] = "Geor.me Bot"

    response = http.request(request)

    if response.is_a?(Net::HTTPSuccess) || response.is_a?(Net::HTTPPartialContent)
      response.body
    else
      nil
    end
  rescue StandardError
    nil
  end

  def resolve_redirects(url, limit)
    raise ArgumentError, "Too many redirects" if limit <= 0

    uri = URI.parse(url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = 10
    http.read_timeout = 10

    request = Net::HTTP::Head.new(uri)
    request["User-Agent"] = "Geor.me Bot"

    response = http.request(request)

    case response
    when Net::HTTPSuccess
      url
    when Net::HTTPRedirection
      resolve_redirects(response["location"], limit - 1)
    else
      nil
    end
  rescue StandardError
    nil
  end
end
