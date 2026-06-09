# frozen_string_literal: true

require "test_helper"

class FeedPostsServiceTest < ActiveSupport::TestCase
  test "parses feed entries for georgebaskervil author" do
    response = Object.new
    response.define_singleton_method(:is_a?) { |klass| klass == Net::HTTPSuccess }
    response.define_singleton_method(:body) { file_fixture("libreverse_feed.xml").read }

    Net::HTTP.stub(:get_response, response) do
      posts = FeedPostsService.fetch_from_network

      assert_equal 1, posts.size
      assert_equal "Sample Libreverse Post", posts.first[:title]
      assert_equal "A sample feed entry for tests.", posts.first[:description]
      assert_equal :feed, posts.first[:format]
      assert_equal "https://libreverse.geor.me/posts/sample-libreverse-post", posts.first[:external_url]
    end
  end
end
