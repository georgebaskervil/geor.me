# frozen_string_literal: true

require "nokogiri"
require "kramdown"
require "yaml"
require "digest"
require "date" # Added to handle Date parsing
require "feedjira"

class ApplicationController < ActionController::Base
  before_action :set_custom_headers
  before_action :load_images
  before_action :load_articles
  before_action :set_all_posts
  before_action :set_latest_posts
  before_action :set_article, only: [ :show ]

  def show
    return unless @article.nil?

    Rails.logger.warn "Article not found with identifier: #{params[:id]}"
    render plain: "Article not found", status: :not_found
  end

  private

  def set_custom_headers
    # Skip COEP headers for robustext and data to allow cross-origin iframe embed
    unless controller_name == "robustext" || controller_name == "data"
      response.set_header("Cross-Origin-Embedder-Policy", "credentialless")
      response.set_header("Cross-Origin-Opener-Policy", "same-origin")
    end
    response.set_header("X-UA-Compatible", "IE=edge,chrome=1")

    # Passenger Turbocache compatibility: only cache GET HTML responses in production
    return unless Rails.env.production? && request.get? && (request.format.html? || request.accepts.include?("text/html"))

      # Use a checksum of articles and images for ETag
      etag = Digest::SHA256.hexdigest([ articles_checksum, images_checksum ].join(":"))
      last_modified = [ articles_last_modified, images_last_modified ].max
      response.set_header("ETag", etag)
      response.set_header("Last-Modified", last_modified.httpdate) if last_modified
      # Turbocache maxes at 2 seconds, so set max-age=2 for shared cache
      response.set_header("Cache-Control", "max-age=2, public")
      # DO NOT set Vary header

      # Handle conditional GET (304 Not Modified)
      if request.headers["If-None-Match"] == etag ||
         (request.headers["If-Modified-Since"] && last_modified &&
          Time.httpdate(request.headers["If-Modified-Since"]) >= last_modified)
        head :not_modified
      end
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

              # Handle the preview image
              preview_image = metadata["previewImage"]

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
                preview_image: preview_image,
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
          preview_image = metadata["previewImage"]

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
            preview_image: preview_image,
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

  def meta_image
    # Use a fixed default image since preview images will be generated programmatically in the future
    vite_asset_path("~/images/site-screenshot.png")
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
end
