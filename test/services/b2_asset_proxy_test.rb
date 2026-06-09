# frozen_string_literal: true

require "test_helper"

class B2AssetProxyTest < ActiveSupport::TestCase
  test "sets immutable cache control for fingerprinted assets" do
    proxy = B2AssetProxy.new
    headers = proxy.send(:response_headers, "assets/application-abc123def.js", fake_response)

    assert_equal "public, max-age=31536000, immutable", headers["Cache-Control"]
  end

  test "uses shorter cache for non-fingerprinted assets" do
    proxy = B2AssetProxy.new
    headers = proxy.send(:response_headers, "service-worker.js", fake_response)

    assert_equal "public, max-age=3600", headers["Cache-Control"]
  end

  test "overrides B2 application/octet-stream with extension-based mime type" do
    proxy = B2AssetProxy.new
    headers = proxy.send(
      :response_headers,
      "assets/application-abc123def.css",
      { "Content-Type" => "application/octet-stream" }
    )

    assert_equal "text/css", headers["Content-Type"]
  end

  test "preserves upstream content type when specific" do
    proxy = B2AssetProxy.new
    headers = proxy.send(
      :response_headers,
      "assets/application-abc123def.js",
      { "Content-Type" => "application/javascript; charset=utf-8" }
    )

    assert_equal "application/javascript; charset=utf-8", headers["Content-Type"]
  end

  private

  def fake_response
    {
      "Content-Type" => "application/javascript",
      "ETag" => '"abc"',
      "Content-Length" => "3"
    }
  end
end
