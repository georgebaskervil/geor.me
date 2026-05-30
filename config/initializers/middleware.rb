# frozen_string_literal: true

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

Rails.application.config.middleware.use Rack::Zstd,
                                            compression_level: -3,     # Negative levels = "fast" mode (lower = faster)
                                            strategy: :fast,           # Fastest strategy
                                            window_log: 14,            # Small window → low memory & fast
                                            hash_log: 13,
                                            chain_log: 13,
                                            search_log: 1,
                                            min_match: 7

Rails.application.config.middleware.use WhitespaceCompressor

# We insert the emoji middleware here so that it precedes
# the html minifier but still avoids unnecessary work
Rails.application.config.middleware.use EmojiReplacer
