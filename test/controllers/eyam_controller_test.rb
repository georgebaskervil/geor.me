require "test_helper"

class EyamControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get eyam_index_url
    assert_response :success
  end
end
