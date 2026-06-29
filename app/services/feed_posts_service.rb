# frozen_string_literal: true

require "net/http"
require "nokogiri"
require "feedjira"

class FeedPostsService
  # libreverse.geor.me/feed/ 301s to libreverse.io/feed/; Net::HTTP.get_response does not
  # follow redirects, so point at the canonical host directly.
  FEED_URL = "https://libreverse.io/feed/"
  CACHE_KEY = "feed_posts"
  CACHE_TTL = 1.hour

  class << self
    def fetch
      if cacheable?
        Rails.cache.fetch("#{CACHE_KEY}-#{FEED_URL}", expires_in: CACHE_TTL) { fetch_from_network }
      else
        fetch_from_network
      end
    rescue StandardError => e
      Rails.logger.error "FeedPostsService: #{e.message}"
      []
    end

    def refresh!
      posts = fetch_from_network
      Rails.cache.write("#{CACHE_KEY}-#{FEED_URL}", posts, expires_in: CACHE_TTL) if cacheable?
      posts
    end

    def fetch_from_network
      uri = URI.parse(FEED_URL)
      response = Net::HTTP.get_response(uri)

      unless response.is_a?(Net::HTTPSuccess)
        Rails.logger.error "FeedPostsService: HTTP #{response.code}"
        return []
      end

      parse_feed(response.body)
    end

    private

    def parse_feed(body)
      feed = Feedjira.parse(body)

      feed.entries.select { |entry| entry.author&.downcase&.include?("georgebaskervil") }.map do |entry|
        {
          title: plain_text(entry.title),
          description: plain_text(entry.summary || entry.content).truncate(100),
          published_at: entry.published || entry.updated,
          updated_at: entry.updated || entry.published,
          content_html: entry.content,
          file_path: nil,
          slug: entry.url.split("/").last || entry.id,
          tags: entry.categories || [],
          section: "Blog",
          author: entry.author,
          format: :feed,
          external_url: entry.url
        }
      end
    rescue StandardError => e
      Rails.logger.error "FeedPostsService: failed to parse feed: #{e.message}"
      []
    end

    def plain_text(value)
      return "" if value.blank?

      Nokogiri::HTML.fragment(value.to_s).text.squish
    end

    def cacheable?
      !Rails.cache.is_a?(ActiveSupport::Cache::NullStore)
    end
  end
end
