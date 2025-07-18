require "test_helper"

class PoweraidControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get poweraid_index_url
    assert_response :success
  end
end
