require "test_helper"

class DmcaControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get dmca_index_url
    assert_response :success
  end
end
