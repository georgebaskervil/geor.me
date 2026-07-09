# frozen_string_literal: true

module ApplicationHelper
  include BetterHtml::Helpers

  def domain
    "geor.me"
  end

  def theme_color
    "#161820"
  end

  def page_title(page_specific_title = nil)
    base_title = "George Baskerville's Personal Website"
    route_title = if page_specific_title.present?
      page_specific_title
    elsif request.path == "/"
      nil
    else
      request.path.split("/").reject(&:empty?).map(&:titleize).join(" - ")
    end

    route_title.present? ? "#{base_title} - #{route_title}" : base_title
  end

  def site_name
    "George Baskerville's Personal Website"
  end

  def page_specific_title(article = nil)
    if article.present? && article[:title].present?
      article[:title]
    elsif request.path == "/"
      nil
    else
      request.path.split("/").reject(&:empty?).map(&:titleize).join(" - ")
    end
  end

  # Manifest path without asset_host — required for SVG feImage (Safari rejects cross-origin CDN URLs).
  def same_origin_vite_asset_path(name, **options)
    ViteRuby.instance.manifest.path_for(name, **options)
  end

  def fetch_georlist_preview
    Rails.cache.fetch("georlist_preview", expires_in: 1.hour) do
      url = "https://github.com/georgebaskervil/georlist/releases/download/blocklist/adguard-blocklist.txt"
      body = fetch_with_redirects(url, range: "bytes=0-4095")
      body ? body.lines.first(20).join : "Preview unavailable"
    end
  end

  def fetch_uwuifier_stats
    GithubRepoStatsService.fetch("georgebaskervil/uwuifier")
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

    response.body if response.is_a?(Net::HTTPSuccess) || response.is_a?(Net::HTTPPartialContent)
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
    end
  rescue StandardError
    nil
  end
end
