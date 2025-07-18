require "test_helper"

class DiffractorControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get diffractor_index_url
    assert_response :success
  end
end
