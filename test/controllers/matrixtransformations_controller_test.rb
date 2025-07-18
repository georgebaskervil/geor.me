require "test_helper"

class MatrixtransformationsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get matrixtransformations_index_url
    assert_response :success
  end
end
