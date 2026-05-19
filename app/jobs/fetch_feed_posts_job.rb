# frozen_string_literal: true

class FetchFeedPostsJob < ApplicationJob
  queue_as :default

  def perform
    feed_url = "https://libreverse.geor.me/feed/"
    feed_cache_key = "feed_posts-#{feed_url}"

    require "net/http"
    require "uri"

    uri = URI.parse(feed_url)
    response = Net::HTTP.get_response(uri)

    if response.is_a?(Net::HTTPSuccess)
      feed = Feedjira.parse(response.body)

      posts = feed.entries.select { |entry| entry.author&.downcase&.include?("georgebaskervil") }.map do |entry|
        {
          title: entry.title,
          description: (entry.summary || entry.content).to_s.truncate(100),
          published_at: entry.published || entry.updated,
          updated_at: entry.updated || entry.published,
          content_html: entry.content,
          file_path: nil,
          slug: entry.url.split("/").last || entry.id,
          tags: entry.categories || [],
          section: "Blog",
          author: entry.author,
          preview_image: nil,
          format: :feed,
          external_url: entry.url
        }
      end

      Rails.cache.write(feed_cache_key, posts, expires_in: 1.hour)
    else
      Rails.logger.error "FetchFeedPostsJob: HTTP #{response.code}"
    end
  rescue StandardError => e
    Rails.logger.error "FetchFeedPostsJob: #{e.message}"
  end
end
