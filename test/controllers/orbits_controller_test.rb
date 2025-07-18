require "test_helper"

class OrbitsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get orbits_index_url
    assert_response :success
  end
end
