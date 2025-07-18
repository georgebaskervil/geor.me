require "test_helper"

class CreditsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get credits_index_url
    assert_response :success
  end
end
