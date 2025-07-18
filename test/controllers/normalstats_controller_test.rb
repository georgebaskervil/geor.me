require "test_helper"

class NormalstatsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get normalstats_index_url
    assert_response :success
  end
end
