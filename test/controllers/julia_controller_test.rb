require "test_helper"

class JuliaControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get julia_index_url
    assert_response :success
  end
end
