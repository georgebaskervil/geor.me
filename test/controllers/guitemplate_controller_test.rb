require "test_helper"

class GuitemplateControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get guitemplate_index_url
    assert_response :success
  end
end
