require "test_helper"

class NeudecControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get neudec_index_url
    assert_response :success
  end
end
