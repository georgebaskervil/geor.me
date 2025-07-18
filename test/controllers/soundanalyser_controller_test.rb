require "test_helper"

class SoundanalyserControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get soundanalyser_index_url
    assert_response :success
  end
end
