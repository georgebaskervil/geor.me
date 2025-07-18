require "test_helper"

class EdemoControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get edemo_index_url
    assert_response :success
  end
end
