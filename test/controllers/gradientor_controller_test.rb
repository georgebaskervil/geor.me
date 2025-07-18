require "test_helper"

class GradientorControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get gradientor_index_url
    assert_response :success
  end
end
