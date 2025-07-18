require "test_helper"

class StandingwavesControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get standingwaves_index_url
    assert_response :success
  end
end
