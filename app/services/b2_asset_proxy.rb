# frozen_string_literal: true

require "net/http"

class B2AssetProxy
  IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"
  DEFAULT_CACHE_CONTROL = "public, max-age=3600"

  Response = Struct.new(:status, :headers, :body, keyword_init: true)

  def fetch(path, range: nil)
    uri = URI(B2AssetsStorage.public_object_url(path))
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = 5
    http.read_timeout = 60

    request = Net::HTTP::Get.new(uri)
    request["Range"] = range if range.present?

    response = http.request(request)

    case response
    when Net::HTTPNotFound
      nil
    when Net::HTTPSuccess, Net::HTTPPartialContent
      Response.new(
        status: response.is_a?(Net::HTTPPartialContent) ? :partial_content : :ok,
        headers: response_headers(path, response),
        body: response.body
      )
    else
      Rails.logger.error "B2AssetProxy: HTTP #{response.code} for #{uri}"
      :bad_gateway
    end
  rescue StandardError => e
    Rails.logger.error "B2AssetProxy: #{e.class} #{e.message}"
    :bad_gateway
  end

  private

  def response_headers(path, response)
    headers = {
      "Content-Type" => response["Content-Type"].presence || Rack::Mime.mime_type(File.extname(path)) || "application/octet-stream",
      "Cache-Control" => cache_control_for(path),
      "Accept-Ranges" => response["Accept-Ranges"].presence || "bytes"
    }
    headers["ETag"] = response["ETag"] if response["ETag"].present?
    headers["Content-Length"] = response["Content-Length"] if response["Content-Length"].present?
    headers["Content-Range"] = response["Content-Range"] if response["Content-Range"].present?
    headers
  end

  def cache_control_for(path)
    if path.start_with?("assets/") && path.match?(/-[A-Za-z0-9_-]{6,}\.[A-Za-z0-9]+\z/)
      IMMUTABLE_CACHE_CONTROL
    else
      DEFAULT_CACHE_CONTROL
    end
  end
end
