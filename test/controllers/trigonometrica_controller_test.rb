require "test_helper"

class TrigonometricaControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get trigonometrica_index_url
    assert_response :success
  end
end
