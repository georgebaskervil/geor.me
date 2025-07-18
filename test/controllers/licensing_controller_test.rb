require "test_helper"

class LicensingControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get licensing_index_url
    assert_response :success
  end
end
