require "test_helper"

class MomentumControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get momentum_index_url
    assert_response :success
  end
end
