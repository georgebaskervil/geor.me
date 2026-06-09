# frozen_string_literal: true

require "test_helper"

class ViteAssetsControllerTest < ActionController::TestCase
  tests ViteAssetsController

  setup do
    @vite_root = Rails.root.join("public/vite")
    @vite_root.mkpath
    @test_file = @vite_root.join("assets/test-abc123.js")
    @test_file.dirname.mkpath
    @original_enabled = ENV["VITE_ASSETS_B2_ENABLED"]
  end

  teardown do
    FileUtils.rm_rf(@vite_root.join("assets"))
    if @original_enabled.nil?
      ENV.delete("VITE_ASSETS_B2_ENABLED")
    else
      ENV["VITE_ASSETS_B2_ENABLED"] = @original_enabled
    end
  end

  test "rejects path traversal" do
    get :show, params: { path: "assets/../../Gemfile" }
    assert_response :not_found
  end

  test "serves local vite file when present" do
    @test_file.write("console.log('ok');")

    get :show, params: { path: "assets/test-abc123.js" }

    assert_response :success
    assert_equal "console.log('ok');", @response.body
    assert_includes @response.headers["Content-Type"], "javascript"
  end

  test "returns not found when local file is missing and B2 is disabled" do
    ENV["VITE_ASSETS_B2_ENABLED"] = "false"

    get :show, params: { path: "assets/missing-abc123.js" }

    assert_response :not_found
  end

  test "proxies from B2 when local file is missing" do
    ENV["VITE_ASSETS_B2_ENABLED"] = "true"
    proxy_response = B2AssetProxy::Response.new(
      status: :ok,
      headers: {
        "Content-Type" => "application/javascript",
        "Cache-Control" => "public, max-age=31536000, immutable"
      },
      body: "from-b2"
    )

    proxy = Object.new
    proxy.define_singleton_method(:fetch) { |_path, range: nil| proxy_response }
    @controller.instance_variable_set(:@b2_proxy, proxy)

    get :show, params: { path: "assets/missing-abc123.js" }

    assert_response :success
    assert_equal "from-b2", @response.body
    assert_equal "application/javascript", @response.headers["Content-Type"]
    assert_includes @response.headers["Cache-Control"], "immutable"
  end
end
