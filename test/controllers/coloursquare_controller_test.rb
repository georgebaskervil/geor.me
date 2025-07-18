require "test_helper"

class ColoursquareControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get coloursquare_index_url
    assert_response :success
  end
end
