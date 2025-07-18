require "test_helper"

class Movie2xytControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get movie2xyt_index_url
    assert_response :success
  end
end
