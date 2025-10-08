require "test_helper"

class RobustextControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get robustext_index_url
    assert_response :success
  end
end
