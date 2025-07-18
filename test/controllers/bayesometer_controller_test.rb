require "test_helper"

class BayesometerControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get bayesometer_index_url
    assert_response :success
  end
end
