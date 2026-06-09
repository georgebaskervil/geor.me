#!/usr/bin/env ruby
# frozen_string_literal: true

# Test Backblaze B2 S3 credentials without booting Rails.
# Usage:
#   B2_ASSETS_KEY_ID=... B2_ASSETS_SECRET=... ruby scripts/test_b2_s3.rb
#
# Or via Docker (matches CI Linux):
#   docker run --rm \
#     -e B2_ASSETS_KEY_ID -e B2_ASSETS_SECRET \
#     -v "$PWD/scripts/test_b2_s3.rb:/test.rb:ro" \
#     ruby:3.3-slim bash -lc 'gem install aws-sdk-s3 -N && ruby /test.rb'

require "aws-sdk-s3"
require "net/http"
require "uri"

ENDPOINT = ENV.fetch("B2_ASSETS_ENDPOINT", "https://s3.us-east-005.backblazeb2.com")
BUCKET = ENV.fetch("B2_ASSETS_BUCKET", "geor-me-assets")
REGION = ENV.fetch("B2_ASSETS_REGION", "us-east-005")
PREFIX = "vite"

key_id = ENV["B2_ASSETS_KEY_ID"].to_s
secret = ENV["B2_ASSETS_SECRET"].to_s

if key_id.empty? || secret.empty?
  warn "Set B2_ASSETS_KEY_ID and B2_ASSETS_SECRET"
  exit 1
end

puts "endpoint: #{ENDPOINT}"
puts "bucket:   #{BUCKET}"
puts "region:   #{REGION}"
puts "key id:   #{key_id[0, 8]}… (#{key_id.length} chars)"
puts "secret:   #{secret[0, 4]}… (#{secret.length} chars)"

client = Aws::S3::Client.new(
  endpoint: ENDPOINT,
  region: REGION,
  access_key_id: key_id,
  secret_access_key: secret,
  force_path_style: false
)

begin
  client.list_objects_v2(bucket: BUCKET, prefix: "#{PREFIX}/", max_keys: 1)
  puts "list:     ok"

  test_key = "#{PREFIX}/_connection-test-#{Time.now.to_i}.txt"
  body = "geor.me b2 test #{Time.now.utc.iso8601}"
  client.put_object(bucket: BUCKET, key: test_key, body: body, content_type: "text/plain")
  puts "upload:   ok (#{test_key})"

  client.head_object(bucket: BUCKET, key: test_key)
  puts "head:     ok"

  public_url = "https://#{BUCKET}.s3.#{REGION}.backblazeb2.com/#{test_key}"
  uri = URI(public_url)
  response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 10) do |http|
    http.get(uri.request_uri)
  end
  unless response.is_a?(Net::HTTPSuccess)
    warn "public:   failed — HTTP #{response.code} for #{public_url}"
    exit 1
  end
  puts "public:   ok"

  client.delete_object(bucket: BUCKET, key: test_key)
  puts "delete:   ok"
  puts "B2 connection test passed"
rescue Aws::S3::Errors::ServiceError => e
  warn "B2 failed: #{e.class} — #{e.message}"
  warn "Tips:"
  warn "  - B2_ASSETS_KEY_ID = keyID (e.g. 003...), B2_ASSETS_SECRET = applicationKey (long K... string)"
  warn "  - Do not swap them"
  warn "  - Key must be scoped to bucket #{BUCKET} with list, read, write, delete"
  exit 1
end
