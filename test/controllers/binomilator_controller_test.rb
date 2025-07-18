require "test_helper"

class BinomilatorControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get binomilator_index_url
    assert_response :success
  end
end
