# frozen_string_literal: true

require "test_helper"

class B2AssetsStorageTest < ActiveSupport::TestCase
  setup do
    @vite_root = Rails.root.join("tmp/vite_b2_test/public/vite")
    FileUtils.rm_rf(@vite_root.parent)
    @vite_root.join(".vite").mkpath
    @vite_root.join("assets").mkpath
    @manifest = @vite_root.join(".vite/manifest.json")
    @asset = @vite_root.join("assets/application-abc123.js")
    @manifest.write('{"entries":{}}')
    @asset.write("bundle")
  end

  teardown do
    FileUtils.rm_rf(Rails.root.join("tmp/vite_b2_test"))
  end

  test "strip_from_image keeps manifest files and removes other vite output" do
    B2AssetsStorage.strip_from_image!(root: @vite_root)

    assert @manifest.exist?
    assert_not @asset.exist?
  end

  test "public_object_url points at the public bucket host" do
    assert_equal(
      "https://geor-me-assets.s3.us-east-005.backblazeb2.com/vite/assets/application-abc123.js",
      B2AssetsStorage.public_object_url("assets/application-abc123.js")
    )
  end

  test "configured? is false without credentials" do
    original_key = ENV["B2_ASSETS_KEY_ID"]
    original_secret = ENV["B2_ASSETS_SECRET"]
    ENV.delete("B2_ASSETS_KEY_ID")
    ENV.delete("B2_ASSETS_SECRET")

    assert_not B2AssetsStorage.configured?
  ensure
    if original_key.nil?
      ENV.delete("B2_ASSETS_KEY_ID")
    else
      ENV["B2_ASSETS_KEY_ID"] = original_key
    end
    if original_secret.nil?
      ENV.delete("B2_ASSETS_SECRET")
    else
      ENV["B2_ASSETS_SECRET"] = original_secret
    end
  end
end
