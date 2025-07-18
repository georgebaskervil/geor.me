require "test_helper"

class SpheriumControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get spherium_index_url
    assert_response :success
  end
end
