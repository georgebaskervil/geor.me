require "test_helper"

class InsultControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get insult_index_url
    assert_response :success
  end
end
