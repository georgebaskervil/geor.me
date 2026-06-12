# frozen_string_literal: true

source "https://rubygems.org"

# Security: Enforce 1-week minimum age for all gems
# Install with: bundle plugin install bundler-age_gate --path plugins/bundler-age_gate
plugin "bundler-age_gate", path: "plugins/bundler-age_gate"

ruby "3.3.7"

gem "aws-sdk-s3", "1.224.0"
gem "aws-sdk-core", "3.250.0"
gem "aws-partitions", "1.1255.0"
gem "better_html"
gem "bootsnap", "1.24.4", require: false
gem "feedjira"
# Pin 0.7.58: 0.7.59 C extension fails on Linux during Docker vite:build (see .snyk).
gem "iodine", "0.7.59", require: false
gem "nokogiri", "1.19.3"
gem "rails", "8.1.3"
gem "reactionview", "~> 0.3.0"
gem "sentry-rails", "6.5.0"
gem "sentry-ruby", "6.5.0"
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
gem "json", "2.19.7"
gem "oj", "3.17.1"                     
gem "psych", "5.3.1"
gem "permessage_deflate", "~> 0.1.4"
gem "net-imap", "0.6.4"

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
