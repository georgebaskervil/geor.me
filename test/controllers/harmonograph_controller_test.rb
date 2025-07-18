require "test_helper"

class HarmonographControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get harmonograph_index_url
    assert_response :success
  end
end
