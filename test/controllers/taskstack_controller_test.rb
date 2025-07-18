require "test_helper"

class TaskstackControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get taskstack_index_url
    assert_response :success
  end
end
