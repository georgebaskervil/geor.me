require "test_helper"

class ShmControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get shm_index_url
    assert_response :success
  end
end
