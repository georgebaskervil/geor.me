require "test_helper"

class ProjectileControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get projectile_index_url
    assert_response :success
  end
end
