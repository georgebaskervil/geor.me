require "test_helper"

class FgraphControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get fgraph_index_url
    assert_response :success
  end
end
