# frozen_string_literal: true

require "nokogiri"
require "kramdown"
require "yaml"
require "digest"
require "date" # Added to handle Date parsing
require "feedjira"

class ApplicationController < ActionController::Base
  include EnhancedCaching

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
    # Generate a unique cache key based on article files' modification times
    articles_cache_key = "articles_list-#{articles_checksum}"

    @articles = Rails.cache.fetch(articles_cache_key) do
      md_glob = Rails.root.join("app/articles/**/*.md")
      pdf_glob = Rails.root.join("app/articles/**/*.pdf")

      articles_dir = Rails.root.join("app/articles")
      unless Dir.exist?(articles_dir)
        Rails.logger.warn "Directory app/articles does not exist."
        return []
      end

      article_files = Dir.glob(md_glob) + Dir.glob(pdf_glob)

      articles = article_files.map do |file|
        ext = File.extname(file).downcase

        if ext == ".md"
          content = File.read(file)
          parts = content.split(/^---$/, 3)

          if parts.size >= 3
            front_matter = parts[1]
            body = parts[2]

            begin
              metadata = YAML.safe_load(front_matter, permitted_classes: [ Date ]) # Updated safe_load with permitted_classes

              # Extract filename as slug if not specified; strip any question marks
              slug = (metadata["slug"] || File.basename(file, ".md")).to_s.delete("?")

              # Process tags from comma-separated string or array
              tags = if metadata["tags"].is_a?(String)
                      metadata["tags"].split(",").map(&:strip)
              elsif metadata["tags"].is_a?(Array)
                      metadata["tags"]
              else
                      []
              end

              # Get the section or default to 'Blog'
              section = metadata["section"] || "Blog"

              # Handle the updated_at date
              updated_at = metadata["updatedAt"] || metadata["publishedAt"]

              {
                title: metadata["title"],
                description: metadata["description"],
                published_at: metadata["publishedAt"], # Directly use the Date object
                updated_at: updated_at,
                content_html: Nokogiri::HTML::DocumentFragment.parse(Kramdown::Document.new(body).to_html).tap do |doc|
                  doc.traverse do |node|
                    if node.element?
                      existing_classes = node["class"] || ""
                      node["class"] = (existing_classes.split + [ "posts-text" ]).uniq.join(" ")
                    end
                  end
                end.to_html,
                file_path: file,
                slug: slug,
                tags: tags,
                section: section,
                author: metadata["author"] || "George Baskerville",
                format: :markdown
              }
            rescue StandardError => e
              Rails.logger.warn "Error parsing YAML front matter in #{file}: #{e.message}"
              nil
            end
          else
            Rails.logger.warn "No valid front matter found in #{file}"
            nil
          end
        elsif ext == ".pdf"
          # Optional sidecar metadata: basename.yml or basename.yaml
          base = file.delete_suffix(".pdf")
          sidecar = [ "#{base}.yml", "#{base}.yaml" ].find { |p| File.exist?(p) }

          metadata = {}
          if sidecar
            begin
              metadata = YAML.safe_load(File.read(sidecar), permitted_classes: [ Date ]) || {}
            rescue StandardError => e
              Rails.logger.warn "Error parsing PDF sidecar metadata #{sidecar}: #{e.message}"
              metadata = {}
            end
          end

          # Extract filename as slug if not specified; strip any question marks
          raw_base_name = File.basename(file, ".pdf")
          slug = (metadata["slug"] || raw_base_name).to_s.delete("?")
          raw_tags = metadata["tags"]
          tags = if raw_tags.is_a?(String)
            raw_tags.split(",").map(&:strip)
          elsif raw_tags.is_a?(Array)
            raw_tags
          else
            []
          end
          section = metadata["section"] || "Blog"
          published_at = metadata["publishedAt"] || File.mtime(file).to_date
          updated_at = metadata["updatedAt"] || published_at

          {
            title: metadata["title"] || raw_base_name.tr("-_,", "   ").split.map(&:capitalize).join(" "),
            description: metadata["description"],
            published_at: published_at,
            updated_at: updated_at,
            content_html: nil, # Rendered via PDF embed in view
            file_path: file,
            slug: slug,
            tags: tags,
            section: section,
            author: metadata["author"] || "George Baskerville",
            format: :pdf
          }
        end
      end.compact

      # Sort articles by published_at date in descending order
      articles.sort_by { |article| article[:published_at] }.reverse
    end
  end

  def set_article
    identifier = params[:id]
    @article = @articles.find do |article|
  base = File.basename(article[:file_path], File.extname(article[:file_path]))
  article[:slug] == identifier || base == identifier
    end
  end

  # Resolve path only if it is a regular file under app/articles (blocks traversal).
  def safe_articles_file_path(path)
    return if path.blank?

    articles_root = Rails.root.join("app/articles").expand_path
    absolute = File.expand_path(path)
    return unless File.file?(absolute)

    real = File.realpath(absolute)
    prefix = "#{articles_root}#{File::SEPARATOR}"
    return real if real == articles_root.to_s || real.start_with?(prefix)

    nil
  rescue Errno::ENOENT, Errno::ELOOP, Errno::ENOTDIR
    nil
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
    feed_url = "https://libreverse.geor.me/feed/"
    feed_cache_key = "feed_posts-#{feed_url}"
    fetch_lock_key = "feed_posts-fetching"

    cached = Rails.cache.read(feed_cache_key)
    return cached if cached

    unless Rails.cache.read(fetch_lock_key)
      Rails.cache.write(fetch_lock_key, true, expires_in: 30.seconds)
      FetchFeedPostsJob.perform_later
    end

    []
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
      files = Rails.root.glob("app/articles/**/*.{md,pdf,yml,yaml}")
      Digest::MD5.hexdigest(
        files.sort.map { |f| "#{f}:#{File.mtime(f).to_i}" }.join("|")
      )
    end
  end

  # Helper methods for cache keys
  def articles_last_modified
    articles_dir = Rails.root.join("app/articles")
    return nil unless Dir.exist?(articles_dir)

  Dir.glob(File.join(articles_dir, "**/*.{md,pdf,yml,yaml}")).map { |f| File.mtime(f) }.max
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
