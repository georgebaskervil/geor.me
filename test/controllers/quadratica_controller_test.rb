require "test_helper"

class QuadraticaControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get quadratica_index_url
    assert_response :success
  end
end
