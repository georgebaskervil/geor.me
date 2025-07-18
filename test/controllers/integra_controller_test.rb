require "test_helper"

class IntegraControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get integra_index_url
    assert_response :success
  end
end
