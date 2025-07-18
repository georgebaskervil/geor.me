require "test_helper"

class FactorizerControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get factorizer_index_url
    assert_response :success
  end
end
