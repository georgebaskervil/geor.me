require "test_helper"

class MiscellaneousControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get miscellaneous_index_url
    assert_response :success
  end
end
