# frozen_string_literal: true

# Automatic caching configuration for intelligent HTTP caching
# Optimizes cache headers based on response size and content type

Rails.application.configure do
  # Configure automatic caching behavior
  config.automatic_caching = ActiveSupport::OrderedOptions.new

  # Size thresholds for different caching strategies (in bytes)
  config.automatic_caching.turbocache_max_size = 32.kilobytes
  config.automatic_caching.large_response_min_size = 100.kilobytes  # Smaller than Libreverse since this is a personal site

  # Cache durations for different scenarios
  config.automatic_caching.durations = ActiveSupport::OrderedOptions.new
  config.automatic_caching.durations.turbocache = 2.seconds
  config.automatic_caching.durations.small_private = 30.seconds      # Shorter for personal site
  config.automatic_caching.durations.medium_authenticated = 2.minutes
  config.automatic_caching.durations.medium_public = 5.minutes       # Shorter for frequently updated content
  config.automatic_caching.durations.large_authenticated = 5.minutes
  config.automatic_caching.durations.large_public = 10.minutes
  config.automatic_caching.durations.sensitive = 30.seconds

  # Sensitive path patterns (regex patterns that indicate sensitive content)
  config.automatic_caching.sensitive_patterns = [
    %r{/(login|auth|admin|api)},
    %r{/stats},
    %r{/proxy}
  ]

  # Paths that should never be cached
  config.automatic_caching.no_cache_patterns = [
    %r{/api/.*},
    %r{/proxy},
    %r{/stats}
  ]

  # Enable/disable automatic caching globally
  config.automatic_caching.enabled = true

  # Log caching decisions (useful for debugging)
  config.automatic_caching.log_decisions = Rails.env.development?
end