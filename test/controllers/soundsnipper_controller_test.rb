require "test_helper"

class SoundsnipperControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get soundsnipper_index_url
    assert_response :success
  end
end
