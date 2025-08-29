# frozen_string_literal: true

require "nokogiri"
require "uri"

class TurboPreloadMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    status, headers, response = @app.call(env)

    # Only process HTML responses
    return [ status, headers, response ] unless html_response?(headers)

    # Handle different response types (ActionController::Live, Rack::BodyProxy, etc.)
    response_body = extract_response_body(response)
    return [ status, headers, response ] if response_body.empty?

    # Parse and modify HTML with Nokogiri
    request_host = begin
                     Rack::Request.new(env).host
    rescue StandardError
                     nil
    end
    modified_body = add_turbo_preload(response_body, request_host)

    # Update Content-Length header if necessary
    headers["Content-Length"] = modified_body.bytesize.to_s if headers["Content-Length"]

    [ status, headers, [ modified_body ] ]
  end

  private

  def html_response?(headers)
    headers["Content-Type"]&.include?("text/html")
  end

  def extract_response_body(response)
    # Handle Rails response types (e.g., Array, Rack::BodyProxy, ActionController::Live)
    if response.is_a?(Array)
      response.join
    elsif response.respond_to?(:body)
      response.body
    elsif response.respond_to?(:each)
      response.to_a.join
    else
      ""
    end
  end

  def add_turbo_preload(body, request_host = nil)
    # Parse HTML with Nokogiri
    doc = Nokogiri::HTML(body)

    # Skip if no HTML document (e.g., partial fragments)
    return body unless doc.html?

    # Select all <a> tags and add data-turbo-preload
    doc.css("a[href]").each do |link|
      href = link["href"].to_s.strip
      next if href.empty?

      # Ignore anchors and javascript/data/etc. schemes
      begin
        uri = URI.parse(href)
      rescue URI::InvalidURIError
        next
      end

      # Skip non-http(s) schemes (mailto:, tel:, javascript:, data:, etc.)
      next if uri.scheme && !%w[http https].include?(uri.scheme)

      # If absolute http(s) URL, ensure it's same-origin; otherwise skip
      next if uri.scheme && uri.host && request_host && uri.host != request_host

      # Work with the path component only for routing/ext checks
      path = uri.path.presence || href

      # Only consider root-relative internal paths
      next unless path.start_with?("/")

      # Skip obvious asset files (has an extension)
      ext = File.extname(path).to_s.downcase
      next if ext.present?

      # Optionally skip known asset namespaces quickly
      next if path.start_with?("/vite/")

      # Skip app-specific dynamic routes
      next if dynamic_route?(path)

      # Check if path is a valid GET route (indicating an actual page)
      begin
        Rails.application.routes.recognize_path(path, method: :get)
        link["data-turbo-preload"] = "" unless link["data-turbo-preload"]
      rescue ActionController::RoutingError
        next
      end
    end

    doc.to_html
  end

  def dynamic_route?(href)
    # Customize this to match your dynamic routes (e.g., user-specific, carts, etc.)
    %w[/cart /login /profile /checkout /api].any? { |pattern| href.match?(pattern) }
  end
end

Rails.application.config.middleware.use TurboPreloadMiddleware
