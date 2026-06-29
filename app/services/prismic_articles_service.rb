# frozen_string_literal: true

require "net/http"
require "json"

class PrismicArticlesService
  API_URL = ENV.fetch("PRISMIC_API_URL", "https://geor-me.cdn.prismic.io/api/v1")
  # Media/asset files (PDFs, images) are served via our CDN host; the API itself is NOT
  # proxied (that would cache API responses across users), so only non-/api paths are rewritten.
  PRISMIC_ASSET_HOST = "geor-me.cdn.prismic.io"
  ASSET_CDN_HOST = ENV.fetch("PRISMIC_ASSET_HOST", "cms.geor.me")
  DOCUMENT_TYPES = %w[blog_post pdf-post].freeze
  TEST_FIXTURE = Rails.root.join("test/fixtures/files/prismic_search.json")

  class << self
    def fetch_articles
      new.fetch_articles
    end

    def checksum
      new.checksum
    end

    def last_modified
      new.last_modified
    end
  end

  def fetch_articles
    Rails.cache.fetch("prismic_articles-#{checksum}") do
      search_results["results"].filter_map { |document| map_document(document) }
        .sort_by { |article| article[:published_at] }
        .reverse
    end
  end

  def checksum
    search_results["version"].to_s
  end

  def last_modified
    search_results["results"].filter_map do |document|
      parse_time(document["last_publication_date"])
    end.max
  end

  private

  def search_results
    @search_results ||= Rails.cache.fetch("prismic_search-#{master_ref}", expires_in: 5.minutes) do
      if Rails.env.test?
        JSON.parse(File.read(TEST_FIXTURE))
      else
        query = URI.encode_www_form_component(
          "[[any(document.type, #{DOCUMENT_TYPES.to_json})]]"
        )
        get_json(
          "#{API_URL}/documents/search?ref=#{master_ref}&q=#{query}&pageSize=100&lang=en-gb"
        )
      end
    end
  end

  def master_ref
    @master_ref ||= Rails.cache.fetch("prismic_master_ref", expires_in: 5.minutes) do
      if Rails.env.test?
        "test-ref"
      else
        refs = get_json(API_URL)["refs"] || []
        master = refs.find { |ref| ref["isMasterRef"] }
        master&.fetch("ref") || raise("Prismic master ref not found")
      end
    end
  end

  def get_json(url)
    uri = URI(url)
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 5, read_timeout: 10) do |http|
      http.get(uri.request_uri)
    end
    raise "Prismic API error #{response.code} for #{url}" unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  end

  def map_document(document)
    type = document["type"]
    data = document.dig("data", type) || {}
    slug = document_slug(document)
    published_at = document_date(data) || parse_time(document["first_publication_date"])&.to_date
    return nil unless slug && published_at

    base = {
      title: PrismicStructuredText.to_plain_text(data["title"]),
      description: PrismicStructuredText.to_plain_text(data["subtitle"]),
      published_at: published_at,
      updated_at: parse_time(document["last_publication_date"])&.to_date || published_at,
      slug: slug,
      tags: Array(document["tags"]).map(&:to_s),
      section: "Blog",
      author: "George Baskerville",
      prismic_id: document["id"]
    }

    case type
    when "blog_post"
      base.merge(
        content_html: PrismicStructuredText.to_html(data["body"]),
        file_path: nil,
        file_url: nil,
        format: :markdown
      )
    when "pdf-post"
      file_url = rewrite_asset_url(data.dig("link_to_media", "value", "file", "url"))
      return nil if file_url.blank?

      base.merge(
        content_html: nil,
        file_path: nil,
        file_url: file_url,
        format: :pdf
      )
    end
  end

  def document_slug(document)
    raw = document["uid"].presence || document["slugs"]&.first
    raw.to_s.delete("?").presence
  end

  def document_date(data)
    value = data.dig("date", "value")
    return nil if value.blank?

    case data.dig("date", "type")
    when "Date"
      Date.parse(value)
    when "Timestamp"
      Time.parse(value).to_date
    else
      Time.parse(value).to_date
    end
  rescue ArgumentError, TypeError
    nil
  end

  def parse_time(value)
    return nil if value.blank?

    Time.parse(value)
  rescue ArgumentError, TypeError
    nil
  end

  # Rewrite Prismic media/asset links to our CDN host, leaving API links untouched.
  def rewrite_asset_url(url)
    return url if url.blank?

    uri = URI.parse(url)
    return url unless uri.host == PRISMIC_ASSET_HOST
    return url if uri.path.start_with?("/api")

    uri.host = ASSET_CDN_HOST
    uri.to_s
  rescue URI::InvalidURIError
    url
  end
end
