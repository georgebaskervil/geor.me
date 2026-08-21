# frozen_string_literal: true

source "https://rubygems.org"

# Security: Enforce 1-week minimum age for all gems
# Install with: bundle plugin install bundler-age_gate --path plugins/bundler-age_gate
plugin "bundler-age_gate", path: "plugins/bundler-age_gate"

ruby "3.3.7"

gem "aws-sdk-s3", "1.228.2"
gem "aws-sdk-core", "3.254.1"
# Keep on age-gate-safe release (1.1271+ still too new for the 7-day rule).
gem "aws-partitions", "1.1281.0"
gem "better_html"
gem "bootsnap", "1.25.0", require: false
gem "feedjira"
# Pin 0.7.58: 0.7.59 C extension fails on Linux during Docker vite:build (see .snyk).
# Dependabot must not re-bump this (ignore in .github/dependabot.yml + .snyk).
gem "iodine", "0.7.59", require: false
# 1.3.7 is the security-patched floor; 1.3.8 is under the 7-day age gate until ~2026-07-26.
gem "concurrent-ruby", "1.3.8"
gem "nokogiri", "1.19.4"
gem "rails", "8.1.3.1"
gem "reactionview", "~> 0.3.0"
gem "sentry-rails", "6.7.0"
gem "sentry-ruby", "6.7.0"
gem "stimulus-rails"
gem "turbo-mount"
gem "turbo-rails"
gem "tzinfo-data"
gem "unicode"
gem "vite_rails"
gem "zstd-ruby"
gem "fast_blank"                         
gem "fast_underscore"                    
gem "freezolite"                         
gem "memo_wise"                          
gem "json", "2.21.2"
gem "oj", "3.17.6"                     
gem "psych", "5.4.0"
# Transitive of rdoc/etc; 6.0.6 under age gate until ~2026-07-27.
gem "erb", "6.0.7"
gem "permessage_deflate", "~> 0.1.4"
# 0.6.6 is under the 7-day age gate until ~2026-07-30.
gem "net-imap", "0.6.6"

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
