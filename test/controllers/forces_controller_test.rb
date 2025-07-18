require "test_helper"

class ForcesControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get forces_index_url
    assert_response :success
  end
end
