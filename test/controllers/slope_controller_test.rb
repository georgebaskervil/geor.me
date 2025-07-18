require "test_helper"

class SlopeControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get slope_index_url
    assert_response :success
  end
end
