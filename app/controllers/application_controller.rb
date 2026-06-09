# frozen_string_literal: true

require "digest"

class ApplicationController < ActionController::Base
  include EnhancedCaching
  include RouteStylesheets

  before_action :set_custom_headers
  before_action :load_images
  before_action :load_articles
  before_action :set_all_posts
  before_action :set_latest_posts
  before_action :set_article, only: [ :show ]
  after_action :apply_automatic_caching

  def show
    return unless @article.nil?

    Rails.logger.warn "Article not found with identifier: #{params[:id]}"
    render plain: "Article not found", status: :not_found
  end

  private

  def set_custom_headers
    # Keep cross-origin isolation consistently disabled across pages.
    # This avoids COEP/COOP navigation mismatches in browsers and keeps
    # third-party embeds (e.g. Umami share) working.
    response.set_header("Cross-Origin-Embedder-Policy", "unsafe-none")
    response.set_header("Cross-Origin-Opener-Policy", "unsafe-none")
    response.set_header("X-UA-Compatible", "IE=edge,chrome=1")

    # Set enhanced ETag for content-based caching (used by automatic caching system)
    return unless Rails.env.production? && request.get? && (request.format.html? || request.accepts.include?("text/html"))

      # Use enhanced caching methods for better performance
      etag_content = Digest::SHA256.hexdigest([ articles_checksum, images_checksum ].join(":"))
      last_modified = [ articles_last_modified, images_last_modified ].max

      # Use enhanced fresh_when for optimal caching
      fresh_when_enhanced(
        etag_content: etag_content,
        last_modified: last_modified,
        public: true
      )
  end

  def load_images
    # Generate a unique cache key based on image files' modification times
    images_cache_key = "images_list-#{images_checksum}"

    @images = Rails.cache.fetch(images_cache_key) do
      glob_pattern = Rails.root.join("app/photos/AVIFs/**/*.avif")

      avif_dir = Rails.root.join("app/photos/AVIFs")
      unless Dir.exist?(avif_dir)
        Rails.logger.warn "Directory app/photos/AVIFs does not exist."
        return []
      end

      files = Dir.glob(glob_pattern)
      mapped_files = files.map { |f| File.basename(f, ".avif") }

      mapped_files
    end
  end

  def load_articles
    @articles = PrismicArticlesService.fetch_articles
  rescue StandardError => e
    Rails.logger.error "Failed to load Prismic articles: #{e.message}"
    @articles = []
  end

  def set_article
    identifier = params[:id]
    @article = @articles.find { |article| article[:slug] == identifier }
  end

  def set_latest_posts
    @latest_posts = @all_posts&.first(4) || []
  end

  def set_all_posts
    local_posts = @articles || []
    feed_posts = fetch_feed_posts

    # Merge feed posts with local posts, sorting by published_at
    @all_posts = (local_posts + feed_posts).sort_by { |post| post[:published_at] }.reverse
  end

  def fetch_feed_posts
    @feed_posts ||= FeedPostsService.fetch
  end

  # Generates a checksum based on the filenames and their last modified times
  def images_checksum
    Rails.cache.fetch("images_checksum", expires_in: 10.seconds) do
      files = Rails.root.glob("app/photos/AVIFs/**/*.avif")
      Digest::MD5.hexdigest(
        files.sort.map { |f| "#{f}:#{File.mtime(f).to_i}" }.join("|")
      )
    end
  end

  def articles_checksum
    Rails.cache.fetch("articles_checksum", expires_in: 10.seconds) do
      PrismicArticlesService.checksum
    end
  rescue StandardError
    "prismic-unavailable"
  end

  # Helper methods for cache keys
  def articles_last_modified
    PrismicArticlesService.last_modified
  rescue StandardError
    nil
  end

  def images_last_modified
    photos_dir = Rails.root.join("app/photos/AVIFs")
    return nil unless Dir.exist?(photos_dir)

    Dir.glob(photos_dir.join("**/*.avif")).map { |f| File.mtime(f) }.max
  end

  # Intelligent automatic caching based on response characteristics
  def apply_automatic_caching
    return if Rails.env.development? || Rails.env.test?
    return if response.headers["Cache-Control"].present? # Skip if already set
    return if skip_automatic_caching? # Skip if controller opted out
    return unless Rails.application.config.automatic_caching.enabled

    # Check for paths that should never be cached
    if Rails.application.config.automatic_caching.no_cache_patterns.any? { |pattern| request.path.match?(pattern) }
      response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
      response.headers["Pragma"] = "no-cache"
      response.headers["Expires"] = "0"
      log_caching_decision("no-cache", "matches no-cache pattern") if should_log_decisions?
      return
    end

    # Determine response characteristics
    response_size = estimate_response_size
    is_get_request = request.get?
    has_sensitive_data = sensitive_response_data?

    # Apply caching strategy based on characteristics
    if !is_get_request
      # Don't cache non-GET requests
      response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
      response.headers["Pragma"] = "no-cache"
      response.headers["Expires"] = "0"
      log_caching_decision("no-cache", "non-GET request") if should_log_decisions?

    elsif has_sensitive_data
      # Sensitive data - minimal caching
      duration = Rails.application.config.automatic_caching.durations.sensitive
      set_cache_headers(
        duration: duration,
        public: false,
        must_revalidate: true
      )
      log_caching_decision("sensitive", "#{duration} private") if should_log_decisions?

    elsif response_size <= Rails.application.config.automatic_caching.turbocache_max_size
      # Small responses - perfect for turbocache
      duration = Rails.application.config.automatic_caching.durations.turbocache
      set_turbocache_headers(duration: duration, must_revalidate: true)
      log_caching_decision("turbocache", "#{duration} public") if should_log_decisions?

    elsif response_size > Rails.application.config.automatic_caching.large_response_min_size
      # Large responses - longer cache duration
      duration = Rails.application.config.automatic_caching.durations.large_public
      set_cache_headers(
        duration: duration,
        public: true,
        must_revalidate: true,
        stale_while_revalidate: 300.seconds
      )
      log_caching_decision("large", "#{duration} public") if should_log_decisions?

    else
      # Medium responses - standard caching
      duration = Rails.application.config.automatic_caching.durations.medium_public
      set_cache_headers(
        duration: duration,
        public: true,
        must_revalidate: true,
        stale_while_revalidate: 60.seconds
      )
      log_caching_decision("medium", "#{duration} public") if should_log_decisions?
    end
  end

  # Estimate response size for caching decisions
  def estimate_response_size
    body = response.body
    return 0 unless body

    # If body is a string, get its size
    return body.bytesize if body.respond_to?(:bytesize)

    # If body responds to join (like ActionView output), join and measure
    return body.join.bytesize if body.respond_to?(:join)

    # Default estimate for unknown body types
    1024 # 1KB default
  end

  # Check if response contains sensitive data that shouldn't be cached long
  def sensitive_response_data?
    # Check configured sensitive patterns
    Rails.application.config.automatic_caching.sensitive_patterns.any? do |pattern|
      request.path.match?(pattern)
    end
  end

  # Check if caching decisions should be logged
  def should_log_decisions?
    Rails.application.config.automatic_caching.log_decisions
  end

  # Log caching decisions for debugging
  def log_caching_decision(strategy, details)
    Rails.logger.info "[AutoCache] #{request.method} #{request.path} -> #{strategy} (#{details})"
  end
end
