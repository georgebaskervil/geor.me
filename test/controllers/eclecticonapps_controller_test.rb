require "test_helper"

class EclecticonappsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get eclecticonapps_index_url
    assert_response :success
  end
end
