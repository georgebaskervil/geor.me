require "test_helper"

class InequalityplotterControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get inequalityplotter_index_url
    assert_response :success
  end
end
