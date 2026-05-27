# frozen_string_literal: true

require "test_helper"

class PostsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get posts_path
    assert_response :success
  end

  test "file rejects path traversal in id" do
    get post_file_path("../../../etc/passwd")
    assert_response :not_found
  end

  test "file rejects ids with path separators" do
    get "/posts/foo/bar/file"
    assert_response :not_found
  end

  test "file serves article under app/articles" do
    get post_file_path("how-the-metaverse-will-kill-us-all")
    assert_response :success
    assert response.body.present?
  end

  test "file rejects dot-dot segments in id" do
    get post_file_path("..")
    assert_response :not_found
  end
end
