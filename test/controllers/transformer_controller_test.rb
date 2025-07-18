require "test_helper"

class TransformerControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get transformer_index_url
    assert_response :success
  end
end
