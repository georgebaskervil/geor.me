# frozen_string_literal: true

require "test_helper"

class PostsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get posts_path
    assert_response :success
    assert_includes response.body, "I'm Boycotting Meta. Here's Why"
  end

  test "should get markdown post show page" do
    get post_path("if-i-like-it-is-it-beautiful")
    assert_response :success
    assert_includes response.body, "If I like it, is it beautiful?"
  end

  test "file rejects path traversal in id" do
    get post_file_path("../../../etc/passwd")
    assert_response :not_found
  end

  test "file rejects ids with path separators" do
    get "/posts/foo/bar/file"
    assert_response :not_found
  end

  test "file redirects to Prismic media for pdf posts" do
    get post_file_path("is-beauty-good-for-the-soul")
    assert_response :redirect
    assert_match %r{geor-me\.cdn\.prismic\.io}, response.headers["Location"]
  end

  test "show redirects pdf posts to Prismic media" do
    get post_path("is-beauty-good-for-the-soul")
    assert_response :redirect
    assert_match %r{geor-me\.cdn\.prismic\.io}, response.headers["Location"]
  end

  test "file rejects dot-dot segments in id" do
    get post_file_path("..")
    assert_response :not_found
  end
end
