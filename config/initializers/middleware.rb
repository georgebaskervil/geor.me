require Rails.root.join("app/middleware/rack_zstd")
require Rails.root.join("app/middleware/whitespace_compressor")

# Strange as it may seem this is the order that gets the html minifier
# to run before the deflater and brotli because middlewares are,
# unintuitively, run as a stack from the bottom up.
COMPRESSIBLE_CONTENT_TYPES = %w[
  text/html
  text/plain
  text/css
  text/javascript
  application/javascript
  application/json
  application/xml
  application/rss+xml
  application/atom+xml
  image/svg+xml
  application/x-mpegURL
].map(&:downcase).freeze

Rails.application.config.middleware.use Rack::Deflater,
                                        sync: false,
                                        include: COMPRESSIBLE_CONTENT_TYPES

Rails.application.config.middleware.use Rack::Brotli,
                                        quality: 11,
                                        deflater: {
                                          lgwin: 22,
                                          lgblock: 0,
                                          mode: :text
                                        },
                                        sync: false,
                                        include: COMPRESSIBLE_CONTENT_TYPES

Rails.application.config.middleware.use Rack::Zstd,
                                        window_log: 27,
                                        chain_log: 27,
                                        hash_log: 25,
                                        search_log: 9,
                                        min_match: 3,
                                        strategy: :btultra2

Rails.application.config.middleware.use WhitespaceCompressor

# We insert the emoji middleware here so that it precedes
# the html minifier but still avoids unnecessary work
Rails.application.config.middleware.use EmojiReplacer

# We make sure that rack-attack runs first so that we don't
# waste resources on compressing requests that will be throttled.
module Rack
  class Attack
  # Use Rails.cache for production
  Rack::Attack.cache.store = Rails.cache

  # Different limits for authenticated vs. unauthenticated users
  # throttle("authenticated_req/ip", limit: 1200, period: 1.minute) do |req|
  #   if req.env["warden"].user # Assuming you're using Devise or similar for authentication
  #     req.ip
  #   end
  # end

  throttle("unauthenticated_req/ip", limit: 300, period: 1.minute, &:ip)

  # Burst protection: Allow for some bursts but maintain long-term rate
  throttle("burst/ip", limit: 100, period: 10.seconds, &:ip)

  # Specific endpoint protection:
  # Example: Limit more for write operations or sensitive endpoints
  # throttle("write/ip", limit: 100, period: 1.minute) do |req|
  #   req.path.start_with?('/api/v1/write') ? req.ip : nil
  # end

  # Custom responder with more nuanced messaging and retry information
  self.throttled_responder = lambda do |request|
    match_data = request.env["rack.attack.match_data"]
    now = Time.zone.now

    headers = {
      "Content-Type" => "application/json",
      "Retry-After" => (match_data[:period] - (now - match_data[:epoch])).to_i.to_s
    }

    [ 429, headers, [ {
      error: {
        message: "You've hit your request limit. Please try again in #{headers['Retry-After']} seconds.",
        limit: match_data[:limit],
        remaining: [ 0, match_data[:limit] - match_data[:count] ].max,
        reset_at: (now + match_data[:period] - (now - match_data[:epoch])).to_i
      }
    }.to_json ] ]
  end
  end
end

Rails.application.config.middleware.use Rack::Attack
