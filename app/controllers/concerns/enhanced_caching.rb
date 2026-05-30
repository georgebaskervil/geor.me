# frozen_string_literal: true

# Enhanced caching concern with better HTTP caching strategies
module EnhancedCaching
  extend ActiveSupport::Concern

  included do
    # Helper methods available to all controllers that include this concern
  end

  private

  # Enhanced ETag generation with weak ETags and better cache keys
  def set_enhanced_etag(content_fingerprint: nil, include_user: true, weak: true)
    cache_key_parts = [
      controller_name,
      action_name,
      (current_account&.id if include_user),
      (current_account&.updated_at&.to_i if include_user),
      content_fingerprint,
      I18n.locale
    ].compact.join("/")

    etag_value = Digest::MD5.hexdigest(cache_key_parts)
    etag_header = weak ? %(W/"#{etag_value}") : %("#{etag_value}")

    # Handle conditional requests
    if request.headers["If-None-Match"] == etag_header
      head :not_modified
      return true
    end

    response.headers["ETag"] = etag_header
    false
  end

  # Set Last-Modified header and handle conditional requests
  def check_last_modified(timestamp)
    return false unless timestamp

    last_modified_time = timestamp.respond_to?(:httpdate) ? timestamp : Time.zone.parse(timestamp.to_s)
    response.headers["Last-Modified"] = last_modified_time.httpdate

    # Handle If-Modified-Since
    if request.headers["If-Modified-Since"].present?
      if_modified_since = begin
                            Time.httpdate(request.headers["If-Modified-Since"])
      rescue StandardError
                            nil
      end
      if if_modified_since && last_modified_time <= if_modified_since
        head :not_modified
        return true
      end
    end

    false
  end

  # Enhanced expires_in with better defaults
  def set_cache_headers(duration:, public: false, must_revalidate: true, stale_while_revalidate: nil, vary: nil)
    return if Rails.env.development? || Rails.env.test?

    cache_control_parts = []
    cache_control_parts << (public ? "public" : "private")
    cache_control_parts << "max-age=#{duration.to_i}"
    cache_control_parts << "must-revalidate" if must_revalidate
    cache_control_parts << "stale-while-revalidate=#{stale_while_revalidate.to_i}" if stale_while_revalidate

    response.headers["Cache-Control"] = cache_control_parts.join(", ")
    response.headers["Vary"] = vary if vary.present?

    # Set expires header as fallback for older clients
    response.headers["Expires"] = duration.from_now.httpdate
  end

  # Combine ETag and Last-Modified for optimal caching
  def fresh_when_enhanced(etag_content: nil, last_modified: nil, public: false, weak_etag: true)
    # Set Last-Modified first
    return if last_modified && check_last_modified(last_modified)

    # Then set ETag
    return if set_enhanced_etag(
      content_fingerprint: etag_content,
      include_user: !public,
      weak: weak_etag
    )

    false
  end

  # Cache key generator for consistent cache invalidation
  def generate_cache_key(*parts)
    parts.compact.map(&:to_s).join("/")
  end

  # Invalidate related caches (for use after updates)
  def invalidate_cache_for(model, additional_keys: [])
    cache_keys = [
      "#{model.class.name.downcase}/#{model.id}",
      "#{model.class.name.downcase}/index"
    ] + additional_keys

    cache_keys.each do |key|
      Rails.cache.delete(key)
    end
  end

  # Set Vary headers based on request characteristics
  def set_vary_headers
    vary_parts = [ "Accept-Encoding" ]
    vary_parts << "Authorization" if request.headers["Authorization"].present? || current_account
    vary_parts << "Accept-Language" if I18n.available_locales.size > 1

    response.headers["Vary"] = vary_parts.join(", ")
  end

  # Turbocache-optimized caching (max 2 seconds, no Vary headers)
  def set_turbocache_headers(duration: 2.seconds, must_revalidate: true)
    return if Rails.env.development? || Rails.env.test?

    # Ensure duration doesn't exceed turbocache limit
    duration = [ duration.to_i, 2 ].min

    cache_control_parts = [ "public", "max-age=#{duration}" ]
    cache_control_parts << "must-revalidate" if must_revalidate

    response.headers["Cache-Control"] = cache_control_parts.join(", ")
    response.headers["Expires"] = duration.seconds.from_now.httpdate

    # CRITICAL: Do not set Vary headers for turbocaching
  end

  # Hybrid caching: turbocache for short-term + browser cache for longer
  def set_hybrid_cache_headers(turbocache_duration: 2.seconds, browser_duration: 1.hour)
    return if Rails.env.development? || Rails.env.test?

    # Turbocache settings (short duration, public, no Vary)
    turbocache_max_age = [ turbocache_duration.to_i, 2 ].min

    cache_control_parts = [
      "public",
      "max-age=#{turbocache_max_age}",
      "s-maxage=#{turbocache_max_age}", # For shared caches like turbocache
      "stale-while-revalidate=#{browser_duration.to_i}"
    ]

    response.headers["Cache-Control"] = cache_control_parts.join(", ")
    response.headers["Expires"] = turbocache_duration.from_now.httpdate
  end

  # Check if response size is suitable for turbocaching (max 32KB)
  def turbocache_size_check!
    response_body = response.body || ""
    headers_size = response.headers.to_h.to_s.bytesize
    total_size = response_body.bytesize + headers_size

    if total_size > 32.kilobytes
      Rails.logger.warn "Response too large for turbocache: #{total_size} bytes (max 32KB)"
      return false
    end

    true
  end

  # Optimized caching for large HTML responses (1MB+) with existing zstd compression
  def set_large_response_cache_headers(duration: 1.hour, public: false, respect_existing_compression: true)
    return if Rails.env.development? || Rails.env.test?

    cache_control_parts = []
    cache_control_parts << (public ? "public" : "private")
    cache_control_parts << "max-age=#{duration.to_i}"
    cache_control_parts << "must-revalidate"

    # For large responses, allow stale content while revalidating
    cache_control_parts << "stale-while-revalidate=3600" # 1 hour grace period

    response.headers["Cache-Control"] = cache_control_parts.join(", ")
    response.headers["Expires"] = duration.from_now.httpdate

    # Only set Vary: Accept-Encoding if compression isn't already handled
    # (App already uses zstd compression - don't interfere)
    return unless respect_existing_compression && !response.headers["Content-Encoding"]

      response.headers["Vary"] = "Accept-Encoding"
  end

  # Fragment-based caching strategy for large pages
  def cache_large_page_fragments(cache_key_base:, fragments: {})
    fragments.each do |fragment_name, content_block|
      cache_key = "#{cache_key_base}/#{fragment_name}"

      Rails.cache.fetch(cache_key, expires_in: 1.hour) do
        content_block.call
      end
    end
  end

  # Allow controllers to skip automatic caching
  def skip_automatic_caching!
    @skip_automatic_caching = true
  end

  # Check if automatic caching should be skipped
  def skip_automatic_caching?
    @skip_automatic_caching == true
  end
end
