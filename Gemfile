# frozen_string_literal: true

source "https://rubygems.org"

# Security: Enforce 1-week minimum age for all gems
# Install with: bundle plugin install bundler-age_gate --path plugins/bundler-age_gate
plugin "bundler-age_gate", path: "plugins/bundler-age_gate"

ruby "3.3.7"

gem "better_html"
gem "bootsnap", "1.24.4", require: false
gem "feedjira"
gem "iodine", "0.7.59"
gem "kramdown"
gem "nokogiri", "1.18.7"
gem "rails", "8.1.3"
gem "reactionview", "~> 0.3.0"
gem "sentry-rails"
gem "sentry-ruby"
gem "stimulus-rails"
gem "turbo-mount"
gem "turbo-rails"
gem "tzinfo-data"
gem "unicode"
gem "vite_rails"
gem "zstd-ruby"

# Performance optimisations
gem "fast_blank"                         # C implementation of String#blank?
gem "fast_underscore"                    # C implementation of String#underscore
gem "freezolite"                         # Memory-efficient constants freezing
gem "memo_wise"                          # Per-instance memoization of expensive methods
gem "oj", "= 3.16.17"                    # Fast JSON library (3-5x faster)

group :development, :test do
  gem "debug"
end

group :development do
  gem "brakeman"
  gem "dockerfile-rails"
  gem "erb-formatter"
  gem "erb_lint"
  gem "fasterer"
  gem "foreman"
  gem "rubocop"
  gem "rubocop-performance"
  gem "rubocop-rails"
  gem "web-console"
end

group :test do
  gem "capybara"
  gem "selenium-webdriver"
end

gem "permessage_deflate", "~> 0.1.4"
